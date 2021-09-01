
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
export function initialize() {
  const buttons = document.querySelectorAll<HTMLDivElement>('.gear-type')
  buttons[0].innerHTML = ringsvg
  let mode: number | null = null
  for (const n of [1, 2, 3]) {
    buttons[n].innerHTML = jellysvg
    buttons[n].querySelectorAll<SVGPathElement>('path')![n - 1].setAttribute('stroke', 'white')
  }
  const values = [
    [2],
    0,
    [0,1],
    2
  ]
  const views = document.querySelectorAll<HTMLDivElement>('.gear-select')
  function update() {
    if (mode == null) return
    const view = views[mode]
    const items = view.querySelectorAll<HTMLDivElement>('.gear-item')
    const value = values[mode]
    items.forEach(el => el.classList.remove('active'))
    if (typeof value === 'number') {
      items[value].classList.add('active')
    } else {
      for (const v of value) items[v].classList.add('active')
    }
  }
  views.forEach((view, mode) => {
    const items = view.querySelectorAll<HTMLDivElement>('.gear-item')
    items.forEach((item, i) => {
      item.onpointerdown = () => {
        const v = values[mode]
        if (typeof v === 'number') {
          console.log('update', mode, v, i)
          values[mode] = i
        } else if (v.includes(i)) {
          console.log('rm', mode, v, i)
          values[mode] = v.filter(v => v !== i)
        } else {
          console.log('add', mode, v, i)
          v.push(i)
        }
        update()
      }
    })
  })
  function changeMode(m: number | null) {
    mode = m
    buttons.forEach((el, i) => {
      const className = 'active'
      if (m === i) {
        el.classList.add(className)
      } else {
        el.classList.remove(className)
      }
    })
    views.forEach(el => { el.style.display = 'none' })
    if (typeof mode === 'number') views[mode].style.display = ''
    update()
  }
  buttons.forEach((el, i) => {
    el.onpointerdown = () => {
      changeMode(mode === i ? null : i)
    }
  })
  update()
}
