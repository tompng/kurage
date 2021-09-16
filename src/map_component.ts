import { curvePath } from "./curve_path" 
import { terrainCoords } from './terrain'
import { Point2D } from './math'

type PositionFunc = () => {
  x: number
  y: number
  th: number
}

const warpPoints = [
  { x: 512, y: 12 },
  { x: 100, y: 48 },
  { x: 128, y: 512 },
  { x: 435, y: 660 },
  { x: 700, y: 400 },
  { x: 800, y: 750 },
  { x: 790, y: 100 },
  { x: 480, y: 256 },
]
export class MapComponent {
  dom: HTMLDivElement
  mode: number | null = null
  canvas: HTMLCanvasElement
  map = generateFullMap()
  target : {
    point: Point2D
    startTime: number
  } | null = null
  constructor(public getCurrentJellyPos: PositionFunc) {
    this.dom = document.querySelector<HTMLDivElement>('#map')!
    this.canvas = this.dom.querySelector<HTMLCanvasElement>('canvas')!
    this.canvas.onpointerdown = e => {
      if (this.target) return
      const p = transformToMapPoint({ x: e.offsetX / this.canvas.offsetWidth * 1024, y: e.offsetY / this.canvas.offsetWidth * 1024 })
      const wp = warpPoints.find(wp => (wp.x - p.x) ** 2 + (wp.y - p.y) ** 2 < 64 ** 2)
      if (!wp) return
      this.target = { point: wp, startTime: performance.now() }
    }
    this.dom.remove()
  }
  render() {
    const { canvas } = this
    const size = canvas.offsetWidth * devicePixelRatio
    if (canvas.width != size || canvas.height != size) canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.scale(size / 1024, size / 1024)
    ctx.drawImage(this.map, 0, 0, 1024, 1024)
    const pos = this.getCurrentJellyPos()
    mapTransform(ctx)
    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(pos.th)
    ctx.scale(4, 4)
    drawJelly(ctx)
    ctx.restore()
    const time = performance.now()
    for (const p of warpPoints) {
      if (p === this.target?.point) {
        const phase = Math.max(0, Math.min(1, (time - this.target.startTime) / 500))
        renderWarpMarker(ctx, p, time / 1000, phase)
      } else {
        renderWarpMarker(ctx, p, time / 1000, 0)
      }
    }
    const zoomdom = this.dom.querySelector<HTMLDivElement>('.mapzoom')!
    if (this.target) {
      const { canvas, target } = this
      const t = (time - target.startTime) / 400
      zoomdom.style.display = 'block'
      const w = zoomdom.offsetWidth
      const h = zoomdom.offsetHeight
      const rmax = Math.hypot(w, h) / 2
      const r = rmax * (t < 1 ? Math.sqrt(((t - 1) ** 2 + 0.1) / 1.1) : (t < 2 ? 1 : 1 - 2 * (t - 2) ** 2) * Math.sqrt(0.1 / 1.1))
      const { x: canvasX, y: canvasY } = transformFromMapPoint(target.point)
      const cw = canvas.offsetWidth
      const ch = canvas.offsetHeight
      const x = canvasX / 1024 * cw + (w - cw) / 2
      const y = canvasY / 1024 * ch + (h - ch) / 2
      zoomdom.style.background = `radial-gradient(
        circle at ${x}px ${y}px, transparent ${Math.max(r - 2, 0)}px, black ${r}px)`
    } else {
      zoomdom.style.display = 'none'
    }
    ctx.restore()
  }
  timer: number | null = null
  start() {
    this.target = null
    this.render()
    this.animate()
  }
  animate() {
    if (this.timer) return
    this.timer = requestAnimationFrame(() => {
      this.timer = null
      this.render()
      this.animate()
    })
  }
  end() {
    if (!this.timer) return
    cancelAnimationFrame(this.timer)
    this.timer = null
  }
}

function drawJelly(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#432'
  const time = performance.now() / 1000
  for (let i = 0; i < 4; i++) {
    const phase = (i / 4 + time / 4) % 1
    ctx.beginPath()
    ctx.globalAlpha = phase * (1 - phase)
    ctx.arc(0, 0, 8 + 32 * phase, 0, 2 * Math.PI)
    ctx.stroke()
  }
  ctx.translate(3, 0)
  const x1 = 1
  const y1 = 8
  const x2 = -4
  const y2 = 10
  const curve: [number, number][] = [[4, 0], [x1, y1], [x2, y2], [x2 + 1, 0], [x2, -y2], [x1, -y1]]
  ctx.beginPath()
  curvePath(ctx, curve, true)
  ctx.globalAlpha = 0.4
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.globalAlpha = 0.8
  ctx.stroke()
  ctx.beginPath()
  const rnd = (seed: number) => (Math.sin(1000 * seed + 1) + 1) * 1000 % 1
  for (let i = 0; i < 4; i++) {
    const z = 2 * i / 3 - 1
    curvePath(ctx, [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => {
      const a = 1 + rnd(t + z + 10)
      const b = 1 + rnd(t + z + 20)
      const c = 1 + rnd(t + z + 30)
      const d = 1 + rnd(t + z + 40)
      return [
        -5 - 16 * t,
        4 * z + 2 * t * z + t * (Math.cos(time * a + t * b + z) + Math.sin(time * c + t * d - z)) / 2
      ]
    }))
  }
  ctx.stroke()
}
const trans = { scale: 0.92, x: 1024 * 0.04, y: 1024 * 0.08 }
function transformToMapPoint({ x, y }: Point2D) {
  return {
    x: x / trans.scale - trans.x,
    y: y / trans.scale - trans.y
  }
}
function transformFromMapPoint({ x, y }: Point2D) {
  return {
    x: (x + trans.x) * trans.scale,
    y: (y + trans.y) * trans.scale
  }
}
function mapTransform(ctx: CanvasRenderingContext2D) {
  ctx.scale(trans.scale, trans.scale)
  ctx.translate(trans.x, trans.y)
}
function generateFullMap() {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const textures = createTextures('#421', 4)
  const wtextures = createTextures('#336', 4)
  ctx.scale(size / 1024, size / 1024)
  ctx.beginPath()
  crackPath(ctx, 512, 512, 512, 0.1)
  ctx.clip()
  ctx.beginPath()
  const outerMargin = 2
  rectPath(ctx, outerMargin, outerMargin, 1024 - 2 * outerMargin, 1024 - 2 * outerMargin, 1, 64)
  const margin = 12
  ctx.fillStyle = '#eca'
  ctx.fill()
  ctx.beginPath()
  ctx.rect(margin, margin, 1024 - 2 * margin, 1024 - 2 * margin)
  ctx.save()
  ctx.clip()
  mapTransform(ctx)
  const wline: [number, number][] = []
  const woffset = 16
  for (let i = 0; i < 100; i++) {
    const t = -woffset + (1024 + woffset * 2) * i / 100
    wline.push([t, 8 * Math.abs(Math.sin(i * 0.5)) - 8])
  }
  ctx.save()
  ctx.beginPath()
  curvePath(ctx, wline)
  ctx.lineTo(1024 + woffset, 1024)
  ctx.lineTo(-woffset, 1024)
  ctx.clip()
  ctx.globalAlpha = 0.5
  const wltextures = createTextures('#8bd', 4)
  for (let i = 0; i < 128; i++) {
    const texture = wltextures[Math.floor(wltextures.length * Math.random())]
    const size = 64 + 64 * Math.random()
    const x = -size + (1024 + size) * i / 128
    const y = -size / 2 + 160 * Math.random() * Math.random()
    ctx.drawImage(texture, x, y, size, size)
  }
  ctx.globalAlpha = 1
  for (const [x, y] of wline) {
    const rndx = 8 * Math.random() - 4
    const rndy = 8 * Math.random() - 4
    ctx.globalAlpha = 0.5 + Math.random() * 0.5
    const texture = wtextures[Math.floor(wtextures.length * Math.random())]
    const r = 16 + 8 * Math.random()
    ctx.drawImage(texture, x - r + rndx, y - r + rndy, 2 * r, 2 * r)
  }

  ctx.restore()

  ctx.strokeStyle = '#421'
  for (const { x, y } of warpPoints) {
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, 16, 0, 2 * Math.PI)
    ctx.stroke()
  }

  for (const line of terrainCoords) {
    const first = line[0]
    const last = line[line.length - 1]
    const closed = first[0] === last[0] && first[1] === last[1]
    const points = (closed ? line.slice(1) : line).map(([x, y]) => {
      const a = 2
      return [x + a * (2 * Math.random() - 1), y + a * (2 * Math.random() - 1)] as [number, number]
    })
    ctx.save()
    ctx.beginPath()
    curvePath(ctx, points, closed)
    if (line == terrainCoords[0]) {
      const offset = 64
      ctx.lineTo(1024 + offset, -offset)
      ctx.lineTo(1024 + offset, 1024 + offset)
      ctx.lineTo(-offset, 1024 + offset)
      ctx.lineTo(-offset, -offset)
    }
    ctx.clip()
    ctx.fillStyle = '#ca8'
    ctx.fill()
    for (const [x, y] of points) {
      const rndx = 12 * Math.random() - 6
      const rndy = 12 * Math.random() - 6
      ctx.globalAlpha = 0.5 + Math.random() * 0.5
      const texture = textures[Math.floor(textures.length * Math.random())]
      const r = 16 + 8 * Math.random()
      ctx.drawImage(texture, x - r + rndx, y - r + rndy, 2 * r, 2 * r)
    }
    ctx.restore()
  }
  const depths = [...new Array(8)].map((_, i) => 900 * i / 7)
  const rnd = 1.5
  ctx.strokeStyle = '#403028'
  for (const depth of depths) {
    ctx.beginPath()
    curvePath(ctx, [...new Array(17)].map((_, i) => [-32 + (1024 + 32 * 2) * i / 16, depth + rnd * (2 * Math.random() - 1)]))
    ctx.stroke()
  }
  for (let i = 0; i <= 6; i++) {
    const x = 1024 * (0.05 + 0.9 * i / 6)
    ctx.beginPath()
    curvePath(ctx, [...new Array(17)].map((_, i) => [x + rnd * (2 * Math.random() - 1), -64 + (1024 + 64 * 2) * i / 16]))
    ctx.stroke()
  }
  ctx.restore()
  ctx.beginPath()
  const lineOuterMargin = 8
  rectPath(ctx, lineOuterMargin, lineOuterMargin, 1024 - 2 * lineOuterMargin, 1024 - 2 * lineOuterMargin, 1)
  const innerMargin = 32
  rectPath(ctx, 1024 - innerMargin, innerMargin, -(1024 - 2 * innerMargin), 1024 - 2 * innerMargin, 1)
  ctx.fillStyle = '#e0d8d0'
  ctx.fill()
  ctx.stroke()
  ctx.font = '10px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'black'
  function genText(width: number) {
    const words = ['kurage', 'world', 'ocean', 'sea']
    let wsum = 0
    let texts: string[] = []
    while (true) {
      const s = [...words[Math.floor(words.length * Math.random())]].map(s => (Math.random() < 0.25 ? ' ' + s : s)).join('')
      const s2 = (texts.length === 0 ? s.replace(/^ ?(.)/, (_, s) => s.toUpperCase()) : s).replaceAll(/ ./g, s => (
        Math.random() < 0.2 ? '.' + s.toUpperCase() : Math.random() < 0.4 ? ',' + s : s
      ))
      const w = ctx.measureText(s2).width
      if (w + wsum > width) return texts.join('')
      texts.push(s2)
      wsum += w
    }
  }

  ctx.fillText(genText(1024 - innerMargin * 2), 512, (lineOuterMargin + innerMargin) / 2)
  ctx.fillText(genText(400), 200 + innerMargin, 1024 - (lineOuterMargin + innerMargin) / 2)
  ctx.fillText(genText(200), 924 - innerMargin, 1024 - (lineOuterMargin + innerMargin) / 2)
  ctx.save()
  mapTransform(ctx)
  depths.forEach((depth, i) => {
    ctx.fillText(String(40 * i), 1024 + 26, depth)
  })
  ctx.restore()
  renderMark(ctx, 128, 1024 - 128, 80)
  ctx.globalAlpha = 0.2
  const dirtyTextures = createTextures('#742', 8)
  for (let i = 0; i < 10; i++) {
    for (const texture of dirtyTextures) {
      const size = 64 + 128 * Math.random()
      const t = Math.random()
      const u = Math.random()
      const x = -size + (1024 + size) * (t * t * (3 - 2 * t))
      const y = -size + (1024 + size) * (u * u * (3 - 2 * u))
      ctx.drawImage(texture, x, y, size, size)
    }
  }
  return canvas
}
function renderMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const a = 0.1
  const b = 0.9
  ctx.fillStyle = ctx.strokeStyle = '#403028'
  ctx.lineWidth = (1 - b) / 4
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(r, r)
  ctx.rotate(0.2)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, b, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.beginPath()
  for (const [x1, y1, x2, y2] of [[0, b, a, a], [b, 0, a, -a], [0, -b, -a, -a], [-b, 0, -a, a]]) {
    ctx.moveTo(0, 0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.fill()
  ctx.lineCap = ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(0, b)
  for (const [x, y] of [[a, a], [b, 0], [a, -a], [0, -b], [-a, -a], [-b, 0], [-a, a], [0, b]]) ctx.lineTo(x, y)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    curvePath(ctx, [[a * 1.5, a * 2.5], [a * 2, a * 4], [a * 3.5, a * 3.5], [a * 4, a * 2], [a * 2.5, a * 1.5]])
    ctx.rotate(Math.PI / 2)
  }
  ctx.stroke()
  ctx.beginPath()
  ctx.lineWidth = (1 - b) / 6
  for (let i = 0; i < 64; i++) {
    const c = 0.6
    curvePath(ctx, [...new Array(5)].map((_, i) => [
      c + (b - c) * i / 4,
      0.01 * (2 * Math.random() - 1)
    ]))
    ctx.rotate(Math.PI * 2 / 64)
  }
  ctx.stroke()
  ctx.restore()
}

function rectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rnd: number, step = 16) {
  type Line = [number, number][]
  const a: Line = []
  const b: Line = []
  const c: Line = []
  const d: Line = []
  for (let i = 1; i < step; i++) {
    const t = i / step
    a.push([x + w * t, y + rnd * (2 * Math.random() - 1)])
    b.push([x + w + rnd * (2 * Math.random() - 1), y + h * t])
    c.push([x + w * (1 - t), y + h + rnd * (2 * Math.random() - 1)])
    d.push([x  + rnd * (2 * Math.random() - 1), y + h * (1 - t)])
  }
  a.unshift([x, y])
  a.push([x + w, y])
  b.unshift([x + w, y])
  b.push([x + w, y + h])
  c.unshift([x + w, y + h])
  c.push([x, y + h])
  d.unshift([x, y + h])
  d.push([x, y])
  ctx.moveTo(x, y)
  curvePath(ctx, a, false, false)
  curvePath(ctx, b, false, false)
  curvePath(ctx, c, false, false)
  curvePath(ctx, d, false, false)
  ctx.closePath()
}
function crackPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ratio: number) {
  const n = 256
  const coords: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const th = 2 * Math.PI * (i + Math.random()) / n
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    const max = Math.max(Math.abs(cos), Math.abs(sin))
    coords.push([cx + cos * r / max, cy + sin * r / max])
  }
  ctx.moveTo(...coords[0])
  for (let i = 0; i < n; i++) {
    const [ax, ay] = coords[i]
    const [bx, by] = coords[i + 1]
    if (Math.random() < 0.05) {
      let dx = ay - by
      let dy = bx - ax
      let dr = Math.abs(dx) + Math.abs(dy)
      dx /= dr
      dy /= dr
      const l = r * ratio * Math.random() * Math.random()
      const l2 = l * (Math.random() - 0.5) / 2
      const x = (ax + bx) / 2 + dx * l - dy * l2
      const y = (ay + by) / 2 + dy * l + dx * l2
      const rnd = l / 4
      const a = 8 * Math.random()
      const b = 2 * Math.PI * Math.random()
      const lt = (t: number, ox: number, oy: number) => {
        const d = rnd * ((2 * Math.random() - 1) / 3 + Math.asin(Math.sin(a * t + b)) / a)
        ctx.lineTo(ox * (1 - t) + t * x + d * dy, oy * (1 - t) + t * y - d * dx)
      }
      for (let i = 0; i <= 8; i++) lt(i / 8, ax, ay)
      for (let i = 8; i >= 0; i--) lt(i / 8, bx, by)
    }
    ctx.lineTo(bx, by)
  }
  ctx.closePath()
}
function createTextures(color: string, n: number) {
  return [...new Array(n)].map(() => createTexture(color))
}
function createTexture(color: string) {
  const canvas = document.createElement('canvas')
  const size = 16
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  for (let i = 0; i < 64; i++) {
    const r = Math.random() * size / 3
    const r2 = (1 + Math.random()) * size / 12
    const th = 2 * Math.PI * Math.random()
    ctx.beginPath()
    ctx.arc(size / 2 + r * Math.cos(th), size / 2 + r * Math.sin(th), r2, 0, 2 * Math.PI)
    ctx.globalAlpha = 0.2 * Math.random()
    ctx.fill()
  }
  return canvas
}

function renderWarpMarker(ctx: CanvasRenderingContext2D, point: Point2D, time: number, phase: number) {
  ctx.save()
  ctx.translate(point.x, point.y)
  const amp = Math.sin(time) ** 16
  const size = Math.max(16 + 2 * amp, 16 + 16 * phase * phase * (4 - 3 * phase))
  ctx.beginPath()
  ctx.arc(0, 0, size + amp, 0, 2 * Math.PI)
  ctx.fillStyle = 'black'
  ctx.globalAlpha = 0.5 * amp * (1 - phase)
  ctx.fill()
  ctx.globalAlpha = 0.6 + 0.4 * Math.max(amp, phase)
  ctx.beginPath()
  ctx.arc(0, 0, size, 0, 2 * Math.PI)
  ctx.fillStyle = `rgb(${128 + phase * 127}, ${128},${240 - phase * 160})`
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    curvePath(ctx, [[size / 4, size / 8], [size / 2, size / 6], [size / 2, -size / 6], [size / 4, -size / 8]])
    ctx.stroke()
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()
}
