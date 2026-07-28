# La Cuenta · Marcador

PWA para llevar la contabilidad de las partidas de **La Cuenta** (2Tomatoes Games, Litus Carreras / Ariadna Altimira).

Es un marcador puro: lleva el dinero de cada jugador, las divisiones de la cuenta y las fichas de aumento de mano. No modela las cartas, ni la mesa, ni el mazo.

Está pensado para lo que pasa de verdad: un grupo de hasta ocho personas en una mesa de bar, **un solo móvil que se pasa de mano en mano**, sin red garantizada. Botones grandes, pocos toques, legible con mala luz.

---

## Cómo levantarlo

```bash
npm ci
npm run dev          # servidor de desarrollo
```

En desarrollo **no se registra el service worker**: molesta más que ayuda al recargar. Para probar el comportamiento offline hay que hacer build.

```bash
npm run build        # typecheck + bundle + generación de sw.js
npm run preview      # sirve dist/ como en producción
```

## Cómo pasar los tests

```bash
npm test             # los 164 tests del dominio, la persistencia y el PWA
npm run test:watch
npm run typecheck    # app y service worker, cada uno con su tsconfig
```

Los tests del dominio corren en entorno `node` y no renderizan nada. Los de persistencia usan `fake-indexeddb`. Los del PWA cubren las dos piezas del flujo de actualización que son lógica pura: cada cuánto se comprueba si hay versión nueva y el bus que decide si el aviso puede salir. Lo demás del flujo necesita un navegador y dos versiones, y para eso está la verificación de más abajo.

### Verificación offline real

```bash
npm run verificar:offline
```

Levanta un servidor estático con `dist/`, abre Chromium, instala el service worker, juega una partida, **corta la red del navegador**, recarga y comprueba que todo siga en pie. También vigila que no salga ni una petición fuera del origen.

Las dieciséis comprobaciones que hace:

| Comprobación | Qué verifica |
|---|---|
| El service worker toma el control | Registro correcto |
| Precache poblado | Los 16 recursos del shell, avisos legales incluidos |
| La versión que se enseña es la del worker | El `postMessage` de versión, ya en la primera carga |
| El aumento de mano viene marcado por defecto | El caso normal no cuesta ningún toque |
| Previsualización con redondeo al alza | 141 € entre 4 → 36 € cada uno |
| Ahorros aplicados al marcador | El fold de rondas llega a la pantalla |
| Aumento de mano concedido solo al pagador | El co-pagador no sube |
| Atrás desde el marcador lleva al inicio | El formulario de partida nueva no se apila |
| Atrás desde corregir vuelve al historial | Pila de tres niveles |
| Atrás desde el historial vuelve al marcador | Desapilado completo |
| Guardar una corrección devuelve al historial | Confirmar sale por donde se entró |
| La app arranca en modo avión | Recarga sin red |
| La partida y la corrección sobreviven sin red | IndexedDB persiste |
| Navegación servida desde caché | Arranque en frío sin red |
| Cero peticiones fuera del origen | Ni fuentes, ni iconos, ni telemetría |
| Sin errores de JavaScript | Incluidas violaciones de CSP |

Si el entorno tiene otro Chromium, se le pasa con `CHROMIUM_BIN=/ruta/al/chrome`.

### Verificación del flujo de actualización

```bash
npm run verificar:actualizacion
```

Lo que no se puede comprobar de ninguna otra forma: hace falta una versión instalada, otra publicada después y un navegador que note el cambio. El script copia `dist/` dos veces, cambia en la segunda copia el `VERSION` del worker y un texto del bundle —un `sw.js` distinto byte a byte es justo lo que hace que el navegador vea un worker nuevo— y sirve primero una y luego la otra.

Las dieciocho comprobaciones, en cuatro tramos:

| Tramo | Qué verifica |
|---|---|
| Versión A instalada | La versión sale ya en la primera carga y no hay aviso si no hay nada nuevo |
| Se publica la B | El aviso aparece, y nada se recarga por su cuenta |
| Formulario a medias | Al teclear, el aviso se calla; al confirmar o salir, vuelve. Y con el aviso a la vista, el botón del pie no queda tapado |
| El usuario acepta | Corre la B, el bundle servido es el nuevo, la partida sobrevive, queda una sola caché y arranca sin red |

## Scripts de mantenimiento

```bash
npm run iconos       # regenera los PNG de la PWA desde el SVG del script
npm run fuentes      # vuelve a bajar los subsets latinos de las tipografías
```

Los dos escriben archivos que **se comitean al repositorio**. En tiempo de ejecución la app no descarga nada.

---

## Despliegue

Cada push a `main` pasa por CI y, si todo está en verde, publica en **GitHub Pages**:

<https://arnaldopxm.github.io/LaCuenta-Scoreboard/>

El trabajo se hace en ramas y entra por pull request; `main` es lo que hay publicado. El workflow (`.github/workflows/desplegar.yml`) corre tests, auditoría de dependencias, build y **las dos verificaciones con Chromium —la offline y la del flujo de actualización—** en cualquier rama y en cada PR, pero solo publica desde `main`. La rama de publicación está fijada por nombre y no a "la rama por defecto": lo que sale a internet no debería cambiar porque alguien toque un ajuste del repositorio. La verificación se ejecuta con `--subruta`, porque Pages sirve el proyecto en `/LaCuenta-Scoreboard/` y no en la raíz del dominio: es exactamente lo que se despliega lo que se comprueba.

**Activación, una sola vez:** en *Ajustes → Pages → Build and deployment → Source*, elegir **GitHub Actions**. Crear el sitio de Pages es administración del repositorio, y el `GITHUB_TOKEN` de Actions no puede hacerlo por mucho `pages: write` que se le dé. A partir de ahí no hay que volver a tocar nada: cada push despliega solo.

La concurrencia está partida en dos a propósito: una cola **por rama** a nivel de workflow, que cancela lo obsoleto de esa misma rama, y la cola global `pages` **solo en el job que publica**. Con un único grupo global —como estaba al principio— un push a cualquier rama cancelaba un despliegue de `main` que estuviera en cola, y eso no se ve, porque un run cancelado no sale en rojo.

Un aviso: el paso `npm audit --audit-level=high` **bloquea el despliegue** si aparece un CVE alto, aunque sea en una dependencia de desarrollo. Es deliberado —la promesa de privacidad de esta app depende de no arrastrar basura— pero significa que un aviso de seguridad ajeno puede parar una publicación. Si algún día estorba, es un paso de cuatro líneas.

### Desplegar en otro sitio

El build no da por hecho ninguna ruta: `base: './'` y todas las URLs del manifiesto, el service worker y los assets son relativas. `dist/` funciona tal cual en la raíz de un dominio, en un subdirectorio o en Netlify, Cloudflare Pages o cualquier hosting estático. El único requisito real es **HTTPS**, sin el cual no hay service worker y por tanto no hay offline.

---

## Stack

| Pieza | Versión | Por qué |
|---|---|---|
| TypeScript | 7.0.2 | Estricto, con `noUncheckedIndexedAccess` |
| Vite | 8.1.5 | Build reproducible y rápido |
| React | 19.2.8 | La lógica vive fuera de React igualmente |
| Dexie | 4.4.4 | IndexedDB con una API decente |
| Vitest | 4.1.10 | Tests del dominio sin DOM |
| Playwright | devDep | Solo para la verificación offline |
| sharp | devDep | Solo para generar los iconos |

**Cero dependencias de runtime más allá de React y Dexie.** Sin router, sin librería de estado, sin librería de iconos, sin framework de CSS. `npm audit` sale limpio.

En lugar de un router hay un hook de ~80 líneas (`src/estado/useNavegacion.ts`): una pila de pantallas sincronizada con la History API. No hay URLs —la app se instala, no se enlaza— pero **el botón físico de atrás de Android y el gesto de iOS funcionan**, que era lo único que un router aportaba aquí. La profundidad viaja en el `state` de cada entrada del historial, así que mantener pulsado el atrás para saltar tres pantallas de golpe también deja la pila coherente.

### Por qué no hay Workbox

El plan original usaba `vite-plugin-pwa`. Al instalarlo aparecieron **8 CVEs high**, todos por la misma cadena: `vite-plugin-pwa → workbox-build → rollup-plugin-off-main-thread → ejs 3.x`. No hay salida limpia:

- `vite-plugin-pwa@1.2.0`, que es lo que sugiere `npm audit fix`, **no soporta Vite 8**.
- El problema no es de una versión concreta: **todas las versiones de `workbox-build` arrastran algún `rollup-plugin-off-main-thread` que depende de `ejs 3.x`**.

Así que el service worker está escrito a mano (`src/sw/sw.ts`, ~100 líneas) más un plugin de build de ~60 (`plugin-sw.ts`). Hay dos plugins propios más, igual de pequeños: `plugin-csp.ts` calcula el hash del script en línea para la CSP, y `plugin-avisos.ts` copia `LICENSE` y `TERCEROS.md` al bundle, porque la OFL exige que la licencia acompañe a los archivos de fuente que se distribuyen. Para una app que precachea su shell entero y no habla con ningún servidor, Workbox no aportaba nada que compensara ocho CVEs.

---

## Cómo está montado

```
src/
├─ dominio/         LÓGICA PURA — ni un import de React en toda la carpeta
│   ├─ tipos.ts             Partida, Jugador, Ronda, Reparto
│   ├─ reglas.ts            tabla de ahorros, límite de mano, tope de 10 cartas
│   ├─ calculoRonda.ts      cuenta con propina y reparto con redondeo al alza
│   ├─ aplicarPago.ts       el clamp a 0, solo en su archivo (ver más abajo)
│   ├─ derivarEstado.ts     el fold sobre las rondas y la previsualización
│   ├─ finPartida.ts        fin de partida, clasificación y empate
│   ├─ mutaciones.ts        añadir, editar y borrar rondas
│   ├─ validacion.ts        importes enteros y saneado de nombres
│   └─ __tests__/           los catorce casos obligatorios, uno a uno
├─ persistencia/    Dexie y repositorio de partidas
├─ estado/          el puente con React: usePartida, useTema, useNavegacion
├─ pantallas/       Inicio, NuevaPartida, Marcador, CerrarRonda,
│                   HistorialRondas, FinPartida, HistorialPartidas
├─ componentes/     Cartucho, Pizarra, Ticket, FilaJugador, controles
├─ estilos/         tokens.css (paleta y modo oscuro) y base.css
├─ fuentes/         los .woff2, dentro del bundle
├─ pwa/             registro del worker, comprobación de versión y aviso
└─ sw/              el service worker, con su propio tsconfig
```

### El modelo es event-sourced

**Los ahorros y los aumentos de mano no se guardan nunca.** La única fuente de verdad es la lista ordenada de rondas; todo lo demás sale de recorrerla desde el principio en cada render.

Esto es lo que hace que editar la ronda 2 de 7 sea trivial y correcto: se recalcula entera y punto. No hay deltas incrementales sobre un saldo almacenado, así que no hay forma de que el saldo y el historial se desincronicen.

### El redondeo al alza es intencional

Cada jugador paga `ceil(cuenta / n)`. Con 100 € a pachas entre 3, salen 34 € cada uno, o sea 102 € pagados para una cuenta de 100 €. Se prefieren céntimos limpios en la mesa a que la suma cuadre al euro. **No lo "arregles"** repartiendo el resto ni guardando decimales; hay tests que fijan este comportamiento.

### La partida se para en seco al llegar el fin

El recorrido de rondas **para** en cuanto una deja a alguien sin ahorros. Las reglas no dan margen: ahí se acabó, así que ninguna ronda posterior pudo jugarse y ninguna puede mover el dinero de nadie.

En una partida normal esto no se nota, porque la interfaz no deja cerrar más rondas una vez terminada. Solo aparece al **corregir el pasado**: si arreglas la ronda 2 y resulta que alguien se arruinó ahí, las rondas 3, 4 y 5 nunca ocurrieron.

Esas rondas **no se borran**. Siguen guardadas, el historial las enseña tachadas con un sello de "no se jugó", y se pueden corregir o borrar. En cuanto arregles o quites la ronda culpable, vuelven al juego solas. La pantalla de corregir avisa antes de guardar, en el propio ticket: *rondas anuladas: 3*.

Borrar datos del usuario porque un número cambió sería la decisión fácil y la equivocada.

### El total de las cartas puede ser negativo, y el orden importa

Los platos quemados restan, así que `totalCartas` admite valores negativos. La propina no: es el precio de una tapa. Por eso hay dos validadores, `esImporteConSigno` para las cartas y `esImporteValido` para todo lo demás.

Lo delicado es el **orden de las operaciones**, que ya venía fijado en el encargo y ahora tiene una causa concreta:

```
cuenta = max(0, totalCartas + propina)
```

La propina se suma **antes** del recorte a cero. Con las cartas en −20 y una propina de 5, la cuenta es `max(0, −15) = 0` y no paga nadie. Si el total se recortara a cero antes de tiempo, saldría `max(0, 0 + 5) = 5` y alguien pagaría 5 € que no debe. Hay un test que compara las dos formas de calcularlo justo para que nadie "simplifique" esto.

### El clamp a 0 vive solo en un archivo

Las reglas oficiales dicen que la partida acaba cuando a alguien "se le acaban los ahorros", pero no aclaran qué pasa si la cuenta supera lo que ese jugador tiene. Aquí se asume **clamp a 0, sin deuda negativa**, y eso dispara el fin de partida.

Esa decisión está aislada en `src/dominio/aplicarPago.ts`, en una función de una línea. Si algún día se decide otra cosa —deuda negativa, o que el resto cubra la diferencia— se cambia ahí y ni el reparto, ni la derivación de estado, ni la detección de fin de partida se enteran.

### El aumento de mano se da por hecho

La regla del +1 al límite de mano tiene dos condiciones —que se jugaran al menos tantas cartas como jugadores, y que quien pidió la cuenta lo quiera— y el marcador **no ve la mesa**, así que las dos las confirma el usuario.

Eran dos casillas, y la segunda estaba deshabilitada hasta marcar la primera: el caso normal costaba dos toques en un orden concreto. Ahora es **una sola casilla, marcada por defecto**. Quien se pone a contar las cartas es porque quiere el aumento, y la mayoría de rondas llegan al mínimo.

El precio de ese defecto es que el marcador asume algo que no ha visto, así que se dice en el subtexto: *"Se jugaron N cartas o más y Fulano pasa de 5 a 6. Si no llegaron, desmárcalo"*, con el recuento del sumador como pista cuando lo hay. En el tope de 10 cartas la casilla se deshabilita, y al corregir una ronda pasada manda lo que se guardó, no el defecto.

La regla sigue teniendo sus dos condiciones separadas en `concedeAumento` (`src/dominio/reglas.ts`), que es donde le corresponde estar: lo que se ha juntado es la forma de preguntarlo, no la regla.

### La app nunca se recarga sola

Un service worker nuevo **no toma el control por su cuenta**: se instala, precachea el shell y espera. La app avisa con una tira discreta y solo recarga si el usuario pulsa *Actualizar*. Recargar por sorpresa a alguien que va por la quinta carta de la cuenta es perder el trabajo de la ronda, y en una mesa de bar eso significa discutir cuánto pagaba cada uno.

Tres cosas van con esa regla:

- **Se comprueba activamente**, al volver a primer plano, con un mínimo de 15 minutos entre comprobaciones (`src/pwa/ritmoComprobacion.ts`). Sin esto se depende de cuándo lo mire el navegador por su cuenta, que en una app instalada y nunca cerrada puede ser días.
- **Con un formulario a medias el aviso se calla.** Lo tecleado en "Cerrar ronda" o en "Nueva partida" no está persistido, así que mientras haya algo escrito el aviso no sale; vuelve al confirmar o al salir. Nada se pierde por esperar: el worker nuevo aguanta su turno indefinidamente.
- **La versión se enseña en el inicio.** Es un sha256 del contenido de todo `dist/` y vive dentro del worker, que la contesta por `postMessage`. "¿Qué versión tienes?" es la primera pregunta cuando algo va raro en una terraza.
- **El aviso no tapa nada.** Está fijo abajo, donde también está el pie con la acción primaria, así que se mide y publica su alto en `--alto-aviso`; el pie y el inicio le dejan ese hueco. Y sus dos botones usan colores que no cambian con el tema, porque el aviso es una pizarra oscura en modo claro y en oscuro.

---

## Licencia

Código propietario, todos los derechos reservados: [LICENSE](LICENSE).

Autor: **Arnaldo Alberto Quintero Segura**. Explotación comercial prevista: **Shiroo Innovation Group S.L.**, sociedad en constitución. Mientras no esté inscrita no tiene personalidad jurídica ni CIF, así que el copyright figura a nombre del autor como persona física y el aviso queda pendiente de actualizar cuando la sociedad exista.

El repositorio es público para que el código pueda leerse, pero no es software libre. Los componentes de terceros mantienen sus propias licencias —React y Vitest MIT, Dexie y TypeScript Apache-2.0, las tres tipografías SIL OFL 1.1— y los avisos completos están en [TERCEROS.md](TERCEROS.md).

**La Cuenta** es un juego de 2Tomatoes Games. Esta app es una herramienta no oficial de aficionado, sin relación con la editorial, y no incluye arte ni reglamento del juego.

---

## Privacidad

Los únicos datos personales son nombres de pila tecleados a mano. Todo vive en IndexedDB, en el dispositivo, y **no sale de ahí jamás**: cero peticiones salientes, cero telemetría, cero terceros.

No es solo una promesa del código. El propio HTML lleva una **Content Security Policy** que lo hace cumplir al navegador:

```
default-src 'self'; script-src 'self' 'sha256-…'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'
```

El `script-src` lleva el hash del único script en línea (el que aplica el tema antes del primer pintado, para que no haya fogonazo claro al abrir la app de noche). Lo calcula `plugin-csp.ts` en cada build, así que no se queda obsoleto al editar el HTML. La verificación offline comprueba que no haya violaciones de CSP en consola.

Los nombres se sanean antes de renderizar y los importes se validan como enteros no negativos. La entrada es local, pero eso no la hace de fiar.

---

## Estilo visual

Réplica de la identidad de la caja y el reglamento: fondo naranja con textura de papel, cartuchos redondeados naranjas con texto crema en mayúsculas para los títulos, cifras grandes con numerales tabulares.

- **El ticket** es un ticket: monoespaciada, columnas alineadas con puntos suspensivos y bordes dentados.
- **La pizarra negra** se usa con el mismo código semántico que el juego. En La Cuenta, las cartas que solo se juegan *después* de pedir la cuenta (Propina, A medias, A pachas) son negras sobre pizarra; en la app, esos controles van sobre fondo pizarra.
- **El modo oscuro** no oscurece la paleta cálida: se construye sobre esa misma pizarra. Sigue la preferencia del sistema y hay interruptor manual en el marcador. **El ticket sigue siendo papel crema** en oscuro: es el objeto físico de la mesa y no se invierte.

Tipografías, todas SIL OFL y servidas desde el bundle:

| Uso | Familia | Peso |
|---|---|---|
| Titulares | Alfa Slab One | 84 kB en total, subset latino |
| Texto y cifras | Source Sans 3 (variable) | |
| Ticket | Courier Prime | |

Sin emojis en la interfaz. Los iconos son SVG dibujados a mano en el propio código.

---

## Qué queda por hacer

En [PENDIENTES.md](PENDIENTES.md), ordenado de "se puede hacer ya" a "hay que decidir antes": tocar una ficha para doblarla, dudas frecuentes dentro de la app, invitación a instalar en Android e iOS, créditos, el manual del juego, el reconocimiento de cartas por foto y el asunto de la publicidad, que choca de frente con los no-negociables y necesita una decisión consciente. Las actualizaciones del PWA ya están hechas; queda anotado allí un fleco de maquetación del aviso.

---

## Decisiones que quedaron abiertas

1. **De dónde sale un importe negativo.** Las reglas lo contemplan pero no explican el caso. Se cubre con un `max(0, …)` defensivo: si la cuenta sale negativa, no paga nadie.

2. **Qué pasa si la cuenta supera los ahorros del pagador.** Se asume clamp a 0 (ver arriba). Es la asunción con más peso de todo el marcador y está aislada para poder cambiarla.

3. **A pachas sin el pagador.** Nada impide desmarcar a quien pidió la cuenta. Se deja pasar a propósito, porque la app no conoce los estados de mesa y el usuario puede tener un motivo.

4. **Nombres repetidos.** Se rechazan al crear la partida, comparando sin distinguir mayúsculas. Dos Javieres en la mesa tienen que distinguirse.

### Ya cerradas

- **Rondas posteriores al fin de partida.** Estuvieron un tiempo aplicándose. Ahora la derivación para en seco al llegar el fin y las rondas de después quedan anuladas pero visibles, no borradas. Ver "La partida se para en seco al llegar el fin".

- **Botón físico de atrás.** La navegación arrancó siendo estado interno sin historial, así que en Android el atrás cerraba la app. Ahora hay una pila sincronizada con la History API y funciona; sigue sin haber URLs, que no hacían falta.

- **Qué hacer si llega una actualización con el formulario a medias.** Había tres salidas: callar el aviso, avisar de lo que se va a perder o persistir el borrador. Se eligió callarlo, que es la más simple y no obliga a explicar nada al usuario. Ver "La app nunca se recarga sola".

---

## Fuera de alcance, a propósito

Catálogo de cartas, precios de tapas, tabla del vino, estado de la mesa (pilas, bloqueos, baño, cumpleaños), turnos, backend, cuentas, sincronización, multijugador en red, telemetría.
