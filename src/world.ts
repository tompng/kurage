import { Jelly, boundingPolygonHitPosition } from './jelly'
import * as THREE from 'three'
import { Point3D, normalize, cross, dot, sub as vectorSub, SmoothPoint3D } from './math'
import { BezierStringRenderer } from './string_mesh'
import { OceanDust, OceanDark, OceanSurface, OceanTerrain } from './ocean'
import { Terrain } from './terrain'
import { FishShrimpCloud } from './fish_shrimp'
import { HitMap } from './hitmap'

const terrain = new Terrain()
export class World {
  hitMap = new HitMap(64, 4)
  oceanTerrain = new OceanTerrain(terrain.geometries)
  fsCloud = new FishShrimpCloud((x, z) => terrain.hitTest(x, z))
  renderTarget = new THREE.WebGLRenderTarget(16, 16, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType
  })
  targetRenderScene = new THREE.Scene()
  targetRenderCamera = new THREE.Camera()
  centerPosition: SmoothPoint3D
  constructor(public jelly: Jelly) {
    this.centerPosition = new SmoothPoint3D(jelly.position, 0.5)
    const targetRenderMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: this.renderTarget.texture }))
    targetRenderMesh.scale.x = targetRenderMesh.scale.y = 2
    this.targetRenderScene.add(targetRenderMesh)
  }
  oceanDust = new OceanDust(256)
  oceanDark = new OceanDark()
  oceanSurface = new OceanSurface()
  jellies: Jelly[] = []

  player = {
    x: 0, z: -2,
    vx: 0, vz: 0,
    th: Math.PI,
    dstTheta: Math.PI
  }
  stringRenderer = new BezierStringRenderer(4, 5)

  update(dt: number, touchPosition: Point3D | null) {
    const { player, jelly } = this
    this.oceanSurface.update(dt)
    this.centerPosition.update(jelly.position, dt)
    const currentDir = normalize(vectorSub(jelly.transformLocalPoint({ x: 0, y: 0, z: -1 }), jelly.position))
    const targetDir = normalize({ x: Math.cos(player.th), y: 0, z: Math.sin(player.th) })
    const rot = normalize(cross(currentDir, targetDir))
    const d = Math.sqrt(1 - Math.cos(player.dstTheta - player.th)) * (Math.sin(player.dstTheta - player.th) > 0 ? 1 : -1)
    player.vx += -player.vx * 8 * dt + 2 * (currentDir.x + Math.cos(player.dstTheta)) * dt
    player.vz += -player.vz * 8 * dt + 2 * (currentDir.z + Math.sin(player.dstTheta)) * dt
    const vdot = Math.cos(player.th) * player.vx + Math.sin(player.th) * player.vz
    player.th += d * (0.2 + Math.min(Math.max(0, 100 * vdot), 0.6)) * dt
    jelly.velocity.x = player.vx
    jelly.velocity.y = 0
    jelly.velocity.z = player.vz

    this.jellies.forEach(j => {
      const p = boundingPolygonHitPosition(jelly.boundingPolygon(), j.boundingPolygon())
      if (p) {
        const dx = j.position.x - p.x
        const dz = j.position.z - p.z
        const dr = Math.hypot(dx, dz)
        j.velocity.x = dx / dr
        j.velocity.z = dz / dr
        player.vx -= dx / dr * 5 * dt
        player.vz -= dz / dr * 5 * dt
      }
    })

    this.jellies.forEach(j1 => {
      this.jellies.forEach(j2 => {
        if (j1 === j2) return
        const p = boundingPolygonHitPosition(j1.boundingPolygon(), j2.boundingPolygon())
        if (p) {
          const dx = j1.position.x - j2.position.x
          const dz = j1.position.z - j2.position.z
          const dr = Math.hypot(dx, dz)
          j1.velocity.x = dx / dr
          j1.velocity.z = dz / dr
          j2.velocity.x -= dx / dr * 5 * dt
          j2.velocity.z -= dz / dr * 5 * dt
        }
      })
    })

    this.jellies.forEach(j => {
      j.boundingPolygon().forEach(p => {
        const norm = terrain.hitNormal(p.x, p.z)
        if (!norm) return
        const v = j.velocity
        let vdot = norm.x * v.x + norm.z * v.z
        if (vdot > 0) vdot /= 2
        v.x = v.x - norm.x * vdot + 20 * norm.x * dt
        v.z = v.z - norm.z * vdot + 20 * norm.z * dt
      })
    })

    if (!isNaN(rot.x)) {
      let theta = Math.atan(Math.acos(dot(currentDir, targetDir))) * 0.5
      jelly.velocity.x += currentDir.x * dt * 2
      jelly.velocity.y += currentDir.y * dt * 2
      jelly.velocity.z += currentDir.z * dt * 2
      // jelly.rotation = Matrix3.fromRotation(rot, theta).mult(jelly.rotation)
      const mscale = 1 - 10 * dt
      jelly.momentum.x = jelly.momentum.x * mscale + rot.x * theta
      jelly.momentum.y = jelly.momentum.y * mscale + rot.y * theta
      jelly.momentum.z = jelly.momentum.z * mscale + rot.z * theta
    }
    const polygon = jelly.boundingPolygon()
    polygon.forEach(p => {
      const norm = terrain.hitNormal(p.x, p.z)
      if (!norm) return
      let vdot = norm.x * player.vx + norm.z * player.vz
      if (vdot > 0) vdot /= 2
      player.vx = player.vx - norm.x * vdot + 2 * norm.x * dt
      player.vz = player.vz - norm.z * vdot + 2 * norm.z * dt
    })
    player.x += player.vx * dt
    player.z += player.vz * dt

    jelly.update(dt)
    this.jellies.forEach(j => j.update(dt))
    jelly.position.x = player.x
    jelly.position.y = 0
    jelly.position.z = player.z
    jelly.currentBoundingPolygon = null

    const { hitMap, centerPosition } = this
    hitMap.clear()
    hitMap.center.x = centerPosition.x
    hitMap.center.z = centerPosition.z
    jelly.collectPoints(ps => hitMap.addPoints(ps), true)
    this.fsCloud.update(centerPosition, jelly.position, dt, hitMap, touchPosition)
  }
  renderToOffScreen(renderer: THREE.WebGLRenderer, size: { width: number; height: number }, camera: THREE.Camera) {
    this.renderTarget.setSize(size.width, size.height)
    renderer.setRenderTarget(this.renderTarget)
    renderer.autoClear = false
    renderer.clearColor()
    renderer.clearDepth()
    camera.up.set(0, 0, 1)
    const { centerPosition } = this
    camera.position.set(centerPosition.x, centerPosition.y - 8, centerPosition.z)
    camera.lookAt(centerPosition.x, centerPosition.y, centerPosition.z)
    this.oceanTerrain.render(renderer, camera)
    this.oceanDark.render(renderer, camera)
    this.oceanSurface.render(renderer, camera)
    this.jelly.render(renderer, camera)
    this.jellies.forEach(j => j.render(renderer, camera))
    this.stringRenderer.render(renderer, camera)
    this.oceanDust.render(renderer, camera)
    renderer.render(this.fsCloud.scene, camera)
    renderer.setRenderTarget(null)
  }
  renderToScreen(renderer: THREE.WebGLRenderer) {
    renderer.setRenderTarget(null)
    renderer.render(this.targetRenderScene, this.targetRenderCamera)
  }
}
