import {
  Point3D, Matrix3, distance, cross,
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
  innerDistance: number
  innerRadius: number
}
type HardnessParam = {
  core: number
  arc: number
  radial: number
}

type JellyPoint = { p: Point3D; v: Point3D; f: Point3D }
type JellyLink = { a: JellyPoint; b: JellyPoint; r: number; k: number }

function genPoint(x: number, y: number, z: number): JellyPoint {
  return {
    p: { x, y, z },
    v: { x: 0, y: 0, z: 0 },
    f: { x: 0, y: 0, z: 0 }
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

  innerStrings: String3D[] = []
  outerStrings: String3D[] = []
  innerRibbons: Ribbon[] = []
  outerRibbons: Ribbon[] = []
  topPoint = genPoint(0, 0, 0)
  middlePoints: JellyPoint[] = []
  outerPoints: JellyPoint[] = []
  innerPoints: JellyPoint[] = []
  points: JellyPoint[] = []
  links: JellyLink[] = []
  shrinkRadialLinks: JellyLink[] = []
  shrinkOutlineLinks: JellyLink[] = []
  pointStrings: { p: JellyPoint; s: String3D; r: Ribbon | null }[] = []
  coreStrings: { p: Point3D; s: String3D; r: Ribbon | null }[] = []
  constructor(public numInner: number, public numOuter: number, public shape: ShapeParam, public hardness: HardnessParam) {
    this.setInitialPosition()
    this.setLinks()
  }
  assignStrings(innerStrings: String3D[], innerRibbons: Ribbon[], outerStrings: String3D[], outerRibbons: Ribbon[]) {
    innerStrings.forEach((s, i) => {
      const th = 2 * Math.PI * i / innerStrings.length
      const p = { x: Math.cos(th), y: Math.sin(th), z: -1 }
      this.coreStrings.push({ p, s, r: innerRibbons[i] })
      const { x, y, z } = this.transformLocalPoint(p)
      s.points[0].x = x
      s.points[0].y = y
      s.points[0].z = z
      s.calcPoints()
    })
    // const { pointStrings, numInner, numOuter, innerPoints, outerPoints } = this
    // this.innerStrings = innerStrings
    // this.innerRibbons = innerRibbons
    // this.outerStrings = outerStrings
    // this.outerRibbons = outerRibbons
    // innerStrings.forEach((s, i) => {
    //   const p = innerPoints[Math.round(i * numInner / innerStrings.length) % innerPoints.length]
    //   const r = innerRibbons[i] ?? null
    //   pointStrings.push({ p, s, r })
    // })
    // outerStrings.forEach((s, i) => {
    //   const p = outerPoints[Math.round(i * numOuter / outerStrings.length) % outerPoints.length]
    //   const r = outerRibbons[i] ?? null
    //   pointStrings.push({ p, s, r })
    // })
    // pointStrings.forEach(({ s, p: { p: { x, y, z } } }) => {
    //   const l = s.segmentLength
    //   s.points.forEach((point, i) => {
    //     point.x = x
    //     point.y = y
    //     point.z = z - i * l
    //   })
    // })
  }
  setInitialPosition() {
    const { innerDistance, innerRadius, size, theta1, theta2 } = this.shape
    const innerPos = { d: innerDistance, r: innerRadius }
    const middlePos = { d: size * Math.sin(theta1) / 2, r: size * Math.cos(theta1) / 2 }
    const outerPos = { d: middlePos.d + size * Math.sin(theta2) / 2, r: middlePos.r + size * Math.cos(theta2) / 2 }
    for (let i = 0; i < this.numInner; i++) {
      const th = 2 * Math.PI * i / this.numInner
      const cos = Math.cos(th)
      const sin = Math.sin(th)
      this.innerPoints.push(genPoint(innerPos.r * cos, innerPos.r * sin, -innerPos.d))
    }
    for (let i = 0; i < this.numOuter; i++) {
      const th = 2 * Math.PI * i / this.numOuter
      const cos = Math.cos(th)
      const sin = Math.sin(th)
      this.middlePoints.push(genPoint(middlePos.r * cos, middlePos.r * sin, -middlePos.d))
      this.outerPoints.push(genPoint(outerPos.r * cos, outerPos.r * sin, -outerPos.d))
    }
    this.points.push(this.topPoint)
    ;[this.innerPoints, this.middlePoints, this.outerPoints].forEach(points => {
      points.forEach(p => this.points.push(p))
    })
  }
  setLinks() {
    const { numInner, numOuter, links, shrinkOutlineLinks, shrinkRadialLinks, topPoint, innerPoints, middlePoints, outerPoints, hardness } = this
    for (let i = 0; i < numInner; i++) {
      links.push(genLink(topPoint, innerPoints[i], hardness.core))
      for (let j = i + 1; j < numInner; j++) {
        links.push(genLink(innerPoints[i], innerPoints[j], hardness.core))
      }
    }
    for (let i = 0; i < numOuter; i++) {
      links.push(genLink(topPoint, middlePoints[i], hardness.radial))
      links.push(genLink(middlePoints[i], middlePoints[(i + 1) % numOuter], hardness.arc))
      shrinkOutlineLinks.push(genLink(outerPoints[i], outerPoints[(i + 1) % numOuter], hardness.arc))
      links.push(genLink(middlePoints[i], outerPoints[i], hardness.radial))
      const inner = innerPoints[Math.round(i * numInner / numOuter) % numInner]
      links.push(genLink(inner, middlePoints[i], hardness.radial))
      shrinkRadialLinks.push(genLink(inner, outerPoints[i], hardness.radial))
    }
  }
  resetForce() {
    // this.points.forEach(p => { p.f.x = p.f.y = p.f.z = 0 })
  }
  updateForce(links: JellyLink[], muscle: number, ratio: number) {
    // const friction = 0.5
    // this.points.forEach(p => {
    //   p.f.x -= friction * p.v.x
    //   p.f.y -= friction * p.v.y
    //   p.f.z -= friction * p.v.z
    // })
    // links.forEach(({ a, b, r, k }) => {
    //   const dx = b.p.x - a.p.x
    //   const dy = b.p.y - a.p.y
    //   const dz = b.p.z - a.p.z
    //   const distance = Math.hypot(dx, dy, dz)
    //   const dotv = (dx * (b.v.x - a.v.x) + dy * (b.v.y - a.v.y) + dz * (b.v.z - a.v.z)) / distance
    //   const scale = k * ((distance - r) / r * (1 - muscle) + (distance - r * ratio) / r * muscle) / distance + k * dotv / distance
    //   a.f.x += scale * dx
    //   a.f.y += scale * dy
    //   a.f.z += scale * dz
    //   b.f.x -= scale * dx
    //   b.f.y -= scale * dy
    //   b.f.z -= scale * dz
    // })
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
  update(dt: number, muscle: number) {
    this.position =vectorAdd(this.position, vectorScale(this.velocity, dt))
    const w = Matrix3.fromRotation(this.momentum, vectorLength(this.momentum) * dt)
    this.rotation = w.mult(this.rotation)
    this.coreStrings.forEach(({ p, s }) => {
      const gp = this.transformLocalPoint(p)
      s.addHardnessForce(10, 10)
      s.addForce(0, 10)
      const f = s.update(dt, { first: gp }).first
      this.pull(gp, f, -dt)
    })

    // this.updateForce(this.links, 0, 1)
    // this.updateForce(this.shrinkRadialLinks, muscle, 1)
    // this.updateForce(this.shrinkOutlineLinks, muscle, 0.8)
    // this.points.forEach(({ p, v, f }) => {
    //   v.x += f.x * dt
    //   v.y += f.y * dt
    //   v.z += f.z * dt
    //   p.x += v.x * dt
    //   p.y += v.y * dt
    //   p.z += v.z * dt
    // })
    // this.pointStrings.forEach(({ p, s, r }) => {
    //   const fscale = 1
    //   const f = { x: p.f.x * fscale, y: p.f.y * fscale, z: p.f.z * fscale }
    //   s.addHardnessForce(10, 10)
    //   s.addForce(0, 10)
    //   s.F[0].x += f.x
    //   s.F[0].y += f.y
    //   s.F[0].z += f.z
    //   s.update(dt)
    //   const pos = s.points[0]
    //   const v = s.velocities[0]
    //   p.v.x = v.x
    //   p.v.y = v.y
    //   p.v.z = v.z
    //   p.p.x = pos.x
    //   p.p.y = pos.y
    //   p.p.z = pos.z
    // })
    // this.resetForce()
  }
  renderToCanvas(ctx: CanvasRenderingContext2D) {
    const { position, size, rotation } = this

    ctx.beginPath()
    ;[...this.links, ...this.shrinkOutlineLinks, ...this.shrinkRadialLinks].forEach(({ a, b }) => {
      ctx.moveTo(a.p.x, a.p.z)
      ctx.lineTo(b.p.x, b.p.z)
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

    this.coreStrings.forEach(({ s }) => {
      s.renderToCanvas(ctx)
    })

    this.pointStrings.forEach(({ s }) => s.renderToCanvas(ctx))
    ;([
      [[this.topPoint], 'rgba(255,128,0,0.5)'],
      [this.innerPoints, 'rgba(255,0,0,0.5)'],
      [this.middlePoints, 'rgba(0,255,0,0.5)'],
      [this.outerPoints, 'rgba(0,0,255,0.5)']
    ] as const).forEach(([points, color]) => {
      ctx.fillStyle = color
      points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.p.x, p.p.z, this.shape.size / 40, 0, 2 * Math.PI)
        ctx.fill()
      })
    })
  }
}
