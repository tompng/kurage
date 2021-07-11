import { Point3D, dot, solveTridiagonal } from './math'
export class String3D {
  segmentLength: number
  directions: Point3D[] = []
  velocities: Point3D[] = []
  startPoint: Point3D = { x: 0, y: 0, z: 0 }
  constructor(public numSegments: number, public length: number) {
    this.segmentLength = length / numSegments
    for (let i = 0; i < numSegments; i++) {
      this.directions.push({ x: 1, y: 0, z: 0 })
    }
    for (let i = 0; i <= numSegments; i++) {
      this.velocities.push({ x: 0, y: 0, z: 0 })
    }
  }

  getPoints() {
    const { segmentLength } = this
    let { x, y, z } = this.startPoint
    const points: Point3D[] = [{ x, y, z }]
    this.directions.forEach(dir => {
      x += segmentLength * dir.x
      y += segmentLength * dir.y
      z += segmentLength * dir.z
      points.push({ x, y, z })
    })
    return points
  }
  
  update(fStart: Point3D, dt = 0.001) {
    const points = this.getPoints()
    const { velocities, directions, numSegments, segmentLength } = this
    const F: Point3D[] = this.velocities.map(v => ({ x: -v.x * 10, y: -v.y * 10, z: -v.z * 10 - 1 / numSegments }))
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
      velocities[i].x += dt * (F[i].x + (i > 0 ? T[i - 1] * directions[i - 1].x : 0) - (i < numSegments ? T[i] * directions[i].x : 0))
      velocities[i].y += dt * (F[i].y + (i > 0 ? T[i - 1] * directions[i - 1].y : 0) - (i < numSegments ? T[i] * directions[i].y : 0))
      velocities[i].z += dt * (F[i].z + (i > 0 ? T[i - 1] * directions[i - 1].z : 0) - (i < numSegments ? T[i] * directions[i].z : 0))
    }
    const points2 = points.map(({ x, y, z }, i) => ({
      x: x + dt * velocities[i].x,
      y: y + dt * velocities[i].y,
      z: z + dt * velocities[i].z
    }))
    for (let i = 0; i < numSegments; i++) {
      const p = points2[i]
      const q = points2[i + 1]
      const dx = q.x - p.x
      const dy = q.y - p.y
      const dz = q.z - p.z
      const dr = Math.hypot(dx, dy, dz)
      directions[i].x = dx / dr
      directions[i].y = dy / dr
      directions[i].z = dz / dr
      const dir = directions[i]
      points2[i + 1].x = p.x + dir.x * segmentLength
      points2[i + 1].y = p.y + dir.y * segmentLength
      points2[i + 1].z = p.z + dir.z * segmentLength
    }
    const v0 = velocities[0]
    this.startPoint.x += v0.x * dt
    this.startPoint.y += v0.y * dt
    this.startPoint.z += v0.z * dt
  }
}