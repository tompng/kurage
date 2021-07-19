import vertexShader from './shaders/jelly.vert'
import * as THREE from 'three'

const fragmentShader = `
precision mediump float;
varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;
void main() {
  gl_FragColor = vec4(1,1,1,0.1);
}
`
const coordIDs = ['000', '001', '010', '011', '100', '101', '110', '111'] as const
type CoordID = '000' | '001' | '010' | '011' | '100' | '101' | '110' | '111'
type PositionUniformKey = `v${CoordID}`
type AxisXUniformKey = `vx${CoordID}`
type AxisYUniformKey = `vy${CoordID}`
type AxisZUniformKey = `vz${CoordID}`

export type JellyUniforms = Record<PositionUniformKey | AxisXUniformKey | AxisYUniformKey | AxisZUniformKey, { value: THREE.Vector3 }>
function jellyUniforms() {
  const data: Record<string, { value: THREE.Vector3 } | undefined> = {}
  for (const id of coordIDs) {
    data['v' + id] = { value: new THREE.Vector3() }
    data['vx' + id] = { value: new THREE.Vector3() }
    data['vy' + id] = { value: new THREE.Vector3() }
    data['vz' + id] = { value: new THREE.Vector3() }
  }
  return data as JellyUniforms
}

export function createJellyShader() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: jellyUniforms(),
    wireframe: true,
    side: THREE.DoubleSide,
    transparent: true
  }) as Omit<THREE.ShaderMaterial, 'uniforms'> & { uniforms: JellyUniforms }
}

export function createJellyGeomety(width: number, radialSegments: number, outlineSegments: number) {
  const positions: number[] = []
  const tan1s: number[] = []
  const tan2s: number[] = []
  type XY = [number, number]
  const r = Math.hypot(1, width)
  const tan1u = [1, 0, 0]
  const tan1d = [-1 / r, -width / r, 0]
  const tan2 = [0, 1, 0]
  const add = ([ax, ay]: XY, [bx, by]: XY, [cx, cy]: XY) => {
    tan1s.push(...tan1u, ...tan1u, ...tan1u)
    tan1s.push(...tan1d, ...tan1d, ...tan1d)
    tan2s.push(...tan2, ...tan2, ...tan2)
    tan2s.push(...tan2, ...tan2, ...tan2)
    positions.push(ax, ay, 1, bx, by, 1, cx, cy, 1)
    positions.push(ax, ay, 1 - width * (1 - ax ** 2))
    positions.push(bx, by, 1 - width * (1 - bx ** 2))
    positions.push(cx, cy, 1 - width * (1 - cx ** 2))
  }
  let prevSegments: XY[] = [[0, 0], [0, 1]]
  for (let i = 1; i <= radialSegments; i++) {
    const x = i / radialSegments
    const n = Math.round((radialSegments + (outlineSegments - 1) * i) / radialSegments)
    const nextSegments: XY[] = []
    for (let j = 0; j <= n; j++) nextSegments.push([x, j / n])
    let pi = 0
    let ni = 0
    while (pi + 1 < prevSegments.length || ni < n) {
      if (pi / (prevSegments.length - 1) < ni / n) {
        add(prevSegments[pi], nextSegments[ni], prevSegments[++pi])
      } else {
        add(prevSegments[pi], nextSegments[ni], nextSegments[++ni])
      }
    }
    prevSegments = nextSegments
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1s), 3))
  geometry.setAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2s), 3))
  return geometry
}
