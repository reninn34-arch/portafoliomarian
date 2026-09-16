/* ══════════════════════════════════════════════════════════════
   PIXEL · reproductor de sprites por frames + sonidos 8-bit
   Los frames son PNG recortados de la hoja (ver js/sprites.js).
   Se pintan en <canvas> alineados abajo-centro para que no bailen.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const Pixel = {};
  const DATOS = window.SPRITES || {};
  const cacheImg = {};

  function cargar(src) {
    if (cacheImg[src]) return cacheImg[src];
    const img = new Image();
    img.src = src;
    cacheImg[src] = img;
    return img;
  }

  /* precarga todo lo declarado para que no haya parpadeos */
  Pixel.precargar = function () {
    Object.keys(DATOS).forEach((n) => {
      const def = DATOS[n];
      if (!def || !def.frames) return;
      Object.keys(def.frames).forEach((f) => cargar(DATOS.base + def.frames[f]));
    });
  };

  /* ─────────── sprite animado ─────────── */
  function plantar(host, nombre, opciones) {
    if (!host) return null;
    const def = DATOS[nombre];
    if (!def) return null;
    const op = Object.assign({ escala: 2, alt: nombre, animacion: 'bucle', voltear: false }, opciones || {});

    const imgs = {};
    Object.keys(def.frames).forEach((f) => { imgs[f] = cargar(DATOS.base + def.frames[f]); });

    const lienzo = document.createElement('canvas');
    lienzo.className = 'sprite';
    lienzo.setAttribute('role', 'img');
    lienzo.setAttribute('aria-label', op.alt);
    const cx = lienzo.getContext('2d');
    host.appendChild(lienzo);

    let linea = def[op.animacion] || def.bucle;
    let paso = 0;
    let reloj = null;
    let volteado = op.voltear;
    let frameActual = null;

    function medir() {
      let w = 0, h = 0;
      if (def.celda) {                       // celda fija declarada: no hay que esperar
        w = def.celda[0]; h = def.celda[1];
      } else {
        Object.keys(imgs).forEach((f) => {
          const i = imgs[f];
          if (i.naturalWidth > w) w = i.naturalWidth;
          if (i.naturalHeight > h) h = i.naturalHeight;
        });
      }
      if (!w) return false;
      lienzo.width = Math.round(w * op.escala);
      lienzo.height = Math.round(h * op.escala);
      cx.imageSmoothingEnabled = false;
      return true;
    }

    function pintar(f) {
      const img = imgs[f];
      if (!img || !img.naturalWidth) return;
      frameActual = f;
      if (!lienzo.width) { if (!medir()) return; }
      cx.imageSmoothingEnabled = false;
      cx.clearRect(0, 0, lienzo.width, lienzo.height);
      const w = img.naturalWidth * op.escala;
      const h = img.naturalHeight * op.escala;
      const x = Math.round((lienzo.width - w) / 2);      // centrado
      const y = Math.round(lienzo.height - h);           // apoyado abajo
      if (volteado) {
        cx.save();
        cx.translate(lienzo.width, 0);
        cx.scale(-1, 1);
        cx.drawImage(img, lienzo.width - x - w, y, w, h);
        cx.restore();
      } else {
        cx.drawImage(img, x, y, w, h);
      }
    }

    function avanzar() {
      if (!linea || !linea.length) return;
      const par = linea[paso % linea.length];
      pintar(par[0]);
      paso++;
      reloj = setTimeout(avanzar, par[1]);
    }

    const api = {
      lienzo: lienzo,
      /* cambia de animación (queda en bucle) */
      animar(cual) {
        const nueva = def[cual];
        if (!nueva) return api;
        clearTimeout(reloj);
        linea = nueva; paso = 0;
        avanzar();
        return api;
      },
      /* reproduce una vez y vuelve al bucle */
      reproducir(cual) {
        const nueva = def[cual];
        if (!nueva) return api;
        clearTimeout(reloj);
        const anterior = linea;
        linea = nueva; paso = 0;
        const total = nueva.reduce((s, f) => s + f[1], 0);
        avanzar();
        setTimeout(() => { clearTimeout(reloj); linea = anterior; paso = 0; avanzar(); }, total);
        return api;
      },
      voltear(v) { volteado = !!v; if (frameActual) pintar(frameActual); return api; },
      detener() { clearTimeout(reloj); }
    };

    /* espera a que carguen las imágenes para medir bien */
    const pendientes = Object.keys(imgs).map((f) => imgs[f]).filter((i) => !i.complete);
    if (pendientes.length) {
      let quedan = pendientes.length;
      pendientes.forEach((i) => i.addEventListener('load', () => { if (--quedan === 0) { medir(); avanzar(); } }, { once: true }));
    } else {
      medir();
      avanzar();
    }
    return api;
  }
  Pixel.plantar = plantar;

  /* ─────────── audio ─────────── */
  let ctxAudio = null;
  function audio() {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.state === 'suspended') ctxAudio.resume();
    return ctxAudio;
  }

  Pixel.maullar = function () {
    try {
      const a = audio(), t = a.currentTime;
      const osc = a.createOscillator(), filtro = a.createBiquadFilter(), vol = a.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.4);
      filtro.type = 'lowpass';
      filtro.frequency.setValueAtTime(1800, t);
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.11, t + 0.05);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      osc.connect(filtro).connect(vol).connect(a.destination);
      osc.start(t); osc.stop(t + 0.5);
    } catch (e) {}
  };

  Pixel.bip = function (freq, dur) {
    try {
      const a = audio(), t = a.currentTime;
      const osc = a.createOscillator(), vol = a.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq || 660, t);
      vol.gain.setValueAtTime(0.05, t);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.09));
      osc.connect(vol).connect(a.destination);
      osc.start(t); osc.stop(t + (dur || 0.09));
    } catch (e) {}
  };

  /* ─────────── chispas ─────────── */
  const COLORES = ['#FFC857', '#6FE0B0', '#FF8B5E', '#FF7BA9', '#A78BFA', '#EAF0FF'];
  Pixel.chispas = function (x, y, cantidad) {
    const n = cantidad || 18;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'chispa';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = COLORES[i % COLORES.length];
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const fuerza = 60 + Math.random() * 150;
      p.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * fuerza + 'px,' + (Math.sin(ang) * fuerza + 150) + 'px)', opacity: 0 }
      ], { duration: 700 + Math.random() * 500, easing: 'steps(12, end)' }).onfinish = () => p.remove();
    }
  };

  /* ─────────── máquina de escribir ─────────── */
  Pixel.escribir = function (el, texto, ms, alTerminar) {
    if (!el) return;
    clearInterval(el._maquina);
    el.textContent = '';
    let i = 0;
    el._maquina = setInterval(() => {
      el.textContent = texto.slice(0, ++i);
      if (i % 3 === 0 && texto[i - 1] !== ' ') Pixel.bip(880 + Math.random() * 120, 0.012);
      if (i >= texto.length) { clearInterval(el._maquina); if (alTerminar) alTerminar(); }
    }, ms || 26);
  };

  /* ─────────── clic sobre un personaje ─────────── */
  Pixel.mimar = function (api, cual, extra) {
    if (!api || !api.lienzo) return;
    api.lienzo.style.cursor = 'pointer';
    api.lienzo.addEventListener('click', () => {
      Pixel.maullar();
      api.reproducir(cual || 'saludar');
      const c = api.lienzo.getBoundingClientRect();
      Pixel.chispas(c.left + c.width / 2, c.top + c.height * 0.3, 16);
      if (extra) extra();
    });
  };

  /* ─────────── el gato pasea por una franja ─────────── */
  Pixel.pasear = function (api, contenedor, opciones) {
    if (!api || !contenedor) return;
    const op = Object.assign({ velocidad: 26, pausa: 2600 }, opciones || {});
    const el = api.lienzo;
    el.style.position = 'absolute';
    el.style.bottom = '0';
    el.style.left = '0';
    let x = 0, dir = 1, ultimo = 0, andando = false, esperaHasta = 0;

    function paso(t) {
      if (!ultimo) ultimo = t;
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      const ancho = contenedor.clientWidth - el.width;
      if (ancho > 0) {
        if (t < esperaHasta) {
          if (andando) { andando = false; api.animar('bucle'); }
        } else {
          if (!andando) { andando = true; api.animar('andar'); }
          x += dir * op.velocidad * dt;
          if (x <= 0) { x = 0; dir = 1; api.voltear(false); esperaHasta = t + op.pausa; }
          if (x >= ancho) { x = ancho; dir = -1; api.voltear(true); esperaHasta = t + op.pausa; }
        }
        el.style.left = Math.round(x) + 'px';
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  };

  window.Pixel = Pixel;
})();
