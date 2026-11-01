import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { EnlacePerfil } from '../../components/EnlacePerfil'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  IconoCargando,
  Paginacion,
  rebanar,
} from '../../components/ui'
import { primeraSeccionHabilitada } from './espacioEquipo'
import { infoFase } from './fase'
import { formatearFecha, formatearFechaHora } from './formato'
import { ErrorActividad } from './actividades.api'
import {
  useActividad,
  useCerrarInscripcionMutation,
  useIniciarCierreMutation,
  useParticipantes,
} from './useActividades'
import type { Actividad } from './tipos'
import styles from './PantallaResumenActividad.module.css'

// Personas por página. La API devuelve la lista completa (todavía sin paginar,
// ver nucleo §3.1); la paginación evita que una actividad numerosa alargue la
// pantalla.
const PARTICIPANTES_POR_PAGINA = 10

const MENSAJE_ERROR_CIERRE_INSCRIPCION_GENERICO =
  'No pudimos cerrar la inscripción. Intenta de nuevo.'
const MENSAJE_ERROR_INICIAR_CIERRE_GENERICO = 'No pudimos iniciar el cierre. Intenta de nuevo.'

interface InfoAccionConfirmable {
  titulo: string
  descripcion: string
  textoBoton: string
  textoConfirmacion: string
  textoBotonConfirmar: string
  textoBotonCargando: string
  mensajeErrorGenerico: string
  mutacion: UseMutationResult<Actividad, unknown, void>
}

// Tarjeta de "botón con confirmación" compartida por las dos acciones de
// avance de fase de esta pantalla (cerrar inscripción, iniciar cierre): el
// mismo patrón de dos pasos (explicación + botón, luego confirmación con
// aviso de error) con textos y mutación distintos.
function AccionConfirmable({
  titulo,
  descripcion,
  textoBoton,
  textoConfirmacion,
  textoBotonConfirmar,
  textoBotonCargando,
  mensajeErrorGenerico,
  mutacion,
}: InfoAccionConfirmable) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <Card className={styles.accion}>
      {!confirmando ? (
        <>
          <div>
            <h2 className={styles.tituloSeccion}>{titulo}</h2>
            <p className={styles.accionTexto}>{descripcion}</p>
          </div>
          <Button onClick={() => setConfirmando(true)} className={styles.accionBoton}>
            {textoBoton}
          </Button>
        </>
      ) : (
        <>
          {mutacion.isError ? (
            <AvisoError
              mensaje={
                mutacion.error instanceof ErrorActividad
                  ? mutacion.error.message
                  : mensajeErrorGenerico
              }
            />
          ) : null}

          <p className={styles.accionTexto}>{textoConfirmacion}</p>

          <div className={styles.accionBotones}>
            <Button onClick={() => mutacion.mutate()} disabled={mutacion.isPending}>
              {mutacion.isPending ? (
                <>
                  <IconoCargando />
                  {textoBotonCargando}
                </>
              ) : (
                textoBotonConfirmar
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmando(false)
                mutacion.reset()
              }}
              disabled={mutacion.isPending}
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

// La fase actual con la acción que la hace avanzar (docs/diseno-desarrollo-nucleo.md
// §7.8): el organizador (o co-organizador con el permiso) ve el botón de la
// transición disponible en la fase actual; quien no tiene el permiso no ve
// nada, porque ni 'cerrar_inscripcion' ni 'iniciar_cierre' están en su
// conjunto de capacidades. La pantalla nunca evalúa rol ni fase por su
// cuenta (§4.3): solo pregunta si la acción está en actividad.capacidades.
// Las dos son mutuamente excluyentes (cada una vive en una fase distinta),
// así que basta con mostrar la primera que aplique.
function AccionDeAvance({ actividad }: { actividad: Actividad }) {
  const cerrarInscripcionMutacion = useCerrarInscripcionMutation(actividad.id)
  const iniciarCierreMutacion = useIniciarCierreMutation(actividad.id)

  if (actividad.capacidades?.includes('cerrar_inscripcion')) {
    return (
      <AccionConfirmable
        titulo="Inscripción abierta"
        descripcion="Ciérrala cuando ya tengas a los participantes que esperabas. La actividad pasará a formación de equipos."
        textoBoton="Cerrar inscripción"
        textoConfirmacion="Una vez cerrada, la clave de ingreso deja de admitir nuevas uniones y no se reactiva. ¿Confirmas que quieres cerrar la inscripción?"
        textoBotonConfirmar="Sí, cerrar inscripción"
        textoBotonCargando="Cerrando…"
        mensajeErrorGenerico={MENSAJE_ERROR_CIERRE_INSCRIPCION_GENERICO}
        mutacion={cerrarInscripcionMutacion}
      />
    )
  }

  if (actividad.capacidades?.includes('iniciar_cierre')) {
    return (
      <AccionConfirmable
        titulo="En desarrollo"
        // "Abre el reconocimiento" es cierto de verdad: ventana() en
        // insignias.service.ts abre con estado === 'cierre' o con
        // fechaTermino, lo que ocurra primero (docs/diseno-desarrollo-insignias.md
        // §1.4) — iniciar el cierre a mano, antes de la fecha, sí adelanta esa
        // apertura.
        descripcion="Inicia el cierre cuando el periodo de trabajo haya terminado. Cierra las aportaciones del equipo y abre el reconocimiento entre compañeros."
        textoBoton="Iniciar cierre"
        textoConfirmacion="Una vez iniciado, el cierre no tiene vuelta atrás. ¿Confirmas que quieres iniciar el periodo de cierre?"
        textoBotonConfirmar="Sí, iniciar cierre"
        textoBotonCargando="Iniciando…"
        mensajeErrorGenerico={MENSAJE_ERROR_INICIAR_CIERRE_GENERICO}
        mutacion={iniciarCierreMutacion}
      />
    )
  }

  return null
}

// Quiénes se han unido hasta ahora (pedido explícito: es lo que informa si
// "ya es momento de cerrar la inscripción"). Solo participantes, no
// organizador ni co-organizadores: ellos no son a quienes se está esperando.
function SeccionParticipantes({ id }: { id: string }) {
  const participantesQuery = useParticipantes(id)
  const [pagina, setPagina] = useState(0)

  return (
    <Card className={styles.seccionCard}>
      <h2 className={styles.tituloSeccion}>
        Participantes
        {participantesQuery.data ? ` (${participantesQuery.data.length})` : ''}
      </h2>

      {participantesQuery.isPending ? (
        <div className={styles.cargandoSeccion} role="status" aria-label="Cargando participantes">
          <IconoCargando size={20} />
        </div>
      ) : participantesQuery.isError ? (
        <AvisoError mensaje="No pudimos cargar los participantes." />
      ) : (
        (() => {
          const participantes = participantesQuery.data
          if (participantes.length === 0) {
            return (
              <p className={styles.texto}>
                Nadie se ha unido todavía. Comparte la clave de ingreso para que empiecen a llegar.
              </p>
            )
          }
          const { visibles, pagina: paginaActual } = rebanar(
            participantes,
            pagina,
            PARTICIPANTES_POR_PAGINA,
          )
          return (
            <>
              <ul className={styles.listaParticipantes}>
                {visibles.map((participante) => (
                  <li key={participante.idUsuario} className={styles.filaParticipante}>
                    <span className={styles.nombreParticipante}>
                      <EnlacePerfil idUsuario={participante.idUsuario}>
                        {participante.nombre}
                      </EnlacePerfil>
                    </span>
                    <span className={styles.fechaParticipante}>
                      Se unió el {formatearFechaHora(participante.fechaUnion)}
                    </span>
                  </li>
                ))}
              </ul>
              <Paginacion
                etiqueta="Participantes"
                total={participantes.length}
                tamano={PARTICIPANTES_POR_PAGINA}
                pagina={paginaActual}
                onCambiar={setPagina}
              />
            </>
          )
        })()
      )}
    </Card>
  )
}

// Fases en que quien participa ya trabaja con su equipo: abrir la actividad
// lo lleva directo ahí en vez de hacerle buscar su equipo entre los demás.
const FASES_DE_TRABAJO_EN_EQUIPO = ['desarrollo', 'cierre']

export interface PantallaResumenActividadProps {
  /** /actividades/:id/resumen (Resumen, desde la barra lateral): se queda aquí
   * siempre, sin llevar al espacio del equipo. */
  soloResumen?: boolean
}

export function PantallaResumenActividad({ soloResumen = false }: PantallaResumenActividadProps) {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const contexto = { idActividad: id, seccion: 'resumen' } as const

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Resumen" contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando la actividad">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.texto}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const actividad = actividadQuery.data

  if (
    !soloResumen &&
    actividad.rol === 'participante' &&
    actividad.idMiEquipo &&
    FASES_DE_TRABAJO_EN_EQUIPO.includes(actividad.fase)
  ) {
    const seccion = primeraSeccionHabilitada(actividad)
    if (seccion) return <Navigate to={`/equipos/${actividad.idMiEquipo}/${seccion}`} replace />
  }

  const fase = infoFase(actividad.fase)

  return (
    <AppShell seccionActiva="actividades" titulo="Resumen" contexto={contexto}>
      <div className={styles.contenido}>
        <Card className={styles.seccionCard}>
          <div className={styles.encabezadoActividad}>
            <h2 className={styles.nombreActividad}>{actividad.nombre}</h2>
            <Badge variant={fase.variant}>{fase.etiqueta}</Badge>
          </div>

          <div className={styles.detalle}>
            <span className={styles.detalleEtiqueta}>Objetivo</span>
            <p className={styles.objetivo}>{actividad.objetivo}</p>
          </div>

          {actividad.informacionGeneral ? (
            <div className={styles.detalle}>
              <span className={styles.detalleEtiqueta}>Información general</span>
              <p className={styles.texto}>{actividad.informacionGeneral}</p>
            </div>
          ) : null}
        </Card>

        <AccionDeAvance actividad={actividad} />

        <SeccionParticipantes id={actividad.id} />

        <Card className={styles.seccionCard}>
          <h2 className={styles.tituloSeccion}>Detalles</h2>
          <dl className={styles.detalles}>
            {actividad.nombreOrganizador ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Organiza</dt>
                <dd className={styles.detalleValor}>{actividad.nombreOrganizador}</dd>
              </div>
            ) : null}
            <div className={styles.detalle}>
              <dt className={styles.detalleEtiqueta}>Clave de ingreso</dt>
              <dd className={`${styles.detalleValor} ${styles.clave}`}>
                {actividad.claveIngreso ?? '—'}
              </dd>
            </div>
            {actividad.fechaInicio && actividad.fechaTermino ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Periodo</dt>
                <dd className={styles.detalleValor}>
                  {formatearFecha(actividad.fechaInicio)} – {formatearFecha(actividad.fechaTermino)}
                </dd>
              </div>
            ) : null}
            {actividad.fechaLimiteInscripcion ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Fecha límite de inscripción</dt>
                <dd className={styles.detalleValor}>
                  {formatearFecha(actividad.fechaLimiteInscripcion)}
                </dd>
              </div>
            ) : null}
            {actividad.plazoCierreDias != null ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Plazo de reconocimiento</dt>
                <dd className={styles.detalleValor}>{actividad.plazoCierreDias} días</dd>
              </div>
            ) : null}
            {actividad.numeroEquiposEsperado != null ? (
              <div className={styles.detalle}>
                <dt className={styles.detalleEtiqueta}>Equipos esperados</dt>
                <dd className={styles.detalleValor}>{actividad.numeroEquiposEsperado}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </AppShell>
  )
}
