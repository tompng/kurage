import { ComponentSwitcher } from './component_switcher'
import { CanvasIcon, CloseMenuIcon } from './icon'

const defaultComponent = document.createElement('div')
defaultComponent.textContent = 'to be continued'
defaultComponent.style.cssText = `
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  font-size: 8vmin;
  color: white;
  background: rgba(180, 100, 100, 0.8);
`

type MenuType = 'book' | 'gear' | 'map'
export class Menu {
  switcher: ComponentSwitcher
  type: MenuType | null = null
  component: any = null
  dir: 1 | -1 = -1
  phase = 0
  components: Record<MenuType, HTMLDivElement | null> = { book: null, gear: null, map: null}
  buttons: Record<MenuType, { icon: CanvasIcon, div: HTMLDivElement }>
  closeMenu = new CloseMenuIcon()
  constructor(public mainDiv: HTMLDivElement) {
    this.switcher = new ComponentSwitcher(mainDiv)
    this.closeMenu.canvas.className = 'closemenu'
    mainDiv.appendChild(this.closeMenu.canvas)
    this.closeMenu.render()
    this.closeMenu.onClick = () => this.close()
    const prepareIcon = (type: MenuType) => {
      const icon = new CanvasIcon(type)
      const div = document.createElement('div')
      mainDiv.appendChild(div)
      div.appendChild(icon.canvas)
      div.className = 'button ' + type
      icon.render()
      div.onpointerdown = e => {
        e.stopPropagation()
        this.open(type)
      }
      return { icon, div }
    }
    this.buttons = {
      gear: prepareIcon('gear'),
      map: prepareIcon('map'),
      book: prepareIcon('book')
    }
    this.closeMenu.onUpdate = (phase, dir) => {
      if (this.type && dir === 1) this.buttons[this.type].div.style.opacity = String(Math.max(1 - phase, 0))
    }
  }
  onOpen?: (type: MenuType) => void
  onClose?: () => void
  open(type: MenuType) {
    this.type = type
    this.onOpen?.(type)
    defaultComponent.innerHTML = `${type}<br>←to be continued`
    const component = this.components[type] || defaultComponent
    for (const [key, button] of Object.entries(this.buttons)) {
      button.div.style.opacity = key === type ? '1' : '0'
    }
    this.closeMenu.activate()
    this.switcher.show(component)
  }
  close() {
    this.type = null
    this.closeMenu.deactivate()
    this.switcher.hide()
    for (const { div } of Object.values(this.buttons)) div.style.opacity = ''
    this.onClose?.()
  }
  reRender() {
    for (const { icon } of Object.values(this.buttons)) icon.render()
    this.closeMenu.render()
  }
}