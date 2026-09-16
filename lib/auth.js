/**
 * Contraseña y sesiones.
 *
 * La contraseña se guarda cifrada con scrypt y sal (nunca en claro).
 * El token de sesión va *firmado*, no guardado: así funciona igual en un
 * servidor que se queda encendido que en las funciones de Vercel, donde cada
 * petición arranca de cero y una lista de sesiones en memoria se perdería.
 *
 * La firma usa el propio hash de la contraseña como clave secreta. Efecto
 * práctico: al cambiar la contraseña, todas las sesiones abiertas caducan solas.
 */
const crypto = require('crypto');
const { SESSION_MS } = require('./comun');

function hash(clave, sal) {
  return crypto.scryptSync(String(clave), sal, 64).toString('hex');
}

function crearCredencial(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  return { sal, hash: hash(clave, sal) };
}

function claveValida(clave, cred) {
  if (!cred || !cred.sal || !cred.hash) return false;
  const a = Buffer.from(hash(clave, cred.sal), 'hex');
  const b = Buffer.from(cred.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function firma(cred, texto) {
  return crypto.createHmac('sha256', cred.hash).update(String(texto)).digest('hex');
}

function nuevoToken(cred) {
  const vence = Date.now() + SESSION_MS;
  return vence + '.' + firma(cred, vence);
}

function tokenValido(token, cred) {
  if (!cred || !cred.hash) return false;
  const partes = String(token || '').split('.');
  if (partes.length !== 2) return false;
  const vence = Number(partes[0]);
  if (!vence || Date.now() > vence) return false;
  const a = Buffer.from(partes[1], 'hex');
  const b = Buffer.from(firma(cred, partes[0]), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function tokenDe(req) {
  const cab = req.headers.authorization || '';
  return cab.startsWith('Bearer ') ? cab.slice(7).trim() : '';
}

module.exports = { crearCredencial, claveValida, nuevoToken, tokenValido, tokenDe };
