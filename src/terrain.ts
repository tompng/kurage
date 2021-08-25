import * as THREE from 'three'

const basicTerrainCoords = [
  [[2,0],[66,56],[67,128],[62,156],[93,240],[86,282],[70,350],[102,412],[66,538],[37,693],[42,727],[79,802],[133,866],[165,881],[191,913],[213,924],[276,938],[383,946],[439,930],[467,879],[468,768],[461,729],[471,690],[514,682],[537,731],[575,805],[600,868],[636,909],[675,930],[745,952],[812,954],[867,951],[925,928],[969,875],[960,784],[948,748],[910,660],[929,601],[962,593],[990,551],[995,500],[997,443],[978,392],[923,394],[863,393],[838,365],[847,276],[875,160],[882,127],[904,89],[947,59],[977,49],[1009,19],[1022,0]],
  [[459,30],[521,24],[611,41],[625,85],[591,101],[547,98],[460,62],[459,30]],
  [[161,586],[172,652],[215,683],[227,704],[246,747],[330,736],[385,701],[396,689],[380,667],[343,637],[231,607],[201,587],[161,586]],
  [[596,251],[657,241],[703,226],[752,219],[797,212],[790,256],[752,291],[721,310],[668,314],[615,309],[578,287],[580,261],[596,251]],
  [[726,470],[768,461],[809,438],[848,435],[864,474],[856,513],[854,526],[870,583],[834,590],[771,565],[704,515],[716,484],[717,483],[726,470]],
  [[175,0],[146,55],[147,122],[170,144],[198,157],[209,205],[199,237],[190,302],[192,342],[183,409],[207,442],[232,436],[262,400],[289,400],[342,452],[365,496],[392,549],[404,570],[422,591],[445,604],[479,604],[485,583],[461,532],[439,431],[441,369],[387,334],[358,341],[294,335],[280,309],[265,275],[277,247],[336,262],[357,201],[359,179],[381,118],[378,100],[331,83],[283,51],[249,0]]
] as [number, number][][]

const terrainCoords = basicTerrainCoords.map(c => expandCoords(c, 8))
function interpolate4(a: number, b: number, da: number, db: number, t: number) {
  return a + (b - a) * t * t * (3 - 2 * t) + t * (1 - t) * ((1 - t) * da - db * t)
}

function expandCoords(coords: [number, number][], len: number) {
  const last = coords[coords.length - 1]
  const first = coords[0]
  const closed = last[0] == first[0] && last[1] == first[1]
  const out: [number, number][] = []
  for (let i = 0; i < coords.length - 1; i++) {
    const iprev = i === 0 ? (closed ? coords.length - 2 : 0) : i - 1
    const j = i + 1
    const jnext = j == coords.length - 1 ? (closed ? 1 : coords.length - 1) : j + 1
    const [dax, day] = [0, 1].map(axis => (coords[j][axis] - coords[iprev][axis]) / 2)
    const [dbx, dby] = [0, 1].map(axis => (coords[jnext][axis] - coords[i][axis]) / 2)
    const [ax, ay] = coords[i]
    const [bx, by] = coords[j]
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / len)
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n
      out.push([interpolate4(ax, bx, dax, dbx, t), interpolate4(ay, by, day, dby, t)])
    }
  }

  return out
}


export class HitMap {
  map: Uint8Array[]
  constructor(public size: number) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.scale(size / 1024, size / 1024)
    ctx.fillStyle = ctx.strokeStyle = 'white'
    ctx.lineJoin = ctx.lineCap = 'round'
    ctx.beginPath()
    terrainCoords.forEach((points, idx) => {
      ctx.moveTo(...points[0])
      for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i])
      if (idx === 0) {
        ctx.lineTo(1024, 0)
        ctx.lineTo(1024, 1024)
        ctx.lineTo(0, 1024)
        ctx.lineTo(0, 0)
      }
      ctx.closePath()
    })
    ctx.globalAlpha = 1 / 255
    ctx.lineWidth = size / 64
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineWidth = size / 384
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(1024, 0)
    ctx.stroke()
    const imgdata = ctx.getImageData(0, 0, size, size)
    this.map = [...new Array(size)].map((_, x) => {
      const arr = new Uint8Array(size)
      for (let y = 0; y < size; y++) arr[y] = imgdata.data[4 * (y * size + x) + 3]
      return arr
    })
    canvas.width = canvas.height = 0
  }
  spawnTest(x: number, y: number) {
    return this.get(x, y) === 0
  }
  hitTest(x: number, y: number) {
    return this.get(x, y) > 4
  }
  get(x: number, y: number) {
    const max = this.size - 1
    return this.map[Math.max(Math.min(Math.round(x), max), 0)][Math.max(Math.min(Math.round(y), max), 0)]
  }
  normal(x: number, y: number) {
    const vcenter = this.get(x, y)
    if (vcenter <= 4) return null
    const dirs: [number, number][] = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, +1], [+1, -1], [+1, +1]
    ]
    for (let len = 1; len <= 8; len++) {
      let vmin = vcenter
      let dxmin = 0
      let dymin = 0
      dirs.forEach(([dx, dy]) => {
        const v = this.get(x + len * dx, y + len * dy)
        if (v < vmin) {
          vmin = v
          dxmin = dx
          dymin = dy
        }
      })
      if (vmin < vcenter) {
        const xx = x + len * dxmin, yy = y + len * dymin
        const dx1 = this.get(xx + 1, yy) - vmin
        const dx2 = vmin - this.get(xx - 1, yy)
        const dy1 = this.get(xx, yy + 1) - vmin
        const dy2 = vmin - this.get(xx, yy - 1)
        const dx = Math.abs(dx1) < Math.abs(dx2) ? dx2 : dx1
        const dy = Math.abs(dy1) < Math.abs(dy2) ? dy2 : dy1
        const dr = Math.hypot(dx, dy)
        return { x: -dx / dr, y: -dy / dr }
      }
    }
    return null
  }
}

export function test() {
  const hitmap = new HitMap(1024)
  const canvas = document.querySelector('canvas')!
  canvas.style.left = canvas.style.top = '0'
  canvas.style.position = 'fixed'
  canvas.onmousemove = (e) => {
    const { pageX: x, pageY: y } = e 
    console.log(
      hitmap.hitTest(x, y),
      hitmap.spawnTest(x, y),
      hitmap.normal(x, y)
    )
  }
  throw 'err'
}

function coordsLength(coords: [number, number][]) {
  let len = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]
    const b = coords[i + 1]
    len += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return len
}

export function generateGeometry(coords: [number, number][], scale: number) {
  coords = coords.map(([x, y]) => [(x - 512) * scale, -y * scale])
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const uvs: number[] = []
  const len = coordsLength(coords)
  const texLength = 2
  const fixedTexLength = len / Math.round(len / texLength)
  let tex = 0
  for (let i = 1; i < coords.length; i++) {
    const [x1, z1] = coords[i - 1]
    const [x2, z2] = coords[i]
    const l = Math.hypot(x2 - x1, z2 - z1)
    const ylen = 8
    const v = 2 * ylen / fixedTexLength
    const tex2 = tex + l / fixedTexLength
    uvs.push(
      tex, 0, tex2, 0, tex, v,
      tex, v, tex2, 0, tex2, v
    )
    positions.push(
      x1, -ylen, z1, x2, -ylen, z2, x1, ylen, z1,
      x1, ylen, z1, x2, -ylen, z2, x2, ylen, z2
    )
    tex = tex2
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

export class Terrain {
  hitmap = new HitMap(1024)
  geometries: THREE.BufferGeometry[]
  constructor(public scale = 1 / 8) {
    this.geometries = terrainCoords.map(coords => generateGeometry(coords, this.scale))
  }
  toHitmapCoord(x: number, z: number) {
    return [512 + x / this.scale, -z / this.scale] as const
  }
  spawnTest(x: number, z: number) {
    return this.hitmap.spawnTest(...this.toHitmapCoord(x, z))
  }
  hitTest(x: number, z: number) {
    return this.hitmap.hitTest(...this.toHitmapCoord(x, z))
  }
  hitNormal(x: number, z: number) {
    const n = this.hitmap.normal(...this.toHitmapCoord(x, z))
    return n && { x: n.x, y: 0, z: -n.y }
  }
}
