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
npm test             # los 114 tests del dominio y la persistencia
npm run test:watch
npm run typecheck    # app y service worker, cada uno con su tsconfig
```

Los tests del dominio corren en entorno `node` y no renderizan nada. Los de persistencia usan `fake-indexeddb`.

### Verificación offline real

```bash
npm run verificar:offline
```

Levanta un servidor estático con `dist/`, abre Chromium, instala el service worker, juega una partida, **corta la red del navegador**, recarga y comprueba que todo siga en pie. También vigila que no salga ni una petición fuera del origen.

Las catorce comprobaciones que hace:

| Comprobación | Qué verifica |
|---|---|
| El service worker toma el control | Registro correcto |
| Precache poblado | Los 14 recursos del shell |
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

El trabajo se hace en ramas y entra por pull request; `main` es lo que hay publicado. El workflow (`.github/workflows/desplegar.yml`) corre tests, auditoría de dependencias, build y **la verificación offline completa con Chromium** en cualquier rama y en cada PR, pero solo publica desde `main`. La rama de publicación está fijada por nombre y no a "la rama por defecto": lo que sale a internet no debería cambiar porque alguien toque un ajuste del repositorio. La verificación se ejecuta con `--subruta`, porque Pages sirve el proyecto en `/LaCuenta-Scoreboard/` y no en la raíz del dominio: es exactamente lo que se despliega lo que se comprueba.

**Activación, una sola vez:** en *Ajustes → Pages → Build and deployment → Source*, elegir **GitHub Actions**. Crear el sitio de Pages es administración del repositorio, y el `GITHUB_TOKEN` de Actions no puede hacerlo por mucho `pages: write` que se le dé. A partir de ahí no hay que volver a tocar nada: cada push despliega solo.

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

Así que el service worker está escrito a mano (`src/sw/sw.ts`, ~100 líneas) más un plugin de build de ~60 (`plugin-sw.ts`). Para una app que precachea su shell entero y no habla con ningún servidor, Workbox no aportaba nada que compensara ocho CVEs.

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
├─ pwa/             registro del service worker y aviso de actualización
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

### El clamp a 0 vive solo en un archivo

Las reglas oficiales dicen que la partida acaba cuando a alguien "se le acaban los ahorros", pero no aclaran qué pasa si la cuenta supera lo que ese jugador tiene. Aquí se asume **clamp a 0, sin deuda negativa**, y eso dispara el fin de partida.

Esa decisión está aislada en `src/dominio/aplicarPago.ts`, en una función de una línea. Si algún día se decide otra cosa —deuda negativa, o que el resto cubra la diferencia— se cambia ahí y ni el reparto, ni la derivación de estado, ni la detección de fin de partida se enteran.

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

## Decisiones que quedaron abiertas

1. **De dónde sale un importe negativo.** Las reglas lo contemplan pero no explican el caso. Se cubre con un `max(0, …)` defensivo: si la cuenta sale negativa, no paga nadie.

2. **Qué pasa si la cuenta supera los ahorros del pagador.** Se asume clamp a 0 (ver arriba). Es la asunción con más peso de todo el marcador y está aislada para poder cambiarla.

3. **A pachas sin el pagador.** Nada impide desmarcar a quien pidió la cuenta. Se deja pasar a propósito, porque la app no conoce los estados de mesa y el usuario puede tener un motivo.

4. **Nombres repetidos.** Se rechazan al crear la partida, comparando sin distinguir mayúsculas. Dos Javieres en la mesa tienen que distinguirse.

### Ya cerradas

- **Rondas posteriores al fin de partida.** Estuvieron un tiempo aplicándose. Ahora la derivación para en seco al llegar el fin y las rondas de después quedan anuladas pero visibles, no borradas. Ver "La partida se para en seco al llegar el fin".

- **Botón físico de atrás.** La navegación arrancó siendo estado interno sin historial, así que en Android el atrás cerraba la app. Ahora hay una pila sincronizada con la History API y funciona; sigue sin haber URLs, que no hacían falta.

---

## Fuera de alcance, a propósito

Catálogo de cartas, precios de tapas, tabla del vino, estado de la mesa (pilas, bloqueos, baño, cumpleaños), turnos, backend, cuentas, sincronización, multijugador en red, telemetría.
