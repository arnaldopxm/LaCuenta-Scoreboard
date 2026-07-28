# Pendientes

Lo que está por hacer, con lo que cuesta cada cosa y lo que hay que decidir antes de tocar código. Ordenado de "se puede hacer ya" a "hay que decidir primero". Los puntos ya resueltos se quedan con su número y su historia en vez de desaparecer: explican por qué la app hace lo que hace.

Los no-negociables del proyecto están en el [README](README.md): offline-first, cero peticiones salientes, cero terceros, todo en el dispositivo. Los puntos que chocan con eso van marcados, y los que dependen de algo externo dicen de qué.

---

## 1. Tocar una ficha para doblar o quitar

**Listo para hacer. Sin decisiones pendientes.**

Hoy, en el sumador de cartas, tocar una ficha ya sumada la quita. El `×2` de Premium solo actúa sobre la carta que estás tecleando, así que si añades un plato y *luego* te acuerdas de que llevaba Premium, hay que quitarlo y volver a meterlo.

Cambio: tocar una ficha abre un menú pequeño con **Doblar** y **Quitar** en vez de borrar directamente.

Detalles a respetar:

- Doblar tiene que pasar por `duplicarImporte`, que ya respeta el signo y el tope. Un plato quemado de −15 dobla a −30.
- El total del campo se recalcula solo, porque ya sale de `sumarImportes` sobre la lista.
- Pulsables de 48 px como el resto: esto se usa con el pulgar y mala luz.
- Ojo con no romper el gesto actual sin avisar: quien ya use la app espera que tocar una ficha la quite. Igual conviene que **Quitar** sea la opción con más peso visual de las dos.

Archivos: `src/componentes/Sumador.tsx`, `Sumador.module.css`.

---

## 2. Sección de dudas frecuentes

**Listo para hacer. El contenido está redactado aquí abajo.**

Estas son las dudas que han salido de verdad mientras se construía la app, no un FAQ inventado. Casi todas son sitios donde el marcador hace algo que parece un error y no lo es, así que tenerlas dentro de la app ahorra discusiones en la mesa.

Sitio: una pantalla propia colgada del inicio, o un desplegable dentro de cada pantalla implicada. Lo segundo se lee mejor en el momento de la duda pero ensucia más las pantallas.

### La suma de lo pagado no cuadra con la cuenta

Es a propósito. Cada jugador paga redondeando **hacia arriba**: 100 € a pachas entre 3 son 34 € cada uno, o sea 102 €. Se prefieren céntimos limpios en la mesa a que el total cuadre al euro.

### La cuenta era más alta que mis ahorros y me he quedado en 0, no en negativo

También a propósito. No hay deuda: te quedas a cero y eso termina la partida. Las reglas no aclaran este caso, así que es una asunción del marcador, aislada en un solo archivo (`src/dominio/aplicarPago.ts`) por si algún día se decide otra cosa.

### Metí un plato quemado y la cuenta salió 0 aunque había propina

Correcto. La propina se suma al total **antes** del recorte a cero. Con las cartas en −20 y 5 de propina: `max(0, −20 + 5) = 0`, no paga nadie. Si el marcador recortara el total a cero antes de sumar la propina saldría 5 € y alguien pagaría de más.

### El +1 al límite de mano viene marcado sin que yo lo pida

A propósito. La mayoría de rondas llegan al mínimo de cartas, y quien se pone a contarlas es porque quiere el aumento. El marcador no ve la mesa, así que lo da por hecho y lo dice: si no se jugaron cartas suficientes, se desmarca. En el tope de 10 cartas no se puede marcar.

### Un plato quemado, ¿cuenta como carta para el aumento de mano?

Sí. Resta euros pero es una carta puesta en la mesa, y la regla del aumento cuenta **cartas jugadas, no euros**. En el sumador se mete con `±`.

### Fui a medias y solo subió la mano de uno

Así es. El aumento se lo lleva **únicamente quien jugó la carta de división**, nunca el co-pagador, aunque los dos paguen. Igual en A pachas.

### Corregí una ronda antigua y varias rondas posteriores aparecen tachadas

Si al corregir resulta que alguien se arruinó antes, la partida terminó ahí y las rondas siguientes no se jugaron nunca. No se borran: se marcan y vuelven al juego en cuanto arregles o quites la ronda culpable.

### Hay empate y la app no declara ganador

No puede. Las reglas lo resuelven mirando quién lleva más dinero encima en la vida real, y eso el móvil no lo sabe. Contadlo y elegid en la pantalla de desempate.

### ¿Se puede corregir una ronda de hace rato?

Cualquiera, desde el historial. Todo lo posterior se recalcula solo, porque el dinero no se guarda: se deriva de la lista de rondas cada vez.

### ¿Los nombres o las partidas salen del móvil?

No. Todo vive en el propio dispositivo y no hay ni una petición saliente. El propio HTML lleva una Content Security Policy que se lo impide al navegador.

---

## 3. Actualizaciones del PWA

**Hecho, con un fleco de maquetación anotado abajo.**

Lo que ya venía funcionando: el service worker versiona la caché con un **sha256 del contenido de todo `dist/`** (`plugin-sw.ts`), así que cualquier cambio en cualquier archivo produce una versión nueva y una caché nueva; las viejas se borran al activar. El worker nuevo **no toma el control por su cuenta**: espera a que el usuario acepte en el aviso, para no recargar a mitad de una ronda. Los assets de Vite ya van con hash de contenido en el nombre.

Lo que se ha añadido:

- **Comprobación activa al volver a primer plano.** Se llama a `registration.update()` en `visibilitychange`, con un **mínimo de 15 minutos** entre comprobaciones para no pedir `sw.js` a cada tirón de pantalla. Antes se dependía de cuándo lo mirara el navegador por su cuenta —en una navegación, o cada 24 h—, y un móvil con la app instalada y abierta días podía no enterarse nunca. El mínimo vive en `src/pwa/ritmoComprobacion.ts`, sin tocar el DOM, para poder probarlo. Sin red `update()` rechaza, que es el caso normal en el bar: se ignora y se vuelve a intentar a la siguiente.
- **La app ya sabe qué versión corre.** El worker contesta a un `postMessage` con su `VERSION`, respondiendo por el puerto del propio mensaje para que no conteste otro worker que ande esperando turno. Se enseña en pequeño al final del inicio: "¿qué versión tienes?" es la primera pregunta cuando algo falla en una terraza. En la primera visita se espera al worker a que reclame los clientes, porque si no la versión no saldría hasta la carga siguiente.
- **El aviso se calla mientras un formulario está a medias.** Era la decisión que quedaba abierta, y se ha tomado la primera de las tres opciones: callarse, en vez de avisar de lo que se va a perder o persistir el borrador. Vale para "Cerrar ronda" y para "Nueva partida", donde también se pierden ocho nombres tecleados. Cada pantalla compara una firma de sus campos con la de la primera pintada: así "recién abierto" —al corregir una ronda los campos vienen rellenos y no hay nada que perder— no se confunde con "el usuario ha tecleado algo". Nada se pierde por callarse: el worker nuevo espera su turno indefinidamente y el aviso vuelve al confirmar o al salir.
- El aviso descartado con *Ahora no* sigue sin volver a salir en esa sesión. Reaparece al recargar, porque el worker sigue esperando. Queda como estaba, ahora escrito en el propio componente.

Todo esto se comprueba con dos versiones de verdad y un Chromium real:

```bash
npm run verificar:actualizacion
```

Instala la versión A, publica la B, y mira que el aviso salga, que nada se recargue sin permiso, que el formulario a medias lo silencie y lo devuelva, y que al aceptar quede corriendo la B con una sola caché viva. Diecisiete comprobaciones. El ritmo de comprobación y el bus del aviso tienen además tests unitarios (`src/pwa/__tests__/`).

**El fleco:** el aviso está fijo abajo (`position: fixed`) y el pie de las pantallas está pegado abajo también (`position: sticky`), así que **el aviso tapa el botón de acción primaria** —*Empezar*, *Confirmar ronda*—. Viene de antes, no de este cambio, y ahora molesta menos porque al teclear el aviso se calla y deja el botón libre; pero con el formulario recién abierto y sin tocar, el botón está debajo del aviso. Arreglarlo es decidir dónde vive el aviso: arriba taparía el botón de volver, y reservarle sitio abajo obliga a medir su altura y pasarla al pie como variable CSS. Es una decisión de maquetación, no de versionado, y por eso se anota en vez de resolverse aquí.

Nota de sitio: la versión se enseña en el inicio y no en una pantalla de "Acerca de" porque esa pantalla todavía no existe. Cuando se hagan las dudas frecuentes (punto 2) o los créditos (punto 5), es su sitio natural.

Archivos: `src/pwa/registro.ts`, `src/pwa/ritmoComprobacion.ts`, `src/pwa/estadoActualizacion.ts`, `src/pwa/useSinInterrupciones.ts`, `src/pwa/useVersion.ts`, `src/componentes/AvisoActualizacion.tsx`, `src/sw/sw.ts`, `scripts/verificar-actualizacion.mjs`.

---

## 4. Invitación a instalar, en Android y en iOS

**Listo para hacer, con una restricción de plataforma que no se puede sortear.**

Hoy **no hay nada**: si alguien no sabe que esto se puede instalar, se queda usándolo en una pestaña. El encargo pedía "sin prompt de instalación intrusivo. Un acceso discreto", así que el objetivo es un acceso discreto, no un modal al primer arranque.

Son dos implementaciones distintas porque las plataformas no se parecen:

- **Android / Chromium.** Hay API: se captura el evento `beforeinstallprompt`, se guarda, y se enseña un botón propio que llama a `prompt()` cuando el usuario quiera. El navegador solo dispara ese evento si la PWA cumple los criterios de instalabilidad, que ya se cumplen (manifiesto, service worker, HTTPS).
- **iOS / Safari.** **No hay API.** `beforeinstallprompt` no existe y no se puede provocar el diálogo. Lo único posible es explicar el gesto: *Compartir → Añadir a pantalla de inicio*, con el icono de compartir dibujado para que se reconozca. Es una instrucción, no un botón.

Detalles a respetar:

- **No enseñarlo si ya está instalada.** `window.matchMedia('(display-mode: standalone)')` cubre Android y, en iOS, `navigator.standalone`.
- **Recordar que se descartó**, y no volver a insistir. En `localStorage` como el tema, que no es estado de partida.
- Sin modales al arrancar. Un botón discreto en el inicio, y como mucho una tira que se pueda cerrar.
- El icono de compartir de iOS hay que dibujarlo como SVG en el código: no se puede tirar de una fuente de iconos, y menos de una remota.

---

## 5. Créditos

**Aplazado a propósito. Queda anotado aquí y no se toca por ahora.**

Cuando se retome, esto es lo que debería llevar:

- Autoría de la app. **Hace falta decidir cómo quieres aparecer**: nombre, alias, enlace a GitHub o a donde sea.
- Crédito del juego, que ya está en el README: **La Cuenta**, de 2Tomatoes Games, diseñado por Litus Carreras y Ariadna Altimira.
- Una línea dejando claro que **esto es una herramienta no oficial de aficionado**, sin relación con la editorial. Es lo honesto y evita malentendidos si la app circula.
- Licencias de las tipografías, las tres SIL OFL 1.1 (Alfa Slab One, Source Sans 3, Courier Prime).

Sitio natural: al final de la pantalla de inicio o en una pantalla de "Acerca de" junto a las dudas frecuentes.

La licencia del repositorio iba en este punto, pero se sale a su propio apartado más abajo: no es una cuestión de créditos y tiene efecto ya.

---

## 6. El manual del juego dentro de la app

**Hay que decidir qué texto, y hay un asunto de derechos.**

La idea es poder consultar las reglas sin buscar el papel. Encaja bien: es texto, funciona offline y no necesita nada de red.

Lo que hay que resolver antes:

- **El reglamento es material con derechos de 2Tomatoes Games.** Copiarlo entero en la app y publicarla no es lo mismo que tenerlo en tu móvil. Tres salidas: pedir permiso a la editorial, escribir un resumen propio de las reglas con nuestras palabras, o enlazar al PDF oficial (esto último rompe el offline, que es justo lo que se quería evitar).
- **Alcance.** El marcador declara explícitamente que no modela cartas, tapas ni precios. Un manual completo con el catálogo de cartas metería por la puerta de atrás justo lo que se dejó fuera a propósito. Conviene decidir si es "las reglas que afectan al dinero" (compatible, y ya está medio escrito en el README) o "el reglamento entero" (otra cosa).
- **Peso.** Solo texto no se nota. Con las ilustraciones del manual, sí: habría que tratarlo como descarga opcional, igual que se planteó para el reconocimiento de fotos.

Mi recomendación: empezar por un **resumen propio de las reglas que el marcador usa**, escrito con nuestras palabras. Resuelve el 90 % de las consultas de mesa, no tiene problema de derechos y se solapa con las dudas frecuentes del punto 2.

---

## 7. Publicidad

**Choca de frente con cuatro de los no-negociables. Hace falta una decisión consciente.**

No es un "cuidado con esto": una red de anuncios al uso (AdSense, AdMob y compañía) es **incompatible** con la app tal como está construida hoy.

Qué se rompe exactamente:

| Propiedad actual | Qué pasa con una red de anuncios |
|---|---|
| Cero peticiones salientes | Se acabó. Los anuncios se piden a un tercero. |
| Funciona en modo avión | El hueco del anuncio falla justo donde se usa la app: el wifi del bar. |
| RGPD trivial | Deja de serlo: rastreo, banner de consentimiento, política de privacidad. |
| CSP que lo hace cumplir | Habría que abrirla (`connect-src`, `script-src`, `img-src` a terceros), y con ella se cae la garantía técnica. |

Y el cálculo práctico no ayuda: una PWA personal con un puñado de usuarios genera céntimos, a cambio de demoler la propiedad que define la app. Encima el propio encargo pedía "sin prompt de instalación intrusivo"; un banner en una app de mesa de bar es lo contrario de eso.

**La alternativa que sí encaja:** un hueco de patrocinio **estático y self-hosted**. Una imagen y un enlace, dentro del repositorio, sin red y sin rastreo. Lo colocas tú a mano —un bar amigo, la tienda donde compraste el juego, lo que sea— y sigue funcionando en avión. Cero peticiones, cero terceros, cero banner de consentimiento. Es literalmente "publicidad que no molesta", y es la única forma de tenerla sin tocar ningún no-negociable.

Una opción intermedia si lo que se busca es sostener el proyecto: un enlace de apoyo (invitar a un café), que solo sale a la red **si alguien lo pulsa**. Sin rastreo y sin peso.

**Decisión pendiente:** patrocinio estático, enlace de apoyo, las dos, o abrir la mano y asumir el coste de romper el offline y la privacidad. Si es lo último, que sea a sabiendas y no por deslizamiento.

---

## 8. Reconocimiento de cartas por foto

**Bloqueado a la espera de fotos reales. Sin ellas no se puede decidir.**

La idea es fotografiar las cartas de la mesa y que la app sume. Decidido ya: **todo en el dispositivo** (nada de API de visión, que rompería el offline y la privacidad) y el motor como **descarga opcional**, para que la app base siga pesando medio mega e instalándose con el wifi malo de un bar.

Lo medido, no estimado a ojo:

| Pieza | Peso |
|---|---|
| `tesseract-core-simd-lstm.wasm` | 2,8 MB |
| `eng.traineddata` (variante `best_int`, comprimida) | 2,8 MB |
| Glue de tesseract.js | ~0,1 MB |

Unos **5,7 MB**. Y hay margen para bajarlo bastante: si los precios son un puñado de cifras con tipografía fija, se puede recortar el `traineddata` a solo dígitos, o entrenar un clasificador de glifos que cabría **por debajo de 1 MB** y sería más preciso que un OCR general, porque el problema es mucho más pequeño que "leer texto arbitrario".

**Qué falta para decidir:** una foto real de una mesa con cartas jugadas, hecha con el móvil y con la luz que hay de verdad. Y otra con mala luz, que es el caso que importa: si funciona a mediodía pero no en una terraza de noche, no sirve. Lo que hay que mirar en ellas: cuántos píxeles ocupa el precio, si hay brillos del plástico, cuánto se solapan las cartas y si la cifra es limpia o decorativa. Esas cuatro cosas deciden entre OCR general, clasificador propio o descartarlo.

**Sin prisa:** el sumador manual ya resuelve el problema de fondo, que era sumar. Esto es comodidad, no necesidad.

---

## 9. Licencia del repositorio

**Hecho, con un seguimiento pendiente.** El código es propietario, todos los derechos reservados: ver [LICENSE](LICENSE). Autor, Arnaldo Alberto Quintero Segura; explotación comercial prevista, Shiroo Innovation Group S.L.

Los avisos de terceros están en [TERCEROS.md](TERCEROS.md), con los textos copiados de los archivos de licencia de cada paquete. Queda un fleco menor anotado allí: el aviso de copyright de **Source Sans 3** viene del proyecto original y no del archivo que servimos, porque el subset de Google Fonts trae la tabla de nombres eliminada. Falta cotejar el rango de años exacto.

Recordatorio de por qué no se pone el repositorio en privado: **GitHub Pages en plan gratuito exige repositorio público.** Privado tumbaría el despliegue salvo pasar a plan de pago.

---

## 10. Titularidad, al constituirse Shiroo Innovation Group S.L.

**Disparador: la inscripción de la sociedad en el Registro Mercantil.**

Hoy la sociedad está en constitución: no tiene personalidad jurídica propia ni CIF, así que **no puede ser todavía titular de derechos**. Por eso el `LICENSE` pone el copyright a nombre del autor como persona física, con la sociedad citada como destinataria prevista de la explotación comercial. Está redactado así a propósito, no por descuido.

Cuando quede inscrita, dos cosas:

1. **Actualizar `LICENSE`** con la denominación definitiva y el CIF. Y el `README`, que repite el dato.
2. **Formalizar por escrito la cesión de los derechos de explotación** del autor a la sociedad. Esto es lo que de verdad mueve la titularidad: en España la cesión de derechos de explotación se hace por escrito, y **sin ese documento los derechos se quedan donde están**, por mucho que un archivo del repositorio diga otra cosa. Cambiar el `LICENSE` sin firmar la cesión deja un aviso que no se sostiene.

Nada de esto es asesoramiento jurídico: es la lista de lo que queda por atar. El documento de cesión merece que lo revise quien lleve la constitución de la sociedad.

---

## Sin decidir, de antes

Vienen del encargo original y siguen abiertas. Están explicadas en el [README](README.md).

- **¿La propina puede ser negativa?** Ahora se valida como no negativa, asumiendo que siempre es el precio de una tapa. Si en el juego hay algún caso en que reste, es un cambio de una línea.
- **Cada push a una rama con PR abierto lanza CI dos veces**, una por el evento `push` y otra por `pull_request`. Se arregla acotando los disparadores, pero cambia qué se comprueba en qué ramas, así que mejor decidirlo con calma. De momento sirve de algo: el 28/07/2026 las dos ejecuciones del mismo commit dieron resultados distintos, y esa contradicción es lo que identificó el fallo del endpoint de auditoría.
- **El endpoint que usa `npm audit` está en retirada.** npm lo anuncia en cada ejecución y hoy ya devuelve 400 de forma intermitente; `scripts/auditar.sh` lo tolera con reintentos, pero eso es un parche. Cuando npm publique la migración al *bulk advisory endpoint*, o cuando los reintentos dejen de bastar, hay que cambiar la comprobación —o sustituirla por Dependabot, que audita del lado de GitHub y no depende del registro en tiempo de CI.
- **A pachas sin el pagador.** Nada impide desmarcar a quien pidió la cuenta. Se deja pasar a propósito.
