import * as THREE from 'three'
import vertexShader from './shaders/bezier_tube.vert'
import fragmentShader from './shaders/bezier_tube.frag'
import { Point3D } from './math'

export function cylinderGeometry(lsections: number, rsections: number) {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []
  const rs: [number, number][] = []
  for (let i = 0; i < rsections; i++) {
    const th = 2 * Math.PI * i / rsections
    rs.push([Math.cos(th), Math.sin(th)])
  }
  for (let i = 0; i <= lsections; i++) {
    const z = i / lsections
    rs.forEach(([cos, sin]) => positions.push(cos, sin, z))
  }
  const bottomIndex = positions.length / 3
  positions.push(0, 0, 0)
  const topIndex = positions.length / 3
  positions.push(0, 0, 1)
  for (let i = 0; i < lsections; i++) {
    const idxa = i * rsections
    const idxb = (i + 1) * rsections
    for (let j = 0; j < rsections; j++) {
      const k = (j + 1) % rsections
      indices.push(idxa + j, idxa + k, idxb + j, idxb + j, idxa + k, idxb + k)
    }
  }
  for (let j = 0; j < rsections; j++) {
    indices.push(j, bottomIndex, (j + 1) % rsections)
    const k = lsections * rsections
    indices.push(k + j, k + (j + 1) % rsections, topIndex)
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}


const uniforms = {
  radius: { value: 0 },
  color: { value: new THREE.Color() }
}
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

export type BezierSegment = [Point3D, Point3D, Point3D, Point3D]

export class BezierStringRenderer {
  MAX_COUNT = 1024
  mesh: THREE.InstancedMesh
  scene = new THREE.Scene()
  constructor(lsections: number, rsections: number) {
    const geometry = cylinderGeometry(lsections, rsections)
    this.mesh = new THREE.InstancedMesh(geometry, material, this.MAX_COUNT)
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera, bezier: BezierSegment[], radius: number, color: THREE.Color) {
    uniforms.radius.value = radius
    uniforms.color.value = color
    material.needsUpdate = true
    for (let i = 0; i < bezier.length; i += this.MAX_COUNT) {
      const count = Math.min(bezier.length - i, this.MAX_COUNT)
      this.mesh.count = count
      for (let j = 0; j < count; j++) {
        const [a, b, c, d] = bezier[i + j]
        const matrix = new THREE.Matrix4()
        matrix.set(
          a.x, b.x, c.x, d.x,
          a.y, b.y, c.y, d.y,
          a.z, b.z, c.z, d.z,
          0, 0, 0, 0
        )
        this.mesh.setMatrixAt(j, matrix)
      }
      this.mesh.instanceMatrix.needsUpdate = true
      renderer.render(this.scene, camera)
    }
  }
}
