import { Ribbon, String3D } from './string'
import { JellyGrid } from './grid_jelly'
import * as THREE from 'three'
import { Matrix3, Point3D, normalize, cross, dot, scale as vectorScale, add as vectorAdd, sub as vectorSub } from './math'
import { BezierSegment, BezierStringRenderer } from './string_mesh'
import { RibbonShape } from './ribbon_mesh'
import { OceanDust } from './ocean'

function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const size = 800
const renderer = new THREE.WebGLRenderer()
const canvas = renderer.domElement
document.body.appendChild(canvas)
renderer.setSize(size, size)
const mouse = { x: 0.5, y: 0.5 }
document.body.onpointerdown = document.body.onpointermove = e => {
  mouse.x = (e.pageX - canvas.offsetLeft) / canvas.width - 0.5
  mouse.y = 0.5 - (e.pageY - canvas.offsetTop) / canvas.height
}

const jelly = new JellyGrid(6)
const ocean = new OceanDust(256)

for (let i = 0; i < 4; i++) {
  const th = 2 * Math.PI * i / 4
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    { x: 0.3 * cos, y: 0.3 * sin, z: 1 },
    { x: cos, y: sin, z: 10 },
    new String3D(20, 2, 1, 1)
  )
}
for (let i = 0; i < 4; i++) {
  const th = 2 * Math.PI * i / 4
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    { x: 0.98 * cos, y: 0.98 * sin, z: 0.9 },
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

function frame() {
  const currentDir = normalize(vectorSub(jelly.transformLocalPoint({ x: 0, y: 0, z: -1 }), jelly.position))
  assignGlobal({ currentDir })
  const targetDir = normalize({ x: mouse.x, y: 0, z: mouse.y })
  const rot = normalize(cross(currentDir, targetDir))
  const vdot = dot(currentDir, jelly.velocity)
  jelly.velocity.x = jelly.velocity.x * 0.5 + 0.5 * vdot * currentDir.x
  jelly.velocity.y = jelly.velocity.y * 0.5 + 0.5 * vdot * currentDir.y
  jelly.velocity.z = jelly.velocity.z * 0.5 + 0.5 * vdot * currentDir.z
  if (!isNaN(rot.x)) {
    let theta = Math.atan(Math.acos(dot(currentDir, targetDir))) * 0.1
    const dt = 0.02
    jelly.velocity.x += currentDir.x * dt
    jelly.velocity.y += currentDir.y * dt
    jelly.velocity.z += currentDir.z * dt
    // jelly.rotation = Matrix3.fromRotation(rot, theta).mult(jelly.rotation)
    jelly.momentum.x = jelly.momentum.x * 0.9 + rot.x * theta
    jelly.momentum.y = jelly.momentum.y * 0.9 + rot.y * theta
    jelly.momentum.z = jelly.momentum.z * 0.9 + rot.z * theta
  }
  jelly.update(performance.now() / 1000)
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ jelly, mouse, renderer })


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

const stringRenderer = new BezierStringRenderer(8, 5)

const clovers = [0, 1, 2, 3].map(i => {
  const th = Math.PI * i / 2
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  const rand = (a: number) => a * (2 * Math.random() - 1)
  const line: Point3D[] = []
  for (let i = 0; i <= 10; i++) {
    const t = (2 * i / 10 - 1) * 3
    const x = 0.2 + 0.12 * Math.cos(t) + rand(0.01)
    const y = 0.12 * Math.sin(t) + rand(0.01)
    const z = 0.8+ rand(0.015)
    line.push({
      x: x * cos - y * sin,
      y: x * sin + y * cos,
      z
    })
  }
  return line
})

const ribbonshapes = [0,1,2,3].map(i => new RibbonShape(jelly.strings[i].string.numSegments, 0, 0))
ribbonshapes.forEach(r => r.addToScene(scene))

class SmoothPoint3D {
  v1: Point3D = { x: 0, y: 0, z: 0 }
  v2: Point3D = { x: 0, y: 0, z: 0 }
  v3: Point3D = { x: 0, y: 0, z: 0 }
  vscale: number
  exponent: number
  x = 0
  y = 0
  z = 0
  constructor(position: Point3D, stepScale: number) {
    const e = Math.exp(-1 / stepScale)
    this.exponent = e
    this.vscale = 1 / (1 / (1 - e) - 2 / (1 - e**2) + 1 / (1 - e**3))
    this.reset(position)
  }
  update({ x, y, z }: Point3D) {
    const { v1, v2, v3, vscale, exponent: e } = this
    for (const [v, ex] of [[v1, e], [v2, e**2], [v3, e**3]] as const) {
      v.x = v.x * ex + x
      v.y = v.y * ex + y
      v.z = v.z * ex + z
    }
    this.x = (v1.x - 2 * v2.x + v3.x) * vscale
    this.y = (v1.y - 2 * v2.y + v3.y) * vscale
    this.z = (v1.z - 2 * v2.z + v3.z) * vscale
  }
  reset({ x, y, z }: Point3D) {
    const { v1, v2, v3, exponent: e } = this
    for (const [v, ex] of [[v1, e], [v2, e**2], [v3, e**3]] as const) {
      v.x = x / (1 - ex)
      v.y = y / (1 - ex)
      v.z = z / (1 - ex)
    }
    this.x = x
    this.y = y
    this.z = z
  }
}


const centerPosition = new SmoothPoint3D({ x: 0, y: 0, z: 0 }, 200)

function render() {
  renderer.setRenderTarget(target)
  renderer.autoClear = false
  renderer.clearColor()
  renderer.clearDepth()
  centerPosition.update(jelly.position)
  camera.up.set(0, 0, 1)
  camera.position.set(centerPosition.x, centerPosition.y - 4, centerPosition.z)
  camera.lookAt(centerPosition.x, centerPosition.y, centerPosition.z)

  clovers.forEach(line => {
    const gline = line.map(p => jelly.transformGridPoint(p))
    stringRenderer.request(
      0.03,
      0x444444,
      [...new Array(gline.length - 3)].map((_, i) => {
        const a = gline[i]
        const b = gline[i + 1]
        const c = gline[i + 2]
        const d = gline[i + 3]
        return [
          b,
          vectorAdd(b, vectorScale(vectorSub(c, a), 1 / 6)),
          vectorAdd(c, vectorScale(vectorSub(d, b), -1 / 6)),
          c
        ]
      }),
    )
  })

  jelly.strings.forEach(({ string }, i) => {
    if (i < 4) return
    stringRenderer.request(
      0.01,
      0xBFBFFF,
      [...new Array(string.numSegments)].map((_, i) => {
        const ai = Math.max(i - 1, 0)
        const di = Math.min(i + 2, string.numSegments)
        const a = string.points[ai]
        const b = string.points[i]
        const c = string.points[i + 1]
        const d = string.points[di]
        return [
          b,
          vectorAdd(b, vectorScale(vectorSub(c, a), 1 / 6)),
          vectorAdd(c, vectorScale(vectorSub(d, b), -1 / 6)),
          c
        ]
      })
    )
  })
  stringRenderer.render(renderer, camera)
  const center = jelly.transformGridPoint({ x: 0, y: 0, z: 0 })
  jelly.strings[0]
  ribbonshapes.forEach((r, i) => {
    const ribbonDir = vectorSub(center, jelly.transformGridPoint(jelly.strings[i].pos))
    r.update(jelly.strings[i].string, ribbonDir)
  })
  renderer.render(scene, camera)
  ocean.render(renderer, camera)

  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
}
