import { Ribbon, String3D } from './string'
import { Jelly } from './jelly'
import * as THREE from 'three'
import { Point3D, normalize, scale as vectorScale, add as vectorAdd, sub as vectorSub, SmoothPoint3D } from './math'
import { RibbonRenderer } from './ribbon_mesh'
import textureUrl from './images/jelly/0.jpg'
import { World } from './world'

const texture = new THREE.TextureLoader().load(textureUrl)
texture.wrapS = THREE.ClampToEdgeWrapping
texture.wrapT = THREE.ClampToEdgeWrapping
texture.generateMipmaps = true
texture.needsUpdate = true
const jelly = new Jelly(6, texture)
jelly.setPosition({ x: 0, y: 0, z: -2 }, { x: -1, y: 0, z: 0.1 })
const world = new World(jelly)
const player = world.player
const stringRenderer = world.stringRenderer

function requestWhiteBlueString(string: String3D) {
  stringRenderer.request(0.015, 0xBFBFFF, string.bezierSegments())
}
function requestThinString(string: String3D) {
  stringRenderer.request(0.008, 0xBFBFFF, string.bezierSegments())
}

function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const renderer = new THREE.WebGLRenderer()
const shortFov = 30
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
    fov = shortFov
    width = (innerWidth * aspect < innerHeight) ? innerWidth : innerHeight / aspect
    height = width * aspect
  } else {
    fov = 2 * Math.atan(Math.tan(Math.PI * shortFov / 180 / 2) / aspect) * 180 / Math.PI
    height = (innerHeight * aspect < innerWidth) ? innerHeight : innerWidth / aspect
    width = height * aspect
  }
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)
  camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100)
  const dom = renderer.domElement
  uiCanvas.width = width * devicePixelRatio
  uiCanvas.height = height * devicePixelRatio
  uiCanvas.style.width = `${width}px`
  uiCanvas.style.height = `${height}px`
  dom.style.left = uiCanvas.style.left = `${(innerWidth - width) / 2}px`
  dom.style.top = uiCanvas.style.top = `${(innerHeight - height) / 2}px`
}
setSize()
window.onresize = setSize
const touch = {
  id: null as null | number,
  lastActiveTime: 1 as null | number,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  th: Math.PI,
  taps: [] as { x: number, y: number, time: number }[],
  gpos: null as Point3D | null
}
assignGlobal({ touch })
function getTouchPoint(e: PointerEvent) {
  const w = renderer.domElement.offsetWidth
  const h = renderer.domElement.offsetHeight
  const size = Math.min(w, h)
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
  if (Math.hypot(p.x, p.y) < 0.4) {
    touch.id = e.pointerId
    touch.start = p
    touch.end = p
    touch.lastActiveTime = null
  } else {
    touch.gpos = screenToGlobal(p)
    touch.taps.push({ ...p, time: new Date().getTime() })
  }
}
function screenToGlobal(p: { x: number, y: number }) {
  const gy = 0
  const scale = Math.tan(shortFov * Math.PI / 180 / 2)
  const gx = camera.position.x + (gy - camera.position.y) * p.x * scale
  const gz = camera.position.z + (gy - camera.position.y) * p.y * scale
  return { x: gx, y: gy, z: gz }
}
function globalToScreen(p: Point3D) {
  const scale = Math.tan(shortFov * Math.PI / 180 / 2)
  return {
    x: (p.x - camera.position.x) / (p.y - camera.position.y) / scale,
    y: (p.z - camera.position.z) / (p.y - camera.position.y) / scale
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

const ribbonSegments = 20
const ribbonRenderer = new RibbonRenderer(ribbonSegments, 0.3, 0.3)
function renderRibbon(string: String3D, ribbon: Ribbon) {
  ribbonRenderer.render(renderer, camera, string, ribbon)
}

const jellies: Jelly[] = []

function addJelly(x: number, z: number) {
  const jelly = new Jelly(4, texture, 0.2 + 0.8 * Math.random())
  jelly.setPosition({ x, y: 0, z })
  function renderString(string: String3D) {
    stringRenderer.varyingRequest(0.015, string.bezierSegmentsWithColor({ r: 4, g: 0, b: 0 }, { r: 3, g: 3, b: 4 }))
  }
  for (let i = 0; i < 4; i++) {
    const th = 2 * Math.PI * i / 4 + 1
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    jelly.addString(
      {
        pos: { x: 0.3 * cos, y: 0.3 * sin, z: 1 },
        dir: { x: cos, y: sin, z: 10 },
        n: 2,
        f: 10
      },
      new String3D(20, 2, 1),
      renderString
    )
  }
  jellies.push(jelly)
  if (jellies.length > 2) jellies.shift()?.dispose()
}

assignGlobal({ addJelly, jellies })

for (let i = 0; i < 4; i++) {
  const th = 2 * Math.PI * i / 4 + 1
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    {
      pos: { x: 0.3 * cos, y: 0.3 * sin, z: 1 },
      dir: { x: cos, y: sin, z: 10 },
      n: 4,
      f: 10
    },
    new String3D(ribbonSegments, 2, 1),
    renderRibbon,
    true
  )
}
for (let i = 0; i < 8; i++) {
  const th = 2 * Math.PI * i / 8
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    {
      pos: { x: 0.98 * cos, y: 0.98 * sin, z: 0.9 },
      dir: { x: cos, y: sin, z: 4 },
      n: 10,
      f: 10
    },
    new String3D(100, 2 + 0.5 * Math.random(), 1),
    requestWhiteBlueString
  )
}

for (let i = 0; i < 128; i++) {
  const th = 2 * Math.PI * i / 128
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  jelly.addString(
    {
      pos: { x: cos, y: sin, z: 1 },
      dir: { x: cos, y: sin, z: 4 },
      n: 4,
      f: 10
    },
    new String3D(5, 0.2 + 0.1 * Math.random(), 0.1),
    requestThinString
  )
}


function requestHanagasaString(string: String3D) {
  stringRenderer.varyingRequest(0.015, string.bezierSegmentsWithColor({ r: 0.4, g: 0.5, b: 0.5 }, { r: 0.6, g: 0, b: 0 }))
}
for (let i = 0; i < 64; i++) {
  const th = 2 * Math.PI * i / 64
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  const rth = Math.PI / 2 * Math.sqrt(Math.random())
  const r = Math.sin(rth)
  let z = Math.cos(rth)
  jelly.addString(
    {
      pos: { x: r * cos, y: r * sin, z: 1 - z },
      dir: { x: 0, y: 0, z: -1 },
      n: 4,
      f: 10
    },
    new String3D(10, 0.15, 0.1),
    requestHanagasaString
  )
}

assignGlobal({ player })
function frame() {
  let dt = 0.01
  const { stopAt, startAt } = window as any
  if (startAt) {
    dt = Math.min((performance.now() - startAt) / 1000, 1) * 0.01
  } else if (stopAt) {
    dt = Math.max(1 - (performance.now() - stopAt) / 1000, 0) * 0.01
  }
  world.update(dt, touch.gpos)
  touch.gpos = null
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ jelly, renderer })

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
    const z = 0.6 + rand(0.015) + x * x / 4
    line.push({
      x: x * cos - y * sin,
      y: x * sin + y * cos,
      z
    })
  }
  return line
})

function renderCloverAttachment(positions: Point3D[]) {
  stringRenderer.request(
    0.03,
    0xff8844,
    [...new Array(positions.length - 3)].map((_, i) => {
      const a = positions[i]
      const b = positions[i + 1]
      const c = positions[i + 2]
      const d = positions[i + 3]
      return [
        b,
        vectorAdd(b, vectorScale(vectorSub(c, a), 1 / 6)),
        vectorAdd(c, vectorScale(vectorSub(d, b), -1 / 6)),
        c
      ]
    }),
  )
}

clovers.forEach(positions => {
  jelly.addAttachment(positions, renderCloverAttachment)
})

const centerPosition = new SmoothPoint3D(jelly.position, 0.5)

function render() {
  const size = new THREE.Vector2()
  renderer.getSize(size)
  world.renderToOffScreen(renderer, { width: size.x, height: size.y }, camera)
  world.renderToScreen(renderer)
  renderUI()
}

function renderUI() {
  const currnetTime = new Date().getTime()
  const uiBrightness = touch.lastActiveTime ? 1 - (currnetTime - touch.lastActiveTime) / 300 : 1
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)
  uiCtx.save()
  uiCtx.translate(uiCanvas.width / 2, uiCanvas.height / 2)
  const minWH = Math.min(uiCanvas.width, uiCanvas.height)
  uiCtx.scale(minWH / 2, -minWH / 2)
  uiCtx.save()
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

  while(touch.taps.length !== 0 && touch.taps[0].time + 300 < currnetTime) touch.taps.shift()
  touch.taps.forEach(({ x, y, time }) => {
    const t = (currnetTime - time) / 300
    uiCtx.beginPath()
    uiCtx.arc(x, y, 0.1 * (t + 0.01), 0, 2 * Math.PI)
    uiCtx.globalAlpha = 0.5 * (1 - t)
    uiCtx.fillStyle = 'white'
    uiCtx.fill()
  })
  uiCtx.restore()
}
