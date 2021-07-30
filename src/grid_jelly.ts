import { createPlaneJellyGeomety, createJellyShader, JellyUniforms } from './jelly_mesh'
import {
  Point3D, Matrix3, distance, cross,
  normalize as vectorNormalize,
  length as vectorLength,
  scale as vectorScale,
  add as vectorAdd,
  sub as vectorSub
} from './math'

type JellyCoord = {
  r: number
  th: number
  z: number
  dst: Point3D
  p: Point3D
  v: Point3D
  f: Point3D
}
const geometry = createPlaneJellyGeomety(10)
export class JellyGrid {
  position: Point3D = { x: 0, y: 0, z: 0 }
  rotation = new Matrix3()
  velocity: Point3D = { x: 0, y: 0, z: 0 }
  momentum: Point3D = { x: 0, y: 0, z: 0 }
  coords: [JellyCoord[][],JellyCoord[][]] = [[], []]
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
      z: rlen - (rlen + z) * Math.cos(l / rlen)
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
      const f = (1 - dist / r) * 4
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
    this.updateDestination(time)
    this.addInnerForce()
    const { coords, segments} = this
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const { p, v, f, dst } = coords[iz][ix][iy]
          f.x += 8 * (dst.x - p.x) - 2 * v.x
          f.y += 8 * (dst.y - p.y) - 2 * v.y
          f.z += 8 * (dst.z - p.z) - 2 * v.z
          v.x += f.x * dt
          v.y += f.y * dt
          v.z += f.z * dt
          p.x += v.x * dt
          p.y += v.y * dt
          p.z += v.z * dt
          f.x = f.y = f.z = 0
        }
      }
    }
  }
  pull(p: Point3D, f: Point3D, dt: number) {
    this.velocity = vectorAdd(this.velocity, vectorScale(f, dt))
    this.momentum = vectorAdd(this.momentum, vectorScale(cross(vectorSub(p, this.position), f), dt))
  }

  renderToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.scale(0.2, 0.2)
    ctx.beginPath()
    const { segments, coords } = this
    function draw(a: JellyCoord, b: JellyCoord) {
      ctx.moveTo(a.p.x, a.p.z)
      ctx.lineTo(b.p.x, b.p.z)
    }
    for (let iz = 0; iz < 2; iz++) {
      for (let ix = 0; ix <= segments; ix++) {
        for (let iy = 0; iy <= segments; iy++) {
          const c = this.coords[iz][ix][iy]
          if (iz == 0) draw(c, this.coords[iz + 1][ix][iy])
          if (ix != 0) draw(c, this.coords[iz][ix - 1][iy])
          if (iy != 0) draw(c, this.coords[iz][ix][iy - 1])
        }
      }
    }
    ctx.stroke()
    ctx.beginPath()
    ctx.lineWidth *= 4
    for (let r = 1; r > 0.05; r-=0.1) {
      const n = Math.round(r * 64)
      const p = this.transformGridPoint({ x: r, y: 0, z: 0 })
      ctx.moveTo(p.x, p.z)
      for (let i = 0; i <= n; i++) {
        const th = 2 * Math.PI * i / n
        const p = this.transformGridPoint({ x: r * Math.cos(th), y: r * Math.sin(th), z: (1 - (1 - r*r) ** 0.5) / 2 })
        i === 0 ? ctx.moveTo(p.x, p.z) : ctx.lineTo(p.x, p.z)
      }
    }
    ctx.strokeStyle = 'blue'
    ctx.stroke()
    ctx.restore()
  }
}
