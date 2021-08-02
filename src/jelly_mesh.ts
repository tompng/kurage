import vertexShader from './shaders/jelly.vert'
import fragmentShader from './shaders/jelly.frag'
import * as THREE from 'three'
import { Point3D, normalize } from './math'

const coordIDs = ['000', '001', '010', '011', '100', '101', '110', '111'] as const
type CoordID = '000' | '001' | '010' | '011' | '100' | '101' | '110' | '111'
type PositionUniformKey = `v${CoordID}`
type AxisXUniformKey = `vx${CoordID}`
type AxisYUniformKey = `vy${CoordID}`
type AxisZUniformKey = `vz${CoordID}`

export type JellyUniforms = Record<PositionUniformKey | AxisXUniformKey | AxisYUniformKey | AxisZUniformKey, { value: THREE.Vector3 }>
function jellyUniforms() {
  const data: Record<string, { value: THREE.Vector3 } | undefined> = {}
  for (const id of coordIDs) {
    data['v' + id] = { value: new THREE.Vector3() }
    data['vx' + id] = { value: new THREE.Vector3() }
    data['vy' + id] = { value: new THREE.Vector3() }
    data['vz' + id] = { value: new THREE.Vector3() }
  }
  return data as JellyUniforms
}

export function createJellyShader() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: jellyUniforms(),
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }) as Omit<THREE.ShaderMaterial, 'uniforms'> & { uniforms: JellyUniforms }
}

export function createJellyGeomety(width: number, radialSegments: number, outlineSegments: number) {
  const positions: number[] = []
  const tan1s: number[] = []
  const tan2s: number[] = []
  type XY = [number, number]
  const r = Math.hypot(1, width)
  const tan1u = [1, 0, 0]
  const tan1d = [-1 / r, -width / r, 0]
  const tan2 = [0, 1, 0]
  const add = ([ax, ay]: XY, [bx, by]: XY, [cx, cy]: XY) => {
    tan1s.push(...tan1u, ...tan1u, ...tan1u)
    tan1s.push(...tan1d, ...tan1d, ...tan1d)
    tan2s.push(...tan2, ...tan2, ...tan2)
    tan2s.push(...tan2, ...tan2, ...tan2)
    positions.push(ax, ay, 1, bx, by, 1, cx, cy, 1)
    positions.push(ax, ay, 1 - width * (1 - ax ** 2))
    positions.push(bx, by, 1 - width * (1 - bx ** 2))
    positions.push(cx, cy, 1 - width * (1 - cx ** 2))
  }
  let prevSegments: XY[] = [[0, 0], [0, 1]]
  for (let i = 1; i <= radialSegments; i++) {
    const x = i / radialSegments
    const n = Math.round((radialSegments + (outlineSegments - 1) * i) / radialSegments)
    const nextSegments: XY[] = []
    for (let j = 0; j <= n; j++) nextSegments.push([x, j / n])
    let pi = 0
    let ni = 0
    while (pi + 1 < prevSegments.length || ni < n) {
      if (pi / (prevSegments.length - 1) < ni / n) {
        add(prevSegments[pi], nextSegments[ni], prevSegments[++pi])
      } else {
        add(prevSegments[pi], nextSegments[ni], nextSegments[++ni])
      }
    }
    prevSegments = nextSegments
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1s), 3))
  geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2s), 3))
  return geometry
}

export function createPlaneJellyGeomety(segments: number) {
  const positions: number[] = []
  const tan1s: number[] = []
  const tan2s: number[] = []
  type XY = [number, number]
  const tan1 = [1, 0, 0]
  const tan2 = [0, 1, 0]
  const add = ([ax, ay]: XY, [bx, by]: XY, [cx, cy]: XY) => {
    tan1s.push(...tan1, ...tan1, ...tan1)
    tan2s.push(...tan2, ...tan2, ...tan2)
    positions.push(ax, ay, 1, bx, by, 1, cx, cy, 1)
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const x0 = i / segments
      const y0 = j / segments
      const x1 = (i + 1) / segments
      const y1 = (j + 1) / segments
      add([x0, y0], [x1, y0], [x0, y1])
      add([x1, y0], [x1, y1], [x0, y1])
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1s), 3))
  geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2s), 3))
  return geometry
}

function splitPolygon(polygon: Point3D[][], cx: number, cy: number, c: number) {
  if (polygon.every(p => p[0].x * cx + p[0].y * cy + c >= 0)) return polygon
  const output = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const va = a[0].x * cx + a[0].y * cy + c
    const vb = b[0].x * cx + b[0].y * cy + c
    if (va < 0 && vb < 0) continue
    if (va >= 0 && vb >= 0) {
      output.push(a)
    } else {
      const c = a.map((ai, i) => {
        const bi = b[i]
        return {
          x: (ai.x * vb - bi.x * va) / (vb - va),
          y: (ai.y * vb - bi.y * va) / (vb - va),
          z: (ai.z * vb - bi.z * va) / (vb - va)
        }
      })
      if (va >= 0) output.push(a)
      output.push(c)
    }
  }
  return output
}
function polygonGridSplit(polygon: Point3D[][], x: number, y: number, size: number) {
  polygon = splitPolygon(polygon, 1, 0, -x)
  polygon = splitPolygon(polygon, -1, 0, x + size)
  polygon = splitPolygon(polygon, 0, 1, -y)
  return splitPolygon(polygon, 0, -1, y + size)
}

export function createJellyGeometryGrids(segments: number): (THREE.BufferGeometry | null)[][] {
  type Point = { p: Point3D, t1: Point3D, t2: Point3D, uv: Point3D }
  type Triangle = [Point, Point, Point]
  type Attributes = { p: number[], t1: number[], t2: number[], uv: number[] }
  const grids: Attributes[][] = []
  for (let i = 0; i < segments; i++) {
    grids[i] = []
    for (let j = 0; j < segments; j++) grids[i][j] = { p: [], t1: [], t2: [], uv: [] }
  }
  function add([a, b, c]: Triangle) {
    const ixmin = Math.floor(Math.max(0, Math.min(a.p.x, b.p.x, c.p.x) + segments / 2))
    const iymin = Math.floor(Math.max(0, Math.min(a.p.y, b.p.y, c.p.y) + segments / 2))
    const ixmax = Math.floor(Math.min(segments - 1, Math.max(a.p.x, b.p.x, c.p.x) + segments / 2))
    const iymax = Math.floor(Math.min(segments - 1, Math.max(a.p.y, b.p.y, c.p.y) + segments / 2))
    const polygon = [a, b, c].map(({ p, t1, t2, uv }) => [p, t1, t2, uv])
    for (let ix = ixmin; ix <= ixmax; ix++) {
      for (let iy = iymin; iy <= iymax; iy++) {
        const x0 = ix - segments / 2
        const y0 = iy - segments / 2
        const polygon2 = polygonGridSplit(polygon, x0, y0, 1)
        if (polygon2.length === 0) continue
        const pa = polygon2[0]
        for (let i = 1; i < polygon2.length - 1; i++) {
          const pb = polygon2[i]
          const pc = polygon2[i + 1]
          const [t1s, t2s] = [1, 2].map(i => {
            const [ta, tb, tc] = [pa[i], pb[i], pc[i]].map(normalize)
            return [ta.x, ta.y, ta.z, tb.x, tb.y, tb.z, tc.x, tc.y, tc.z]
          })
          grids[ix][iy].p.push(
            pa[0].x - x0, pa[0].y - y0, pa[0].z,
            pb[0].x - x0, pb[0].y - y0, pb[0].z,
            pc[0].x - x0, pc[0].y - y0, pc[0].z
          )
          grids[ix][iy].t1.push(...t1s)
          grids[ix][iy].t2.push(...t2s)
          grids[ix][iy].uv.push(pa[2].x, pa[2].y, pb[2].x, pb[2].y, pc[2].x, pc[2].y)
        }
      }
    }
  }

  const N = 10
  const f = (th: number) => {
    const r = Math.sin(th)
    const z = Math.cos(th)
    return { r, z: z < 0 ? z : z * r ** 32 }
  }
  const fs = [...new Array(N + 1)].map((_, i) => {
    const th = Math.PI * i / N
    const p = f(th)
    if (i === 0 || i === N) p.r = 0
    const dth = 0.001
    const pa = f(th - dth)
    const pb = f(th + dth)
    return { ...p, dr: pb.r - pa.r, dz: pb.z - pa.z, l: 0 }
  })
  const zs = fs.map(p => p.z)
  const zmin = Math.min(...zs)
  const zmax = Math.max(...zs)
  fs.forEach(p => {
    p.r *= segments / 2
    p.dr *= segments / 2
    p.z = (p.z - zmin) / (zmax - zmin)
    const l = Math.hypot(p.dr, p.dz / (zmax - zmin))
    p.dr /= l
    p.dz /= (zmax - zmin) * l
  })
  for (let i = 1; i < fs.length; i++) {
    fs[i].l = fs[i - 1].l + Math.hypot(fs[i].r - fs[i - 1].r, fs[i].z - fs[i - 1].z)
  }
  const lmax = fs[fs.length - 1].l
  const lscale = 2 * 0.9 / lmax
  const arcCoords: Point[][] = []
  for (let i = 1; i < N; i++) {
    const pf = fs[i - 1]
    const { r, z, dr, dz, l } = fs[i]
    const nf = fs[i + 1]
    const len = Math.min(nf.l - l, l - pf.z)
    const n = Math.max(Math.round(2 * Math.PI * r / len / 8), 1) * 8
    const arc: Point[] = []
    for (let j = 0; j < n; j++) {
      const th = 2 * Math.PI * j / n
      const cos = Math.cos(th)
      const sin = Math.sin(th)
      arc.push({
        p: { x: r * cos, y: r * sin, z },
        t1: { x: dr * cos, y: dr * sin, z: dz },
        t2: { x: sin, y: -cos, z: 0 },
        uv: { x: l * lscale * cos + 0.5, y: l * lscale * cos + 0.5, z: 0 }
      })
    }
    arcCoords.push(arc)
  }
  for (let i = 0; i < arcCoords.length - 1; i++) {
    const arc1 = arcCoords[i]
    const arc2 = arcCoords[i + 1]
    let i1 = 0
    let i2 = 0
    while (i1 < arc1.length || i2 < arc2.length) {
      if (i2 == arc2.length || i1 / arc1.length < i2 / arc2.length) {
        add([arc1[i1 % arc1.length], arc2[i2 % arc2.length], arc1[++i1 % arc1.length]])
      } else {
        add([arc1[i1 % arc1.length], arc2[i2 % arc2.length], arc2[++i2 % arc2.length]])
      }
    }
  }
  const firstArc = arcCoords[0]
  const lastArc = arcCoords[arcCoords.length - 1]
  for (const arc of [firstArc, lastArc]) {
    const { r, z, dr, dz, l } = arc === firstArc ? fs[0] : fs[fs.length - 1]
    for (let i = 0; i < arc.length; i++) {
      const th = 2 * Math.PI * (i + 0.5) / arc.length
      const cos = Math.cos(th)
      const sin = Math.sin(th)
      const p = {
        p: { x: r * cos, y: r * sin, z },
        t1: { x: dr * cos, y: dr * sin, z: dz },
        t2: { x: sin, y: -cos, z: 0 },
        uv: { x: l * lscale * cos + 0.5, y: l * lscale * cos + 0.5, z: 0 }
      }
      const j = (i + 1) % arc.length
      add(arc === firstArc ? [p, arc[i], arc[j]] : [arc[i], p, arc[j]])
    }
  }
  return grids.map(line => {
    return line.map(({ p, t1, t2, uv }) => {
      const faces = p.length / 9
      if (faces === 0) return null
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3))
      geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(t1), 3))
      geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(t2), 3))
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2))
      return geometry
    })
  })
}
