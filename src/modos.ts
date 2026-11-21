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
  /** Baldosa del menú: color, lo que va en el círculo (texto o imagen) y una línea de ayuda. */
  color: string
  icono: { texto?: string; imagen?: string }
  detalle: string
  items: Item[]
  /** Botones por fila en la barra cuando no caben todos en una. */
  porFila: number
  /** Separación entre letras: más juntas en sílabas y palabras que entre dígitos. */
  separacion: number
  final: string
}

const img = (nombre: string) => `./img/${nombre}.webp`

/**
 * Lo que el niño traza y lee va sin tilde (confunde al empezar a escribir);
 * la voz sí usa la palabra bien escrita para pronunciarla bien. La ñ se queda.
 */
export const sinTilde = (texto: string) => texto.normalize('NFD').replace(/\u0301/g, '').normalize('NFC')

const numeros: Item[] = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1)
  return { id: n, texto: n, palabra: sinTilde(PALABRAS[i + 1]), decir: PALABRAS[i + 1] }
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
      palabra: sinTilde(mayuscula ? letra + palabra.slice(1) : palabra),
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
    palabra: sinTilde(palabra),
    marca: s,
    decir: `${s}, de ${palabra}`,
    imagen: img(imagen),
  }))
}

// Primero palabras con una sola consonante (mamá, papá…) y después las que
// mezclan la m y la p o suman vocales sueltas (mapa, puma, apio…). Sin tilde,
// «papá» y «papa» se verían iguales: por eso no está la papa.
const PALABRAS_JUEGO: [string, string, number][] = [
  ['mamá', 'mama', 0],
  ['papá', 'papa-padre', 0],
  ['mimo', 'mimo', 0],
  ['emú', 'emu', 0],
  ['upa', 'upa', 0],
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
    color: '#ff5d8f',
    icono: { texto: '123' },
    detalle: 'del 1 al 20',
    items: numeros,
    porFila: 10,
    separacion: 0.3,
    final: 'Escribiste todos los números del 1 al 20',
  },
  {
    id: 'vocales',
    nombre: 'Vocales',
    color: '#1cb0f6',
    icono: { texto: 'Aa' },
    detalle: 'a e i o u',
    items: vocales,
    porFila: 5,
    separacion: 0.3,
    final: 'Escribiste todas las vocales',
  },
  {
    id: 'silabas-m',
    nombre: 'Con m',
    color: '#2ecc71',
    icono: { imagen: img('mano') },
    detalle: 'ma me mi mo mu',
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
    nombre: 'Con p',
    color: '#8b5cf6',
    icono: { imagen: img('pato') },
    detalle: 'pa pe pi po pu',
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
    color: '#ff9600',
    icono: { imagen: img('mama') },
    detalle: 'mama, mapa, puma…',
    items: PALABRAS_JUEGO.map(([palabra, imagen, fila]) => ({
      id: sinTilde(palabra),
      texto: sinTilde(palabra),
      palabra: sinTilde(palabra),
      decir: palabra,
      imagen: img(imagen),
      fila,
    })),
    porFila: 5,
    separacion: 0.14,
    final: 'Escribiste todas las palabras',
  },
]

/** Los modos que van dentro de «Sílabas» en el menú. */
export const SILABAS: IdModo[] = ['silabas-m', 'silabas-p', 'palabras']

/**
 * El próximo elemento que falta en esta ronda, siguiendo el orden y dando la
 * vuelta; undefined cuando la ronda está completa. Las estrellas guardadas no
 * cuentan: un juego ya terminado otra vez se puede jugar entero.
 */
export function siguienteEnRonda(items: Item[], actual: Item, ronda: Set<string>): Item | undefined {
  const i = items.indexOf(actual)
  return [...items.slice(i + 1), ...items.slice(0, i + 1)].find((it) => !ronda.has(it.id))
}

export const modoPorId = (id: string): Modo | undefined => MODOS.find((m) => m.id === id)
