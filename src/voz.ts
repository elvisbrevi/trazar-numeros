// Lee en voz alta con la síntesis de voz del navegador, en español.

export const PALABRAS: Record<number, string> = {
  1: 'uno',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  8: 'ocho',
  9: 'nueve',
  10: 'diez',
  11: 'once',
  12: 'doce',
  13: 'trece',
  14: 'catorce',
  15: 'quince',
  16: 'dieciséis',
}

// Primero las variantes latinoamericanas; si no hay, cualquier español.
const PREFERIDAS = ['es-CL', 'es-419', 'es-MX', 'es-US', 'es-AR', 'es-CO', 'es-ES']

let voz: SpeechSynthesisVoice | null = null

function elegirVoz(): void {
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  voz =
    PREFERIDAS.map((l) => voces.find((v) => norm(v.lang) === l.toLowerCase())).find(Boolean) ??
    voces[0] ??
    null
}

export const hayVoz = typeof window !== 'undefined' && 'speechSynthesis' in window

if (hayVoz) {
  elegirVoz()
  speechSynthesis.addEventListener('voiceschanged', elegirVoz)
}

export function decir(texto: string, alEmpezar?: () => void, alTerminar?: () => void): void {
  if (!hayVoz) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = voz?.lang ?? 'es-ES'
  if (voz) u.voice = voz
  u.rate = 0.85
  u.pitch = 1.15
  if (alEmpezar) u.onstart = alEmpezar
  if (alTerminar) {
    u.onend = alTerminar
    u.onerror = alTerminar
  }
  speechSynthesis.speak(u)
}
