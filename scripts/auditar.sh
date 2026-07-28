#!/usr/bin/env bash
#
# Auditoría de dependencias, a prueba de un registro que no contesta.
#
# `npm audit` sale con código 1 por dos motivos muy distintos: porque ha
# encontrado vulnerabilidades, o porque no ha conseguido auditar nada. El
# primero tiene que bloquear el despliegue. El segundo no es una noticia
# tranquilizadora —un audit que no se puede ejecutar NO es un audit limpio—
# pero sí merece un reintento antes de dar la rama por mala.
#
# El endpoint que usa npm (/-/npm/v1/security/audits/quick) está en retirada y
# devuelve 400 "Invalid package tree" de forma intermitente. El 28/07/2026, en
# el mismo job y con el mismo árbol, la auditoría que hace `npm ci` por dentro
# terminó en "found 0 vulnerabilities" y este paso falló con 400 medio segundo
# después. De ahí los reintentos.
#
# Lo que este script NO hace: convertir el fallo en un aviso. Si tras los
# reintentos seguimos sin poder auditar, sale con error. Preferimos un
# despliegue detenido a uno publicado sin haber mirado los CVE.

set -uo pipefail

readonly INTENTOS=3
espera=5

for intento in $(seq 1 "$INTENTOS"); do
  if salida=$(npm audit --audit-level=high 2>&1); then
    echo "$salida"
    exit 0
  fi

  echo "$salida"

  # Distinguir los dos motivos de salida. Si npm ha llegado a hablar con el
  # registro, el veredicto es real y no se reintenta: hay vulnerabilidades.
  if ! grep -q 'audit endpoint returned an error' <<<"$salida"; then
    echo
    echo "Vulnerabilidades de nivel high o superior. El despliegue se queda aquí."
    exit 1
  fi

  echo
  echo "Intento $intento de $INTENTOS: el registro no ha podido auditar el árbol."

  if [ "$intento" -lt "$INTENTOS" ]; then
    echo "Reintentando en ${espera}s."
    sleep "$espera"
    espera=$((espera * 2))
  fi
done

echo
echo "No se ha podido auditar en $INTENTOS intentos."
echo "Un audit que no se puede ejecutar no cuenta como limpio: esto falla a propósito."
exit 1
