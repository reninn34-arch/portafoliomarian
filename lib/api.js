/**
 * La API del panel. Es la misma en tu ordenador y en Vercel: aquí no se toca
 * ni el disco ni la base de datos directamente, todo pasa por los almacenes.
 */
const https = require('https');
const { json, leerCuerpo, MAX_CUERPO, TIPOS_PERMITIDOS, MAX_ARCHIVO } = require('./comun');
const { crearCredencial, claveValida, nuevoToken, tokenValido, tokenDe } = require('./auth');
const almacen = require('./almacen');
const archivos = require('./archivos');

/* ───────────────────────────── ayudantes ──────────────────────────── */
function bajarBinario(url, saltos) {
  return new Promise((resolve, reject) => {
    if ((saltos || 0) > 5) return reject(new Error('demasiadas redirecciones'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(bajarBinario(r.headers.location, (saltos || 0) + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('respuesta ' + r.statusCode)); }
      const trozos = [];
      r.on('data', (c) => trozos.push(c));
      r.on('end', () => resolve(Buffer.concat(trozos)));
    }).on('error', reject);
  });
}

function bajarTexto(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let txt = '';
      r.on('data', (c) => { txt += c; });
      r.on('end', () => resolve(txt));
    }).on('error', reject);
  });
}

/* ─────────────────────────────── router ───────────────────────────── */
async function manejar(req, res, ruta) {
  const metodo = req.method;
  let credencial = null;

  const sesion = async () => {
    const data = await almacen.leerContenido();
    credencial = data.auth;
    return tokenValido(tokenDe(req), credencial);
  };
  const privada = async () => {
    if (await sesion()) return true;
    json(res, 401, { error: 'Sesión no válida. Inicia sesión de nuevo.' });
    return false;
  };

  /* ---- contenido ---- */
  if (ruta === '/api/content' && metodo === 'GET') {
    return json(res, 200, await almacen.contenidoPublico());
  }
  if (ruta === '/api/content' && metodo === 'PUT') {
    if (!await privada()) return;
    const body = await leerCuerpo(req);
    const actual = await almacen.leerContenido();
    const nuevo = Object.assign({}, body, { auth: actual.auth, actualizado: new Date().toISOString() });
    await almacen.guardarContenido(nuevo);
    return json(res, 200, { ok: true, actualizado: nuevo.actualizado });
  }

  /* ---- sesión ---- */
  if (ruta === '/api/auth/login' && metodo === 'POST') {
    const body = await leerCuerpo(req);
    const data = await almacen.leerContenido();
    if (!claveValida(body.clave || '', data.auth)) {
      await new Promise((r) => setTimeout(r, 600));
      return json(res, 401, { error: 'Contraseña incorrecta' });
    }
    return json(res, 200, { token: nuevoToken(data.auth) });
  }
  if (ruta === '/api/auth/check' && metodo === 'GET') {
    return json(res, 200, { ok: await sesion() });
  }
  if (ruta === '/api/auth/logout' && metodo === 'POST') {
    /* el token va firmado, no guardado: cerrar sesión es tirarlo en el panel.
       Caduca solo a las 12 h, y cambiar la contraseña invalida todos. */
    return json(res, 200, { ok: true });
  }
  if (ruta === '/api/auth/password' && metodo === 'POST') {
    if (!await privada()) return;
    const body = await leerCuerpo(req);
    const data = await almacen.leerContenido();
    if (!claveValida(body.actual || '', data.auth)) return json(res, 401, { error: 'La contraseña actual no coincide' });
    if (String(body.nueva || '').length < 6) return json(res, 400, { error: 'La nueva contraseña necesita 6 caracteres mínimo' });
    data.auth = crearCredencial(body.nueva);
    await almacen.guardarContenido(data);
    return json(res, 200, { ok: true });
  }

  /* ---- cómo está montado esto: se lo pregunta el panel al arrancar ---- */
  if (ruta === '/api/config' && metodo === 'GET') {
    return json(res, 200, {
      blob: archivos.enBlob(),
      postgres: almacen.enPostgres(),
      maxCuerpo: MAX_CUERPO,
      maxArchivo: MAX_ARCHIVO
    });
  }

  /* ---- archivos ---- */
  if (ruta === '/api/media' && metodo === 'GET') {
    if (!await privada()) return;
    return json(res, 200, await archivos.listarMedios());
  }
  if (ruta === '/api/media' && metodo === 'POST') {
    if (!await privada()) return;
    return json(res, 200, await archivos.guardarMedio(await leerCuerpo(req)));
  }
  if (ruta === '/api/media' && metodo === 'DELETE') {
    if (!await privada()) return;
    const body = await leerCuerpo(req);
    await archivos.borrarMedio(body.url);
    return json(res, 200, { ok: true });
  }

  /* Los archivos grandes no caben en el cuerpo de una función de Vercel (4,5 MB),
     así que el panel los manda directos al Blob con un permiso temporal que
     firma este endpoint. */
  if (ruta === '/api/subir' && metodo === 'POST') {
    if (!archivos.enBlob()) return json(res, 400, { error: 'Sin Blob: este modo sube por /api/media' });
    const body = await leerCuerpo(req, MAX_CUERPO);
    const { handleUpload } = require('@vercel/blob/client');
    try {
      const respuesta = await handleUpload({
        body: body,
        request: { headers: { get: (k) => req.headers[String(k).toLowerCase()] } },
        onBeforeGenerateToken: async (pathname, cargaCliente) => {
          const data = await almacen.leerContenido();
          if (!tokenValido(String(cargaCliente || ''), data.auth)) {
            throw new Error('Sesión no válida. Inicia sesión de nuevo.');
          }
          return {
            allowedContentTypes: TIPOS_PERMITIDOS,
            maximumSizeInBytes: MAX_ARCHIVO,
            addRandomSuffix: true
          };
        },
        onUploadCompleted: async () => { /* el panel guarda la URL él mismo */ }
      });
      return json(res, 200, respuesta);
    } catch (e) {
      return json(res, 401, { error: e.message || 'No pude autorizar la subida' });
    }
  }

  /* ---- enlaces de redes ---- */

  /* sigue las redirecciones de un enlace corto (vm.tiktok.com, instagr.am…)
     y devuelve la dirección final, que sí trae el id del vídeo */
  if (ruta === '/api/resolver' && metodo === 'POST') {
    if (!await privada()) return;
    const body = await leerCuerpo(req, MAX_CUERPO);
    const seguir = (url, saltos) => new Promise((resolve, reject) => {
      if (saltos > 6) return reject(new Error('demasiadas redirecciones'));
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        const destino = r.headers.location;
        r.resume();
        if (destino && r.statusCode >= 300 && r.statusCode < 400) {
          const abs = destino.startsWith('http') ? destino : new URL(destino, url).href;
          return resolve(seguir(abs, saltos + 1));
        }
        resolve(url);
      }).on('error', reject);
    });
    try {
      const final = await seguir(String(body.url || ''), 0);
      return json(res, 200, { url: final.split('?')[0] });
    } catch (e) {
      return json(res, 502, { error: 'No pude resolver el enlace: ' + e.message });
    }
  }

  /* descarga la miniatura de un enlace y la guarda como archivo propio, para que
     la portada no dependa de internet cada vez que alguien abre el sitio */
  if (ruta === '/api/miniatura' && metodo === 'POST') {
    if (!await privada()) return;
    const body = await leerCuerpo(req, MAX_CUERPO);
    const enlace = String(body.url || '');

    /* TikTok publica la portada por oEmbed, sin clave */
    if (/tiktok\.com/.test(enlace)) {
      try {
        const txt = await bajarTexto('https://www.tiktok.com/oembed?url=' + encodeURIComponent(enlace));
        let meta;
        try { meta = JSON.parse(txt); } catch (e) { throw new Error('oEmbed ilegible'); }
        if (!meta.thumbnail_url) throw new Error('sin miniatura');
        const buffer = await bajarBinario(meta.thumbnail_url, 0);
        const guardado = await archivos.guardarBuffer(buffer, 'tiktok.jpg');
        return json(res, 200, { url: guardado.url, peso: guardado.peso, titulo: meta.title || '' });
      } catch (e) {
        return json(res, 502, { error: 'TikTok no dio portada: ' + e.message + '. Sube una imagen de portada a mano.' });
      }
    }

    /* Instagram ya no publica miniatura sin token: se pone a mano */
    if (/instagram\.com/.test(enlace)) {
      return json(res, 501, { error: 'Instagram no deja descargar la portada. Sube una imagen tú y ponla como portada.' });
    }

    const id = (enlace.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/) || [])[1];
    if (!id) return json(res, 400, { error: 'No reconozco ese enlace' });
    const calidades = ['maxresdefault', 'hqdefault', 'mqdefault'];
    try {
      let buffer = null;
      for (let i = 0; i < calidades.length && !buffer; i++) {
        try {
          const intento = await bajarBinario('https://i.ytimg.com/vi/' + id + '/' + calidades[i] + '.jpg', 0);
          if (intento && intento.length > 1000) buffer = intento;
        } catch (e) { /* esa calidad no existe: se prueba la siguiente */ }
      }
      if (!buffer) throw new Error('YouTube no devolvió miniatura');
      const guardado = await archivos.guardarBuffer(buffer, 'yt-' + id + '.jpg');
      return json(res, 200, { url: guardado.url, peso: guardado.peso });
    } catch (e) {
      return json(res, 502, { error: 'No pude descargar la miniatura: ' + e.message });
    }
  }

  return json(res, 404, { error: 'Endpoint no encontrado' });
}

module.exports = { manejar };
