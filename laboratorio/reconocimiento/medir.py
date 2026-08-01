#!/usr/bin/env python3
"""Mide sobre fotos reales las cuatro cosas que decidian el punto 8 de PENDIENTES:
tamano del glifo del precio, contraste, nitidez y brillos del plastico.

    python3 medir.py /ruta/a/las/fotos

No estima a ojo: recorta la caja del precio marcada en precios.json y saca
numeros. Ver README.md.
"""
import json
import os
import sys
from collections import deque

from PIL import Image
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))


def cargar_marcas():
    with open(os.path.join(AQUI, "precios.json"), encoding="utf-8") as f:
        return json.load(f)


def abrir(carpeta, nombre):
    """Sin exif_transpose a proposito: las cajas estan en el bitmap crudo."""
    return Image.open(os.path.join(carpeta, nombre))


def gris(im):
    a = np.asarray(im.convert("RGB")).astype(np.float64)
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def otsu(g8):
    hist, _ = np.histogram(g8, bins=256, range=(0, 256))
    total = g8.size
    suma = float(np.dot(np.arange(256), hist))
    sumb = wb = 0.0
    mejor, umbral = -1.0, 0
    for t in range(256):
        wb += hist[t]
        if wb == 0:
            continue
        wf = total - wb
        if wf == 0:
            break
        sumb += t * hist[t]
        entre = wb * wf * ((sumb / wb) - ((suma - sumb) / wf)) ** 2
        if entre > mejor:
            mejor, umbral = entre, t
    return umbral


def componentes(mascara, min_px=80):
    """Etiquetado 4-conexo. Devuelve (alto, ancho, n_pixeles, bbox)."""
    h, w = mascara.shape
    visto = np.zeros((h, w), bool)
    fuera = []
    for y0 in range(h):
        for x0 in range(w):
            if not mascara[y0, x0] or visto[y0, x0]:
                continue
            q = deque([(y0, x0)])
            visto[y0, x0] = True
            xmin = xmax = x0
            ymin = ymax = y0
            n = 0
            while q:
                y, x = q.popleft()
                n += 1
                xmin, xmax = min(xmin, x), max(xmax, x)
                ymin, ymax = min(ymin, y), max(ymax, y)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mascara[ny, nx] and not visto[ny, nx]:
                        visto[ny, nx] = True
                        q.append((ny, nx))
            if n >= min_px:
                fuera.append((ymax - ymin + 1, xmax - xmin + 1, n, (xmin, ymin, xmax, ymax)))
    return fuera


def laplaciano_var(g):
    """Varianza del laplaciano: proxy habitual de nitidez."""
    h, w = g.shape
    if h < 5 or w < 5:
        return 0.0
    out = -4.0 * g[1:h - 1, 1:w - 1]
    out += g[0:h - 2, 1:w - 1] + g[2:h, 1:w - 1]
    out += g[1:h - 1, 0:w - 2] + g[1:h - 1, 2:w]
    return float(out.var())


def alto_glifo(g):
    """Altura mediana de los glifos del precio dentro de la caja."""
    u = otsu(g.astype(np.uint8))
    cs = componentes(g < u)
    h = g.shape[0]
    alt = [c[0] for c in cs
           if 0.25 * h <= c[0] <= 0.98 * h and 0.2 <= c[1] / c[0] <= 1.9]
    if not alt:
        alt = [c[0] for c in cs] or [0]
    return int(np.median(alt))


def medir_caja(im, caja):
    g = gris(im.crop(caja))
    osc, cla = np.percentile(g, 10), np.percentile(g, 90)
    return {
        "alto_px": alto_glifo(g),
        "michelson": float((cla - osc) / (cla + osc + 1e-9)),
        "dif_lum": float(cla - osc),
        "nitidez": laplaciano_var(g),
    }


def main(carpeta):
    marcas = cargar_marcas()
    print(f"{'foto':<14} {'carta':<22} {'valor':>6} {'alto_px':>7} "
          f"{'michelson':>9} {'dif_lum':>7} {'nitidez':>8}")
    filas = []
    for nombre, lista in marcas["fotos"].items():
        ruta = os.path.join(carpeta, nombre)
        if not os.path.exists(ruta):
            print(f"{nombre:<14} (no esta en {carpeta})")
            continue
        im = abrir(carpeta, nombre)
        g_todo = gris(im)
        quemado = float((g_todo > 245).mean() * 100)
        for m in lista:
            r = medir_caja(im, tuple(m["caja"]))
            filas.append(r)
            print(f"{nombre[:-5]:<14} {m['carta']:<22} {m['valor']:>6} "
                  f"{r['alto_px']:>7} {r['michelson']:>9.2f} "
                  f"{r['dif_lum']:>7.0f} {r['nitidez']:>8.0f}")
        print(f"{'':14} {'(pixeles quemados en la foto entera)':<22} {quemado:>6.1f}%")

    if filas:
        alt = sorted(f["alto_px"] for f in filas)
        mic = sorted(f["michelson"] for f in filas)
        print(f"\nalto del glifo: {alt[0]}-{alt[-1]} px (mediana {alt[len(alt)//2]})")
        print(f"contraste Michelson: {mic[0]:.2f}-{mic[-1]:.2f}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
