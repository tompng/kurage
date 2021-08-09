import * as THREE from 'three'
import dustVertexShader from './shaders/ocean_dust.vert'
import dustFragmentShader from './shaders/ocean_dust.frag'

function createDustGeometry(count: number) {
  const positions: number[] = []
  // const phases: number[] = []
  for (let i = 0; i < count; i++) {
    positions.push(Math.random(), Math.random(), Math.random())
    // phases.push(Math.random())
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  // geometry.setAttribute('phasese', new THREE.BufferAttribute(new Float32Array(phases), 1))
  const sizeOffset = 0.1
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-sizeOffset, -sizeOffset, -sizeOffset),
    new THREE.Vector3(1 + sizeOffset, 1 + sizeOffset, 1 + sizeOffset)
  )
  return geometry
}

type OceanDustUniforms = {
  maxDistance: { value: number }
}

export class OceanDust {
  mesh: THREE.Points
  material: THREE.ShaderMaterial
  scene: THREE.Scene
  maxDistance = 3
  size = 3
  uniforms: OceanDustUniforms = {
    maxDistance: { value: this.maxDistance }
  }
  constructor(count: number) {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const geometry = createDustGeometry(count)
    this.mesh = new THREE.Points(geometry, this.material)
    this.mesh.scale.set(this.size, this.size, this.size)
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    const { size } = this
    const cx = Math.floor(camera.position.x / size) * size
    const cy = Math.floor(camera.position.y / size) * size
    const cz = Math.floor(camera.position.z / size) * size
    const n = Math.ceil(this.maxDistance / size) * size
    for(let x = cx - n; x <= cx + n; x += size) {
      for(let z = cz - n; z <= cz + n; z += size) {
        for(let y = cy - n; y <= cy + n; y += size) {
          this.mesh.position.set(x, y, z)
          renderer.render(this.scene, camera)
        }
      }
    }
  }
}

const waterVertexShader = `
varying vec3 color;
const vec3 decay = vec3(4.0, 3.0, 1.0);
void main() {
  vec4 gpos = modelMatrix * vec4(position, 1);
  gl_Position = projectionMatrix * (viewMatrix * gpos);
  vec3 dir = normalize(gpos.xyz - cameraPosition);
  color = exp(decay * cameraPosition.z) / (1.0 - dir.z) / decay * 0.5;
}
`

const waterFragmentShader = `
varying vec3 color;
void main() {
  gl_FragColor = vec4(color, 1);
}
`
export class OceanDark {
  mesh: THREE.Mesh
  scene = new THREE.Scene()
  distance = 64
  constructor() {
    const geometry = new THREE.PlaneBufferGeometry(1, 1, 10, 10)
    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      depthWrite: false
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.rotateX(Math.PI / 2)
    this.mesh.scale.set(this.distance, this.distance, this.distance)
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.mesh.position.set(camera.position.x, camera.position.y + this.distance, camera.position.z)
    camera.position
    renderer.render(this.scene, camera)
  }
}