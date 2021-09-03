const ringsvg = `
<svg width=64 height=64 viewBox="0 0 64 64">
<g stroke-linecap="round" stroke-linejoin="round" stroke-width="4" stroke="gray" fill="none">
  <path d="M32,10 Q30,20 20,22 Q30,24 32,34 Q34,24 44,22 Q34,20 32,10" stroke="white"></path>
  <path d="M24,30 A12,12,0,1,0,40,30"></path>
</g>
</svg>
`

const jellysvg = `
<svg viewBox="0 0 64 64" style=>
  <g stroke-linecap="round" stroke-linejoin="round" stroke-width="4" stroke="gray" fill="none">
    <path d="M14,26 C10,4 54,4 50,26"></path>
    <path d="M20,27 Q20,30 18,34 M26,27 Q26,30 25,35 M32,27 L32,35 M38,27 Q38,30 39,35 M44,27 Q44,30 46,34"></path>
    <path d="M27,39 Q27,42 24,50 T27,56 33,44 M37,39 Q37,42 40,48 T40,56 35,54"></path>
  </g>
</svg>
`

export type GearValue = [number[], number, number[], number]
export class GearComponent {
  dom: HTMLDivElement
  mode: number | null = null
  views: NodeListOf<HTMLDivElement>
  buttons: NodeListOf<HTMLDivElement>
  constructor (public values: GearValue, public onChange: (values: GearValue) => void) {
    this.dom = document.querySelector<HTMLDivElement>('#gear')!
    this.dom.remove()
    this.buttons = this.dom.querySelectorAll<HTMLDivElement>('.gear-type')
    this.buttons[0].innerHTML = ringsvg
    for (const n of [1, 2, 3]) {
      this.buttons[n].innerHTML = jellysvg
      this.buttons[n].querySelectorAll<SVGPathElement>('path')![n - 1].setAttribute('stroke', 'white')
    }
    const fullSquare = this.dom.querySelector<HTMLDivElement>('.full-square')
    this.dom.onpointerdown = e => {
      if (e.target === this.dom || e.target === fullSquare) this.changeMode(null)
    }
    this.views = this.dom.querySelectorAll<HTMLDivElement>('.gear-select')
    this.views.forEach((view, mode) => {
      const items = view.querySelectorAll<HTMLDivElement>('.gear-item')
      items.forEach((item, i) => {
        item.onpointerdown = () => {
          const v = this.values[mode]
          this.values = [...this.values]
          if (typeof v === 'number') {
            this.values[mode] = i
          } else if (v.includes(i)) {
            this.values[mode] = v.filter(v => v !== i)
          } else {
            this.values[mode] = [...v, i]
          }
          this.update()
          onChange(this.values)
        }
      })
    })
    this.buttons.forEach((el, i) => {
      el.onpointerdown = () => {
        this.changeMode(this.mode === i ? null : i)
      }
    })
    this.update()
  }
  update() {
    if (this.mode == null) return
    const view = this.views[this.mode]
    const items = view.querySelectorAll<HTMLDivElement>('.gear-item')
    const value = this.values[this.mode]
    items.forEach(el => el.classList.remove('active'))
    if (typeof value === 'number') {
      items[value].classList.add('active')
    } else {
      for (const v of value) items[v].classList.add('active')
    }
  }
  start() {
    this.changeMode(null)
  }
  changeMode(m: number | null) {
    this.mode = m
    this.buttons.forEach((el, i) => {
      const className = 'active'
      if (m === i) {
        el.classList.add(className)
      } else {
        el.classList.remove(className)
      }
    })
    this.views.forEach(el => { el.style.display = 'none' })
    if (this.mode != null) this.views[this.mode].style.display = ''
    this.update()
  }
}
