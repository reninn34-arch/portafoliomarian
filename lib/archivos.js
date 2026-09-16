/**
 * Dónde viven las imágenes y los vídeos.
 *
 *   · En tu ordenador  -> public/uploads/  (URLs tipo /uploads/foto.jpg)
 *   · En Vercel        -> Vercel Blob      (URLs absolutas del CDN)
 *
 * El disco de Vercel es de solo lectura, así que allí no se puede escribir en
 * public/. Blob además sirve los vídeos con soporte de rangos, que es lo que
 * necesita el reproductor para poder saltar por la barra de tiempo.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MIME, EXT_PERMITIDAS, nombreSeguro, variable } = require('./comun');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

/* igual que con Postgres: Vercel llama al permiso BLOB_READ_WRITE_TOKEN o
   STORAGE_BLOB_READ_WRITE_TOKEN según cómo hayas creado el almacén */
const permiso = () => variable(
  ['BLOB_READ_WRITE_TOKEN', 'STORAGE_BLOB_READ_WRITE_TOKEN'], 'BLOB_READ_WRITE_TOKEN'
);
const enBlob = () => !!permiso();

function nombreFinal(nombre) {
  const { base, ext } = nombreSeguro(nombre);
  if (!EXT_PERMITIDAS.has(ext)) throw new Error('Formato no permitido: ' + (ext || 'sin extensión'));
  return { nombre: base + '-' + crypto.randomBytes(4).toString('hex') + ext, ext };
}

/* En Vercel no hay disco donde escribir: sin Blob no se puede subir nada, y el
   error que salía ("EROFS") no le dice nada a nadie. */
const sinDisco = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const FALTA_BLOB = 'Falta el almacén de imágenes. En Vercel, entra en tu proyecto → ' +
  'Storage → Create → Blob, y conéctalo a este proyecto. Tiene que aparecer la ' +
  'variable BLOB_READ_WRITE_TOKEN. Después vuelve a desplegar.';

/* ─────────────────────────────── guardar ──────────────────────────── */
async function guardarBuffer(buffer, nombrePedido) {
  if (!buffer || !buffer.length) throw new Error('El archivo llegó vacío');
  if (!enBlob() && sinDisco()) throw new Error(FALTA_BLOB);
  const { nombre, ext } = nombreFinal(nombrePedido);
  const tipo = MIME[ext] || 'application/octet-stream';

  if (enBlob()) {
    const { put } = require('@vercel/blob');
    const subido = await put(nombre, buffer, {
      access: 'public',
      contentType: tipo,
      addRandomSuffix: false,
      token: permiso()
    });
    return { url: subido.url, nombre: nombre, peso: buffer.length, tipo: tipo };
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, nombre), buffer);
  return { url: '/uploads/' + nombre, nombre: nombre, peso: buffer.length, tipo: tipo };
}

/* lo que manda el panel: {nombre, datos} con los datos en base64 */
function guardarMedio(payload) {
  const limpio = String((payload && payload.datos) || '').replace(/^data:[^;]+;base64,/, '');
  return guardarBuffer(Buffer.from(limpio, 'base64'), payload && payload.nombre);
}

/* ──────────────────────────────── listar ──────────────────────────── */
async function listarMedios() {
  if (enBlob()) {
    const { list } = require('@vercel/blob');
    const { blobs } = await list({ token: permiso() });
    return blobs.map((b) => ({
      nombre: b.pathname,
      url: b.url,
      peso: b.size,
      fecha: new Date(b.uploadedAt).getTime(),
      tipo: MIME[path.extname(b.pathname).toLowerCase()] || ''
    })).sort((a, b) => b.fecha - a.fecha);
  }
  try {
    return fs.readdirSync(UPLOADS_DIR)
      .filter((f) => !f.startsWith('.'))
      .map((f) => {
        const st = fs.statSync(path.join(UPLOADS_DIR, f));
        return {
          nombre: f, url: '/uploads/' + f, peso: st.size, fecha: st.mtimeMs,
          tipo: MIME[path.extname(f).toLowerCase()] || ''
        };
      })
      .sort((a, b) => b.fecha - a.fecha);
  } catch (e) { return []; }
}

/* ──────────────────────────────── borrar ──────────────────────────── */
async function borrarMedio(url) {
  const dir = String(url || '');
  if (!dir) throw new Error('Falta el archivo a borrar');

  if (enBlob()) {
    /* los /uploads/... antiguos viajan con el despliegue y son de solo lectura:
       no se pueden borrar desde el panel, solo quitándolos del proyecto */
    if (!/^https?:\/\//.test(dir)) return true;
    const { del } = require('@vercel/blob');
    await del(dir, { token: permiso() });
    return true;
  }
  const nombre = path.basename(dir);
  const destino = path.join(UPLOADS_DIR, nombre);
  if (!destino.startsWith(UPLOADS_DIR)) throw new Error('Ruta inválida');
  if (fs.existsSync(destino)) fs.unlinkSync(destino);
  return true;
}

module.exports = { guardarBuffer, guardarMedio, listarMedios, borrarMedio, enBlob, permiso, UPLOADS_DIR };
