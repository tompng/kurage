export type Component = {
  dom: HTMLDivElement
  start?: () => void
  end?: () => void
}
export class ComponentSwitcher {
  component: Component | null = null
  timer: number | null = null
  dir = -1
  phase = 0
  prevTime = 0
  speed = 1
  menuFade = document.createElement('div')
  constructor(public mainDiv: HTMLDivElement) {
    this.menuFade.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
    `
    this.menuFade.onpointerdown = e => {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  animate() {
    if (this.timer) return
    if (this.dir === 1 && this.phase === 1) return
    if (this.dir === -1 && this.phase === 0) return
    this.prevTime = performance.now()
    this.timer = requestAnimationFrame(() => {
      this.timer = null
      const time = performance.now()
      const dt = (time - this.prevTime) / 1000
      this.prevTime = time
      this.phase = Math.min(Math.max(0, this.phase + this.dir * dt * this.speed), 1)
      this.render()
      this.animate()
    })
  }
  render() {
    if (this.dir === 1) {
      if (this.phase > 0.5) {
        this.menuFade.remove()
      } else if (!this.menuFade.parentNode) {
        this.mainDiv.appendChild(this.menuFade)
      }
    }
    if (this.dir === -1) {
      if (this.phase === 0) {
        this.menuFade.remove()
        this.component?.dom.remove()
        this.component?.end?.()
        this.component = null
      } else if (!this.menuFade.parentNode) {
        this.mainDiv.appendChild(this.menuFade)
      }
    }
    if (this.component) {
      this.component.dom.style.opacity = String(this.phase)
    }
  }
  show(component: Component, time = 0.25) {
    this.speed = 1 / time
    this.mainDiv.appendChild(component.dom)
    component.start?.()
    this.component = component
    this.dir = 1
    this.animate()
  }
  hide(time = 0.25) {
    this.speed = 1 / time
    this.dir = -1
    this.animate()
  }
}
