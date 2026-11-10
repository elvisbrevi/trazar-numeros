# ¡Escribe los números!

Juego para celulares en el que los niños aprenden a escribir los números del
10 al 16 trazándolos con el dedo, al estilo de Duolingo ABC.

- Arriba se elige el número; aparece difuminado con una guía punteada y un
  círculo verde que marca dónde empezar y hacia dónde ir.
- El color sigue al dedo sólo si se recorre el trazo en su dirección. Si el
  niño se queda quieto, una manito le muestra el camino.
- 🔊 dice el número en español (síntesis de voz del navegador).
- Al terminar: confeti, estrellas, «¡Muy bien!» y pasa al siguiente. Los
  números hechos quedan con ⭐ (se guardan en el navegador).

Hecho con [three.js](https://threejs.org) y Vite; se publica como Worker de
Cloudflare de sólo assets estáticos.

## Desarrollo

```sh
npm install
npm run dev      # servidor local (con --host para abrirlo desde el celular)
npm run check    # tipos, pruebas y build
npm run deploy   # check + wrangler deploy
```

## Estructura

- `src/digitos.ts`: trazos de cada dígito (orden y dirección de escritura).
- `src/trazo.ts`: lógica del trazado, sin dibujo (con pruebas en `trazo.test.ts`).
- `src/numero.ts`: dibujo del número (silueta, guía, relleno, marcador, manito).
- `src/fondo.ts`: cielo, sol, nubes, globos y colinas.
- `src/particulas.ts`: confeti, estrellas y chispitas.
- `src/sonido.ts` y `src/voz.ts`: efectos con Web Audio y voz en español.
- `src/main.ts`: estado del juego, entrada táctil e interfaz.
