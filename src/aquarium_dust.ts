import * as THREE from 'three'
import fragmentShader from './shaders/ocean_dust.frag'
import { randomSpherePosition } from './math'

const vertexShader = `
varying float vBrightness;
uniform float size;
void main() {
  vec4 vpos = viewMatrix * (modelMatrix * vec4(position, 1));
  float dist = length(vpos.xyz);
  float size = -size / vpos.z;
  float isize = max(ceil(size), 2.0);
  float sizeRatio = size / isize;
  gl_PointSize = min(isize, 16.0);
  vBrightness = 0.5 * sizeRatio * sizeRatio;
  gl_Position = projectionMatrix * vpos;
}
`

function createDustGeometry(count: number) {
  const positions: number[] = []
  for (let i = 0; i < count; i++) {
    const { x, y, z } = randomSpherePosition(1)
    positions.push(x, y, z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  return geometry
}

export function createAquariumDustScene(count: number) {
  const geometry = createDustGeometry(count)
  const uniforms = { size: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const scene = new THREE.Scene()
  const points = new THREE.Points(geometry, material)
  scene.add(points)
  return {
    scene,
    set(radius: number, resolution: number) {
      uniforms.size.value = radius * resolution / 128
      points.scale.set(radius, radius, radius)
    }
  }
}
