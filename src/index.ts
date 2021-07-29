import { Ribbon, String3D } from './string'
import { Jelly } from './jelly'
import { JellyGrid } from './grid_jelly'
import * as THREE from 'three'
import { createJellyGeomety, createJellyShader, JellyUniforms } from './jelly_mesh'
import { Point3D, normalize, cross, scale as vectorScale, add as vectorAdd, sub as vectorSub } from './math'
import { BezierSegment, BezierStringRenderer } from './string_mesh'
import { BezierSurfaceRenderer } from './surface_renderer'

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

const strings = [...new Array(4)].map(() => new String3D(100, 0.2 + 0.02 * Math.random(), 1, 1))

const shortStrings = [...new Array(4)].map(() => new String3D(20, 0.1 + 0.01 * Math.random(), 1, 1))

const ribbons = strings.map(s => new Ribbon(s.numSegments))

const jelly2 = new JellyGrid(6)
const jelly = new Jelly(16, {
  size: 1,
  theta1: 0.2,
  theta2: 1.4
}, {
  radial: 20,
  arc: 10
})

jelly.assignStrings(
  strings, ribbons, shortStrings, []
)

function update(){
  const dt = 0.01
  jelly.pullTo({ x: mouse.x, y: Math.sin(performance.now() / 5000) * 0.02, z: mouse.y }, 0.01)
  jelly.update(dt, (1 - Math.cos(performance.now() / 1000)) / 4)
}

function render2d() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.translate(0.5, 0.5)
  ctx.scale(1, -1)
  ctx.lineWidth = 0.002
  jelly.renderToCanvas(ctx)

  jelly2.update(performance.now() / 1000)
  jelly2.renderToCanvas(ctx)

  ctx.restore()
}
function frame() {
  update()
  render()
  render2d()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ strings, jelly })


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
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
camera.position.set(0, -0.2, 0)
camera.lookAt(0, 0, 0)

const geom = createJellyGeomety(0.2, 8, 4)
const uniforms: JellyUniforms[] = []
const meshes: THREE.Mesh[] = []
for (let i = 0; i < jelly.numSegments; i++) {
  const material = createJellyShader()
  const mesh = new THREE.Mesh(geom, material)
  scene.add(mesh)
  meshes.push(mesh)
  uniforms.push(material.uniforms)
}

const stringRenderer = new BezierStringRenderer(8, 5)
const surfaceRenderer = new BezierSurfaceRenderer(32)

function render() {
  const segments = jelly.segmentData()
  const set = (v: { value: THREE.Vector3 }, p: Point3D) => v.value.set(p.x, p.y, p.z)
  const zero = (v: { value: THREE.Vector3 }) => v.value.set(0, 0, 0)
  uniforms.forEach((u, i) => {
    const seg0 = segments[i]
    const seg1 = segments[(i + 1) % segments.length]
    set(u.v000, seg0.bottom); zero(u.vx000); zero(u.vy000); set(u.vz000, seg0.up)
    set(u.v010, seg1.bottom); zero(u.vx010); zero(u.vy010); set(u.vz010, seg1.up)
    set(u.v100, seg0.bottom); zero(u.vx100); zero(u.vy100); set(u.vz100, seg0.radial)
    set(u.v110, seg1.bottom); zero(u.vx110); zero(u.vy110); set(u.vz110, seg1.radial)
    set(u.v001, seg0.top); set(u.vz001, seg0.up); set(u.vx001, seg0.radial); zero(u.vy001)
    set(u.v011, seg1.top); set(u.vz011, seg1.up); set(u.vx011, seg1.radial); zero(u.vy011)
    set(u.v101, seg0.outer); set(u.vx101, seg0.oradial); set(u.vy101, seg0.arc); set(u.vz101, seg0.radial)
    set(u.v111, seg1.outer); set(u.vx111, seg1.oradial); set(u.vy111, seg1.arc); set(u.vz111, seg1.radial)
  })
  meshes.forEach(m => { (m.material as any).needsUpdate = true })
  renderer.setRenderTarget(target)
  renderer.autoClear = false
  renderer.clearColor()
  renderer.clearDepth()
  for (let i = 0; i < segments.length; i++) {
    const seg0 = segments[i]
    const seg1 = segments[(i + 1) % segments.length]
    surfaceRenderer.render(renderer, camera,
      seg0.top,
      seg0.outer,
      seg1.outer,
      seg0.up,
      seg0.radial,
      seg1.radial
    )
    surfaceRenderer.render(renderer, camera,
      vectorAdd(vectorScale(seg0.top, 0.8), vectorScale(seg0.bottom, 0.2)),
      seg0.outer,
      seg1.outer,
      seg0.up,
      seg0.radial,
      seg1.radial
    )


  }

  ;[jelly.coreStrings, jelly.pointStrings].forEach(list => {
    list.forEach(({ s }) => {
      stringRenderer.render(renderer, camera,
        [...new Array(s.numSegments)].map((_, i) => {
          const ai = Math.max(i - 1, 0)
          const di = Math.min(i + 2, s.numSegments)
          const a = s.points[ai]
          const b = s.points[i]
          const c = s.points[i + 1]
          const d = s.points[di]
          return [
            b,
            vectorAdd(b, vectorScale(vectorSub(c, a), 0.5 / 3)),
            vectorAdd(c, vectorScale(vectorSub(d, b), -0.5 / 3)),
            c
          ]
        }),
        0.0002,
        new THREE.Color(0x111122)
      )
    })
  })
  // renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
}
