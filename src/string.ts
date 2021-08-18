import { Point3D, dot, solveTridiagonal, cross, weightedSum, normalize, add, sub } from './math'
export class String3D {
  segmentLength: number
  directions: Point3D[] = []
  velocities: Point3D[] = []
  points: Point3D[] = []
  weights: number[] = []
  F: Point3D[] = []
  constructor(public numSegments: number, public length: number, public startPointWeight: number, weight: number) {
    this.segmentLength = length / numSegments
    const { directions, velocities, F, weights } = this
    for (let i = 0; i < numSegments; i++) {
      directions.push({ x: 1, y: 0, z: 0 })
    }
    const w = weight / (numSegments + 1)
    for (let i = 0; i <= numSegments; i++) {
      F.push({ x: 0, y: 0, z: 0 })
      velocities.push({ x: 0, y: 0, z: 0 })
      weights.push(w)
    }
    this.points[0] = { x: 0, y: 0, z: 0 }
    this.calcPoints()
  }

  calcPoints() {
    const { points, segmentLength } = this
    let { x, y, z } = this.points[0]
    this.directions.forEach((dir, i) => {
      x += segmentLength * dir.x
      y += segmentLength * dir.y
      z += segmentLength * dir.z
      points[i + 1] = { x, y, z }
    })
  }

  addHardnessForce(hardness: number, decay: number) {
    const { F, directions, velocities, segmentLength, numSegments } = this
    for (let i = 1; i < numSegments; i++) {
      const v = velocities[i]
      const va = sub(velocities[i - 1], v)
      const vb = sub(velocities[i + 1], v)
      const da = directions[i - 1]
      const db = directions[i]
      const prot = cross(da, db)
      const vrot = add(cross(da, va), cross(db, vb))
      const rot = weightedSum([hardness * segmentLength, prot], [decay * segmentLength, vrot])
      const rfa = cross(rot, da)
      const rfb = cross(rot, db)
      const fa = F[i - 1]
      const f = F[i]
      const fb = F[i + 1]
      fa.x -= rfa.x
      fa.y -= rfa.y
      fa.z -= rfa.z
      f.x += rfa.x + rfb.x
      f.y += rfa.y + rfb.y
      f.z += rfa.z + rfb.z
      fb.x -= rfb.x
      fb.y -= rfb.y
      fb.z -= rfb.z
    }
  }

  addForce(gravity: number, friction: number) {
    const { F, velocities, numSegments, weights } = this
    for (let i = 1; i <= numSegments; i++) {
      const w = weights[i]
      const v = velocities[i]
      const f = F[i]
      f.x -= v.x * friction * w
      f.y -= v.y * friction * w
      f.z -= (v.z * friction - gravity) * w
    }
  }

  update<T extends { first?: Point3D }>(
    dt: number,
    constraints: T
  ): T {
    const { F, points, velocities, directions, numSegments, weights, segmentLength } = this
    const ta: number[] = []
    const tt: number[] = []
    const tb: number[] = []
    const T: number[] = []
    for (let i = 0; i < numSegments; i++) {
      // vnext[i] = v[i] + dt * (F[i] + T[i - 1] * dir[i - 1] - T[i] * dir[i]) / weight
      // constraints: dot(vnext[i + 1] - vnext[i], dir[i]) = 0
      const dir = directions[i]
      const wa = weights[i]
      const wb = weights[i + 1]
      const vfdot1 = dot(velocities[i], dir) + dt * dot(F[i], dir) / wa
      const vfdot2 = dot(velocities[i + 1], dir) + dt * dot(F[i + 1], dir) / wb
      tt[i] = 1 / wa + 1 / wb
      ta[i] = i > 0 ? -dot(directions[i - 1], dir) / wa : 0
      tb[i] = i < numSegments - 1 ? -dot(directions[i + 1], dir) / wb : 0
      T[i] = (vfdot1 - vfdot2) / dt
    }
    const output = { ...constraints }
    if (constraints?.first) {
      // vnext[0] = v[0] + dt * (F[0] - T[0] * dir[0] + F0) / weight = (dst[0] - p[0]) / dt
      // vnext[1] = v[1] + dt * (F[1] + T[0] * dir[0] - T[1] * dir[1]) / weight
      // constraints: dot(vnext[1], dir[0]) = dot(vnext[0], dir[0])
      const dir = directions[0]
      const wa = weights[0]
      const wb = weights[1]
      const vfdot1 = dot(velocities[1], dir) + dt * dot(F[1], dir) / wb
      tt[0] = 1 / wb
      ta[0] = 0
      tb[0] = -dot(directions[1], dir) / wb
      T[0] = (dot(constraints.first, dir) - dot(points[0], dir)) / dt / dt - vfdot1 / dt
      solveTridiagonal(ta, tt, tb, T)
      output.first = weightedSum(
        [wa / dt / dt, constraints.first],
        [-wa / dt / dt, points[0]],
        [-wa / dt, velocities[0]],
        [-1, F[0]],
        [T[0], dir]
      )
      F[0].x += output.first.x
      F[0].y += output.first.y
      F[0].z += output.first.z
    } else {
      solveTridiagonal(ta, tt, tb, T)
    }

    for (let i = 0; i <= numSegments; i++) {
      const f = F[i]
      const w = weights[i]
      velocities[i].x += dt * (f.x + (i > 0 ? T[i - 1] * directions[i - 1].x : 0) - (i < numSegments ? T[i] * directions[i].x : 0)) / w
      velocities[i].y += dt * (f.y + (i > 0 ? T[i - 1] * directions[i - 1].y : 0) - (i < numSegments ? T[i] * directions[i].y : 0)) / w
      velocities[i].z += dt * (f.z + (i > 0 ? T[i - 1] * directions[i - 1].z : 0) - (i < numSegments ? T[i] * directions[i].z : 0)) / w
    }

    const p0 = points[0]
    const v0 = velocities[0]
    p0.x += dt * v0.x
    p0.y += dt * v0.y
    p0.z += dt * v0.z
    for (let i = 1; i <= numSegments; i++) {
      const p = points[i - 1]
      const q = points[i]
      const v = velocities[i]
      const dx = q.x + dt * v.x - p.x
      const dy = q.y + dt * v.y - p.y
      const dz = q.z + dt * v.z - p.z
      const dr = Math.hypot(dx, dy, dz)
      const dir = directions[i - 1]
      q.x = p.x + (dir.x = dx / dr) * segmentLength
      q.y = p.y + (dir.y = dy / dr) * segmentLength
      q.z = p.z + (dir.z = dz / dr) * segmentLength
    }
    F.forEach(f => {
      f.x = f.y = f.z = 0
    })
    return output
  }
  renderToCanvas(ctx: CanvasRenderingContext2D) {
    const [startPoint, ...restPoints] = this.points
    ctx.beginPath()
    ctx.moveTo(startPoint.x, startPoint.z)
    restPoints.forEach(({ x, z }) => ctx.lineTo(x, z))
    ctx.stroke()
  }
}

export class Ribbon {
  tan1s: Point3D[] = []
  tan2s: Point3D[] = []
  constructor(public numSegments: number) {
    const { tan1s, tan2s } = this
    for (let i = 0; i <= numSegments; i++) {
      tan1s.push({ x: 0, y: 0, z: 1 })
      tan2s.push({ x: 0, y: 1, z: 0 })
    }
  }
  fill(t1: Point3D, t2: Point3D) {
    ([[this.tan1s, t1], [this.tan2s, t2]] as const).forEach(([ts, t]) => {
      ts.forEach(p => {
        p.x = t.x
        p.y = t.y
        p.z = t.z
      })
    })
  }
  update({ x, y, z }: Point3D, directions: Point3D[], rate: number) {
    const { tan1s, tan2s, numSegments } = this
    const first1 = tan1s[0]
    const first2 = tan1s[0]
    first1.x = x
    first1.y = y
    first1.z = z
    const f2 = normalize(cross(directions[0], first1))
    first2.x = f2.x
    first2.y = f2.y
    first2.z = f2.z
    let prev = first1
    for (let i = 1; i <= numSegments; i++) {
      const dir = i < numSegments ? normalize(add(directions[i - 1], directions[i])) : directions[i - 1]
      const tan1 = tan1s[i]
      const tan2 = tan2s[i]
      const dtan1 = normalize(weightedSum([1, prev], [-dot(prev, dir), dir]))
      const dtan2 = cross(dir, dtan1)
      tan1.x = tan1.x * (1 - rate) + rate * dtan1.x
      tan1.y = tan1.y * (1 - rate) + rate * dtan1.y
      tan1.z = tan1.z * (1 - rate) + rate * dtan1.z
      tan2.x = tan2.x * (1 - rate) + rate * dtan2.x
      tan2.y = tan2.y * (1 - rate) + rate * dtan2.y
      tan2.z = tan2.z * (1 - rate) + rate * dtan2.z
      prev = tan1
    }
  }
}
