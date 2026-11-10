import { describe, expect, it } from 'vitest'
import { PASO, digitosDe, type Punto } from './digitos'
import { Trazado } from './trazo'

const medidas = { tolerancia: 0.2, fuera: 0.5, ventana: Math.round(0.3 / PASO), margenFinal: 5 }

function trazosDe(n: number): Punto[][] {
  return digitosDe(n).flatMap((d) => d.trazos)
}

/** Recorre cada trazo con un dedo que tiembla un poco. */
function recorrer(t: Trazado, ruido = 0.05): void {
  while (!t.terminado) {
    const pts = t.trazo!
    expect(t.empezar(pts[0])).toBe(true)
    for (let i = 0; i < pts.length; i += 3) {
      const r = ruido * Math.sin(i * 1.7)
      t.mover({ x: pts[i].x + r, y: pts[i].y - r })
    }
    t.mover(pts[pts.length - 1])
  }
}

describe('Trazado', () => {
  it.each([10, 11, 12, 13, 14, 15, 16])('se completa siguiendo los trazos de %i', (n) => {
    const t = new Trazado(trazosDe(n), medidas)
    recorrer(t)
    expect(t.terminado).toBe(true)
  })

  it('no deja empezar lejos del punto de inicio', () => {
    const t = new Trazado(trazosDe(10), medidas)
    const fin = t.trazo![t.trazo!.length - 1]
    expect(t.empezar(fin)).toBe(false)
  })

  it('no deja saltar al final del trazo', () => {
    const t = new Trazado(trazosDe(10), medidas)
    const pts = t.trazo!
    t.empezar(pts[0])
    expect(t.mover(pts[pts.length - 1])).toBe('fuera')
    expect(t.iTrazo).toBe(0)
  })

  it('el cero no se cierra recorriéndolo al revés', () => {
    const t = new Trazado(trazosDe(10), medidas)
    t.iTrazo = 1
    const pts = t.trazo!
    t.empezar(pts[0])
    for (let i = pts.length - 1; i > pts.length / 2; i -= 3) t.mover(pts[i])
    expect(t.iTrazo).toBe(1)
    expect(t.progreso).toBeLessThan(pts.length / 4)
  })

  it('los trazos quedan remuestreados a paso fijo', () => {
    for (const trazo of trazosDe(16)) {
      for (let i = 1; i < trazo.length - 1; i++) {
        const d = Math.hypot(trazo[i].x - trazo[i - 1].x, trazo[i].y - trazo[i - 1].y)
        expect(d).toBeLessThan(PASO * 1.01)
      }
    }
  })
})
