function createCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 2, size / 2)
  ctx.fillStyle = 'black'
  ctx.fillRect(-1, -1, 2, 2)
    ctx.lineJoin = ctx.lineCap = 'round'
  return [canvas, ctx] as const
}

const backBGColor = '#222'

function smoothBezierParams(values: number[]) {
  const n = values.length
  const diffs = values.map((_, i) => 3 * (values[(i + 1) % n] - values[(i + n - 1) % n]))
  let sum = 0
  const a = -2 + Math.sqrt(3)
  diffs.forEach(v => sum = sum * a + v )
  const b = 1 / (1 - a ** n)
  const scale = 1 / (4 + 2 * a) / 3
  sum *= b
  const params = diffs.map(v => sum = sum * a + v)
  let rsum = 0
  for (let i = n - 1; i >= 0; i--) rsum = rsum * a + diffs[i]
  rsum *= b
  for (let i = n - 1; i >= 0; i--) {
    rsum = rsum * a + diffs[i]
    params[i] = (params[i] + rsum - diffs[i]) * scale
  }
  return params
}
function curvePath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  const xparams = smoothBezierParams(points.map(p => p.x))
  const yparams = smoothBezierParams(points.map(p => p.y))
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    ctx.bezierCurveTo(
      points[i].x + xparams[i],
      points[i].y + yparams[i],
      points[j].x - xparams[j],
      points[j].y - yparams[j],
      points[j].x,
      points[j].y
    )
  }
}

function plainImage(size: number, color = '#666') {
  const [canvas, ctx] = createCanvas(size)
  ctx.fillStyle = color
  ctx.fillRect(-1, -1, 2, 2)
  return canvas
}

export function stripeImage(size: number) {
  const [canvas, ctx] = createCanvas(size)
  ctx.fillStyle = '#666'
  ctx.fillRect(-1, -1, 2, 2)
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
  ctx.strokeStyle = '#f84'
  ctx.filter = `blur(${size / 40}px)`;
  ctx.stroke()
  ctx.lineWidth = 0.04
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#800'
  ctx.filter = `blur(${size / 80}px)`;
  ctx.stroke()
  return canvas
}
export function outerStripeImage(size: number) {
  const canvas = stripeImage(size)
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(0, 0, 0.8, 0, 2 * Math.PI)
  ctx.globalAlpha = 1
  ctx.filter = `blur(${size / 32}px)`;
  ctx.fillStyle = '#666'
  ctx.fill()
  return canvas
}
function circleRand(r = 1) {
  while (true) {
    const x = 2 * Math.random() - 1
    const y = 2 * Math.random() - 1
    if (x * x + y * y < 1) return [x * r, y * r]
  }
}
export function spottedImage(size: number, props: { n: number; rmin: number; rmax: number, donut: number }) {
  const { n, rmin, rmax, donut } = props
  const [canvas, ctx] = createCanvas(size)
  const N = Math.ceil(Math.sqrt(n) * 2.4)
  const background = '#444'
  ctx.fillStyle = background
  ctx.fillRect(-1, -1, 2, 2)
  const map = [...new Array(N)].map(() => [...new Array(N)].fill(0))
  for (let i = 0; i < 4 * n; i++) {
    const r = rmin + (rmax - rmin) * Math.random()
    const [x, y] = circleRand(1 - r)
    const ix = Math.floor((x + 1) * N / 2)
    const iy = Math.floor((y + 1) * N / 2)
    if (map[ix][iy]) continue
    map[ix][iy - 1] = map[ix][iy] = map[ix][iy + 1] = true
    if (map[ix - 1]) map[ix - 1][iy - 1] = map[ix - 1][iy] = map[ix - 1][iy + 1] = true
    if (map[ix + 1]) map[ix + 1][iy - 1] = map[ix + 1][iy] = map[ix + 1][iy + 1] = true
    ctx.save()
    const n = 4 + Math.floor(3 * Math.random())
    const offset = 2 * Math.PI * Math.random()
    const points = [...new Array(n)].map((_, i) => {
      const rr = r * (0.8 + 0.4 * Math.random())
      const th = 2 * Math.PI * i / n + offset
      return { x: x + rr * Math.cos(th), y: y + rr * Math.sin(th) }
    })
    ctx.beginPath()
    curvePath(ctx, points)
    ctx.closePath()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = donut * 2
    ctx.fillStyle = 'white'
    ctx.filter = `blur(${size / 512}px)`;
    ctx.fill()
    if (r > donut) {
      ctx.beginPath()
      const scale = (r - donut) / r
      curvePath(ctx, points.map(p => ({ x: x + (p.x - x) * scale, y: y + (p.y - y) * scale, })))
      ctx.arc(x, y, r - donut, 0, 2 * Math.PI)
      ctx.filter = `blur(${size * donut / 8}px)`;
      ctx.fillStyle = background
      ctx.fill()
      ctx.filter = 'none'
    }
    ctx.restore()
  }
  return canvas
}
export function radialTreeImage(size: number) {
  const [canvas, ctx] = createCanvas(size)
  ctx.fillStyle = backBGColor
  ctx.fillRect(-1, -1, 2, 2)
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
      render(lines.slice(0, n), splitAt)
      render(lines.slice(n), splitAt)
    }
  }
  ctx.beginPath()
  for (let i = 0; i < K; i++) {
    render(lines.slice(M * i / K, M * (i + 1) / K), 0)
  }
  ctx.strokeStyle = 'white'
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 0.01
  ctx.filter = `blur(${size / 256}px)`;
  ctx.stroke()
  ctx.filter = `blur(${size / 32}px)`;
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.arc(0, 0, 0.3, 0, 2 * Math.PI)
  ctx.fill()
  return canvas
}

function radialPath(ctx: CanvasRenderingContext2D, n: number, rmin: number, rmax: number, noise: number) {
  for (let i = 0; i < n; i++) {
    ctx.save()
    ctx.rotate(2 * Math.PI * i / n)
    const M = 32
    const r = rmin + (rmax - rmin) * Math.random()
    ctx.moveTo(r, 0)
    for (let j = 1; j < M; j++) {
      const t = r + (1 - r) * j / M
      ctx.lineTo(t, noise * t * (2 * Math.random() - 1))
    }
    ctx.restore()
  }
}

export function radialImage(size: number) {
  const [canvas, ctx] = createCanvas(size)
  ctx.fillStyle = backBGColor
  ctx.fillRect(-1, -1, 2, 2)
  ctx.beginPath()
  radialPath(ctx, 48, 0, 0, 0.02)
  ctx.strokeStyle = 'white'
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 0.02
  ctx.filter = `blur(${size / 128}px)`;
  ctx.stroke()
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.arc(0, 0, 0.5, 0, 2 * Math.PI)
  ctx.filter = `blur(${size / 32}px)`;
  ctx.fill()
  return canvas
}

export function radialOwanImage(size: number) {
  const canvas = radialImage(size)
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(0, 0, 0.4, 0, 2 * Math.PI)
  ctx.globalAlpha = 0.2
  ctx.filter = `blur(${size / 64}px)`;
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, 0.2, 0, 2 * Math.PI)
  ctx.globalAlpha = 1
  ctx.fillStyle = backBGColor
  ctx.fill()
  return canvas
}

export function hanagasaImage(size: number) {
  const canvas = spottedImage(512, { n: 256, rmin: 0.006, rmax: 0.01, donut: 0.5 })
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#888'
  ctx.globalAlpha = 0.4
  ctx.fillRect(-1, -1, 2, 2)
  ctx.beginPath()
  radialPath(ctx, 32, 0.5, 0.7, 0.02)
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.01
  ctx.filter = `blur(${size / 256}px)`;
  ctx.strokeStyle = '#402'
  ctx.stroke()
  return canvas
}

export function mergeImage(size: number, front: HTMLCanvasElement, back: HTMLCanvasElement, ratio = 0.6, mix = 0.02) {
  const [canvas, ctx] = createCanvas(size)
  const imgdata = ctx.createImageData(size, size)
  const data = imgdata.data
  const fsize = front.width
  const bsize = back.width
  const fdata = front.getContext('2d')!.getImageData(0, 0, fsize, fsize).data
  const bdata = back.getContext('2d')!.getImageData(0, 0, bsize, bsize).data
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const idx = 4 * (y * size + x)
      const cx = x - size / 2
      const cy = y - size / 2
      const dr = Math.hypot(cx, cy)
      const dx = dr ? cx / dr : 1
      const dy = dr ? cy / dr : 0
      const r = dr * 2 / size
      const frontR = r / (ratio + mix)
      const backR = Math.max((1 - r) / (1 - ratio + mix), 0)
      const t = (r - ratio + mix) / mix / 2
      if (t >= 1) {
        const bidx = 4 * (Math.floor(bsize * (1 + dy * backR) / 2) * bsize + Math.floor(bsize * (1 + dx * backR) / 2))
        for (let j = 0; j < 4; j++) data[idx + j] = bdata[bidx + j]
      } else if (t <= 0) {
        const fidx = 4 * (Math.floor(fsize * (1 + dy * frontR) / 2) * fsize + Math.floor(fsize * (1 + dx * frontR) / 2))
        for (let j = 0; j < 4; j++) data[idx + j] = fdata[fidx + j]
      } else {
        const bidx = 4 * (Math.floor(bsize * (1 + dy * backR) / 2) * bsize + Math.floor(bsize * (1 + dx * backR) / 2))
        const fidx = 4 * (Math.floor(fsize * (1 + dy * frontR) / 2) * fsize + Math.floor(fsize * (1 + dx * frontR) / 2))
        const bw = (3 - 2 * t) * t * t
        const fw = 1 - bw
        for (let j = 0; j < 4; j++) data[idx + j] = fdata[fidx + j] * fw + bw * bdata[bidx + j]
      }
    }
  }
  ctx.putImageData(imgdata, 0, 0)
  return canvas
}

export function generate() {
  const backTree = radialTreeImage(1024)
  const backRadial = radialImage(1024)
  const backOwan = radialOwanImage(1024)
  const backPlain = plainImage(1, backBGColor)
  const plain = plainImage(1)
  const plainDark = plainImage(1, '#333')
  mergeImage(512, hanagasaImage(1024), backRadial)
  return [
    mergeImage(512, stripeImage(1024), backRadial),
    mergeImage(512, outerStripeImage(1024), backRadial),
    mergeImage(512, hanagasaImage(1024), backRadial),
    mergeImage(512, spottedImage(1024, { n: 80, rmin: 0.03, rmax: 0.07, donut: 0.05 }), backRadial),
    mergeImage(512, spottedImage(1024, { n: 128, rmin: 0.02, rmax: 0.04, donut: 0.5 }), backRadial),
    mergeImage(512, plainDark, backTree),
    mergeImage(512, plainDark, backOwan),
    mergeImage(512, plainDark, backRadial),
    mergeImage(512, plainDark, backPlain),
  ]
}

export function preview(canvases = generate()) {
  const modal = document.createElement('div')
  const close = document.createElement('a')
  const download = document.createElement('a')
  close.innerHTML = '&times'
  close.style.cssText = 'position:absolute;right:8px;top:8px'
  download.textContent = 'download'
  modal.appendChild(close)
  modal.appendChild(download)
  close.onclick = () => { modal.style.display = 'none' }
  modal.style.cssText = `
    position:fixed;left:30%;top:40%;width:40%;height:20%;background:white;display:none;z-index:9999;
  `
  document.body.appendChild(modal)
  canvases.forEach((canvas, i) => {
    canvas.style.position = 'relative'
    canvas.style.width = canvas.style.height = '512px'
    document.body.appendChild(canvas)
    canvas.onclick = () => {
      modal.style.display = 'none'
      canvas.toBlob(blob => {
        if (!blob) return
        modal.style.display = 'block'
        download.download = `${i}.jpg`
        download.textContent = `download ${i}.jpg(${blob.size})`
        download.href = URL.createObjectURL(blob)
      }, 'image/jpeg', 0.95)
    }
  })

}
