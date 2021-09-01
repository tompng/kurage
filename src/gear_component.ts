
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
  const buttons = document.querySelectorAll('.gear-type')
  buttons[0].innerHTML = ringsvg
  for (const n of [1, 2, 3]) {
    buttons[n].innerHTML = jellysvg
    buttons[n].querySelectorAll<SVGPathElement>('path')![n - 1].setAttribute('stroke', 'white')
  }

}