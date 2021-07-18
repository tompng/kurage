import {
  Point3D, Matrix3, distance, cross,
  normalize as vectorNormalize,
  length as vectorLength,
  scale as vectorScale,
  add as vectorAdd,
  sub as vectorSub
} from './math'
import type { String3D, Ribbon } from './string'
type ShapeParam = {
  size: number
  theta1: number
  theta2: number
}
type HardnessParam = {
  arc: number
  radial: number
}

type JellyPoint = { th: number; r: 0 | 1 | 2; p: Point3D; v: Point3D; f: Point3D }
type JellyLink = { a: JellyPoint; b: JellyPoint; r: number; k: number }

function toRZ(rtype: 0 | 1 | 2, { size, theta1, theta2 }: ShapeParam, shrink: number) {
  const z = size * (Math.sin(theta1) + Math.sin(theta2)) / 2
  const c1 = Math.cos(theta1 + shrink / 2)
  const s1 = Math.sin(theta1 + shrink / 2)
  const c2 = Math.cos(theta2 + shrink)
  const s2 = Math.sin(theta2 + shrink)
  if (rtype === 0) {
    return { r: 0, z: z }
  } if (rtype === 1) {
    return { r: size * c1, z: z - size * s1 }
  } else {
    return { r: size * (c1 + c2), z: z - size * (s1 + s2) }
  }
}

function genLink(a: JellyPoint, b: JellyPoint, k: number): JellyLink {
  const r = Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y, a.p.z - b.p.z)
  return { a, b, r, k }
}

export class Jelly {
  size = 0.05
  position: Point3D = { x: 0.5, y: 0, z: 0.5 }
  rotation = new Matrix3()
  velocity: Point3D = { x: 0, y: 0, z: 0 }
  momentum: Point3D = { x: 0, y: 0, z: 0 }

  innerPoints: JellyPoint[] = []
  outerPoints: JellyPoint[] = []

  points: JellyPoint[] = []
  links: JellyLink[] = []
  pointStrings: { p: JellyPoint; s: String3D; r: Ribbon | null }[] = []
  coreStrings: { p: Point3D; s: String3D; r: Ribbon | null }[] = []
  constructor(public numSegments: number, public shape: ShapeParam, public hardness: HardnessParam) {
    this.setInitialPosition()
    this.setLinks()
  }

  genJellyPoint(rtype: 0 | 1 | 2, th: number): JellyPoint {
    const { r: radius, z } = toRZ(rtype, this.shape, 0)
    const x = radius * Math.cos(th)
    const y = radius* Math.sin(th)
    return {
      r: rtype,
      th,
      p: this.transformLocalPoint({ x, y, z }),
      v: { x: 0, y: 0, z: 0 },
      f: { x: 0, y: 0, z: 0 }
    }
  }

  assignStrings(innerStrings: String3D[], innerRibbons: Ribbon[], outerStrings: String3D[], outerRibbons: Ribbon[]) {
    const { pointStrings, numSegments, outerPoints } = this
    innerStrings.forEach((s, i) => {
      const th = 2 * Math.PI * i / innerStrings.length
      const r = 0.3
      const p = { x: r * Math.cos(th), y: r * Math.sin(th), z: -r }
      this.coreStrings.push({ p, s, r: innerRibbons[i] ?? null })
      const { x, y, z } = this.transformLocalPoint(p)
      s.points[0].x = x
      s.points[0].y = y
      s.points[0].z = z
      s.calcPoints()
    })

    outerStrings.forEach((s, i) => {
      const p = outerPoints[Math.round(i * numSegments / outerStrings.length) % outerPoints.length]
      const r = outerRibbons[i] ?? null
      s.points[0].x = p.p.x
      s.points[0].y = p.p.y
      s.points[0].z = p.p.z
      s.weights[0] = 1
      s.calcPoints()
      pointStrings.push({ p, s, r })
    })
  }
  setInitialPosition() {
    for (let i = 0; i < this.numSegments; i++) {
      const th = 2 * Math.PI * i / this.numSegments
      const inner = this.genJellyPoint(1, th)
      const outer = this.genJellyPoint(2, th)
      this.points.push(inner, outer)
      this.innerPoints.push(inner)
      this.outerPoints.push(outer)
    }
  }
  setLinks() {
    const { numSegments, links, innerPoints, outerPoints, hardness } = this
    for (let i = 0; i < numSegments; i++) {
      links.push(genLink(innerPoints[i], outerPoints[i], hardness.radial))
      links.push(genLink(innerPoints[i], innerPoints[(i + 1) % numSegments], hardness.arc))
      links.push(genLink(outerPoints[i], outerPoints[(i + 1) % numSegments], hardness.arc))
    }
  }
  resetForce() {
    this.points.forEach(p => { p.f.x = p.f.y = p.f.z = 0 })
  }
  updateForce(links: JellyLink[], shrink: number, dt: number) {
    const friction = 4
    this.points.forEach(p => {
      p.f.x -= friction * p.v.x
      p.f.y -= friction * p.v.y
      p.f.z -= friction * p.v.z
      const { r, z } = toRZ(p.r, this.shape, shrink)
      const x = r * Math.cos(p.th)
      const y = r * Math.sin(p.th)
      const dst = this.transformLocalPoint({ x, y, z })
      const f = vectorScale(vectorSub(dst, p.p), 100)
      p.f.x += f.x
      p.f.y += f.y
      p.f.z += f.z
      this.pull(p.p, f, -dt)
    })
    links.forEach(({ a, b, r, k }) => {
      const dx = b.p.x - a.p.x
      const dy = b.p.y - a.p.y
      const dz = b.p.z - a.p.z
      const distance = Math.hypot(dx, dy, dz)
      const dotv = (dx * (b.v.x - a.v.x) + dy * (b.v.y - a.v.y) + dz * (b.v.z - a.v.z)) / distance
      const scale = k * (distance - r) / r / distance + k * dotv / distance
      a.f.x += scale * dx
      a.f.y += scale * dy
      a.f.z += scale * dz
      b.f.x -= scale * dx
      b.f.y -= scale * dy
      b.f.z -= scale * dz
    })
  }
  transformLocalPoint(p: Point3D) {
    return vectorAdd(this.position, vectorScale(this.rotation.transform(p), this.size))
  }
  pullTo(p: Point3D, dt: number) {
    const tp = this.transformLocalPoint({ x: 0, y: 0, z: 1 })
    const fv = vectorSub(p, tp)
    this.pull(tp, fv, 40 * dt)
    this.velocity = vectorScale(this.velocity, 0.9)
    this.momentum = vectorScale(this.momentum, 0.9)
  }
  pull(p: Point3D, f: Point3D, dt: number) {
    this.velocity = vectorAdd(this.velocity, vectorScale(f, dt))
    this.momentum = vectorAdd(this.momentum, vectorScale(cross(vectorSub(p, this.position), f), dt / this.size / this.size))
  }
  update(dt: number, shrink: number) {
    this.position =vectorAdd(this.position, vectorScale(this.velocity, dt))
    const w = Matrix3.fromRotation(this.momentum, vectorLength(this.momentum) * dt)
    this.rotation = w.mult(this.rotation)
    this.coreStrings.forEach(({ p, s, r }) => {
      const gp = this.transformLocalPoint(p)
      s.addHardnessForce(10, 10)
      s.addForce(0, 4)
      let n = 10
      for (let i = 0; i < n; i++) {
        const gp = this.transformLocalPoint(vectorAdd(p, { x: 0, y: 0, z: -i * s.segmentLength / this.size }))
        const fv = vectorSub(vectorSub(gp, s.points[i]), vectorScale(s.velocities[i], 4 * dt))
        const f = 400 * (n - i) / n / n
        s.F[i].x += f * fv.x
        s.F[i].y += f * fv.y
        s.F[i].z += f * fv.z
        this.pull(gp, fv, -f * dt)
      }
      const f = s.update(dt, { first: gp }).first
      this.pull(gp, f, -dt)
      if (r) {
        const gpc = this.transformLocalPoint({ x: 0, y: 0, z: p.z })
        const v = vectorNormalize(vectorSub(gpc, gp))
        r.update(v, s.directions, 10 * dt)
      }
    })
    this.updateForce(this.links, shrink, dt)
    this.points.forEach(({ p, v, f }) => {
      v.x += f.x * dt
      v.y += f.y * dt
      v.z += f.z * dt
      p.x += v.x * dt
      p.y += v.y * dt
      p.z += v.z * dt
    })
    this.pointStrings.forEach(({ p, s }) => {
      s.addHardnessForce(10, 10)
      s.addForce(0, 4)
      s.F[0].x += p.f.x
      s.F[0].y += p.f.y
      s.F[0].z += p.f.z
      s.update(dt, {})
      p.p.x = s.points[0].x
      p.p.y = s.points[0].y
      p.p.z = s.points[0].z
      p.v.x = s.velocities[0].x
      p.v.y = s.velocities[0].y
      p.v.z = s.velocities[0].z
    })
    this.resetForce()
  }
  topPoint() {
    const { z } = toRZ(0, this.shape, 0)
    return this.transformLocalPoint({ x: 0, y: 0, z })
  }
  renderToCanvas(ctx: CanvasRenderingContext2D) {
    const topPoint = this.topPoint()
    ctx.beginPath()
    ;[...this.links].forEach(({ a, b }) => {
      ctx.moveTo(a.p.x, a.p.z)
      ctx.lineTo(b.p.x, b.p.z)
    })
    this.innerPoints.forEach(({ p }) => {
      ctx.moveTo(topPoint.x, topPoint.z)
      ctx.lineTo(p.x, p.z)
    })
    ctx.stroke()

    const coords: Point3D[] = []
    for (let i = 0; i < 8; i++) coords.push({ x: (i & 1) * 2 - 1, y: ((i >> 1) & 1) * 2 - 1, z: ((i >> 2) & 1) * 2 - 1 })
    ctx.beginPath()
    coords.forEach(p => {
      coords.forEach(q => {
        if (distance(p, q) !== 2) return
        const tp = this.transformLocalPoint(p)
        const tq = this.transformLocalPoint(q)
        ctx.moveTo(tp.x, tp.z)
        ctx.lineTo(tq.x, tq.z)
      })
    })
    ctx.stroke()

    this.coreStrings.forEach(({ s, r }) => {
      s.renderToCanvas(ctx)
      ctx.save()
      ctx.globalAlpha = 0.4
      r?.renderToCanvas(ctx, s, [0.01, 0.02, 0])
      ctx.restore()
    })

    this.pointStrings.forEach(({ s }) => s.renderToCanvas(ctx))
    const dotSize = this.shape.size / 400
    ;([
      [this.innerPoints, 'rgba(255,0,0,0.5)'],
      [this.outerPoints, 'rgba(0,0,255,0.5)']
    ] as const).forEach(([points, color]) => {
      ctx.fillStyle = color
      points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.p.x, p.p.z, dotSize, 0, 2 * Math.PI)
        ctx.fill()
      })
    })
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255,128,0,0.5)'
    ctx.arc(topPoint.x, topPoint.z, dotSize, 0, 2 * Math.PI)
    ctx.fill()
  }
}
