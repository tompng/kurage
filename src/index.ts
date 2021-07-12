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
  return string
})

function update(){
  const dt = 0.001
  strings.forEach((string, i) => {
    const point = string.points[0]
    const targetx = mouse.x + Math.sin(i) * 0.02
    const targetz = mouse.y + Math.cos(i) * 0.02
    const t = performance.now() * (1 + Math.sin(i) % 0.1) / 1000
    const f = {
      x: (targetx - point.x) * 100 + Math.sin(0.5 * t),
      y: Math.sin(0.6 * t),
      z: (targetz - point.z) * 100 + Math.sin(0.7 * t)
    }
    string.addForce(10, 10)
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
    const [startPoint, ...restPoints] = string.points
    ctx.beginPath()
    ctx.moveTo(startPoint.x, startPoint.z)
    restPoints.forEach(({ x, z }) => ctx.lineTo(x, z))
    ctx.stroke()
  })
  const sum = strings.map(s => s.points[0]).reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }))
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