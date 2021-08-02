import * as THREE from 'three'
import { Mesh } from 'three'
import { Point3D, sub as vectorSub, normalize } from './math'
import vertexShader from './shaders/ribbon.vert'
import fragmentShader from './shaders/jelly.frag'
import { String3D, Ribbon } from './string'

type Point = {
  p: Point3D,
  t1: Point3D,
  t2: Point3D,
  u: number,
  v: number
}

function createRibbonGeometry(l0: number, l1: number, ln: number, wn: number) {
  const positions: number[] = []
  const tan1s: number[] = []
  const tan2s: number[] = []
  const uvs: number[] = []
  function add(a: Point, b: Point, c: Point) {
    positions.push(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z, c.p.x, c.p.y, c.p.z)
    tan1s.push(a.t1.x, a.t1.y, a.t1.z, b.t1.x, b.t1.y, b.t1.z, c.t1.x, c.t1.y, c.t1.z)
    tan2s.push(a.t2.x, a.t2.y, a.t2.z, b.t2.x, b.t2.y, b.t2.z, c.t2.x, c.t2.y, c.t2.z)
    uvs.push(a.u, a.v, b.u, b.v, c.u, c.v)
  }
  let prev: Point[] | undefined
  function fx(z: number, y: number) {
    const gz = l0 + (l1 - l0) * z
    y -= 0.5
    const x1 = Math.sin(62.5 * gz + 1) + Math.sin(22.9 * gz + 2) + Math.sin(33.3 * gz + 3)
    const x2 = Math.sin(52.3 * gz + 1) + Math.sin(27.1 * gz + 2) + Math.sin(43.7 * gz + 3)
    return y * y / 2 + (x1 * y * y + x2 * y * y * y) / 4 + 0.5
  }
  for (let i = 0; i <= ln; i++) {
    const z = i / ln
    const gz = l0 + (l1 - l0) * z
    const w = Math.sqrt(1 - gz * gz) * (1 + (Math.sin(29.3 * gz + 1) + Math.sin(37.1 * gz + 2) + Math.sin(57.7 * gz + 2)) * 0.1)
    const points: Point[] = []
    const delta = 0.001
    for (let j = 0; j <= wn; j++) {
      const y = 0.5 + w * (j / wn - 0.5)
      const x = fx(z, y)
      const xz = fx(z + delta, y)
      const xy = fx(z, y + delta)
      points.push({
        p: { x, y, z },
        t1: normalize({ x: xz - x, y: 0, z: delta }),
        t2: normalize({ x: xy - x, y: delta, z: 0 }),
        u: gz, v: y
      })
    }
    if (prev) {
      for (let j = 0; j < wn; j++) {
        add(prev[j], points[j], prev[j + 1])
        add(prev[j + 1], points[j], points[j + 1])
      }
    }
    prev = points
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1s), 3))
  geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2s), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  return geometry
}

export function createRibbonGeometries(segments: number, ln: number, wn: number) {
  const output: THREE.BufferGeometry[] = []
  return [...new Array(segments)].map((_, i) => createRibbonGeometry(i / segments, (i + 1) / segments, ln, wn))
}

type RibbonUniforms = {
  v0: { value: THREE.Vector3 }
  v1: { value: THREE.Vector3 }
  vx0: { value: THREE.Vector3 }
  vy0: { value: THREE.Vector3 }
  vz0: { value: THREE.Vector3 }
  vx1: { value: THREE.Vector3 }
  vy1: { value: THREE.Vector3 }
  vz1: { value: THREE.Vector3 }
}

type RibbonSegment = {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  uniforms: RibbonUniforms
}

function ribbonUniforms(): RibbonUniforms {
  return {
    v0: { value: new THREE.Vector3() },
    v1: { value: new THREE.Vector3() },
    vx0: { value: new THREE.Vector3() },
    vy0: { value: new THREE.Vector3() },
    vz0: { value: new THREE.Vector3() },
    vx1: { value: new THREE.Vector3() },
    vy1: { value: new THREE.Vector3() },
    vz1: { value: new THREE.Vector3() }
  }
}

export class RibbonShape {
  segments: RibbonSegment[]
  constructor(public numSegments: number, w: number, h: number) {
    const geometries = createRibbonGeometries(numSegments, 20, 8)
    this.segments = geometries.map(geometry => {
      const uniforms = ribbonUniforms()
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: uniforms,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new Mesh(geometry, material)
      return { mesh, uniforms, material }
    })
  }
  addToScene(scene: THREE.Scene) {
    this.segments.forEach(({ mesh }) => scene.add(mesh))
  }
  update(string: String3D, ribbon: Ribbon) {
  }
  updateDebug() {
    const dx = 0.5
    const { numSegments } = this
    const positions = [...new Array(this.numSegments + 1)].map((_, i) => 
      [dx * (i - this.numSegments / 2), Math.sin(i/2), Math.cos(i/2)] as const
    )
    function fz(i: number) {
      const ia = Math.max(0, i - 1)
      const ib = Math.min(i + 1, numSegments - 1)
      return [0, 1, 2].map(axis => (positions[ib][axis] - positions[ia][axis]) / (ib - ia)) as [number, number, number]
    }
    this.segments.forEach(({ uniforms, material }, i) => {
      uniforms.v0.value.set(...positions[i])
      uniforms.v1.value.set(...positions[i + 1])
      uniforms.vx0.value.set(0, dx*8, 0)
      uniforms.vx1.value.set(0, dx*8, 0)
      uniforms.vy0.value.set(0, 0, dx*4)
      uniforms.vy1.value.set(0, 0, dx*4)
      uniforms.vz0.value.set(...fz(i))
      uniforms.vz1.value.set(...fz(i + 1))
      material.needsUpdate = true
    })
  }
}
