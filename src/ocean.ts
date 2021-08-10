import * as THREE from 'three'
import dustVertexShader from './shaders/ocean_dust.vert'
import dustFragmentShader from './shaders/ocean_dust.frag'

import waveUrl from './images/wave.jpg'

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

const WATER_DECAY = 'vec3(0.6, 0.5, 0.2)'
const LIGHT0 = 0.1

const waterVertexShader = `
varying vec3 color;
const vec3 decay = ${WATER_DECAY};
void main() {
  vec4 gpos = modelMatrix * vec4(position, 1);
  gl_Position = projectionMatrix * (viewMatrix * gpos);
  vec3 dir = normalize(gpos.xyz - cameraPosition);
  color = ${LIGHT0} * exp(decay * cameraPosition.z) / (1.0 + dir.z) / decay;
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

const surfaceVertexShader = `
varying vec3 vPosition;
void main() {
  vec4 gpos = modelMatrix * vec4(position, 1);
  vPosition = gpos.xyz;
  gl_Position = projectionMatrix * (viewMatrix * gpos);
}
`

const surfaceFragmentShader = `
varying vec3 vPosition;
uniform float time;
uniform sampler2D wave;
const vec3 decay = ${WATER_DECAY};

void main() {
  vec3 view = vPosition - cameraPosition;
  float distance = length(view);
  vec3 dir = view / distance;
  vec3 d = exp(-decay * distance);
  vec3 k = (1.0 + dir.z) * decay;
  vec3 water = ${LIGHT0} * exp(decay * cameraPosition.z) * (1.0 - exp(-k * distance)) / k;

  vec2 pos2d = vPosition.xy;
  vec3 norm = normalize(vec3(
    (
      + texture2D(wave, +pos2d * 0.197 + vec2(0.02, 0.03) * time).xy
      - texture2D(wave, mat2(-0.241, 0.131, -0.131, -0.241) * pos2d + vec2(0.03, 0.02) * time).xy
    ),
    -2
  ));
  float normdot = dot(dir, norm);
  float reflectZ = dir.z - 2.0 * norm.z * normdot;
  vec3 reflectColor = ${LIGHT0} / (1.0 + reflectZ) / decay;
  vec3 surfaceColor = mix(vec3(1.0, 1.0, 2.0), reflectColor, max(1.0 + normdot, 0.0));
  gl_FragColor = vec4(water + d * surfaceColor, 1);
}
`

let waveTexture: THREE.Texture | null = null
const loader = new THREE.TextureLoader()
function getWaveTexture() {
  if (waveTexture) return waveTexture
  waveTexture = loader.load(waveUrl)
  waveTexture.wrapS = THREE.RepeatWrapping,
  waveTexture.wrapT = THREE.RepeatWrapping
  return waveTexture
}
export class OceanSurface {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  scene = new THREE.Scene()
  uniforms = { time: { value: 0 }, wave: { value: getWaveTexture() } }
  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: surfaceVertexShader,
      fragmentShader: surfaceFragmentShader,
      side: THREE.BackSide
    })
    const geometry = new THREE.PlaneBufferGeometry(1, 1)
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.scale.set(64, 64, 1)
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.mesh.position.x = camera.position.x
    this.mesh.position.y = camera.position.y
    this.uniforms.time.value = performance.now() / 1000
    renderer.render(this.scene, camera)
  }
}
