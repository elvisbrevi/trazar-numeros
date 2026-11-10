// Dibujo del número a trazar: la silueta difuminada, la guía punteada del
// trazo actual, el relleno de color que sigue al dedo y el marcador de inicio.

import * as THREE from 'three'
import { ALTO, type Digito, type Punto } from './digitos'
import { Cinta, geoCirculo, geoFlecha, tono } from './formas'
import type { Trazado } from './trazo'

const SEPARACION = 0.3
/** Medio grosor del trazo, en unidades de la celda del dígito. */
const GROSOR = 0.085

/** Escala (px por unidad) para que el número quepa en el área disponible. */
export function medirEscala(digitos: Digito[], ancho: number, alto: number): number {
  const total = digitos.reduce((s, d) => s + d.ancho, 0) + SEPARACION * (digitos.length - 1)
  return Math.min(ancho / total, alto / ALTO)
}

type CapasTrazo = { guia: Cinta; borde: Cinta; relleno: Cinta; brillo: Cinta }

function texturaMano(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.font = '96px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('👆', 64, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let mano: THREE.CanvasTexture | null = null

export class VistaNumero {
  readonly grupo = new THREE.Group()
  /** Trazos en coordenadas locales del grupo (px), en orden de escritura. */
  readonly trazos: Punto[][] = []
  readonly radio: number
  private readonly capas: CapasTrazo[] = []
  private readonly fijas: Cinta[] = []
  private readonly cabeza = new THREE.Group()
  private readonly flecha: THREE.Mesh
  private readonly demo = new THREE.Group()
  private readonly materiales: THREE.Material[] = []
  private sacudida = 0

  constructor(digitos: Digito[], escala: number, colores: string[]) {
    const s = escala
    const r = (this.radio = GROSOR * s)
    const total = digitos.reduce((a, d) => a + d.ancho, 0) + SEPARACION * (digitos.length - 1)
    let x0 = 0
    digitos.forEach((d, i) => {
      const color = colores[i % colores.length]
      for (const trazo of d.trazos) {
        const pts = trazo.map((q) => ({ x: (x0 + q.x - total / 2) * s, y: (q.y - ALTO / 2) * s }))
        this.trazos.push(pts)
        // Silueta difuminada: un halo blanco ancho y el cuerpo lila suave.
        const halo = new Cinta(pts, r * 2, '#ffffff', 1, 0.4)
        const cuerpo = new Cinta(pts, r * 1.08, '#c9c0f5', 2, 0.85)
        const guia = new Cinta(
          pts.filter((_, k) => k % 9 === 4),
          r * 0.22,
          '#ffffff',
          3,
        )
        const borde = new Cinta(pts, r * 1.16, tono(color, 0.72), 4)
        const relleno = new Cinta(pts, r * 0.95, color, 5)
        const brillo = new Cinta(
          pts.map((q) => ({ x: q.x - r * 0.25, y: q.y + r * 0.3 })),
          r * 0.28,
          tono(color, 1.35),
          6,
        )
        for (const c of [borde, relleno, brillo]) c.visibles = 0
        this.fijas.push(halo, cuerpo)
        this.capas.push({ guia, borde, relleno, brillo })
        for (const c of [halo, cuerpo, guia, borde, relleno, brillo]) this.grupo.add(c.mesh)
      }
      x0 += d.ancho + SEPARACION
    })

    // Marcador de dónde apoyar el dedo, con una flecha que indica la dirección.
    const disco = (radio: number, color: string, z: number) => {
      const mat = new THREE.MeshBasicMaterial({ color })
      this.materiales.push(mat)
      const m = new THREE.Mesh(geoCirculo, mat)
      m.scale.set(radio, radio, 1)
      m.position.z = z
      m.renderOrder = z
      return m
    }
    this.cabeza.add(disco(r * 1.65, '#ffffff', 8), disco(r * 1.3, '#58cc02', 8.5))
    const matFlecha = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    this.materiales.push(matFlecha)
    this.flecha = new THREE.Mesh(geoFlecha, matFlecha)
    this.flecha.scale.set(r * 0.85, r * 0.85, 1)
    this.flecha.position.z = 9
    this.flecha.renderOrder = 9
    this.cabeza.add(this.flecha)
    this.grupo.add(this.cabeza)

    // Manito que muestra el recorrido cuando el niño no sabe por dónde seguir.
    mano ??= texturaMano()
    const matMano = new THREE.MeshBasicMaterial({ map: mano, transparent: true, depthTest: false })
    const matPunto = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthTest: false })
    this.materiales.push(matMano, matPunto)
    const punto = new THREE.Mesh(geoCirculo, matPunto)
    punto.scale.set(r * 0.9, r * 0.9, 1)
    const dedo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matMano)
    const tam = Math.max(r * 4.2, 56)
    dedo.scale.set(tam, tam, 1)
    dedo.position.set(tam * 0.08, -tam * 0.42, 0)
    this.demo.add(punto, dedo)
    this.demo.renderOrder = 30
    punto.renderOrder = dedo.renderOrder = 30
    this.demo.visible = false
    this.grupo.add(this.demo)
  }

  sacudir(): void {
    this.sacudida = 0.45
  }

  /** Refleja el estado del trazado. `quieto` son los segundos sin dibujar. */
  actualizar(tr: Trazado, t: number, dt: number, quieto: number): void {
    this.capas.forEach((c, k) => {
      const n = this.trazos[k].length
      const visibles = k < tr.iTrazo ? n : k === tr.iTrazo && (tr.progreso > 0 || tr.dibujando) ? tr.progreso + 1 : 0
      c.borde.visibles = c.relleno.visibles = c.brillo.visibles = visibles
      c.guia.mesh.visible = k === tr.iTrazo
    })

    const pts = tr.trazo
    this.cabeza.visible = !!pts
    this.demo.visible = false
    if (!pts) return

    const q = pts[tr.progreso]
    const adelante = pts[Math.min(pts.length - 1, tr.progreso + 8)]
    this.sacudida = Math.max(0, this.sacudida - dt)
    const temblor = Math.sin(this.sacudida * 40) * this.sacudida * this.radio * 1.2
    this.cabeza.position.set(q.x + temblor, q.y, 0)
    this.flecha.rotation.z = Math.atan2(adelante.y - q.y, adelante.x - q.x)
    this.cabeza.scale.setScalar(tr.dibujando ? 1 : 1 + 0.12 * Math.sin(t * 6))

    // Demostración: la manito recorre lo que falta del trazo una y otra vez.
    if (!tr.dibujando && quieto > 2) {
      const ciclo = (quieto - 2) % 2.8
      const k = Math.min(1, ciclo / 1.9)
      if (ciclo < 2.3) {
        const suave = k * k * (3 - 2 * k)
        const i = Math.round(tr.progreso + (pts.length - 1 - tr.progreso) * suave)
        this.demo.position.set(pts[i].x, pts[i].y, 20)
        this.demo.visible = true
      }
    }
  }

  liberar(): void {
    for (const c of this.fijas) c.liberar()
    for (const c of this.capas) for (const x of Object.values(c)) x.liberar()
    for (const m of this.materiales) m.dispose()
    this.grupo.removeFromParent()
  }
}
