import { describe, expect, it } from 'vitest'
import { PASO, type Punto } from './digitos'
import { glifosDe } from './letras'
import { MODOS, siguienteEnRonda } from './modos'
import { Trazado } from './trazo'

// Las imágenes que hay de verdad en public/img.
const IMAGENES = new Set(Object.keys(import.meta.glob('../public/img/*.webp')).map((f) => f.replace('../public/', './')))

const medidas = { tolerancia: 0.2, fuera: 0.5, ventana: Math.round(0.3 / PASO), margenFinal: 5 }

function trazosDe(texto: string | number): Punto[][] {
  return glifosDe(String(texto)).flatMap((d) => d.trazos)
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
  const todos = MODOS.flatMap((m) => m.items.map((it) => [m.id, it.texto]))
  it.each(todos)('%s: se completa siguiendo los trazos de «%s»', (_, texto) => {
    const t = new Trazado(trazosDe(texto), medidas)
    recorrer(t)
    expect(t.terminado).toBe(true)
  })

  it('el punto de la i se hace con sólo tocarlo', () => {
    const t = new Trazado(trazosDe('i'), medidas)
    t.iTrazo = 1
    const punto = t.trazo!
    expect(t.empezar(punto[0])).toBe(true)
    expect(t.mover(punto[0])).toBe('numeroListo')
  })

  it('la u no se termina subiendo sólo el primer trazo', () => {
    const t = new Trazado(trazosDe('u'), medidas)
    const pts = t.trazo!
    t.empezar(pts[0])
    for (let i = 0; i < pts.length; i += 3) t.mover(pts[i])
    t.mover(pts[pts.length - 1])
    expect(t.iTrazo).toBe(1)
    expect(t.terminado).toBe(false)
  })

  it('cada modo tiene sus elementos con claves únicas y las imágenes donde corresponde', () => {
    expect(MODOS.find((m) => m.id === 'numeros')!.items.map((it) => it.texto)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1)),
    )
    for (const m of MODOS) {
      expect(new Set(m.items.map((it) => it.id)).size).toBe(m.items.length)
      if (m.id === 'numeros') continue
      for (const it of m.items) {
        expect(it.imagen).toMatch(/^\.\/img\/[a-z-]+\.webp$/)
        expect(IMAGENES.has(it.imagen!)).toBe(true)
      }
    }
    // Lo que se traza y se lee va sin tilde, y ninguna palabra se repite.
    for (const it of MODOS.flatMap((m) => m.items)) {
      expect(it.texto).not.toMatch(/[áéíóú]/i)
      expect(it.palabra).not.toMatch(/[áéíóú]/i)
    }
    const palabras = MODOS.find((m) => m.id === 'palabras')!.items
    expect(new Set(palabras.map((it) => it.texto)).size).toBe(palabras.length)
    expect(palabras.filter((it) => it.fila === 0).length).toBeGreaterThanOrEqual(5)
    expect(palabras.filter((it) => it.fila === 1).length).toBeGreaterThanOrEqual(5)
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
    for (const trazo of [...'0123456789AEIOUaeioump'].flatMap(trazosDe)) {
      for (let i = 1; i < trazo.length - 1; i++) {
        const d = Math.hypot(trazo[i].x - trazo[i - 1].x, trazo[i].y - trazo[i - 1].y)
        expect(d).toBeLessThan(PASO * 1.01)
      }
    }
  })
})

describe('siguienteEnRonda', () => {
  const vocales = MODOS.find((m) => m.id === 'vocales')!.items

  it('con todo ya ganado antes, igual sigue con el próximo de la ronda', () => {
    const ronda = new Set([vocales[0].id])
    expect(siguienteEnRonda(vocales, vocales[0], ronda)).toBe(vocales[1])
  })

  it('da la vuelta y salta los ya hechos en la ronda', () => {
    const ronda = new Set(vocales.slice(1).map((it) => it.id))
    expect(siguienteEnRonda(vocales, vocales[9], ronda)).toBe(vocales[0])
  })

  it('termina cuando la ronda está completa', () => {
    const ronda = new Set(vocales.map((it) => it.id))
    expect(siguienteEnRonda(vocales, vocales[3], ronda)).toBeUndefined()
  })
})
