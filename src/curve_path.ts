type Points = { x: number; y: number }[] | [number, number][]
function closedBezierParams(values: number[]) {
  const n = values.length
  const diffs = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    diffs[i] = values[(i + 1) % n] - values[(i + n - 1) % n]
  }
  const a = -2 + Math.sqrt(3)
  let lsum = 0
  for (let i = 0; i < n; i++) lsum = lsum * a + diffs[i]
  const ansum = 1 / (1 - a ** n)
  const scale = 1 / (4 + 2 * a)
  lsum *= ansum
  const params = new Array<number>(n)
  for (let i = 0; i < n; i++) params[i] = lsum = lsum * a + diffs[i]
  let rsum = 0
  for (let i = n - 1; i >= 0; i--) rsum = rsum * a + diffs[i]
  rsum *= ansum
  for (let i = n - 1; i >= 0; i--) {
    rsum *= a
    params[i] = (params[i] + rsum) * scale
    rsum += diffs[i]
  }
  return params
}

function openBezierParams(values: number[]) {
  const n = values.length
  if (n <= 1) return [0]
  const diffs = new Array<number>(n)
  for (let i = 1; i < n - 1; i++) diffs[i] = values[i + 1] - values[i - 1]
  diffs[0] = values[1] - values[0]
  diffs[n - 1] = values[n - 1] - values[n - 2]
  const centers = new Array(n).fill(4)
  centers[0] = centers[n - 1] = 2
  for (let i = 0; i < n - 1; i++) {
    const s = 1 / centers[i]
    centers[i + 1] -= s
    diffs[i + 1] -= diffs[i] * s
  }
  for (let i = n - 1; i > 0; i--) {
    diffs[i - 1] -= diffs[i] / centers[i]
  }
  for (let i = 0; i < n; i++) diffs[i] /= centers[i]
  return diffs
}

function isTuplePoints(points: Points): points is [number, number][] {
  return Array.isArray(points[0])
}
function splitXY(points: Points): [number[], number[]] {
  if (isTuplePoints(points)) {
    return [points.map(p => p[0]), points.map(p => p[1])]
  } else {
    return [points.map(p => p.x), points.map(p => p.y)]
  }
}

export function closedCurvePath(ctx: CanvasRenderingContext2D, points: Points, move = true) {
  const [xs, ys] = splitXY(points)
  const xparams = closedBezierParams(xs)
  const yparams = closedBezierParams(ys)
  if (move) ctx.moveTo(xs[0], ys[0])
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    ctx.bezierCurveTo(
      xs[i] + xparams[i],
      ys[i] + yparams[i],
      xs[j] - xparams[j],
      ys[j] - yparams[j],
      xs[j],
      ys[j]
    )
  }
  ctx.closePath()
}

export function openCurvePath(ctx: CanvasRenderingContext2D, points: Points, move = true) {
  const [xs, ys] = splitXY(points)
  const xparams = openBezierParams(xs)
  const yparams = openBezierParams(ys)
  if (move) ctx.moveTo(xs[0], ys[0])
  for (let i = 0; i < points.length - 1; i++) {
    const j = i + 1
    ctx.bezierCurveTo(
      xs[i] + xparams[i],
      ys[i] + yparams[i],
      xs[j] - xparams[j],
      ys[j] - yparams[j],
      xs[j],
      ys[j]
    )
  }
}

export function curvePath(ctx: CanvasRenderingContext2D, points: Points, closed = false, move = true) {
  closed ? closedCurvePath(ctx, points, move) : openCurvePath(ctx, points, move)
}
