import * as THREE from 'three'
import { Point3D, distance, dot, cross, normalize, sub, scale } from './math'

const vertexShader = `
precision mediump float;
uniform vec3 pa, pb, pc, na, nb, nc;
uniform vec3 tab, tbc, tca, tba, tcb, tac;
varying vec3 vposition, vnormal;
void main() {
  float wb = position.x;
  float wc = position.y;
  float wa = 1.0 - wb - wc;
  vec3 p = (pa + pb + pc) / 3.0 + (tab + tba + tbc + tcb + tca + tac) / 3.0 * 2.0 / 3.0;
  vec3 a = pa * wa + (pa + tab) * wb + (pa + tac) * wc;
  vec3 b = pb * wb + (pb + tbc) * wc + (pb + tba) * wa;
  vec3 c = pc * wc + (pc + tca) * wa + (pc + tcb) * wb;
  vec3 ab = (pa + tab) * wa + (pb + tba) * wb + p * wc;
  vec3 bc = (pb + tbc) * wb + (pc + tcb) * wc + p * wa;
  vec3 ca = (pc + tca) * wc + (pa + tac) * wa + p * wb;
  vec3 aa = a * wa + ab * wb + ca * wc;
  vec3 bb = b * wb + bc * wc + ab * wa;
  vec3 cc = c * wc + ca * wa + bc * wb;
  vposition = aa * wa + bb * wb + cc * wc;
  vnormal = na * wa + nb * wb + nc * wc;
  gl_Position = projectionMatrix * viewMatrix * vec4(vposition, 1);
}
`

const fragmentShader = `
varying vec3 vposition, vnormal;
void main() {
  float d = dot(normalize(cameraPosition - vposition), normalize(vnormal));
  d *= d;
  gl_FragColor = vec4(vec3(0.4, 0.4, 0.8) * (1.0 - d) * d, 1);
}
`

function createSurfaceGeometry(numSegments: number) {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []
  for (let ij = 0; ij <= numSegments; ij++) {
    for (let i = 0; i <= ij; i++) {
      const j = ij - i
      positions.push(i / numSegments, j / numSegments, 0)
    }
  }
  for (let ij = 0; ij < numSegments; ij++) {
    for (let i = 0; i <= ij; i++) {
      const idx = ij * (ij + 1) / 2 + i
      const idx2 =  idx + ij + 1
      indices.push(idx, idx2, idx2 + 1)
      if (i < ij) indices.push(idx, idx2 + 1, idx + 1)
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}

export class BezierSurfaceRenderer {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  geometry: THREE.BufferGeometry
  scene = new THREE.Scene()
  uniforms = {
    pa: { value: new THREE.Vector3() },
    pb: { value: new THREE.Vector3() },
    pc: { value: new THREE.Vector3() },
    na: { value: new THREE.Vector3() },
    nb: { value: new THREE.Vector3() },
    nc: { value: new THREE.Vector3() },
    tab: { value: new THREE.Vector3() },
    tac: { value: new THREE.Vector3() },
    tba: { value: new THREE.Vector3() },
    tbc: { value: new THREE.Vector3() },
    tca: { value: new THREE.Vector3() },
    tcb: { value: new THREE.Vector3() }
  }
  constructor(public numSegments: number) {
    this.geometry = createSurfaceGeometry(numSegments)
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera, pa: Point3D, pb: Point3D, pc: Point3D, na: Point3D, nb: Point3D, nc: Point3D) {
    this.uniforms.pa.value.set(pa.x, pa.y, pa.z)
    this.uniforms.pb.value.set(pb.x, pb.y, pb.z)
    this.uniforms.pc.value.set(pc.x, pc.y, pc.z)
    this.uniforms.na.value.set(na.x, na.y, na.z)
    this.uniforms.nb.value.set(nb.x, nb.y, nb.z)
    this.uniforms.nc.value.set(nc.x, nc.y, nc.z)
    function set(v: THREE.Vector3, p: Point3D, q: Point3D, n: Point3D) {
      const len = distance(p, q)
      const d = sub(q, p)
      n = normalize(n)
      const t = scale(normalize(sub(d, scale(n, dot(d, n)))), len / 3)
      v.set(t.x, t.y, t.z)
    }
    set(this.uniforms.tab.value, pa, pb, na)
    set(this.uniforms.tba.value, pb, pa, nb)
    set(this.uniforms.tbc.value, pb, pc, nb)
    set(this.uniforms.tcb.value, pc, pb, nc)
    set(this.uniforms.tca.value, pc, pa, nc)
    set(this.uniforms.tac.value, pa, pc, na)
    this.material.needsUpdate = true
    renderer.render(this.scene, camera)
  }

}
