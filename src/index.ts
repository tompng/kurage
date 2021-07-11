import { String3D } from './string'
function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const canvas = document.createElement('canvas')
canvas.width = 1024
canvas.height = 1024
document.body.appendChild(canvas)
const mouse = { x: 0.5, y: 0.5 }
document.body.onmousemove = e => {
  mouse.x = (e.pageX - canvas.offsetLeft) / canvas.width
  mouse.y = (e.pageY - canvas.offsetTop) / canvas.height
}

const strings = [...new Array(10)].map(() => {
  const string = new String3D(100, 0.2 + 0.2 * Math.random())
  string.startPoint.x = 0.5
  string.startPoint.z = 0.5
  return string
})

function update(){
  const dt = 0.001
  strings.forEach((string, i) => {
    const point = string.startPoint
    const targetx = mouse.x + Math.sin(i) * 0.02
    const targetz = mouse.y + Math.cos(i) * 0.02
    const f = { x: (targetx - point.x) * 100, y: Math.sin(performance.now() / 1000), z: (targetz - point.z) * 100 }
    string.update(f, dt)
  })
}

function render() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.lineWidth = 0.001
  strings.forEach(string => {
    const [start, ...points] = string.getPoints()
    ctx.beginPath()
    ctx.moveTo(start.x, start.z)
    points.forEach(({ x, z }) => ctx.lineTo(x, z))
    ctx.stroke()
  })
  const sum = strings.map(s => s.startPoint).reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }))
  ctx.font = '0.02px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('くらげ', sum.x / strings.length, sum.z / strings.length)

  ctx.restore()
}
function frame() {
  update()
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)


assignGlobal({
  strings
})