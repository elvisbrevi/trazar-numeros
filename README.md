# ¡A escribir!

Juego para celulares en el que los niños aprenden a escribir trazando con el
dedo, al estilo de Duolingo ABC. El botón de la esquina de abajo a la izquierda
abre el menú de juegos:

- **Números** del 1 al 20.
- **Vocales** mayúsculas y minúsculas (A E I O U, a e i o u), cada una con un
  dibujo que empieza con ella (abeja, elefante, iglú, oso, uva).
- **Sílabas**, en tres partes: *ma me mi mo mu*, *pa pe pi po pu* y
  **Palabras** que se forman con ellas, en dos niveles: primero con una sola
  consonante (mama, papa, mimo, emu, upa) y luego mezcladas o más largas
  (mapa, puma, mopa, apio, momia). Todas tienen su dibujo.
- Lo que se traza y se lee va **sin tilde**, para no confundir al niño; la voz
  sí lo pronuncia con su acento («mamá», «papá»).

Cómo se juega:

- Arriba se elige qué escribir; aparece difuminado con una guía punteada y un
  círculo verde que marca dónde empezar y hacia dónde ir.
- El color sigue al dedo sólo si se recorre el trazo en su dirección. Si el
  niño se queda quieto, una manito le muestra el camino. El punto de la i se
  hace con sólo tocarlo.
- 🔊 lo dice en español (síntesis de voz del navegador).
- Al terminar: confeti, estrellas, «¡Muy bien!» y pasa al siguiente. La
  pantalla de «¡Lo lograste!» llega al completar todos en la partida, así un
  juego ya terminado se puede volver a jugar entero. Lo hecho alguna vez queda
  con ⭐ (se guarda en el navegador, por juego).

Hecho con [three.js](https://threejs.org) y Vite; se publica como Worker de
Cloudflare de sólo assets estáticos. Las ilustraciones (`public/img`) se
generaron con la Images API de OpenAI en hojas de seis por llamada y se
recortaron a 256 px en WebP.

## Desarrollo

```sh
npm install
npm run dev      # servidor local (con --host para abrirlo desde el celular)
npm run check    # tipos, pruebas y build
npm run deploy   # check + wrangler deploy
```

## Estructura

- `src/digitos.ts`: trazos de cada dígito (orden y dirección de escritura).
- `src/letras.ts`: trazos de las vocales, la m y la p, y `glifosDe`.
- `src/modos.ts`: los juegos y lo que se traza en cada uno, con sus palabras e imágenes.
- `src/trazo.ts`: lógica del trazado, sin dibujo (con pruebas en `trazo.test.ts`).
- `src/numero.ts`: dibujo del número (silueta, guía, relleno, marcador, manito).
- `src/fondo.ts`: cielo, sol, nubes, globos y colinas.
- `src/particulas.ts`: confeti, estrellas y chispitas.
- `src/sonido.ts` y `src/voz.ts`: efectos con Web Audio y voz en español.
- `src/main.ts`: estado del juego, entrada táctil e interfaz.
