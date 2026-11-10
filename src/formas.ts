// Geometrías y capas compartidas por la escena.

import * as THREE from 'three'
import type { Punto } from './digitos'

export const geoCirculo = new THREE.CircleGeometry(1, 32)
export const geoConfeti = new THREE.PlaneGeometry(1, 0.6)
export const geoEstrella = estrella(5, 1, 0.45)
export const geoDestello = estrella(4, 1, 0.3)
export const geoFlecha = new THREE.ShapeGeometry(
  new THREE.Shape([new THREE.Vector2(-0.45, -0.55), new THREE.Vector2(0.65, 0), new THREE.Vector2(-0.45, 0.55)]),
)

function estrella(puntas: number, rExt: number, rInt: number): THREE.ShapeGeometry {
  const forma = new THREE.Shape()
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt
    const a = Math.PI / 2 + (i * Math.PI) / puntas
    if (i === 0) forma.moveTo(r * Math.cos(a), r * Math.sin(a))
    else forma.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  forma.closePath()
  return new THREE.ShapeGeometry(forma)
}

/**
 * Una línea gruesa hecha de círculos instanciados, uno por punto del trazo.
 * Todos los círculos de una capa están a la misma z y la prueba de
 * profundidad es «menor estricto»: cada píxel se pinta una sola vez por capa,
 * así las capas semitransparentes no se ven más oscuras donde se solapan.
 */
export class Cinta {
  readonly mesh: THREE.InstancedMesh

  constructor(pts: Punto[], radio: number, color: THREE.ColorRepresentation, z: number, opacidad = 1) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: opacidad < 1,
      opacity: opacidad,
      depthFunc: THREE.LessDepth,
      depthWrite: true,
    })
    this.mesh = new THREE.InstancedMesh(geoCirculo, mat, pts.length)
    const m = new THREE.Matrix4()
    pts.forEach((q, i) => {
      m.makeScale(radio, radio, 1).setPosition(q.x, q.y, z)
      this.mesh.setMatrixAt(i, m)
    })
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = z
  }

  set visibles(n: number) {
    this.mesh.count = n
  }

  liberar(): void {
    this.mesh.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}

/** Color más oscuro (f < 1) o más claro (f > 1) para bordes y brillos. */
export function tono(color: string, f: number): THREE.Color {
  const c = new THREE.Color(color)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return c.setHSL(hsl.h, hsl.s, Math.min(0.95, hsl.l * f))
}
