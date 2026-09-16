/* ══════════════════════════════════════════════════════════════
   ESTUDIO MANGO · lógica del sitio (edición pixel art)
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));

  let CONTENIDO = null;
  let FILTRO = 'todos';
  let PROYECTO_ABIERTO = null;
  let MEDIO_ACTIVO = 0;
  let MILA = null;
  let PROCESO_GATO = null;


  /* ═══════════ medios ═══════════ */
  function tipoMedio(m) {
    if (!m) return 'imagen';
    if (m.tipo && m.tipo !== 'auto') return m.tipo;
    const u = String(m.url || '').toLowerCase();
    if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
    if (/vimeo\.com/.test(u)) return 'vimeo';
    if (/instagram\.com/.test(u)) return 'instagram';
    if (/tiktok\.com/.test(u)) return 'tiktok';
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video';
    return 'imagen';
  }
  // la red del enlace, según el detector portado de wiwiplan
  function redDe(m) {
    const d = window.Embeds && Embeds.detectar(m && m.url);
    return d ? d.red : null;
  }
  function urlIncrustada(m) {
    const d = window.Embeds && Embeds.detectar(m && m.url);
    if (d && d.embed && Embeds.esIncrustable(d.red)) return d.embed;
    const u = String(m.url || '');
    const t = tipoMedio(m);
    if (t === 'youtube') {
      const id = (u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/) || [])[1];
      return id ? 'https://www.youtube-nocookie.com/embed/' + id : u;
    }
    if (t === 'vimeo') {
      const id = (u.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
      return id ? 'https://player.vimeo.com/video/' + id : u;
    }
    if (t === 'instagram') {
      const m = u.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
      return m ? 'https://www.instagram.com/' + (m[1] === 'reels' ? 'reel' : m[1]) + '/' + m[2] + '/embed/' : u;
    }
    if (t === 'tiktok') {
      const id = (u.match(/video\/(\d{6,})/) || [])[1];
      return id ? 'https://www.tiktok.com/embed/v2/' + id : u;
    }
    return u;
  }
  // Instagram y TikTok son verticales: el visor se adapta
  const esVertical = (m) => ['instagram', 'tiktok'].indexOf(tipoMedio(m)) !== -1;
  // miniatura de un enlace de YouTube
  function miniaturaYoutube(url) {
    const id = (String(url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/) || [])[1];
    return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : null;
  }

  // la portada es SIEMPRE el primer archivo del proyecto, sea del tipo que sea
  function portada(p) {
    const medios = p.medios || [];
    for (let i = 0; i < medios.length; i++) {
      const m = medios[i];
      const t = tipoMedio(m);
      if (m.portada) return { tipo: 'imagen', url: m.portada };   // fotograma o miniatura ya guardada
      if (t === 'imagen') return { tipo: 'imagen', url: m.url };
      if (t === 'video') return { tipo: 'video', url: m.url };
      if (t === 'youtube') {
        const th = miniaturaYoutube(m.url);
        if (th) return { tipo: 'imagen', url: th, externa: true };
      }
      // vimeo y pdf no dan miniatura directa: se intenta con el siguiente archivo
    }
    return null;
  }
  const tieneVideo = (p) => (p.medios || []).some((m) => !m.post && tipoMedio(m) !== 'imagen');

  /* ═══════════ render ═══════════ */
  const porRuta = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  function pintarCampos() {
    $$('[data-campo]').forEach((el) => {
      const v = porRuta(CONTENIDO, el.dataset.campo);
      if (v == null || v === '') return;
      if (el.dataset.campo === 'perfil.bio') {
        el.innerHTML = String(v).split(/\n{2,}/).map((p) => '<p>' + esc(p) + '</p>').join('');
      } else if (el.id === 'dialogo-texto') {
        el.dataset.frase = v;                      // se escribe a máquina más tarde
      } else {
        el.textContent = v;
      }
    });
    const t = porRuta(CONTENIDO, 'sitio.titulo');
    if (t) document.title = t + ' · Portafolio de diseño gráfico';
  }

  function pintarDatos() {
    const cont = $('#hero-datos');
    const datos = (CONTENIDO.perfil && CONTENIDO.perfil.datos) || [];
    cont.innerHTML = datos.map((d) => (
      '<li><b data-contador="' + esc(d.numero) + '">0</b><span>' + esc(d.texto) + '</span></li>'
    )).join('');
    $$('[data-contador]', cont).forEach((el, i) => {
      const meta = parseFloat(String(el.dataset.contador).replace(/[^\d.]/g, '')) || 0;
      const sufijo = (datos[i] && datos[i].sufijo) || '';
      let n = 0;
      const paso = Math.max(1, Math.round(meta / 24));
      const timer = setInterval(() => {
        n += paso;
        if (n >= meta) { n = meta; clearInterval(timer); }
        el.textContent = n + sufijo;
      }, 40);
    });
    const estado = $('#estudio-estado');
    if (estado) {
      const libre = CONTENIDO.perfil && CONTENIDO.perfil.disponible;
      estado.textContent = libre ? 'Agenda abierta' : 'Agenda completa';
      estado.style.color = libre ? 'var(--menta)' : 'var(--texto-suave)';
    }
  }

  function pintarFiltros() {
    const usadas = [];
    (CONTENIDO.proyectos || []).forEach((p) => {
      if (p.categoria && usadas.indexOf(p.categoria) === -1) usadas.push(p.categoria);
    });
    $('#filtros').innerHTML = ['todos'].concat(usadas).map((c) => (
      '<button class="filtro' + (c === FILTRO ? ' activo' : '') + '" data-cat="' + esc(c) + '">' +
      (c === 'todos' ? 'TODO' : esc(c)) + '</button>'
    )).join('');
    $$('#filtros .filtro').forEach((b) => b.addEventListener('click', () => {
      FILTRO = b.dataset.cat;
      if (window.Pixel) Pixel.bip(520, .06);
      pintarFiltros();
      pintarProyectos();
    }));
  }

  function pintarProyectos() {
    const rejilla = $('#rejilla');
    const todos = CONTENIDO.proyectos || [];
    const lista = todos.filter((p) => FILTRO === 'todos' || p.categoria === FILTRO);
    $('#vacio').hidden = lista.length > 0;

    const numero = (p) => String(todos.indexOf(p) + 1).padStart(2, '0');

    const tarjeta = (p) => {
      const color = p.color || '#FFC857';
      const cov = portada(p);
      let medio;
      let proporcion = '';
      const ini0 = String(p.titulo || '?').trim().charAt(0).toUpperCase();
      const primero = (p.medios || [])[0];
      const det = primero && window.Embeds ? Embeds.detectar(primero.url) : null;

      if (det && det.embed && Embeds.esIncrustable(det.red)) {
        // fondo blanco: es el de estas incrustaciones. Sobre el panel oscuro,
        // una que tarde en cargar se veía como un hueco y parecía rota.
        proporcion = ' style="--proporcion:' + Embeds.proporcion(det.red) + '"';
        medio = '<iframe src="' + esc(det.embed) + '" loading="lazy" class="tarjeta__embed" ' +
          'allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" ' +
          'allowfullscreen title="' + esc(p.titulo) + '"></iframe>' +
          '<span class="tarjeta__red">' + esc(Embeds.etiqueta(det.red)) + '</span>';
      } else if (cov && cov.tipo === 'imagen') {
        medio = '<img src="' + esc(cov.url) + '" alt="' + esc(p.titulo) + '" loading="lazy"' +
          ' onerror="this.remove()">' +
          '<div class="tarjeta__placeholder tarjeta__placeholder--fondo"><span>' + esc(ini0) + '</span></div>';
      } else if (cov && cov.tipo === 'video') {
        medio = '<video src="' + esc(cov.url) + '#t=0.1" muted loop playsinline preload="metadata"></video>';
      } else {
        const ini = String(p.titulo || '?').trim().charAt(0).toUpperCase();
        medio = '<div class="tarjeta__placeholder"><span>' + esc(ini) + '</span></div>';
      }
      return '' +
        '<article class="tarjeta revelar' + (proporcion ? ' tarjeta--incrustada' : '') + '" data-id="' +
          esc(p.id || p.titulo) + '" style="--acento:' + esc(color) + (proporcion ? ';--proporcion:' + Embeds.proporcion(det.red) : '') + '">' +
          '<span class="tarjeta__num">' + numero(p) + '</span>' +
          '<div class="tarjeta__cinta">' +
            '<span class="chip">' + esc(p.categoria || 'Proyecto') + '</span>' +
            (p.destacado ? '<span class="chip chip--destacado">★</span>' : '') +
          '</div>' +
          '<div class="tarjeta__medio">' + medio + (tieneVideo(p) ? '<div class="tarjeta__play"><span>▶</span></div>' : '') + '</div>' +
          '<div class="tarjeta__texto">' +
            '<h3>' + esc(p.titulo) + '</h3>' +
            '<p>' + esc(p.resumen || '') + '</p>' +
            '<div class="tarjeta__pie"><span>' + esc(p.cliente || '') + (p.anio ? ' · ' + esc(p.anio) : '') + '</span>' +
            '<span class="tarjeta__flecha">START ▶</span></div>' +
          '</div>' +
        '</article>';
    };

    let html = '';
    if (FILTRO === 'todos') {
      // agrupa por disciplina, como los separadores del portafolio de referencia
      const orden = [];
      lista.forEach((p) => {
        const c = p.categoria || 'Otros';
        if (orden.indexOf(c) === -1) orden.push(c);
      });
      orden.forEach((c) => {
        const delGrupo = lista.filter((p) => (p.categoria || 'Otros') === c);
        html += '<h3 class="rejilla__divisor"><span>' + esc(c) + '</span><i>' +
                String(delGrupo.length).padStart(2, '0') + '</i></h3>';
        html += delGrupo.map(tarjeta).join('');
      });
    } else {
      html = lista.map(tarjeta).join('');
    }
    rejilla.innerHTML = html;

    $$('.tarjeta', rejilla).forEach((el) => {
      const p = todos.find((x) => String(x.id || x.titulo) === el.dataset.id);
      if (!p) return;
      el.addEventListener('click', () => { if (window.Pixel) Pixel.bip(760, .08); abrirProyecto(p, numero(p)); });
      el.addEventListener('mouseenter', () => { const v = $('video', el); if (v) v.play().catch(() => {}); });
      el.addEventListener('mouseleave', () => { const v = $('video', el); if (v) { v.pause(); v.currentTime = 0.1; } });
    });

    // un <video> no pinta nada hasta que tiene un fotograma decodificado:
    // lo adelantamos un pelín para que la tarjeta muestre portada
    $$('.tarjeta video', rejilla).forEach((v) => {
      v.preload = 'auto';
      const asomar = () => { try { if (v.currentTime < 0.05) v.currentTime = 0.1; } catch (e) {} };
      if (v.readyState >= 1) asomar();
      v.addEventListener('loadedmetadata', asomar, { once: true });
    });
    revelar();
  }

  function pintarServicios() {
    const s = CONTENIDO.servicios || [];
    $('#servicios-grid').innerHTML = s.map((x) => (
      '<article class="servicio revelar">' +
        '<div class="servicio__icono sprite-host" data-prop="' + esc(x.icono || 'lapiz') + '"></div>' +
        '<h3>' + esc(x.titulo) + '</h3><p>' + esc(x.texto || '') + '</p>' +
        '<ul>' + (x.incluye || []).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      '</article>'
    )).join('');
    if (window.Pixel && window.SPRITES) {
      $$('#servicios-grid [data-prop]').forEach((el) => {
        const p = el.dataset.prop;
        if (window.SPRITES.props && window.SPRITES.props.frames[p]) {
          Pixel.plantar(el, 'props', { escala: 1, animacion: p, alt: p });
        } else { el.textContent = p; }
      });
    }
  }

  function pintarProceso() {
    const pasos = CONTENIDO.proceso || [];
    $('#proceso-pasos').innerHTML = pasos.map((p, i) => (
      '<div class="paso revelar" data-paso="' + i + '"><b>FASE ' + (i + 1) + '</b>' +
      '<h3>' + esc(p.titulo) + '</h3><p>' + esc(p.texto || '') + '</p></div>'
    )).join('');
  }

  function pintarContacto() {
    const c = CONTENIDO.contacto || {};
    const mail = $('#contacto-mail');
    if (c.email) { mail.href = 'mailto:' + c.email; $('span', mail).textContent = c.email; }
    $('#contacto-redes').innerHTML = (c.redes || []).map((r) => (
      '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.nombre) + ' ↗</a>'
    )).join('');
  }

  /* ═══════════ lupa: una pieza a pantalla completa ═══════════ */
  const LUPA = { lista: [], i: 0, cuenta: '' };

  // una pieza pequeña (un sprite, un icono) se veía como una mota en medio
  // de la pantalla: aquí se agranda hasta llenar el hueco. El pixel art sube
  // en pasos enteros y sin suavizar, para que no se deforme.
  function ajustarLupa(img) {
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    if (!n.w || !n.h) return;
    const anchoMax = Math.min(window.innerWidth - 130, 1100);
    const altoMax = window.innerHeight * 0.82;
    const cabe = Math.min(anchoMax / n.w, altoMax / n.h);
    const esPixel = n.w <= 500 && n.h <= 500;
    const escala = esPixel ? Math.max(1, Math.floor(cabe)) : Math.min(cabe, 1);
    img.style.width = Math.round(n.w * escala) + 'px';
    img.style.height = Math.round(n.h * escala) + 'px';
    img.classList.toggle('pixelada', esPixel && escala > 1);
  }
  function encajar(medio) {
    const img = medio.querySelector('img');
    if (!img) return;
    if (img.complete) ajustarLupa(img);
    else img.addEventListener('load', () => ajustarLupa(img));
  }

  function pintarLupa() {
    const m = LUPA.lista[LUPA.i];
    if (!m) return;
    const t = tipoMedio(m);
    const medio = $('#lupa-medio');
    if (t === 'video') {
      medio.innerHTML = '<video src="' + esc(m.url) + '" controls autoplay playsinline loop></video>';
    } else if (t === 'imagen') {
      medio.innerHTML = '<img src="' + esc(m.url) + '" alt="' + esc(m.pie || m.titulo || '') + '">';
    } else {
      const d = window.Embeds && Embeds.detectar(m.url);
      medio.innerHTML = d && d.embed && Embeds.esIncrustable(d.red)
        ? '<iframe src="' + esc(d.embed) + '" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" allowfullscreen></iframe>'
        : '<img src="' + esc(m.portada || m.url) + '" alt="">';
      medio.style.setProperty('--proporcion', d ? Embeds.proporcion(d.red) : '1 / 1');
    }
    encajar(medio);
    $('#lupa-pie').textContent = m.pie || m.titulo || '';
    $('#lupa-cuenta').textContent = LUPA.lista.length > 1 ? (LUPA.i + 1) + ' / ' + LUPA.lista.length : '';
    const hayVarias = LUPA.lista.length > 1;
    $('#lupa-ant').hidden = !hayVarias;
    $('#lupa-sig').hidden = !hayVarias;
  }

  window.addEventListener('resize', () => {
    if (!$('#lupa').hidden) encajar($('#lupa-medio'));
  });

  function abrirLupa(lista, i) {
    if (!lista || !lista.length) return;
    LUPA.lista = lista;
    LUPA.i = i || 0;
    $('#lupa').hidden = false;
    document.body.style.overflow = 'hidden';
    if (window.Pixel) Pixel.bip(880, .05);
    pintarLupa();
  }
  function cerrarLupa() {
    $('#lupa').hidden = true;
    $('#lupa-medio').innerHTML = '';
    if ($('#modal').hidden) document.body.style.overflow = '';
    LUPA.lista = [];
  }
  function moverLupa(d) {
    if (!LUPA.lista.length) return;
    LUPA.i = (LUPA.i + d + LUPA.lista.length) % LUPA.lista.length;
    if (window.Pixel) Pixel.bip(660, .04);
    pintarLupa();
  }

  /* ═══════════ ficha del proyecto ═══════════ */
  function abrirProyecto(p, num) {
    PROYECTO_ABIERTO = p;
    MEDIO_ACTIVO = 0;
    $('#modal-categoria').textContent = (p.categoria || 'proyecto').toLowerCase() + '.exe';
    $('#modal-anio').textContent = p.anio || '';
    $('#modal-titulo').textContent = p.titulo || '';
    $('#modal-cliente').textContent = p.cliente || '';
    $('#modal-desc').textContent = p.descripcion || p.resumen || '';
    $('#modal-num').textContent = num || '';

    // objetivo y decisión de diseño
    const caso = [];
    if (p.objetivo) caso.push('<div class="caso__bloque"><b>Objetivo del proyecto</b><p>' + esc(p.objetivo) + '</p></div>');
    if (p.decision) caso.push('<div class="caso__bloque"><b>Decisión de diseño</b><p>' + esc(p.decision) + '</p></div>');
    $('#modal-caso').innerHTML = caso.join('');

    // paleta y tipografías
    const marca = [];
    if ((p.paleta || []).length) {
      marca.push('<div class="marca__bloque"><b>Paleta</b><div class="paleta">' +
        p.paleta.map((c) => '<i style="background:' + esc(c) + '"><span>' + esc(c) + '</span></i>').join('') +
        '</div></div>');
    }
    if ((p.tipografias || []).length) {
      marca.push('<div class="marca__bloque"><b>Tipografías</b><div class="tipos">' +
        p.tipografias.map((t) => '<div class="tipo"><span class="tipo__aa">Aa</span>' +
          '<b>' + esc(t.nombre || '') + '</b><small>' + esc(t.uso || '') + '</small></div>').join('') +
        '</div></div>');
    }
    $('#modal-marca').innerHTML = marca.join('');

    // ── parrilla de posts: las piezas que se publicaron, como se vieron ──
    const posts = (p.medios || []).filter((m) => m.post);
    const cuenta = p.cuenta || ('@' + String(p.titulo || 'estudio').toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const inicial = String(p.titulo || '?').trim().charAt(0).toUpperCase();
    $('#modal-posts').innerHTML = !posts.length ? '' :
      '<b class="posts__titulo">En redes</b>' +
      '<div class="posts__rejilla">' + posts.map((m) => {
        const t = tipoMedio(m);
        const foto = m.portada ? '<img src="' + esc(m.portada) + '" alt="" loading="lazy">'
          : (t === 'imagen' ? '<img src="' + esc(m.url) + '" alt="" loading="lazy">'
          : (t === 'video' ? '<video src="' + esc(m.url) + '#t=0.1" muted loop playsinline preload="metadata"></video>'
          : '<span class="post__sinfoto">' + esc(inicial) + '</span>'));
        const avatar = p.avatar
          ? '<img class="post__avatar" src="' + esc(p.avatar) + '" alt="">'
          : '<span class="post__avatar post__avatar--letra">' + esc(inicial) + '</span>';
        return '<article class="post" style="--acento:' + esc(p.color || '#FFC857') + '">' +
            '<header class="post__cab">' + avatar + '<b>' + esc(cuenta) + '</b><i>···</i></header>' +
            '<div class="post__foto">' + foto + '</div>' +
            '<div class="post__acciones"><span>♥</span><span>◌</span><span>➤</span><u>▢</u></div>' +
            (m.pie ? '<p class="post__pie"><b>' + esc(cuenta) + '</b> ' + esc(m.pie) + '</p>' : '') +
          '</article>';
      }).join('') + '</div>';

    // clic en una pieza publicada: se ve grande sin salir de la página
    $$('#modal-posts .post__foto').forEach((foto, i) => {
      foto.addEventListener('click', () => abrirLupa(posts, i));
    });
    $('#modal-etiquetas').innerHTML = (p.etiquetas || []).map((t) => '<span>' + esc(t) + '</span>').join('');
    const enlace = $('#modal-enlace');
    enlace.hidden = !p.enlace;
    if (p.enlace) enlace.href = p.enlace;
    pintarVisor();
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  const esPost = (m) => !!(m && m.post);

  function pintarVisor() {
    const medios = (PROYECTO_ABIERTO.medios || []).filter((m) => !esPost(m));
    const visor = $('#modal-visor');
    const minis = $('#modal-miniaturas');
    if (!medios.length) {
      const ini = String(PROYECTO_ABIERTO.titulo || '?').charAt(0).toUpperCase();
      visor.innerHTML = '<div class="tarjeta__placeholder" style="--acento:' + esc(PROYECTO_ABIERTO.color || '#FFC857') +
        '"><span>' + esc(ini) + '</span></div><p class="sin-medio">Sin imágenes todavía · súbelas desde el panel</p>';
      minis.innerHTML = '';
      return;
    }
    const m = medios[MEDIO_ACTIVO] || medios[0];
    const t = tipoMedio(m);
    if (t === 'imagen') visor.innerHTML = '<img src="' + esc(m.url) + '" alt="' + esc(m.titulo || PROYECTO_ABIERTO.titulo) + '" class="ampliable" title="Clic para verla grande">';
    else if (t === 'video') visor.innerHTML = '<video src="' + esc(m.url) + '" controls autoplay playsinline></video>';
    else {
      visor.innerHTML = '<iframe src="' + esc(urlIncrustada(m)) + '" loading="lazy" ' +
        'allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" allowfullscreen></iframe>';
    }
    const red = redDe(m);
    visor.classList.toggle('modal__visor--vertical', red === 'TIKTOK' || red === 'INSTAGRAM');
    visor.style.setProperty('--proporcion', red ? Embeds.proporcion(red) : '16 / 10');

    minis.innerHTML = medios.map((x, i) => {
      const tx = tipoMedio(x);
      const icono = { instagram: '◎', tiktok: '♪', vimeo: 'V', youtube: '▶' }[tx] || '▶';
      const dentro = x.portada ? '<img src="' + esc(x.portada) + '" alt="">'
        : (tx === 'imagen' ? '<img src="' + esc(x.url) + '" alt="">'
        : (tx === 'video' ? '<video src="' + esc(x.url) + '#t=0.1" muted preload="metadata"></video>'
        : '<span class="icono">' + icono + '</span>'));
      return '<button class="' + (i === MEDIO_ACTIVO ? 'activa' : '') + '" data-m="' + i + '" aria-label="Medio ' + (i + 1) + '">' + dentro + '</button>';
    }).join('');
    $$('button', minis).forEach((b) => b.addEventListener('click', () => { MEDIO_ACTIVO = Number(b.dataset.m); pintarVisor(); }));
    const ampliable = $('.ampliable', visor);
    if (ampliable) ampliable.addEventListener('click', () => abrirLupa(medios, MEDIO_ACTIVO));
  }
  function cerrarModal() {
    $('#modal').hidden = true;
    $('#modal-visor').innerHTML = '';
    document.body.style.overflow = '';
    PROYECTO_ABIERTO = null;
  }

  /* ═══════════ interfaz ═══════════ */
  function tema() {
    const btn = $('#btn-tema');
    const guardado = localStorage.getItem('mango-tema');
    aplicar(guardado || (CONTENIDO.sitio && CONTENIDO.sitio.temaInicial) || 'noche');
    btn.addEventListener('click', () => {
      const nuevo = document.documentElement.dataset.tema === 'noche' ? 'dia' : 'noche';
      aplicar(nuevo);
      localStorage.setItem('mango-tema', nuevo);
      if (window.Pixel) {
        Pixel.bip(440, .07);
        const c = btn.getBoundingClientRect();
        Pixel.chispas(c.left + c.width / 2, c.top + c.height / 2, 12);
      }
    });
    function aplicar(t) {
      document.documentElement.dataset.tema = t;
      $('.nav__tema-icono').textContent = t === 'noche' ? '☾' : '☀';
    }
  }

  function estrellas() {
    let html = '';
    for (let i = 0; i < 40; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) +
        '%;animation-delay:' + (Math.random() * 2.4).toFixed(2) + 's"></i>';
    }
    $('#estrellas').innerHTML = html;
  }

  function cursor() {
    const c = $('#cursor');
    if (!c || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function seguir() {
      cx += (x - cx) * 0.3; cy += (y - cy) * 0.3;
      c.style.transform = 'translate(' + Math.round(cx / 4) * 4 + 'px,' + Math.round(cy / 4) * 4 + 'px)';
      requestAnimationFrame(seguir);
    })();
    document.addEventListener('mouseover', (e) => {
      c.classList.toggle('activo', !!e.target.closest('a, button, .tarjeta, .sprite, .filtro'));
    });
  }

  function navegacion() {
    const nav = $('#nav');
    const enlaces = $('#nav-enlaces');
    const btn = $('#btn-menu');
    btn.addEventListener('click', () => { enlaces.classList.toggle('abierto'); if (window.Pixel) Pixel.bip(600, .05); });
    $$('#nav-enlaces a').forEach((a) => a.addEventListener('click', () => enlaces.classList.remove('abierto')));
    const marcar = () => {
      nav.classList.toggle('pegado', window.scrollY > 30);
      const medio = window.innerHeight * 0.38;
      let actual = '';
      $$('section[id]').forEach((s) => {
        const c = s.getBoundingClientRect();
        if (c.top <= medio && c.bottom > medio) actual = s.id;
      });
      $$('#nav-enlaces a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + actual));
    };
    window.addEventListener('scroll', marcar, { passive: true });
    marcar();
  }

  function revelar() {
    const chequear = () => {
      $$('.revelar:not(.visible)').forEach((el) => {
        const c = el.getBoundingClientRect();
        if (c.top < window.innerHeight * 0.92 && c.bottom > -50) el.classList.add('visible');
      });
    };
    if (!revelar.conectado) {
      window.addEventListener('scroll', chequear, { passive: true });
      window.addEventListener('resize', chequear);
      revelar.conectado = true;
    }
    chequear();
    setTimeout(chequear, 400);
  }

  function gatoDelProceso() {
    const gato = $('#gato-proceso');
    const relleno = $('#proceso-relleno');
    const pasos = $$('.paso');
    if (!pasos.length) return;
    const mover = () => {
      let activo = -1;
      pasos.forEach((p, i) => { if (p.getBoundingClientRect().top < window.innerHeight * 0.8) activo = i; });
      pasos.forEach((p, i) => p.classList.toggle('activo', i <= activo));
      const pct = Math.max(0, Math.min(100, ((activo + 1) / pasos.length) * 100));
      if (relleno) relleno.style.width = pct + '%';
      if (PROCESO_GATO) PROCESO_GATO.animar(pct > 0 && pct < 100 ? 'andar' : 'bucle');
      const cont = $('.proceso');
      if (gato && cont) {
        const linea = cont.getBoundingClientRect();
        gato.style.left = Math.max(0, Math.min(linea.width - 72, (linea.width - 72) * (pct / 100))) + 'px';
      }
    };
    window.addEventListener('scroll', mover, { passive: true });
    window.addEventListener('resize', mover);
    mover();
  }

  function frasesDeMila() {
    const frases = (CONTENIDO.perfil && CONTENIDO.perfil.frases) || [];
    if (frases.length < 2) return;
    const globo = $('#globo');
    const texto = $('#globo-texto');
    texto.textContent = frases[0];
    let i = 0;
    setInterval(() => {
      globo.classList.add('cambiando');
      setTimeout(() => {
        i = (i + 1) % frases.length;
        texto.textContent = frases[i];
        globo.classList.remove('cambiando');
      }, 260);
    }, 5400);
  }

  function atajos() {
    $$('[data-cerrar-lupa]').forEach((el) => el.addEventListener('click', cerrarLupa));
    $('#lupa-ant').addEventListener('click', () => moverLupa(-1));
    $('#lupa-sig').addEventListener('click', () => moverLupa(1));

    document.addEventListener('keydown', (e) => {
      if (!$('#lupa').hidden) {                      // la lupa se lleva las teclas
        if (e.key === 'Escape') cerrarLupa();
        if (e.key === 'ArrowRight') moverLupa(1);
        if (e.key === 'ArrowLeft') moverLupa(-1);
        return;
      }
      if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal();
      if (!PROYECTO_ABIERTO) return;
      const n = (PROYECTO_ABIERTO.medios || []).length;
      if (!n) return;
      if (e.key === 'ArrowRight') { MEDIO_ACTIVO = (MEDIO_ACTIVO + 1) % n; pintarVisor(); }
      if (e.key === 'ArrowLeft') { MEDIO_ACTIVO = (MEDIO_ACTIVO - 1 + n) % n; pintarVisor(); }
    });
    $$('[data-cerrar]').forEach((el) => el.addEventListener('click', cerrarModal));
  }

  /* ═══════════ personajes ═══════════ */
  function acompanante() {
    const tips = (CONTENIDO.gato && CONTENIDO.gato.tips) || [];
    const caja = document.createElement('div');
    caja.className = 'acompanante';
    caja.innerHTML = '<div class="acompanante__burbuja"></div>';
    document.body.appendChild(caja);
    const api = Pixel.plantar(caja, 'gatoQuieto', { escala: 1, alt: 'Mango, el gato del estudio' });
    const burbuja = $('.acompanante__burbuja', caja);
    let i = 0;
    const decir = (t, ms) => {
      burbuja.textContent = t;
      burbuja.classList.add('visible');
      clearTimeout(burbuja._t);
      burbuja._t = setTimeout(() => burbuja.classList.remove('visible'), ms || 4200);
    };
    Pixel.mimar(api, 'saludar', () => decir(tips.length ? tips[i++ % tips.length] : 'Miau.'));
    api.lienzo.addEventListener('mouseenter', () => { if (!burbuja.classList.contains('visible')) decir('¿Me acaricias? Haz clic.', 2400); });
    if (tips.length) setTimeout(() => decir(tips[0], 5200), 5000);
  }

  function personajes() {
    if (!window.Pixel || !window.SPRITES) return;
    Pixel.precargar();

    // escala SIEMPRE entera: con decimales los píxeles salen deformados
    const cabe = (sprite, anchoMax, altoMax, tope) => {
      const c = (window.SPRITES[sprite] || {}).celda || [96, 129];
      const n = Math.floor(Math.min(anchoMax / c[0], altoMax / c[1]));
      return Math.max(1, Math.min(tope || 4, n));
    };

    const escena = $('.escena');
    const caja = escena ? escena.getBoundingClientRect() : { width: 360, height: 340 };
    // deja sitio al globo arriba y a la hierba abajo
    const escala = cabe('mila', caja.width * 0.58, caja.height - 118, 3);

    MILA = Pixel.plantar($('#mila-hero'), 'mila', { escala: escala, alt: 'Mila, diseñadora gráfica' });
    const paseo = $('#gato-escena');
    // el gato usa LA MISMA escala que Mila: así conserva la proporción de tu hoja
    const gato = Pixel.plantar(paseo, 'gatoPaseo', { escala: escala, alt: 'Mango, el gato del estudio' });
    if (gato && paseo) Pixel.pasear(gato, paseo, { velocidad: 26 * escala, pausa: 3200 });

    Pixel.mimar(MILA, 'saludar', () => {
      const frases = (CONTENIDO.perfil && CONTENIDO.perfil.frases) || [];
      if (frases.length) $('#globo-texto').textContent = frases[Math.floor(Math.random() * frases.length)];
    });
    Pixel.mimar(gato, 'saludar');

    const ficha = $('.ficha');
    const anchoFicha = ficha ? ficha.getBoundingClientRect().width - 40 : 240;
    const abrazo = Pixel.plantar($('#mila-abrazo'), 'milaAbrazo',
      { escala: cabe('milaAbrazo', anchoFicha, 230, 2), alt: 'Mila abrazando a Mango' });
    Pixel.mimar(abrazo, 'mimo');

    PROCESO_GATO = Pixel.plantar($('#gato-proceso'), 'gatoPaseo', { escala: 1, animacion: 'andar' });
    Pixel.mimar(PROCESO_GATO, 'saludar');

    const guardado = $('.guardado');
    const anchoGuardado = guardado ? guardado.getBoundingClientRect().width * 0.3 : 200;
    Pixel.mimar(Pixel.plantar($('#mila-contacto'), 'mila',
      { escala: cabe('mila', anchoGuardado, 280, 2) }), 'saludar');

    Pixel.plantar($('#logo-gato'), 'gatoIcono', { escala: 1 });

    acompanante();
  }

  /* ═══════════ arranque ═══════════ */
  async function cargar() {
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (!r.ok) throw new Error('respuesta ' + r.status);
      CONTENIDO = await r.json();
    } catch (e) {
      try { CONTENIDO = await (await fetch('/data/seed.json')).json(); }
      catch (e2) { CONTENIDO = { perfil: {}, proyectos: [], servicios: [], proceso: [], contacto: {} }; }
    }
  }

  async function iniciar() {
    await cargar();
    pintarCampos();
    pintarDatos();
    pintarFiltros();
    pintarProyectos();
    pintarServicios();
    pintarProceso();
    pintarContacto();
    tema();
    estrellas();
    cursor();
    navegacion();
    atajos();
    frasesDeMila();
    revelar();
    gatoDelProceso();
    personajes();
    $('#anio').textContent = new Date().getFullYear();

    setTimeout(() => {
      const cargador = $('#cargador');
      cargador.classList.add('fuera');
      setTimeout(() => cargador.remove(), 500);
      const dlg = $('#dialogo-texto');
      if (dlg && window.Pixel) Pixel.escribir(dlg, dlg.dataset.frase || '', 22);
    }, 700);
  }

  document.addEventListener('DOMContentLoaded', () => {
    iniciar();
  });
})();
