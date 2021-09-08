import * as THREE from 'three'
import { BezierStringRenderer } from './string_mesh'
import { Point3D, Point2D, randomDirection } from './math'
import { Fish, Shrimp } from './fish_shrimp'

type AquaObject = {
  update(dt: number): void
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void
  dispose(): void
}

class FishShrimpsBase {
  scene = new THREE.Scene()
  objects: { update3D(dt: number, radius: number): void; updateForRender(yscale: number): void }[] = []
  constructor(public radius: number) {
  }
  update(dt: number) {
    for (const obj of this.objects) obj.update3D(dt, this.radius)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    for (const obj of this.objects) obj.updateForRender(1)
    renderer.render(this.scene, camera)
  }
}

export class Fishes extends FishShrimpsBase {
  constructor(radius: number) {
    super(radius)
    for (let i = 0; i < 32; i++) {
      const fish = new Fish(randomDirection(radius * 2 / 3))
      this.objects.push(fish)
      this.scene.add(fish.mesh)
    }
  }
  dispose() {}
}

export class Shrimps extends FishShrimpsBase {
  constructor(radius: number) {
    super(radius)
    for (let i = 0; i < 32; i++) {
      const fish = new Shrimp(randomDirection(radius * 2 / 3))
      this.objects.push(fish)
      this.scene.add(fish.mesh)
    }
  }
  dispose() {}
}

function createHalfSphereGeometry(n = 16) {
  const positions: number[] = []
  const uvs: number[] = []
  type Coord = [Point3D, Point2D]
  let prev: Coord[] = [[{ x: 0, y: 0, z: 1 }, { x: 0, y: 0 }]]
  function addTriangle(a: Coord, b: Coord, c: Coord) {
    for (const [p, uv] of [a, b, c]) {
      positions.push(p.x, p.y, p.z)
      uvs.push((1 + uv.x) / 2, (1 + uv.y) / 2)
    }
  }
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const a = 0.5
    const zth = Math.PI / 2 * (t + a * t * (1 - t))
    const z = Math.cos(zth)
    const r = Math.sin(zth)
    const current: Coord[] = []
    const m = Math.round(4 * r * n / (1 + a * (1 - 2 * t)))
    const wr = 2 * Math.asin(r) / Math.PI
    const uvr = (r + 2 * wr) / 3
    for (let i = 0; i < m; i++) {
      const th = 2 * Math.PI * i / m
      const cos = Math.cos(th)
      const sin = Math.sin(th)
      current.push([
        { x: r * cos, y: r * sin, z },
        { x: uvr * cos, y: uvr * sin }
      ])
    }
    let j = 0, k = 0
    while(j + 1 < prev.length || k + 1 < current.length) {
      if ((j + 1) / prev.length < (k + 1) / current.length) {
        addTriangle(prev[j], current[k], prev[j + 1])
        j ++
      } else {
        addTriangle(prev[j], current[k], current[k + 1])
        k ++
      }
    }
    if (prev.length > 1) addTriangle(prev[j], current[k], prev[0])
    addTriangle(prev[0], current[k], current[0])
    prev = current
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

const sphereVertexShader = `
varying vec2 vTexcoord;
varying float alpha, density;
#define FLOORZ -1.05
void main() {
  vTexcoord = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
  vec3 gpos = (modelMatrix * vec4(position, 1)).xyz;
  vec3 view = normalize(gpos - cameraPosition);
  vec3 norm = normalize(gpos);
  float vndot = dot(view, norm);
  density = 0.8 - 0.4 * vndot;
  alpha = min(-16.0 * vndot, (0.8 - 0.2 * vndot));
  vec3 refl = view - 2.0 * vndot * norm;
  vec3 refr = normalize(view - 0.1 * norm);
  vec2 floorRefr = gpos.xy + refr.xy * (FLOORZ-gpos.z) / refr.z;
  color = vec3(0.15, 0.15, 0.2) / (1.0 + 4.0 * dot(floorRefr, floorRefr));
  // color = max(dot(ref, vec3(0.2, 0.3, 1)), 0.0) * vec3(0.2, 0.2, 0.2);
  // color = vec3(0, 0, 0);
  // color.r = max(ref.z, 0.0);
}
`

const sphereFragmentShader = `
uniform sampler2D map;
varying vec2 vTexcoord;
varying float alpha, density;
varying vec3 color;
void main() {
  gl_FragColor = vec4(texture2D(map, vTexcoord).rgb + color + density * vec3(0.2, 0.2, 0.4), alpha);
}
`

const floorVertexShader = `
varying vec2 vxy;
void main() {
  vec4 gpos = modelMatrix * vec4(position, 1);
  vxy = gpos.xy;
  gl_Position = projectionMatrix * viewMatrix * gpos;
}
`

const floorFragmentShader = `
varying vec2 vxy;
void main() {
  float brightness = 1.0 / (1.0 + 2.0 * dot(vxy, vxy)) - 0.01;
  gl_FragColor = vec4(vec3(0.3, 0.3, 0.4) * brightness, 1);
}

`

export class Aquarium {
  renderTarget = new THREE.WebGLRenderTarget(16, 16, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType
  })
  scene = new THREE.Scene()
  sphere: THREE.Mesh
  stringRenderer = new BezierStringRenderer()
  direction = {
    thetaXY: 0,
    thetaZ: 0
  }
  radius = 1
  constructor(public dom: HTMLDivElement) {
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.renderTarget.texture }},
      vertexShader: sphereVertexShader,
      fragmentShader: sphereFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending
    })
    this.sphere = new THREE.Mesh(createHalfSphereGeometry(), material)
    const floor = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(),
      new THREE.ShaderMaterial({
        vertexShader: floorVertexShader,
        fragmentShader: floorFragmentShader
      })
    )
    floor.scale.set(8, 8, 1)
    floor.position.z = -1.05
    this.scene.add(floor)
    this.scene.add(this.sphere)
    let pointer: { id: number; x: number; y: number } | null = null
    dom.onpointerdown = e => {
      e.preventDefault()
      pointer = { id: e.pointerId, x: e.pageX, y: e.pageY }
    }
    dom.onpointermove = e => {
      e.preventDefault()
      if (pointer?.id !== e.pointerId) return
      const dx = e.pageX - pointer.x
      const dy = e.pageY - pointer.y
      const s = 3 / Math.min(dom.offsetWidth, dom.offsetHeight)
      this.direction.thetaXY -= s * dx
      this.direction.thetaZ = Math.max(-Math.PI / 8, Math.min(this.direction.thetaZ + s * dy, Math.PI / 3))
      pointer.x = e.pageX
      pointer.y = e.pageY
    }
    dom.onpointerup = e => {
      e.preventDefault()
      pointer = null
    }
  }
  objects: AquaObject[] = []
  update(dt: number) {
    this.objects.forEach(obj => obj.update(dt))
  }
  clearObjects() {
    for (const obj of this.objects) obj.dispose()
    this.objects = []
  }
  renderToOffScreen(renderer: THREE.WebGLRenderer, size: number) {
    const { direction, radius } = this
    const fov = 40
    const distanceParam = 0.98
    const distance = distanceParam * radius / Math.sin(fov * Math.PI / 180 / 2)
    const offscreenCamera = new THREE.PerspectiveCamera(fov, 1, (distance - radius) / 4, (distance + radius) * 4)
    offscreenCamera.position.set(
      distance * Math.cos(direction.thetaXY) * Math.cos(direction.thetaZ),
      distance * Math.sin(direction.thetaXY) * Math.cos(direction.thetaZ),
      distance * Math.sin(direction.thetaZ)
    )
    offscreenCamera.up.set(0, 0, 1)
    offscreenCamera.lookAt(0, 0, 0)
    const offscreenSize = Math.ceil(size * 1.5)
    this.renderTarget.setSize(offscreenSize, offscreenSize)
    renderer.setRenderTarget(this.renderTarget)
    renderer.autoClear = false
    renderer.clearColor()
    renderer.clearDepth()
    this.objects.forEach(obj => obj.render(renderer, offscreenCamera))
    this.stringRenderer.render(renderer, offscreenCamera)
    renderer.setRenderTarget(null)
  }
  renderToScreen(renderer: THREE.WebGLRenderer) {
    const size = new THREE.Vector2()
    renderer.getSize(size)
    const { x: width, y: height } = size
    let fov = 50
    const aspect = width / height
    if (width < height) {
      fov = 2 * Math.atan(Math.tan(Math.PI * fov / 180 / 2) / aspect) * 180 / Math.PI
    }
    const { direction, sphere } = this
    const distance = 2.5
    const camera = new THREE.PerspectiveCamera(fov, aspect, 1 / 8, 8)
    camera.position.set(
      distance * Math.cos(direction.thetaXY) * Math.cos(direction.thetaZ),
      distance * Math.sin(direction.thetaXY) * Math.cos(direction.thetaZ),
      distance * Math.sin(direction.thetaZ)
    )
    sphere.rotation.set(Math.PI / 2 - direction.thetaZ, 0, Math.PI / 2 + direction.thetaXY, 'ZYX')
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)
    renderer.render(this.scene, camera)

    // const scene = new THREE.Scene()
    // scene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: this.renderTarget.texture })))
    // renderer.render(scene, new THREE.Camera())
  }
  compactAllocation() {
    this.renderTarget.setSize(1, 1)
  }
}
