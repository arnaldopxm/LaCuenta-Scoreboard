# Laboratorio: reconocimiento de cartas por foto

Banco de medición para el punto 8 de [PENDIENTES](../../PENDIENTES.md). No es
código de la app: no se compila, no se despliega y no entra en el bundle. Está
aquí para que la decisión se tome con números y para poder repetirla cuando
haya más fotos.

## Las fotos no están en el repositorio

A propósito. El repositorio es público (GitHub Pages en plan gratuito, ver
PENDIENTES §9) y son fotos de una mesa real. Quedarían en el historial de git
para siempre.

Guárdalas donde quieras y pasa la carpeta como argumento. Los scripts esperan
los nombres tal cual salen del móvil (`IMG_7599.jpeg`…), que son las claves de
`precios.json`.

## Cómo se corre

```sh
pip install pillow numpy
apt-get install tesseract-ocr        # solo para ocr.py

python3 medir.py /ruta/a/las/fotos   # tamaño, contraste, nitidez, brillos
python3 ocr.py   /ruta/a/las/fotos   # precisión real de Tesseract
```

## Qué hay

| Archivo | Qué hace |
|---|---|
| `precios.json` | Cajas del precio marcadas **a mano** sobre cada foto, con su valor real |
| `medir.py` | Mide las cuatro cosas que PENDIENTES §8 pedía mirar |
| `ocr.py` | Pasa Tesseract por esas cajas y cuenta aciertos |

## Por qué las cajas van a mano

Para medir el motor de lectura **por separado** de la detección de cartas. Son
dos problemas distintos y solo uno estaba sobre la mesa.

Dar la caja hecha equivale a suponer una detección perfecta, que hoy no existe.
Lo que mide `ocr.py` es por tanto el **techo**: el mejor caso posible. El caso
realista está por debajo, porque además hay que encontrar la carta.

Cuánto por debajo se puede intuir de un intento de localizar el precio
automáticamente (buscar la banda blanca de la esquina, que es donde el precio
vive siempre): en 1 de cada 11 cajas se enganchó a la carta **de al lado**. Con
las cartas en abanico y solapadas, saber a qué carta pertenece un precio no es
un detalle de implementación.

## Cómo añadir fotos nuevas

1. Abre la foto **sin corregir la rotación del EXIF** (es lo que hace
   `medir.abrir`, y las coordenadas están en ese sistema).
2. Anota la caja de cada precio y su valor real en `precios.json`.
3. Vuelve a correr los dos scripts.

Los precios de precio múltiple (vino) se marcan con `"valor": "multiple"` y se
miden aparte: no son un número, son un bloque de cinco.
