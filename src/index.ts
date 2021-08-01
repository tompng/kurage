import { Ribbon, String3D } from './string'
import { JellyGrid } from './grid_jelly'
import * as THREE from 'three'
import { Point3D, normalize, cross, scale as vectorScale, add as vectorAdd, sub as vectorSub } from './math'
import { BezierSegment, BezierStringRenderer } from './string_mesh'

function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const size = 800
const canvas = document.createElement('canvas')
canvas.width = size
canvas.height = size
document.body.appendChild(canvas)
const mouse = { x: 0.5, y: 0.5 }
document.body.onpointerdown = document.body.onpointermove = e => {
  mouse.x = (e.pageX - canvas.offsetLeft) / canvas.width - 0.5
  mouse.y = 0.5 - (e.pageY - canvas.offsetTop) / canvas.height
}

const jelly = new JellyGrid(6)
for (let i = 0; i < 4; i++) {
  const th = 2 * Math.PI * i / 4
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    { x: cos, y: sin, z: 1 },
    { x: cos, y: sin, z: 4 },
    new String3D(100, 2 + 0.5 * Math.random(), 1, 1)
  )
}

for (let i = 0; i < 64; i++) {
  const th = 2 * Math.PI * i / 64
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    { x: cos, y: sin, z: 1 },
    { x: cos, y: sin, z: 4 },
    new String3D(10, 0.2 + 0.1 * Math.random(), 1, 0.1)
  )
}


function render2d() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.translate(0.5, 0.5)
  ctx.scale(1, -1)
  ctx.lineWidth = 0.002
  jelly.update(performance.now() / 1000)
  // jelly.renderToCanvas(ctx)

  ctx.restore()
}
function frame() {
  render()
  render2d()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ jelly })


const renderer = new THREE.WebGLRenderer()
document.body.appendChild(renderer.domElement)
renderer.domElement.style.cssText = 'position: fixed; opacity: 0.8;left:0;top:0'
renderer.setSize(size, size)
const target = new THREE.WebGLRenderTarget(size, size, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.HalfFloatType
})
const targetRenderMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: target.texture }))
const targetRenderScene = new THREE.Scene()
const targetRenderCamera = new THREE.Camera()
targetRenderMesh.scale.x = targetRenderMesh.scale.y = 2
targetRenderScene.add(targetRenderMesh)

const scene = new THREE.Scene()
jelly.addToScene(scene)
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
camera.position.set(0, -4, 0)
camera.lookAt(0, 0, 0)

const stringRenderer = new BezierStringRenderer(8, 5)

function render() {
  renderer.setRenderTarget(target)
  renderer.autoClear = false
  renderer.clearColor()
  renderer.clearDepth()

  jelly.strings.forEach(({ string }) => {
    stringRenderer.render(renderer, camera,
      [...new Array(string.numSegments)].map((_, i) => {
        const ai = Math.max(i - 1, 0)
        const di = Math.min(i + 2, string.numSegments)
        const a = string.points[ai]
        const b = string.points[i]
        const c = string.points[i + 1]
        const d = string.points[di]
        return [
          b,
          vectorAdd(b, vectorScale(vectorSub(c, a), 0.5 / 3)),
          vectorAdd(c, vectorScale(vectorSub(d, b), -0.5 / 3)),
          c
        ]
      }),
      0.04,
      new THREE.Color(0x444488)
    )
  })
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
}
