/* ══════════════════════════════════════════════════════════════
   SPRITES · recortados de la hoja (img/hoja/sprite-sheet.jpg)

   Cada grupo usa una CELDA FIJA: todos sus frames miden lo mismo y
   están alineados por los pies, así el personaje no crece, no encoge
   ni se desplaza al cambiar de frame.

   Animación = lista de [frame, milisegundos].
   ══════════════════════════════════════════════════════════════ */
window.SPRITES = {
  base: '/img/sprites/',

  /* ── Mila de pie · celda 96×129 ── */
  mila: {
    celda: [77, 120],
    frames: {
      quieta: "mila-quieta.png",
      saluda: "mila-saluda.png",
      rie: "mila-rie.png",
      rie2: "mila-rie2.png"
    },
    bucle: [["quieta", 3400], ["saluda", 320], ["rie", 420], ["rie2", 380], ["rie", 360], ["saluda", 300], ["quieta", 4600]],
    saludar: [["saluda", 220], ["rie", 300], ["rie2", 300], ["rie", 300], ["rie2", 300], ["saluda", 240]]
  },

  /* ── Mila con la cámara · celda 110×136 ── */
  milaVideo: {
    celda: [110, 136],
    frames: {
      video1: 'mila-video1.png',
      video2: 'mila-video2.png',
      video3: 'mila-video3.png',
      quieta: 'mila-video-quieta.png'
    },
    bucle: [['quieta', 2400], ['video1', 420], ['video2', 420], ['video3', 520], ['video2', 420]],
    grabar: [['video1', 380], ['video2', 380], ['video3', 460], ['video2', 380]]
  },

  /* ── Mila con la tableta · celda 121×142 ── */
  milaTableta: {
    celda: [121, 142],
    frames: {
      dibuja1: 'mila-dibuja1.png',
      dibuja2: 'mila-dibuja2.png',
      tableta: 'mila-tableta.png'
    },
    bucle: [['dibuja1', 700], ['dibuja2', 700]],
    dibujar: [['dibuja1', 520], ['dibuja2', 520], ['dibuja1', 520], ['dibuja2', 520]]
  },

  /* ── Mila abrazando a Mango · celda 110×109 ── */
  milaAbrazo: {
    celda: [72, 73],
    frames: {
      abrazo1: "mila-abrazo1.png",
      abrazo2: "mila-abrazo2.png",
      abrazo3: "mila-abrazo3.png"
    },
    bucle: [["abrazo1", 1400], ["abrazo2", 900], ["abrazo3", 1600], ["abrazo2", 800]],
    mimo: [["abrazo3", 520], ["abrazo2", 340], ["abrazo3", 520], ["abrazo2", 340], ["abrazo3", 620]]
  },

  /* ── Mango quieto, celda ajustada 71×69 (para sitios pequeños) ── */
  gatoQuieto: {
    celda: [60, 61],
    frames: {
      sentado: "gatoq-sentado.png",
      feliz: "gatoq-feliz.png",
      tumbado: "gatoq-tumbado.png"
    },
    bucle: [["sentado", 2800], ["feliz", 1400], ["sentado", 3600], ["feliz", 900]],
    saludar: [["feliz", 300], ["sentado", 200], ["feliz", 300], ["sentado", 200], ["feliz", 440]],
    siesta: [["tumbado", 4000]]
  },

  /* ── Mango que pasea · celda ajustada 117×73 ── */
  gatoPaseo: {
    celda: [77, 61],
    frames: {
      sentado: "paseo-sentado.png", feliz: "paseo-feliz.png",
      anda1: "paseo-anda1.png", anda2: "paseo-anda2.png",
      anda3: "paseo-anda3.png", anda4: "paseo-anda4.png",
      corre1: "paseo-corre1.png", corre2: "paseo-corre2.png",
      corre3: "paseo-corre3.png", corre4: "paseo-corre4.png"
    },
    bucle: [["sentado", 2800], ["feliz", 1400], ["sentado", 3600], ["feliz", 900]],
    andar: [["anda1", 190], ["anda2", 190], ["anda3", 190], ["anda4", 190]],
    correr: [["corre1", 110], ["corre2", 110], ["corre3", 110], ["corre4", 110]],
    saludar: [["feliz", 300], ["sentado", 200], ["feliz", 300], ["sentado", 200], ["feliz", 440]]
  },

  /* ── Mango tamaño icono (HUD) · celda 36×35 ── */
  gatoIcono: {
    celda: [30, 31],
    frames: { sentado: 'icono-gato-sentado.png', feliz: 'icono-gato-feliz.png' },
    bucle: [['sentado', 3000], ['feliz', 1200], ['sentado', 4000], ['feliz', 800]],
    saludar: [['feliz', 300], ['sentado', 200], ['feliz', 300], ['sentado', 200], ['feliz', 400]]
  },

  /* ── objetos sueltos (iconos de servicios) ── */
  props: {
    frames: {
      maleta: 'icono-maleta.png',
      claqueta: 'icono-claqueta.png',
      tableta: 'icono-tableta.png',
      lapiz: 'icono-lapiz.png'
    },
    bucle: [['claqueta', 9000]],
    maleta: [['maleta', 9000]],
    claqueta: [['claqueta', 9000]],
    tableta: [['tableta', 9000]],
    lapiz: [['lapiz', 9000]]
  }
};
