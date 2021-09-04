import { curvePath } from "./curve_path" 

export class BookComponent {
  dom: HTMLDivElement
  mode: number | null = null
  canvas: HTMLCanvasElement
  constructor() {
    this.dom = document.querySelector<HTMLDivElement>('#book')!
    this.canvas = this.dom.querySelector<HTMLCanvasElement>('canvas')!
    this.dom.remove()
  }
  startTime = 0
  timer: number | null = null
  render() {
    const { dom, canvas, startTime } = this
    const width = dom.offsetWidth * window.devicePixelRatio
    const height = dom.offsetHeight * window.devicePixelRatio
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    const time = Math.max(0, (performance.now() - startTime) / 1000)
    const phase = 1 - Math.exp(-4 * time) * (1 - 4 * time)
    const wsize = height / 8
    const heights = [
      height + wsize - (wsize + height * 0.7) * phase,
      height + wsize - (wsize + height * 0.65) * phase,
      height + wsize - (wsize + height * 0.6) * phase,
      height + wsize - (wsize + height * 0.55) * phase,
      height + wsize - (wsize + height * 0.5) * phase
    ]
    const colors = [
      '#303080',
      '#282878',
      '#202070',
      '#181868',
      '#101060',
    ]
    ctx.globalAlpha = phase
    ctx.fillStyle = '#383888'
    ctx.fillRect(0, 0, width, heights[0] + wsize)
    ctx.globalAlpha = 1
    heights.forEach((h, n) => {
      const points: [number, number][] = []
      const a = Math.cos(n * 1234 + 1) * 1024 % 1
      const b = Math.cos(n * 2345 + 2) * 1024 % 1
      const c = Math.cos(n * 3456 + 3) * 1024 % 1
      const d = Math.cos(n * 4567 + 4) * 1024 % 1
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        const x = t * width / height
        const y = (
          Math.sin((5 + a / 2) * x + (1 + b / 2) * time + startTime + n) +
          Math.sin((6 + b / 2) * x - (1 + c / 2) * time + startTime + 2 * n) +
          Math.cos((7 + c / 2) * x - (1 + d / 2) * time + startTime + 3 * n) +
          Math.cos((8 + d / 2) * x + (1 + a / 2) * time + startTime + 4 * n)
        ) / 5
        points.push([width * t, h + wsize * y])
      }
      ctx.fillStyle = colors[n]
      ctx.beginPath()
      curvePath(ctx, points)
      const h2 = n + 1 < heights.length ? heights[n + 1] : null
      const y2 = h2 == null ? height : h2 + wsize
      ctx.lineTo(width, y2)
      ctx.lineTo(0, y2)
      ctx.fill()
    })
  }
  start() {
    this.startTime = performance.now()
    this.animate()
    this.render()
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
    this.canvas.width = this.canvas.height = 0
  }
}