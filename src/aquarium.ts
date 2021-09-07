import * as THREE from 'three'
import { BezierStringRenderer } from './string_mesh'
import { randomDirection } from './math'
import { Fish, Shrimp, HitFunc3D } from './fish_shrimp'

type AquaObject = {
  update(dt: number): void
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void
  dispose(): void
}

class FishShrimpsBase {
  scene = new THREE.Scene()
  objects: { update3D(dt: number, hitFunc: HitFunc3D): void; updateForRender(): void }[] = []
  hitFunc: HitFunc3D
  constructor(radius: number) {
    const radius2 = radius * radius
    this.hitFunc = (x, y, z) => x * x + y * y + z * z > radius2
  }
  update(dt: number) {
    for (const obj of this.objects) obj.update3D(dt, this.hitFunc)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    for (const obj of this.objects) obj.updateForRender()
    renderer.render(this.scene, camera)
  }
}

export class Fishes extends FishShrimpsBase {
  constructor(radius: number) {
    super(radius)
    for (let i = 0; i < 20; i++) {
      const fish = new Fish(randomDirection(radius * 0.8))
      this.objects.push(fish)
      this.scene.add(fish.mesh)
    }
  }
  dispose() {}
}

export class Shrimps extends FishShrimpsBase {
  constructor(radius: number) {
    super(radius)
    for (let i = 0; i < 20; i++) {
      const fish = new Shrimp(randomDirection(radius * 0.8))
      this.objects.push(fish)
      this.scene.add(fish.mesh)
    }
  }
  dispose() {}
}
export class Aquarium {
  renderTarget = new THREE.WebGLRenderTarget(16, 16, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType
  })
  offscreenCamera = new THREE.PerspectiveCamera(90, 1, 0.1, 32)
  scene = new THREE.Scene()
  camera = new THREE.Camera()
  stringRenderer = new BezierStringRenderer()
  constructor(public radius: number) {
    const refractMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: this.renderTarget.texture }))
    refractMesh.scale.set(2, 2, 2)
    this.scene.add(refractMesh)
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
    const { offscreenCamera } = this
    offscreenCamera.up.set(0, 0, 1)
    offscreenCamera.position.set(0, -Math.SQRT2 * this.radius, 0)
    offscreenCamera.lookAt(0, 0, 0)
    this.renderTarget.setSize(size, size)
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
    // this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 16)

    renderer.render(this.scene, this.camera)
  }
  compactAllocation() {
    this.renderTarget.setSize(1, 1)
  }
}
