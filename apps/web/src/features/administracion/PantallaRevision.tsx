import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CRITERIOS_PUBLICACION,
  DECISIONES_CON_MOTIVO,
  ETIQUETAS_ACCION_REVISION,
  ETIQUETAS_ESTATUS_RECURSO,
  LARGO_MAXIMO_MOTIVO,
  type CriterioPublicacion,
  type DecisionRevision,
  type EstatusRecurso,
  type TipoContenido,
} from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  Checkbox,
  IconoCargando,
  Textarea,
} from '../../components/ui'
import {
  ErrorFormacion,
  VistaPreviaCurso,
  VistaPreviaRecurso,
  urlArchivoAdmin,
  useDecidirRevision,
  useRevision,
  varianteEstatus,
  type EntradaHistorial,
} from '../formacion'
import styles from './PantallaRevision.module.css'

/*
 * Revisar una propuesta (§6.3, §12.3, MOD-01 y nota del incremento 6): la
 * vista previa tal como la verá la persona, su historial y la decisión. La
 * decisión siempre lleva motivo cuando la propuesta no se publica (o se
 * retira), y aprobar exige revisar los siete criterios de §6.4.
 */

const OPCIONES: Record<string, { decision: DecisionRevision; etiqueta: string; ayuda: string }[]> =
  {
    en_revision: [
      {
        decision: 'aprobar',
        etiqueta: 'Aprobar y publicar',
        ayuda: 'Aparece en Recursos con el nombre de su autor.',
      },
      {
        decision: 'pedir_cambios',
        etiqueta: 'Pedir cambios',
        ayuda: 'Vuelve a su autor para que la corrija y la reenvíe.',
      },
      {
        decision: 'rechazar',
        etiqueta: 'Rechazar',
        ayuda: 'Es definitivo: su autor ya no podrá editarla.',
      },
    ],
    publicado: [
      {
        decision: 'retirar',
        etiqueta: 'Retirar del catálogo',
        ayuda: 'Deja de verse en Recursos. Se puede volver a publicar.',
      },
    ],
    retirado: [
      {
        decision: 'publicar_de_nuevo',
        etiqueta: 'Publicar de nuevo',
        ayuda: 'Vuelve a aparecer en Recursos.',
      },
    ],
  }

export function PantallaRevision() {
  const { tipo: tipoRuta = '', id = '' } = useParams()
  const tipo: TipoContenido = tipoRuta === 'cursos' ? 'curso' : 'recurso'
  const consulta = useRevision(tipo, id)

  if (consulta.isPending) {
    return (
      <AppShell seccionActiva="revisiones" titulo="Revisión" volverA="/admin/revisiones">
        <div role="status" aria-label="Cargando la propuesta">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }
  if (consulta.isError) {
    return (
      <AppShell seccionActiva="revisiones" titulo="Revisión" volverA="/admin/revisiones">
        <AvisoError mensaje={consulta.error.message} />
        <p>
          <Link to="/admin/revisiones">Volver a la cola</Link>
        </p>
      </AppShell>
    )
  }

  const datos = consulta.data
  const contenido = datos.tipo === 'recurso' ? datos.recurso : datos.curso
  const enlaceEditor =
    datos.tipo === 'recurso'
      ? `/admin/contenido/${datos.recurso.idRecurso}`
      : `/admin/cursos/${datos.curso.idCurso}`

  return (
    <AppShell seccionActiva="revisiones" titulo="Revisión" volverA="/admin/revisiones">
      <div className={styles.layout}>
        <div className={styles.principal}>
          <div className={styles.cabecera}>
            <p className={styles.meta}>
              {datos.tipo === 'recurso' ? 'Recurso' : 'Curso'} propuesto por{' '}
              {contenido.autor?.nombre ?? 'una cuenta eliminada'}
            </p>
            <Badge variant={varianteEstatus(contenido.estatus)}>
              {ETIQUETAS_ESTATUS_RECURSO[contenido.estatus]}
            </Badge>
          </div>
          <Card>
            {datos.tipo === 'recurso' ? (
              <VistaPreviaRecurso
                recurso={datos.recurso}
                urlArchivo={(archivo) => urlArchivoAdmin(datos.recurso.idRecurso, archivo)}
              />
            ) : (
              <VistaPreviaCurso curso={datos.curso} />
            )}
          </Card>
        </div>
        <aside className={styles.lateral} aria-label="Decisión">
          <Decision
            tipo={tipo}
            id={id}
            titulo={contenido.titulo}
            estatus={contenido.estatus}
            onRecargar={() => void consulta.refetch()}
          />
          {contenido.estatus === 'publicado' || contenido.estatus === 'retirado' ? (
            <p className={styles.nota}>
              Publicada, la cuidas como cualquier contenido:{' '}
              <Link to={enlaceEditor}>abrirla en el editor</Link>.
            </p>
          ) : null}
          <Historial historial={datos.historial} />
        </aside>
      </div>
    </AppShell>
  )
}

function Decision({
  tipo,
  id,
  titulo,
  estatus,
  onRecargar,
}: {
  tipo: TipoContenido
  id: string
  titulo: string
  estatus: EstatusRecurso
  onRecargar: () => void
}) {
  const navigate = useNavigate()
  const decidir = useDecidirRevision()
  const opciones = OPCIONES[estatus] ?? []
  const [decision, setDecision] = useState<DecisionRevision | null>(
    opciones.length === 1 ? opciones[0].decision : null,
  )
  const [criterios, setCriterios] = useState<CriterioPublicacion[]>([])
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [desactualizada, setDesactualizada] = useState(false)

  if (opciones.length === 0) {
    return (
      <Card className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Decisión</h2>
        <p className={styles.nota}>
          {estatus === 'rechazado'
            ? 'Esta propuesta se rechazó. La decisión es definitiva.'
            : 'No hay nada que decidir sobre esta propuesta ahora.'}
        </p>
      </Card>
    )
  }

  const pideMotivo = decision !== null && DECISIONES_CON_MOTIVO.includes(decision)

  function alternar(criterio: CriterioPublicacion) {
    setCriterios((actuales) =>
      actuales.includes(criterio)
        ? actuales.filter((c) => c !== criterio)
        : [...actuales, criterio],
    )
    setErrores((e) => sinCampo(e, 'criterios'))
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (!decision) {
      setErrores({ decision: 'Elige una decisión.' })
      return
    }
    setMensaje(null)
    setErrores({})
    try {
      await decidir.mutateAsync({
        tipo,
        id,
        datos: { decision, motivo, criterios: decision === 'aprobar' ? criterios : [] },
      })
      const etiqueta = OPCIONES[estatus].find((o) => o.decision === decision)?.etiqueta ?? ''
      navigate('/admin/revisiones', {
        state: {
          avisoRevision: `«${titulo}»: ${etiqueta.toLowerCase()}. Su autor verá la decisión.`,
        },
      })
    } catch (error) {
      if (error instanceof ErrorFormacion && error.codigo === 'revision_desactualizada') {
        setDesactualizada(true)
        return
      }
      if (error instanceof ErrorFormacion) {
        setErrores(error.detallePorCampo ?? {})
        setMensaje(error.detallePorCampo ? null : error.message)
      } else {
        setMensaje('Ocurrió un error inesperado.')
      }
    }
  }

  return (
    <Card className={styles.seccion}>
      <form onSubmit={(e) => void alEnviar(e)} noValidate className={styles.formulario}>
        <h2 className={styles.tituloSeccion}>Decisión</h2>
        {desactualizada ? (
          <div role="alert" className={styles.alerta}>
            <p>
              Esta propuesta cambió de estado mientras la revisabas: su autor canceló el envío u
              otra persona ya decidió.
            </p>
            <Button variant="secondary" size="sm" onClick={onRecargar}>
              Volver a cargarla
            </Button>
          </div>
        ) : null}
        {mensaje ? <AvisoError mensaje={mensaje} /> : null}

        <fieldset className={styles.grupo}>
          <legend>Qué decides</legend>
          {opciones.map((o) => (
            <label key={o.decision} className={styles.opcion}>
              <input
                type="radio"
                name="decision"
                value={o.decision}
                checked={decision === o.decision}
                onChange={() => {
                  setDecision(o.decision)
                  setErrores({})
                }}
              />
              <span>
                <span className={styles.opcionEtiqueta}>{o.etiqueta}</span>
                <span className={styles.nota}>{o.ayuda}</span>
              </span>
            </label>
          ))}
          {errores.decision ? <p className={styles.error}>{errores.decision}</p> : null}
        </fieldset>

        {decision === 'aprobar' ? (
          <fieldset className={styles.grupo}>
            <legend>Criterios de publicación</legend>
            <p className={styles.nota}>Para aprobar, revisa y marca los siete.</p>
            {CRITERIOS_PUBLICACION.map((c) => (
              <Checkbox
                key={c.id}
                label={c.etiqueta}
                checked={criterios.includes(c.id)}
                onChange={() => alternar(c.id)}
              />
            ))}
            {errores.criterios ? <p className={styles.error}>{errores.criterios}</p> : null}
          </fieldset>
        ) : null}

        {decision ? (
          <Textarea
            label={pideMotivo ? 'Motivo (lo verá su autor)' : 'Comentario para su autor (opcional)'}
            value={motivo}
            maxLength={LARGO_MAXIMO_MOTIVO}
            onChange={(e) => {
              setMotivo(e.target.value)
              setErrores((e) => sinCampo(e, 'motivo'))
            }}
            error={errores.motivo}
            rows={4}
            required={pideMotivo}
          />
        ) : null}

        <Button type="submit" disabled={decidir.isPending || decision === null}>
          {decidir.isPending ? 'Guardando…' : 'Guardar la decisión'}
        </Button>
      </form>
    </Card>
  )
}

function sinCampo(errores: Record<string, string>, campo: string): Record<string, string> {
  const copia = { ...errores }
  delete copia[campo]
  return copia
}

const FECHA_HORA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

function Historial({ historial }: { historial: EntradaHistorial[] }) {
  if (historial.length === 0) return null
  return (
    <Card className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>Historial</h2>
      <ol className={styles.historial}>
        {historial.map((h, i) => (
          <li key={`${h.fecha}-${i}`}>
            <p className={styles.historialAccion}>{ETIQUETAS_ACCION_REVISION[h.accion]}</p>
            <p className={styles.nota}>
              {FECHA_HORA.format(new Date(h.fecha))}
              {h.actor ? ` · ${h.actor}` : ''}
            </p>
            {h.motivo ? <p className={styles.historialMotivo}>{h.motivo}</p> : null}
          </li>
        ))}
      </ol>
    </Card>
  )
}
