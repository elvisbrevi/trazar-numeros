// Paisaje del fondo: cielo, nubes que pasan, globos que suben, colinas y destellos.

import * as THREE from 'three'
import { geoCirculo, geoDestello } from './formas'

const COLORES_GLOBO = ['#ff7eb6', '#ffd23f', '#7ee0ff', '#b892ff', '#ff9f5a']

type Movil = { obj: THREE.Object3D; v: number; fase: number; baseX: number }

function material(color: THREE.ColorRepresentation, opacidad = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacidad < 1,
    opacity: opacidad,
    depthTest: false,
    depthWrite: false,
  })
}

function circulo(mat: THREE.Material, x: number, y: number, rx: number, ry = rx, orden = 0): THREE.Mesh {
  const m = new THREE.Mesh(geoCirculo, mat)
  m.position.set(x, y, 0)
  m.scale.set(rx, ry, 1)
  m.renderOrder = orden
  return m
}

export class Fondo {
  private grupo = new THREE.Group()
  private nubes: Movil[] = []
  private globos: Movil[] = []
  private destellos: { obj: THREE.Mesh; fase: number; tam: number }[] = []
  private ancho = 0
  private alto = 0

  constructor(escena: THREE.Scene) {
    // El cielo ocupa toda la pantalla sin depender de la cámara.
    const cielo = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          arriba: { value: new THREE.Color('#6cc8ff') },
          abajo: { value: new THREE.Color('#fff1c9') },
        },
        vertexShader: 'varying float vy; void main() { vy = position.y * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader:
          'uniform vec3 arriba; uniform vec3 abajo; varying float vy; void main() { gl_FragColor = vec4(mix(abajo, arriba, smoothstep(0.05, 0.95, vy)), 1.0); }',
      }),
    )
    cielo.frustumCulled = false
    cielo.renderOrder = -100
    escena.add(cielo)
    escena.add(this.grupo)
  }

  /** `techo` es lo que ocupa la barra de números arriba, en px. */
  construir(ancho: number, alto: number, techo: number): void {
    this.ancho = ancho
    this.alto = alto
    this.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) (o.material as THREE.Material).dispose()
    })
    this.grupo.clear()
    this.nubes = []
    this.globos = []
    this.destellos = []
    const base = Math.min(ancho, alto)

    // Sol con mejillas, asomado en la esquina de arriba a la derecha.
    const sol = new THREE.Group()
    const r = base * 0.075
    sol.add(circulo(material('#ffe066', 0.45), 0, 0, r * 1.45, r * 1.45, -90))
    sol.add(circulo(material('#ffd43b'), 0, 0, r, r, -89))
    sol.add(circulo(material('#5c3b1e'), -r * 0.33, r * 0.12, r * 0.1, r * 0.13, -88))
    sol.add(circulo(material('#5c3b1e'), r * 0.33, r * 0.12, r * 0.1, r * 0.13, -88))
    sol.add(circulo(material('#ff9aa2', 0.8), -r * 0.55, -r * 0.2, r * 0.16, r * 0.11, -88))
    sol.add(circulo(material('#ff9aa2', 0.8), r * 0.55, -r * 0.2, r * 0.16, r * 0.11, -88))
    const sonrisa = new THREE.Mesh(new THREE.RingGeometry(r * 0.28, r * 0.38, 24, 1, Math.PI * 1.15, Math.PI * 0.7), material('#5c3b1e'))
    sonrisa.position.y = r * 0.05
    sonrisa.renderOrder = -88
    sol.add(sonrisa)
    sol.position.set(ancho / 2 - r * 0.95, alto / 2 - techo - r * 0.95, 0)
    sol.userData.giro = true
    this.grupo.add(sol)

    // Nubes.
    const blanco = material('#ffffff')
    for (let i = 0; i < 5; i++) {
      const nube = new THREE.Group()
      const s = base * (0.06 + Math.random() * 0.04)
      for (const [dx, dy, rr] of [
        [0, 0, 1],
        [-1.1, -0.25, 0.75],
        [1.1, -0.2, 0.8],
        [0.5, 0.45, 0.7],
        [-0.5, 0.35, 0.65],
      ]) {
        nube.add(circulo(blanco, dx * s, dy * s, rr * s, rr * s, -80))
      }
      const x = -ancho / 2 + Math.random() * ancho
      nube.position.set(x, alto * (-0.05 + Math.random() * 0.45), 0)
      this.nubes.push({ obj: nube, v: 8 + Math.random() * 14, fase: 0, baseX: x })
      this.grupo.add(nube)
    }

    // Colinas.
    const colinas: [number, number, number, string][] = [
      [-0.35, 0.75, 0.5, '#a8e58a'],
      [0.45, 0.85, 0.42, '#8fd673'],
      [-0.05, 0.95, 0.36, '#7cc95f'],
    ]
    colinas.forEach(([x, rx, h, c], i) => {
      this.grupo.add(circulo(material(c), x * ancho, -alto / 2 - rx * ancho * 0.55 + h * alto * 0.25, rx * ancho, rx * ancho * 0.6, -70 + i))
    })
    // Florcitas sobre las colinas.
    const petalos = ['#ffffff', '#ffd6e8', '#fff3a6']
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Group()
      const s = base * 0.012
      const mat = material(petalos[i % petalos.length])
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        f.add(circulo(mat, Math.cos(a) * s, Math.sin(a) * s, s * 0.8, s * 0.8, -60))
      }
      f.add(circulo(material('#ffb703'), 0, 0, s * 0.6, s * 0.6, -59))
      f.position.set(-ancho / 2 + ((i + 0.5) / 9) * ancho + (Math.random() - 0.5) * 20, -alto / 2 + alto * (0.02 + Math.random() * 0.05), 0)
      this.grupo.add(f)
    }

    // Globos.
    for (let i = 0; i < 4; i++) {
      const globo = new THREE.Group()
      const s = base * (0.045 + Math.random() * 0.015)
      const c = COLORES_GLOBO[i % COLORES_GLOBO.length]
      const hilo = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -s * 1.15, 0),
          new THREE.Vector3(s * 0.15, -s * 1.8, 0),
          new THREE.Vector3(-s * 0.1, -s * 2.4, 0),
          new THREE.Vector3(s * 0.05, -s * 3, 0),
        ]),
        new THREE.LineBasicMaterial({ color: '#8a8aa8', transparent: true, opacity: 0.6, depthTest: false }),
      )
      hilo.renderOrder = -50
      globo.add(hilo)
      globo.add(circulo(material(c, 0.85), 0, 0, s * 0.85, s * 1.05, -49))
      globo.add(circulo(material(c, 0.85), 0, -s * 1.08, s * 0.14, s * 0.1, -49))
      globo.add(circulo(material('#ffffff', 0.55), -s * 0.32, s * 0.4, s * 0.16, s * 0.26, -48))
      const lado = i % 2 === 0 ? -1 : 1
      const x = lado * ancho * (0.3 + Math.random() * 0.17)
      globo.position.set(x, -alto / 2 + Math.random() * alto, 0)
      this.globos.push({ obj: globo, v: 16 + Math.random() * 16, fase: Math.random() * 6, baseX: x })
      this.grupo.add(globo)
    }

    // Destellos.
    for (let i = 0; i < 16; i++) {
      const tam = base * (0.008 + Math.random() * 0.012)
      const d = new THREE.Mesh(geoDestello, material(i % 3 === 0 ? '#fff7ae' : '#ffffff', 0.9))
      d.position.set((Math.random() - 0.5) * ancho, alto * (Math.random() * 0.5), 0)
      d.renderOrder = -85
      this.destellos.push({ obj: d, fase: Math.random() * 6, tam })
      this.grupo.add(d)
    }
  }

  actualizar(t: number, dt: number): void {
    const margen = this.ancho * 0.2
    for (const n of this.nubes) {
      n.obj.position.x += n.v * dt
      if (n.obj.position.x > this.ancho / 2 + margen) n.obj.position.x = -this.ancho / 2 - margen
    }
    for (const g of this.globos) {
      g.obj.position.y += g.v * dt
      g.obj.position.x = g.baseX + Math.sin(t * 0.8 + g.fase) * 14
      g.obj.rotation.z = Math.sin(t * 0.8 + g.fase) * 0.08
      if (g.obj.position.y > this.alto / 2 + 120) g.obj.position.y = -this.alto / 2 - 120
    }
    for (const d of this.destellos) {
      const k = 0.5 + 0.5 * Math.sin(t * 2.2 + d.fase)
      d.obj.scale.setScalar(d.tam * (0.3 + k))
      d.obj.rotation.z = t * 0.5 + d.fase
    }
    for (const o of this.grupo.children) if (o.userData.giro) o.rotation.z = Math.sin(t * 1.3) * 0.08
  }
}
