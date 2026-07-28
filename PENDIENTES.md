# Pendientes

Lo que está por hacer, con lo que cuesta cada cosa y lo que hay que decidir antes de tocar código. Ordenado de "se puede hacer ya" a "hay que decidir primero".

Los no-negociables del proyecto están en el [README](README.md): offline-first, cero peticiones salientes, cero terceros, todo en el dispositivo. Dos de los puntos de abajo chocan con eso y van marcados.

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

## 3. Créditos

**Aplazado a propósito. Queda anotado aquí y no se toca por ahora.**

Cuando se retome, esto es lo que debería llevar:

- Autoría de la app. **Hace falta decidir cómo quieres aparecer**: nombre, alias, enlace a GitHub o a donde sea.
- Crédito del juego, que ya está en el README: **La Cuenta**, de 2Tomatoes Games, diseñado por Litus Carreras y Ariadna Altimira.
- Una línea dejando claro que **esto es una herramienta no oficial de aficionado**, sin relación con la editorial. Es lo honesto y evita malentendidos si la app circula.
- Licencias de las tipografías, las tres SIL OFL 1.1 (Alfa Slab One, Source Sans 3, Courier Prime).

Sitio natural: al final de la pantalla de inicio o en una pantalla de "Acerca de" junto a las dudas frecuentes.

La licencia del repositorio iba en este punto, pero se sale a su propio apartado más abajo: no es una cuestión de créditos y tiene efecto ya.

---

## 4. El manual del juego dentro de la app

**Hay que decidir qué texto, y hay un asunto de derechos.**

La idea es poder consultar las reglas sin buscar el papel. Encaja bien: es texto, funciona offline y no necesita nada de red.

Lo que hay que resolver antes:

- **El reglamento es material con derechos de 2Tomatoes Games.** Copiarlo entero en la app y publicarla no es lo mismo que tenerlo en tu móvil. Tres salidas: pedir permiso a la editorial, escribir un resumen propio de las reglas con nuestras palabras, o enlazar al PDF oficial (esto último rompe el offline, que es justo lo que se quería evitar).
- **Alcance.** El marcador declara explícitamente que no modela cartas, tapas ni precios. Un manual completo con el catálogo de cartas metería por la puerta de atrás justo lo que se dejó fuera a propósito. Conviene decidir si es "las reglas que afectan al dinero" (compatible, y ya está medio escrito en el README) o "el reglamento entero" (otra cosa).
- **Peso.** Solo texto no se nota. Con las ilustraciones del manual, sí: habría que tratarlo como descarga opcional, igual que se planteó para el reconocimiento de fotos.

Mi recomendación: empezar por un **resumen propio de las reglas que el marcador usa**, escrito con nuestras palabras. Resuelve el 90 % de las consultas de mesa, no tiene problema de derechos y se solapa con las dudas frecuentes del punto 2.

---

## 5. Publicidad

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

## 6. Licencia del repositorio

**Pequeño, pero tiene efecto desde hoy.**

El repositorio es público y está desplegado, y **no lleva ninguna licencia**. Sin archivo de licencia lo que aplica por defecto es "todos los derechos reservados": legalmente nadie puede usarlo, copiarlo ni contribuir, aunque el código esté a la vista.

Si la intención es **código propietario**, sin licencia ya se consigue en términos de copyright: por defecto son todos los derechos reservados. Lo único que conviene añadir es un aviso explícito, porque en GitHub la ausencia de archivo de licencia se lee muy a menudo como "esto se puede usar".

Ojo con una cosa antes de pensar en poner el repositorio en privado: **GitHub Pages en plan gratuito exige que el repositorio sea público.** Ponerlo privado tumba el despliegue actual salvo que se pase a un plan de pago.

### Avisos de terceros: esto no es opcional

Independientemente de la licencia que se elija para el código propio, las dependencias traen las suyas y **hay que cumplirlas también en una app propietaria**:

- **React** — MIT. Obliga a conservar el aviso de copyright y el texto de la licencia.
- **Dexie** — Apache-2.0. Igual, más su propio aviso.
- **Alfa Slab One, Source Sans 3, Courier Prime** — SIL OFL 1.1. La licencia tiene que acompañar a los archivos de fuente, y la OFL además restringe el uso de los Reserved Font Names en versiones modificadas.

Falta por tanto un archivo de avisos de terceros (`TERCEROS.md` o equivalente) con esos textos. Es lo único de este apartado que es una obligación y no una elección.

Y una que no cubre ninguna licencia: ser propietario del código no da ningún derecho sobre **La Cuenta** como juego. Ahí lo que importa es la línea de "herramienta no oficial" del punto de créditos, no la licencia.

Lo de elegir licencia no lo decido yo porque no me corresponde.

---

## Sin decidir, de antes

Vienen del encargo original y siguen abiertas. Están explicadas en el [README](README.md).

- **Reconocimiento de cartas por foto.** A la espera de fotos reales de una mesa para poder decir si el OCR en el dispositivo es viable. El motor pesaría unos 5,7 MB y se plantea como descarga opcional para no engordar la app base.
- **¿La propina puede ser negativa?** Ahora se valida como no negativa, asumiendo que siempre es el precio de una tapa. Si en el juego hay algún caso en que reste, es un cambio de una línea.
- **A pachas sin el pagador.** Nada impide desmarcar a quien pidió la cuenta. Se deja pasar a propósito.
