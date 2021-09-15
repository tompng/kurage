import { curvePath } from "./curve_path" 
import { terrainCoords } from './terrain'




export class MapComponent {
  dom: HTMLDivElement
  mode: number | null = null
  canvas: HTMLCanvasElement
  map = generateFullMap()
  target = {
    index: null as number | null,
    phase: 0,
    dir: -1 as -1 | 1,
    fadeCanvas: null as HTMLCanvasElement | null
  }
  constructor() {
    this.dom = document.querySelector<HTMLDivElement>('#map')!
    this.canvas = this.dom.querySelector<HTMLCanvasElement>('canvas')!
    this.dom.remove()
  }
  render() {
    const { canvas } = this
    const size = canvas.offsetWidth
    if (canvas.width != size || canvas.height != size) canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.scale(size / 1024, size / 1024)
    for (const line of terrainCoords) {
      const first = line[0]
      const last = line[line.length - 1]
      ctx.beginPath()
      if (first[0] === last[0] && first[1] === last[1]) {
        curvePath(ctx, line.slice(1), true)
      } else {
        curvePath(ctx, line)
      }
      ctx.lineWidth = 4
      // ctx.stroke()
    }
    ctx.drawImage(this.map, 0, 0, 1024, 1024)
    ctx.restore()
  }
  start() {
    this.render()
  }
  update() {
  }
  end() {
  }
}

function generateFullMap() {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const textures = createTextures('#112', 4)
  const wtextures = createTextures('#336', 4)
  ctx.fillStyle = '#909098'
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.scale(size / 1024, size / 1024)
  ctx.scale(0.94, 0.94)
  ctx.translate(1024 * 0.03, 1024 * 0.06)
  const wline: [number, number][] = []
  for (let i = 0; i < 100; i++) {
    const t = -16 + (1024 + 16) * i / 100
    wline.push([t, 4 * Math.abs(Math.sin(i * 0.7))])
  }
  ctx.save()
  ctx.beginPath()
  curvePath(ctx, wline)
  ctx.lineTo(1024 + 16, 80)
  ctx.lineTo(-16, 80)
  ctx.clip()
  for (const [x, y] of wline) {
    const rndx = 8 * Math.random() - 4
    const rndy = 8 * Math.random() - 4
    ctx.globalAlpha = 0.5 + Math.random() * 0.5
    const texture = wtextures[Math.floor(wtextures.length * Math.random())]
    const r = 16 + 8 * Math.random()
    ctx.drawImage(texture, x - r + rndx, y - r + rndy, 2 * r, 2 * r)
  }
  ctx.restore()

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
      const offset = 30
      ctx.lineTo(1024 + offset, -offset)
      ctx.lineTo(1024 + offset, 1024 + offset)
      ctx.lineTo(-offset, 1024 + offset)
      ctx.lineTo(-offset, -offset)
    }
    ctx.clip()
    ctx.fillStyle = '#80828a'
    ctx.fill()
    for (const [x, y] of points) {
      const rndx = 8 * Math.random() - 4
      const rndy = 8 * Math.random() - 4
      ctx.globalAlpha = 0.5 + Math.random() * 0.5
      const texture = textures[Math.floor(textures.length * Math.random())]
      const r = 16 + 8 * Math.random()
      ctx.drawImage(texture, x - r + rndx, y - r + rndy, 2 * r, 2 * r)
    }
    ctx.restore()
  }
  return canvas
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
