# Sociedad de Abogadas del Perú · Web

Web institucional con 24 páginas, directorio de asociadas, carrusel de videos y comunidad. La aplicación está migrando a Next.js y React; las rutas actuales y los formularios conservan temporalmente las plantillas y validaciones originales.

## Revisar y desarrollar

Desde `web/`, con Node.js 20.9 o superior:

```powershell
npm run build
npm run check
npm run dev
```

La primera vez instala las dependencias con `npm install`. Next.js sirve la web en `http://localhost:3000`. `npm run build` genera las páginas institucionales y después las compila con Next.js. Para iniciar la versión compilada usa `npm start`.

Configura `SAPP_SITE_ORIGIN` con el origen público de la web al desplegarla, por ejemplo `https://www.ejemplo.pe`, para que los formularios acepten solicitudes desde ese dominio. Los archivos de solicitudes y suscripciones se guardan en `.data/`, fuera de los recursos públicos.

La migración conserva el marcado existente como una capa de compatibilidad mientras se extraen las páginas a componentes React reutilizables. El CSS y los recursos multimedia se copian a `public/` durante el desarrollo y la compilación.

## Verificación realizada

Las 24 páginas se comprobaron en Chrome a 1440, 1024, 768, 375 y 320 px, sin desbordamientos ni imágenes rotas. Se verificaron búsqueda y filtros del directorio, estados vacíos, revisión de perfiles, avance horizontal del carrusel, menú móvil, Escape y restauración de foco, preguntas frecuentes y navegación sin JavaScript. Los siete videos se reprodujeron correctamente. La API de suscripción pasó comprobaciones de validación, autorización, persistencia, concurrencia y duplicados. Las fuentes externas se bloquearon durante las pruebas de navegador para comprobar las fuentes locales de respaldo.

`node browser-check.mjs` repite las comprobaciones en Windows con Chrome instalado en su ruta predeterminada y guarda capturas en `qa/`. Esto no sustituye una auditoría completa de accesibilidad ni las pruebas con usuarios reales.

Para publicar en Vercel, vincula el proyecto con una cuenta mediante `vercel login` y `vercel link`. Antes de recibir formularios en producción, configura almacenamiento persistente: `.data/` es local y no sirve como base de datos durable en funciones serverless. `SAPP_SITE_ORIGIN` debe contener el dominio público; Vercel también permite el dominio de preview mediante `VERCEL_URL`.

## Archivos

- `build.mjs`: contenido, componentes compartidos y generación de las páginas.
- `features.mjs`: directorio, fichas profesionales, 58 áreas de práctica, carrusel y comunidad.
- `members.json`: información pública de las asociadas y estado de revisión.
- `community.json`: URLs de TikTok y Facebook; LinkedIn pendiente.
- `dist/styles.css`: estilos y adaptación móvil.
- `dist/app.js`: navegación móvil y orientación por objetivo profesional.
- `dist/assets/`: logotipo original, ocho retratos del PDF y siete videos originales.
- `media.json`: rutas, dimensiones y duraciones de los videos.
- `prepare-media.mjs`: copia los MP4 de la carpeta superior y extrae sus portadas mediante Chrome en Windows.
- `serve.mjs`: servidor local para revisión.
- `newsletter.mjs`: recepción y almacenamiento privado de las suscripciones.
- `newsletter-check.mjs`: comprobaciones de la API en un servidor temporal, sin añadir correos de prueba a la lista real.
- `UX.md`: decisiones de experiencia y contenidos pendientes de validación.

La generación conserva los estilos, scripts y recursos de `dist/`. No requiere un framework. Las suscripciones se guardan en un archivo privado fuera de `dist/`.

## Mantener el directorio

Agregar o actualizar registros en `members.json` y ejecutar `npm run build`. Cada registro tiene identificador, nombre, fotografía, biografía, especialidades, ciudad, región, colegio profesional, número de colegiatura y canales de contacto. Usar los identificadores de especialidad de `features.mjs`, y números de contacto en formato internacional, por ejemplo con prefijo `+51` para Perú.

Los campos `phone`, `whatsapp`, `email` y `linkedin` habilitan los enlaces correspondientes al completarse con datos autorizados. Los campos vacíos no generan teléfonos ni perfiles ficticios. La insignia exige las cuatro comprobaciones de `verification`, fecha de revisión y datos de colegiatura; no se asigna automáticamente a las integrantes del PDF.

## Suscripción por correo

`POST /api/subscriptions` valida el correo y la autorización, evita duplicados y guarda la lista en `.data/subscriptions.json`. Ese directorio no está servido por HTTP, está ignorado por Git y se excluye del ZIP. La confirmación aparece tras guardar correctamente; no se simula un envío de email.

Queda pendiente configurar un proveedor para enviar newsletters o avisos al equipo. El registro local funciona mientras se utiliza el servidor Node. Para pruebas aisladas se pueden definir `SAPP_PREVIEW_PORT` y `SAPP_SUBSCRIPTIONS_FILE`.

En `community.json` se pueden agregar redes con plataforma, nombre y URL HTTPS. Hay símbolos para TikTok, Instagram, Facebook, LinkedIn y YouTube; solo se publican redes con enlaces oficiales proporcionados.

## Incorporación

Los botones de solicitud llevan al formulario propio en `unete.html#solicitud`. `admission.mjs` genera el formulario y recibe las solicitudes en `POST /api/applications`. Valida contacto, colegiatura, especialidad y consentimiento; guarda los registros pendientes de revisión en `.data/applications.json`, fuera del contenido público. No procesa pagos ni concede admisión automática. Los datos del formulario no se publican en el directorio.

Ejecutar `node admission-check.mjs` para comprobar la API con registros ficticios en almacenamiento temporal. `SAPP_APPLICATIONS_FILE` permite definir el archivo privado. La recepción funciona con el servidor Node; el envío de avisos por correo y una interfaz administrativa quedan pendientes. No se enviaron solicitudes de prueba a la lista real.

Los enlaces a TikTok utilizan el perfil compartido en el mismo archivo. Los siete videos se incluyen en carruseles horizontales en Inicio, Actualidad y Voces. Los originales se conservan íntegros, con sonido y controles nativos. No se descargan hasta solicitar la reproducción. Sin JavaScript, los enlaces permiten abrir el MP4 directamente. No se han producido transcripciones ni subtítulos adicionales.

## Contenido

Se utiliza exclusivamente el nombre **Sociedad de Abogadas del Perú**. Los programas, misión, visión, cuotas de lanzamiento y nombres del equipo proceden de los documentos locales. No se incluyen testimonios, patrocinadores, cifras de impacto ni eventos sin información institucional.

Las condiciones de lanzamiento se identifican como tales y deben confirmarse antes del lanzamiento público. Las ocho fotografías se asocian a nombres y cargos según las páginas 11 a 18 del PDF institucional. Los videos se numeran sin atribuir identidades ni declaraciones que no se hayan transcrito.

Cormorant Garamond y Source Sans 3 se solicitan a Google Fonts; existen fuentes de respaldo locales para navegación sin conexión. `design.md` guía la estructura, tipografía, espaciado, componentes y adaptación móvil. Se mantienen los colores aprobados del logo. Cada programa tiene una página propia, y Contacto reúne los canales disponibles. Actualidad presenta tres publicaciones basadas en los materiales institucionales, sin inventar fechas ni eventos. Se conserva el fondo claro, morado y dorado de las diapositivas. Aliados y testimonios se incorporarán cuando exista contenido autorizado.

## Composición y encuadres

La portada destaca a la Sociedad mediante su logo, nombre y lema. El índice enlaza a secciones diferenciadas por fondos de la paleta original. Las ocho integrantes tienen el mismo tamaño en el equipo. El campo `photo.focus` de `members.json` define el encuadre CSS (`object-position`), por ejemplo `60% 10%`; ejecutar `npm run build` tras ajustarlo.

El formulario de incorporación se muestra exclusivamente en un diálogo modal al pulsar los botones de solicitud, disponible en todas las páginas. No ocupa una sección del contenido. La ventana permite completar y enviar la solicitud, muestra la confirmación de registro y se cierra con el botón de cierre o Escape, devolviendo el foco al botón de origen.



El encabezado superior reúne el logo, nombre y único menú principal por encima del banner. Se desplaza con la página y sale de la vista al bajar; utiliza un menú desplegable en móvil.

El carrusel de voces de Inicio avanza una tarjeta cada 3 segundos con transiciones suaves de 1,2 segundos. El recorrido continúa del último al primer video sin retroceder. Incluye Pausar/Reanudar; continúa al pasar el cursor o enfocar las tarjetas. Con movimiento reducido cambia de tarjeta sin animación. Solo avanza cuando está visible y no hay un diálogo abierto. Los videos se reproducen al pulsarlos.

Las flechas del carrusel avanzan una sola tarjeta. El carrusel automático mantiene los siete elementos originales y los reordena al completar cada transición para crear un ciclo continuo, sin duplicar videos ni reiniciar visualmente la fila.

La composición vigente se detalla en UX.md: ocho bloques en Inicio, contacto institucional desde el directorio y popup en dos pasos.
