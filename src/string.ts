import { Point3D, dot, solveTridiagonal, cross, weightedSum } from './math'
export class String3D {
  segmentLength: number
  directions: Point3D[] = []
  velocities: Point3D[] = []
  points: Point3D[] = []
  F: Point3D[] = []
  constructor(public numSegments: number, public length: number) {
    this.segmentLength = length / numSegments
    const { directions, velocities, F } = this
    for (let i = 0; i < numSegments; i++) {
      directions.push({ x: 1, y: 0, z: 0 })
    }
    for (let i = 0; i <= numSegments; i++) {
      F.push({ x: 0, y: 0, z: 0 })
      velocities.push({ x: 0, y: 0, z: 0 })
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
    const { F, directions, velocities, numSegments } = this
    for (let i = 1; i < numSegments; i++) {
      const v = velocities[i]
      const va = weightedSum(1, velocities[i - 1], -1, v)
      const vb = weightedSum(1, velocities[i + 1], -1, v)
      const da = directions[i - 1]
      const db = directions[i]
      const prot = cross(da, db)
      const vrot = weightedSum(1, cross(da, va), 1, cross(db, vb))
      const rot = weightedSum(hardness, prot, decay, vrot)
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
    const { F, velocities, numSegments } = this
    for (let i = 0; i <= numSegments; i++) {
      const v = velocities[i]
      const f = F[i]
      f.x -= v.x * friction
      f.y -= v.y * friction
      f.z -= v.z * friction - gravity / numSegments
    }
  }

  update(fStart: Point3D, dt = 0.001) {
    const { F, points, velocities, directions, numSegments, segmentLength } = this
    const ta: number[] = []
    const tt: number[] = []
    const tb: number[] = []
    const T: number[] = []
    F[0].x += fStart.x * numSegments
    F[0].y += fStart.y * numSegments
    F[0].z += fStart.z * numSegments
    for (let i = 0; i < numSegments; i++) {
      // vnext[i] = v[i] + dt * (F[i] + T[i - 1] * dir[i - 1] - T[i]*dir[i])
      // constraints: dot(vnext[i + 1] - vnext[i], dir[i]) = 0
      const dir = directions[i]
      const vfdot1 = dot(velocities[i], dir) + dt * dot(F[i], dir)
      const vfdot2 = dot(velocities[i + 1], dir) + dt * dot(F[i + 1], dir)
      tt[i] = 2
      ta[i] = i > 0 ? -dot(directions[i - 1], dir) : 0
      tb[i] = i < numSegments - 1 ? -dot(directions[i + 1], dir) : 0
      T[i] = (vfdot1 - vfdot2) / dt
    }
    solveTridiagonal(ta, tt, tb, T)
    for (let i = 0; i <= numSegments; i++) {
      const f = F[i]
      velocities[i].x += dt * (f.x + (i > 0 ? T[i - 1] * directions[i - 1].x : 0) - (i < numSegments ? T[i] * directions[i].x : 0))
      velocities[i].y += dt * (f.y + (i > 0 ? T[i - 1] * directions[i - 1].y : 0) - (i < numSegments ? T[i] * directions[i].y : 0))
      velocities[i].z += dt * (f.z + (i > 0 ? T[i - 1] * directions[i - 1].z : 0) - (i < numSegments ? T[i] * directions[i].z : 0))
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
  }
}
