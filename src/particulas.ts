// Partículas simples (confeti, estrellas, chispitas) en un solo InstancedMesh.

import * as THREE from 'three'

type Particula = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  giro: number
  tam: number
  vida: number
  dur: number
}

export type Emision = {
  x: number
  y: number
  vx: number
  vy: number
  tam: number
  color: THREE.ColorRepresentation
  dur: number
  vrot?: number
}

const dummy = new THREE.Object3D()
const color = new THREE.Color()

export class Particulas {
  readonly mesh: THREE.InstancedMesh
  private readonly ps: Particula[] = []
  private siguiente = 0

  constructor(
    geo: THREE.BufferGeometry,
    private readonly max: number,
    private readonly z: number,
    private readonly gravedad: number,
    /** Si gira «hacia la pantalla» como un papelito (confeti). */
    private readonly aletea = false,
  ) {
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), max)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = z
    for (let i = 0; i < max; i++) {
      this.ps.push({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, giro: 0, tam: 0, vida: 0, dur: 0 })
      this.mesh.setColorAt(i, color.set(0xffffff))
    }
    this.ocultarTodas()
  }

  emitir(e: Emision): void {
    const i = this.siguiente
    this.siguiente = (i + 1) % this.max
    const p = this.ps[i]
    Object.assign(p, {
      x: e.x,
      y: e.y,
      vx: e.vx,
      vy: e.vy,
      rot: Math.random() * Math.PI * 2,
      vrot: e.vrot ?? (Math.random() - 0.5) * 8,
      giro: Math.random() * Math.PI * 2,
      tam: e.tam,
      vida: e.dur,
      dur: e.dur,
    })
    this.mesh.setColorAt(i, color.set(e.color))
    this.mesh.instanceColor!.needsUpdate = true
  }

  actualizar(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      const p = this.ps[i]
      if (p.vida <= 0) continue
      p.vida -= dt
      p.vy += this.gravedad * dt
      if (this.aletea) p.vx *= 1 - 1.2 * dt
      p.x += p.vx * dt + (this.aletea ? Math.sin(p.giro) * 30 * dt : 0)
      p.y += p.vy * dt
      p.rot += p.vrot * dt
      p.giro += 6 * dt
      const k = Math.max(0, p.vida) / p.dur
      const s = p.tam * Math.min(1, k * 3.5)
      dummy.position.set(p.x, p.y, this.z)
      dummy.rotation.set(0, 0, p.rot)
      dummy.scale.set(this.aletea ? s * Math.abs(Math.cos(p.giro)) + s * 0.1 : s, s, 1)
      dummy.updateMatrix()
      this.mesh.setMatrixAt(i, dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  ocultarTodas(): void {
    dummy.scale.set(0, 0, 0)
    dummy.updateMatrix()
    for (let i = 0; i < this.max; i++) {
      this.ps[i].vida = 0
      this.mesh.setMatrixAt(i, dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
