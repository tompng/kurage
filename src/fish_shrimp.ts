import { distance, Point3D, randomDirection } from './math'
import * as THREE from 'three'
import { Mesh } from 'three'

type XY = [number, number]
type XYZ = [number, number, number]

const shrimpOutline: [XY[], XY[]] = [
  [
    [-1, 0.8],
    [-0.5, 1],
    [0.1, 0.9],
    [0.6, 0.6],
    [0.9, 0.2],
    [0.9, -0.2],
    [0.6, -0.55],
    [0.3, -0.65],
    [0, -0.6]
  ],
  [
    [-1, 0.8],
    [-0.3, 0.2],
    [-0.1, 0.1],
    [0.3, -0.1],
    [0.35, -0.15],
    [0.4, -0.2],
    [0.3, -0.4],
    [0.1, -0.45],
    [0, -0.6]
  ]
]
const shrimpOther: [XYZ, XYZ, XYZ][] = [
  [
    [-0.3, -0.1, 0.2],
    [-0.2, -0.1, 0.2],
    [-0.6, -0.1, 0],
  ],
  [
    [-0.1, -0.1, 0.15],
    [0, -0.1, 0.15],
    [-0.4, -0.1, -0.05],
  ],
  [
    [0.1, -0.1, 0.1],
    [0.2, -0.1, 0.1],
    [-0.2, -0.1, -0.1],
  ],
  [
    [-0.8, -0.05, 0.8],
    [-1.4, -0.05, 1],
    [-0.6, -0.05, 0.82],
  ],
  [
    [-0.7, -0.05, 0.85],
    [-1, -0.05, 1],
    [-0.5, -0.05, 0.87],
  ]
]

const fishOutline: [XY[], XY[]] = [
  [
    [-1, 0],
    [-0.9, 0.2],
    [-0.6, 0.4],
    [-0.2, 0.45],
    [0.2, 0.4],
    [0.6, 0.2],
    [0.8, 0.4],
    [0.95, 0.35],
    [1, 0.2]
  ],
  [
    [-1, 0],
    [-0.9, -0.2],
    [-0.6, -0.35],
    [-0.2, -0.4],
    [0.3, -0.35],
    [0.6, -0.2],
    [0.8, -0.4],
    [0.95, -0.35],
    [1, -0.2]
  ]
]

function createGeometry([up, down]: [XY[], XY[]], wfunc: (l: number, t: number) => number, other?: [XYZ, XYZ, XYZ][]) {
  const lines: XYZ[][] = [[], [], [], []]
  const xs = [...up.map(a => a[0]), ...down.map(a => a[0])]
  const ys = [...up.map(a => a[1]), ...down.map(a => a[1])]
  const xmin = Math.min(...xs), xmax = Math.max(...xs)
  const ymin = Math.min(...ys), ymax = Math.max(...ys)
  const size = Math.max(xmax - xmin, ymax - ymin)
  for (let i = 0; i < up.length; i++) {
    const [ux, uy] = up[i]
    const [dx, dy] = down[i]
    const len = Math.hypot(ux - dx, uy - dy)
    const w = wfunc(len, i / (up.length - 1))
    lines[0].push([ux, 0, uy])
    lines[1].push([(2 * ux + dx) / 3, -w, (2 * uy + dy) / 3])
    lines[2].push([(ux + 2 * dx) / 3, -w, (uy + 2 * dy) / 3])
    lines[3].push([dx, 0, dy])
  }
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const uvs: number[] = []
  function add(a: XYZ, b: XYZ, c: XYZ, u?: number, v?: number) {
    positions.push(...a, ...b, ...c)
    positions.push(a[0], -a[1], a[2], c[0], -c[1], c[2], b[0], -b[1], b[2])
    ;[a, b, c, a, b, c].forEach(([x, _, z]) => {
      uvs.push(u ?? (x - xmin) / size, v ?? (z - ymin) / size)
    })
  }
  for (let i = 0; i < up.length - 1; i++) {
    const j = i + 1
    if (up[i][0] !== down[i][0] || up[i][1] !== down[i][1]) {
      for (let k = 0; k < 3; k++) add(lines[k][i], lines[k + 1][i], lines[k][j])
    }
    if (up[j][0] !== down[j][0] || up[j][1] !== down[j][1]) {
      for (let k = 0; k < 3; k++) add(lines[k + 1][i], lines[k + 1][j], lines[k][j])
    }
  }
  other?.forEach((tri) => {
    add(...tri, 1, 1)
  })
  const normals: number[] = []
  const ns = new Map<string, XYZ>()
  for (let i = 0; i < positions.length; i += 9) {
    const a = positions.slice(i, i + 3)
    const b = positions.slice(i + 3, i + 6)
    const c = positions.slice(i + 6, i + 9)
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2])
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (c[2] - a[2]) * (b[0] - a[0])
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    ;[a, b, c].forEach(p => {
      const k = p.join('/')
      const n = ns.get(k) || [0, 0, 0]
      n[0] += nx
      n[1] += ny
      n[2] += nz
      ns.set(k, n)
    })
  }
  ns.forEach(v => {
    const r = Math.hypot(...v)
    v[0] /= r
    v[1] /= r
    v[2] /= r
  })
  for (let i = 0; i < positions.length; i += 3) {
    normals.push(...ns.get(positions.slice(i, i + 3).join('/'))!)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geometry
}

function createPaint() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.scale(64, 64)
  return [canvas, ctx] as const
}


const vertexShader = `
varying vec2 vTexcoord;
varying vec3 vView, vNormal;
void main() {
  vTexcoord = uv;
  vec4 gpos = (modelMatrix * vec4(position, 1));
  vNormal = normalize((modelMatrix * vec4(normal, 0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * gpos;
  vView = gpos.xyz - cameraPosition;
}
`

const fragmentShader = `
varying vec2 vTexcoord;
varying vec3 vView, vNormal;
uniform sampler2D map;
void main() {
  float brightness = dot(normalize(vView), normalize(vNormal));
  gl_FragColor = vec4(
    texture2D(map, vTexcoord).rgb * abs(brightness),
    1
  );
}
`

export function createFishGeometryMaterial() {
  const geometry = createGeometry(fishOutline, (l, t) => t > 0.7 ? 0.01 : l / 4)
  const [canvas, ctx] = createPaint()
  ctx.fillStyle = '#888'
  ctx.fillRect(0, 0, 1, 1)
  ctx.beginPath()
  ctx.arc(0.2, 0.8, 0.03, 0, 2 * Math.PI)
  ctx.fillStyle = '#444'
  ctx.fill()
  ctx.fillStyle = '#444'
  ctx.fillRect(0.82, 0, 0.2, 1)
  const map = new THREE.Texture(canvas)
  map.needsUpdate = true
  return [
    geometry,
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { map: { value: map } },
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  ] as const
}

export function createShrimpGeometryMaterial() {
  const geometry = createGeometry(shrimpOutline, l => l / 3, shrimpOther)
  const [canvas, ctx] = createPaint()
  ctx.fillStyle = '#822'
  ctx.fillRect(0, 0, 1, 1)
  ctx.beginPath()
  ctx.arc(0.3, 0.3, 0.03, 0, 2 * Math.PI)
  ctx.fillStyle = '#222'
  ctx.fill()
  ctx.fillStyle = '#722'
  ctx.beginPath()
  ctx.moveTo(0.8, 0)
  ctx.lineTo(1, 0)
  ctx.lineTo(1, 1)
  ctx.lineTo(0, 1)
  ctx.fill()
  ctx.fillStyle = '#411'
  ctx.fillRect(0.9, 0, 0.1, 0.1)
  const map = new THREE.Texture(canvas)
  map.needsUpdate = true
  return [
    geometry,
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { map: { value: map } },
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  ] as const
}

const [fishGeometry, fishShader] = createFishGeometryMaterial()
const [shrimpGeometry, shrimpShader] = createShrimpGeometryMaterial()

class Shrimp {
  phase = Math.random()
  mesh: THREE.Mesh
  jump = { x: 0, y: 0, z: 0 }
  th: number
  thDst: number
  thz: number
  thzDst: number
  constructor(public position: Point3D) {
    this.mesh = new Mesh(shrimpGeometry, shrimpShader)
    this.mesh.scale.set(0.1, 0.1, 0.1)
    this.th = this.thDst = 2 * Math.PI * Math.random()
    this.thz = this.thzDst = 0.4 * Math.random() - 0.2
  }
  update(dt: number) {
    this.phase += Math.random() * dt
    if (this.phase > 1) {
      this.phase = 0.5 * Math.random()
      this.jump = randomDirection()
      this.thzDst = 0.4 * Math.random() - 0.2
      this.thDst = this.th + Math.PI / 4 * (2 * Math.random() - 1)
      const dz = Math.random() - 0.5
      const dr = Math.sqrt(1 - dz * dz)
      this.jump.x = dr * Math.cos(this.thDst)
      this.jump.y = dr * Math.sin(this.thDst)
      this.jump.z = dz
      this.thz += 0.5
    }
    const s = 1 - 8 * dt
    this.jump.x *= s
    this.jump.y *= s
    this.jump.z *= s
    this.th = this.th * s + (1 - s) * this.thDst
    this.thz = this.thz * s + (1 - s) * this.thzDst
    this.position.x += 2 * this.jump.x * dt
    this.position.y += 2 * this.jump.y * dt
    this.position.z += 2 * this.jump.z * dt
  }
  updateForRender() {
    const { mesh, position, th } = this
    mesh.position.set(position.x, position.y / 4, position.z)
    mesh.setRotationFromEuler(new THREE.Euler(
      0,
      Math.atan(this.thz),
      th,
      'XZY'
    ))
  }
}

class Fish {
  position: Point3D
  phase = 2 * Math.PI * Math.random()
  phaseSpeed = 16 * (0.8 + 0.4 * Math.random())
  v = 0.2 * (0.8 + 0.4 * Math.random())
  zw1 = Math.random() / 16
  zw2 = Math.random() / 16
  dir: number
  smoothDir: number
  dz = 0
  mesh: THREE.Mesh
  constructor(public spawnPosition: Point3D) {
    this.position = { ...spawnPosition }
    this.smoothDir = this.dir = 2 * Math.PI * Math.random()
    this.mesh = new Mesh(fishGeometry, fishShader)
    this.mesh.scale.set(0.1, 0.1, 0.1)
  }
  update(dt: number) {
    const { v, position, spawnPosition } = this
    const dirx = Math.cos(this.dir)
    const diry = Math.sin(this.dir)
    this.phase += this.phaseSpeed * dt
    const lx = position.x - spawnPosition.x
    const ly = position.y - spawnPosition.y
    const lr = Math.hypot(lx, ly) || 1
    const cross = (diry * (position.x - spawnPosition.x) - dirx * (position.y - spawnPosition.y)) / lr
    this.dir += 8 * (cross * lr * lr + (Math.random() - 0.5)) * dt
    this.smoothDir = this.smoothDir * (1 - dt) + dt * this.dir
    this.dz = (Math.sin(this.zw1 * this.phase) + Math.sin(this.zw2 * this.phase)) / 4
    position.x += v * Math.cos(this.smoothDir) * dt
    position.y += v * Math.sin(this.smoothDir) * dt
    position.z += v * this.dz * dt
    if (position.z > -0.2) position.z = -0.2
  }
  updateForRender() {
    const { mesh, position, smoothDir } = this
    mesh.position.set(position.x, position.y / 4, position.z)
    mesh.setRotationFromEuler(new THREE.Euler(
      0,
      Math.atan(this.dz),
      Math.PI + 0.1 * Math.sin(this.phase) + smoothDir,
      'XZY'
    ))
  }
}

export class FishShrimpCloud {
  scene = new THREE.Scene()
  updateRadius = 4
  despawnRadius = 8
  mobs = new Set<Fish | Shrimp>()
  update(center: Point3D, dt: number) {
    const { mobs, scene, updateRadius, despawnRadius } = this
    const destroys: (Fish | Shrimp)[] = []
    mobs.forEach(mob => {
      const dist = distance(mob.position, center)
      if (dist < updateRadius) {
        mob.update(dt)
        mob.updateForRender()
      }
      if (dist > despawnRadius) destroys.push(mob)
    })
    destroys.forEach(mob => {
      scene.remove(mob.mesh)
      mobs.delete(mob)
    })
  }
  spawnFish(position: Point3D) {
    const fish = new Fish(position)
    this.scene.add(fish.mesh)
    this.mobs.add(fish)
  }
  spawnShrimp(position: Point3D) {
    const shrimp = new Shrimp(position)
    this.scene.add(shrimp.mesh)
    this.mobs.add(shrimp)
  }
}
