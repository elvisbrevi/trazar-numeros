import '@fontsource/fredoka/latin-500.css'
import '@fontsource/fredoka/latin-700.css'
import './estilos.css'
import * as THREE from 'three'
import { PASO, type Punto } from './digitos'
import { Fondo } from './fondo'
import { geoConfeti, geoEstrella } from './formas'
import { glifosDe } from './letras'
import { MODOS, SILABAS, modoPorId, siguienteEnRonda, type IdModo, type Item, type Modo } from './modos'
import { VistaNumero, medirEscala } from './numero'
import { Particulas } from './particulas'
import { desbloquearAudio, sonidoAvance, sonidoElegir, sonidoFanfarria, sonidoFuera, sonidoTrazoListo } from './sonido'
import { Trazado, type Resultado } from './trazo'
import { decir, hayVoz } from './voz'

const COLORES = ['#ff5d8f', '#ffb000', '#3ec1ff', '#8b5cf6', '#2ecc71', '#ff7a3d', '#e64fd1']
const CONFETI = ['#ff5d8f', '#ffd23f', '#3ec1ff', '#8b5cf6', '#2ecc71', '#ff7a3d', '#ffffff']
const FRASES = ['¡Muy bien!', '¡Genial!', '¡Excelente!', '¡Bravo!', '¡Súper!', '¡Lo hiciste!']
const CLAVE_HECHOS = 'trazar-numeros:hechos'
const CLAVE_MODO = 'trazar-numeros:modo'

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!
const lienzo = $<HTMLCanvasElement>('#lienzo')
const barra = $('#barra')
const abajo = $('#abajo')
const palabra = $('#palabra')
const dibujo = $<HTMLImageElement>('#dibujo')
const parlante = $<HTMLButtonElement>('#parlante')
const bravo = $('#bravo')
const menu = $('#menu')
const menuSilabas = $('#silabas')

// --- Escena ---------------------------------------------------------------

let renderer: THREE.WebGLRenderer
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true })
} catch (e) {
  $('#inicio').innerHTML = '<h2>¡Uy!</h2><p>Este navegador no puede mostrar el juego. Prueba con Chrome o Safari actualizados.</p>'
  throw e
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
const escena = new THREE.Scene()
const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
camara.position.z = 500

const fondo = new Fondo(escena)
const confeti = new Particulas(geoConfeti, 260, 40, -520, true)
const estrellas = new Particulas(geoEstrella, 60, 41, -260)
const chispas = new Particulas(geoEstrella, 120, 12, -40)
escena.add(confeti.mesh, estrellas.mesh, chispas.mesh)

let ancho = 0
let alto = 0

// --- Estado del juego -------------------------------------------------------

let modo: Modo = modoPorId(localStorage.getItem(CLAVE_MODO) ?? '') ?? MODOS[0]
let actual: Item = modo.items[0]
let vista: VistaNumero | null = null
let trazado: Trazado | null = null
let celebrando = false
let quieto = 0
let ultimoTic = 0
let ultimoDedo: Punto | null = null
let temporizador = 0

// Lo ya escrito, por modo. Los números se guardaban antes en la clave sola.
function leerHechos(id: IdModo): Set<string> {
  const guardado = localStorage.getItem(`${CLAVE_HECHOS}:${id}`) ?? (id === 'numeros' ? localStorage.getItem(CLAVE_HECHOS) : null)
  return new Set((JSON.parse(guardado ?? '[]') as (string | number)[]).map(String))
}
const hechosPorModo = new Map(MODOS.map((m) => [m.id, leerHechos(m.id)]))
const hechos = () => hechosPorModo.get(modo.id)!
// Lo escrito en esta partida: el final llega al completar la ronda, no por las
// estrellas guardadas, para poder volver a jugar un juego ya terminado.
const ronda = new Set<string>()

// Inicio, menús y final ocupan toda la pantalla: mientras se ven, los controles
// del juego y lo que se está trazando se esconden para no ensuciarlas.
type Pantalla = 'inicio' | 'menu' | 'silabas' | 'final' | 'juego'
const pantalla = () => document.body.dataset.pantalla as Pantalla

function mostrar(p: Pantalla): void {
  document.body.dataset.pantalla = p
  if (vista) vista.grupo.visible = p === 'juego'
  if (p === 'juego' && !celebrando) quieto = 0
}

type Anim = { t: number; dur: number; paso: (k: number) => void }
const anims: Anim[] = []
const animar = (dur: number, paso: (k: number) => void) => anims.push({ t: 0, dur, paso })

const rebote = (k: number) => {
  const c = 1.70158 * 1.5
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
}
const elastico = (k: number) => (k >= 1 ? 1 : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)

/** Área libre entre la barra de arriba y los botones de abajo, en coordenadas del mundo. */
function area() {
  const arriba = barra.getBoundingClientRect().bottom
  const piso = abajo.getBoundingClientRect().top
  return { cy: alto / 2 - (arriba + piso) / 2, ancho, alto: piso - arriba }
}

/** Un color por letra o dígito, distinto para cada elemento del modo. */
function colores(item: Item): string[] {
  const i = modo.items.indexOf(item) * 2
  return [...item.texto].map((_, k) => COLORES[(i + k) % COLORES.length])
}

function construir(conservar: boolean): void {
  const previo = trazado
  vista?.liberar()
  const glifos = glifosDe(actual.texto)
  const a = area()
  const escala = medirEscala(glifos, a.ancho * 0.86, a.alto * 0.8, modo.separacion)
  vista = new VistaNumero(glifos, escala, colores(actual), modo.separacion)
  vista.grupo.position.set(0, a.cy, 0)
  vista.grupo.visible = pantalla() === 'juego'
  escena.add(vista.grupo)
  trazado = new Trazado(vista.trazos, {
    tolerancia: Math.max(0.2 * escala, 30),
    fuera: Math.max(0.5 * escala, 80),
    ventana: Math.round(0.3 / PASO),
    margenFinal: Math.round(0.05 / PASO),
  })
  if (conservar && previo) {
    trazado.iTrazo = previo.iTrazo
    trazado.progreso = previo.progreso
  }
}

function pintarBarra(): void {
  barra.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    const id = b.dataset.id!
    b.classList.toggle('activo', id === actual.id)
    b.classList.toggle('hecho', hechos().has(id))
    b.setAttribute('aria-pressed', String(id === actual.id))
  })
}

/** La palabra de abajo, con la vocal o la sílaba que se está aprendiendo resaltada. */
function pintarPalabra(): void {
  const { palabra: texto, marca } = actual
  palabra.replaceChildren()
  if (marca && texto.startsWith(marca)) {
    const b = document.createElement('b')
    b.textContent = marca
    palabra.append(b, texto.slice(marca.length))
  } else {
    palabra.textContent = texto
  }
  palabra.classList.toggle('larga', texto.length > 7)
  dibujo.hidden = !actual.imagen
  if (actual.imagen) {
    dibujo.src = actual.imagen
    dibujo.alt = texto
  }
}

function decirNumero(): void {
  decir(
    actual.decir,
    () => parlante.classList.add('hablando'),
    () => parlante.classList.remove('hablando'),
  )
}

function elegir(item: Item, hablar = true): void {
  clearTimeout(temporizador)
  actual = item
  celebrando = false
  quieto = 0
  bravo.classList.remove('visible')
  pintarPalabra()
  construir(false)
  pintarBarra()
  palabra.classList.remove('salta')
  void palabra.offsetWidth
  palabra.classList.add('salta')
  const g = vista!.grupo
  animar(0.55, (k) => g.scale.setScalar(0.4 + 0.6 * rebote(k)))
  if (hablar) decirNumero()
}

// --- Efectos -----------------------------------------------------------------

const azar = (a: number, b: number) => a + Math.random() * (b - a)
const alAzar = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function explosionEstrellas(x: number, y: number, n: number, fuerza: number, tam: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + azar(-0.2, 0.2)
    const v = fuerza * azar(0.6, 1)
    estrellas.emitir({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, tam: tam * azar(0.6, 1.1), color: alAzar(['#ffd23f', '#ffe97a', '#ffffff', '#ffb000']), dur: azar(0.8, 1.2), vrot: azar(-4, 4) })
  }
}

function lluviaConfeti(cantidad: number): void {
  const tam = Math.max(10, Math.min(ancho, alto) * 0.025)
  for (let i = 0; i < cantidad; i++) {
    const lado = i % 2 === 0 ? -1 : 1
    // Dos cañones desde las esquinas de abajo, más algo que cae desde arriba.
    if (i % 3 === 2) {
      confeti.emitir({ x: azar(-ancho / 2, ancho / 2), y: alto / 2 + azar(0, 80), vx: azar(-40, 40), vy: azar(-120, -20), tam, color: alAzar(CONFETI), dur: azar(2.2, 3.2) })
    } else {
      confeti.emitir({ x: (lado * ancho) / 2, y: -alto / 2 + 40, vx: -lado * azar(ancho * 0.25, ancho * 0.75), vy: azar(alto * 0.75, alto * 1.25), tam, color: alAzar(CONFETI), dur: azar(2.2, 3.2) })
    }
  }
}

function guardarHechos(): void {
  localStorage.setItem(`${CLAVE_HECHOS}:${modo.id}`, JSON.stringify([...hechos()]))
}

function celebrar(): void {
  celebrando = true
  const g = vista!.grupo
  sonidoFanfarria()
  navigator.vibrate?.([40, 60, 40])
  const frase = alAzar(FRASES)
  bravo.textContent = frase
  // Sobre la barra de arriba, para no tapar lo que se acaba de escribir.
  bravo.style.top = `${Math.max(56, barra.getBoundingClientRect().bottom / 2)}px`
  bravo.classList.add('visible')
  setTimeout(() => decir(frase), 400)
  lluviaConfeti(150)
  explosionEstrellas(g.position.x, g.position.y, 16, Math.min(ancho, alto) * 0.7, Math.max(16, vista!.radio * 1.3))
  animar(1.1, (k) => {
    g.scale.setScalar(1 + 0.25 * Math.sin(Math.min(1, k * 2) * Math.PI) * (1 - k) + (elastico(k) - 1) * 0.1)
    g.rotation.z = Math.sin(k * Math.PI * 4) * 0.06 * (1 - k)
  })
  hechos().add(actual.id)
  ronda.add(actual.id)
  guardarHechos()
  pintarBarra()
  temporizador = window.setTimeout(avanzar, 2700)
}

/** Sigue con el próximo que falte en la ronda; el final, sólo cuando están todos. */
function avanzar(): void {
  bravo.classList.remove('visible')
  const siguiente = siguienteEnRonda(modo.items, actual, ronda)
  if (siguiente) elegir(siguiente)
  else mostrarFinal()
}

function mostrarFinal(): void {
  $('#final p').textContent = modo.final
  mostrar('final')
  lluviaConfeti(240)
  sonidoFanfarria()
  setTimeout(() => decir(`¡Lo lograste! ${modo.final}`), 500)
}

function manejar(r: Resultado, q: Punto): void {
  const tr = trazado!
  switch (r) {
    case 'avanzo': {
      const f = tr.progreso / tr.trazo!.length
      if (f - ultimoTic > 0.1) {
        ultimoTic = f
        sonidoAvance(f)
      }
      break
    }
    case 'fuera':
      sonidoFuera()
      vista!.sacudir()
      quieto = 2
      break
    case 'trazoListo': {
      ultimoTic = 0
      sonidoTrazoListo()
      navigator.vibrate?.(25)
      const g = vista!.grupo
      explosionEstrellas(g.position.x + q.x, g.position.y + q.y, 8, 260, Math.max(10, vista!.radio * 0.8))
      break
    }
    case 'numeroListo':
      ultimoTic = 0
      celebrar()
      break
    case 'nada':
      break
  }
}

// --- Entrada táctil -----------------------------------------------------------

function local(e: PointerEvent): Punto {
  const g = vista!.grupo
  return {
    x: (e.clientX - ancho / 2 - g.position.x) / g.scale.x,
    y: (alto / 2 - e.clientY - g.position.y) / g.scale.y,
  }
}

lienzo.addEventListener('pointerdown', (e) => {
  if (celebrando || !trazado || !vista || trazado.terminado) return
  desbloquearAudio()
  const q = local(e)
  if (trazado.empezar(q)) {
    lienzo.setPointerCapture(e.pointerId)
    ultimoDedo = q
    quieto = 0
    // El punto de la i es un trazo tan corto que basta con tocarlo.
    if (trazado.trazo!.length <= 12) manejar(trazado.mover(q), q)
  } else {
    vista.sacudir()
    quieto = 2
  }
})

lienzo.addEventListener('pointermove', (e) => {
  if (!trazado?.dibujando || !ultimoDedo) return
  const g = vista!.grupo
  const eventos = e.getCoalescedEvents?.() ?? []
  for (const ev of eventos.length ? eventos : [e]) {
    const q = local(ev)
    // Se subdivide el movimiento para no saltarse partes del trazo si el dedo va rápido.
    const pasos = Math.max(1, Math.ceil(Math.hypot(q.x - ultimoDedo.x, q.y - ultimoDedo.y) / 5))
    for (let i = 1; i <= pasos; i++) {
      const p = { x: ultimoDedo.x + ((q.x - ultimoDedo.x) * i) / pasos, y: ultimoDedo.y + ((q.y - ultimoDedo.y) * i) / pasos }
      const r = trazado.mover(p)
      manejar(r, p)
      if (r !== 'avanzo' && r !== 'nada') return
    }
    ultimoDedo = q
    if (Math.random() < 0.35) {
      chispas.emitir({ x: g.position.x + q.x, y: g.position.y + q.y, vx: azar(-60, 60), vy: azar(-20, 80), tam: azar(5, 10), color: alAzar(['#ffffff', '#fff3a6', '#ffd6e8']), dur: 0.5 })
    }
  }
})

const soltar = () => {
  trazado?.soltar()
  ultimoDedo = null
}
lienzo.addEventListener('pointerup', soltar)
lienzo.addEventListener('pointercancel', soltar)

// --- Interfaz -------------------------------------------------------------------

const burbujas = $('.burbujas')
;['1', '2', '3', 'A', 'e', 'i', 'O', 'u', 'ma', 'pa'].forEach((t, i) => {
  const s = document.createElement('span')
  s.textContent = t
  s.style.setProperty('--c', COLORES[i % COLORES.length])
  s.style.setProperty('--d', `${i * 0.1}s`)
  burbujas.append(s)
})

/** Columnas de la barra: todos en una fila si caben; si no, filas de `porFila`. */
function columnasBarra(): void {
  const n = modo.items.length
  const minimo = modo.id === 'palabras' ? 56 : 44
  const cols = (ancho - 16) / n >= minimo ? n : modo.porFila
  barra.style.gridTemplateColumns = `repeat(${cols}, minmax(0, ${modo.id === 'palabras' ? 66 : 58}px))`
}

function armarBarra(): void {
  barra.replaceChildren()
  barra.classList.toggle('con-imagen', modo.id === 'palabras')
  barra.setAttribute('aria-label', `Elige: ${modo.nombre.toLowerCase()}`)
  modo.items.forEach((item, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.dataset.id = item.id
    b.setAttribute('aria-label', item.palabra)
    b.style.setProperty('--color', COLORES[i % COLORES.length])
    if (modo.id === 'palabras' && item.imagen) {
      const im = document.createElement('img')
      im.src = item.imagen
      im.alt = ''
      b.append(im)
    } else {
      b.textContent = item.texto
    }
    b.addEventListener('click', () => {
      desbloquearAudio()
      sonidoElegir()
      elegir(item)
    })
    barra.append(b)
  })
  columnasBarra()
}

function cambiarModo(m: Modo): void {
  modo = m
  localStorage.setItem(CLAVE_MODO, m.id)
  mostrar('juego')
  armarBarra()
  redimensionar()
  ronda.clear()
  elegir(m.items.find((it) => !hechos().has(it.id)) ?? m.items[0])
}

// --- Menús ------------------------------------------------------------------------

/** Una baldosa grande del menú, del color del juego, con su dibujo y sus estrellas. */
function baldosa(nombre: string, detalle: string, color: string, icono: Modo['icono'], alTocar: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'baldosa'
  b.style.setProperty('--color', color)
  const circulo = document.createElement('span')
  circulo.className = 'icono'
  if (icono.imagen) {
    const im = document.createElement('img')
    im.src = icono.imagen
    im.alt = ''
    circulo.append(im)
  } else {
    circulo.textContent = icono.texto ?? ''
  }
  const textos = document.createElement('span')
  textos.className = 'textos'
  const n = document.createElement('span')
  n.className = 'nombre'
  n.textContent = nombre
  const d = document.createElement('span')
  d.className = 'detalle'
  d.textContent = detalle
  textos.append(n, d)
  const avance = document.createElement('span')
  avance.className = 'avance'
  b.append(circulo, textos, avance)
  b.addEventListener('click', () => {
    desbloquearAudio()
    sonidoElegir()
    alTocar()
  })
  return b
}

function baldosaModo(m: Modo): HTMLButtonElement {
  const b = baldosa(m.nombre, m.detalle, m.color, m.icono, () => cambiarModo(m))
  b.dataset.modos = m.id
  return b
}

const silabas = SILABAS.map((id) => modoPorId(id)!)
const grupoSilabas = baldosa('Sílabas', 'ma, pa y palabras', '#ff9600', { texto: 'ma' }, () => abrirMenu('silabas'))
grupoSilabas.dataset.modos = SILABAS.join(' ')
menu.querySelector('.baldosas')!.append(...MODOS.filter((m) => !SILABAS.includes(m.id)).map(baldosaModo), grupoSilabas)
menuSilabas.querySelector('.baldosas')!.append(...silabas.map(baldosaModo))

function abrirMenu(cual: 'menu' | 'silabas' = 'menu'): void {
  clearTimeout(temporizador)
  bravo.classList.remove('visible')
  for (const b of document.querySelectorAll<HTMLElement>('.baldosa')) {
    const ms = b.dataset.modos!.split(' ').map((id) => modoPorId(id)!)
    const listos = ms.reduce((n, m) => n + hechosPorModo.get(m.id)!.size, 0)
    const total = ms.reduce((n, m) => n + m.items.length, 0)
    b.classList.toggle('actual', ms.includes(modo))
    b.querySelector('.avance')!.textContent = `⭐ ${listos}/${total}`
  }
  mostrar(cual)
}

$('#modo').addEventListener('click', () => {
  desbloquearAudio()
  sonidoElegir()
  abrirMenu()
})

// Si se abrió el menú en plena celebración, al volver se sigue con el próximo.
for (const c of document.querySelectorAll('.cerrar')) {
  c.addEventListener('click', () => {
    mostrar('juego')
    if (celebrando) avanzar()
  })
}
$('#silabas .volver').addEventListener('click', () => {
  sonidoElegir()
  abrirMenu()
})

parlante.addEventListener('click', () => {
  desbloquearAudio()
  decirNumero()
})
if (!hayVoz) parlante.hidden = true

$('#otra-vez').addEventListener('click', () => {
  desbloquearAudio()
  elegir(actual)
})

$('#jugar').addEventListener('click', () => {
  desbloquearAudio()
  abrirMenu()
})

// Otra ronda desde el principio; las estrellas ganadas se quedan.
$('#de-nuevo').addEventListener('click', () => {
  mostrar('juego')
  ronda.clear()
  elegir(modo.items[0])
})

$('#otro-juego').addEventListener('click', () => {
  sonidoElegir()
  abrirMenu()
})

// Evita el zoom con doble toque y el gesto de pellizcar en Safari.
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('dblclick', (e) => e.preventDefault())

// --- Bucle ------------------------------------------------------------------------

function redimensionar(): void {
  // Se mide el cuerpo y no la ventana: en la app instalada en iOS innerHeight
  // queda corto (ver estilos.css).
  const r = document.body.getBoundingClientRect()
  ancho = Math.round(r.width)
  alto = Math.round(r.height)
  renderer.setSize(ancho, alto)
  columnasBarra()
  Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: alto / 2, bottom: -alto / 2 })
  camara.updateProjectionMatrix()
  fondo.construir(ancho, alto, barra.getBoundingClientRect().bottom)
  if (vista) construir(true)
}

addEventListener('resize', redimensionar)
armarBarra()
pintarPalabra()
redimensionar()
construir(false)
pintarBarra()

const reloj = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const real = reloj.getDelta()
  const dt = Math.min(0.05, real)
  const t = reloj.elapsedTime
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]
    a.t += dt
    a.paso(Math.min(1, a.t / a.dur))
    if (a.t >= a.dur) anims.splice(i, 1)
  }
  if (trazado && !trazado.dibujando) quieto += real
  fondo.actualizar(t, dt)
  if (vista && trazado) vista.actualizar(trazado, t, dt, celebrando ? 0 : quieto)
  confeti.actualizar(dt)
  estrellas.actualizar(dt)
  chispas.actualizar(dt)
  renderer.render(escena, camara)
})

// Para las pruebas automáticas: dónde está, en pantalla, el trazo que toca hacer.
Object.assign(window, {
  __trazar: {
    estado: () => ({ modo: modo.id, actual: actual.id, iTrazo: trazado?.iTrazo, celebrando, hechos: [...hechos()], ronda: [...ronda] }),
    trazoEnPantalla: () => {
      const g = vista!.grupo
      return trazado?.trazo?.slice(trazado.progreso).map((q) => ({ x: q.x * g.scale.x + g.position.x + ancho / 2, y: alto / 2 - (q.y * g.scale.y + g.position.y) }))
    },
  },
})
