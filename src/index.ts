function assignGlobal(data: Record<string, any>) {
  for (const i in data) (window as any)[i] = data[i]
}
const canvas = document.createElement('canvas')
canvas.width = 1024
canvas.height = 1024
document.body.appendChild(canvas)
const N = 100
const L = 1 / N / 2
type Point = { x: number; y: number }
const directions: Point[] = []
const velocities: Point[] = []
for (let i = 0; i < N; i++) {
  directions.push({ x: 1, y: 0 })
}
for (let i = 0; i <= N; i++) {
  velocities.push({ x: 0, y: 0 })
}
const point = { x: 0.5, y: 0.5 }
const mouse = { x: 0.5, y: 0.5 }
function getPoints() {
  let x = point.x
  let y = point.y
  const points = [{ x, y }]
  directions.forEach((p) => {
    x += L * p.x
    y += L * p.y
    points.push({ x, y })
  })
  return points
}
document.body.onmousemove = e => {
  mouse.x = (e.pageX - canvas.offsetLeft) / canvas.width
  mouse.y = (e.pageY - canvas.offsetTop) / canvas.height
}
function cross(a: Point, b: Point) {
  return a.x * b.y - a.y * b.x
}
function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y
}
function solveMatrix3(prev: number[], center: number[], next: number[], v: number[]) {
  const len = center.length
  for (let i = 0; i < len - 1; i++) {
    const x = prev[i + 1] / center[i]
    center[i + 1] -= x * next[i]
    v[i + 1] -= x * v[i]
  }
  for (let i = len - 2; i >= 0; i--) {
    const x = next[i] / center[i + 1]
    v[i] -= x * v[i + 1]
  }
  for (let i = 0; i < len; i++) {
    v[i] /= center[i]
  }
}

function update(){
  const dt = 0.001
  const dx = mouse.x - point.x
  const dy = mouse.y - point.y
  const x2 = point.x + 0.1 * dx
  const y2 = point.y + 0.1 * dy
  const points = getPoints()
  const F: Point[] = velocities.map(v => ({ x: -v.x / 2, y: -v.y / 2 + 1 / N }))
  const ta: number[] = []
  const tt: number[] = []
  const tb: number[] = []
  const T: number[] = []
  F[0].x += (mouse.x - point.x) * N * 100
  F[0].y += (mouse.y - point.y) * N * 100
  for (let i = 0; i < N; i++) {
    // vnext[i] = v[i] + dt * (F[i] + T[i - 1] * dir[i - 1] - T[i]*dir[i])
    // constraints: dot(vnext[i + 1] - vnext[i], dir[i]) = 0
    const dir = directions[i]
    const vfdot1 = dot(velocities[i], dir) + dt * dot(F[i], dir)
    const vfdot2 = dot(velocities[i + 1], dir) + dt * dot(F[i + 1], dir)
    tt[i] = 2
    ta[i] = i > 0 ? -dot(directions[i - 1], dir) : 0
    tb[i] = i < N - 1 ? -dot(directions[i + 1], dir) : 0
    T[i] = (vfdot1 - vfdot2) / dt
  }
  solveMatrix3(ta, tt, tb, T)
  for (let i = 0; i <= N; i++) {
    velocities[i].x += dt * (F[i].x + (i > 0 ? T[i - 1] * directions[i - 1].x : 0) - (i < N ? T[i] * directions[i].x : 0))
    velocities[i].y += dt * (F[i].y + (i > 0 ? T[i - 1] * directions[i - 1].y : 0) - (i < N ? T[i] * directions[i].y : 0))
  }
  const points2 = points.map(({ x, y }, i) => ({
    x: x + dt * velocities[i].x,
    y: y + dt * velocities[i].y
  }))
  for (let i = 0; i < N; i++) {
    const p = points2[i]
    const q = points2[i + 1]
    const dx = q.x - p.x
    const dy = q.y - p.y
    const dr = Math.hypot(dx, dy)
    directions[i].x = dx / dr
    directions[i].y = dy / dr
    points2[i + 1].x = p.x + directions[i].x * L
    points2[i + 1].y = p.y + directions[i].y * L
  }
  point.x += velocities[0].x * dt
  point.y += velocities[0].y * dt
}

function render() {
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(canvas.width, canvas.height)
  ctx.lineWidth = L / 20
  const [start, ...points] = getPoints()
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  points.forEach(({ x, y }) => ctx.lineTo(x, y))
  ctx.stroke()
  ctx.restore()
}
function frame() {
  update()
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)


assignGlobal({
  directions, getPoints, velocities, solveMatrix3
})