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
export function test() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(40, 40)
  ctx.translate(1, 1)
  ctx.lineWidth = 0.1
  ctx.lineCap = ctx.lineJoin = 'round'
  ctx.strokeStyle = 'white'
  ctx.beginPath()
  tshirtPath(ctx)
  ctx.stroke()
  ctx.translate(2, 0)
  ctx.beginPath()
  bookPath(ctx)
  ctx.stroke()
  ctx.translate(2, 0)
  ctx.beginPath()
  mapPath(ctx)
  ctx.stroke()
}

export const jellySvg = `
<svg width=64 height=64 style='position:fixed;z-index:9999'>
  <path
    d="M14,32 C10,10 54,10 50,32 M23,32 Q23,43 18,53 M29,32 Q29,43 27,54 M35,32 Q35,43 37,54 M41,32 Q41,43 46,53"
    stroke-linecap="round" stroke-width="4" stroke="#eee" fill="none"
  />
</svg>`

export const shellSvg = `
<svg width=64 height=64>
  <path
    d="M34,46 C40,64 -4,42 14,36 C-6,-24 94,24 34,46z M30,39 L40,24 M22,35 L28,18"
    stroke-linejoin="round"
    stroke-linecap="round" stroke-width="4" stroke="#eee" fill="none"
  />
</svg>`
