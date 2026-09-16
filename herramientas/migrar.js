/**
 * Lleva el portafolio de tu ordenador a la nube.
 *
 *   1. sube todo lo de public/uploads/ a Vercel Blob
 *   2. reescribe las direcciones dentro del contenido
 *   3. guarda el contenido entero en Postgres
 *
 * Uso (desde la carpeta del proyecto):
 *
 *   npx vercel env pull .env.local
 *   node herramientas/migrar.js
 *
 * Es idempotente: si lo ejecutas dos veces no duplica nada, porque los archivos
 * que ya apuntan al Blob se saltan.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/* carga .env.local sin depender de nada */
(function cargarEntorno() {
  for (const nombre of ['.env.local', '.env']) {
    const f = path.join(RAIZ, nombre);
    if (!fs.existsSync(f)) continue;
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((linea) => {
      const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let valor = m[2].trim();
      if (/^".*"$/.test(valor) || /^'.*'$/.test(valor)) valor = valor.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = valor;
    });
  }
})();

const almacen = require('../lib/almacen');
const archivos = require('../lib/archivos');

const CONTENT = path.join(RAIZ, 'data', 'content.json');
const UPLOADS = path.join(RAIZ, 'public', 'uploads');

function abortar(msg) { console.error('\n  ✗ ' + msg + '\n'); process.exit(1); }

/* recorre el contenido entero cambiando cada dirección /uploads/... */
function reescribir(nodo, mapa) {
  if (Array.isArray(nodo)) return nodo.map((n) => reescribir(n, mapa));
  if (nodo && typeof nodo === 'object') {
    const salida = {};
    for (const k of Object.keys(nodo)) salida[k] = reescribir(nodo[k], mapa);
    return salida;
  }
  if (typeof nodo === 'string' && mapa[nodo]) return mapa[nodo];
  return nodo;
}

(async function principal() {
  console.log('\n  ✦ Migración a la nube\n');

  if (!fs.existsSync(CONTENT)) abortar('No encuentro data/content.json. Arranca el sitio en local una vez.');
  const contenido = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));

  const hayBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hayPg = almacen.enPostgres();
  console.log('  Blob:     ' + (hayBlob ? 'sí' : 'NO — no subiré archivos'));
  console.log('  Postgres: ' + (hayPg ? 'sí' : 'NO — no guardaré el contenido'));
  if (!hayBlob && !hayPg) abortar('Faltan las variables. Ejecuta antes:  npx vercel env pull .env.local');

  /* ---- 1 y 2: archivos ---- */
  const mapa = {};
  if (hayBlob && fs.existsSync(UPLOADS)) {
    const lista = fs.readdirSync(UPLOADS).filter((f) => !f.startsWith('.'));
    const texto = JSON.stringify(contenido);
    let subidos = 0, saltados = 0;

    for (const nombre of lista) {
      const ruta = '/uploads/' + nombre;
      if (texto.indexOf(ruta) === -1) { saltados++; continue; }   // no lo usa nadie
      const buffer = fs.readFileSync(path.join(UPLOADS, nombre));
      try {
        const subido = await archivos.guardarBuffer(buffer, nombre);
        mapa[ruta] = subido.url;
        subidos++;
        console.log('  ↑ ' + nombre + '  →  ' + subido.url.slice(0, 60) + '…');
      } catch (e) {
        console.log('  ! ' + nombre + ' no se pudo subir: ' + e.message);
      }
    }
    console.log('\n  Archivos subidos: ' + subidos + (saltados ? '  (' + saltados + ' sin usar, se quedan fuera)' : ''));
  }

  const migrado = reescribir(contenido, mapa);

  /* ---- 3: contenido ---- */
  if (hayPg) {
    await almacen.guardarContenido(migrado);
    console.log('\n  ✓ Contenido guardado en Postgres');
    console.log('    La contraseña que viaja es la misma que usas en local.');
  }

  /* copia de seguridad de lo que había, por si acaso */
  const copia = CONTENT.replace(/\.json$/, '-antes-de-migrar.json');
  fs.writeFileSync(copia, JSON.stringify(contenido, null, 2), 'utf8');
  console.log('  ✓ Copia de lo anterior en data/' + path.basename(copia));

  console.log('\n  Listo. Despliega con:  npx vercel --prod\n');
  process.exit(0);
})().catch((e) => abortar(e.message));
