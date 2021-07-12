import { Ribbon, String3D } from './string'
import { normalize, cross } from './math'
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

const ribbons = strings.map(s => new Ribbon(s.numSegments))

function update(){
  const dt = 0.001
  strings.forEach((string, i) => {
    const point = string.points[0]
    const v = string.velocities[0]
    const vf = 10
    const targetx = mouse.x + Math.sin(i) * 0.02
    const targetz = mouse.y + Math.cos(i) * 0.02
    const t = performance.now() * (1 + Math.sin(i) % 0.1) / 1000
    const f = {
      x: (targetx - point.x) * 100 + Math.sin(0.5 * t) - vf * v.x,
      y: Math.sin(0.6 * t) - vf * v.y,
      z: (targetz - point.z) * 100 + Math.sin(0.7 * t) - vf * v.z
    }
    string.addHardnessForce(10, 10)
    string.addForce(10, 4)
    string.update(f, dt)
    ribbons[i].update(normalize(cross(string.directions[0], { x: 0, y: 1, z: 0 })), string.directions, 0.1)
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

  ctx.globalAlpha = 0.2
  strings.forEach((string, i) => {
    const ribbon = ribbons[i]
    ctx.beginPath()
    for (let i = 0; i <= string.numSegments; i++) {
      const t = (i + 1) / (string.numSegments + 2)
      const len = 0.01 * t * (1 - t) * 4
      const p = string.points[i]
      const n = ribbon.normals[i]
      ctx.moveTo(p.x, p.z)
      ctx.lineTo(p.x + len * n.x, p.z + len * n.z)
    }
    for (let i = 0; i <= string.numSegments; i++) {
      const t = (i + 1) / (string.numSegments + 2)
      const len = 0.01 * t * (1 - t) * 4
      const p = string.points[i]
      const n = ribbon.normals[i]
      const x = p.x + len * n.x
      const y = p.z + len * n.z
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  })

  const sum = strings.map(s => s.points[0]).reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }))
  ctx.font = '0.02px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = 1
  ctx.fillText('くらげ', sum.x / strings.length, sum.z / strings.length)
  ctx.restore()
}
function frame() {
  update()
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ strings })
