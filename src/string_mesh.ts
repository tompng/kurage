import * as THREE from 'three'
import vertexShader from './shaders/bezier_tube.vert'
import fragmentShader from './shaders/bezier_tube.frag'
import { BezierSegment, BezierSegmentWithColor } from './string'

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

type Section = { l: number; r: number }
type ProfileSegments<StringRenderer, Profile, Segment> = {
  renderer: StringRenderer
  profile: Profile
  segments: Segment[]
  request: (seg: Segment[]) => void
}
type PlainProfile = {
  radius: number
  color: THREE.Color
}

function fetch<K, V>(map: Map<K, V>, key: K, func: () => V) {
  const value = map.get(key)
  if (value) return value
  const newValue = func()
  map.set(key, newValue)
  return newValue
}
export class BezierStringRenderer {
  sectionPlainRenderers = new Map<string, PlainStringRenderer>()
  sectionVaryingRenderers = new Map<string, VaryingStringRenderer>()
  plainProfiles = new Map<string, ProfileSegments<PlainStringRenderer, PlainProfile, BezierSegment>>()
  varyingProfiles = new Map<string, ProfileSegments<VaryingStringRenderer, number, BezierSegmentWithColor>>()
  getPlainProfile(section: Section, radius: number, color: THREE.Color) {
    const sectionKey = `${section.l}/${section.r}`
    const renderer = fetch(this.sectionPlainRenderers, sectionKey, () => new PlainStringRenderer(section))
    const colorKey = `${color.r}/${color.g}/${color.b}`
    const profileKey = `${sectionKey}/${radius}/${colorKey}`
    return fetch(this.plainProfiles, profileKey, () => {
      const segments: BezierSegment[] = []
      return {
        renderer, profile: { radius, color }, segments, request: seg => segments.push(...seg)
      }
    })
  }
  getVaryingProfile(section: Section, radius: number) {
    const sectionKey = `${section.l}/${section.r}`
    const renderer = fetch(this.sectionVaryingRenderers, sectionKey, () => new VaryingStringRenderer(section))
    return fetch(this.varyingProfiles, `${sectionKey}/${radius}`, () => {
      const segments: BezierSegmentWithColor[] = []
      return { renderer, profile: radius, segments, request: seg => segments.push(...seg) }
    })
  }
  render(wglRenderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    for (const { renderer, profile, segments } of this.plainProfiles.values()) {
      if (segments.length === 0) continue
      renderer.render(wglRenderer, camera, segments, profile.radius, profile.color)
      segments.length = 0
    }
    for (const { renderer, profile, segments } of this.varyingProfiles.values()) {
      if (segments.length === 0) continue
      renderer.render(wglRenderer, camera, segments, profile)
      segments.length = 0
    }
  }
}

export class PlainStringRenderer {
  MAX_COUNT = 1024
  mesh: THREE.InstancedMesh
  scene = new THREE.Scene()
  constructor(section: Section) {
    const geometry = cylinderGeometry(section.l, section.r)
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

export class VaryingStringRenderer {
  MAX_COUNT = 1024
  mesh: THREE.InstancedMesh
  scene = new THREE.Scene()
  constructor(section: Section) {
    const geometry = cylinderGeometry(section.l, section.r)
    this.mesh = new THREE.InstancedMesh(geometry, vmaterial, this.MAX_COUNT)
    this.mesh.setColorAt(0, new THREE.Color())
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera, bezier: BezierSegmentWithColor[], radius: number) {
    vuniforms.radius.value = radius
    vmaterial.needsUpdate = true
    for (let i = 0; i < bezier.length; i += this.MAX_COUNT) {
      const count = Math.min(bezier.length - i, this.MAX_COUNT)
      this.mesh.count = count
      const marray = this.mesh.instanceMatrix.array as number[]
      const carray = this.mesh.instanceColor!.array as number[]
      for (let j = 0; j < count; j++) {
        const [a, b, c, d, c1, c2] = bezier[i + j]
        const idx = 16 * j
        marray[idx] = a.x
        marray[idx + 1] = a.y
        marray[idx + 2] = a.z
        marray[idx + 3] = c2.r
        marray[idx + 4] = b.x
        marray[idx + 5] = b.y
        marray[idx + 6] = b.z
        marray[idx + 7] = c2.g
        marray[idx + 8] = c.x
        marray[idx + 9] = c.y
        marray[idx + 10] = c.z
        marray[idx + 11] = c2.b
        marray[idx + 12] = d.x
        marray[idx + 13] = d.y
        marray[idx + 14] = d.z
        const cidx = 3 * j
        carray[cidx] = c1.r
        carray[cidx + 1] = c1.g
        carray[cidx + 2] = c1.b
      }
      this.mesh.instanceColor!.needsUpdate = true
      this.mesh.instanceMatrix.needsUpdate = true
      renderer.render(this.scene, camera)
    }
  }
}
