/**
 * Piezas compartidas por el servidor local y por las funciones de Vercel.
 */
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8'
};

const EXT_PERMITIDAS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg',
  '.mp4', '.webm', '.mov', '.m4v', '.mp3', '.wav', '.pdf']);

const TIPOS_PERMITIDOS = Array.from(EXT_PERMITIDAS).map((e) => MIME[e]).filter(Boolean);

const MAX_ARCHIVO = 260 * 1024 * 1024;       // 260 MB
const SESSION_MS = 12 * 60 * 60 * 1000;      // 12 horas

/* Vercel corta el cuerpo de una función en 4,5 MB. Por debajo de eso el panel
   sube el archivo por la API de siempre; por encima lo manda directo al Blob. */
const MAX_CUERPO = 4 * 1024 * 1024;

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

/* En Vercel el cuerpo ya viene leído y parseado en req.body; en local hay que
   leer el flujo a mano. Esta función sirve para los dos casos. */
function leerCuerpo(req, limite) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); }
    }
    return Promise.resolve(req.body);
  }
  const tope = limite || MAX_ARCHIVO;
  return new Promise((resolve, reject) => {
    let total = 0;
    const trozos = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > tope) { reject(new Error('El archivo supera el límite permitido')); req.destroy(); return; }
      trozos.push(c);
    });
    req.on('end', () => {
      if (!trozos.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(trozos).toString('utf8'))); }
      catch (e) { reject(new Error('El cuerpo de la petición no es JSON válido')); }
    });
    req.on('error', reject);
  });
}

/* nombre de archivo limpio: sin acentos, sin espacios y con extensión conocida */
function nombreSeguro(nombre) {
  const ext = path.extname(String(nombre || '')).toLowerCase();
  const base = path.basename(String(nombre || 'archivo'), ext)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'archivo';
  return { base, ext };
}

module.exports = {
  MIME, EXT_PERMITIDAS, TIPOS_PERMITIDOS,
  MAX_ARCHIVO, MAX_CUERPO, SESSION_MS,
  json, leerCuerpo, nombreSeguro
};
