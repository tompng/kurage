import { Point3D } from './math'
import type { String3D, Ribbon } from './string'
type ShapeParam = {
  size: number
  theta1: number
  theta2: number
  innerDistance: number
  innerRadius: number
}
type HardnessParam = {
  middle: number
  inner: number
  outer: number
  topMiddle: number
  topInner: number
  middleOuter: number
  innerOuter: number
  innerMiddle: number
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
  constructor(public numInner: number, public numOuter: number, public shape: ShapeParam, public hardness: HardnessParam) {
    this.setInitialPosition()
    this.setLinks()
  }
  assignStrings(innerStrings: String3D[], innerRibbons: Ribbon[], outerStrings: String3D[], outerRibbons: Ribbon[]) {
    const { pointStrings, numInner, numOuter, innerPoints, outerPoints } = this
    this.innerStrings = innerStrings
    this.innerRibbons = innerRibbons
    this.outerStrings = outerStrings
    this.outerRibbons = outerRibbons
    innerStrings.forEach((s, i) => {
      const p = innerPoints[Math.round(i * numInner / innerStrings.length) % innerPoints.length]
      const r = innerRibbons[i] ?? null
      pointStrings.push({ p, s, r })
    })
    outerStrings.forEach((s, i) => {
      const p = outerPoints[Math.round(i * numOuter / outerStrings.length) % outerPoints.length]
      const r = outerRibbons[i] ?? null
      pointStrings.push({ p, s, r })
    })
    pointStrings.forEach(({ s, p: { p: { x, y, z } } }) => {
      const l = s.segmentLength
      s.points.forEach((point, i) => {
        point.x = x
        point.y = y
        point.z = z - i * l
      })
    })
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
      links.push(genLink(topPoint, innerPoints[i], hardness.topInner))
      links.push(genLink(innerPoints[i], innerPoints[(i + 1) % numInner], hardness.inner))
    }
    for (let i = 0; i < numOuter; i++) {
      links.push(genLink(topPoint, middlePoints[i], hardness.topMiddle))
      links.push(genLink(middlePoints[i], middlePoints[(i + 1) % numOuter], hardness.middle))
      shrinkOutlineLinks.push(genLink(outerPoints[i], outerPoints[(i + 1) % numOuter], hardness.outer))
      links.push(genLink(middlePoints[i], outerPoints[i], hardness.middleOuter))
      const inner = innerPoints[Math.round(i * numInner / numOuter) % numInner]
      links.push(genLink(inner, middlePoints[i], hardness.innerMiddle))
      shrinkRadialLinks.push(genLink(inner, outerPoints[i], hardness.innerMiddle))
    }
  }
  resetForce() {
    this.points.forEach(p => { p.f.x = p.f.y = p.f.z = 0 })
  }
  updateForce(links: JellyLink[], muscle: number, ratio: number) {
    links.forEach(({ a, b, r, k }) => {
      const dx = b.p.x - a.p.x
      const dy = b.p.y - a.p.y
      const dz = b.p.z - a.p.z
      const distance = Math.hypot(dx, dy, dz)
      const scale = k * ((distance - r) / r * (1 - muscle) + (distance - r * ratio) / r * muscle)/ distance
      const dvx = b.v.x - a.v.x
      const dvy = b.v.y - a.v.y
      const dvz = b.v.z - a.v.z
      const vv = k / 2
      a.f.x += scale * dx + dvx * vv
      a.f.y += scale * dy + dvy * vv
      a.f.z += scale * dz + dvz * vv
      b.f.x -= scale * dx + dvx * vv
      b.f.y -= scale * dy + dvy * vv
      b.f.z -= scale * dz + dvz * vv
    })
  }
  update(dt: number, muscle: number) {
    this.updateForce(this.links, 0, 1)
    this.updateForce(this.shrinkRadialLinks, muscle, 1)
    this.updateForce(this.shrinkOutlineLinks, muscle, 0.5)
    this.points.forEach(({ p, v, f }) => {
      v.x += f.x * dt
      v.y += f.y * dt
      v.z += f.z * dt
      p.x += v.x * dt
      p.y += v.y * dt
      p.z += v.z * dt
    })
    this.pointStrings.forEach(({ p, s, r }) => {
      const fscale = 1
      const f = { x: p.f.x * fscale, y: p.f.y * fscale, z: p.f.z * fscale }
      s.addHardnessForce(10, 10)
      s.addForce(0, 4)
      s.update(f, dt)
      const pos = s.points[0]
      const v = s.velocities[0]
      p.v.x = v.x
      p.v.y = v.y
      p.v.z = v.z
      p.p.x = pos.x
      p.p.y = pos.y
      p.p.z = pos.z
    })
    this.resetForce()
  }
  renderToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ;[...this.links, ...this.shrinkOutlineLinks, ...this.shrinkRadialLinks].forEach(({ a, b }) => {
      ctx.moveTo(a.p.x, a.p.z)
      ctx.lineTo(b.p.x, b.p.z)
    })
    ctx.stroke()
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
