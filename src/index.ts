import { Ribbon, String3D } from './string'
import { Jelly } from './jelly'
import * as THREE from 'three'
import { Point3D, normalize, scale as vectorScale, add as vectorAdd, sub as vectorSub, SmoothPoint3D } from './math'
import { RibbonRenderer } from './ribbon_mesh'
import textureUrl0 from './images/jelly/0.jpg'
import textureUrl1 from './images/jelly/1.jpg'
import textureUrl2 from './images/jelly/2.jpg'
import textureUrl3 from './images/jelly/3.jpg'
import textureUrl4 from './images/jelly/4.jpg'
import textureUrl5 from './images/jelly/5.jpg'
import { World } from './world'
import { BezierStringRenderer } from './string_mesh'
import { Menu } from './menu'
import { GearValue, GearComponent } from './gear_component'
const renderOnResize: (() => void)[] = []
const textureUrls = [textureUrl0, textureUrl1, textureUrl2, textureUrl3, textureUrl4, textureUrl5]
const textures = textureUrls.map(url => {
  const texture = new THREE.TextureLoader().load(url)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
})
const mainDiv = document.querySelector<HTMLDivElement>('#main')!
const gearValue: GearValue = [[2], 3, [0,1], 2]
const menu = new Menu(mainDiv)
document.querySelectorAll<HTMLDivElement>('.gear-select-body .gear-item').forEach((el, i) => {
  el.style.backgroundImage = 'url(' + textureUrls[i] + ')'
  el.style.backgroundPosition = 'center'
  el.style.backgroundSize = '200%'
})
menu.components.gear = new GearComponent(gearValue, values => {
  jelly.updateTexture(textures[values[1]])
  render()
})

const mapComponentDOM = document.querySelector<HTMLDivElement>('#map')!
const bookComponentDOM = document.querySelector<HTMLDivElement>('#book')!
mapComponentDOM.remove()
bookComponentDOM.remove()
menu.components.map = { dom: mapComponentDOM }
menu.components.book = { dom: bookComponentDOM }

renderOnResize.push(() => menu.reRender())
menu.onOpen = () => {
  if (!(window as any).stopAt) {
    ;(window as any).startAt = null
    ;(window as any).stopAt = performance.now()-10000
  }
}
menu.onClose = () => {
  ;(window as any).stopAt = null
  ;(window as any).startAt = performance.now()
}

const stringRenderer = new BezierStringRenderer()
const texture = textures[3]
const jelly = new Jelly(6, texture)
jelly.setPosition({ x: 0, y: 0, z: -2 }, { x: -1, y: 0, z: 0.1 })
const world = new World(stringRenderer, jelly)
const player = world.player

const whiteBlueStringProfile = stringRenderer.getPlainProfile({ l: 4, r: 5 }, 0.015, new THREE.Color(0xBFBFFF))
function requestWhiteBlueString(string: String3D) {
  whiteBlueStringProfile.request(string.bezierSegments())
}
const thinStringProfile = stringRenderer.getPlainProfile({ l: 4, r: 5 }, 0.008, new THREE.Color(0xBFBFFF))
function requestThinString(string: String3D) {
  thinStringProfile.request(string.bezierSegments())
}

function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const renderer = new THREE.WebGLRenderer()
const shortFov = 30
let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
const uiCanvas = document.createElement('canvas')
const uiCtx = uiCanvas.getContext('2d')!
renderer.domElement.style.width = uiCanvas.style.width = '100%'
renderer.domElement.style.height = uiCanvas.style.height = '100%'
mainDiv.appendChild(renderer.domElement)
mainDiv.appendChild(uiCanvas)
const fullSquareStyle = document.createElement('style')
document.head.appendChild(fullSquareStyle)
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
  const squareSize = Math.min(width, height)
  fullSquareStyle.textContent = `.full-square { width: ${squareSize}px; height: ${squareSize}px; }`
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)
  camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100)
  uiCanvas.width = width * devicePixelRatio
  uiCanvas.height = height * devicePixelRatio
  mainDiv.style.width = `${width}px`
  mainDiv.style.height = `${height}px`
  mainDiv.style.left = `${(innerWidth - width) / 2}px`
  mainDiv.style.top = `${(innerHeight - height) / 2}px`
  for (const f of renderOnResize) f()
}
setSize()
window.onresize = setSize
const touch = {
  id: null as null | number,
  lastActiveTime: 1 as null | number,
  arrow: false,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  th: Math.PI,
  taps: [] as { x: number, y: number, time: number }[],
  gpos: null as Point3D | null
}
assignGlobal({ touch })
function getTouchPoint(e: PointerEvent) {
  const w = mainDiv.offsetWidth
  const h = mainDiv.offsetHeight
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
  if (menu.type) return
  const p = getTouchPoint(e)
  touch.id = e.pointerId
  if (Math.hypot(p.x, p.y) < 0.4) {
    touch.arrow = true
    touch.start = p
    touch.end = p
    touch.gpos = null
    touch.lastActiveTime = null
  } else {
    touch.lastActiveTime = 1
    touch.arrow = false
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
  if (touch.id !== e.pointerId) return
  const p = getTouchPoint(e)
  if (!touch.arrow) {
    touch.gpos = screenToGlobal(p)
    return
  }
  touch.end = p
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
  if (touch.id !== e.pointerId) return
  if (!touch.lastActiveTime) touch.lastActiveTime = new Date().getTime()
  touch.id = null
  touch.gpos = null
}

const ribbonSegments = 20
const ribbonRenderer = new RibbonRenderer(ribbonSegments, 0.3, 0.3)
function renderRibbon(string: String3D, ribbon: Ribbon) {
  ribbonRenderer.render(renderer, camera, string, ribbon)
}

const jellies: Jelly[] = []

const varyingStringProfile = stringRenderer.getVaryingProfile({ l: 4, r: 5 }, 0.015)
function addJelly(x: number, z: number) {
  const jelly = new Jelly(4, texture, 0.2 + 0.8 * Math.random())
  jelly.setPosition({ x, y: 0, z })
  function renderString(string: String3D) {
    varyingStringProfile.request(string.bezierSegmentsWithColor({ r: 4, g: 0, b: 0 }, { r: 3, g: 3, b: 4 }))
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
  varyingStringProfile.request(string.bezierSegmentsWithColor({ r: 0.4, g: 0.5, b: 0.5 }, { r: 0.6, g: 0, b: 0 }))
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
  if (dt !== 0) render()
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

const cloverStringProfile = stringRenderer.getPlainProfile({ l: 6, r: 12 }, 0.03, new THREE.Color(0xff8844))
function renderCloverAttachment(positions: Point3D[]) {
  cloverStringProfile.request(
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
  const ratio = renderer.getPixelRatio()
  world.renderToOffScreen(renderer, { width: size.x * ratio, height: size.y * ratio }, camera)
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

renderOnResize.push(render)
