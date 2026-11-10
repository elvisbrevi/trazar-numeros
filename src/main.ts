import '@fontsource/fredoka/latin-500.css'
import '@fontsource/fredoka/latin-700.css'
import './estilos.css'
import * as THREE from 'three'
import { PASO, digitosDe, type Punto } from './digitos'
import { Fondo } from './fondo'
import { geoConfeti, geoEstrella } from './formas'
import { VistaNumero, medirEscala } from './numero'
import { Particulas } from './particulas'
import { desbloquearAudio, sonidoAvance, sonidoElegir, sonidoFanfarria, sonidoFuera, sonidoTrazoListo } from './sonido'
import { Trazado, type Resultado } from './trazo'
import { PALABRAS, decir, hayVoz } from './voz'

const NUMEROS = [10, 11, 12, 13, 14, 15, 16]
const COLORES = ['#ff5d8f', '#ffb000', '#3ec1ff', '#8b5cf6', '#2ecc71', '#ff7a3d', '#e64fd1']
const CONFETI = ['#ff5d8f', '#ffd23f', '#3ec1ff', '#8b5cf6', '#2ecc71', '#ff7a3d', '#ffffff']
const FRASES = ['¡Muy bien!', '¡Genial!', '¡Excelente!', '¡Bravo!', '¡Súper!', '¡Lo hiciste!']
const CLAVE_HECHOS = 'trazar-numeros:hechos'

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!
const lienzo = $<HTMLCanvasElement>('#lienzo')
const barra = $('#barra')
const abajo = $('#abajo')
const palabra = $('#palabra')
const parlante = $<HTMLButtonElement>('#parlante')
const bravo = $('#bravo')

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

let actual = NUMEROS[0]
let vista: VistaNumero | null = null
let trazado: Trazado | null = null
let celebrando = false
let quieto = 0
let ultimoTic = 0
let ultimoDedo: Punto | null = null
let temporizador = 0
const hechos = new Set<number>(JSON.parse(localStorage.getItem(CLAVE_HECHOS) ?? '[]'))

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

function colores(n: number): string[] {
  const i = (n - NUMEROS[0]) * 2
  return [COLORES[i % COLORES.length], COLORES[(i + 1) % COLORES.length]]
}

function construir(conservar: boolean): void {
  const previo = trazado
  vista?.liberar()
  const digitos = digitosDe(actual)
  const a = area()
  const escala = medirEscala(digitos, a.ancho * 0.86, a.alto * 0.8)
  vista = new VistaNumero(digitos, escala, colores(actual))
  vista.grupo.position.set(0, a.cy, 0)
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
    const n = Number(b.dataset.n)
    b.classList.toggle('activo', n === actual)
    b.classList.toggle('hecho', hechos.has(n))
    b.setAttribute('aria-pressed', String(n === actual))
  })
}

function decirNumero(): void {
  decir(
    PALABRAS[actual],
    () => parlante.classList.add('hablando'),
    () => parlante.classList.remove('hablando'),
  )
}

function elegir(n: number, hablar = true): void {
  clearTimeout(temporizador)
  actual = n
  celebrando = false
  quieto = 0
  bravo.classList.remove('visible')
  construir(false)
  pintarBarra()
  palabra.textContent = PALABRAS[n]
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
  localStorage.setItem(CLAVE_HECHOS, JSON.stringify([...hechos]))
}

function celebrar(): void {
  celebrando = true
  const g = vista!.grupo
  sonidoFanfarria()
  navigator.vibrate?.([40, 60, 40])
  const frase = alAzar(FRASES)
  bravo.textContent = frase
  bravo.classList.add('visible')
  setTimeout(() => decir(frase), 400)
  lluviaConfeti(150)
  explosionEstrellas(g.position.x, g.position.y, 16, Math.min(ancho, alto) * 0.7, Math.max(16, vista!.radio * 1.3))
  animar(1.1, (k) => {
    g.scale.setScalar(1 + 0.25 * Math.sin(Math.min(1, k * 2) * Math.PI) * (1 - k) + (elastico(k) - 1) * 0.1)
    g.rotation.z = Math.sin(k * Math.PI * 4) * 0.06 * (1 - k)
  })
  hechos.add(actual)
  guardarHechos()
  pintarBarra()
  temporizador = window.setTimeout(() => {
    bravo.classList.remove('visible')
    const i = NUMEROS.indexOf(actual)
    if (i === NUMEROS.length - 1) mostrarFinal()
    else elegir(NUMEROS[i + 1])
  }, 2700)
}

function mostrarFinal(): void {
  $('#final').classList.add('visible')
  lluviaConfeti(240)
  sonidoFanfarria()
  setTimeout(() => decir('¡Lo lograste! Escribiste todos los números'), 500)
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

for (const n of NUMEROS) {
  const b = document.createElement('button')
  b.type = 'button'
  b.dataset.n = String(n)
  b.textContent = String(n)
  b.setAttribute('aria-label', PALABRAS[n])
  b.style.setProperty('--color', COLORES[(n - NUMEROS[0]) % COLORES.length])
  b.addEventListener('click', () => {
    desbloquearAudio()
    sonidoElegir()
    elegir(n)
  })
  barra.append(b)
}

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
  $('#inicio').classList.add('oculto')
  elegir(NUMEROS[0])
})

$('#de-nuevo').addEventListener('click', () => {
  $('#final').classList.remove('visible')
  hechos.clear()
  guardarHechos()
  elegir(NUMEROS[0])
})

// Evita el zoom con doble toque y el gesto de pellizcar en Safari.
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('dblclick', (e) => e.preventDefault())

// --- Bucle ------------------------------------------------------------------------

function redimensionar(): void {
  ancho = innerWidth
  alto = innerHeight
  renderer.setSize(ancho, alto)
  Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: alto / 2, bottom: -alto / 2 })
  camara.updateProjectionMatrix()
  fondo.construir(ancho, alto, barra.getBoundingClientRect().bottom)
  if (vista) construir(true)
}

addEventListener('resize', redimensionar)
redimensionar()
construir(false)
palabra.textContent = PALABRAS[actual]
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
    estado: () => ({ actual, iTrazo: trazado?.iTrazo, celebrando, hechos: [...hechos] }),
    trazoEnPantalla: () => {
      const g = vista!.grupo
      return trazado?.trazo?.slice(trazado.progreso).map((q) => ({ x: q.x * g.scale.x + g.position.x + ancho / 2, y: alto / 2 - (q.y * g.scale.y + g.position.y) }))
    },
  },
})
