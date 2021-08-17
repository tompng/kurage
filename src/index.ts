import { Ribbon, String3D } from './string'
import { JellyGrid } from './grid_jelly'
import * as THREE from 'three'
import { Matrix3, Point3D, normalize, cross, dot, scale as vectorScale, add as vectorAdd, sub as vectorSub } from './math'
import { BezierSegment, BezierStringRenderer } from './string_mesh'
import { RibbonShape } from './ribbon_mesh'
import { OceanDust, OceanDark, OceanSurface, OceanTerrain } from './ocean'
import { test, stripeImage, spottedImage, mergeImage, radialTreeImage } from './jelly_texture'
// test();throw 'err'
const textureCanvas = mergeImage(
  512,
  spottedImage(512, { n: 128, rmin: 0.03, rmax: 0.05, donut: 0.05 }),
  radialTreeImage(512)
)
const texture = new THREE.Texture(textureCanvas)
texture.needsUpdate = true

function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const renderer = new THREE.WebGLRenderer()
const target = new THREE.WebGLRenderTarget(16, 16, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.HalfFloatType
})
let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
const uiCanvas = document.createElement('canvas')
const uiCtx = uiCanvas.getContext('2d')!
document.body.appendChild(renderer.domElement)
document.body.appendChild(uiCanvas)
function setSize(){
  const minAspect = 3 / 5
  const maxAspect = 3 / 4
  const aspect = Math.max(minAspect, Math.min(innerWidth / innerHeight, innerHeight / innerWidth, maxAspect))
  let width: number, height: number, fov: number
  if (innerWidth > innerHeight) {
    fov = 180 * Math.atan(aspect) / Math.PI
    width = (innerWidth * aspect < innerHeight) ? innerWidth : innerHeight / aspect
    height = width * aspect
  } else {
    fov = 45
    height = (innerHeight * aspect < innerWidth) ? innerHeight : innerWidth / aspect
    width = height * aspect
  }
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)
  target.setSize(width * devicePixelRatio, height * devicePixelRatio)
  camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100)
  const dom = renderer.domElement
  uiCanvas.width = width * devicePixelRatio
  uiCanvas.height = height * devicePixelRatio
  uiCanvas.style.width = `${width}px`
  uiCanvas.style.height = `${height}px`
  renderer.domElement.style.left = uiCanvas.style.left = `${(innerWidth - width) / 2}px`
  renderer.domElement.style.top = uiCanvas.style.top = `${(innerHeight - height) / 2}px`
}
setSize()
window.onresize = setSize
const touch = {
  id: null as null | number,
  lastActiveTime: 1 as null | number,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  th: 0
}
assignGlobal({ touch })
const player = {
  x: 0, z: -2,
  vx: 0, vz: 0,
  th: Math.PI,
  dstTheta: Math.PI
}
function getTouchPoint(e: PointerEvent) {
  const size = Math.min(innerWidth, innerHeight)
  return {
    x: (2 * e.pageX - innerWidth) / size,
    y: (innerHeight - 2 * e.pageY) / size
  }
}

document.addEventListener('touchstart', e => {
  e.preventDefault()
}, { passive: false })
window.onpointerdown = e => {
  e.preventDefault()
  const p = getTouchPoint(e)
  if (Math.hypot(p.x, p.y) < 1 / 3) {
    touch.id = e.pointerId
    touch.start = p
    touch.end = p
    touch.lastActiveTime = null
  }
}
window.onpointermove = e => {
  e.preventDefault()
  if (!touch || touch.id !== e.pointerId) return
  touch.end = getTouchPoint(e)
  const dx = touch.end.x - touch.start.x
  const dy = touch.end.y - touch.start.y
  const dr = Math.hypot(dx, dy)
  player.dstTheta = touch.th = Math.atan2(
    64 * dr * dy + Math.sin(player.th),
    64 * dr * dx + Math.cos(player.th)
  )
  touch.lastActiveTime = null
}
window.onpointerup = e => {
  e.preventDefault()
  if (touch.id === e.pointerId) touch.lastActiveTime = new Date().getTime()
  touch.id = null
}

const jelly = new JellyGrid(6, texture)
const oceanDust = new OceanDust(256)
const oceanDark = new OceanDark()
const oceanSurface = new OceanSurface()
const oceanTerrain = new OceanTerrain()

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
for (let i = 0; i < 8; i++) {
  const th = 2 * Math.PI * i / 8
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    { x: 0.98 * cos, y: 0.98 * sin, z: 0.9 },
    { x: cos, y: sin, z: 4 },
    new String3D(100, 2 + 0.5 * Math.random(), 1, 1)
  )
}

// for (let i = 0; i < 64; i++) {
//   const th = 2 * Math.PI * i / 64
//   const cos = Math.cos(th)
//   const sin = Math.sin(th)
//   jelly.addString(
//     { x: cos, y: sin, z: 1 },
//     { x: cos, y: sin, z: 4 },
//     new String3D(10, 0.2 + 0.1 * Math.random(), 1, 0.1)
//   )
// }

for (let i = 0; i < 64; i++) {
  const th = 2 * Math.PI * i / 64
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  const rth = Math.PI / 2 * Math.sqrt(Math.random())
  const r = Math.sin(rth)
  let z = Math.cos(rth)
  jelly.addString(
    { x: r * cos, y: r * sin, z: 1 - z },
    { x: 0, y: 0, z: -1 },
    new String3D(10, 0.15, 1, 0.1)
  )
}

assignGlobal({ player })
const oceanDepth = -16
function frame() {
  const currentDir = normalize(vectorSub(jelly.transformLocalPoint({ x: 0, y: 0, z: -1 }), jelly.position))
  const targetDir = normalize({ x: Math.cos(player.th), y: 0, z: Math.sin(player.th) })
  const rot = normalize(cross(currentDir, targetDir))
  const d = Math.sqrt(1 - Math.cos(player.dstTheta - player.th)) * (Math.sin(player.dstTheta - player.th) > 0 ? 1 : -1)
  player.vx = player.vx * 0.4 + (currentDir.x + Math.cos(player.dstTheta)) * 0.01
  player.vz = player.vz * 0.4 + (currentDir.z + Math.sin(player.dstTheta)) * 0.01
  const vdot = Math.cos(player.th) * player.vx + Math.sin(player.th) * player.vz
  player.th += d * (0.002 + Math.min(Math.max(0, vdot), 0.006))
  player.x += player.vx * 0.1
  player.z += player.vz * 0.1
  player.z = Math.min(Math.max(player.z, oceanDepth + 1), -1)

  jelly.velocity.x = player.vx
  jelly.velocity.y = 0
  jelly.velocity.z = player.vz
  if (!isNaN(rot.x)) {
    let theta = Math.atan(Math.acos(dot(currentDir, targetDir))) * 0.5
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
  jelly.position.x = player.x
  jelly.position.y = 0
  jelly.position.z = player.z
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ jelly, renderer })

const targetRenderMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: target.texture }))
const targetRenderScene = new THREE.Scene()
const targetRenderCamera = new THREE.Camera()
targetRenderMesh.scale.x = targetRenderMesh.scale.y = 2
targetRenderScene.add(targetRenderMesh)

const scene = new THREE.Scene()
jelly.addToScene(scene)

const stringRenderer = new BezierStringRenderer(4, 5)

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


const centerPosition = new SmoothPoint3D(jelly.position, 60)

function render() {
  renderer.setRenderTarget(target)
  renderer.autoClear = false
  renderer.clearColor()
  renderer.clearDepth()
  centerPosition.update(jelly.position)
  camera.up.set(0, 0, 1)
  camera.position.set(centerPosition.x, centerPosition.y - 8, centerPosition.z)
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
      0.015,
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

  const uiBrightness = touch.lastActiveTime ? 1 - (new Date().getTime() - touch.lastActiveTime) / 300 : 1
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)
  uiCtx.save()
  uiCtx.translate(uiCanvas.width / 2, uiCanvas.height / 2)
  const minWH = Math.min(uiCanvas.width, uiCanvas.height)
  uiCtx.scale(minWH / 2, -minWH / 2)
  uiCtx.rotate(touch.th)
  uiCtx.lineCap = uiCtx.lineJoin = 'round'
  uiCtx.strokeStyle = '#eef'
  if (uiBrightness > 0) {
    uiCtx.lineWidth = 0.05
    uiCtx.beginPath()
    uiCtx.globalAlpha = uiBrightness * 0.5
    uiCtx.moveTo(0.2, 0)
    uiCtx.lineTo(0.6, 0)
    uiCtx.moveTo(0.6, 0.09)
    uiCtx.bezierCurveTo(
      0.7, 0.08,
      0.7, -0.08,
      0.6, -0.09
    )
    uiCtx.stroke()
  }
  uiCtx.globalAlpha = 0.4
  const currentDir = normalize(vectorSub(jelly.transformLocalPoint({ x: 0, y: 0, z: -1 }), jelly.position))
  const currentTh = Math.atan2(currentDir.z, currentDir.x)
  const alpha = Math.min(0.2, 10 * Math.max(0.9 - Math.cos(currentTh - player.dstTheta), 0))
  if (alpha > 0) {
    uiCtx.globalAlpha = alpha * (1 + Math.sin(performance.now() / 300)) / 2
    uiCtx.beginPath()
    uiCtx.lineWidth = 0.02
    uiCtx.rotate(currentTh - player.dstTheta)
    if (Math.sin(player.th - player.dstTheta) < 0) uiCtx.scale(1, -1)
    for (let i = 0; i < 2; i++) {
      uiCtx.rotate(Math.PI)
      uiCtx.moveTo(0.06, 0.5)
      uiCtx.bezierCurveTo(0.04, 0.505, -0.04, 0.505, -0.06, 0.5)
      uiCtx.moveTo(0.072, 0.53)
      uiCtx.bezierCurveTo(0.111, 0.52, 0.109, 0.48, 0.068, 0.47)
    }
    uiCtx.stroke()
  }
  uiCtx.restore()

  oceanDark.render(renderer, camera)
  oceanSurface.render(renderer, camera)
  oceanTerrain.render(renderer, camera)
  stringRenderer.render(renderer, camera)
  const center = jelly.transformGridPoint({ x: 0, y: 0, z: 0 })
  jelly.strings[0]
  ribbonshapes.forEach((r, i) => {
    const ribbonDir = vectorSub(center, jelly.transformGridPoint(jelly.strings[i].pos))
    r.update(jelly.strings[i].string, ribbonDir)
  })
  renderer.render(scene, camera)
  oceanDust.render(renderer, camera)

  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
}
