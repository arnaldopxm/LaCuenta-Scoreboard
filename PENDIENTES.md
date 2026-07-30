# Pendientes

Lo que está por hacer, con lo que cuesta cada cosa y lo que hay que decidir antes de tocar código. Ordenado de "se puede hacer ya" a "hay que decidir primero". Los puntos ya resueltos se quedan con su número y su historia en vez de desaparecer: explican por qué la app hace lo que hace.

Los no-negociables del proyecto están en el [README](README.md): offline-first, cero peticiones salientes, cero terceros, todo en el dispositivo. Los puntos que chocan con eso van marcados, y los que dependen de algo externo dicen de qué.

---

## 1. Tocar una ficha para doblar o quitar

**Hecho.**

Antes, tocar una ficha ya sumada la quitaba en el acto. El `×2` de Premium solo actúa sobre la carta que estás tecleando, así que si añadías un plato y *luego* te acordabas de que llevaba Premium, había que quitarlo y volver a meterlo. Ahora tocar una ficha abre un menú pequeño con **Doblar** y **Quitar**.

Cómo quedaron los detalles que había que respetar:

- **Doblar pasa por `duplicarImporte`**, así que el signo y el tope los sigue gobernando un solo sitio: un plato quemado de −15 dobla a −30. El total del campo se recalcula solo, porque sale de `sumarImportes` sobre la lista.
- **El menú se queda abierto al doblar**, que no estaba previsto y sale gratis: un Premium sobre un plato ya doblado —×4— son dos toques en el mismo sitio. Al quitar se cierra, que la ficha ya no está.
- **Pulsables de 48 px**, y los dos botones igualados en alto por la rejilla.
- **Quitar conserva el peso visual**: más ancho que Doblar y con el color de peligro, porque es lo que hacía el gesto de siempre. La cruz de la ficha pasó a ser `⋯`, que es lo honesto cuando tocar abre opciones en vez de borrar.

Dos cosas que aparecieron al hacerlo:

- **El menú va debajo de la fila de fichas, no flotando junto a la que se toca.** Con ocho fichas envolviendo en dos líneas, un desplegable anclado a la última se sale de la pantalla por la derecha. Lo que lo ata a su carta es el recuadro de la ficha tocada más el rótulo del menú.
- **La operación sobre la lista se fue al dominio** (`doblarCartaEn`, `quitarCartaEn` en `src/dominio/sumador.ts`), que es la única capa con tests: los componentes no se renderizan en los tests. Ahí está también el caso raro que sí pasa —el índice que tenía el menú abierto puede dejar de existir, porque teclear el total a mano descarta el desglose entero—, resuelto derivando el menú en vez de guardar el índice a secas.

El color de Quitar va en el texto y el borde, no en el fondo: en oscuro `--peligro` se aclara tanto que el texto crema encima no se leería.

Archivos: `src/dominio/sumador.ts`, `src/componentes/Sumador.tsx`, `Sumador.module.css`. Se comprueba de punta a punta en `npm run verificar:offline`: doblar la ficha de 12 con otra de 8 deja 32 € en el campo, y quitarla deja 8 €.

---

## 2. Sección de dudas frecuentes

**Hecho.** Están en `src/pantallas/Dudas.tsx`. El texto de aquí abajo es el que se sirve, quitándole los apuntes de desarrollo: en la app no se cita ningún archivo del repositorio y la Content Security Policy se llama "una regla de seguridad", que es lo que significa para quien está en un bar.

Estas son las dudas que han salido de verdad mientras se construía la app, no un FAQ inventado. Casi todas son sitios donde el marcador hace algo que parece un error y no lo es, así que tenerlas dentro de la app ahorra discusiones en la mesa.

**Decisión de sitio: pantalla propia colgada del inicio**, con un enlace discreto al lado del de instalar. La otra opción —un desplegable dentro de cada pantalla implicada— se lee mejor en el momento exacto de la duda, pero ensucia justo el formulario de cerrar ronda, que es donde menos margen hay. Las respuestas van plegadas en `details` del navegador: sin estado, sin JavaScript, accesibles de serie, y el pulsable es el `summary` entero para que llegue a los 48 px aunque la pregunta quepa en una línea.

Se añadió una pregunta que no estaba en esta lista, la del Premium a posteriori, porque el punto 1 acababa de darle respuesta: son once en total. Y el tope de 10 cartas de la respuesta del aumento se lee de `LIMITE_MANO_MAX` en vez de escribirse a mano, que las constantes de las reglas viven en un solo sitio.

**La versión se queda en el inicio.** El punto 3 anotaba esta pantalla como su sitio natural, y al llegar aquí no se ha movido: "¿qué versión tienes?" se pregunta con alguien esperando al otro lado, y en el inicio se lee sin un toque. Donde está prueba además el viaje del `postMessage` en la primera carga, que es lo que verifica el script.

### La suma de lo pagado no cuadra con la cuenta

Es a propósito. Cada jugador paga redondeando **hacia arriba**: 100 € a pachas entre 3 son 34 € cada uno, o sea 102 €. Se prefieren céntimos limpios en la mesa a que el total cuadre al euro.

### La cuenta era más alta que mis ahorros y me he quedado en 0, no en negativo

También a propósito. No hay deuda: te quedas a cero y eso termina la partida. Las reglas no aclaran este caso, así que es una asunción del marcador, aislada en un solo archivo (`src/dominio/aplicarPago.ts`) por si algún día se decide otra cosa.

### Metí un plato quemado y la cuenta salió 0 aunque había propina

Correcto. La propina se suma al total **antes** del recorte a cero. Con las cartas en −20 y 5 de propina: `max(0, −20 + 5) = 0`, no paga nadie. Si el marcador recortara el total a cero antes de sumar la propina saldría 5 € y alguien pagaría de más.

### Añadí una carta y luego me acordé del Premium

Toca la ficha de esa carta en el sumador y elige **Doblar**. El `×2` del teclado solo afecta a la carta que estás tecleando; para una ya sumada, el menú de la ficha. Ahí mismo está **Quitar**.

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

Instala la versión A, publica la B, y mira que el aviso salga, que nada se recargue sin permiso, que el formulario a medias lo silencie y lo devuelva, que con el aviso a la vista el botón del pie no quede tapado, y que al aceptar quede corriendo la B con una sola caché viva. Dieciocho comprobaciones. El ritmo de comprobación y el bus del aviso tienen además tests unitarios (`src/pwa/__tests__/`).

**El fleco que estaba anotado aquí, resuelto.** El aviso está fijo abajo (`position: fixed`) y el pie de las pantallas está pegado abajo también (`position: sticky`), así que **el aviso tapaba el botón de acción primaria** —*Empezar*, *Confirmar ronda*, *Cerrar ronda*—. Se resolvió por donde apuntaba la nota: el aviso se mide con un `ResizeObserver` y publica su alto en el `body` como `--alto-aviso`; el pie de `Pantalla` y el inicio le suman ese hueco al `padding-bottom`, que vale 0 cuando no hay aviso. Se mide en vez de reservar a ojo porque el texto envuelve distinto según el ancho y las tipografías del sistema no miden lo mismo en todos los móviles.

Nota de sitio, resuelta: la versión se enseña en el inicio. Esta nota decía que las dudas frecuentes (punto 2) serían su sitio natural en cuanto existieran; existen, y se ha decidido dejarla donde está. "¿Qué versión tienes?" se pregunta con alguien esperando al otro lado, y en el inicio se lee sin un toque.

Archivos: `src/pwa/registro.ts`, `src/pwa/ritmoComprobacion.ts`, `src/pwa/estadoActualizacion.ts`, `src/pwa/useSinInterrupciones.ts`, `src/pwa/useVersion.ts`, `src/componentes/AvisoActualizacion.tsx`, `src/sw/sw.ts`, `scripts/verificar-actualizacion.mjs`.

---

## 4. Invitación a instalar, en Android y en iOS

**Hecho, con un fleco que solo se cierra con un Android en la mano.**

Antes no había nada: quien no supiera que esto se puede instalar se quedaba usándolo en una pestaña. Ahora hay un **enlace discreto en el inicio** —"Instalar en el móvil"— y una pantalla propia con las instrucciones. Nada sale por su cuenta: no hay modal al arrancar ni tira que haya que cerrar, así que tampoco hay nada que recordar en `localStorage`. Se ve si se pide, y si no, no.

Son tres caminos y no dos, porque manda el navegador y no el sistema (`src/pwa/caminoInstalacion.ts`):

- **`directa`.** Hay un `beforeinstallprompt` guardado, así que hay un botón de verdad que abre el diálogo del navegador. Es Chromium con la PWA cumpliendo los criterios de instalabilidad, que ya se cumplen (manifiesto, service worker, HTTPS). Al evento se le hace `preventDefault()`, que es justo lo que calla la barrita que Chrome saca por su cuenta, y se guarda para cuando el usuario pulse. El evento **se gasta**: una vez usado ya no vale, y el navegador lo volverá a disparar cuando le parezca.
- **`ios`.** **No hay API.** `beforeinstallprompt` no existe en Safari y el diálogo no se puede provocar, así que son tres pasos explicados: *Compartir → Añadir a pantalla de inicio → Añadir*, con el icono de compartir dibujado como SVG para que se reconozca. Con el aviso de que **tiene que ser Safari**: los demás navegadores de iPhone no pueden añadir nada a la pantalla de inicio.
- **`manual`.** Firefox, escritorio, o un Chromium que aún no ha disparado el evento: se dice dónde mirar en el menú y ya.

El enlace **desaparece en cuanto está instalada** —`display-mode: standalone` en Android y escritorio, `navigator.standalone` en iOS—, y se vuelve a mirar al volver a primer plano, porque en iOS se sale de la app instalada al navegador sin recargar.

Lo que se comprueba: la decisión de camino y el reconocimiento de plataforma tienen tests unitarios con agentes de usuario reales, incluido el de **iPadOS, que se anuncia como un Mac de escritorio** y se le pilla por los puntos de contacto. La verificación offline abre el wizard y exige que salga **uno** de los tres caminos —nunca ninguno—, y con un contexto que se anuncia como iPhone comprueba que salgan las instrucciones de Safari y no las del menú de Chromium.

**El fleco:** el camino `directa` no se puede verificar en CI. Un Chromium sin cabeza no dispara `beforeinstallprompt`, así que en la verificación sale siempre el camino `manual`. Que el botón de instalar aparezca de verdad y abra el diálogo **hay que comprobarlo una vez con un Android en la mano**. Si ahí no sale, lo que se ve es el camino `manual`, que sigue siendo instrucciones correctas: el fallo degrada, no rompe.

---

## 5. Créditos

**Aplazado a propósito. Queda anotado aquí y no se toca por ahora.**

Cuando se retome, esto es lo que debería llevar:

- Autoría de la app. **Hace falta decidir cómo quieres aparecer**: nombre, alias, enlace a GitHub o a donde sea.
- Crédito del juego, que ya está en el README: **La Cuenta**, de 2Tomatoes Games, diseñado por Litus Carreras y Ariadna Altimira.
- Una línea dejando claro que **esto es una herramienta no oficial de aficionado**, sin relación con la editorial. Es lo honesto y evita malentendidos si la app circula.
- Licencias de las tipografías, las tres SIL OFL 1.1 (Alfa Slab One, Source Sans 3, Courier Prime).

Sitio natural, ya concreto: **al final de la pantalla de dudas** (punto 2), que existe desde ahora y es la única pantalla de la app que es texto para leer. Cuelga del inicio con un enlace discreto, así que no hay que inventar navegación nueva; como mucho, cambiarle el título si acaba llevando dos cosas.

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
