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


const jelly = new Jelly(20, {
  size: 1,
  theta1: 0.3,
  theta2: 0.8
}, {
  radial: 10,
  arc: 10
})

jelly.assignStrings(
  strings, ribbons, shortStrings, []
)

function update(){
  const dt = 0.005
  jelly.pullTo({ x: mouse.x, y: Math.sin(performance.now() / 5000) * 0.02, z: mouse.y }, 0.01)
  jelly.update(dt, (1 - Math.cos(performance.now() / 1000)) / 4)
}

function render() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.lineWidth = 0.002
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
