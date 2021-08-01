import * as THREE from 'three'
import { createPlaneJellyGeomety, createJellyShader, JellyUniforms, createJellyGeometryGrids } from './jelly_mesh'
import {
  Point3D, Matrix3, distance, cross,
  normalize as vectorNormalize,
  length as vectorLength,
  scale as vectorScale,
  add as vectorAdd,
  sub as vectorSub
} from './math'
import type { String3D } from './string'

type JellyCoord = {
  r: number
  th: number
  z: number
  dst: Point3D
  p: Point3D
  v: Point3D
  f: Point3D
}

type Cell = {
  i: number
  j: number
  uniforms: JellyUniforms
  material: THREE.ShaderMaterial
  mesh: THREE.Mesh
  geometry: THREE.BufferGeometry
}
export class JellyGrid {
  position: Point3D = { x: 0, y: 0, z: 0 }
  rotation = Matrix3.fromRotation({ x: 3, y: 2, z: 1 }, 1)
  velocity: Point3D = { x: 0, y: 0, z: 0 }
  momentum: Point3D = { x: 0, y: 0, z: 0 }
  coords: [JellyCoord[][],JellyCoord[][]] = [[], []]
  strings: { pos: Point3D, dir: Point3D, string: String3D }[] = []
  cells: Cell[] = []

  constructor(public segments: number) {
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        this.coords[iz][ix]=[]
        const x = 2.0 * ix / segments - 1
        for (let iy = 0; iy <= segments; iy++) {
          const y = 2.0 * iy / segments - 1
          const r = Math.hypot(x, y)
          this.coords[iz][ix][iy] = {
            r: Math.hypot(x, y),
            th: Math.atan2(y, x),
            z: -2 * iz / segments,
            dst: { x: 0, y: 0, z: 0 },
            p: { x: 0, y: 0, z: 0 },
            v: { x: 0, y: 0, z: 0 },
            f: { x: 0, y: 0, z: 0 }
          }
        }
      }
    }
    this.updateDestination(0)
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const { p, dst } = this.coords[iz][ix][iy]
          p.x = dst.x
          p.y = dst.y
          p.z = dst.z
        }
      }
    }
    const gridGeometries = createJellyGeometryGrids(segments)
    gridGeometries.forEach((geometries, i) => {
      return geometries.forEach((geometry, j) => {
        if (!geometry) return
        const material = createJellyShader()
        this.cells.push({
          i,
          j,
          geometry,
          material,
          uniforms: material.uniforms,
          mesh: new THREE.Mesh(geometry, material)
        })
      })
    })
  }
  addToScene(scene: THREE.Scene) {
    this.cells.forEach(cell => scene.add(cell.mesh))
  }
  removeFromScene(scene: THREE.Scene) {
    this.cells.forEach(cell => scene.remove(cell.mesh))
  }
  updateMesh() {
    const { coords, segments } = this
    function set(v: { value: THREE.Vector3 }, p: Point3D) {
      v.value.set(p.x, p.y, p.z)
    }
    function mixset(v: { value: THREE.Vector3 }, a: Point3D, b: Point3D, c: Point3D, w: readonly [number, number, number]) {
      const [wa, wb, wc] = w
      v.value.set(
        a.x * wa + b.x * wb + c.x * wc,
        a.y * wa + b.y * wb + c.y * wc,
        a.z * wa + b.z * wb + c.z * wc,
      )
    }
    const wc = [-0.5, 0, 0.5] as const
    const wl = [-1.5, 2, -0.5] as const
    const wr = [0.5, -2, 1.5] as const
    this.cells.forEach(({ i, j, uniforms, material }) => {
      set(uniforms.v000, coords[0][i][j].p)
      set(uniforms.v100, coords[0][i + 1][j].p)
      set(uniforms.v010, coords[0][i][j + 1].p)
      set(uniforms.v110, coords[0][i + 1][j + 1].p)
      set(uniforms.v001, coords[1][i][j].p)
      set(uniforms.v101, coords[1][i + 1][j].p)
      set(uniforms.v011, coords[1][i][j + 1].p)
      set(uniforms.v111, coords[1][i + 1][j + 1].p)
      const i0 = i === 0 ? 0 : i - 1
      const i1 = i === segments - 1 ? i - 1 : i
      const j0 = j === 0 ? 0 : j - 1
      const j1 = j === segments - 1 ? j - 1 : j
      const wx0 = i === 0 ? wl : wc
      const wx1 = i === segments - 1 ? wr : wc
      const wy0 = j === 0 ? wl : wc
      const wy1 = j === segments - 1 ? wr : wc
      mixset(uniforms.vx000, coords[0][i0][j].p, coords[0][i0 + 1][j].p, coords[0][i0 + 2][j].p, wx0)
      mixset(uniforms.vx001, coords[1][i0][j].p, coords[1][i0 + 1][j].p, coords[1][i0 + 2][j].p, wx0)
      mixset(uniforms.vx010, coords[0][i0][j + 1].p, coords[0][i0 + 1][j + 1].p, coords[0][i0 + 2][j + 1].p, wx0)
      mixset(uniforms.vx011, coords[1][i0][j + 1].p, coords[1][i0 + 1][j + 1].p, coords[1][i0 + 2][j + 1].p, wx0)
      mixset(uniforms.vx100, coords[0][i1][j].p, coords[0][i1 + 1][j].p, coords[0][i1 + 2][j].p, wx1)
      mixset(uniforms.vx101, coords[1][i1][j].p, coords[1][i1 + 1][j].p, coords[1][i1 + 2][j].p, wx1)
      mixset(uniforms.vx110, coords[0][i1][j + 1].p, coords[0][i1 + 1][j + 1].p, coords[0][i1 + 2][j + 1].p, wx1)
      mixset(uniforms.vx111, coords[1][i1][j + 1].p, coords[1][i1 + 1][j + 1].p, coords[1][i1 + 2][j + 1].p, wx1)
      mixset(uniforms.vy000, coords[0][i][j0].p, coords[0][i][j0 + 1].p, coords[0][i][j0 + 2].p, wy0)
      mixset(uniforms.vy001, coords[1][i][j0].p, coords[1][i][j0 + 1].p, coords[1][i][j0 + 2].p, wy0)
      mixset(uniforms.vy100, coords[0][i + 1][j0].p, coords[0][i + 1][j0 + 1].p, coords[0][i + 1][j0 + 2].p, wy0)
      mixset(uniforms.vy101, coords[1][i + 1][j0].p, coords[1][i + 1][j0 + 1].p, coords[1][i + 1][j0 + 2].p, wy0)
      mixset(uniforms.vy010, coords[0][i][j1].p, coords[0][i][j1 + 1].p, coords[0][i][j1 + 2].p, wy1)
      mixset(uniforms.vy011, coords[1][i][j1].p, coords[1][i][j1 + 1].p, coords[1][i][j1 + 2].p, wy1)
      mixset(uniforms.vy110, coords[0][i + 1][j1].p, coords[0][i + 1][j1 + 1].p, coords[0][i + 1][j1 + 2].p, wy1)
      mixset(uniforms.vy111, coords[1][i + 1][j1].p, coords[1][i + 1][j1 + 1].p, coords[1][i + 1][j1 + 2].p, wy1)

      const vz00 = {
        x: coords[1][i][j].p.x - coords[0][i][j].p.x,
        y: coords[1][i][j].p.y - coords[0][i][j].p.y,
        z: coords[1][i][j].p.z - coords[0][i][j].p.z
      }
      const vz10 = {
        x: coords[1][i + 1][j].p.x - coords[0][i + 1][j].p.x,
        y: coords[1][i + 1][j].p.y - coords[0][i + 1][j].p.y,
        z: coords[1][i + 1][j].p.z - coords[0][i + 1][j].p.z
      }
      const vz01 = {
        x: coords[1][i][j + 1].p.x - coords[0][i][j + 1].p.x,
        y: coords[1][i][j + 1].p.y - coords[0][i][j + 1].p.y,
        z: coords[1][i][j + 1].p.z - coords[0][i][j + 1].p.z
      }
      const vz11 = {
        x: coords[1][i + 1][j + 1].p.x - coords[0][i + 1][j + 1].p.x,
        y: coords[1][i + 1][j + 1].p.y - coords[0][i + 1][j + 1].p.y,
        z: coords[1][i + 1][j + 1].p.z - coords[0][i + 1][j + 1].p.z
      }
      set(uniforms.vz000, vz00)
      set(uniforms.vz001, vz00)
      set(uniforms.vz100, vz10)
      set(uniforms.vz101, vz10)
      set(uniforms.vz010, vz01)
      set(uniforms.vz011, vz01)
      set(uniforms.vz110, vz11)
      set(uniforms.vz111, vz11)
    })
  }
  addString(pos: Point3D, dir: Point3D, string: String3D) {
    this.strings.push({ pos, dir, string })
    string.directions
    const gpos = this.transformGridPoint(pos)
    string.points[0].x = gpos.x
    string.points[0].y = gpos.y
    string.points[0].z = gpos.z
    const gpos2 = this.transformGridPoint(vectorAdd(pos, vectorScale(dir, 0.01)))
    const d = vectorNormalize(vectorSub(gpos2, gpos))
    string.directions.forEach(dir => {
      dir.x = d.x
      dir.y = d.y
      dir.z = d.z
    })
    string.calcPoints()
  }
  jellyDestination(l: number, th: number, time: number, z: number) {
    const f = ((1 + Math.sin(time - l + Math.sin(th) * 0.5)) / 2) ** 2
    const rmin = 0.8
    const rmax = 2
    const rlen = rmax + (rmin - rmax) * f
    const r = (rlen + z) * Math.sin(l / rlen)
    return {
      x: r * Math.cos(th),
      y: r * Math.sin(th),
      z: rlen - (rlen + z) * Math.cos(l / rlen) - 0.25
    }
  }
  updateDestination(time: number) {
    const { segments, coords } = this
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const coord = coords[iz][ix][iy]
          coord.dst = this.transformLocalPoint(this.jellyDestination(coord.r, coord.th, time, coord.z))
        }
      }
    }
  }
  transformLocalPoint(p: Point3D) {
    return vectorAdd(this.position, this.rotation.transform(p))
  }
  transformGridPoint({ x, y, z }: Point3D) {
    const { coords, segments } = this
    x = (x + 1) * this.segments / 2
    y = (y + 1) * this.segments / 2
    const ix = Math.max(0, Math.min(Math.floor(x), segments - 1))
    const iy = Math.max(0, Math.min(Math.floor(y), segments - 1))
    x -= ix
    y -= iy
    const a1x = x * x * (3 - 2 * x)
    const a1y = y * y * (3 - 2 * y)
    const a1z = z * z * (3 - 2 * z)
    const a0x = 1 - a1x
    const a0y = 1 - a1y
    const a0z = 1 - a1z
    const b0x = x * (1 - x) * (1 - x)
    const b0y = y * (1 - y) * (1 - y)
    const b0z = z * (1 - z) * (1 - z)
    const b1x = x * x * (x - 1)
    const b1y = y * y * (y - 1)
    const b1z = z * z * (z - 1)
    x = y = z = 0
    for (let ijk = 0; ijk < 8; ijk++) {
      const i = ijk & 1
      const j = (ijk >> 1) & 1
      const k = (ijk >> 2) & 1
      const x0 = ix + i
      const y0 = iy + j
      const xa = x0 === 0 ? 0 : x0 === segments ? segments - 2 : x0 - 1
      const xb = xa + 1
      const xc = xa + 2
      const ya = y0 === 0 ? 0 : y0 === segments ? segments - 2 : y0 - 1
      const yb = ya + 1
      const yc = ya + 2
      const p = coords[k][x0][y0].p
      const pza = coords[0][x0][y0].p
      const pzc = coords[1][x0][y0].p
      const pxa = coords[k][xa][y0].p
      const pxb = coords[k][xb][y0].p
      const pxc = coords[k][xc][y0].p
      const pya = coords[k][x0][ya].p
      const pyb = coords[k][x0][yb].p
      const pyc = coords[k][x0][yc].p
      const a = i === 0 ? a0x : a1x
      const b = j === 0 ? a0y : a1y
      const c = k === 0 ? a0z : a1z
      const na = i === 0 ? b0x : b1x
      const nb = j === 0 ? b0y : b1y
      const nc = k === 0 ? b0z : b1z
      const [ax, bx, cx] = x0 === 0 ? [-1.5, 2, -0.5] : x0 === segments ? [0.5, -2, 1.5] : [-0.5, 0, 0.5]
      const [ay, by, cy] = y0 === 0 ? [-1.5, 2, -0.5] : y0 === segments ? [0.5, -2, 1.5] : [-0.5, 0, 0.5]
      x += (
        p.x * a * b * c
        + (ax * pxa.x + bx * pxb.x + cx * pxc.x) * na * b * c
        + (ay * pya.x + by * pyb.x + cy * pyc.x) * a * nb * c
        + (pzc.x - pza.x) * a * b * nc
      )
      y += (
        p.y * a * b * c
        + (ax * pxa.y + bx * pxb.y + cx * pxc.y) * na * b * c
        + (ay * pya.y + by * pyb.y + cy * pyc.y) * a * nb * c
        + (pzc.y - pza.y) * a * b * nc
      )
      z += (
        p.z * a * b * c
        + (ax * pxa.z + bx * pxb.z + cx * pxc.z) * na * b * c
        + (ay * pya.z + by * pyb.z + cy * pyc.z) * a * nb * c
        + (pzc.z - pza.z) * a * b * nc
      )
    }
    return { x, y, z }
  }
  addInnerForce() {
    const { segments, coords } = this
    function add(a: JellyCoord, b: JellyCoord) {
      const dist = distance(a.dst, b.dst)
      const dx = b.p.x - a.p.x
      const dy = b.p.y - a.p.y
      const dz = b.p.z - a.p.z
      const r = Math.hypot(dx, dy, dz)
      const f = (1 - dist / r) * 16
      a.f.x += f * dx
      a.f.y += f * dy
      a.f.z += f * dz
      b.f.x -= f * dx
      b.f.y -= f * dy
      b.f.z -= f * dz
    }
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const c = coords[iz][ix][iy]
          if (iz == 0) {
            add(c, coords[1][ix][iy])
            if (ix < segments) add(c, coords[1][ix + 1][iy])
            if (iy < segments) add(c, coords[1][ix][iy + 1])
            if (ix < segments && iy < segments) add(c, coords[1][ix + 1][iy + 1])
          }
          if (ix < segments) add(c, coords[iz][ix + 1][iy])
          if (iy < segments) add(c, coords[iz][ix][iy + 1])
          if (ix < segments && iy < segments) add(c, coords[iz][ix + 1][iy + 1])
        }
      }
    }
  }
  update(time: number) {
    const dt = 0.01
    this.position =vectorAdd(this.position, vectorScale(this.velocity, dt))
    const w = Matrix3.fromRotation(this.momentum, vectorLength(this.momentum) * dt)
    this.rotation = w.mult(this.rotation)
    this.updateDestination(time)
    this.addInnerForce()
    const { coords, segments} = this
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const { p, v, f, dst } = coords[iz][ix][iy]
          const f2 = {
            x: 8 * (dst.x - p.x) - 2 * v.x,
            y: 8 * (dst.y - p.y) - 2 * v.y,
            z: 8 * (dst.z - p.z) - 2 * v.z
          }
          v.x += (f.x + f2.x) * dt
          v.y += (f.y + f2.y) * dt
          v.z += (f.z + f2.z) * dt
          this.pull(p, f2, -dt)
          p.x += v.x * dt
          p.y += v.y * dt
          p.z += v.z * dt
          f.x = f.y = f.z = 0
        }
      }
    }
    this.strings.forEach(({ pos, dir, string }) => {
      string.addHardnessForce(4, 4)
      string.addForce(0, 0.5)
      string.F.forEach(f => { f.z += 0.0002 })
      const n = Math.min(Math.ceil(0.1 / string.segmentLength), string.numSegments)
      const firstPos = this.transformGridPoint(pos)
      const gdir = vectorNormalize(vectorSub(this.transformGridPoint(vectorAdd(pos, vectorScale(dir, 0.01))), firstPos))
      for (let i = 0; i < n; i++) {
        const p = string.points[i]
        const t = i / n * 10
        const f = {
          x: t * (firstPos.x + i * string.segmentLength * gdir.x - p.x),
          y: t * (firstPos.y + i * string.segmentLength * gdir.y - p.y),
          z: t * (firstPos.z + i * string.segmentLength * gdir.z - p.z)
        }
        string.F[i].x += f.x
        string.F[i].y += f.y
        string.F[i].z += f.z
        this.pull(p, f, -dt)
      }
      const f = string.update(dt, { first: firstPos })
      this.addGridForce(pos, f.first, -dt)
    })
    this.updateMesh()
  }
  addGridForce({ x, y, z }: Point3D, f: Point3D, dt: number) {
    const { coords, segments } = this
    x = (x + 1) * this.segments / 2
    y = (y + 1) * this.segments / 2
    const ix = Math.max(0, Math.min(Math.floor(x), segments - 1))
    const iy = Math.max(0, Math.min(Math.floor(y), segments - 1))
    x -= ix
    y -= iy
    for (let ijk = 0; ijk < 8; ijk++) {
      const i = ijk & 1
      const j = (ijk >> 1) & 1
      const k = (ijk >> 2) & 1
      const v = coords[k][ix + i][iy + j].v
      const scale = (i ? x : 1 - x) * (j ? y : 1 - y) * (k ? z : 1 - z) * dt
      v.x += scale * f.x
      v.y += scale * f.y
      v.z += scale * f.z
    }
  }
  pull(p: Point3D, f: Point3D, dt: number) {
    this.velocity = vectorAdd(this.velocity, vectorScale(f, dt))
    this.momentum = vectorAdd(this.momentum, vectorScale(cross(vectorSub(p, this.position), f), dt))
  }
  renderDebug(ctx: CanvasRenderingContext2D) {
    ctx.save()
    const bodyCoords: Point3D[] = []
    for (let i = 0; i < 8; i++) bodyCoords.push({ x: (i & 1) * 2 - 1, y: ((i >> 1) & 1) * 2 - 1, z: ((i >> 2) & 1) * 2 - 1 })
    ctx.beginPath()
    bodyCoords.forEach(p => {
      bodyCoords.forEach(q => {
        if (distance(p, q) !== 2) return
        const tp = this.transformLocalPoint(vectorScale(p, 0.5))
        const tq = this.transformLocalPoint(vectorScale(q, 0.5))
        ctx.moveTo(tp.x, tp.z)
        ctx.lineTo(tq.x, tq.z)
      })
    })
    ctx.strokeStyle = 'gray'
    ctx.stroke()
    ctx.beginPath()
    const { segments, coords } = this
    function draw(a: JellyCoord, b: JellyCoord) {
      ctx.moveTo(a.p.x, a.p.z)
      ctx.lineTo(b.p.x, b.p.z)
    }
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const c = coords[iz][ix][iy]
          if (iz == 0) draw(c, coords[iz + 1][ix][iy])
          if (ix != 0) draw(c, coords[iz][ix - 1][iy])
          if (iy != 0) draw(c, coords[iz][ix][iy - 1])
        }
      }
    }
    ctx.strokeStyle = 'black'
    ctx.stroke()
    ctx.restore()
  }
  renderToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.scale(0.2, 0.2)
    ctx.lineCap = ctx.lineJoin = 'round'
    this.renderDebug(ctx)
    ctx.beginPath()
    ctx.lineWidth *= 8
    for (let r = 1; r > 0.05; r-=0.1) {
      const n = Math.round(r * 64)
      const p = this.transformGridPoint({ x: r, y: 0, z: 0 })
      ctx.moveTo(p.x, p.z)
      for (let i = 0; i <= n; i++) {
        const th = 2 * Math.PI * i / n
        const p = this.transformGridPoint({ x: r * Math.cos(th), y: r * Math.sin(th), z: (1 - (1 - r*r) ** 0.5) })
        i === 0 ? ctx.moveTo(p.x, p.z) : ctx.lineTo(p.x, p.z)
      }
    }
    ctx.strokeStyle = 'blue'
    ctx.stroke()
    ctx.strokeStyle = 'red'
    this.strings.forEach(({ string }) => string.renderToCanvas(ctx))
    ctx.restore()
  }
}
