// Trazos de cada dígito, en el orden y la dirección en que se escriben a mano.
// Cada dígito vive en una celda de `ancho` × ALTO (y hacia arriba, origen
// abajo a la izquierda). Las curvas se remuestrean a distancia fija PASO para
// que el avance del dedo se mida igual en todos los trazos.

export type Punto = { x: number; y: number }

export type Digito = { ancho: number; trazos: Punto[][] }

export const ALTO = 1.6
export const PASO = 0.012

const p = (x: number, y: number): Punto => ({ x, y })

function linea(a: Punto, b: Punto): Punto[] {
  return [a, b]
}

/** Arco de elipse; los ángulos van en grados y pueden decrecer (horario). */
function arco(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Punto[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 2))
  const pts: Punto[] = []
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    pts.push(p(cx + rx * Math.cos(a), cy + ry * Math.sin(a)))
  }
  return pts
}

function bezier(p0: Punto, p1: Punto, p2: Punto, p3: Punto): Punto[] {
  const pts: Punto[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const u = 1 - t
    pts.push(
      p(
        u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      ),
    )
  }
  return pts
}

/** Une tramos consecutivos en un solo trazo (el final de uno es el inicio del otro). */
function unir(...tramos: Punto[][]): Punto[] {
  return tramos.flatMap((t, i) => (i === 0 ? t : t.slice(1)))
}

/** Remuestrea una polilínea a puntos separados exactamente `paso` por longitud de arco. */
export function remuestrear(pts: Punto[], paso = PASO): Punto[] {
  const salida: Punto[] = [pts[0]]
  let resto = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const largo = Math.hypot(b.x - a.x, b.y - a.y)
    let d = paso - resto
    while (d <= largo) {
      const t = d / largo
      salida.push(p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
      d += paso
    }
    resto = largo - (d - paso)
  }
  const ultimo = pts[pts.length - 1]
  const previo = salida[salida.length - 1]
  if (Math.hypot(ultimo.x - previo.x, ultimo.y - previo.y) > paso * 0.3) salida.push(ultimo)
  return salida
}

const DIGITOS: Record<string, Digito> = {
  '0': { ancho: 1, trazos: [arco(0.5, 0.8, 0.42, 0.78, 90, 450)] },
  '1': {
    ancho: 0.75,
    trazos: [unir(linea(p(0.1, 1.25), p(0.5, 1.6)), linea(p(0.5, 1.6), p(0.5, 0)))],
  },
  '2': {
    ancho: 1,
    trazos: [
      unir(
        arco(0.5, 1.17, 0.4, 0.41, 160, -35),
        linea(p(0.828, 0.935), p(0.08, 0)),
        linea(p(0.08, 0), p(0.95, 0)),
      ),
    ],
  },
  '3': {
    ancho: 1,
    trazos: [unir(arco(0.47, 1.2, 0.37, 0.38, 155, -90), arco(0.47, 0.42, 0.43, 0.4, 90, -155))],
  },
  '4': {
    ancho: 1,
    trazos: [
      unir(linea(p(0.68, 1.6), p(0.05, 0.5)), linea(p(0.05, 0.5), p(0.95, 0.5))),
      linea(p(0.68, 1.6), p(0.68, 0)),
    ],
  },
  '5': {
    ancho: 1,
    trazos: [
      unir(linea(p(0.17, 1.6), p(0.152, 0.854)), arco(0.47, 0.5, 0.45, 0.5, 135, -150)),
      linea(p(0.17, 1.6), p(0.88, 1.6)),
    ],
  },
  '6': {
    ancho: 1,
    trazos: [
      unir(
        bezier(p(0.82, 1.5), p(0.5, 1.72), p(0.08, 1.25), p(0.08, 0.45)),
        arco(0.5, 0.45, 0.42, 0.45, 180, 540),
      ),
    ],
  },
  '7': {
    ancho: 1,
    trazos: [unir(linea(p(0.08, 1.6), p(0.92, 1.6)), linea(p(0.92, 1.6), p(0.35, 0)))],
  },
  // El 8 de un solo trazo: baja por la izquierda del óvalo de arriba, da toda
  // la vuelta al de abajo por la derecha y sube por la derecha del de arriba.
  '8': {
    ancho: 1,
    trazos: [
      unir(
        arco(0.5, 1.21, 0.32, 0.37, 90, 270),
        arco(0.5, 0.42, 0.4, 0.42, 90, -270),
        arco(0.5, 1.21, 0.32, 0.37, -90, 90),
      ),
    ],
  },
  '9': {
    ancho: 1,
    trazos: [unir(arco(0.48, 1.14, 0.4, 0.44, 0, 360), linea(p(0.88, 1.14), p(0.88, 0)))],
  },
}

/** Dígitos de un número con sus trazos ya remuestreados. */
export function digitosDe(n: number): Digito[] {
  return String(n)
    .split('')
    .map((c) => {
      const d = DIGITOS[c]
      if (!d) throw new Error(`No hay trazos para el dígito ${c}`)
      return { ancho: d.ancho, trazos: d.trazos.map((t) => remuestrear(t)) }
    })
}
