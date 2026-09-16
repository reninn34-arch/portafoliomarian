/**
 * Puerta de entrada de la API en Vercel.
 *
 * Vercel manda aquí cualquier /api/... y esta función se lo pasa al mismo
 * router que usa el servidor de tu ordenador, así no hay dos versiones de la
 * lógica que se puedan ir separando con el tiempo.
 */
const { manejar } = require('../lib/api');
const { json } = require('../lib/comun');

module.exports = async (req, res) => {
  let ruta = '/api';
  const partes = req.query && req.query.ruta;
  if (Array.isArray(partes) && partes.length) ruta = '/api/' + partes.join('/');
  else if (typeof partes === 'string' && partes) ruta = '/api/' + partes;
  else {
    try { ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch (e) { /* se queda en /api y responderá 404 */ }
  }

  try {
    await manejar(req, res, ruta);
  } catch (e) {
    if (!res.headersSent) json(res, 400, { error: e.message || 'Error inesperado' });
  }
};
