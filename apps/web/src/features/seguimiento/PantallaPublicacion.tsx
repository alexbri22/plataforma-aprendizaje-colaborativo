import {
  LONGITUD_MAXIMA_DESCRIPCION_PUBLICACION,
  esUrlSegura,
  fueEditada,
  type PublicacionDeProyecto,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Button, Card, IconoCargando, Textarea } from '../../components/ui'
import { formatearFechaHora, useActividad, type Actividad } from '../actividades'
import { PuntajeDelEquipo } from '../evaluacion/PuntajeDelEquipo'
import { AdjuntosElemento, CamposAdjuntos } from './AdjuntosElemento'
import { urlArchivoPublicacion } from './publicaciones.api'
import { useGuardarPublicacionMutation, usePublicaciones } from './usePublicaciones'
import styles from './PantallaPublicacion.module.css'

const TITULO = 'Publicación de proyectos'

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos publicar. Intenta de nuevo.'
}

// El formulario del proyecto propio: qué es (obligatorio) y el entregable,
// como enlace (un video, un repositorio) o archivo (un PDF, una imagen).
function FormularioPublicacion({
  idActividad,
  actual,
  onCerrar,
}: {
  idActividad: string
  actual: PublicacionDeProyecto | null
  onCerrar: () => void
}) {
  const guardar = useGuardarPublicacionMutation(idActividad)
  const [descripcion, setDescripcion] = useState(actual?.descripcion ?? '')
  const [enlace, setEnlace] = useState(actual?.enlace ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [quitarArchivo, setQuitarArchivo] = useState(false)
  const [errorEnlace, setErrorEnlace] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const enlaceLimpio = enlace.trim()
    if (enlaceLimpio && !esUrlSegura(enlaceLimpio)) {
      setErrorEnlace('Debe ser un enlace completo que empiece con https://')
      return
    }
    setErrorEnlace(undefined)
    setError(null)
    try {
      await guardar.mutateAsync({
        descripcion: descripcion.trim(),
        enlace: enlaceLimpio || null,
        archivo: archivo ?? (quitarArchivo ? 'quitar' : undefined),
      })
      onCerrar()
    } catch (e) {
      setError(mensajeDe(e))
    }
  }

  return (
    <form onSubmit={enviar} className={styles.formulario}>
      <Textarea
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        maxLength={LONGITUD_MAXIMA_DESCRIPCION_PUBLICACION}
        placeholder="Qué hicieron y qué entregan."
        autoFocus
      />
      <CamposAdjuntos
        enlace={enlace}
        onEnlace={setEnlace}
        archivoNuevo={archivo}
        onArchivoNuevo={setArchivo}
        archivoActual={actual?.archivo ?? null}
        quitarActual={quitarArchivo}
        onQuitarActual={setQuitarArchivo}
        errorEnlace={errorEnlace}
        disabled={guardar.isPending}
      />
      {error ? <AvisoError mensaje={error} /> : null}
      <div className={styles.acciones}>
        <Button type="submit" size="sm" disabled={guardar.isPending || descripcion.trim() === ''}>
          {guardar.isPending ? <IconoCargando size={14} /> : actual ? 'Guardar' : 'Publicar'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={guardar.isPending}
          onClick={onCerrar}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function VerPublicacion({
  idActividad,
  publicacion,
}: {
  idActividad: string
  publicacion: PublicacionDeProyecto
}) {
  return (
    <>
      <p className={styles.descripcion}>{publicacion.descripcion}</p>
      <AdjuntosElemento
        idElemento={publicacion.id}
        enlace={publicacion.enlace}
        archivo={publicacion.archivo}
        urlArchivo={urlArchivoPublicacion(idActividad, publicacion.id)}
      />
      <span className={styles.autoria}>
        {publicacion.autor} · {formatearFechaHora(publicacion.fechaCreacion)}
        {fueEditada(publicacion.fechaCreacion, publicacion.fechaActualizacion) ? ' · editada' : ''}
      </span>
    </>
  )
}

// El proyecto del propio equipo: cualquier integrante lo publica o lo
// corrige mientras dura el cierre.
function MiProyecto({
  actividad,
  nombreEquipo,
  publicacion,
}: {
  actividad: Actividad
  nombreEquipo: string
  publicacion: PublicacionDeProyecto | null
}) {
  const [editando, setEditando] = useState(false)
  const puedePublicar = (actividad.capacidades ?? []).includes('publicar_proyecto')

  return (
    <Card className={styles.tarjeta}>
      <h2 className={styles.titulo}>Proyecto de tu equipo · {nombreEquipo}</h2>
      {editando ? (
        <FormularioPublicacion
          idActividad={actividad.id}
          actual={publicacion}
          onCerrar={() => setEditando(false)}
        />
      ) : publicacion ? (
        <>
          <VerPublicacion idActividad={actividad.id} publicacion={publicacion} />
          {puedePublicar ? (
            <div className={styles.acciones}>
              <Button variant="secondary" size="sm" onClick={() => setEditando(true)}>
                Editar
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className={styles.vacio}>Todavía no lo publican.</p>
          {puedePublicar ? (
            <div className={styles.acciones}>
              <Button size="sm" onClick={() => setEditando(true)}>
                Publicar proyecto
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}

// Cierre › Publicación de proyectos: el entregable final de cada equipo, que
// ve toda la actividad. Quien organiza puntúa ahí el Producto de cada uno.
export function PantallaPublicacion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const consulta = usePublicaciones(id)
  const contexto = { idActividad: id, seccion: 'publicacion' } as const

  if (actividadQuery.isPending || consulta.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto}>
        <div className={styles.cargando} role="status" aria-label="Cargando los proyectos">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }
  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.vacio}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }
  const actividad = actividadQuery.data
  const organiza = actividad.rol !== 'participante'
  const enCierre = actividad.fase === 'cierre' || actividad.fase === 'archivada'

  let cuerpo
  if (consulta.isError) {
    cuerpo = <AvisoError mensaje={consulta.error.message} />
  } else if (!enCierre) {
    cuerpo = (
      <Card>
        <p className={styles.vacio}>Los proyectos se publican en el cierre.</p>
      </Card>
    )
  } else {
    const { equipos, publicaciones, idMiEquipo } = consulta.data
    const deEquipo = (idEquipo: string) =>
      publicaciones.find((p) => p.idEquipo === idEquipo) ?? null
    const miEquipo = equipos.find((e) => e.id === idMiEquipo)
    // Quien participa ve los proyectos ya publicados de los demás; quien
    // organiza, todos los equipos, para saber cuáles faltan.
    const otros = equipos.filter((e) => e.id !== idMiEquipo && (organiza || deEquipo(e.id)))
    const calificacion = organiza && actividad.configuracion?.calificacion === 'habilitada'
    cuerpo = (
      <>
        {miEquipo ? (
          <MiProyecto
            actividad={actividad}
            nombreEquipo={miEquipo.nombre}
            publicacion={deEquipo(miEquipo.id)}
          />
        ) : null}
        {otros.length === 0 && !miEquipo ? (
          <Card>
            <p className={styles.vacio}>Todavía no hay proyectos publicados.</p>
          </Card>
        ) : null}
        {otros.map((equipo) => {
          const publicacion = deEquipo(equipo.id)
          return (
            <Card key={equipo.id} className={styles.tarjeta}>
              <h2 className={styles.titulo}>{equipo.nombre}</h2>
              {publicacion ? (
                <VerPublicacion idActividad={actividad.id} publicacion={publicacion} />
              ) : (
                <p className={styles.vacio}>Sin publicar.</p>
              )}
              {calificacion ? (
                <PuntajeDelEquipo
                  idActividad={actividad.id}
                  idEquipo={equipo.id}
                  elemento="producto"
                  puedeCapturar={(actividad.capacidades ?? []).includes('capturar_puntaje')}
                />
              ) : null}
            </Card>
          )
        })}
      </>
    )
  }

  return (
    <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contexto}>
      <div className={styles.contenido}>{cuerpo}</div>
    </AppShell>
  )
}
