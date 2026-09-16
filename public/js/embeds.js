/* ══════════════════════════════════════════════════════════════
   EMBEDS · detecta la red de un enlace y devuelve su incrustación
   Portado de wiwiplan (src/lib/embeds.ts), que ya lo tenía resuelto.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function detectarEmbed(url) {
    if (!url) return null;
    const limpia = String(url).trim();

    const youtube = limpia.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (youtube) return { embed: 'https://www.youtube.com/embed/' + youtube[1], red: 'YOUTUBE', id: youtube[1] };

    const vimeo = limpia.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return { embed: 'https://player.vimeo.com/video/' + vimeo[1], red: 'VIMEO', id: vimeo[1] };

    // `photo` entra a propósito: TikTok lo usa para los carruseles de fotos, y
    // al resolver un enlace corto el usuario puede venir vacío (`@/`)
    const tiktok = limpia.match(/tiktok\.com\/@[\w.-]*\/(?:video|photo)\/(\d+)/);
    if (tiktok) return { embed: 'https://www.tiktok.com/embed/v2/' + tiktok[1], red: 'TIKTOK', id: tiktok[1] };

    // enlace corto de la app: no trae el id, hay que resolverlo en el servidor
    const tiktokCorto = limpia.match(/vm\.tiktok\.com\/([\w]+)/);
    if (tiktokCorto) return { embed: null, red: 'TIKTOK', corto: true };

    // `reels` en plural entra a propósito: es como lo copia la app de Instagram
    // desde el móvil. `captioned` añade la cuenta y el pie del post.
    const instagram = limpia.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
    if (instagram) return { embed: 'https://www.instagram.com/p/' + instagram[1] + '/embed/captioned', red: 'INSTAGRAM', id: instagram[1] };

    const facebook = limpia.match(/facebook\.com\/(?:watch\/?\?v=|[\w.]+\/videos\/)(\d+)/);
    if (facebook) return { embed: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(limpia), red: 'FACEBOOK', id: facebook[1] };

    if (/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(limpia)) return { embed: limpia, red: 'IMAGEN' };
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(limpia)) return { embed: limpia, red: 'VIDEO' };
    if (/pinterest\.[\w.]+\/pin\//.test(limpia)) return { embed: limpia, red: 'ENLACE' };

    return null;
  }

  /* cada red trae su forma: el vertical de TikTok no es el 16:9 de YouTube */
  function proporcion(red) {
    if (red === 'TIKTOK') return '9 / 16';
    if (red === 'INSTAGRAM') return '3 / 4';
    return '16 / 9';
  }

  const INCRUSTABLES = ['YOUTUBE', 'VIMEO', 'TIKTOK', 'FACEBOOK', 'INSTAGRAM'];
  const etiquetaRed = (r) => ({
    YOUTUBE: 'YouTube', VIMEO: 'Vimeo', TIKTOK: 'TikTok',
    INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', IMAGEN: 'Imagen', VIDEO: 'Video'
  }[r] || 'Enlace');

  window.Embeds = {
    detectar: detectarEmbed,
    proporcion: proporcion,
    incrustables: INCRUSTABLES,
    esIncrustable: (red) => INCRUSTABLES.indexOf(red) !== -1,
    etiqueta: etiquetaRed
  };
})();
