// Efectos de sonido sintetizados con Web Audio: no hace falta bajar archivos.

let ctx: AudioContext | null = null

/** Hay que llamarlo desde un toque del usuario (iOS no deja sonar antes). */
export function desbloquearAudio(): void {
  ctx ??= new AudioContext()
  void ctx.resume()
}

function nota(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', vol = 0.18, hasta?: number): void {
  if (!ctx) return
  const t0 = ctx.currentTime + inicio
  const osc = ctx.createOscillator()
  const gan = ctx.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t0)
  if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t0 + dur)
  gan.gain.setValueAtTime(0.0001, t0)
  gan.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gan).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** Tic suave mientras el dedo avanza; sube de tono con el progreso (0..1). */
export function sonidoAvance(fraccion: number): void {
  nota(520 + fraccion * 520, 0, 0.07, 'sine', 0.05)
}

export function sonidoTrazoListo(): void {
  nota(660, 0, 0.12, 'triangle', 0.2, 990)
  nota(990, 0.08, 0.18, 'sine', 0.14)
}

export function sonidoFuera(): void {
  nota(260, 0, 0.18, 'sine', 0.12, 180)
}

export function sonidoElegir(): void {
  nota(880, 0, 0.08, 'triangle', 0.12, 1180)
}

export function sonidoFanfarria(): void {
  const notas = [523.25, 659.25, 783.99, 1046.5]
  notas.forEach((f, i) => nota(f, i * 0.11, 0.22, 'triangle', 0.2))
  for (const f of [523.25, 659.25, 783.99, 1046.5]) nota(f, 0.48, 0.7, 'sine', 0.1)
  nota(1568, 0.5, 0.5, 'triangle', 0.06)
}
