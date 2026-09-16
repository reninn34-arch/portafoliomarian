# 🕹️ Estudio Mango — portafolio interactivo de diseño gráfico

Portafolio web con estética **pixel art / arcade**: fondo nocturno con rejilla y efecto CRT,
tipografía bitmap, paneles con bordes de píxel y sonidos 8-bit. Los dos personajes —**Mila**,
la diseñadora, y **Mango**, su gato naranja— son **sprites de pixel art de verdad**, dibujados
píxel a píxel y animados por frames. Incluye un **panel de administración** para subir y editar
todo el contenido sin tocar una línea de código.

No usa librerías ni dependencias: solo Node.js y archivos estáticos.

### Sistema visual

| Pieza | Cómo se ve |
|---|---|
| Fondo | Noche con rejilla, estrellas parpadeantes y una capa CRT con líneas de barrido. |
| Portada | Escena de videojuego: cielo, luna, nubes, suelo de hierba y tierra, con Mila y Mango encima. |
| Textos | Caja de diálogo estilo RPG que se escribe sola, con el nombre del personaje en la pestaña. |
| Proyectos | Tarjetas-cartucho con borde de píxel; al pasar el ratón se iluminan y aparece `START ▶`. |
| Servicios | Paneles con iconos en pixel art (estrella, lápiz, libro, vídeo). |
| Proceso | Barra de progreso de nivel por la que camina Mango según bajas. |
| Contacto | Panel de “punto de guardado”. |
| Tipografías | Press Start 2P (títulos), Silkscreen (interfaz) e Inter (textos largos). |
| Pantallas | **Noche** (arcade, por defecto) y **Día**, con el botón ☾ / ☀ del HUD. |
| Sonido | Maullido y bips generados por Web Audio: no hay archivos de audio. |

### Los personajes

Los sprites salen de **tu hoja de personajes** (`public/img/hoja/sprite-sheet.jpg`). Están
recortados uno a uno a `public/img/sprites/` y animados por frames — no hay filtros ni escalados
raros: se ven exactamente como los dibujaste.

| Grupo · celda | Frames | Dónde sale |
|---|---|---|
| `mila` 77×120 | quieta · saluda · ríe · ríe2 | portada y contacto |
| `milaAbrazo` 72×73 | abrazo ×3 (con corazones) | ficha del estudio |
| `gatoPaseo` 77×61 | sentado · feliz · andar ×4 · correr ×4 | pasea por la hierba y por la barra del proceso |
| `gatoQuieto` 60×61 | sentado · feliz · tumbado | gato acompañante de la esquina |
| `gatoIcono` 30×31 | sentado · feliz | logo del HUD |
| `milaVideo` 110×136 | cámara ×4 | libre — recortes míos de la hoja |
| `milaTableta` 121×142 | tableta ×3 | libre — recortes míos de la hoja |
| `props` | maleta · claqueta · tableta · lápiz | iconos de los servicios |

**Todos los frames de un grupo miden lo mismo y comparten el mismo suelo**, y el sitio los dibuja
siempre a escala **entera** (1×, 2× o 3× según el hueco). Por eso no crecen, no encogen ni flotan
al cambiar de frame. El rebote natural que traen tus frames se conserva: dentro de cada grupo se
respeta la diferencia de altura original, solo se iguala la línea del suelo entre grupos.

El gato de la portada **camina de verdad**: recorre la hierba, se voltea al llegar al borde y se
sienta un rato antes de volver.

**Para ver todas las animaciones:** <http://localhost:4321/prueba-sprites.html>

**Para añadir poses nuevas:**

1. Guarda el PNG recortado (con fondo transparente) en `public/img/sprites/`.
2. Añádelo en `public/js/sprites.js`: primero en `frames`, después en la animación que quieras
   como `['nombreDelFrame', milisegundos]`.

El reproductor (`public/js/pixel.js`) los pinta en `<canvas>` alineados abajo-centro para que no
bailen al cambiar de frame, y sabe voltearlos para que el gato mire hacia donde anda.

### Qué puedes meter en un proyecto

| Lo que pegas o subes | Qué pasa |
|---|---|
| Imagen (jpg, png, webp, gif, svg) | se ve tal cual |
| Video (mp4, webm, mov) | el panel le saca un **fotograma de portada** al subirlo; en la tarjeta se reproduce al pasar el ratón |
| **YouTube** (normal, corto o Shorts) | el reproductor se incrusta **en la propia tarjeta**; además baja su miniatura al servidor |
| **TikTok** (vídeo, foto o enlace corto `vm.tiktok.com`) | se incrusta en vertical 9:16. Los enlaces cortos los resuelve el servidor, porque no traen el id |
| **Instagram** (post, reel o `reels` en plural) | se incrusta en 3:4 con `embed/captioned`: se ve la cuenta y el pie del post |
| **Facebook** (vídeos) | se incrusta con el plugin oficial |
| **Vimeo** | se incrusta 16:9 |
| PDF | se guarda; portada manual con ◧ |

**La incrustación va en la parrilla, no detrás de un clic.** El cliente ve el reel o el TikTok
directamente en la tarjeta y puede reproducirlo ahí mismo — como la parrilla de contenido de
wiwiplan, de donde está portado el detector (`public/js/embeds.js`). La tarjeta toma la forma de
cada red: 9:16 TikTok, 3:4 Instagram, 16:9 el resto. El iframe lleva fondo blanco a propósito:
es el de estas incrustaciones, y sobre el panel oscuro una que tarde en cargar parecía un hueco roto.

**La portada de la tarjeta es siempre el primer archivo del proyecto.** Si ese archivo no se puede
incrustar ni da miniatura, sale el color del proyecto con su inicial. El botón **◧** de cada archivo
(en el cajón del proyecto) le pone una portada a mano a cualquier cosa.

### Un proyecto = un negocio

Cada proyecto se presenta como la marca a la que pertenece, no como un archivo suelto:

1. **Cabecera**: número (01, 02…), nombre de la marca, año y cliente.
2. **Objetivo del proyecto** y **Decisión de diseño**.
3. **Identidad**: paleta con sus códigos y tipografías con espécimen `Aa`.
4. **Las piezas**: la galería con las imágenes, vídeos y mockups.
5. **En redes**: las piezas que se publicaron, montadas como **tarjetas de post de Instagram**
   — foto de perfil, cuenta, la imagen, los iconos y el pie del post.

En el panel, dentro del cajón de cada proyecto:

- **La marca en redes** → la cuenta (`@sumarca`) y su foto de perfil.
- En cada archivo, el botón **◫** lo marca como post. Al marcarlo aparece debajo un campo
  para el pie, y la pieza sale de la galería para pasar a la parrilla de posts.
- El botón **◧** le pone portada a mano a cualquier archivo.

---
### Ficha de caso por proyecto

Cada proyecto se cuenta con la misma estructura, como en un portafolio impreso:

- **Numeración** 01, 02, 03… en la tarjeta y en la ficha.
- **Separadores por disciplina** en la rejilla (Identidad, Ilustración, Editorial, Motion…),
  que aparecen cuando el filtro está en TODO.
- **Objetivo del proyecto** — qué pedía el cliente.
- **Decisión de diseño** — por qué se resolvió así.
- **Paleta** en muestras de color con su código.
- **Tipografías** con espécimen `Aa`, nombre y uso.

Todo se edita desde el panel, en el cajón de cada proyecto.

---

## Cómo arrancarlo

**Opción fácil (Windows):** doble clic en `INICIAR.bat`.

**Desde la terminal:**

```bash
node server.js
```

- Sitio público → http://localhost:4321
- Panel admin → http://localhost:4321/admin
- Contraseña inicial → `mango2026` (cámbiala en *Ajustes* la primera vez)

Para usar otro puerto: `PORT=8080 node server.js`

---

## Qué trae el sitio

| Sección | Qué hace |
|---|---|
| **Portada** | Mila animada (parpadea, saluda, dibuja, el pelo rebota), Mango sentado a su lado, globo con frases rotatorias y cifras que se cuentan solas. |
| **El estudio** | Biografía, datos y la nota de corcho con el gato supervisor. |
| **Proyectos** | Rejilla filtrable por categoría. Cada tarjeta se inclina con el ratón; al hacer clic se abre una ficha con galería de imágenes, videos y enlaces de YouTube/Vimeo (flechas ← → y Esc). |
| **Servicios / Proceso** | Tarjetas y línea de tiempo por la que camina Mango según bajas. |
| **Contacto** | Email y redes. |

Extras: tema **noche/día** con memoria, cursor personalizado, fondo con manchas y estrellas,
gato acompañante fijo que maúlla, salta y suelta confeti al hacerle clic, y todo responsive hasta 375 px.

---

## El panel de administración

Entra en `/admin` con tu contraseña. Se guarda solo (2 segundos después de cada cambio) y también
con `Ctrl+S` o el botón **Guardar cambios**.

- **Perfil** — nombre, rol, titular de portada, resumen, biografía, cifras del hero y frases del globo.
- **Proyectos** — crear, editar, reordenar (▲▼) y eliminar. Por cada uno: título, categoría, cliente,
  año, color de acento, destacado, resumen, descripción, etiquetas y enlace externo.
  Los archivos se suben **arrastrándolos** al recuadro o con *Elegir archivos*; el primero es la portada,
  y se reordenan con ◀ ▶. También puedes pegar un enlace de YouTube o Vimeo.
- **Servicios / Proceso / Contacto** — bloques añadibles y eliminables.
- **Biblioteca** — todos los archivos del servidor; clic en la miniatura copia su enlace, la ✕ lo borra.
- **Ajustes** — nombre del estudio, tema inicial, frases del gato, cambio de contraseña y
  **copia de seguridad** (descargar/restaurar todo el contenido en JSON).

Formatos aceptados: jpg, png, webp, avif, gif, svg, mp4, webm, mov, m4v, mp3, wav y pdf. Hasta 260 MB por archivo.

---

## Estructura

```
portafolio-creativo/
├─ server.js              servidor para tu ordenador (sitio + API)
├─ INICIAR.bat            arranca y abre el navegador
├─ vercel.json            configuración del despliegue
├─ lib/                   el corazón, compartido por local y Vercel
│  ├─ api.js              todos los endpoints
│  ├─ almacen.js          contenido → archivo JSON  o  Postgres
│  ├─ archivos.js         medios   → carpeta uploads o  Vercel Blob
│  ├─ auth.js             contraseña cifrada y sesiones firmadas
│  └─ comun.js            tipos de archivo, límites y utilidades
├─ api/[...ruta].js       puerta de entrada de la API en Vercel
├─ herramientas/migrar.js sube tu contenido local a la nube
├─ data/
│  ├─ seed.json           contenido de ejemplo (plantilla inicial)
│  └─ content.json        tu contenido real + hash de la contraseña  ← se crea solo
└─ public/
   ├─ index.html          sitio público
   ├─ admin.html          panel
   ├─ css/styles.css · css/admin.css
   ├─ js/sprites.js      animaciones · js/pixel.js  reproductor y sonidos
   ├─ img/hoja/          tu hoja de personajes · img/sprites/  frames recortados
   ├─ js/app.js · js/admin.js
   └─ uploads/            aquí aterrizan tus imágenes y videos (en local)
```

**Un solo código, dos modos.** El mismo `lib/api.js` atiende las peticiones en tu
ordenador y en Vercel; lo único que cambia es dónde guarda. Los almacenes se eligen
solos mirando las variables de entorno:

| Variable presente | Contenido | Archivos |
|---|---|---|
| ninguna | `data/content.json` | `public/uploads/` |
| `POSTGRES_URL` | tabla `contenido` de Postgres | — |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob |

Por eso en tu ordenador **no hace falta instalar nada ni tener base de datos**: sigue
siendo `node server.js` y ya está.

**Copia de seguridad manual:** guarda `data/content.json` y la carpeta `public/uploads/`.
Con esos dos tienes el portafolio entero.

---

## Publicarlo en internet (Vercel)

El portafolio ya está preparado para Vercel: el contenido pasa a **Postgres** y los
archivos a **Vercel Blob**, porque el disco de Vercel es de solo lectura y no
conserva nada entre peticiones.

### 1 · Crea el proyecto

```bash
npx vercel
```

Responde a las preguntas (enlazar con tu cuenta, nombre del proyecto). Todavía no
lo pongas en producción.

### 2 · Añade la base de datos y el almacén de archivos

En el panel de Vercel, dentro de tu proyecto:

- **Storage → Create Database → Postgres** (vale Neon, Supabase o Prisma Postgres).
- **Storage → Create → Blob Store**.

Al crearlos, Vercel añade solo las variables `POSTGRES_URL` y `BLOB_READ_WRITE_TOKEN`.
No hay que copiar nada a mano.

### 3 · Lleva tu contenido actual

```bash
npx vercel env pull .env.local
npm install
node herramientas/migrar.js
```

Sube tus imágenes y vídeos al Blob, cambia las direcciones dentro del contenido y
guarda todo en Postgres. Deja una copia de lo anterior en
`data/content-antes-de-migrar.json`. Puedes ejecutarlo las veces que quieras.

### 4 · Publica

```bash
npx vercel --prod
```

Tu portafolio queda en `https://tu-proyecto.vercel.app` y el panel en `/admin`,
con la **misma contraseña** que usas en local.

### Qué cambia al estar en la nube

| | En tu ordenador | En Vercel |
|---|---|---|
| Contenido | `data/content.json` | Postgres |
| Imágenes y vídeos | `public/uploads/` | Vercel Blob (CDN) |
| Subidas grandes | por la API, hasta 260 MB | el archivo va **directo al Blob**, porque una función de Vercel solo acepta 4,5 MB de cuerpo |
| Editar el portafolio | solo desde tu PC | desde cualquier sitio, también el móvil |

Las dos copias son independientes: lo que edites en local **no** se sube solo. Para
llevar cambios de local a la nube, vuelve a pasar `node herramientas/migrar.js`.

### Antes de publicar

- **Cambia la contraseña** en *Ajustes*. La de por defecto es pública: está en este mismo archivo.
- `data/content.json` está en el `.gitignore` a propósito: lleva el hash de tu contraseña.
- Cerrar sesión solo borra el token del navegador; caduca solo a las 12 horas. Si
  crees que alguien te lo ha pillado, **cambia la contraseña**: eso invalida al
  instante todas las sesiones abiertas.

---

## Notas

- La contraseña se guarda cifrada (scrypt con sal) dentro de `data/content.json`; la sesión dura 12 horas.
- Publicado en Vercel, el HTTPS y el certificado vienen puestos. Cambia la contraseña por una larga.
- Las dependencias (`pg` y `@vercel/blob`) solo se cargan si hay Postgres o Blob configurados:
  en tu ordenador el proyecto sigue arrancando sin `npm install`.
- Para restaurar el contenido de ejemplo: borra `data/content.json` y reinicia el servidor.
