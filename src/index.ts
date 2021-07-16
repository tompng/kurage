import { Ribbon, String3D } from './string'
import { normalize, cross } from './math'
import { Jelly } from './jelly'
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

const strings = [...new Array(4)].map(() => new String3D(100, 0.2 + 0.02 * Math.random(), 1, 1))

const shortStrings = [...new Array(10)].map(() => new String3D(20, 0.1 + 0.01 * Math.random(), 1, 1))

const ribbons = strings.map(s => new Ribbon(s.numSegments))


const jelly = new Jelly(4, 20, {
  size: 0.1,
  theta1: 0.3,
  theta2: 0.8,
  innerDistance: 0.03,
  innerRadius: 0.02
}, {
  core: 200,
  radial: 10,
  arc: 10
})
jelly.points.forEach(({ p }) => {
  p.x += 0.5
  p.z += 0.5
})

jelly.assignStrings(
  strings, ribbons, shortStrings, []
)

function update(){
  const dt = 0.001
  jelly.points.forEach(point => {
    const dx = mouse.x - point.p.x
    const dz = mouse.y - point.p.z
    const f = point === jelly.topPoint ? 1000 : 0
    point.f.x = f * dx// - point.v.x / 10
    // point.f.y = -point.v.y / 10
    point.f.z = f * dz// - point.v.z / 10
  })

  jelly.pullTo({ x: mouse.x, y: 0, z: mouse.y }, 0.01)

  jelly.update(dt, (1 - Math.cos(performance.now() / 1000)) / 2)
}


function render() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.lineWidth = 0.001
  jelly.renderToCanvas(ctx)

  ctx.restore()
}
function frame() {
  update()
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

assignGlobal({ strings, jelly })
