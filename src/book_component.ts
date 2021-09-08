import * as THREE from 'three'
import { curvePath } from "./curve_path" 
import { Aquarium, Fishes, Shrimps } from "./aquarium"

type SingleRendererManager = {
  renderer: THREE.WebGLRenderer
  use(): HTMLCanvasElement
  release(): void
}

export const aquariumSetups: [number, ((aquarium: Aquarium, radius: number) => void)][] = [
  [3, (aq, r) => aq.objects.push(new Fishes(r))],
  [3, (aq, r) => aq.objects.push(new Shrimps(r))]
]
export class BookComponent {
  dom: HTMLDivElement
  mode: number | null = null
  canvas: HTMLCanvasElement
  aquarium: Aquarium
  target = {
    index: null as number | null,
    phase: 0,
    dir: -1 as -1 | 1,
    fadeCanvas: null as HTMLCanvasElement | null
  }
  constructor(public rendererManager: SingleRendererManager) {
    this.dom = document.querySelector<HTMLDivElement>('#book')!
    this.canvas = this.dom.querySelector<HTMLCanvasElement>('canvas')!
    this.dom.remove()
    const buttons = this.dom.querySelectorAll<HTMLDivElement>('.book-item')
    buttons.forEach((button, index) => {
      button.onpointerdown = () => {
        if (this.target.index === index) this.closeTarget()
        else this.openTarget(index)
      }
    })
    const aquariumDOM = document.createElement('div')
    aquariumDOM.className = 'aquarium'
    this.aquarium = new Aquarium(aquariumDOM)
  }
  openTarget(index: number) {
    const { target } = this
    if (target.phase !== 0 || target.index != null) return
    target.dir = 1
    target.index = index
    if (aquariumSetups[index]) {
      const [r, f] = aquariumSetups[index]
      this.aquarium.radius = r
      f(this.aquarium, r)
    }
    target.phase = 0.001
    if (target.fadeCanvas) return
    target.fadeCanvas = document.createElement('canvas')
    target.fadeCanvas.className = 'fade'
    this.dom.appendChild(target.fadeCanvas)
    const rendererDOM = this.rendererManager.use()
    this.dom.appendChild(this.aquarium.dom)
    this.aquarium.dom.appendChild(rendererDOM)
    this.aquarium.dom.style.opacity = '0'
  }
  closeTarget() {
    this.target.dir = -1
  }
  onClose(closeComponent: () => void) {
    if (this.target.phase === 0) closeComponent()
    else this.closeTarget()
  }
  backgroundStartTime = 0
  backgroundTimer: number | null = null
  renderWaveToCanvas(canvas: HTMLCanvasElement, waves: { height: number, seed: number, color: string }[], wsize: number, background?: { color: string, opacity: number }) {
    const { dom } = this
    const canvasWidth = dom.offsetWidth * window.devicePixelRatio
    const canvasHeight = dom.offsetHeight * window.devicePixelRatio
    const time = performance.now() / 1000
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    if (background) {
      ctx.globalAlpha = background.opacity
      ctx.fillStyle = background.color
      ctx.fillRect(0, 0, canvasWidth, canvasHeight * (waves[0].height + wsize))
      ctx.globalAlpha = 1
    }
    waves.forEach(({ height, color, seed }, n) => {
      const points: [number, number][] = []
      const a = Math.cos(seed * 1234 + 1) * 1024 % 1
      const b = Math.cos(seed * 2345 + 2) * 1024 % 1
      const c = Math.cos(seed * 3456 + 3) * 1024 % 1
      const d = Math.cos(seed * 4567 + 4) * 1024 % 1
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        const x = t * canvasWidth / canvasHeight
        const y = (
          Math.sin((5 + a / 2) * x + (1 + b / 2) * time + seed) +
          Math.sin((6 + b / 2) * x - (1 + c / 2) * time + 2 * seed) +
          Math.cos((7 + c / 2) * x - (1 + d / 2) * time + 3 * seed) +
          Math.cos((8 + d / 2) * x + (1 + a / 2) * time + 4 * seed)
        ) / 5
        points.push([canvasWidth * t, canvasHeight * (height + wsize * y)])
      }
      ctx.fillStyle = color
      ctx.beginPath()
      curvePath(ctx, points)
      const h2 = n + 1 < waves.length ? waves[n + 1].height : null
      const y2 = canvasHeight * (h2 == null ? 1 : h2 + wsize)
      ctx.lineTo(canvasWidth, y2)
      ctx.lineTo(0, y2)
      ctx.fill()
    })
  }
  renderBackground() {
    const { backgroundStartTime } = this
    const time = Math.max(0, (performance.now() - backgroundStartTime) / 1000)
    const phase = 1 - Math.exp(-4 * time) * (1 - 4 * time)
    const wsize = 1 / 8
    this.renderWaveToCanvas(
      this.canvas,
      [
        { color: '#303080', seed: 1, height: 1 + wsize - (wsize + 0.7) * phase },
        { color: '#282878', seed: 2, height: 1 + wsize - (wsize + 0.65) * phase },
        { color: '#202070', seed: 3, height: 1 + wsize - (wsize + 0.6) * phase },
        { color: '#181868', seed: 4, height: 1 + wsize - (wsize + 0.55) * phase },
        { color: '#101060', seed: 5, height: 1 + wsize - (wsize + 0.5) * phase }
      ],
      wsize,
      { color: '#383888', opacity: phase }
    )
  }
  renderFadeCanvas() {
    const { phase, fadeCanvas } = this.target
    if (!fadeCanvas) return
    const wsize = 1 / 8
    this.renderWaveToCanvas(
      fadeCanvas,
      [
        { color: 'black', seed: 8, height: 1 + wsize - (1 + 2 * wsize) * phase }
      ],
      1 / 8
    )
  }
  render() {
    const { dom, target, aquarium } = this
    if (target.phase < 1) this.renderBackground()
    if (target.phase === 0) return
    this.renderFadeCanvas()
    const renderer = this.rendererManager.renderer
    this.aquarium.dom.style.opacity = String(target.phase)
    const width = dom.offsetWidth
    const height = dom.offsetHeight
    const ratio = window.devicePixelRatio
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height)
    aquarium.renderToOffScreen(renderer, ratio * Math.min(width, height))
    aquarium.renderToScreen(renderer)
  }
  start() {
    this.backgroundStartTime = performance.now()
    this.animate()
    this.render()
  }
  lastUpdate = 0
  update() {
    const { target } = this
    const time = performance.now()
    const dt = (time - this.lastUpdate) / 1000
    this.lastUpdate = time
    if (target.dir === -1 && target.phase === 0) return
    this.aquarium.update(Math.min(0.02, dt))
    if (target.dir === 1 && target.phase === 1) return
    target.phase += 4 * target.dir * dt
    if (target.phase >= 1) {
      target.phase = 1
    } else if (target.phase <= 0) {
      this.cleanupAquarium()
    }
  }
  animate() {
    if (this.backgroundTimer) return
    this.backgroundTimer = requestAnimationFrame(() => {
      this.backgroundTimer = null
      this.update()
      this.render()
      this.animate()
    })
  }
  end() {
    if (!this.backgroundTimer) return
    cancelAnimationFrame(this.backgroundTimer)
    this.backgroundTimer = null
    this.canvas.width = this.canvas.height = 0
    this.cleanupAquarium()
  }
  cleanupAquarium() {
    this.aquarium.clear()
    this.aquarium.compactAllocation()
    this.rendererManager.release()
    this.aquarium.dom.remove()
    this.target.index = null
    this.target.phase = 0
    this.target.dir = -1
    if (this.target.fadeCanvas) {
      this.target.fadeCanvas.remove()
      this.target.fadeCanvas.width = this.target.fadeCanvas.height = 0
      this.target.fadeCanvas = null
    }
  }
}
