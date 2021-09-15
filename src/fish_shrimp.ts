import { distance, Point3D, randomDirection } from './math'
import * as THREE from 'three'
import { Mesh } from 'three'
import type { HitMap } from './hitmap'

type XY = [number, number]
type XYZ = [number, number, number]
export type HitFunc = (x: number, z: number) => boolean

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

export class Shrimp {
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
  update2D(dt: number, hitFunc: HitFunc) {
    this.updateBase(dt)
    const { position, jump } = this
    const x2 = position.x + 2 * jump.x * dt
    position.y += 2 * jump.y * dt
    const z2 = position.z + 2 * jump.z * dt
    if (!hitFunc(x2, z2)) {
      position.x = x2
      position.z = z2
    }
  }
  update3D(dt: number, radius: number) {
    this.updateBase(dt)
    const { position, jump } = this
    const x = position.x + 2 * jump.x * dt
    const y = position.y + 2 * jump.y * dt
    const z = position.z + 2 * jump.z * dt
    const r2 = x * x + y * y + z * z
    if (r2 > radius * radius) {
      const r = Math.sqrt(r2)
      const scale = radius / r
      position.x = x * scale
      position.y = y * scale
      position.z = z * scale
      const dot = (jump.x * x + jump.y * y + jump.z * z) / r
      const s = 2 * dot / r
      jump.x -= s * x
      jump.y -= s * y
      jump.z -= s * z
    } else {
      position.x = x
      position.y = y
      position.z = z
    }
  }
  updateBase(dt: number) {
    const { position, jump } = this
    this.phase += Math.random() * dt
    if (this.phase > 1) {
      this.phase = 0.5 * Math.random()
      this.thzDst = 0.4 * Math.random() - 0.2
      this.thDst = this.th + Math.PI / 3 * (2 * Math.random() - 1)
      const dz = Math.random() - 0.5
      const dr = Math.sqrt(1 - dz * dz)
      jump.x = dr * Math.cos(this.thDst)
      jump.y = dr * Math.sin(this.thDst)
      jump.z = dz
      this.thz += 0.5
    }
    const s = 1 - 8 * dt
    jump.x *= s
    jump.y *= s
    jump.z *= s
    this.th = this.th * s + (1 - s) * this.thDst
    this.thz = this.thz * s + (1 - s) * this.thzDst
  }
  updateForRender(yscale = 1 / 4) {
    const { mesh, position, th } = this
    mesh.position.set(position.x, position.y * yscale, position.z)
    mesh.setRotationFromEuler(new THREE.Euler(
      0,
      Math.atan(this.thz),
      th,
      'XZY'
    ))
  }
}

export class Fish {
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
  updateBase(dt: number) {
    const { position, spawnPosition } = this
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
  }
  update2D(dt: number, hitFunc: HitFunc) {
    this.updateBase(dt)
    const { v, position } = this
    const x2 = position.x + v * Math.cos(this.smoothDir) * dt
    position.y += v * Math.sin(this.smoothDir) * dt
    const z2 = position.z + v * this.dz * dt
    if (!hitFunc(x2, z2)) {
      position.x = x2
      position.z = z2
    }
    if (position.z > -0.2) position.z = -0.2
  }
  update3D(dt: number, radius: number) {
    this.updateBase(dt)
    const { v, position } = this
    const x = position.x + v * Math.cos(this.smoothDir) * dt
    const y = position.y + v * Math.sin(this.smoothDir) * dt
    const z = position.z + v * this.dz * dt
    const r2 = x * x + y * y + z * z
    if (r2 > radius * radius) {
      const scale = radius / Math.sqrt(r2)
      position.x = x * scale
      position.y = y * scale
      position.z = z * scale
    } else {
      position.x = x
      position.y = y
      position.z = z
    }
  }
  updateForRender(yscale = 1 / 4) {
    const { mesh, position, smoothDir } = this
    mesh.position.set(position.x, position.y * yscale, position.z)
    mesh.setRotationFromEuler(new THREE.Euler(
      0,
      Math.atan(this.dz),
      Math.PI + 0.1 * Math.sin(this.phase) + smoothDir,
      'XZY'
    ))
  }
}

const particleVertexShader = `
uniform float phase;
uniform vec3 destination;
void main() {
  gl_PointSize = 16.0;
  float phase2 = max(phase * 2.0 - 1.0, 0.0);
  vec3 gpos = (modelMatrix * vec4(phase * position, 1)).xyz + phase2 * phase2 * phase2 * destination;
  gl_Position = projectionMatrix * viewMatrix * vec4(gpos, 1);
}

`
const particleFragmentShader = `
uniform float phase;
uniform vec3 color;
void main() {
  vec2 xy = gl_PointCoord * 2.0 - 1.0;
  float v = clamp(2.0 * (1.0 - dot(xy, xy)), 0.0, 1.0);
  gl_FragColor = vec4(color * (1.0 - phase) * v, 1);
}
`
class Particle {
  mesh: THREE.Points
  uniforms: {
    phase: { value: number },
    color: { value: THREE.Color },
    destination: { value: THREE.Vector3 }
  }
  constructor(x: number, z: number, color: number, dst: Point3D) {
    this.uniforms = {
      phase: { value: 0 },
      destination: { value: new THREE.Vector3(dst.x - x, dst.y, dst.z - z) },
      color: { value: new THREE.Color(color) }
    }
    this.mesh = new THREE.Points(
      Particle.geometry(),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: particleFragmentShader,
        vertexShader: particleVertexShader,
        depthTest: false,
        blending: THREE.AdditiveBlending
      })
    )
    this.mesh.position.set(x, 0, z)
    const dir = randomDirection()
    this.mesh.setRotationFromAxisAngle(new THREE.Vector3(dir.x, dir.y, dir.z), 2 * Math.PI * Math.random())
  }
  static generatedGeometry: THREE.BufferGeometry | null = null
  static geometry() {
    if (this.generatedGeometry) return this.generatedGeometry
    const geometry = this.generatedGeometry = new THREE.BufferGeometry()
    const positions: number[] = []
    for (let i = 0; i < 16; i++) {
      const p = randomDirection()
      const r = 0.25
      positions.push(r * p.x, r * p.y, r * p.z)
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }
}

export class FishShrimpCloud {
  scene = new THREE.Scene()
  updateRadius = 5
  despawnRadius = 8
  mobs = new Set<Fish | Shrimp>()
  timer = 0
  maxCount = 64
  constructor(public hitFunc: HitFunc) {}
  effects: { phase: number; particle: Particle }[] = []
  addEffect(x: number, z: number, color: number, dst: Point3D) {
    const particle = new Particle(x, z, color, dst)
    this.effects.push({ phase: 0, particle })
    this.scene.add(particle.mesh)
  }
  initialSpawn(center: Point3D, radius: number) {
    this.scene.clear()
    this.mobs.clear()
    const { despawnRadius } = this
    for (let i = 0; i < 20; i++) {
      const x = center.x - despawnRadius + 2 * despawnRadius * Math.random()
      const z = center.z - despawnRadius + 2 * despawnRadius * Math.random()
      if ((x - center.x) ** 2 + (z - center.z) ** 2 > despawnRadius ** 2) continue
      this.spawnMultiple(x, z, center, radius)
      if (this.mobs.size > this.maxCount) break
    }
  }
  update(center: Point3D, dst: Point3D, dt: number, hitMap: HitMap, tap: { x: number; z: number } | null) {
    const { mobs, scene, updateRadius, despawnRadius } = this
    const destroys: (Fish | Shrimp)[] = []
    const tapR2 = 0.75 ** 2
    mobs.forEach(mob => {
      const dist = distance(mob.position, center)
      if (dist < updateRadius) {
        mob.update2D(dt, this.hitFunc)
        mob.updateForRender()
        const { x, z } = mob.position
        if (hitMap.hitTest(x, z) || (tap && (x - tap.x) ** 2 + (z - tap.z) ** 2 < tapR2)) {
          destroys.push(mob)
          this.addEffect(x, z, mob instanceof Fish ? 0x8888ff : 0xff8888, dst)
        }
      } else if (dist > despawnRadius || Math.random() < 0.1 * dt) {
        destroys.push(mob)
      }
    })
    destroys.forEach(mob => {
      scene.remove(mob.mesh)
      mobs.delete(mob)
    })
    this.timer += dt
    if (this.timer > 0.25 && this.mobs.size < this.maxCount) {
      const x = center.x - despawnRadius + 2 * despawnRadius * Math.random()
      const z = center.z - despawnRadius + 2 * despawnRadius * Math.random()
      const r2 = (x - center.x) ** 2 + (z - center.z) ** 2
      if (updateRadius ** 2 < r2 && r2 < despawnRadius ** 2) this.spawnMultiple(x, z, center, updateRadius)
      this.timer = 0
    }
    for (const e of this.effects) {
      e.phase += 3 * dt
      e.particle.uniforms.phase.value = e.phase
    }
    while (this.effects.length && this.effects[0].phase > 1) {
      const e = this.effects.shift()!
      this.scene.remove(e.particle.mesh)
    }
  }
  spawnMultiple(x: number, z: number, center: Point3D, minRadius: number) {
    const mode = Math.random() < 0.5
    const n = 2 + Math.random() * 10
    for (let i = 0; i < n; i++) {
      const rnd = randomDirection()
      const p = { x: x + rnd.x, y: rnd.y / 4, z: z + rnd.z }
      const r2 = (p.x - center.x) ** 2 + (p.z - center.z) ** 2
      if (minRadius ** 2 < r2) {
        if (mode) {
          this.spawnFish(p)
        } else {
          this.spawnShrimp(p)
        }
      }
    }
  }
  spawnFish(position: Point3D) {
    if (this.hitFunc(position.x, position.z)) return
    const fish = new Fish(position)
    fish.updateForRender()
    this.scene.add(fish.mesh)
    this.mobs.add(fish)
  }
  spawnShrimp(position: Point3D) {
    if (this.hitFunc(position.x, position.z)) return
    const shrimp = new Shrimp(position)
    shrimp.updateForRender()
    this.scene.add(shrimp.mesh)
    this.mobs.add(shrimp)
  }
}
