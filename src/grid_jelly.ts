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
  addInnerForce() {
    const { segments, coords } = this
    function add(a: JellyCoord, b: JellyCoord) {
      const dist = distance(a.dst, b.dst)
      const dx = b.p.x - a.p.x
      const dy = b.p.y - a.p.y
      const dz = b.p.z - a.p.z
      const r = Math.hypot(dx, dy, dz)
      const f = (1 - dist / r) / 4
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
    ctx.restore()
  }
}
