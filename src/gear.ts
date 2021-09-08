import { Ribbon, String3D } from './string'
import { RibbonRenderer } from './ribbon_mesh'
import { Jelly } from './jelly'
import * as THREE from 'three'
import { Point3D, normalize, scale as vectorScale, add as vectorAdd, sub as vectorSub, SmoothPoint3D } from './math'
import { BezierStringRenderer } from './string_mesh'


function generateCloverData() {
  return [0, 1, 2, 3].map(i => {
    const th = Math.PI * i / 2
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    const rand = (a: number) => a * (2 * Math.random() - 1)
    const line: Point3D[] = []
    for (let i = 0; i <= 10; i++) {
      const t = (2 * i / 10 - 1) * 3
      const x = 0.2 + 0.12 * Math.cos(t) + rand(0.01)
      const y = 0.12 * Math.sin(t) + rand(0.01)
      const z = 0.6 + rand(0.015) + x * x / 4
      line.push({
        x: x * cos - y * sin,
        y: x * sin + y * cos,
        z
      })
    }
    return line
  })
}

let cloverLines: Point3D[][] | null = null
export function addClover(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  if (!cloverLines) cloverLines = generateCloverData()
  const cloverStringProfile = stringRenderer.getPlainProfile({ l: 6, r: 12 }, 0.03, new THREE.Color(0xff8844))
  function renderCloverAttachment(positions: Point3D[]) {
    cloverStringProfile.request(
      [...new Array(positions.length - 3)].map((_, i) => {
        const a = positions[i]
        const b = positions[i + 1]
        const c = positions[i + 2]
        const d = positions[i + 3]
        return [
          b,
          vectorAdd(b, vectorScale(vectorSub(c, a), 1 / 6)),
          vectorAdd(c, vectorScale(vectorSub(d, b), -1 / 6)),
          c
        ]
      }),
    )
  }
  for (const line of cloverLines) {
    jelly.addAttachment(line, renderCloverAttachment)
  }
}

function generateGamingData() {
  const lines: Point3D[][] = []
  const n = 16
  for (let i = 0; i < n; i++) {
    const th = 2 * Math.PI * i / n
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    const line: Point3D[] = []
    const m = 8
    for (let j = 0; j <= m; j++) {
      const rth = Math.PI * j / m / 2
      const r = Math.sin(rth)
      const z = 1 - Math.cos(rth)
      const randFactor = 0.5 * (1 - j / m) * j / m
      const xyrand = randFactor * (Math.random() - 0.5) / 4
      line.push({ x: r * cos - xyrand * sin, y: r * sin + xyrand * cos, z: z + Math.random() * randFactor })
    }
    lines.push(line)
  }
  return lines
}

let gamingLines: Point3D[][] | null = null
export function addGaming(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  const gamingStringProfile = stringRenderer.getVaryingProfile({ l: 6, r: 12 }, 0.02)
  function renderGamingAttachment(positions: Point3D[]) {
    const time = performance.now() / 1000
    function colorAt(t: number) {
      const brightness = t * 6
      return {
        r: Math.max(0, 0.5 + Math.cos(time + 4 * t)) * brightness,
        g: Math.max(0, 0.5 + Math.cos(time + 4 * t + 2 * Math.PI / 3)) * brightness,
        b: Math.max(0, 0.5 + Math.cos(time + 4 * t + 4 * Math.PI / 3)) * brightness
      }
    }
    gamingStringProfile.request(
      [...new Array(positions.length - 3)].map((_, i) => {
        const t1 = i / positions.length
        const t2 = (i + 1) / positions.length
        const a = positions[i]
        const b = positions[i + 1]
        const c = positions[i + 2]
        const d = positions[i + 3]
        return [
          b,
          vectorAdd(b, vectorScale(vectorSub(c, a), 1 / 6)),
          vectorAdd(c, vectorScale(vectorSub(d, b), -1 / 6)),
          c,
          colorAt(t1),
          colorAt(t2)
        ]
      }),
    )
  }
  if (!gamingLines) gamingLines = generateGamingData()
  for (const line of gamingLines) {
    jelly.addAttachment(line, renderGamingAttachment)
  }
}

export function addRibbonString(jelly: Jelly) {
  const ribbonSegments = 20
  const ribbonRenderer = new RibbonRenderer(ribbonSegments, 0.3, 0.3)
  function renderRibbon(string: String3D, ribbon: Ribbon, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    ribbonRenderer.render(renderer, camera, string, ribbon)
  }
  for (let i = 0; i < 4; i++) {
    const th = 2 * Math.PI * i / 4 + 1
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    jelly.addString(
      {
        pos: { x: 0.3 * cos, y: 0.3 * sin, z: 1 },
        dir: { x: cos, y: sin, z: 10 },
        n: 4,
        f: 10
      },
      new String3D(ribbonSegments, 2, 1),
      renderRibbon,
      'ribbon',
      true
    )
  }
}

export function addMiddleString(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  const whiteBlueStringProfile = stringRenderer.getPlainProfile({ l: 4, r: 5 }, 0.015, new THREE.Color(0xBFBFFF))
  function requestWhiteBlueString(string: String3D) {
    whiteBlueStringProfile.request(string.bezierSegments())
  }
  for (let i = 0; i < 8; i++) {
    const th = 2 * Math.PI * (i + 0.5) / 8
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    jelly.addString(
      {
        pos: { x: 0.98 * cos, y: 0.98 * sin, z: 0.9 },
        dir: { x: cos, y: sin, z: 4 },
        n: 6,
        f: 10
      },
      new String3D(40, 1.4 + 0.2 * Math.random(), 0.5),
      requestWhiteBlueString,
      'middle'
    )
  }
}

export function addLongString(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  const whiteBlueStringProfile = stringRenderer.getPlainProfile({ l: 4, r: 5 }, 0.015, new THREE.Color(0xBFBFFF))
  function requestWhiteBlueString(string: String3D) {
    whiteBlueStringProfile.request(string.bezierSegments())
  }
  for (let i = 0; i < 8; i++) {
    const th = 2 * Math.PI * i / 8
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    jelly.addString(
      {
        pos: { x: 0.98 * cos, y: 0.98 * sin, z: 0.9 },
        dir: { x: cos, y: sin, z: 4 },
        n: 10,
        f: 10
      },
      new String3D(100, 3 + 0.5 * Math.random(), 1.5),
      requestWhiteBlueString,
      'long'
    )
  }
}

export function addShortString(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  const thinStringProfile = stringRenderer.getPlainProfile({ l: 4, r: 5 }, 0.01, new THREE.Color(0xBFBFFF))
  function requestThinString(string: String3D) {
    thinStringProfile.request(string.bezierSegments())
  }
  for (let i = 0; i < 128; i++) {
    const th = 2 * Math.PI * i / 128
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    jelly.addString(
      {
        pos: { x: cos, y: sin, z: 1 },
        dir: { x: cos, y: sin, z: 4 },
        n: 4,
        f: 10
      },
      new String3D(5, 0.2 + 0.1 * Math.random(), 0.1),
      requestThinString,
      'short'
    )
  }
}

export function addHanagasa(jelly: Jelly, stringRenderer: BezierStringRenderer) {
  const varyingStringProfile = stringRenderer.getVaryingProfile({ l: 4, r: 5 }, 0.015)
  function requestHanagasaString(string: String3D) {
    varyingStringProfile.request(string.bezierSegmentsWithColor({ r: 0.4, g: 0.5, b: 0.5 }, { r: 0.6, g: 0, b: 0 }))
  }
  for (let i = 0; i < 64; i++) {
    const th = 2 * Math.PI * i / 64
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    const rth = Math.PI / 2 * Math.sqrt(Math.random())
    const r = Math.sin(rth)
    let z = Math.cos(rth)
    jelly.addString(
      {
        pos: { x: r * cos, y: r * sin, z: 1 - z },
        dir: { x: 0, y: 0, z: -1 },
        n: 4,
        f: 10
      },
      new String3D(10, 0.15, 0.1),
      requestHanagasaString,
      'hanagasa'
    )
  }
}