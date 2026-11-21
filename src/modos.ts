// Los modos del juego y lo que se traza en cada uno. Las imágenes viven en
// public/img y ayudan a saber de qué palabra se trata.

import { PALABRAS } from './voz'

export type Item = {
  /** Clave única dentro del modo; también es lo que se guarda como hecho. */
  id: string
  /** Lo que se traza. */
  texto: string
  /** La palabra de abajo; `marca` es el comienzo que se resalta (la vocal o la sílaba). */
  palabra: string
  marca?: string
  /** Lo que se dice al elegirlo o al tocar el parlante. */
  decir: string
  imagen?: string
  /** Fila de la barra: en las palabras, el nivel de dificultad. */
  fila?: number
}

export type IdModo = 'numeros' | 'vocales' | 'silabas-m' | 'silabas-p' | 'palabras'

export type Modo = {
  id: IdModo
  nombre: string
  /** Lo que se muestra en la tarjeta del menú. */
  muestra: string
  items: Item[]
  /** Botones por fila en la barra cuando no caben todos en una. */
  porFila: number
  /** Separación entre letras: más juntas en sílabas y palabras que entre dígitos. */
  separacion: number
  final: string
}

const img = (nombre: string) => `./img/${nombre}.webp`

const numeros: Item[] = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1)
  return { id: n, texto: n, palabra: PALABRAS[i + 1], decir: PALABRAS[i + 1] }
})

const EJEMPLOS_VOCALES: [string, string, string][] = [
  ['a', 'abeja', 'abeja'],
  ['e', 'elefante', 'elefante'],
  ['i', 'iglú', 'iglu'],
  ['o', 'oso', 'oso'],
  ['u', 'uva', 'uva'],
]

const vocales: Item[] = [true, false].flatMap((mayuscula) =>
  EJEMPLOS_VOCALES.map(([v, palabra, imagen]) => {
    const letra = mayuscula ? v.toUpperCase() : v
    return {
      id: letra,
      texto: letra,
      palabra: mayuscula ? letra + palabra.slice(1) : palabra,
      marca: letra,
      decir: `${v}, de ${palabra}`,
      imagen: img(imagen),
      fila: mayuscula ? 0 : 1,
    }
  }),
)

function silabas(ejemplos: [string, string, string][]): Item[] {
  return ejemplos.map(([s, palabra, imagen]) => ({
    id: s,
    texto: s,
    palabra,
    marca: s,
    decir: `${s}, de ${palabra}`,
    imagen: img(imagen),
  }))
}

// Primero palabras con una sola consonante (mamá, papá…) y después las que
// mezclan la m y la p o suman vocales sueltas (mapa, puma, apio…).
const PALABRAS_JUEGO: [string, string, number][] = [
  ['mamá', 'mama', 0],
  ['papá', 'papa-padre', 0],
  ['papa', 'papa', 0],
  ['mimo', 'mimo', 0],
  ['emú', 'emu', 0],
  ['mapa', 'mapa', 1],
  ['puma', 'puma', 1],
  ['mopa', 'mopa', 1],
  ['apio', 'apio', 1],
  ['momia', 'momia', 1],
]

export const MODOS: Modo[] = [
  {
    id: 'numeros',
    nombre: 'Números',
    muestra: '1 2 3',
    items: numeros,
    porFila: 10,
    separacion: 0.3,
    final: 'Escribiste todos los números del 1 al 20',
  },
  {
    id: 'vocales',
    nombre: 'Vocales',
    muestra: 'A e i O u',
    items: vocales,
    porFila: 5,
    separacion: 0.3,
    final: 'Escribiste todas las vocales',
  },
  {
    id: 'silabas-m',
    nombre: 'Sílabas con m',
    muestra: 'ma me mi mo mu',
    items: silabas([
      ['ma', 'mano', 'mano'],
      ['me', 'mesa', 'mesa'],
      ['mi', 'miel', 'miel'],
      ['mo', 'moto', 'moto'],
      ['mu', 'muñeca', 'muneca'],
    ]),
    porFila: 5,
    separacion: 0.14,
    final: 'Escribiste todas las sílabas con m',
  },
  {
    id: 'silabas-p',
    nombre: 'Sílabas con p',
    muestra: 'pa pe pi po pu',
    items: silabas([
      ['pa', 'pato', 'pato'],
      ['pe', 'pera', 'pera'],
      ['pi', 'piña', 'pina'],
      ['po', 'pollito', 'pollito'],
      ['pu', 'puma', 'puma'],
    ]),
    porFila: 5,
    separacion: 0.14,
    final: 'Escribiste todas las sílabas con p',
  },
  {
    id: 'palabras',
    nombre: 'Palabras',
    muestra: 'mamá mapa',
    items: PALABRAS_JUEGO.map(([palabra, imagen, fila]) => ({
      id: palabra,
      texto: palabra,
      palabra,
      decir: palabra,
      imagen: img(imagen),
      fila,
    })),
    porFila: 5,
    separacion: 0.14,
    final: 'Escribiste todas las palabras',
  },
]

export const modoPorId = (id: string): Modo | undefined => MODOS.find((m) => m.id === id)
