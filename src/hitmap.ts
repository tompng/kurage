
type PointXZ = { x: number; z: number }
export class HitMap {
  map: number[][] = []
  center = { x: 0, z: 0 }
  id = 1
  constructor(public size: number, public radius: number) {
    for (let i = 0; i < size; i++) this.map.push(new Array(size).fill(0))
  }
  clear() {
    this.id++
  }
  addPoints(points: PointXZ[]) {
    const { size, radius, id, map } = this
    const { x, z } = this.center
    for (const p of points) {
      const ix = Math.round(size * ((p.x - x) / radius + 1) / 2)
      const iz = Math.round(size * ((p.z - z) / radius + 1) / 2)
      if (0 <= ix && ix < size && 0 <= iz && iz < size) map[ix][iz] = id
    }
  }
  hitTest(x: number, z: number) {
    const { size, radius, center, id, map } = this
    const ix = Math.round(size * ((x - center.x) / radius + 1) / 2)
    const iz = Math.round(size * ((z - center.z) / radius + 1) / 2)
    return 0 <= ix && ix < size && 0 <= iz && iz < size && map[ix][iz] === id
  }
}
