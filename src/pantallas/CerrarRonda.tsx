import { useMemo, useState } from 'react'
import { Boton } from '../componentes/Boton.tsx'
import { Casilla, CampoNumero, GrupoOpciones, SelectorJugador } from '../componentes/Controles.tsx'
import { Pantalla } from '../componentes/Pantalla.tsx'
import { Pizarra } from '../componentes/Pizarra.tsx'
import { Sumador } from '../componentes/Sumador.tsx'
import { LineaTicket, SeparadorTicket, Ticket } from '../componentes/Ticket.tsx'
import {
  LIMITE_MANO_MAX,
  concedeAumento,
  cuentaDeCartas,
  derivar,
  estadosDePartida,
  limiteMano,
  parsearImporte,
  parsearImporteConSigno,
  previsualizarRonda,
  puedeAumentar,
  sumarCartas,
  validarBorrador,
  type BorradorRonda,
  type CartaSumada,
  type Partida,
  type Reparto,
  type Ronda,
  type TipoReparto,
} from '../dominio/index.ts'
import { useSinInterrupciones } from '../pwa/useSinInterrupciones.ts'
import estilos from './CerrarRonda.module.css'

interface Props {
  partida: Partida
  /** Si viene, se está corrigiendo una ronda pasada en vez de cerrando una nueva. */
  rondaEditada?: Ronda
  onAtras: () => void
  onConfirmar: (borrador: BorradorRonda) => void
}

const OPCIONES_REPARTO: { valor: TipoReparto; titulo: string; descripcion: string }[] = [
  { valor: 'normal', titulo: 'Normal', descripcion: 'Paga entera quien pidió la cuenta' },
  { valor: 'a-medias', titulo: 'A medias', descripcion: 'Mitad y mitad con quien elija' },
  {
    valor: 'a-pachas',
    titulo: 'A pachas',
    descripcion: 'Entre todos menos baño y cumpleaños',
  },
]

export function CerrarRonda({ partida, rondaEditada, onAtras, onConfirmar }: Props) {
  const editando = rondaEditada !== undefined
  const todosLosIds = partida.jugadores.map((j) => j.id)

  const [pagadorId, setPagadorId] = useState<string | null>(rondaEditada?.pagadorId ?? null)
  const [total, setTotal] = useState(rondaEditada ? String(rondaEditada.totalCartas) : '')
  const [propina, setPropina] = useState(
    rondaEditada && rondaEditada.propina > 0 ? String(rondaEditada.propina) : '',
  )
  const [tipo, setTipo] = useState<TipoReparto>(rondaEditada?.reparto.tipo ?? 'normal')
  const [coPagadorId, setCoPagadorId] = useState<string | null>(
    rondaEditada?.reparto.tipo === 'a-medias' ? rondaEditada.reparto.coPagadorId : null,
  )
  const [participantes, setParticipantes] = useState<string[]>(
    rondaEditada?.reparto.tipo === 'a-pachas' ? rondaEditada.reparto.participantesIds : todosLosIds,
  )
  /**
   * Desglose del sumador de cartas. Es un borrador auxiliar: la cifra que
   * manda siempre es la del campo. Si se teclea el total a mano, el desglose
   * deja de corresponderse y se descarta, para no enseñar dos verdades.
   */
  const [cartasSumadas, setCartasSumadas] = useState<CartaSumada[]>([])

  /**
   * Una sola casilla para el aumento de mano, marcada por defecto.
   *
   * Eran dos —"se jugaron al menos N cartas" y "+1 al límite de mano"— y en la
   * mesa se marcaban siempre juntas: quien se pone a contar las cartas es porque
   * quiere el aumento. Además la segunda estaba deshabilitada hasta marcar la
   * primera, así que el caso normal costaba dos toques en un orden concreto.
   *
   * Marcada por defecto porque la mayoría de rondas llegan al mínimo. El
   * marcador sigue sin ver la mesa: si no llegaron, se desmarca. Al corregir una
   * ronda pasada manda lo que se guardó, no el defecto.
   */
  const [subeLaMano, setSubeLaMano] = useState(rondaEditada?.aumentoMano ?? true)

  /*
   * Firma de todo lo que hay en el formulario, para saber si está a medias.
   * Comparada con la de la primera pintada distingue "recién abierto" —al
   * corregir, los campos vienen rellenos y no hay nada que perder— de "el
   * usuario ha tecleado algo". Mientras difieran, el aviso de actualización se
   * calla: aceptarlo recarga la página y esto no está persistido.
   */
  const firma = JSON.stringify([
    pagadorId,
    total,
    propina,
    tipo,
    coPagadorId,
    participantes,
    cartasSumadas,
    subeLaMano,
  ])
  const [firmaAlAbrir] = useState(firma)
  useSinInterrupciones(firma !== firmaAlAbrir)

  /**
   * Al corregir una ronda pasada, la previsualización enseña cómo queda la mesa
   * justo DESPUÉS de esa ronda: las posteriores se recalculan solas al guardar.
   */
  const contexto: Partida = useMemo(
    () =>
      rondaEditada
        ? { ...partida, rondas: partida.rondas.slice(0, rondaEditada.indice) }
        : partida,
    [partida, rondaEditada],
  )

  const estadosPrevios = useMemo(() => estadosDePartida(contexto), [contexto])
  const aumentosDelPagador =
    estadosPrevios.find((e) => e.jugadorId === pagadorId)?.aumentos ?? 0
  const enTopeDeMano = !puedeAumentar(aumentosDelPagador)

  const reparto = construirReparto(tipo, coPagadorId, participantes)
  const borrador: BorradorRonda | null =
    pagadorId && reparto
      ? {
          pagadorId,
          totalCartas: parsearImporteConSigno(total) ?? 0,
          propina: parsearImporte(propina) ?? 0,
          reparto,
          aumentoMano: concedeAumento({
            // La casilla confirma las dos condiciones de un tirón: que se
            // jugaron cartas suficientes y que se quiere el +1. La regla sigue
            // teniéndolas separadas, que es donde le corresponde estar.
            minimoCartasConfirmado: subeLaMano,
            solicitado: subeLaMano,
            aumentosActuales: aumentosDelPagador,
          }),
        }
      : null

  const errores = borrador ? validarBorrador(partida, borrador) : ['Falta elegir quién pagó.']
  // Un '-' a secas no es un importe: se exige que el total parsee de verdad.
  const listo =
    borrador !== null && errores.length === 0 && parsearImporteConSigno(total) !== null

  const vista = useMemo(() => {
    if (!borrador || !listo) return null
    const rondaBorrador: Ronda = {
      id: 'previsualizacion',
      indice: contexto.rondas.length,
      ...borrador,
    }
    return previsualizarRonda(contexto, rondaBorrador)
  }, [borrador, contexto, listo])

  /**
   * Rondas que quedarían por detrás del fin de partida si se guarda esta
   * corrección. Es la consecuencia menos obvia de editar el pasado, así que se
   * avisa antes y no después.
   */
  const rondasQueDejarianDeContar = useMemo(() => {
    if (!rondaEditada || !borrador || !listo) return 0
    const rondasCorregidas = partida.rondas.map((r) =>
      r.id === rondaEditada.id ? { ...r, ...borrador } : r,
    )
    return derivar(partida.jugadores, rondasCorregidas).rondasIgnoradas.length
  }, [borrador, listo, partida, rondaEditada])

  function cambiarSumadas(siguientes: CartaSumada[]) {
    setCartasSumadas(siguientes)
    setTotal(siguientes.length === 0 ? '' : String(sumarCartas(siguientes)))
  }

  function cambiarTotalAMano(texto: string) {
    setTotal(texto)
    if (cartasSumadas.length > 0) setCartasSumadas([])
  }

  function cambiarTipo(nuevo: TipoReparto) {
    setTipo(nuevo)
    // A pachas empieza con todo el mundo marcado; se desmarca a quien no toque.
    if (nuevo === 'a-pachas') setParticipantes(todosLosIds)
  }

  function alternarParticipante(id: string) {
    setParticipantes((actuales) =>
      actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id],
    )
  }

  const nombreDe = (id: string) =>
    partida.jugadores.find((j) => j.id === id)?.nombre ?? 'Alguien'

  return (
    <Pantalla
      titulo={editando ? `Corregir ronda ${rondaEditada.indice + 1}` : 'Cerrar ronda'}
      onAtras={onAtras}
      pie={
        <>
          {listo ? null : (
            <p className={estilos.aviso}>
              {parsearImporteConSigno(total) === null
                ? 'Falta el total de las cartas.'
                : errores[0]}
            </p>
          )}
          <Boton
            variante="primario"
            bloque
            disabled={!listo}
            onClick={() => borrador && onConfirmar(borrador)}
          >
            {editando ? 'Guardar cambios' : 'Confirmar ronda'}
          </Boton>
        </>
      }
    >
      <section className={estilos.bloque}>
        <h2 className={estilos.subtitulo}>¿Quién pidió la cuenta?</h2>
        <SelectorJugador
          etiqueta="Quién pidió la cuenta"
          jugadores={partida.jugadores}
          elegidoId={pagadorId}
          onElegir={(id) => {
            setPagadorId(id)
            if (coPagadorId === id) setCoPagadorId(null)
          }}
        />
      </section>

      <section className={estilos.bloque}>
        <CampoNumero
          etiqueta="Total de las cartas"
          valor={total}
          onCambio={cambiarTotalAMano}
          ayuda="Lo que suman los platos y bebidas de la mesa. Puede salir negativo: los platos quemados restan."
          permiteSigno
        />
        <Sumador cartas={cartasSumadas} onCambio={cambiarSumadas} />
      </section>

      {/*
        Bloque pizarra: en el juego, las cartas que solo se juegan después de
        pedir la cuenta (Propina, A medias, A pachas) son negras sobre pizarra.
      */}
      <Pizarra titulo="Después de pedir la cuenta">
        <div className={estilos.pizarraContenido}>
          <CampoNumero
            etiqueta="Propina"
            valor={propina}
            onCambio={setPropina}
            ayuda="Precio de la tapa más barata en mesa. Déjalo vacío si no se jugó Propina."
            enPizarra
          />

          <div>
            <h3 className={estilos.subtituloPizarra}>Cómo se reparte</h3>
            <GrupoOpciones
              etiqueta="Modo de reparto"
              opciones={OPCIONES_REPARTO}
              elegida={tipo}
              onElegir={cambiarTipo}
            />
          </div>

          {tipo === 'a-medias' ? (
            <div>
              <h3 className={estilos.subtituloPizarra}>¿Con quién va a medias?</h3>
              <SelectorJugador
                etiqueta="Co-pagador"
                jugadores={partida.jugadores}
                elegidoId={coPagadorId}
                onElegir={setCoPagadorId}
                excluirIds={pagadorId ? [pagadorId] : []}
                enPizarra
              />
            </div>
          ) : null}

          {tipo === 'a-pachas' ? (
            <div>
              <h3 className={estilos.subtituloPizarra}>¿Entre quiénes?</h3>
              <p className={estilos.pistaPizarra}>
                Desmarca a quien esté en el baño o sea su cumpleaños.
              </p>
              <div className={estilos.casillas}>
                {partida.jugadores.map((jugador) => (
                  <Casilla
                    key={jugador.id}
                    marcada={participantes.includes(jugador.id)}
                    onCambio={() => alternarParticipante(jugador.id)}
                    enPizarra
                  >
                    {jugador.nombre}
                  </Casilla>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Pizarra>

      <section className={estilos.bloque}>
        <h2 className={estilos.subtitulo}>Aumento de mano</h2>
        <div className={estilos.casillas}>
          <Casilla
            marcada={subeLaMano && !enTopeDeMano}
            onCambio={setSubeLaMano}
            // En el tope de 10 cartas no hay nada que marcar. Sin pagador
            // elegido sí se puede desmarcar: la ronda es la misma, y el pagador
            // solo dice quién recibe el aumento.
            disabled={enTopeDeMano}
            subtexto={motivoDelAumento({
              marcada: subeLaMano,
              enTopeDeMano,
              nombre: pagadorId ? nombreDe(pagadorId) : null,
              limiteActual: limiteMano(aumentosDelPagador),
              minimoCartas: partida.jugadores.length,
              // Pista, no decisión: la app no ve la mesa, así que las cartas las
              // sigue confirmando quien está jugando.
              cartasEnSumador: cartasSumadas.length > 0 ? cuentaDeCartas(cartasSumadas) : null,
            })}
          >
            +1 al límite de mano
          </Casilla>
        </div>
      </section>

      {vista ? (
        <Ticket
          titulo="Previsualización"
          nota={
            !editando
              ? 'Revisa antes de confirmar'
              : rondasQueDejarianDeContar > 0
                ? 'La partida acabaría aquí y las rondas de después no se habrían jugado'
                : 'Al guardar se recalculan también las rondas posteriores'
          }
        >
          <LineaTicket concepto="Cartas" importe={`${parsearImporteConSigno(total) ?? 0} €`} />
          {(parsearImporte(propina) ?? 0) > 0 ? (
            <LineaTicket concepto="Propina" importe={`${parsearImporte(propina)} €`} />
          ) : null}
          <LineaTicket concepto="TOTAL CUENTA" importe={`${vista.cuenta} €`} destacada />

          <SeparadorTicket />

          {vista.pagos.length === 0 ? (
            <LineaTicket concepto="No paga nadie" importe="0 €" tenue />
          ) : (
            vista.pagos.map((pago) => (
              <LineaTicket
                key={pago.jugadorId}
                concepto={`Paga ${nombreDe(pago.jugadorId)}`}
                importe={`${pago.importe} €`}
              />
            ))
          )}

          {vista.pagos.length > 1 ? (
            <LineaTicket
              concepto="Suma repartida"
              importe={`${vista.pagos.reduce((t, p) => t + p.importe, 0)} €`}
              tenue
            />
          ) : null}

          <SeparadorTicket />

          {vista.estadosResultantes.map((estado) => {
            const antes = estadosPrevios.find((e) => e.jugadorId === estado.jugadorId)
            const cambia = antes && antes.ahorros !== estado.ahorros
            return (
              <LineaTicket
                key={estado.jugadorId}
                concepto={estado.nombre}
                importe={`${estado.ahorros} €`}
                destacada={Boolean(cambia)}
                tenue={!cambia}
              />
            )
          })}

          {vista.receptorAumentoId ? (
            <>
              <SeparadorTicket />
              <LineaTicket
                concepto={`Mano de ${nombreDe(vista.receptorAumentoId)}`}
                importe={`${
                  vista.estadosResultantes.find((e) => e.jugadorId === vista.receptorAumentoId)
                    ?.limiteMano ?? LIMITE_MANO_MAX
                } cartas`}
              />
            </>
          ) : null}

          {vista.jugadoresArruinadosIds.length > 0 ? (
            <>
              <SeparadorTicket />
              <LineaTicket
                concepto="FIN DE PARTIDA"
                importe={vista.jugadoresArruinadosIds.map(nombreDe).join(', ')}
                destacada
              />
            </>
          ) : null}

          {rondasQueDejarianDeContar > 0 ? (
            <LineaTicket
              concepto="Rondas anuladas"
              importe={String(rondasQueDejarianDeContar)}
              destacada
            />
          ) : null}
        </Ticket>
      ) : null}
    </Pantalla>
  )
}

function construirReparto(
  tipo: TipoReparto,
  coPagadorId: string | null,
  participantes: string[],
): Reparto | null {
  switch (tipo) {
    case 'normal':
      return { tipo: 'normal' }
    case 'a-medias':
      return coPagadorId ? { tipo: 'a-medias', coPagadorId } : null
    case 'a-pachas':
      return { tipo: 'a-pachas', participantesIds: participantes }
  }
}

/**
 * Lo que explica la casilla del aumento. Ahora es una sola, y viene marcada, así
 * que el subtexto tiene que dejar claro qué se está dando por hecho y cómo
 * quitarlo.
 */
function motivoDelAumento(opciones: {
  marcada: boolean
  enTopeDeMano: boolean
  nombre: string | null
  limiteActual: number
  minimoCartas: number
  cartasEnSumador: number | null
}): string {
  const quien = opciones.nombre ?? 'quien pidió la cuenta'

  if (opciones.enTopeDeMano) {
    return `${quien} ya está en el tope de ${LIMITE_MANO_MAX} cartas.`
  }
  if (!opciones.marcada) {
    return `Sin aumento: ${quien} se queda en ${opciones.limiteActual} cartas.`
  }

  const pista =
    opciones.cartasEnSumador === null ? '' : ` En el sumador llevas ${opciones.cartasEnSumador}.`
  return (
    `Se jugaron ${opciones.minimoCartas} cartas o más y ${quien} pasa de ` +
    `${opciones.limiteActual} a ${opciones.limiteActual + 1}. Si no llegaron, desmárcalo.${pista}`
  )
}
