/**
 * Estudio Mango — servidor para tu ordenador.
 *
 *   node server.js            -> http://localhost:4321
 *   PORT=8080 node server.js
 *
 * Sirve el sitio y delega la API en lib/api.js, el mismo router que usa Vercel.
 * Sin base de datos ni nada que instalar: guarda en data/content.json y en
 * public/uploads/. En Vercel esos dos almacenes se cambian solos por Postgres
 * y Vercel Blob (mira lib/almacen.js y lib/archivos.js).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const { MIME, json } = require('./lib/comun');
const { manejar } = require('./lib/api');
const almacen = require('./lib/almacen');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const PORT = Number(process.env.PORT || 4321);

/* ------------------------------------------------------------------ static */
function servirArchivo(res, archivo, req) {
  const ext = path.extname(archivo).toLowerCase();
  const tipo = MIME[ext] || 'application/octet-stream';
  let st;
  try { st = fs.statSync(archivo); } catch (e) { res.writeHead(404); return res.end('No encontrado'); }

  const rango = req.headers.range;
  if (rango && /^bytes=/.test(rango) && /^(video|audio)\//.test(tipo)) {
    const partes = rango.replace('bytes=', '').split('-');
    const start = parseInt(partes[0], 10) || 0;
    const end = partes[1] ? parseInt(partes[1], 10) : st.size - 1;
    res.writeHead(206, {
      'Content-Type': tipo,
      'Accept-Ranges': 'bytes',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
      'Content-Length': end - start + 1
    });
    return fs.createReadStream(archivo, { start: start, end: end }).pipe(res);
  }
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': st.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': archivo.indexOf('uploads') !== -1 ? 'public, max-age=3600' : 'no-cache'
  });
  fs.createReadStream(archivo).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { res.writeHead(400); return res.end('URL inválida'); }

  if (ruta.indexOf('/api/') === 0) {
    try { return await manejar(req, res, ruta); }
    catch (e) {
      if (!res.headersSent) return json(res, 400, { error: e.message || 'Error inesperado' });
      return res.end();
    }
  }

  if (ruta === '/') ruta = '/index.html';
  if (ruta === '/admin' || ruta === '/admin/') ruta = '/admin.html';

  const destino = path.normalize(path.join(PUBLIC_DIR, ruta));
  if (destino.indexOf(PUBLIC_DIR) !== 0) { res.writeHead(403); return res.end('Prohibido'); }
  if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    /* un archivo que ya no está responde 404, como haría Vercel. Antes caía en
       index.html y una imagen borrada devolvía la página entera con un 200. */
    if (ruta.indexOf('/uploads/') === 0) { res.writeHead(404); return res.end('No encontrado'); }
    return servirArchivo(res, path.join(PUBLIC_DIR, 'index.html'), req);
  }
  servirArchivo(res, destino, req);
});

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

almacen.leerContenido().then(() => {
  servidor.listen(PORT, () => {
    console.log('');
    console.log('  ✦ Estudio Mango en línea');
    console.log('  ├─ Sitio:  http://localhost:' + PORT);
    console.log('  ├─ Admin:  http://localhost:' + PORT + '/admin');
    console.log('  ├─ Datos:  ' + (almacen.enPostgres() ? 'Postgres' : 'data/content.json'));
    console.log('  └─ Clave por defecto: ' + almacen.CLAVE_POR_DEFECTO + '   (cámbiala en Ajustes)');
    console.log('');
  });
}).catch((e) => {
  console.error('No pude abrir el almacén de contenido:', e.message);
  process.exit(1);
});
