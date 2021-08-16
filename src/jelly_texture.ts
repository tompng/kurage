function createCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 2, size / 2)
  ctx.fillStyle = 'black'
  ctx.fillRect(-1, -1, 2, 2)
  return [canvas, ctx] as const
}

function stripeImage(size: number) {
  const [canvas, ctx] = createCanvas(size)
  ctx.beginPath()
  for (let i = 0; i < 20; i++) {
    ctx.save()
    ctx.rotate(2 * Math.PI * (i) / 20)
    ctx.moveTo(0, 0)
    const da = Math.random() - 0.5
    const b = Math.random() * 0.2 - 0.1
    const db = Math.random() - 0.5
    const c = Math.random() * 0.2 - 0.1
    const dc = Math.random() - 0.5
    ctx.bezierCurveTo(1 / 6, da / 6, 1 / 3, b - db / 6, 1 / 2, b)
    ctx.bezierCurveTo(2 / 3, b + 0.2 * db, 5 / 6, c - 0.2 * dc, 1, c)
    ctx.restore()
  }
  ctx.lineWidth = 0.1
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = '#f00'
  ctx.filter = `blur(${size / 40}px)`;
  ctx.stroke()
  ctx.lineWidth = 0.05
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = '#fa4'
  ctx.filter = `blur(${size / 80}px)`;
  ctx.stroke()
  ctx.filter = 'none'
  ctx.fillStyle = 'white'
  ctx.globalAlpha = 0.25
  ctx.fillRect(-1, -1, 2, 2)
  return canvas
}

function radialImage(size: number) {
  const [canvas, ctx] = createCanvas(size)
  ctx.beginPath()
  const lines: number[][] = []
  const N = 64
  const M = 128
  for (let i = 0; i < M; i++) {
    const base = 2 * Math.PI * i / M
    const diff = Math.PI / M
    const a = 13 + 9 * Math.random()
    const b = 9 + 9 * Math.random()
    const c = 2 * Math.PI * Math.random()
    const line = [...new Array(N)].map((_, i) => {
      const t = i / N
      return base + diff * (1.1 - t) * 2 * (Math.sin(a * t + c) - Math.sin(b * t + c))
    })
    lines.push(line)
  }
  const K = 16
  function render(lines: number[][], idx: number) {
    const splitAt = Math.floor(Math.max(idx + 1, 1.5 * N / lines.length) + Math.random() * 16)
    const n = Math.floor(lines.length * (1 + Math.random()) / 3)
    for (let i = idx; i < N && i <= splitAt; i++) {
      const av = lines[n][i]
      lines.forEach(l => { l[i] = av })
      const x = i * Math.cos(av) / N
      const y = i * Math.sin(av) / N
      if (i === idx) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = splitAt + 1; i < N; i++) {
      const av = lines[n][i]
      const t = Math.exp(-(i - splitAt) / 4)
      lines.forEach(l => { l[i] = av * t + (1 - t) * l[i] })
    }
    if (lines.length === 1) return
    if (lines.length === 2) {
      lines.forEach(line => render([line], splitAt))
    } else {
      // const n = Math.round(lines.length * (1 + Math.random()) / 3)
      render(lines.slice(0, n), splitAt)
      render(lines.slice(n), splitAt)
    }
  }
  ctx.beginPath()
  for (let i = 0; i < K; i++) {
    render(lines.slice(M * i / K, M * (i + 1) / K), 0)
  }
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 0.02
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.stroke()

  return canvas
}

export function test() {
  [stripeImage(512), radialImage(512)].forEach(canvas => {
    canvas.style.boxShadow = '0 0 2px white'
    canvas.style.position = 'relative'
    canvas.style.width = canvas.style.height = '512px'
    document.body.appendChild(canvas)
  })
}