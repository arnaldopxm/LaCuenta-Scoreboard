#!/usr/bin/env python3
"""Mide la precision real de Tesseract leyendo los precios de las fotos.

    python3 ocr.py /ruta/a/las/fotos

Requiere el binario `tesseract` (5.x). Es el mismo motor que compila
tesseract.js, asi que el resultado se traslada a lo que correria en el movil.

La caja del precio se da hecha desde precios.json. Eso es deliberado: mide el
TECHO del reconocimiento, suponiendo una deteccion de carta perfecta que hoy no
existe. Lo que salga aqui es el mejor caso, no el caso realista.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image
import numpy as np

from medir import abrir, alto_glifo, cargar_marcas, gris, otsu

EURO = "€"
PSMS = (7, 8)
ANGULOS = (0, -3, 3, -6, 6)


def preparar(im, caja, alto_objetivo=48):
    """Gris -> binarizado Otsu -> reescalado a la altura que prefiere el motor
    -> margen blanco. Es el preproceso que haria la app."""
    g = gris(im.crop(caja))
    alto = alto_glifo(g)
    a = np.asarray(im.crop(caja).convert("L")).astype(np.uint8)
    a = np.where(a < otsu(a), 0, 255).astype(np.uint8)
    z = Image.fromarray(a)
    if alto > 0:
        k = alto_objetivo / float(alto)
        z = z.resize((max(8, int(z.width * k)), max(8, int(z.height * k))), Image.LANCZOS)
    borde = max(20, z.height // 2)
    lienzo = Image.new("L", (z.width + 2 * borde, z.height + 2 * borde), 255)
    lienzo.paste(z, (borde, borde))
    return lienzo


def tesseract(im, psm):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "x.png")
        im.save(p)
        r = subprocess.run(
            ["tesseract", p, "stdout", "--psm", str(psm),
             "-c", "tessedit_char_whitelist=0123456789/-" + EURO],
            capture_output=True, text=True)
        return re.sub(r"\s+", "", r.stdout).replace(EURO, "")


def leer(im, caja, alto_objetivo=48):
    """Tuberia fija, sin mirar la respuesta: primera lectura no vacia."""
    base = preparar(im, caja, alto_objetivo)
    for a in ANGULOS:
        g = base if a == 0 else base.rotate(a, resample=Image.BICUBIC,
                                            expand=True, fillcolor=255)
        for p in PSMS:
            t = tesseract(g, p)
            if t:
                return t
    return ""


def interpretar(t, vocabulario):
    """El fallo dominante es que el simbolo del euro se lee como digito y se
    pega al precio (20 EUR -> '206'). Nos quedamos con el prefijo numerico y lo
    encajamos al vocabulario cerrado del juego."""
    m = re.match(r"^(-?\d{1,3})", t or "")
    if not m:
        return None
    v = m.group(1)
    if v in vocabulario:
        return v
    if len(v) > 1 and v[:-1] in vocabulario:
        return v[:-1]
    return None


def main(carpeta):
    marcas = cargar_marcas()
    vocab = set(marcas["vocabulario"])
    casos = [(n, m) for n, lista in marcas["fotos"].items()
             for m in lista if m["valor"] != "multiple"]
    multiples = [(n, m) for n, lista in marcas["fotos"].items()
                 for m in lista if m["valor"] == "multiple"]

    print("=== Precision leyendo el precio (caja dada, resolucion nativa) ===")
    print(f"{'foto':<10} {'carta':<22} {'real':>5} {'tesseract':>11} {'interpretado':>13}  ok")
    ok = 0
    fallos = []
    for nombre, m in casos:
        im = abrir(carpeta, nombre)
        t = leer(im, tuple(m["caja"]))
        v = interpretar(t, vocab)
        bien = (v == m["valor"])
        ok += bien
        if not bien:
            fallos.append((nombre, m, v))
        print(f"{nombre[4:8]:<10} {m['carta']:<22} {m['valor']:>5} "
              f"{t or 'vacio':>11} {str(v):>13}  {'si' if bien else 'NO'}")

    p = ok / len(casos)
    print(f"\n-> {ok}/{len(casos)} = {100 * p:.0f}% por carta")
    for n in (5, 8, 12):
        print(f"   ronda de {n:>2} cartas correcta entera: {100 * p ** n:5.1f}%")

    if fallos:
        print("\n=== Los fallos, por tipo ===")
        for nombre, m, v in fallos:
            signo = m["valor"].startswith("-") != str(v).startswith("-")
            print(f"  {nombre[4:8]} {m['carta']:<22} real {m['valor']:>4}, leido {str(v):>4}"
                  + ("   <-- CAMBIO DE SIGNO" if signo else "   (cifra equivocada)"))

    print("\n=== Suelo de resolucion: precision segun la altura del glifo ===")
    objetivos = [72, 56, 44, 34, 26, 20, 16, 12]
    print(f"{'carta':<24} " + " ".join(f"{o:>4}px" for o in objetivos))
    tot = {o: 0 for o in objetivos}
    for nombre, m in casos:
        im = abrir(carpeta, nombre)
        fila = []
        for o in objetivos:
            v = interpretar(leer(im, tuple(m["caja"]), alto_objetivo=o), vocab)
            tot[o] += (v == m["valor"])
            fila.append("si" if v == m["valor"] else "NO")
        print(f"{m['carta'][:23]:<24} " + " ".join(f"{c:>4}  " for c in fila))
    print("total".ljust(24) + " " + " ".join(f"{tot[o]:>3}/{len(casos)}" for o in objetivos))

    if multiples:
        print("\n=== Cartas de precio multiple (vino) ===")
        for nombre, m in multiples:
            im = abrir(carpeta, nombre)
            g = gris(im.crop(tuple(m["caja"])))
            salidas = []
            for psm in (6, 4, 11):
                base = preparar(im, tuple(m["caja"]))
                salidas.append(f"psm{psm}={tesseract(base, psm)!r}")
            print(f"  {m['carta']:<14} alto={alto_glifo(g)}px  " + "  ".join(salidas))
        print("  esperado: 30/60 120/180 240")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
