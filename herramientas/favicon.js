/**
 * Hace el favicon a partir de un sprite tuyo.
 *
 *   node herramientas/favicon.js
 *
 * Lee el gato de public/img/sprites/, lo recorta a lo que de verdad ocupa, lo
 * centra en un lienzo cuadrado y lo guarda en 32 y 64 px. El escalado es por
 * vecino más cercano (se copia el píxel tal cual): cualquier otro método
 * emborrona el pixel art.
 *
 * Node trae zlib, así que no hace falta instalar nada para leer y escribir PNG.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SPRITES = path.join(__dirname, '..', 'public', 'img', 'sprites');
const DESTINO = path.join(__dirname, '..', 'public', 'img');
const ORIGEN = process.argv[2] || 'icono-gato-sentado.png';

/* ────────────────────────────── leer PNG ──────────────────────────── */
function leerPNG(ruta) {
  const buf = fs.readFileSync(ruta);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('No es un PNG: ' + ruta);

  let ancho = 0, alto = 0, bits = 0, tipo = 0;
  const trozos = [];
  let i = 8;
  while (i < buf.length) {
    const largo = buf.readUInt32BE(i);
    const nombre = buf.toString('ascii', i + 4, i + 8);
    const datos = buf.slice(i + 8, i + 8 + largo);
    if (nombre === 'IHDR') {
      ancho = datos.readUInt32BE(0); alto = datos.readUInt32BE(4);
      bits = datos[8]; tipo = datos[9];
    } else if (nombre === 'IDAT') trozos.push(datos);
    else if (nombre === 'IEND') break;
    i += largo + 12;
  }
  if (bits !== 8 || tipo !== 6) throw new Error('Solo sé leer PNG de 8 bits con transparencia (RGBA)');

  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const canales = 4;
  const porFila = ancho * canales;
  const pixeles = Buffer.alloc(alto * porFila);

  /* deshacer los filtros por línea: cada scanline viene precedida del filtro
     que usó el codificador y se reconstruye mirando a la izquierda y arriba */
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (porFila + 1)];
    const entrada = crudo.slice(y * (porFila + 1) + 1, (y + 1) * (porFila + 1));
    for (let x = 0; x < porFila; x++) {
      const a = x >= canales ? pixeles[y * porFila + x - canales] : 0;
      const b = y > 0 ? pixeles[(y - 1) * porFila + x] : 0;
      const c = (x >= canales && y > 0) ? pixeles[(y - 1) * porFila + x - canales] : 0;
      let valor = entrada[x];
      if (filtro === 1) valor += a;
      else if (filtro === 2) valor += b;
      else if (filtro === 3) valor += Math.floor((a + b) / 2);
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        valor += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      pixeles[y * porFila + x] = valor & 255;
    }
  }
  return { ancho, alto, pixeles };
}

/* ───────────────────────────── escribir PNG ───────────────────────── */
const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function trozo(nombre, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(nombre, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}
function escribirPNG(ruta, ancho, alto, pixeles) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 6;                    // 8 bits, RGBA
  const porFila = ancho * 4;
  const crudo = Buffer.alloc(alto * (porFila + 1));
  for (let y = 0; y < alto; y++) {
    crudo[y * (porFila + 1)] = 0;              // sin filtro: son imágenes diminutas
    pixeles.copy(crudo, y * (porFila + 1) + 1, y * porFila, (y + 1) * porFila);
  }
  fs.writeFileSync(ruta, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]));
}

/* ──────────────────────────────── montaje ─────────────────────────── */
function recorte(img) {
  let x0 = img.ancho, y0 = img.alto, x1 = -1, y1 = -1;
  for (let y = 0; y < img.alto; y++) {
    for (let x = 0; x < img.ancho; x++) {
      if (img.pixeles[(y * img.ancho + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('El sprite está vacío');
  return { x0, y0, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 };
}

function montar(img, caja, lado, escala) {
  const salida = Buffer.alloc(lado * lado * 4);           // transparente
  const ancho = caja.ancho * escala;
  const alto = caja.alto * escala;
  const izq = Math.floor((lado - ancho) / 2);
  const arr = Math.floor((lado - alto) / 2);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const dx = izq + x, dy = arr + y;
      if (dx < 0 || dy < 0 || dx >= lado || dy >= lado) continue;
      const ox = caja.x0 + Math.floor(x / escala);
      const oy = caja.y0 + Math.floor(y / escala);
      img.pixeles.copy(salida, (dy * lado + dx) * 4,
        (oy * img.ancho + ox) * 4, (oy * img.ancho + ox) * 4 + 4);
    }
  }
  return salida;
}

const img = leerPNG(path.join(SPRITES, ORIGEN));
const caja = recorte(img);
console.log('\n  ✦ Favicon desde ' + ORIGEN);
console.log('  sprite ' + img.ancho + '×' + img.alto + ' → el gato ocupa ' + caja.ancho + '×' + caja.alto);

[[32, 1], [64, 2]].forEach(([lado, escala]) => {
  const nombre = 'favicon-gato' + (lado === 32 ? '' : '-' + lado) + '.png';
  escribirPNG(path.join(DESTINO, nombre), lado, lado, montar(img, caja, lado, escala));
  console.log('  ✓ img/' + nombre + '  (' + lado + '×' + lado + ', escala ' + escala + '×)');
});
console.log('');
