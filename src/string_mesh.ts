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

const vuniforms = {
  radius: { value: 0 },
}
const vmaterial = new THREE.ShaderMaterial({
  uniforms: vuniforms,
  vertexShader,
  fragmentShader,
  defines: { VARYING_COLOR: true },
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

export type BezierSegment = [Point3D, Point3D, Point3D, Point3D]
export type BezierSegmentWithColor = [Point3D, Point3D, Point3D, Point3D, number, number]

export class BezierStringRenderer {
  MAX_COUNT = 1024
  mesh: THREE.InstancedMesh
  vmesh: THREE.InstancedMesh
  scene = new THREE.Scene()
  vscene = new THREE.Scene()
  colorsByRadius = new Map<number, Map<number, BezierSegment[]>>()
  bezierWithColorByRadius = new Map<number, BezierSegmentWithColor[]>()
  constructor(lsections: number, rsections: number) {
    const geometry = cylinderGeometry(lsections, rsections)
    this.mesh = new THREE.InstancedMesh(geometry, material, this.MAX_COUNT)
    this.vmesh = new THREE.InstancedMesh(geometry, vmaterial, this.MAX_COUNT)
    this.vmesh.setColorAt(0, new THREE.Color())
    this.scene.add(this.mesh)
    this.vscene.add(this.vmesh)
  }
  clear() {
    this.colorsByRadius.clear()
    this.bezierWithColorByRadius.clear()
  }
  request(radius: number, color: number, bezier: BezierSegment[]) {
    const { colorsByRadius } = this
    const key = radius + '/' + color
    let bezierByColor = colorsByRadius.get(radius)
    if (!bezierByColor) {
      colorsByRadius.set(radius, bezierByColor = new Map())
    }
    let list = bezierByColor.get(color)
    if (!list) bezierByColor.set(color, list = [])
    list.push(...bezier)
  }
  varyingRequest(radius: number, bezier: BezierSegmentWithColor[]) {
    const { bezierWithColorByRadius } = this
    let list = bezierWithColorByRadius.get(radius)
    if (!list) {
      bezierWithColorByRadius.set(radius, list = [])
    }
    list.push(...bezier)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.colorsByRadius.forEach((bezierByColor, radius) => {
      bezierByColor.forEach((bezier, color) => {
        this.groupRender(renderer, camera, bezier, radius, new THREE.Color(color))
      })
    })
    this.bezierWithColorByRadius.forEach((bezier, radius) => {
      this.groupVRender(renderer, camera, bezier, radius)
    })
    this.clear()
  }
  groupVRender(renderer: THREE.WebGLRenderer, camera: THREE.Camera, bezier: BezierSegmentWithColor[], radius: number) {
    vuniforms.radius.value = radius
    vmaterial.needsUpdate = true
    for (let i = 0; i < bezier.length; i += this.MAX_COUNT) {
      const count = Math.min(bezier.length - i, this.MAX_COUNT)
      this.vmesh.count = count
      const marray = this.vmesh.instanceMatrix.array as number[]
      const carray = this.vmesh.instanceColor!.array as number[]
      for (let j = 0; j < count; j++) {
        const [a, b, c, d, c1, c2] = bezier[i + j]
        const idx = 16 * j
        marray[idx] = a.x
        marray[idx + 1] = a.y
        marray[idx + 2] = a.z
        marray[idx + 3] = (c2 >> 16) / 256
        marray[idx + 4] = b.x
        marray[idx + 5] = b.y
        marray[idx + 6] = b.z
        marray[idx + 7] = ((c2 >> 8) & 0xff) / 256
        marray[idx + 8] = c.x
        marray[idx + 9] = c.y
        marray[idx + 10] = c.z
        marray[idx + 11] = (c2 & 0xff) / 256
        marray[idx + 12] = d.x
        marray[idx + 13] = d.y
        marray[idx + 14] = d.z
        const cidx = 3 * j
        carray[cidx] = (c1 >> 16) / 256
        carray[cidx + 1] = ((c1 >> 8) & 0xff) / 256
        carray[cidx + 2] = (c1 & 0xff) / 256
      }
      this.vmesh.instanceColor!.needsUpdate = true
      this.vmesh.instanceMatrix.needsUpdate = true
      renderer.render(this.vscene, camera)
    }
  }
  groupRender(renderer: THREE.WebGLRenderer, camera: THREE.Camera, bezier: BezierSegment[], radius: number, color: THREE.Color) {
    uniforms.radius.value = radius
    uniforms.color.value = color
    material.needsUpdate = true
    for (let i = 0; i < bezier.length; i += this.MAX_COUNT) {
      const count = Math.min(bezier.length - i, this.MAX_COUNT)
      this.mesh.count = count
      const marray = this.mesh.instanceMatrix.array as number[]
      for (let j = 0; j < count; j++) {
        const [a, b, c, d] = bezier[i + j]
        const idx = 16 * j
        marray[idx] = a.x
        marray[idx + 1] = a.y
        marray[idx + 2] = a.z
        marray[idx + 4] = b.x
        marray[idx + 5] = b.y
        marray[idx + 6] = b.z
        marray[idx + 8] = c.x
        marray[idx + 9] = c.y
        marray[idx + 10] = c.z
        marray[idx + 12] = d.x
        marray[idx + 13] = d.y
        marray[idx + 14] = d.z
      }
      this.mesh.instanceMatrix.needsUpdate = true
      renderer.render(this.scene, camera)
    }
  }
}
