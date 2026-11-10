// Lógica del trazado, sin dibujo: sigue al dedo a lo largo del trazo actual.
// El avance sólo crece hacia adelante y en una ventana corta, así que hay que
// recorrer el trazo en su dirección (como en los juegos de caligrafía) y no
// se puede saltar al final ni cerrar un «0» al revés.

import type { Punto } from './digitos'

export type Resultado = 'nada' | 'avanzo' | 'fuera' | 'trazoListo' | 'numeroListo'

export type Medidas = {
  /** Distancia máxima del dedo al trazo para contar como avance. */
  tolerancia: number
  /** Distancia a partir de la cual se considera que el dedo se salió. */
  fuera: number
  /** Cuántos puntos por delante del avance se miran (evita atajos). */
  ventana: number
  /** Puntos que pueden faltar al final y el trazo igual se da por hecho. */
  margenFinal: number
}

export class Trazado {
  iTrazo = 0
  progreso = 0
  dibujando = false

  constructor(
    /** Todos los trazos del número, en orden, en las mismas unidades que el dedo. */
    public trazos: Punto[][],
    public medidas: Medidas,
  ) {}

  get trazo(): Punto[] | undefined {
    return this.trazos[this.iTrazo]
  }

  get terminado(): boolean {
    return this.iTrazo >= this.trazos.length
  }

  /** Punto donde tiene que apoyar el dedo para seguir. */
  get cabeza(): Punto | undefined {
    return this.trazo?.[this.progreso]
  }

  /** Devuelve true si el dedo cae cerca de la cabeza y empieza a dibujar. */
  empezar(q: Punto): boolean {
    const c = this.cabeza
    if (!c || this.dibujando) return this.dibujando
    this.dibujando = Math.hypot(q.x - c.x, q.y - c.y) <= this.medidas.tolerancia * 1.8
    return this.dibujando
  }

  soltar(): void {
    this.dibujando = false
  }

  mover(q: Punto): Resultado {
    const pts = this.trazo
    if (!pts || !this.dibujando) return 'nada'
    const { tolerancia, fuera, ventana, margenFinal } = this.medidas
    const tol2 = tolerancia * tolerancia
    const hasta = Math.min(pts.length - 1, this.progreso + ventana)
    let mejor = -1
    let minimo = Infinity
    for (let j = Math.max(0, this.progreso - ventana); j <= hasta; j++) {
      const d2 = (q.x - pts[j].x) ** 2 + (q.y - pts[j].y) ** 2
      if (d2 < minimo) minimo = d2
      if (j > this.progreso && d2 <= tol2) mejor = j
    }
    if (mejor < 0) {
      if (minimo > fuera * fuera) {
        this.dibujando = false
        return 'fuera'
      }
      return 'nada'
    }
    this.progreso = mejor
    if (this.progreso < pts.length - 1 - margenFinal) return 'avanzo'
    this.iTrazo++
    this.progreso = 0
    this.dibujando = false
    return this.terminado ? 'numeroListo' : 'trazoListo'
  }
}
