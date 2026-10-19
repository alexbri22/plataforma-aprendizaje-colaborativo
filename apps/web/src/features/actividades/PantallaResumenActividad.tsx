import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
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
import { PanelHistorial } from '../historial'
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

// Iconos de los accesos del topbar (Configurar, Equipos, Historial): mismo
// trazo simple en los tres (viewBox 20x20 o 24x24, stroke ~1.3-1.5, sin
// relleno). El de Configurar es el contorno de un engranaje de verdad (con
// dientes) y no un aro con rayas delgadas, que se leía como un sol.
function IconoConfigurar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.48-.41h-3.84a.5.5 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32a.5.5 0 0 0 .59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54a.5.5 0 0 0 .48.41h3.84a.5.5 0 0 0 .48-.41l.36-2.54a7.3 7.3 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2"
      />
    </svg>
  )
}

function IconoEquipos() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="8" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.8 16c.5-2.7 2-4.2 4.2-4.2s3.7 1.5 4.2 4.2M12 12.2c1.8 0 3 1.2 3.4 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoHistorial() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4.5 4.8 3.3 3.5M4.5 4.8 3.2 5.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 4.8A6.5 6.5 0 1 1 3.5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 7v3.3l2.3 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

export function PantallaResumenActividad() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const [historialAbierto, setHistorialAbierto] = useState(false)

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad" volverA={'/actividades'}>
        <div className={styles.cargando} role="status" aria-label="Cargando la actividad">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell
        seccionActiva="actividades"
        titulo="Actividad no encontrada"
        volverA={'/actividades'}
      >
        <p className={styles.texto}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const actividad = actividadQuery.data
  const fase = infoFase(actividad.fase)
  // Destino de la flecha de regreso: Organizo o Participo según el rol, en
  // vez del alias /actividades que siempre manda a Organizo. La vista
  // cargada no pasaba volverA a AppShell y la flecha no se mostraba aquí
  // (el único caso que la prueba cubría era el enlace transitorio del
  // estado de carga).
  const organiza = actividad.rol !== 'participante'

  return (
    <AppShell
      seccionActiva="actividades"
      titulo={actividad.nombre}
      volverA={organiza ? '/actividades/organizo' : '/actividades/participo'}
      // Icono + palabra, igual que la navegación lateral (AppShell.tsx,
      // .navItem): icono solo se leía como un bloque de botones anónimos,
      // sin relación visual con el resto de la navegación de la app.
      // Reconocer al equipo y Mis reconocimientos se movieron al espacio de
      // equipo (AppShellEquipo, sección Honoramiento, con la misma condición
      // abierto/aplicados que AccionesReconocimiento usa aquí): son del
      // equipo del actor, no de la actividad completa. Participantes sí vive
      // aquí (solo organiza): a diferencia de los otros dos, no es por
      // equipo — ve lo recibido de cualquier participante de la actividad
      // (insignias.service.ts, listarRecibidosDeParticipante).
      acciones={
        <>
          {
            // En desarrollo ya no se pueden cambiar funciones, pero sí el calendario
            // de avances: la pantalla de configuración sigue siendo el lugar.
            actividad.capacidades?.some(
              (capacidad) =>
                capacidad === 'configurar_funciones' ||
                capacidad === 'ajustar_funciones' ||
                capacidad === 'ajustar_periodos',
            ) ? (
              <Button variant="ghost" size="sm" to={`/actividades/${actividad.id}/configuracion`}>
                <IconoConfigurar />
                Configurar
              </Button>
            ) : null
          }
          <Button variant="ghost" size="sm" to={`/actividades/${actividad.id}/equipos`}>
            <IconoEquipos />
            Equipos
          </Button>
          {organiza ? (
            <Button variant="ghost" size="sm" to={`/actividades/${actividad.id}/participantes`}>
              Participantes
            </Button>
          ) : null}
          {/* Panel lateral, no una pantalla propia (decisión de producto):
              no saca a quien organiza de donde está, igual que Configurar lo
              hace desde Equipos. */}
          <Button variant="ghost" size="sm" onClick={() => setHistorialAbierto(true)}>
            <IconoHistorial />
            Historial
          </Button>
        </>
      }
    >
      <div className={styles.contenido}>
        <Card className={styles.seccionCard}>
          <Badge variant={fase.variant} className={styles.badge}>
            {fase.etiqueta}
          </Badge>

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
      <PanelHistorial
        idActividad={actividad.id}
        abierto={historialAbierto}
        onCerrar={() => setHistorialAbierto(false)}
      />
    </AppShell>
  )
}
