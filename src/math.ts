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
  const z = 2 * Math.random() - 1
  const th = 2 * Math.PI * Math.random()
  const xyr = Math.sqrt(1 - z * z)
  return {
    x: r * xyr * Math.cos(th),
    y: r * xyr * Math.sin(th),
    z: r * z
  }
}

export class SmoothPoint3D {
  v1: Point3D = { x: 0, y: 0, z: 0 }
  v2: Point3D = { x: 0, y: 0, z: 0 }
  v3: Point3D = { x: 0, y: 0, z: 0 }
  vscale: number
  x = 0
  y = 0
  z = 0
  constructor(position: Point3D, public timeScale: number) {
    const e = Math.exp(-1 / timeScale)
    this.vscale = 1 / (timeScale * (1 / 1 - 2 / 2 + 1 / 3))
    this.reset(position)
  }
  update({ x, y, z }: Point3D, dt: number) {
    const { timeScale } = this
    const { v1, v2, v3, vscale } = this
    for (const [v, n] of [[v1, 1], [v2, 2], [v3, 3]] as const) {
      const e = Math.exp(-n / timeScale * dt)
      const c = timeScale / n * (1 - e)
      v.x = v.x * e + c * x
      v.y = v.y * e + c * y
      v.z = v.z * e + c * z
    }
    this.x = (v1.x - 2 * v2.x + v3.x) * vscale
    this.y = (v1.y - 2 * v2.y + v3.y) * vscale
    this.z = (v1.z - 2 * v2.z + v3.z) * vscale
  }
  reset({ x, y, z }: Point3D) {
    const { v1, v2, v3, timeScale } = this
    for (const [v, n] of [[v1, 1], [v2, 2], [v3, 3]] as const) {
      const s = timeScale / n
      v.x = x * s
      v.y = y * s
      v.z = z * s
    }
    this.x = x
    this.y = y
    this.z = z
  }
}
