/**
 * Dónde vive el contenido del portafolio.
 *
 *   · En tu ordenador  -> data/content.json (como siempre, sin instalar nada)
 *   · En Vercel        -> una tabla de Postgres
 *
 * Se elige solo: si hay cadena de conexión en el entorno, manda Postgres.
 * Las dos mitades devuelven y reciben exactamente el mismo objeto.
 */
const fs = require('fs');
const path = require('path');
const { crearCredencial } = require('./auth');

const RAIZ = path.join(__dirname, '..');
const DATA_FILE = path.join(RAIZ, 'data', 'content.json');
const CLAVE_POR_DEFECTO = process.env.ADMIN_PASS || 'mango2026';

const cadena = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const enPostgres = () => !!cadena();

function semilla() {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'seed.json'), 'utf8')); }
  catch (e) {
    try { return JSON.parse(JSON.stringify(require('../data/seed.json'))); }
    catch (e2) { return { perfil: {}, proyectos: [], servicios: [], proceso: [], contacto: {} }; }
  }
}

/* ───────────────────────────── Postgres ───────────────────────────── */
let pool = null;
let tablaLista = false;

function conexion() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: cadena(),
      /* los Postgres gestionados (Neon, Supabase, Prisma) exigen TLS y firman
         con su propia CA; sin esto la conexión se cae al arrancar */
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000
    });
  }
  return pool;
}

async function asegurarTabla() {
  if (tablaLista) return;
  await conexion().query(
    'CREATE TABLE IF NOT EXISTS contenido (' +
    '  id smallint PRIMARY KEY DEFAULT 1,' +
    '  datos jsonb NOT NULL,' +
    '  actualizado timestamptz NOT NULL DEFAULT now(),' +
    '  CONSTRAINT contenido_fila_unica CHECK (id = 1)' +
    ')'
  );
  tablaLista = true;
}

async function leerDePostgres() {
  await asegurarTabla();
  const r = await conexion().query('SELECT datos FROM contenido WHERE id = 1');
  if (r.rows.length) return r.rows[0].datos;
  const inicial = semilla();
  inicial.auth = crearCredencial(CLAVE_POR_DEFECTO);
  await guardarEnPostgres(inicial);
  return inicial;
}

async function guardarEnPostgres(data) {
  await asegurarTabla();
  await conexion().query(
    'INSERT INTO contenido (id, datos, actualizado) VALUES (1, $1, now()) ' +
    'ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado = now()',
    [JSON.stringify(data)]
  );
}

/* ─────────────────────────── archivo local ────────────────────────── */
function guardarEnArchivo(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function leerDeArchivo() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!data.auth) { data.auth = crearCredencial(CLAVE_POR_DEFECTO); guardarEnArchivo(data); }
    return data;
  } catch (e) {
    const data = semilla();
    data.auth = crearCredencial(CLAVE_POR_DEFECTO);
    guardarEnArchivo(data);
    return data;
  }
}

/* ────────────────────────────── fachada ───────────────────────────── */

/* En Vercel el disco es de solo lectura. Sin Postgres, el modo archivos falla
   con un "EROFS" que no dice nada; mejor explicar qué falta. */
const sinDisco = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const FALTA_BASE = 'Todavía no hay base de datos. En Vercel, entra en tu proyecto → ' +
  'Storage → Create Database → Postgres. Se conecta sola y el sitio se vuelve a desplegar.';

async function leerContenido() {
  if (enPostgres()) return leerDePostgres();
  if (sinDisco()) throw new Error(FALTA_BASE);
  return leerDeArchivo();
}

async function guardarContenido(data) {
  if (enPostgres()) return guardarEnPostgres(data);
  if (sinDisco()) throw new Error(FALTA_BASE);
  return guardarEnArchivo(data);
}

/* lo que ve cualquiera: el contenido sin la credencial */
async function contenidoPublico() {
  const data = await leerContenido();
  const copia = Object.assign({}, data);
  delete copia.auth;
  return copia;
}

module.exports = {
  leerContenido, guardarContenido, contenidoPublico,
  enPostgres, CLAVE_POR_DEFECTO
};
