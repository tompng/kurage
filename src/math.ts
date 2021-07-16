export type Point2D = {
  x: number
  y: number
}

export type Point3D = {
  x: number
  y: number
  z: number
}

export function cross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

export function dot(a: Point3D, b: Point3D) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function length(p: Point3D) {
  return Math.hypot(p.x, p.y, p.z)
}

export function length2(p: Point3D) {
  return p.x * p.x + p.y * p.y + p.z * p.z
}

export function normalize(p: Point3D) {
  const r = length(p)
  return { x: p.x / r, y: p.y / r, z: p.z / r }
}

export function scale(p: Point3D, s: number) {
  return { x: p.x * s, y: p.y * s, z: p.z * s }
}

export function add(a: Point3D, b: Point3D) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Point3D, b: Point3D) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function weightedSum(...elements: [number, Point3D][]) {
  let x = 0, y = 0, z = 0
  for (const [n, v] of elements) {
    x += n * v.x
    y += n * v.y
    z += n * v.z
  }
  return { x, y, z }
}

export function solveTridiagonal(prev: number[], center: number[], next: number[], v: number[]) {
  const len = center.length
  for (let i = 0; i < len - 1; i++) {
    const x = prev[i + 1] / center[i]
    center[i + 1] -= x * next[i]
    v[i + 1] -= x * v[i]
  }
  for (let i = len - 2; i >= 0; i--) {
    const x = next[i] / center[i + 1]
    v[i] -= x * v[i + 1]
  }
  for (let i = 0; i < len; i++) {
    v[i] /= center[i]
  }
}
