import { curvePath } from './curve_path'

function jellyPath(ctx: CanvasRenderingContext2D) {
  curvePath(ctx, [[-0.5, 0], [-0.6, -0.15], [-0.35, -0.5], [0.35, -0.5], [0.6, -0.15], [0.5, -0]])
  curvePath(ctx, [[-0.25, 0], [-0.25, 0.3], [-0.35, 0.6]])
  curvePath(ctx, [[0, 0], [0.0, 0.4], [-0.05, 0.65]])
  curvePath(ctx, [[0.25, 0], [0.25, 0.3], [0.3, 0.6]])
}
function tshirtPath(ctx: CanvasRenderingContext2D) {
  curvePath(ctx, [[-0.4, -0.75], [-0.2, -0.65], [0.2, -0.65], [0.4, -0.75]])
  const points: [number, number][] = [
    [0.9, -0.55],
    [0.75, -0.05],
    [0.5, -0.1],
    [0.5, 0.75],
    [-0.5, 0.75],
    [-0.5, -0.1],
    [-0.75, -0.05],
    [-0.9, -0.55]
  ]
  points.forEach(p => ctx.lineTo(...p))
  ctx.closePath()
  ctx.save()
  ctx.scale(0.5, 0.5)
  ctx.translate(0, -0.2)
  jellyPath(ctx)
  ctx.restore()
}
function bookPath(ctx: CanvasRenderingContext2D) {
  const w = 0.5, h = 0.7
  const d = 0.1
  ctx.rect(-w - d, -h - d, 2 * w, 2 * h)
  ctx.moveTo(-w - d, h - d)
  ctx.bezierCurveTo(-w - d, h, -w, h + d, -w + d, h + d)
  ctx.moveTo(-w + d, h + d)
  ctx.lineTo(w + d, h + d)
  ctx.lineTo(w + d, -h + d)
  ctx.lineTo(w + d / 2, -h + d)
  ctx.save()
  ctx.scale(0.5, 0.5)
  ctx.translate(-0.2, -0.2)
  jellyPath(ctx)
  ctx.restore()
}
function mapPath(ctx: CanvasRenderingContext2D) {
  curvePath(ctx, [
    [-0.2, -0.5],
    [-0.22, -0.65],
    [-0.1, -0.8],
    [0.1, -0.8],
    [0.22, -0.65],
    [0.2, -0.5]
  ])
  ctx.moveTo(0, -0.6)
  ctx.arc(0, -0.6, 0.04, 0, 2 * Math.PI)
  ctx.moveTo(-0.2, -0.5)
  ctx.lineTo(0, 0.2)
  ctx.lineTo(0.2, -0.5)
  ctx.moveTo(-0.33, -0.27)
  ctx.lineTo(-0.9, 0.3)
  ctx.lineTo(0.2, 0.8)
  ctx.lineTo(0.9, 0.1)
  ctx.lineTo(0.3, -0.16)
  curvePath(ctx, [
    [0.2, 0.1],
    [0.3+0.2/8, 0.14-0.5/8],
    [0.4-0.2/8, 0.18+0.5/8],
    [0.5, 0.22],
  ])
  curvePath(ctx, [
    [-0.26, -0.12],
    [-0.25, -0.05],
    [-0.22, -0.05],
  ])
}

function crossPath(ctx: CanvasRenderingContext2D) {
  const s = 0.7
  ctx.moveTo(-s, -s)
  ctx.lineTo(s, s)
  ctx.moveTo(-s, s)
  ctx.lineTo(s, -s)
}

const icons = {
  map: mapPath,
  gear: tshirtPath,
  book: bookPath,
  close: crossPath
}

function prepareCanvasContext(canvas: HTMLCanvasElement) {
  const ratio = window.devicePixelRatio
  const pixelSize = canvas.offsetWidth * ratio
  canvas.width = canvas.height = pixelSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.lineCap = ctx.lineJoin = 'round'
  ctx.scale(pixelSize / 2, pixelSize / 2)
  ctx.translate(1, 1)
  return ctx
}
export class CanvasIcon {
  canvas: HTMLCanvasElement
  renderPath: (ctx: CanvasRenderingContext2D) => void
  constructor(icon: ((ctx: CanvasRenderingContext2D) => void) | keyof typeof icons) {
    this.canvas = document.createElement('canvas')
    this.renderPath = typeof icon === 'function' ? icon : icons[icon]
  }
  render() {
    const ctx = prepareCanvasContext(this.canvas)
    if (!ctx) return
    ctx.lineWidth = 1 / 8
    this.renderPath(ctx)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.restore()
  }
}

export class CloseMenuIcon {
  canvas = document.createElement('canvas')
  phase = 0 // 0: jelly, 1: close
  onClick: (() => void) | null = null
  constructor() {
    this.canvas.onpointerdown = e => {
      if (this.phase < 0.5) return
      e.stopPropagation()
      this.onClick?.()
    }
  }
  render() {
    if (this.phase === 1) {
      this.canvas.setAttribute('data-clickable', 'true')
    } else {
      this.canvas.removeAttribute('data-clickable')
    }
    const ctx = prepareCanvasContext(this.canvas)
    if (!ctx) return
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 0.08
    const { phase } = this
    const t = phase * phase * (3 - 2 * phase)
    const jellyPoints: [number, number][] = []
    for (let i = 0; i < 16; i++) {
      const th = 2 * Math.PI * i / 16
      const x = Math.cos(th)
      let y = Math.sin(th) * (1 + 2 * t) / 3
      if (y < 0) y -= Math.cos(6 * x) * (1 - x ** 8) ** 2 / 16 * (1 - t)
      y -= (1 - t) * (x ** 2 + x ** 4) / 8
      const rot = -Math.PI / 4 + t * Math.PI / 4
      const x0 = (1 - t) * 0.4
      const y0 = (1 - t) * 0.4
      const size = 0.6 * t + (1 - t) * 0.7
      const rcos = Math.cos(rot)
      const rsin = Math.sin(rot)
      const rndx = Math.sin(5 * th + 7 * t) - Math.sin(4 * th - 8 * t)
      const rndy = Math.sin(4 * th + 6 * t) - Math.sin(5 * th - 7 * t)
      const tx = x0 + size * (x * rcos - y * rsin)
      const ty = y0 + size * (x * rsin + y * rcos)
      const u = t * (1 - t) / 8
      jellyPoints.push([tx * (1 - u) + u * rndx, ty * (1 - u) + u * rndy])
    }
    ctx.globalAlpha = 0.5 + 0.5 * t
    ctx.beginPath()
    curvePath(ctx, jellyPoints, true)
    if (t > 0.5) {
      ctx.save()
      ctx.globalAlpha *= t - 0.5
      ctx.fillStyle = 'gray'
      ctx.fill()
      ctx.restore()
    }
    ctx.stroke()
    ctx.beginPath()
    function stringPath(ctx: CanvasRenderingContext2D, dir: number) {
      const points: [number, number][] = []
      for (let i = 0; i <= 5; i++) {
        const s = i / 5
        const s2 = 0.3 * (2 * s - 1)
        const x2 = s2
        const y2 = s2 * dir
        const a = 0.2 + 0.2 * s * s + 0.1 * s
        const x1 = 0.1 - s * 0.5 + dir * a - (1 - dir * dir) * (s + 0.2) / 8
        const y1 = 0.1 - s * 0.5 - dir * a - (1 - dir * dir) * (s + 0.2) / 8
        const u = t * (1 - t) / 4
        const rndx = Math.sin((7 + dir / 2) * s + 7 * t + dir) - Math.sin(8 * s - 8 * t + dir)
        const rndy = Math.cos(9 * s + 6 * t + dir) - Math.cos((7 + dir / 2) * s - 7 * t + dir)
        points.push([x1 * (1 - t) + x2 * t + rndx * u, y1 * (1 - t) + y2 * t + rndy * u])
      }
      curvePath(ctx, points)
    }
    stringPath(ctx, -1)
    stringPath(ctx, 1)
    ctx.stroke()
    ctx.beginPath()
    if (t < 0.5) {
      ctx.globalAlpha *= 1 - 2 * t
      const points: [number, number][] = []
      stringPath(ctx, 0)
      ctx.stroke()
    }
    ctx.restore()
  }
  timer: number | null = null
  dir: 1 | -1 = 1
  activate() {
    this.dir = 1
    this.animate()
  }
  deactivate() {
    this.dir = -1
    this.animate()
  }
  reset() {
    this.dir = -1
    this.phase = 0
  }
  prevTime = 0
  onUpdate: ((phase: number, dir: -1 | 1) => void) | null = null
  animate() {
    if (this.timer) return
    if (this.dir === 1 && this.phase === 1) return
    if (this.dir === -1 && this.phase === 0) return
    this.prevTime = performance.now()
    this.timer = requestAnimationFrame(() => {
      this.timer = null
      const time = performance.now()
      const dt = (time - this.prevTime) / 500
      this.prevTime = time
      this.phase = Math.min(Math.max(0, this.phase + this.dir * dt), 1)
      this.render()
      this.onUpdate?.(this.phase, this.dir)
      this.animate()
    })
  }
}

export const shellSvg = `
<svg width=64 height=64>
  <path
    d="M34,46 C40,64 -4,42 14,36 C-6,-24 94,24 34,46z M30,39 L40,24 M22,35 L28,18"
    stroke-linejoin="round"
    stroke-linecap="round" stroke-width="4" stroke="#eee" fill="none"
  />
</svg>`
