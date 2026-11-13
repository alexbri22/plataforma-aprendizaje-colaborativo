import {
  ELEMENTOS_ESPACIO_EQUIPO,
  type ElementoEspacioEquipo,
  type ResumenDeSeccion,
  type RetroalimentacionDeEquipo,
  type SeccionRetroalimentacion,
} from '@plataforma/shared'
import { useId, useState, type ChangeEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Card, IconoCargando, Select } from '../../components/ui'
import { useActividad, type Actividad } from '../actividades'
import { estaHabilitada } from '../actividades/espacioEquipo'
import { IconoChevron } from './IconoChevron'
import { ListaComentarios } from './ListaComentarios'
import {
  claveRetroalimentacion,
  useCrearRetroalimentacionDeEquipoMutation,
  useEditarComentarioMutation,
  useRetroalimentacion,
} from './useComentarios'
import styles from './PantallaRetroalimentacion.module.css'

const TITULO = 'Evaluación y retroalimentación'

const NOMBRE_SECCION: Record<SeccionRetroalimentacion, string> = {
  general: 'General',
  metas: 'Metas',
  planeacion: 'Planeación',
  avances: 'Avances',
  recursos: 'Materiales',
  producto: 'Producto',
}

// Cómo se cuentan los elementos de cada sección en el contexto.
const ELEMENTOS: Record<ElementoEspacioEquipo, [string, string]> = {
  metas: ['meta', 'metas'],
  planeacion: ['entrada', 'entradas'],
  avances: ['avance', 'avances'],
  recursos: ['material', 'materiales'],
  producto: ['entrega', 'entregas'],
}

function plural(n: number, [uno, varios]: [string, string]): string {
  return `${n} ${n === 1 ? uno : varios}`
}

// General primero; después, las secciones del espacio de equipo que la
// actividad usa.
function seccionesDe(actividad: Actividad): SeccionRetroalimentacion[] {
  return ['general', ...ELEMENTOS_ESPACIO_EQUIPO.filter((e) => estaHabilitada(actividad, e))]
}

function contexto(seccion: SeccionRetroalimentacion, resumen: ResumenDeSeccion | undefined) {
  if (seccion === 'general') return null
  if (!resumen || resumen.elementos === 0) return 'Sin contenido todavía'
  return `${plural(resumen.elementos, ELEMENTOS[seccion])} · ${plural(resumen.comentarios, ['comentario', 'comentarios'])}`
}

interface ParteProps {
  actividad: Actividad
  idEquipo: string
  seccion: SeccionRetroalimentacion
  comentarios: RetroalimentacionDeEquipo[]
  resumen?: ResumenDeSeccion
  organiza: boolean
  abiertaAlInicio: boolean
}

// Una parte del trabajo del equipo con la retroalimentación que lleva. Se
// pliega para revisar solo las que interesan; plegada, su encabezado dice
// cuánto hay. Quien organiza ve además el contexto de la sección y escribe.
function Parte({
  actividad,
  idEquipo,
  seccion,
  comentarios,
  resumen,
  organiza,
  abiertaAlInicio,
}: ParteProps) {
  const [abierta, setAbierta] = useState(abiertaAlInicio)
  const idCuerpo = useId()
  const crear = useCrearRetroalimentacionDeEquipoMutation(actividad.id)
  const editar = useEditarComentarioMutation(claveRetroalimentacion(actividad.id))
  const puedeComentar = organiza && (actividad.capacidades ?? []).includes('comentar')
  const dato = organiza ? contexto(seccion, resumen) : null

  return (
    <Card className={styles.parte}>
      <div className={styles.encabezado}>
        <h2 className={styles.tituloParte}>
          <button
            type="button"
            className={styles.alternar}
            aria-expanded={abierta}
            aria-controls={idCuerpo}
            onClick={() => setAbierta(!abierta)}
          >
            <IconoChevron
              className={[styles.chevron, abierta ? styles.chevronAbierto : null]
                .filter(Boolean)
                .join(' ')}
            />
            {NOMBRE_SECCION[seccion]}
          </button>
        </h2>
        <Badge variant="neutral">{comentarios.length}</Badge>
        {dato ? <span className={styles.dato}>{dato}</span> : null}
        {organiza && seccion !== 'general' ? (
          <Link to={`/equipos/${idEquipo}/${seccion}`} className={styles.ver}>
            Ver {NOMBRE_SECCION[seccion].toLowerCase()} →
          </Link>
        ) : null}
      </div>
      {abierta ? (
        <div id={idCuerpo}>
          <ListaComentarios
            comentarios={comentarios}
            cargando={false}
            esError={false}
            idMiMembresia={actividad.idMiMembresia}
            puedeComentar={puedeComentar}
            creando={crear.isPending}
            etiquetaNuevo="Escribir retroalimentación"
            textoBoton="Enviar"
            textoVacio="Todavía no hay retroalimentación."
            sinSeparador
            onCrear={async (contenido) => {
              await crear.mutateAsync({ idEquipo, seccion, contenido })
            }}
            onEditar={async (idComentario, contenido) => {
              await editar.mutateAsync({ idComentario, contenido })
            }}
          />
        </div>
      ) : null}
    </Card>
  )
}

// Quien organiza: elige un equipo y ve sus partes, lo que ya le dijo en cada
// una y cuánto hay que revisar. El selector marca a los equipos que todavía
// no tienen nada.
function VistaOrganiza({ actividad }: { actividad: Actividad }) {
  const consulta = useRetroalimentacion(actividad.id)
  const [parametros, setParametros] = useSearchParams()

  if (consulta.isPending) {
    return (
      <div className={styles.cargando} role="status" aria-label="Cargando la retroalimentación">
        <IconoCargando size={24} />
      </div>
    )
  }
  if (consulta.isError) return <AvisoError mensaje={consulta.error.message} />

  const { equipos, retroalimentacion, resumen } = consulta.data
  if (equipos.length === 0) {
    return (
      <Card>
        <p className={styles.vacio}>Todavía no hay equipos.</p>
      </Card>
    )
  }
  const pedido = parametros.get('equipo')
  const equipo = equipos.find((e) => e.id === pedido) ?? equipos[0]

  return (
    <>
      <div className={styles.selector}>
        <Select
          label="Equipo"
          value={equipo.id}
          onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
            setParametros({ equipo: evento.target.value }, { replace: true })
          }
        >
          {equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Select>
      </div>
      {seccionesDe(actividad).map((seccion) => (
        <Parte
          key={`${equipo.id}:${seccion}`}
          actividad={actividad}
          idEquipo={equipo.id}
          seccion={seccion}
          comentarios={retroalimentacion.filter(
            (r) => r.idEquipo === equipo.id && r.seccion === seccion,
          )}
          resumen={resumen.find((r) => r.idEquipo === equipo.id && r.seccion === seccion)}
          organiza
          abiertaAlInicio={false}
        />
      ))}
    </>
  )
}

// Quien participa: lo que ha recibido su equipo, por parte. Solo las partes
// que ya tienen algo.
function VistaParticipa({ actividad }: { actividad: Actividad }) {
  const consulta = useRetroalimentacion(actividad.id)
  if (consulta.isPending) {
    return (
      <div className={styles.cargando} role="status" aria-label="Cargando la retroalimentación">
        <IconoCargando size={24} />
      </div>
    )
  }
  if (consulta.isError) return <AvisoError mensaje={consulta.error.message} />

  const { equipos, retroalimentacion } = consulta.data
  const miEquipo = equipos[0]
  const partes = seccionesDe(actividad).filter((s) =>
    retroalimentacion.some((r) => r.seccion === s),
  )
  if (!miEquipo || partes.length === 0) {
    return (
      <Card>
        <p className={styles.vacio}>Todavía no hay retroalimentación.</p>
      </Card>
    )
  }
  return (
    <>
      {partes.map((seccion) => (
        <Parte
          key={seccion}
          actividad={actividad}
          idEquipo={miEquipo.id}
          seccion={seccion}
          comentarios={retroalimentacion.filter((r) => r.seccion === seccion)}
          organiza={false}
          abiertaAlInicio
        />
      ))}
    </>
  )
}

// Desarrollo › Evaluación y retroalimentación: el único lugar de la
// retroalimentación de quien organiza sobre cómo trabaja cada equipo en cada
// parte de su espacio. No son las calificaciones: esas se ven en el cierre.
export function PantallaRetroalimentacion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const contextoNav = { idActividad: id, seccion: 'evaluacion' } as const

  if (actividadQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contextoNav}>
        <div className={styles.cargando} role="status" aria-label="Cargando">
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
  return (
    <AppShell seccionActiva="actividades" titulo={TITULO} contexto={contextoNav}>
      <div className={styles.contenido}>
        {actividad.rol === 'participante' ? (
          <VistaParticipa actividad={actividad} />
        ) : (
          <VistaOrganiza actividad={actividad} />
        )}
      </div>
    </AppShell>
  )
}
