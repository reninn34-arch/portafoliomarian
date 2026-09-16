/* ══════════════════════════════════════════════════════════════
   ESTUDIO MANGO · panel de administración
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
  const pesoBonito = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  let TOKEN = localStorage.getItem('mango-token') || '';
  let D = null;                 // contenido completo
  let SUCIO = false;
  let TEMPORIZADOR = null;
  let PROYECTO = null;          // proyecto en edición
  let VISTA = 'perfil';

  const TITULOS = {
    perfil: ['Perfil', 'Los datos que aparecen en la portada'],
    proyectos: ['Proyectos', 'Sube diseños y videos, ordénalos y edítalos'],
    servicios: ['Servicios', 'Lo que ofreces a tus clientes'],
    proceso: ['Proceso', 'Los pasos de tu forma de trabajar'],
    contacto: ['Contacto', 'Email y redes del estudio'],
    biblioteca: ['Biblioteca', 'Todos los archivos subidos al servidor'],
    ajustes: ['Ajustes', 'Sitio, contraseña y copias de seguridad']
  };

  /* ═════════ API ═════════ */
  async function api(ruta, metodo, cuerpo) {
    const r = await fetch(ruta, {
      method: metodo || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('Error ' + r.status));
    return data;
  }

  /* cómo está montado el servidor: con archivos (tu ordenador) o con
     Postgres + Blob (Vercel). Cambia por dónde viajan las subidas. */
  let CONFIG = { blob: false, maxCuerpo: 4 * 1024 * 1024 };
  async function cargarConfig() {
    try { CONFIG = Object.assign(CONFIG, await api('/api/config')); }
    catch (e) { /* servidor antiguo: se queda el modo archivos */ }
  }

  function nombreLimpio(nombre) {
    const punto = String(nombre || '').lastIndexOf('.');
    const ext = punto > 0 ? nombre.slice(punto).toLowerCase() : '';
    const base = (punto > 0 ? nombre.slice(0, punto) : String(nombre || 'archivo'))
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'archivo';
    return base + ext;
  }

  /* Vercel corta el cuerpo de una función en 4,5 MB, así que un vídeo no cabe
     por la API. En ese caso el archivo va directo al Blob con un permiso que
     firma el servidor, y aquí solo llega la dirección final. */
  async function subirAlBlob(file, nombre, alProgresar) {
    const { upload } = await import('https://esm.sh/@vercel/blob@1.1.1/client');
    const subido = await upload(nombre, file, {
      access: 'public',
      handleUploadUrl: '/api/subir',
      clientPayload: TOKEN,
      onUploadProgress: (p) => { if (alProgresar) alProgresar((p.percentage || 0) / 100); }
    });
    return { url: subido.url, nombre: nombre, peso: file.size, tipo: file.type };
  }

  function subirPorApi(file, nombre, alProgresar) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
      fr.onload = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + TOKEN);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && alProgresar) alProgresar(e.loaded / e.total); };
        xhr.onload = () => {
          let res = {};
          try { res = JSON.parse(xhr.responseText); } catch (e) {}
          if (xhr.status >= 200 && xhr.status < 300) resolve(res);
          else reject(new Error(res.error || 'Error al subir'));
        };
        xhr.onerror = () => reject(new Error('Fallo de red al subir'));
        xhr.send(JSON.stringify({ nombre: nombre, datos: fr.result }));
      };
      fr.readAsDataURL(file);
    });
  }

  function subirArchivo(file, alProgresar, nombrePedido) {
    const nombre = nombreLimpio(nombrePedido || file.name);
    /* en base64 el archivo engorda un tercio: por eso el margen de 0,7 */
    if (CONFIG.blob && file.size > CONFIG.maxCuerpo * 0.7) {
      return subirAlBlob(file, nombre, alProgresar);
    }
    return subirPorApi(file, nombre, alProgresar);
  }

  /* saca un fotograma del video para usarlo de portada */
  function posterDeVideo(file) {
    return new Promise((listo) => {
      let resuelto = false;
      const acabar = (v) => { if (!resuelto) { resuelto = true; listo(v); } };
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);
      const pintar = () => {
        try {
          const c = document.createElement('canvas');
          c.width = video.videoWidth;
          c.height = video.videoHeight;
          if (!c.width || !c.height) return acabar(null);
          c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
          URL.revokeObjectURL(video.src);
          acabar(c.toDataURL('image/jpeg', 0.82));
        } catch (e) { acabar(null); }
      };
      video.addEventListener('error', () => acabar(null), { once: true });
      video.addEventListener('loadeddata', () => {
        const t = Math.min(0.6, (video.duration || 2) * 0.12);
        video.addEventListener('seeked', pintar, { once: true });
        try { video.currentTime = t; } catch (e) { pintar(); }
      }, { once: true });
      setTimeout(() => acabar(null), 7000);
    });
  }

  /* ═════════ avisos ═════════ */
  function avisar(texto, tipo) {
    const el = document.createElement('div');
    el.className = 'aviso' + (tipo ? ' aviso--' + tipo : '');
    el.textContent = texto;
    $('#avisos').appendChild(el);
    setTimeout(() => { el.classList.add('saliendo'); setTimeout(() => el.remove(), 400); }, 3400);
  }

  /* ═════════ rutas de objeto ═════════ */
  function leerRuta(obj, ruta) { return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function escribirRuta(obj, ruta, valor) {
    const partes = ruta.split('.');
    const ultima = partes.pop();
    const destino = partes.reduce((o, k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; return o[k]; }, obj);
    destino[ultima] = valor;
  }

  /* ═════════ guardado ═════════ */
  function marcarSucio() {
    SUCIO = true;
    $('#estado-guardado').textContent = 'Cambios sin guardar';
    $('#estado-guardado').classList.add('sucio');
    clearTimeout(TEMPORIZADOR);
    TEMPORIZADOR = setTimeout(guardar, 2200);
  }
  async function guardar(silencioso) {
    clearTimeout(TEMPORIZADOR);
    if (!D) return;
    try {
      $('#estado-guardado').textContent = 'Guardando…';
      const copia = JSON.parse(JSON.stringify(D));
      delete copia.auth;
      await api('/api/content', 'PUT', copia);
      SUCIO = false;
      $('#estado-guardado').textContent = 'Todo guardado';
      $('#estado-guardado').classList.remove('sucio');
      if (!silencioso) avisar('Cambios publicados en el sitio ✦');
    } catch (e) {
      $('#estado-guardado').textContent = 'Error al guardar';
      avisar(e.message, 'error');
      if (/sesión/i.test(e.message)) cerrarSesion();
    }
  }

  /* ═════════ acceso ═════════ */
  async function comprobarSesion() {
    if (!TOKEN) return false;
    try { const r = await api('/api/auth/check'); return !!r.ok; } catch (e) { return false; }
  }
  function cerrarSesion() {
    api('/api/auth/logout', 'POST').catch(() => {});
    localStorage.removeItem('mango-token');
    TOKEN = '';
    $('#panel').hidden = true;
    $('#acceso').style.display = '';
  }

  /* ═════════ render: listas simples ═════════ */
  function filaTexto(valor, alCambiar, alQuitar, marcador) {
    const fila = document.createElement('div');
    fila.className = 'fila';
    const input = document.createElement('input');
    input.value = valor || '';
    input.placeholder = marcador || '';
    input.addEventListener('input', () => { alCambiar(input.value); marcarSucio(); });
    const x = document.createElement('button');
    x.className = 'btn btn--texto btn--mini';
    x.textContent = '✕';
    x.title = 'Quitar';
    x.addEventListener('click', alQuitar);
    fila.appendChild(input); fila.appendChild(x);
    return fila;
  }

  function pintarPerfil() {
    // cifras
    const cont = $('#lista-datos');
    cont.innerHTML = '';
    const datos = D.perfil.datos = D.perfil.datos || [];
    datos.forEach((d, i) => {
      const fila = document.createElement('div');
      fila.className = 'fila';
      fila.innerHTML =
        '<input style="max-width:90px" placeholder="120" value="' + esc(d.numero) + '" data-k="numero">' +
        '<input style="max-width:70px" placeholder="+" value="' + esc(d.sufijo || '') + '" data-k="sufijo">' +
        '<input placeholder="proyectos entregados" value="' + esc(d.texto) + '" data-k="texto">' +
        '<button class="btn btn--texto btn--mini">✕</button>';
      $$('input', fila).forEach((inp) => inp.addEventListener('input', () => { d[inp.dataset.k] = inp.value; marcarSucio(); }));
      $('button', fila).addEventListener('click', () => { datos.splice(i, 1); pintarPerfil(); marcarSucio(); });
      cont.appendChild(fila);
    });
    // frases
    const fr = $('#lista-frases');
    fr.innerHTML = '';
    const frases = D.perfil.frases = D.perfil.frases || [];
    frases.forEach((f, i) => fr.appendChild(filaTexto(f,
      (v) => { frases[i] = v; },
      () => { frases.splice(i, 1); pintarPerfil(); marcarSucio(); },
      'Una frase inspiradora…')));
  }

  function pintarTips() {
    const cont = $('#lista-tips');
    cont.innerHTML = '';
    D.gato = D.gato || {};
    const tips = D.gato.tips = D.gato.tips || [];
    tips.forEach((t, i) => cont.appendChild(filaTexto(t,
      (v) => { tips[i] = v; },
      () => { tips.splice(i, 1); pintarTips(); marcarSucio(); },
      'Miau…')));
  }

  function pintarServicios() {
    const cont = $('#lista-servicios');
    cont.innerHTML = '';
    const lista = D.servicios = D.servicios || [];
    lista.forEach((s, i) => {
      const b = document.createElement('div');
      b.className = 'bloque';
      b.innerHTML =
        '<button class="bloque__quitar">✕</button>' +
        '<div class="grid-2">' +
          '<label class="campo"><span>Icono</span><input data-k="icono" value="' + esc(s.icono || '') + '" placeholder="✷"></label>' +
          '<label class="campo"><span>Título</span><input data-k="titulo" value="' + esc(s.titulo || '') + '"></label>' +
        '</div>' +
        '<label class="campo"><span>Descripción</span><textarea rows="2" data-k="texto">' + esc(s.texto || '') + '</textarea></label>' +
        '<label class="campo"><span>Incluye (separado por comas)</span><input data-k="incluye" value="' + esc((s.incluye || []).join(', ')) + '"></label>';
      $$('[data-k]', b).forEach((inp) => inp.addEventListener('input', () => {
        if (inp.dataset.k === 'incluye') s.incluye = inp.value.split(',').map((x) => x.trim()).filter(Boolean);
        else s[inp.dataset.k] = inp.value;
        marcarSucio();
      }));
      $('.bloque__quitar', b).addEventListener('click', () => { lista.splice(i, 1); pintarServicios(); marcarSucio(); });
      cont.appendChild(b);
    });
  }

  function pintarProceso() {
    const cont = $('#lista-proceso');
    cont.innerHTML = '';
    const lista = D.proceso = D.proceso || [];
    lista.forEach((p, i) => {
      const b = document.createElement('div');
      b.className = 'bloque';
      b.innerHTML =
        '<button class="bloque__quitar">✕</button>' +
        '<label class="campo"><span>Paso ' + (i + 1) + ' · título</span><input data-k="titulo" value="' + esc(p.titulo || '') + '"></label>' +
        '<label class="campo"><span>Descripción</span><textarea rows="2" data-k="texto">' + esc(p.texto || '') + '</textarea></label>';
      $$('[data-k]', b).forEach((inp) => inp.addEventListener('input', () => { p[inp.dataset.k] = inp.value; marcarSucio(); }));
      $('.bloque__quitar', b).addEventListener('click', () => { lista.splice(i, 1); pintarProceso(); marcarSucio(); });
      cont.appendChild(b);
    });
  }

  function pintarRedes() {
    const cont = $('#lista-redes');
    cont.innerHTML = '';
    D.contacto = D.contacto || {};
    const lista = D.contacto.redes = D.contacto.redes || [];
    lista.forEach((r, i) => {
      const b = document.createElement('div');
      b.className = 'bloque';
      b.innerHTML =
        '<button class="bloque__quitar">✕</button>' +
        '<div class="grid-2">' +
          '<label class="campo"><span>Nombre</span><input data-k="nombre" value="' + esc(r.nombre || '') + '"></label>' +
          '<label class="campo"><span>URL</span><input data-k="url" value="' + esc(r.url || '') + '" placeholder="https://…"></label>' +
        '</div>';
      $$('[data-k]', b).forEach((inp) => inp.addEventListener('input', () => { r[inp.dataset.k] = inp.value; marcarSucio(); }));
      $('.bloque__quitar', b).addEventListener('click', () => { lista.splice(i, 1); pintarRedes(); marcarSucio(); });
      cont.appendChild(b);
    });
  }

  /* ═════════ proyectos ═════════ */
  function tipoMedio(m) {
    if (m.tipo && m.tipo !== 'auto') return m.tipo;
    const u = String(m.url || '').toLowerCase();
    if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
    if (/vimeo\.com/.test(u)) return 'vimeo';
    if (/instagram\.com/.test(u)) return 'instagram';
    if (/tiktok\.com/.test(u)) return 'tiktok';
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video';
    return 'imagen';
  }
  function miniaturaYoutube(url) {
    const id = (String(url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/) || [])[1];
    return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : null;
  }

  function vistaPreviaHTML(m, clase) {
    if (m.portada) return '<img src="' + esc(m.portada) + '" alt="">';
    const t = tipoMedio(m);
    if (t === 'imagen') return '<img src="' + esc(m.url) + '" alt="">';
    if (t === 'video') return '<video src="' + esc(m.url) + '#t=0.1" muted preload="metadata"></video>';
    if (window.Embeds) {
      const det = Embeds.detectar(m.url);
      if (det && Embeds.esIncrustable(det.red) && det.red !== 'YOUTUBE')
        return '<span class="icono" title="' + esc(Embeds.etiqueta(det.red)) + '">' +
          ({ TIKTOK: '♪', INSTAGRAM: '◎', FACEBOOK: 'f', VIMEO: 'V' }[det.red] || '▶') + '</span>';
    }
    if (t === 'youtube') {
      const th = miniaturaYoutube(m.url);
      if (th) return '<img src="' + esc(th) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'icono\',textContent:\'▶\'}))">';
    }
    return '<span class="icono">▶</span>';
  }

  function pintarProyectos() {
    const cont = $('#lista-proyectos');
    const filtro = ($('#buscar-proyecto').value || '').toLowerCase();
    const lista = D.proyectos = D.proyectos || [];
    $('#cuenta-proyectos').textContent = lista.length;
    cont.innerHTML = '';

    lista.forEach((p, i) => {
      const texto = (p.titulo + ' ' + (p.categoria || '') + ' ' + (p.cliente || '')).toLowerCase();
      if (filtro && texto.indexOf(filtro) === -1) return;

      const medios = p.medios || [];
      const cov = medios[0];
      const fila = document.createElement('article');
      fila.className = 'proyecto-fila';
      fila.innerHTML =
        '<div class="proyecto-fila__medio" style="background:' + esc(p.color || '#2a2350') + '">' +
          (cov ? vistaPreviaHTML(cov) : '<b>' + esc(String(p.titulo || '?').charAt(0).toUpperCase()) + '</b>') +
        '</div>' +
        '<div><h4>' + esc(p.titulo || 'Sin título') + '</h4>' +
          '<small>' + esc(p.cliente || 'Sin cliente') + (p.anio ? ' · ' + esc(p.anio) : '') + ' · ' + medios.length + ' archivo(s)</small>' +
          '<div class="proyecto-fila__tags">' +
            '<span class="etiq">' + esc(p.categoria || 'Sin categoría') + '</span>' +
            (p.destacado ? '<span class="etiq etiq--dest">destacado</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="proyecto-fila__botones">' +
          '<button class="btn btn--texto btn--mini" data-a="arriba" title="Subir">▲</button>' +
          '<button class="btn btn--texto btn--mini" data-a="abajo" title="Bajar">▼</button>' +
          '<button class="btn btn--fantasma btn--mini" data-a="editar">Editar</button>' +
        '</div>';

      $('[data-a="editar"]', fila).addEventListener('click', () => abrirCajon(p));
      $('[data-a="arriba"]', fila).addEventListener('click', () => {
        if (i === 0) return;
        lista.splice(i - 1, 0, lista.splice(i, 1)[0]); pintarProyectos(); marcarSucio();
      });
      $('[data-a="abajo"]', fila).addEventListener('click', () => {
        if (i === lista.length - 1) return;
        lista.splice(i + 1, 0, lista.splice(i, 1)[0]); pintarProyectos(); marcarSucio();
      });
      cont.appendChild(fila);
    });

    if (!cont.children.length) {
      cont.innerHTML = '<p class="ayuda">No hay proyectos que coincidan. Crea uno nuevo con el botón de arriba.</p>';
    }
  }

  function abrirCajon(p) {
    PROYECTO = p;
    $('#cajon-titulo').textContent = p.titulo ? 'Editar · ' + p.titulo : 'Nuevo proyecto';
    pintarCajon();
    $('#cajon').hidden = false;
  }
  function cerrarCajon() {
    $('#cajon').hidden = true;
    PROYECTO = null;
    pintarProyectos();
    guardar(true);
  }

  function pintarCajon() {
    const p = PROYECTO;
    const cats = D.categorias || [];
    const cuerpo = $('#cajon-cuerpo');
    cuerpo.innerHTML =
      '<div class="grid-2">' +
        '<label class="campo"><span>Título</span><input data-p="titulo" value="' + esc(p.titulo || '') + '"></label>' +
        '<label class="campo"><span>Categoría</span><input data-p="categoria" list="cats" value="' + esc(p.categoria || '') + '">' +
          '<datalist id="cats">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist></label>' +
        '<label class="campo"><span>Cliente</span><input data-p="cliente" value="' + esc(p.cliente || '') + '"></label>' +
        '<label class="campo"><span>Año</span><input data-p="anio" value="' + esc(p.anio || '') + '"></label>' +
        '<label class="campo"><span>Color de acento</span><input type="color" data-p="color" value="' + esc(p.color || '#ff8a3d') + '" style="height:46px;padding:4px"></label>' +
        '<label class="campo campo--switch"><input type="checkbox" data-p="destacado"' + (p.destacado ? ' checked' : '') + '><span>Marcar como destacado</span></label>' +
      '</div>' +
      '<label class="campo"><span>Resumen (una línea en la tarjeta)</span><input data-p="resumen" value="' + esc(p.resumen || '') + '"></label>' +
      '<label class="campo"><span>Descripción completa</span><textarea rows="6" data-p="descripcion">' + esc(p.descripcion || '') + '</textarea></label>' +
      '<label class="campo"><span>Etiquetas (separadas por comas)</span><input data-p="etiquetas" value="' + esc((p.etiquetas || []).join(', ')) + '"></label>' +
      '<label class="campo"><span>Enlace externo (opcional)</span><input data-p="enlace" value="' + esc(p.enlace || '') + '" placeholder="https://behance.net/…"></label>' +

      '<hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">' +
      '<h3 style="font-size:13px;margin-bottom:4px">Ficha de caso</h3>' +
      '<p class="ayuda">Las dos preguntas que explican el proyecto, más la paleta y las tipografías. Salen en la ficha grande.</p>' +
      '<label class="campo"><span>Objetivo del proyecto — qué pedía el cliente</span>' +
        '<textarea rows="4" data-p="objetivo" placeholder="Qué problema había que resolver…">' + esc(p.objetivo || '') + '</textarea></label>' +
      '<label class="campo"><span>Decisión de diseño — por qué lo resolviste así</span>' +
        '<textarea rows="4" data-p="decision" placeholder="Qué decidiste y por qué funciona…">' + esc(p.decision || '') + '</textarea></label>' +
      '<div class="grid-2">' +
        '<div><span class="mini-titulo">Paleta</span><div id="lista-paleta" class="lista-simple"></div>' +
          '<button class="btn btn--fantasma btn--mini" id="btn-color">+ Añadir color</button></div>' +
        '<div><span class="mini-titulo">Tipografías</span><div id="lista-tipos" class="lista-simple"></div>' +
          '<button class="btn btn--fantasma btn--mini" id="btn-tipo">+ Añadir tipografía</button></div>' +
      '</div>' +

      '<hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">' +
      '<h3 style="font-size:13px;margin-bottom:4px">La marca en redes</h3>' +
      '<p class="ayuda">Si marcas piezas como post, se ven como publicaciones de Instagram con esta cuenta.</p>' +
      '<div class="grid-2">' +
        '<label class="campo"><span>Cuenta</span><input data-p="cuenta" value="' + esc(p.cuenta || '') + '" placeholder="@sumarca"></label>' +
        '<div><span class="mini-titulo">Foto de perfil</span><div id="avatar-marca"></div></div>' +
      '</div>' +

      '<hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">' +
      '<h3 style="font-size:13px;margin-bottom:4px">Imágenes y videos</h3>' +
      '<p class="ayuda">El primer archivo es la portada de la tarjeta. Arrastra archivos o pega un enlace de YouTube/Vimeo.</p>' +
      '<div class="medios-proyecto" id="medios-proyecto"></div>' +
      '<div class="soltar" id="soltar-proyecto">' +
        '<b>Suelta aquí imágenes o videos</b><span>jpg · png · webp · gif · svg · mp4 · webm · mov · pdf</span>' +
        '<button class="btn btn--fantasma" id="btn-subir-proyecto">Elegir archivos</button>' +
        '<input type="file" id="file-proyecto" multiple hidden accept="image/*,video/*,.pdf">' +
      '</div>' +
      '<div class="progreso" id="progreso-proyecto" hidden><div class="progreso__barra"><span></span></div><small></small></div>' +
      '<div class="fila-acciones" style="margin-top:14px">' +
        '<input id="url-externa" placeholder="https://youtube.com/watch?v=… o /uploads/archivo.jpg" style="flex:1;min-width:220px">' +
        '<button class="btn btn--fantasma" id="btn-url-externa">Añadir enlace</button>' +
      '</div>';

    $$('[data-p]', cuerpo).forEach((inp) => {
      const k = inp.dataset.p;
      inp.addEventListener('input', () => {
        if (inp.type === 'checkbox') p[k] = inp.checked;
        else if (k === 'etiquetas') p.etiquetas = inp.value.split(',').map((x) => x.trim()).filter(Boolean);
        else p[k] = inp.value;
        if (k === 'titulo') $('#cajon-titulo').textContent = 'Editar · ' + (inp.value || 'sin título');
        marcarSucio();
      });
    });

    pintarPaleta();
    pintarTipos();
    pintarAvatar();
    $('#btn-color').addEventListener('click', () => {
      p.paleta = p.paleta || [];
      p.paleta.push('#FFC857');
      pintarPaleta(); marcarSucio();
    });
    $('#btn-tipo').addEventListener('click', () => {
      p.tipografias = p.tipografias || [];
      p.tipografias.push({ nombre: 'Nombre de la fuente', uso: 'dónde se usa' });
      pintarTipos(); marcarSucio();
    });

    pintarMediosProyecto();
    zonaSoltar($('#soltar-proyecto'), $('#file-proyecto'), $('#btn-subir-proyecto'), $('#progreso-proyecto'), async (res, archivo) => {
      p.medios = p.medios || [];
      const esVideo = /^video/.test(res.tipo);
      const medio = { url: res.url, tipo: esVideo ? 'video' : (res.tipo === 'application/pdf' ? 'pdf' : 'imagen'), titulo: '' };
      p.medios.push(medio);
      pintarMediosProyecto();
      marcarSucio();
      if (esVideo && archivo) {
        const datos = await posterDeVideo(archivo);
        if (datos) {
          try {
            const sub = await api('/api/media', 'POST', { nombre: 'portada-' + archivo.name.replace(/\.[^.]+$/, '') + '.jpg', datos: datos });
            medio.portada = sub.url;
            pintarMediosProyecto();
            marcarSucio();
            avisar('Portada del video lista ✦');
          } catch (e) { avisar('No pude sacar la portada del video', 'error'); }
        }
      }
    });
    $('#btn-url-externa').addEventListener('click', async () => {
      const url = $('#url-externa').value.trim();
      if (!url) return;
      p.medios = p.medios || [];
      const medio = { url: url, tipo: 'auto', titulo: '' };
      p.medios.push(medio);
      $('#url-externa').value = '';
      pintarMediosProyecto();
      marcarSucio();
      avisar('Enlace añadido al proyecto');

      // enlace corto de la app de TikTok: no trae el id del vídeo, lo resuelve el servidor
      const det = window.Embeds ? Embeds.detectar(url) : null;
      if (det && det.corto) {
        try {
          const fin = await api('/api/resolver', 'POST', { url: url });
          medio.url = fin.url;
          pintarMediosProyecto();
          marcarSucio();
          avisar('Enlace de TikTok resuelto ✦');
        } catch (e) { avisar(e.message, 'info'); }
      }

      if (/youtube\.com|youtu\.be|tiktok\.com|instagram\.com/.test(medio.url)) {
        try {
          const mini = await api('/api/miniatura', 'POST', { url: medio.url });
          medio.portada = mini.url;
          pintarMediosProyecto();
          marcarSucio();
          avisar('Portada descargada ✦');
        } catch (e) { avisar(e.message, 'info'); }
      }
    });
  }

  function pintarAvatar() {
    const p = PROYECTO;
    const cont = $('#avatar-marca');
    if (!cont) return;
    cont.className = 'fila';
    cont.innerHTML =
      (p.avatar ? '<img src="' + esc(p.avatar) + '" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 auto">' : '') +
      '<button class="btn btn--fantasma btn--mini">' + (p.avatar ? 'Cambiar' : 'Subir foto') + '</button>' +
      (p.avatar ? '<button class="btn btn--texto btn--mini" data-a="quitar-avatar">✕</button>' : '');
    $('button', cont).addEventListener('click', () => {
      const sel = document.createElement('input');
      sel.type = 'file'; sel.accept = 'image/*';
      sel.addEventListener('change', async () => {
        const f = sel.files[0];
        if (!f) return;
        try {
          const sub = await subirArchivo(f, null, 'avatar-' + f.name);
          p.avatar = sub.url;
          pintarAvatar(); marcarSucio();
          avisar('Foto de perfil lista ✦');
        } catch (e) { avisar(e.message, 'error'); }
      });
      sel.click();
    });
    const quitar = $('[data-a="quitar-avatar"]', cont);
    if (quitar) quitar.addEventListener('click', () => { delete p.avatar; pintarAvatar(); marcarSucio(); });
  }

  function pintarPaleta() {
    const p = PROYECTO;
    const cont = $('#lista-paleta');
    if (!cont) return;
    const paleta = p.paleta = p.paleta || [];
    cont.innerHTML = '';
    if (!paleta.length) cont.innerHTML = '<p class="ayuda" style="margin:0 0 8px">Sin colores todavía.</p>';
    paleta.forEach((c, i) => {
      const fila = document.createElement('div');
      fila.className = 'fila';
      fila.innerHTML =
        '<input type="color" value="' + esc(c) + '" style="width:52px;height:40px;padding:3px;flex:0 0 auto">' +
        '<input value="' + esc(c) + '" style="flex:1" spellcheck="false">' +
        '<button class="btn btn--texto btn--mini">✕</button>';
      const [color, texto] = $$('input', fila);
      color.addEventListener('input', () => { paleta[i] = color.value.toUpperCase(); texto.value = paleta[i]; marcarSucio(); });
      texto.addEventListener('input', () => {
        paleta[i] = texto.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(paleta[i])) color.value = paleta[i];
        marcarSucio();
      });
      $('button', fila).addEventListener('click', () => { paleta.splice(i, 1); pintarPaleta(); marcarSucio(); });
      cont.appendChild(fila);
    });
  }

  function pintarTipos() {
    const p = PROYECTO;
    const cont = $('#lista-tipos');
    if (!cont) return;
    const tipos = p.tipografias = p.tipografias || [];
    cont.innerHTML = '';
    if (!tipos.length) cont.innerHTML = '<p class="ayuda" style="margin:0 0 8px">Sin tipografías todavía.</p>';
    tipos.forEach((t, i) => {
      const fila = document.createElement('div');
      fila.className = 'fila';
      fila.innerHTML =
        '<input value="' + esc(t.nombre || '') + '" placeholder="Fraunces" style="flex:1">' +
        '<input value="' + esc(t.uso || '') + '" placeholder="titulares" style="flex:1">' +
        '<button class="btn btn--texto btn--mini">✕</button>';
      const [nombre, uso] = $$('input', fila);
      nombre.addEventListener('input', () => { t.nombre = nombre.value; marcarSucio(); });
      uso.addEventListener('input', () => { t.uso = uso.value; marcarSucio(); });
      $('button', fila).addEventListener('click', () => { tipos.splice(i, 1); pintarTipos(); marcarSucio(); });
      cont.appendChild(fila);
    });
  }

  function pintarMediosProyecto() {
    const p = PROYECTO;
    const cont = $('#medios-proyecto');
    const medios = p.medios = p.medios || [];
    cont.innerHTML = '';
    if (!medios.length) {
      cont.innerHTML = '<p class="ayuda" style="grid-column:1/-1;margin:0">Todavía sin archivos. La tarjeta mostrará un fondo de color con la inicial.</p>';
      return;
    }
    medios.forEach((m, i) => {
      const el = document.createElement('div');
      el.className = 'medio-mini';
      el.innerHTML =
        '<div class="medio-mini__vista">' + vistaPreviaHTML(m) + '</div>' +
        (m.post ? '<span class="medio-mini__post">post</span>' : (i === 0 ? '<span class="medio-mini__portada">portada</span>' : '')) +
        '<div class="medio-mini__acciones">' +
          '<button data-a="post" title="' + (m.post ? 'Quitar de la parrilla de posts' : 'Mostrar como post de Instagram') + '"' +
            (m.post ? ' class="activo"' : '') + '>◫</button>' +
          '<button data-a="izq" title="Mover antes">◀</button>' +
          '<button data-a="der" title="Mover después">▶</button>' +
          '<button data-a="portada" title="Poner una imagen de portada">◧</button>' +
          '<button data-a="quitar" title="Quitar del proyecto">✕</button>' +
        '</div>';
      $('[data-a="izq"]', el).addEventListener('click', () => {
        if (i === 0) return; medios.splice(i - 1, 0, medios.splice(i, 1)[0]); pintarMediosProyecto(); marcarSucio();
      });
      $('[data-a="der"]', el).addEventListener('click', () => {
        if (i === medios.length - 1) return; medios.splice(i + 1, 0, medios.splice(i, 1)[0]); pintarMediosProyecto(); marcarSucio();
      });
      $('[data-a="post"]', el).addEventListener('click', () => {
        if (m.post) { delete m.post; delete m.pie; }
        else { m.post = true; m.pie = m.pie || ''; }
        pintarMediosProyecto(); marcarSucio();
      });
      $('[data-a="portada"]', el).addEventListener('click', () => {
        const sel = document.createElement('input');
        sel.type = 'file'; sel.accept = 'image/*';
        sel.addEventListener('change', async () => {
          const f = sel.files[0];
          if (!f) return;
          try {
            const sub = await subirArchivo(f, null, 'portada-' + f.name);
            m.portada = sub.url;
            pintarMediosProyecto();
            marcarSucio();
            avisar('Portada puesta ✦');
          } catch (e) { avisar(e.message, 'error'); }
        });
        sel.click();
      });
      $('[data-a="quitar"]', el).addEventListener('click', () => {
        medios.splice(i, 1); pintarMediosProyecto(); marcarSucio();
      });
      if (m.post) {
        const pie = document.createElement('input');
        pie.value = m.pie || '';
        pie.placeholder = 'Pie del post…';
        pie.className = 'medio-mini__piein';
        pie.addEventListener('input', () => { m.pie = pie.value; marcarSucio(); });
        el.appendChild(pie);
      }
      cont.appendChild(el);
    });
  }

  /* ═════════ subidas ═════════ */
  function zonaSoltar(zona, input, boton, progreso, alSubir) {
    if (!zona) return;
    const abrir = () => input.click();
    boton.addEventListener('click', abrir);
    input.addEventListener('change', () => { procesar(Array.from(input.files)); input.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('encima'); }));
    ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('encima'); }));
    zona.addEventListener('drop', (e) => procesar(Array.from(e.dataTransfer.files)));

    async function procesar(archivos) {
      if (!archivos.length) return;
      progreso.hidden = false;
      const barra = $('span', progreso);
      const nota = $('small', progreso);
      for (let i = 0; i < archivos.length; i++) {
        const f = archivos[i];
        nota.textContent = 'Subiendo ' + f.name + ' (' + pesoBonito(f.size) + ') · ' + (i + 1) + '/' + archivos.length;
        try {
          const res = await subirArchivo(f, (p) => { barra.style.width = Math.round(p * 100) + '%'; });
          barra.style.width = '100%';
          alSubir(res, f);
        } catch (e) {
          avisar(f.name + ': ' + e.message, 'error');
        }
        barra.style.width = '0%';
      }
      nota.textContent = '';
      progreso.hidden = true;
      avisar(archivos.length + ' archivo(s) subido(s) ✦');
    }
  }

  async function pintarBiblioteca() {
    const cont = $('#galeria');
    cont.innerHTML = '<p class="ayuda">Cargando…</p>';
    try {
      const lista = await api('/api/media');
      if (!lista.length) { cont.innerHTML = '<p class="ayuda">La biblioteca está vacía. Sube tus primeros archivos arriba.</p>'; return; }
      cont.innerHTML = '';
      lista.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'medio-tarjeta';
        el.innerHTML =
          '<div class="medio-tarjeta__vista">' + vistaPreviaHTML({ url: m.url, tipo: /^video/.test(m.tipo) ? 'video' : (/^image/.test(m.tipo) ? 'imagen' : 'otro') }) + '</div>' +
          '<div class="medio-tarjeta__pie"><b title="' + esc(m.nombre) + '">' + esc(m.nombre) + '</b><span>' + pesoBonito(m.peso) + '</span></div>' +
          '<button class="medio-tarjeta__x" title="Eliminar del servidor">✕</button>';
        el.querySelector('.medio-tarjeta__vista').addEventListener('click', () => {
          navigator.clipboard.writeText(location.origin + m.url).then(
            () => avisar('Enlace copiado al portapapeles'),
            () => avisar(m.url, 'info')
          );
        });
        $('.medio-tarjeta__x', el).addEventListener('click', async () => {
          if (!confirm('¿Eliminar ' + m.nombre + ' del servidor?\nLos proyectos que lo usen se quedarán sin esa imagen.')) return;
          try { await api('/api/media', 'DELETE', { url: m.url }); avisar('Archivo eliminado'); pintarBiblioteca(); }
          catch (e) { avisar(e.message, 'error'); }
        });
        cont.appendChild(el);
      });
    } catch (e) {
      cont.innerHTML = '<p class="ayuda">' + esc(e.message) + '</p>';
    }
  }

  /* ═════════ vistas ═════════ */
  function irA(vista) {
    VISTA = vista;
    $$('.vista').forEach((s) => { s.hidden = s.dataset.vista !== vista; });
    $$('#menu button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === vista));
    $('#titulo-vista').textContent = TITULOS[vista][0];
    $('#sub-vista').textContent = TITULOS[vista][1];
    if (vista === 'biblioteca') pintarBiblioteca();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pintarTodo() {
    $$('[data-ruta]').forEach((el) => {
      const v = leerRuta(D, el.dataset.ruta);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
      el.addEventListener('input', () => {
        escribirRuta(D, el.dataset.ruta, el.type === 'checkbox' ? el.checked : el.value);
        marcarSucio();
      });
    });
    pintarPerfil();
    pintarTips();
    pintarServicios();
    pintarProceso();
    pintarRedes();
    pintarProyectos();
  }

  /* ═════════ arranque ═════════ */
  async function entrar() {
    $('#acceso').style.display = 'none';
    $('#panel').hidden = false;
    D = await api('/api/content');
    D.perfil = D.perfil || {}; D.sitio = D.sitio || {}; D.gato = D.gato || {};
    D.proyectos = D.proyectos || []; D.servicios = D.servicios || [];
    D.proceso = D.proceso || []; D.contacto = D.contacto || {};
    pintarTodo();
    irA('perfil');


  }

  function conectar() {
    // acceso
    $('#form-acceso').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#acceso-error');
      err.textContent = '';
      try {
        const r = await api('/api/auth/login', 'POST', { clave: $('#clave').value });
        TOKEN = r.token;
        localStorage.setItem('mango-token', TOKEN);
        if (window.Pixel) {
          const c = $("#acceso-gato").getBoundingClientRect();
          Pixel.chispas(c.left + c.width / 2, c.top + c.height / 2, 24);
          Pixel.maullar();
        }
        setTimeout(entrar, 350);
      } catch (ex) { err.textContent = ex.message; }
    });
    $('#btn-salir').addEventListener('click', () => { if (SUCIO && !confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return; cerrarSesion(); });

    // navegación
    $$('#menu button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
    $('#btn-guardar').addEventListener('click', () => guardar());

    // añadir elementos
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-anadir]');
      if (!b) return;
      const q = b.dataset.anadir;
      if (q === 'dato') { D.perfil.datos.push({ numero: '0', sufijo: '', texto: 'nuevo dato' }); pintarPerfil(); }
      if (q === 'frase') { D.perfil.frases.push('Una frase nueva'); pintarPerfil(); }
      if (q === 'tip') { D.gato.tips.push('Miau nuevo'); pintarTips(); }
      if (q === 'servicio') { D.servicios.push({ icono: '✷', titulo: 'Nuevo servicio', texto: '', incluye: [] }); pintarServicios(); }
      if (q === 'paso') { D.proceso.push({ titulo: 'Nuevo paso', texto: '' }); pintarProceso(); }
      if (q === 'red') { D.contacto.redes.push({ nombre: 'Red', url: 'https://' }); pintarRedes(); }
      marcarSucio();
    });

    // proyectos
    $('#btn-nuevo-proyecto').addEventListener('click', () => {
      const p = {
        id: 'p-' + Date.now().toString(36),
        titulo: 'Proyecto sin título', categoria: (D.categorias || ['Identidad'])[0],
        anio: String(new Date().getFullYear()), cliente: '', resumen: '', descripcion: '',
        etiquetas: [], color: '#ff8a3d', destacado: false, enlace: '', medios: []
      };
      D.proyectos.unshift(p);
      pintarProyectos();
      abrirCajon(p);
      marcarSucio();
    });
    $('#buscar-proyecto').addEventListener('input', pintarProyectos);
    $$('[data-cerrar-cajon]').forEach((el) => el.addEventListener('click', cerrarCajon));
    $('#btn-listo-proyecto').addEventListener('click', cerrarCajon);
    $('#btn-borrar-proyecto').addEventListener('click', () => {
      if (!PROYECTO) return;
      if (!confirm('¿Eliminar "' + (PROYECTO.titulo || 'este proyecto') + '"?\nLos archivos seguirán en la biblioteca.')) return;
      D.proyectos = D.proyectos.filter((x) => x !== PROYECTO);
      PROYECTO = null;
      $('#cajon').hidden = true;
      pintarProyectos();
      marcarSucio();
      avisar('Proyecto eliminado');
    });

    // biblioteca
    zonaSoltar($('#soltar-global'), $('#file-global'), $('#btn-subir-global'), $('#progreso-global'), () => {});
    $('#soltar-global').addEventListener('drop', () => setTimeout(pintarBiblioteca, 900));
    $('#file-global').addEventListener('change', () => setTimeout(pintarBiblioteca, 900));

    // contraseña
    $('#btn-pass').addEventListener('click', async () => {
      try {
        await api('/api/auth/password', 'POST', { actual: $('#pass-actual').value, nueva: $('#pass-nueva').value });
        avisar('Contraseña cambiada. Vuelve a entrar.');
        setTimeout(cerrarSesion, 1200);
      } catch (e) { avisar(e.message, 'error'); }
    });

    // copia de seguridad
    $('#btn-exportar').addEventListener('click', () => {
      const copia = JSON.parse(JSON.stringify(D));
      delete copia.auth;
      const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'estudio-mango-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    $('#btn-importar').addEventListener('click', () => $('#file-importar').click());
    $('#file-importar').addEventListener('change', () => {
      const f = $('#file-importar').files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const datos = JSON.parse(fr.result);
          if (!datos.perfil && !datos.proyectos) throw new Error('El archivo no parece una copia válida');
          if (!confirm('Esto reemplaza todo el contenido actual. ¿Seguro?')) return;
          D = datos;
          pintarTodo();
          marcarSucio();
          avisar('Copia restaurada');
        } catch (e) { avisar(e.message, 'error'); }
      };
      fr.readAsText(f);
      $('#file-importar').value = '';
    });

    // salvavidas
    window.addEventListener('beforeunload', (e) => {
      if (SUCIO) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); guardar(); }
      if (e.key === 'Escape' && !$('#cajon').hidden) cerrarCajon();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    conectar();
    if (window.Pixel && window.SPRITES) {
      Pixel.precargar();
      const g = Pixel.plantar($("#acceso-gato"), "gato", { escala: 1.4 });
      Pixel.mimar(g, "saludar");
      Pixel.plantar($("#lateral-gato"), "gato", { escala: 0.55 });
    }
    await cargarConfig();
    if (await comprobarSesion()) entrar();
  });
})();
