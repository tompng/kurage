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

export function distance(a: Point3D, b: Point3D) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
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

type Matrix3Element = [number, number, number, number, number, number, number, number, number]
export class Matrix3 {
  elements: Matrix3Element
  constructor(data?: Matrix3Element) {
    this.elements = data ?? [1, 0, 0, 0, 1, 0, 0, 0, 1]
  }
  clone() {
    return new Matrix3([...this.elements])
  }
  transform(v: Point3D) {
    const e = this.elements
    return {
      x: v.x * e[0] + v.y * e[1] + v.z * e[2],
      y: v.x * e[3] + v.y * e[4] + v.z * e[5],
      z: v.x * e[6] + v.y * e[7] + v.z * e[8]
    }
  }
  mult(m: Matrix3) {
    const out = new Matrix3()
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0
        for (let k = 0; k < 3; k++) {
          sum += this.elements[3 * i + k] * m.elements[3 * k + j]
        }
        out.elements[3 * i + j] = sum
      }
    }
    return out
  }
  add(m: Matrix3) {
    const out = new Matrix3()
    for (let i = 0; i < 9; i++) {
      out.elements[i] = this.elements[i] + m.elements[i]
    }
    return out
  }
  static fromRotation(axis: Point3D, theta?: number) {
    const r = Math.hypot(axis.x, axis.y, axis.z)
    const th = theta ?? r
    if (th === 0) return new Matrix3()
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    const nx = axis.x / r
    const ny = axis.y / r
    const nz = axis.z / r
    const cc = 1 - cos
    const xy = nx * ny * cc
    const yz = ny * nz * cc
    const zx = nz * nx * cc
    return new Matrix3([
      nx * nx * cc + cos, xy - nz * sin, zx + ny * sin,
      xy + nz * sin, ny * ny * cc + cos, yz - nx * sin,
      zx - ny * sin, yz + nx * sin, nz * nz * cc + cos
    ])
  }
}

export function randomDirection(r = 1): Point3D {
  const z = Math.random()
  const th = 2 * Math.PI * Math.random()
  const xyr = Math.sqrt(1 - z * z)
  return {
    x: r * xyr * Math.cos(th),
    y: r * xyr * Math.sin(th),
    z: r * z
  }
}
