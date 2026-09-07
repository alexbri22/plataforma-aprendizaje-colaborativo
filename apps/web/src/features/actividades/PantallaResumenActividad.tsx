import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Button, Card, IconoCargando } from '../../components/ui'
import { infoFase } from './fase'
import { formatearFecha, formatearFechaHora } from './formato'
import { ErrorActividad } from './actividades.api'
import { useActividad, useCerrarInscripcionMutation, useParticipantes } from './useActividades'
import type { Actividad } from './tipos'
import styles from './PantallaResumenActividad.module.css'

const MENSAJE_ERROR_CIERRE_GENERICO = 'No pudimos cerrar la inscripción. Intenta de nuevo.'

// La fase actual con la acción que la hace avanzar (docs/diseno-desarrollo-nucleo.md
// §7.8): el organizador (o co-organizador con el permiso) ve el botón de la
// única transición que este incremento admite; quien no tiene el permiso no
// ve nada, porque 'cerrar_inscripcion' no está en su conjunto de
// capacidades. La pantalla nunca evalúa rol ni fase por su cuenta (§4.3):
// solo pregunta si la acción está en actividad.capacidades.
function AccionDeAvance({ actividad }: { actividad: Actividad }) {
  const [confirmando, setConfirmando] = useState(false)
  const cerrarInscripcionMutacion = useCerrarInscripcionMutation(actividad.id)

  if (!actividad.capacidades?.includes('cerrar_inscripcion')) return null

  return (
    <Card className={styles.accion}>
      {!confirmando ? (
        <>
          <div>
            <h2 className={styles.tituloSeccion}>Inscripción abierta</h2>
            <p className={styles.accionTexto}>
              Ciérrala cuando ya tengas a los participantes que esperabas. La actividad pasará a
              formación de equipos.
            </p>
          </div>
          <Button onClick={() => setConfirmando(true)} className={styles.accionBoton}>
            Cerrar inscripción
          </Button>
        </>
      ) : (
        <>
          {cerrarInscripcionMutacion.isError ? (
            <AvisoError
              mensaje={
                cerrarInscripcionMutacion.error instanceof ErrorActividad
                  ? cerrarInscripcionMutacion.error.message
                  : MENSAJE_ERROR_CIERRE_GENERICO
              }
            />
          ) : null}

          <p className={styles.accionTexto}>
            Una vez cerrada, la clave de ingreso deja de admitir nuevas uniones y no se reactiva.
            ¿Confirmas que quieres cerrar la inscripción?
          </p>

          <div className={styles.accionBotones}>
            <Button
              onClick={() => cerrarInscripcionMutacion.mutate()}
              disabled={cerrarInscripcionMutacion.isPending}
            >
              {cerrarInscripcionMutacion.isPending ? (
                <>
                  <IconoCargando />
                  Cerrando…
                </>
              ) : (
                'Sí, cerrar inscripción'
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmando(false)
                cerrarInscripcionMutacion.reset()
              }}
              disabled={cerrarInscripcionMutacion.isPending}
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

// Quiénes se han unido hasta ahora (pedido explícito: es lo que informa si
// "ya es momento de cerrar la inscripción"). Solo participantes, no
// organizador ni co-organizadores: ellos no son a quienes se está esperando.
function SeccionParticipantes({ id }: { id: string }) {
  const participantesQuery = useParticipantes(id)

  return (
    <Card className={styles.seccionCard}>
      <h2 className={styles.tituloSeccion}>
        Participantes{participantesQuery.data ? ` (${participantesQuery.data.filter((p) => p.rol === 'participante').length})` : ''}
      </h2>

      {participantesQuery.isPending ? (
        <div className={styles.cargandoSeccion} role="status" aria-label="Cargando participantes">
          <IconoCargando size={20} />
        </div>
      ) : participantesQuery.isError ? (
        <AvisoError mensaje="No pudimos cargar los participantes." />
      ) : (
        (() => {
          const participantes = participantesQuery.data.filter((p) => p.rol === 'participante')
          if (participantes.length === 0) {
            return (
              <p className={styles.texto}>
                Nadie se ha unido todavía. Comparte la clave de ingreso para que empiecen a llegar.
              </p>
            )
          }
          return (
            <ul className={styles.listaParticipantes}>
              {participantes.map((participante) => (
                <li key={participante.idUsuario} className={styles.filaParticipante}>
                  <span className={styles.nombreParticipante}>{participante.nombre}</span>
                  <span className={styles.fechaParticipante}>
                    Se unió el {formatearFechaHora(participante.fechaUnion)}
                  </span>
                </li>
              ))}
            </ul>
          )
        })()
      )}
    </Card>
  )
}

export function PantallaResumenActividad() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad">
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
  const fase = infoFase(actividad.fase)

  return (
    <AppShell
      seccionActiva="actividades"
      titulo={actividad.nombre}
      acciones={
        actividad.capacidades?.includes('configurar_funciones') ? (
          <Button variant="secondary" to={`/actividades/${actividad.id}/configuracion`}>
            Configurar
          </Button>
        ) : undefined
      }
    >
      <div className={styles.contenido}>
        <Card className={styles.seccionCard}>
          <Badge variant={fase.variant} className={styles.badge}>
            {fase.etiqueta}
          </Badge>

          <p className={styles.objetivo}>{actividad.objetivo}</p>

          {actividad.informacionGeneral ? (
            <p className={styles.texto}>{actividad.informacionGeneral}</p>
          ) : null}
        </Card>

        <AccionDeAvance actividad={actividad} />

        <SeccionParticipantes id={actividad.id} />

        <Card className={styles.seccionCard}>
          <h2 className={styles.tituloSeccion}>Detalles</h2>
          <dl className={styles.detalles}>
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
                <dt className={styles.detalleEtiqueta}>Plazo de cierre</dt>
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
