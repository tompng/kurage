import * as THREE from 'three'
import { BezierStringRenderer } from './string_mesh'

type AquaObject = {
  update(dt: number): void
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void
}

export class Aquarium {
  renderTarget = new THREE.WebGLRenderTarget(16, 16, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType
  })
  camera = new THREE.PerspectiveCamera(90, 1, 0.1, 32)
  refractScene = new THREE.Scene()
  refractCamera = new THREE.Camera()
  stringRenderer = new BezierStringRenderer()
  constructor(public radius: number) {
    const refractMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: this.renderTarget.texture }))
    refractMesh.scale.set(2, 2, 2)
    this.refractScene.add(refractMesh)
  }
  objects: AquaObject[] = []
  update(dt: number) {
    this.objects.forEach(obj => obj.update(dt))
  }
  renderToOffScreen(renderer: THREE.WebGLRenderer, size: number) {
    const { camera } = this
    camera.up.set(0, 0, 1)
    camera.position.set(0, -Math.SQRT2 * this.radius, 0)
    camera.lookAt(0, 0, 0)
    this.renderTarget.setSize(size, size)
    renderer.setRenderTarget(this.renderTarget)
    renderer.autoClear = false
    renderer.clearColor()
    renderer.clearDepth()
    this.objects.forEach(obj => obj.render(renderer, camera))
    this.stringRenderer.render(renderer, camera)
    renderer.setRenderTarget(null)
  }
  renderToScreen(renderer: THREE.WebGLRenderer) {
    renderer.render(this.refractScene, this.refractCamera)
  }
  compactAllocation() {
    this.renderTarget.setSize(1, 1)
  }
}
