import * as THREE from 'three'
import { Mesh } from 'three'
import { Point3D, sub as vectorSub, normalize, cross } from './math'
import vertexShader from './shaders/ribbon.vert'
// import fragmentShader from './shaders/jelly.frag'
import { String3D, Ribbon } from './string'

type Point = {
  p: Point3D,
  t1: Point3D,
  t2: Point3D,
  u: number,
  v: number
}

const fragmentShader = `
precision mediump float;
varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;
void main() {
  float d = dot(normalize(cameraPosition - vposition), normalize(vnormal));
  d *= d;
  float c = (1.0 - vtexcoord.x * vtexcoord.x) * vtexcoord.y * (1.0 - vtexcoord.y) * 4.0;
  gl_FragColor = vec4(vec3(1.5, 1.5, 2) * (1.0 - d) * d * c, 1);
}
`

function createRibbonGeometry(l0: number, l1: number, ln: number, wn: number) {
  const positions: number[] = []
  const tan1s: number[] = []
  const tan2s: number[] = []
  const uvs: number[] = []
  function add(a: Point, b: Point, c: Point) {
    positions.push(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z, c.p.x, c.p.y, c.p.z)
    tan1s.push(a.t1.x, a.t1.y, a.t1.z, b.t1.x, b.t1.y, b.t1.z, c.t1.x, c.t1.y, c.t1.z)
    tan2s.push(a.t2.x, a.t2.y, a.t2.z, b.t2.x, b.t2.y, b.t2.z, c.t2.x, c.t2.y, c.t2.z)
    uvs.push(a.u, a.v, b.u, b.v, c.u, c.v)
  }
  let prev: Point[] | undefined
  function fxy(z: number, y: number) {
    const gz = l0 + (l1 - l0) * z
    y -= 0.5
    const x1 = Math.sin(62.5 * gz + 1) + Math.sin(72.9 * gz + 2) + Math.sin(133.3 * gz + 3)
    const x2 = Math.sin(52.3 * gz + 1) + Math.sin(97.1 * gz + 2) + Math.sin(113.7 * gz + 3)
    const x = y * y / 2 + (x1 * y * y + x2 * y * y * y) / 4
    const th = (Math.sin(37.3 * gz + 1) + Math.sin(23.7 * gz + 2) + Math.sin(17.3 * gz + 3)) / 2
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    return {
      x: 0.5 + x * cos + y * sin,
      y: 0.5 + y * cos - x * sin
    }
  }
  for (let i = 0; i <= ln; i++) {
    const z = i / ln
    const gz = l0 + (l1 - l0) * z
    const w = Math.sqrt(1 - gz * gz) * (1 + (Math.sin(229.3 * gz + 1) + Math.sin(137.1 * gz + 2) + Math.sin(97.7 * gz + 2)) * 0.1)
    const points: Point[] = []
    const delta = 0.001
    for (let j = 0; j <= wn; j++) {
      const y0 = 0.5 + w * (j / wn - 0.5)
      const xy = fxy(z, y0)
      const xydz = fxy(z + delta, y0)
      const xydy = fxy(z, y0 + delta)
      points.push({
        p: { x: xy.x, y: xy.y, z },
        t1: normalize({ x: xydz.x - xy.x, y: xydz.y - xy.y, z: delta }),
        t2: normalize({ x: xydy.x - xy.x, y: xydy.y - xy.y, z: 0 }),
        u: gz, v: y0
      })
    }
    if (prev) {
      for (let j = 0; j < wn; j++) {
        add(prev[j], points[j], prev[j + 1])
        add(prev[j + 1], points[j], points[j + 1])
      }
    }
    prev = points
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1s), 3))
  geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2s), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  return geometry
}

export function createRibbonGeometries(segments: number, ln: number, wn: number) {
  const output: THREE.BufferGeometry[] = []
  return [...new Array(segments)].map((_, i) => createRibbonGeometry(i / segments, (i + 1) / segments, ln, wn))
}

type RibbonUniforms = {
  v0: { value: THREE.Vector3 }
  v1: { value: THREE.Vector3 }
  vx0: { value: THREE.Vector3 }
  vy0: { value: THREE.Vector3 }
  vz0: { value: THREE.Vector3 }
  vx1: { value: THREE.Vector3 }
  vy1: { value: THREE.Vector3 }
  vz1: { value: THREE.Vector3 }
}

type RibbonSegment = {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  uniforms: RibbonUniforms
}

function ribbonUniforms(): RibbonUniforms {
  return {
    v0: { value: new THREE.Vector3() },
    v1: { value: new THREE.Vector3() },
    vx0: { value: new THREE.Vector3() },
    vy0: { value: new THREE.Vector3() },
    vz0: { value: new THREE.Vector3() },
    vx1: { value: new THREE.Vector3() },
    vy1: { value: new THREE.Vector3() },
    vz1: { value: new THREE.Vector3() }
  }
}

export class RibbonShape {
  segments: RibbonSegment[]
  ribbon: Ribbon
  constructor(public numSegments: number, w: number, h: number) {
    const geometries = createRibbonGeometries(numSegments, 20, 8)
    this.ribbon = new Ribbon(numSegments)
    this.segments = geometries.map(geometry => {
      const uniforms = ribbonUniforms()
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: uniforms,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.frustumCulled = false
      return { mesh, uniforms, material }
    })
  }
  addToScene(scene: THREE.Scene) {
    this.segments.forEach(({ mesh }) => scene.add(mesh))
  }
  update(string: String3D, dir: Point3D) {
    const { numSegments, segments, ribbon } = this
    ribbon.update(dir, string.directions, 0.05)
    for (let i = 0; i <= numSegments; i++) {
      const ia = Math.max(0, i - 1)
      const ib = Math.min(i + 1, numSegments - 1)
      const di = ib - ia
      const pp = string.points[ia]
      const pn = string.points[ib]
      const { x, y, z } = string.points[i]
      const dx = (pn.x - pn.x) / di
      const dy = (pn.y - pp.y) / di
      const dz = (pn.z - pp.z) / di
      const up = segments[i - 1]?.uniforms
      const un = segments[i]?.uniforms
      const diry = ribbon.normals[i]
      const dirx = normalize(cross(diry, { x: dx, y: dy, z: dz }))
      const w = 0.2
      const h = 0.2
      if (up) {
        up.v1.value.set(x, y, z)
        up.vx1.value.set(w * dirx.x, w * dirx.y, w * dirx.z)
        up.vy1.value.set(h * diry.x, h * diry.y, h * diry.z)
        up.vz1.value.set(dx, dy, dz)
      }
      if (un) {
        un.v0.value.set(x, y, z)
        un.vx0.value.set(w * dirx.x, w * dirx.y, w * dirx.z)
        un.vy0.value.set(h * diry.x, h * diry.y, h * diry.z)
        un.vz0.value.set(dx, dy, dz)
      }
    }
  }
  updateDebug() {
    const dx = 1
    const s = 0
    const t = performance.now() / 1000
    const { numSegments } = this
    const positions = [...new Array(this.numSegments + 1)].map((_, i) => 
      [dx * (i - this.numSegments / 2), s * Math.sin(i/2 + t), s * Math.cos(i/2 + 1.2 * t)] as const
    )
    function fz(i: number) {
      const ia = Math.max(0, i - 1)
      const ib = Math.min(i + 1, numSegments - 1)
      return [0, 1, 2].map(axis => (positions[ib][axis] - positions[ia][axis]) / (ib - ia)) as [number, number, number]
    }
    this.segments.forEach(({ uniforms, material }, i) => {
      const t0 = t / 3.2 + i / 3
      const t1 = t / 3.2 + (i + 1) / 3
      const cos0 = Math.cos(t0)
      const sin0 = Math.sin(t0)
      const cos1 = Math.cos(t1)
      const sin1 = Math.sin(t1)
      uniforms.v0.value.set(...positions[i])
      uniforms.v1.value.set(...positions[i + 1])
      uniforms.vx0.value.set(0, dx*4*cos0, dx*4*sin0)
      uniforms.vx1.value.set(0, dx*4*cos1, dx*4*sin1)
      uniforms.vy0.value.set(0, dx*4*sin0, -dx*4*cos0)
      uniforms.vy1.value.set(0, dx*4*sin1, -dx*4*cos1)
      uniforms.vz0.value.set(...fz(i))
      uniforms.vz1.value.set(...fz(i + 1))
      material.needsUpdate = true
    })
  }
}
