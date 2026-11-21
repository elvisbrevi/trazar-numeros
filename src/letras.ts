// Trazos de las vocales (mayúsculas y minúsculas), la m y la p, en letra de
// imprenta como se enseña en el colegio. Las mayúsculas ocupan toda la celda,
// igual que los dígitos. Las minúsculas se apoyan en la línea BASE, su cuerpo
// llega hasta MEDIA y la p baja hasta 0; el punto de la i va por encima.

import { DIGITOS, arco, linea, p, remuestrear, unir, type Digito } from './digitos'

const BASE = 0.4
const MEDIA = 1.2

const LETRAS: Record<string, Digito> = {
  A: {
    ancho: 1,
    trazos: [linea(p(0.5, 1.6), p(0.06, 0)), linea(p(0.5, 1.6), p(0.94, 0)), linea(p(0.22, 0.55), p(0.78, 0.55))],
  },
  E: {
    ancho: 0.85,
    trazos: [
      linea(p(0.12, 1.6), p(0.12, 0)),
      linea(p(0.12, 1.6), p(0.8, 1.6)),
      linea(p(0.12, 0.8), p(0.7, 0.8)),
      linea(p(0.12, 0), p(0.8, 0)),
    ],
  },
  I: { ancho: 0.45, trazos: [linea(p(0.22, 1.6), p(0.22, 0))] },
  O: { ancho: 1, trazos: [arco(0.5, 0.8, 0.44, 0.78, 90, 450)] },
  U: {
    ancho: 1,
    trazos: [unir(linea(p(0.1, 1.6), p(0.1, 0.5)), arco(0.5, 0.5, 0.4, 0.5, 180, 360), linea(p(0.9, 0.5), p(0.9, 1.6)))],
  },
  // La a: la panza en contra del reloj desde arriba a la derecha y luego el palito.
  a: {
    ancho: 0.76,
    trazos: [arco(0.36, 0.8, 0.3, 0.4, 30, 390), linea(p(0.66, MEDIA), p(0.66, BASE))],
  },
  e: {
    ancho: 0.74,
    trazos: [unir(linea(p(0.07, 0.8), p(0.67, 0.8)), arco(0.37, 0.8, 0.3, 0.4, 0, 320))],
  },
  // El punto es un trazo cortito: basta con tocarlo.
  i: { ancho: 0.4, trazos: [linea(p(0.2, MEDIA), p(0.2, BASE)), linea(p(0.2, 1.52), p(0.2, 1.46))] },
  o: { ancho: 0.74, trazos: [arco(0.37, 0.8, 0.3, 0.4, 90, 450)] },
  u: {
    ancho: 0.76,
    trazos: [
      unir(linea(p(0.08, MEDIA), p(0.08, 0.7)), arco(0.37, 0.7, 0.29, 0.3, 180, 360), linea(p(0.66, 0.7), p(0.66, MEDIA))),
      linea(p(0.66, MEDIA), p(0.66, BASE)),
    ],
  },
  // La m: el palito y después dos puentes, cada uno desde el palo anterior.
  m: {
    ancho: 1,
    trazos: [
      linea(p(0.08, MEDIA), p(0.08, BASE)),
      unir(arco(0.29, 0.95, 0.21, 0.25, 180, 0), linea(p(0.5, 0.95), p(0.5, BASE))),
      unir(arco(0.71, 0.95, 0.21, 0.25, 180, 0), linea(p(0.92, 0.95), p(0.92, BASE))),
    ],
  },
  // La p: el palo que baja de la línea y la panza en el sentido del reloj.
  p: {
    ancho: 0.76,
    trazos: [linea(p(0.08, MEDIA), p(0.08, 0)), arco(0.38, 0.8, 0.3, 0.4, 150, -150)],
  },
}

/** Glifos (dígitos o letras) de un texto, con sus trazos ya remuestreados. */
export function glifosDe(texto: string): Digito[] {
  return [...texto].map((c) => {
    const g = DIGITOS[c] ?? LETRAS[c]
    if (!g) throw new Error(`No hay trazos para «${c}»`)
    return { ancho: g.ancho, trazos: g.trazos.map((t) => remuestrear(t)) }
  })
}
