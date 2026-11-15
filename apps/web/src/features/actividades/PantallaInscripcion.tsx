import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Button, Card, IconoCargando, Paginacion, rebanar } from '../../components/ui'
import { AccionAdelantar } from './EtapasActividad'
import { formatearFecha, formatearFechaHora } from './formato'
import { useActividad, useCerrarInscripcionMutation, useParticipantes } from './useActividades'
import type { Actividad } from './tipos'
import styles from './PantallaInscripcion.module.css'

function BotonCopiar({ texto }: { texto: string }) {
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiada(true)
      window.setTimeout(() => setCopiada(false), 2000)
    } catch {
      // Sin acceso al portapapeles la clave sigue a la vista para copiarla a mano.
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={copiar}>
      {copiada ? 'Copiada' : 'Copiar'}
    </Button>
  )
}

function estadoInscripcion(actividad: Actividad): string {
  const abierta = actividad.fase === 'configuracion' || actividad.fase === 'inscripcion'
  if (!actividad.fechaLimiteInscripcion) return abierta ? 'Abierta' : 'Cerrada'
  const fecha = formatearFecha(actividad.fechaLimiteInscripcion)
  return abierta ? `Abierta hasta el ${fecha}` : `Cerró el ${fecha}`
}

function CerrarInscripcion({ actividad }: { actividad: Actividad }) {
  const cerrarInscripcion = useCerrarInscripcionMutation(actividad.id)
  if (!actividad.capacidades?.includes('cerrar_inscripcion')) return null
  return (
    <AccionAdelantar
      pregunta="¿Ya se unieron todos? Puedes cerrar la inscripción antes de la fecha."
      textoBoton="Cerrar inscripción"
      textoConfirmacion="La clave dejará de admitir nuevas uniones y no se reactiva. La actividad pasa a formación de equipos."
      textoBotonConfirmar="Sí, cerrar inscripción"
      textoBotonCargando="Cerrando…"
      mensajeErrorGenerico="No pudimos cerrar la inscripción. Intenta de nuevo."
      mutacion={cerrarInscripcion}
    />
  )
}

const PARTICIPANTES_POR_PAGINA = 10

// Quienes se han unido, aquí mismo y no como enlace a Participantes: en
// Creación esa entrada de la barra lateral todavía no se puede abrir, y
// llegar ahí dejaba la barra sin nada marcado.
function ListaInscritos({ idActividad }: { idActividad: string }) {
  const [pagina, setPagina] = useState(0)
  const participantes = useParticipantes(idActividad)

  if (participantes.isPending) {
    return (
      <div className={styles.cargando} role="status" aria-label="Cargando participantes">
        <IconoCargando size={24} />
      </div>
    )
  }
  if (participantes.isError || !participantes.data) {
    return <p className={styles.texto}>No pudimos cargar la lista. Intenta de nuevo.</p>
  }
  if (participantes.data.length === 0) {
    return <p className={styles.texto}>Todavía nadie se ha unido. Comparte la clave.</p>
  }

  const { visibles, pagina: paginaActual } = rebanar(
    participantes.data,
    pagina,
    PARTICIPANTES_POR_PAGINA,
  )
  return (
    <>
      <ul className={styles.lista}>
        {visibles.map((p) => (
          <li key={p.idMembresia} className={styles.participante}>
            <Link to={`/usuarios/${p.idUsuario}`} className={styles.nombre}>
              {p.nombre}
            </Link>
            <span className={styles.fecha}>Se unió el {formatearFechaHora(p.fechaUnion)}</span>
          </li>
        ))}
      </ul>
      <Paginacion
        total={participantes.data.length}
        tamano={PARTICIPANTES_POR_PAGINA}
        pagina={paginaActual}
        onCambiar={setPagina}
        etiqueta="Participantes"
      />
    </>
  )
}

// Inscripción (Creación, solo quien organiza): la clave para que se unan,
// hasta cuándo, cerrarla antes de tiempo y quiénes se han unido.
export function PantallaInscripcion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const contexto = { idActividad: id, seccion: 'inscripcion' } as const

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Inscripción" contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando la inscripción">
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
  if (actividad.rol === 'participante') {
    return <Navigate to={`/actividades/${id}/resumen`} replace />
  }

  const participantes = actividad.numParticipantes ?? 0

  return (
    <AppShell
      seccionActiva="actividades"
      titulo="Inscripción"
      contexto={contexto}
      ayuda="inscripcion"
    >
      <div className={styles.contenido}>
        <Card className={styles.tarjeta}>
          <dl className={styles.detalles}>
            <div className={styles.detalle}>
              <dt className={styles.etiqueta}>Clave de ingreso</dt>
              <dd className={styles.valorClave}>
                <span className={styles.clave}>{actividad.claveIngreso ?? '—'}</span>
                {actividad.claveIngreso ? <BotonCopiar texto={actividad.claveIngreso} /> : null}
              </dd>
            </div>
            <div className={styles.detalle}>
              <dt className={styles.etiqueta}>Inscripción</dt>
              <dd className={styles.valor}>{estadoInscripcion(actividad)}</dd>
            </div>
          </dl>

          <CerrarInscripcion actividad={actividad} />
        </Card>

        <Card className={styles.tarjeta}>
          <h2 className={styles.titulo}>Participantes ({participantes})</h2>
          <ListaInscritos idActividad={id} />
        </Card>
      </div>
    </AppShell>
  )
}
