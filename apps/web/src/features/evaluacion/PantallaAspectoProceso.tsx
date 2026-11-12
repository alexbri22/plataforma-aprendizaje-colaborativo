import {
  ESCALA_LIKERT,
  LONGITUD_MAXIMA_CONTENIDO_ENTREGA,
  NOMBRE_PLANTILLA,
  PLANTILLAS_INSTRUMENTO,
  puntajeLikert,
  type CumplimientoDeInstrumento,
  type EntregaDeInstrumento,
  type InstrumentoPorResponder,
  type IntegranteEquipo,
  type RespuestasDistribucion,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import {
  AvisoError,
  Button,
  Card,
  IconoCargando,
  Paginacion,
  PanelLateral,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  Textarea,
  rebanar,
} from '../../components/ui'
import {
  formatearFecha,
  formatearFechaHora,
  TAREAS_PROCESO_COLABORATIVO,
  useActividad,
} from '../actividades'
import { useEquipo } from '../equipos/useEquipos'
import { AdjuntosElemento, CamposAdjuntos } from '../seguimiento/AdjuntosElemento'
import { CampoPuntaje } from './CampoPuntaje'
import { formatearPuntaje } from './formatoPuntaje'
import { urlArchivoEntrega } from './ponderacion.api'
import { useCapturarPuntajeMutation } from './useCalificaciones'
import { usePonderacion } from './usePonderacion'
import {
  useCumplimiento,
  useEntregas,
  useGuardarEntregaMutation,
  useMisInstrumentos,
  useMisResultadosPares,
  useRespuestas,
  useResultadosPares,
} from './useRespuestas'
import styles from './PantallaAspectoProceso.module.css'

// El título y la fecha, como en la fila de la que se abre el panel.
function descripcionDe(instrumento: {
  nombre: string
  clavePlantilla: string | null
  fechaPlanificada: string | null
}): string {
  return instrumento.fechaPlanificada
    ? `${tituloDe(instrumento)} · ${formatearFecha(instrumento.fechaPlanificada)}`
    : tituloDe(instrumento)
}

function tituloDe(instrumento: { nombre: string; clavePlantilla: string | null }): string {
  return instrumento.clavePlantilla
    ? NOMBRE_PLANTILLA[instrumento.clavePlantilla as keyof typeof NOMBRE_PLANTILLA]
    : instrumento.nombre
}

/*
 * Quien participa: sus instrumentos de este aspecto.
 */

interface FormularioEntregaProps {
  idActividad: string
  instrumento: InstrumentoPorResponder
  entrega: EntregaDeInstrumento | null
  onListo: () => void
}

// La entrega de una actividad externa (nucleo §10.1): qué hizo y, si quiere,
// un enlace (la grabación) o un archivo (un PDF), como un avance.
function FormularioEntrega({ idActividad, instrumento, entrega, onListo }: FormularioEntregaProps) {
  const guardar = useGuardarEntregaMutation(idActividad, instrumento.id)
  const [contenido, setContenido] = useState(entrega?.contenido ?? '')
  const [enlace, setEnlace] = useState(entrega?.enlace ?? '')
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null)
  const [quitarArchivo, setQuitarArchivo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    try {
      await guardar.mutateAsync({
        contenido: contenido.trim(),
        enlace: enlace.trim() || null,
        archivoNuevo,
        quitarArchivo,
      })
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu entrega.')
    }
  }

  return (
    <form onSubmit={enviar} className={styles.formulario}>
      <Textarea
        label="¿Qué hiciste?"
        rows={3}
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        maxLength={LONGITUD_MAXIMA_CONTENIDO_ENTREGA}
        disabled={guardar.isPending}
      />
      <CamposAdjuntos
        enlace={enlace}
        onEnlace={setEnlace}
        archivoNuevo={archivoNuevo}
        onArchivoNuevo={setArchivoNuevo}
        archivoActual={entrega?.archivo ?? null}
        quitarActual={quitarArchivo}
        onQuitarActual={setQuitarArchivo}
        disabled={guardar.isPending}
      />
      {error ? <AvisoError mensaje={error} /> : null}
      <div className={styles.acciones}>
        <Button type="submit" size="sm" disabled={guardar.isPending || !contenido.trim()}>
          {guardar.isPending ? (
            <IconoCargando size={14} />
          ) : entrega ? (
            'Guardar cambios'
          ) : (
            'Marcar como hecha'
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={guardar.isPending}
          onClick={onListo}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function LecturaEntrega({
  idActividad,
  entrega,
}: {
  idActividad: string
  entrega: EntregaDeInstrumento
}) {
  return (
    <div className={styles.entrega}>
      <p className={styles.contenido}>{entrega.contenido}</p>
      <AdjuntosElemento
        idElemento={entrega.id}
        enlace={entrega.enlace}
        archivo={entrega.archivo}
        urlArchivo={urlArchivoEntrega(idActividad, entrega.idInstrumento, entrega.id)}
      />
    </div>
  )
}

// Una actividad externa: el enlace para hacerla y, debajo, la entrega con la
// que se marca como hecha.
function FilaActividadExterna({
  idActividad,
  instrumento,
  puedeEntregar,
}: {
  idActividad: string
  instrumento: InstrumentoPorResponder
  puedeEntregar: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  const [editando, setEditando] = useState(false)
  const entregas = useEntregas(idActividad, abierta ? instrumento.id : '')
  const entrega = entregas.data?.[0] ?? null

  return (
    <li className={styles.fila}>
      <div className={styles.cabecera}>
        <span className={styles.datos}>
          <span className={styles.nombre}>{tituloDe(instrumento)}</span>
          <span className={styles.detalle}>
            {[
              instrumento.fechaPlanificada
                ? `Para el ${formatearFecha(instrumento.fechaPlanificada)}`
                : null,
              instrumento.completadoEn
                ? `Entregada el ${formatearFechaHora(instrumento.completadoEn)}`
                : 'Pendiente',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span className={styles.accionesFila}>
          {instrumento.enlace ? (
            <a
              href={instrumento.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.enlace}
            >
              Abrir actividad
            </a>
          ) : (
            <span className={styles.apagado}>Sin enlace todavía</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={abierta}
            onClick={() => {
              setAbierta((previo) => !previo)
              setEditando(false)
            }}
          >
            {instrumento.completadoEn ? 'Ver entrega' : 'Entregar'}
          </Button>
        </span>
      </div>
      {abierta ? (
        <div className={styles.panel}>
          {entregas.isPending ? (
            <IconoCargando size={16} />
          ) : entregas.isError ? (
            <AvisoError mensaje="No pudimos cargar tu entrega." />
          ) : !instrumento.enlace ? (
            <p className={styles.apagado}>
              Podrás entregar cuando quien organiza agregue el enlace.
            </p>
          ) : entrega && !editando ? (
            <>
              <LecturaEntrega idActividad={idActividad} entrega={entrega} />
              {puedeEntregar ? (
                <div className={styles.acciones}>
                  <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
                    Editar
                  </Button>
                </div>
              ) : null}
            </>
          ) : puedeEntregar ? (
            <FormularioEntrega
              idActividad={idActividad}
              instrumento={instrumento}
              entrega={entrega}
              onListo={() => (entrega ? setEditando(false) : setAbierta(false))}
            />
          ) : (
            <p className={styles.apagado}>
              Las actividades se entregan durante el desarrollo y el cierre.
            </p>
          )}
        </div>
      ) : null}
    </li>
  )
}

// Lo que le dieron sus compañeros en conjunto (P-08): sin quién dio qué, sin
// su autoasignación y sin el puntaje, que llega con Mis resultados. Solo con
// dos o más compañeros que respondieron.
function MisResultadosPares({
  idActividad,
  idInstrumento,
}: {
  idActividad: string
  idInstrumento: string
}) {
  const resultados = useMisResultadosPares(idActividad, idInstrumento)
  if (resultados.isPending) return <IconoCargando size={20} />
  if (resultados.isError) return <AvisoError mensaje="No pudimos cargar tus resultados." />
  const { parteIgual, respondieron, porAccion } = resultados.data
  if (!porAccion) {
    return (
      <p className={styles.apagado}>
        Verás el promedio de lo que te dieron tus compañeros, sin saber quién dio qué, cuando al
        menos dos hayan respondido.{' '}
        {respondieron === 1 ? 'Por ahora respondió uno.' : 'Por ahora no responde nadie.'}
      </p>
    )
  }
  const acciones = PLANTILLAS_INSTRUMENTO.evaluacion_pares.reactivos
  return (
    <div className={styles.resultados}>
      <p className={styles.apagado}>
        Promedio de lo que te dieron {respondieron} compañeros. Si todos aportaran igual, a cada
        quien le tocaría {parteIgual} %.
      </p>
      <Table caption="Lo que te dieron tus compañeros">
        <thead>
          <TableRow>
            <TableHeaderCell>Acción</TableHeaderCell>
            <TableHeaderCell className={styles.numero}>Te dieron</TableHeaderCell>
          </TableRow>
        </thead>
        <tbody>
          {acciones.map((accion) => (
            <TableRow key={accion.clave}>
              <TableCell>{accion.texto}</TableCell>
              <TableCell className={styles.numero}>
                {porAccion.find((a) => a.clave === accion.clave)?.recibido ?? 0} %
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

function VistaParticipante({
  idActividad,
  idEquipo,
  aspecto,
  puedeResponder,
}: {
  idActividad: string
  idEquipo: string
  aspecto: string
  puedeResponder: boolean
}) {
  const instrumentos = useMisInstrumentos(idActividad)
  const [resultadosDe, setResultadosDe] = useState<InstrumentoPorResponder | null>(null)
  if (instrumentos.isPending) return <IconoCargando size={20} />
  if (instrumentos.isError) return <AvisoError mensaje="No pudimos cargar tus instrumentos." />

  const delAspecto = instrumentos.data.filter((i) => i.aspecto.clave === aspecto)
  if (delAspecto.length === 0) {
    return (
      <p className={styles.apagado}>
        Quien organiza todavía no elige instrumentos para este aspecto.
      </p>
    )
  }

  return (
    <ul className={styles.lista}>
      {delAspecto.map((instrumento) =>
        instrumento.formato === 'enlace' ? (
          <FilaActividadExterna
            key={instrumento.id}
            idActividad={idActividad}
            instrumento={instrumento}
            puedeEntregar={puedeResponder}
          />
        ) : (
          <li key={instrumento.id} className={styles.fila}>
            <div className={styles.cabecera}>
              <span className={styles.datos}>
                <span className={styles.nombre}>{tituloDe(instrumento)}</span>
                <span className={styles.detalle}>
                  {[
                    instrumento.fechaPlanificada
                      ? `Para el ${formatearFecha(instrumento.fechaPlanificada)}`
                      : null,
                    instrumento.completadoEn
                      ? `Respondida el ${formatearFechaHora(instrumento.completadoEn)}`
                      : 'Pendiente',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className={styles.accionesFila}>
                {instrumento.clavePlantilla === 'evaluacion_pares' ? (
                  <Button variant="ghost" size="sm" onClick={() => setResultadosDe(instrumento)}>
                    Tus resultados
                  </Button>
                ) : null}
                <Link
                  to={`/equipos/${idEquipo}/proceso/${aspecto}/${instrumento.id}`}
                  className={styles.enlace}
                >
                  {instrumento.completadoEn ? 'Ver respuestas' : 'Responder'}
                </Link>
              </span>
            </div>
          </li>
        ),
      )}
      {resultadosDe ? (
        <PanelLateral
          abierto
          titulo="Lo que te dieron tus compañeros"
          descripcion={descripcionDe(resultadosDe)}
          onCerrar={() => setResultadosDe(null)}
        >
          <MisResultadosPares idActividad={idActividad} idInstrumento={resultadosDe.id} />
        </PanelLateral>
      ) : null}
    </ul>
  )
}

/*
 * Quien organiza: quién del equipo completó cada instancia.
 */

function DetalleRespuestas({
  idActividad,
  instrumento,
  idMembresia,
  integrantes,
}: {
  idActividad: string
  instrumento: CumplimientoDeInstrumento
  idMembresia: string
  integrantes: IntegranteEquipo[]
}) {
  const respuestas = useRespuestas(idActividad, instrumento.id)
  if (respuestas.isPending) return <IconoCargando size={20} />
  if (respuestas.isError || !instrumento.clavePlantilla) {
    return <AvisoError mensaje="No pudimos cargar sus respuestas." />
  }
  const suyas = respuestas.data.find((r) => r.idMembresia === idMembresia)
  if (!suyas) return <p className={styles.apagado}>Todavía no responde.</p>
  const plantilla = PLANTILLAS_INSTRUMENTO[instrumento.clavePlantilla]
  const puntajeAuto =
    plantilla.campo === 'likert'
      ? puntajeLikert(plantilla, suyas.respuestas as Record<string, number>)
      : null
  if (plantilla.campo === 'distribucion_integrantes') {
    // Su reparto: una fila por acción y una columna por integrante. Su propia
    // columna va primero y en gris: es la autoasignación, que no cuenta.
    const repartos = suyas.respuestas as RespuestasDistribucion
    const ids = Object.keys(repartos[plantilla.reactivos[0].clave] ?? {}).sort((a, b) =>
      a === idMembresia ? -1 : b === idMembresia ? 1 : 0,
    )
    const nombreDe = (id: string) =>
      integrantes.find((i) => i.idMembresia === id)?.nombre ?? 'Ya no está en el equipo'
    return (
      <Table caption="Su reparto en cada acción">
        <thead>
          <TableRow>
            <TableHeaderCell>Acción</TableHeaderCell>
            {ids.map((id) => (
              <TableHeaderCell key={id} className={styles.numero}>
                <span className={styles.columna}>
                  {nombreDe(id)}
                  {id === idMembresia ? (
                    <span className={styles.detalle}>Autoasignación</span>
                  ) : null}
                </span>
              </TableHeaderCell>
            ))}
          </TableRow>
        </thead>
        <tbody>
          {plantilla.reactivos.map((accion) => (
            <TableRow key={accion.clave}>
              <TableCell>{accion.texto}</TableCell>
              {ids.map((id) => (
                <TableCell
                  key={id}
                  className={
                    id === idMembresia ? `${styles.numero} ${styles.contraste}` : styles.numero
                  }
                >
                  {repartos[accion.clave]?.[id] ?? '—'} %
                </TableCell>
              ))}
            </TableRow>
          ))}
        </tbody>
      </Table>
    )
  }
  return (
    <div className={styles.entrega}>
      {puntajeAuto !== null ? (
        <p className={styles.apagado}>
          Puntaje: {formatearPuntaje(puntajeAuto)}, calculado de sus respuestas.
        </p>
      ) : null}
      <Table caption="Sus respuestas">
        <thead>
          <TableRow>
            <TableHeaderCell>Reactivo</TableHeaderCell>
            <TableHeaderCell>Respuesta</TableHeaderCell>
          </TableRow>
        </thead>
        <tbody>
          {plantilla.reactivos.map((reactivo) => (
            <TableRow key={reactivo.clave}>
              <TableCell>{reactivo.texto}</TableCell>
              <TableCell className={styles.sinCorte}>
                {ESCALA_LIKERT.find((o) => o.valor === suyas.respuestas[reactivo.clave])
                  ?.etiqueta ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

// La entrega de una actividad externa y, debajo, su puntaje: capturarlo es
// lo que la marca como revisada (nucleo §10.3).
function DetalleEntrega({
  idActividad,
  instrumento,
  idMembresia,
  puedeCapturar,
}: {
  idActividad: string
  instrumento: CumplimientoDeInstrumento
  idMembresia: string
  puedeCapturar: boolean
}) {
  const entregas = useEntregas(idActividad, instrumento.id)
  const capturar = useCapturarPuntajeMutation(idActividad)
  if (entregas.isPending) return <IconoCargando size={20} />
  if (entregas.isError) return <AvisoError mensaje="No pudimos cargar su entrega." />
  const suya = entregas.data.find((e) => e.idMembresia === idMembresia)
  const puntaje = instrumento.puntajes.find((p) => p.idMembresia === idMembresia)?.valor ?? null
  return (
    <div className={styles.entrega}>
      {suya ? (
        <LecturaEntrega idActividad={idActividad} entrega={suya} />
      ) : (
        <p className={styles.apagado}>Todavía no entrega.</p>
      )}
      <div className={styles.puntajeCaptura}>
        <span className={styles.nombre}>Puntaje</span>
        {puedeCapturar ? (
          <CampoPuntaje
            etiqueta="Puntaje de esta actividad"
            valor={puntaje}
            onGuardar={(valor) =>
              capturar.mutateAsync({ idInstrumento: instrumento.id, idMembresia, valor })
            }
          />
        ) : (
          <span>{puntaje === null ? 'Sin calificar' : formatearPuntaje(puntaje)}</span>
        )}
      </div>
    </div>
  )
}

// Los resultados de pares del equipo (nucleo §10.2): por integrante, su
// puntaje y una tabla con lo que le dieron sus compañeros en cada acción y,
// como contraste, lo que se asignó a sí mismo, que no entra en el cálculo.
function ResultadosPares({
  idActividad,
  idInstrumento,
  idEquipo,
  integrantes,
}: {
  idActividad: string
  idInstrumento: string
  idEquipo: string
  integrantes: IntegranteEquipo[]
}) {
  const resultados = useResultadosPares(idActividad, idInstrumento, idEquipo)
  if (resultados.isPending) return <IconoCargando size={20} />
  if (resultados.isError) return <AvisoError mensaje="No pudimos cargar los resultados." />
  const acciones = PLANTILLAS_INSTRUMENTO.evaluacion_pares.reactivos
  const n = resultados.data.integrantes.length
  return (
    <div className={styles.resultados}>
      <p className={styles.apagado}>
        Con {n} integrantes, la parte igual es {Math.round((100 / n) * 100) / 100} %. La
        autoasignación no cuenta para el puntaje.
      </p>
      {resultados.data.integrantes.map((r) => {
        const nombre =
          integrantes.find((i) => i.idMembresia === r.idMembresia)?.nombre ?? 'Integrante'
        return (
          <section key={r.idMembresia} className={styles.resultado}>
            <h3 className={styles.integrante}>
              {nombre}
              <span className={styles.puntaje}>
                {r.puntaje === null ? 'Aún no lo evalúa nadie' : `${r.puntaje} %`}
              </span>
            </h3>
            <Table caption={`Resultados de ${nombre}`}>
              <thead>
                <TableRow>
                  <TableHeaderCell>Acción</TableHeaderCell>
                  <TableHeaderCell className={styles.numero}>De sus compañeros</TableHeaderCell>
                  <TableHeaderCell className={styles.numero}>Se asignó</TableHeaderCell>
                </TableRow>
              </thead>
              <tbody>
                {acciones.map((accion, i) => {
                  const { recibido, autoasignado } = r.porAccion[i]
                  return (
                    <TableRow key={accion.clave}>
                      <TableCell>{accion.texto}</TableCell>
                      <TableCell className={styles.numero}>
                        {recibido === null ? '—' : `${recibido} %`}
                      </TableCell>
                      <TableCell className={`${styles.numero} ${styles.contraste}`}>
                        {autoasignado === null ? 'No respondió' : `${autoasignado} %`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </tbody>
            </Table>
          </section>
        )
      })}
    </div>
  )
}

const INSTANCIAS_POR_PAGINA = 10

function VistaOrganizador({
  idActividad,
  idAspecto,
  idEquipo,
  puedeCapturar,
  integrantes,
}: {
  idActividad: string
  idAspecto: string
  idEquipo: string
  /** Con la calificación habilitada y el permiso de capturar. */
  puedeCapturar: boolean
  integrantes: IntegranteEquipo[]
}) {
  const cumplimiento = useCumplimiento(idActividad, idAspecto)
  const [resultadosDe, setResultadosDe] = useState<CumplimientoDeInstrumento | null>(null)
  const [pagina, setPagina] = useState(0)
  const [abierto, setAbierto] = useState<{
    instrumento: CumplimientoDeInstrumento
    integrante: IntegranteEquipo
  } | null>(null)

  if (cumplimiento.isPending) return <IconoCargando size={20} />
  if (cumplimiento.isError) return <AvisoError mensaje="No pudimos cargar este aspecto." />
  if (cumplimiento.data.length === 0) {
    return <p className={styles.apagado}>Todavía no eliges instrumentos para este aspecto.</p>
  }
  if (integrantes.length === 0) {
    return <p className={styles.apagado}>Este equipo todavía no tiene participantes.</p>
  }

  const { visibles, pagina: paginaActual } = rebanar(
    cumplimiento.data,
    pagina,
    INSTANCIAS_POR_PAGINA,
  )

  // Una fila por instancia y una columna por integrante: un equipo tiene
  // pocas personas, pero las instancias crecen con la periodicidad, así que
  // crecen hacia abajo y se paginan.
  return (
    <>
      <Table caption="Quién completó cada instrumento">
        <thead>
          <TableRow>
            <TableHeaderCell>Instrumento</TableHeaderCell>
            {integrantes.map((integrante) => (
              <TableHeaderCell key={integrante.idMembresia}>{integrante.nombre}</TableHeaderCell>
            ))}
          </TableRow>
        </thead>
        <tbody>
          {visibles.map((instrumento) => (
            <TableRow key={instrumento.id}>
              <TableHeaderCell scope="row">
                <span className={styles.columna}>
                  {instrumento.fechaPlanificada
                    ? formatearFecha(instrumento.fechaPlanificada)
                    : 'Sin fecha'}
                  <span className={styles.detalle}>{tituloDe(instrumento)}</span>
                  {instrumento.clavePlantilla === 'evaluacion_pares' ? (
                    <button
                      type="button"
                      className={styles.celdaCompletada}
                      onClick={() => setResultadosDe(instrumento)}
                    >
                      Ver resultados
                    </button>
                  ) : null}
                </span>
              </TableHeaderCell>
              {integrantes.map((integrante) => {
                const completado = instrumento.completados.find(
                  (c) => c.idMembresia === integrante.idMembresia,
                )
                return (
                  <TableCell key={integrante.idMembresia}>
                    {completado ? (
                      <button
                        type="button"
                        className={styles.celdaCompletada}
                        onClick={() => setAbierto({ instrumento, integrante })}
                      >
                        {instrumento.formato === 'plantilla' ? 'Respondió' : 'Entregó'} el{' '}
                        {formatearFechaHora(completado.fecha)}
                      </button>
                    ) : null}
                    {/* Revisado: una actividad externa con puntaje capturado. */}
                    {instrumento.formato === 'enlace' && completado ? (
                      <span className={styles.revision}>
                        {(() => {
                          const p = instrumento.puntajes.find(
                            (x) => x.idMembresia === integrante.idMembresia,
                          )
                          return p ? `Puntaje ${formatearPuntaje(p.valor)}` : 'Por calificar'
                        })()}
                      </span>
                    ) : null}
                    {completado ? null : <span className={styles.apagado}>Pendiente</span>}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </tbody>
      </Table>
      <Paginacion
        total={cumplimiento.data.length}
        tamano={INSTANCIAS_POR_PAGINA}
        pagina={paginaActual}
        onCambiar={setPagina}
        etiqueta="Instrumentos"
      />

      {abierto ? (
        <PanelLateral
          abierto
          titulo={abierto.integrante.nombre}
          descripcion={descripcionDe(abierto.instrumento)}
          onCerrar={() => setAbierto(null)}
        >
          {abierto.instrumento.formato === 'plantilla' ? (
            <DetalleRespuestas
              idActividad={idActividad}
              instrumento={abierto.instrumento}
              idMembresia={abierto.integrante.idMembresia}
              integrantes={integrantes}
            />
          ) : (
            <DetalleEntrega
              idActividad={idActividad}
              instrumento={
                cumplimiento.data.find((i) => i.id === abierto.instrumento.id) ??
                abierto.instrumento
              }
              idMembresia={abierto.integrante.idMembresia}
              puedeCapturar={puedeCapturar}
            />
          )}
        </PanelLateral>
      ) : null}

      {resultadosDe ? (
        <PanelLateral
          abierto
          titulo="Resultados de la evaluación por pares"
          descripcion={descripcionDe(resultadosDe)}
          onCerrar={() => setResultadosDe(null)}
        >
          <ResultadosPares
            idActividad={idActividad}
            idInstrumento={resultadosDe.id}
            idEquipo={idEquipo}
            integrantes={integrantes}
          />
        </PanelLateral>
      ) : null}
    </>
  )
}

// Un aspecto del proceso colaborativo dentro del espacio de un equipo
// (nucleo §10.6): quien participa responde o entrega sus instrumentos; quien
// organiza ve quién del equipo los completó y abre cada respuesta o entrega.
export function PantallaAspectoProceso() {
  const { idEquipo = '', aspecto = '' } = useParams<{ idEquipo: string; aspecto: string }>()
  const equipo = useEquipo(idEquipo)
  const idActividad = equipo.data?.idActividad ?? ''
  const actividad = useActividad(idActividad, { enabled: Boolean(idActividad) })
  const ponderacion = usePonderacion(idActividad)
  const presentacion = TAREAS_PROCESO_COLABORATIVO.find((t) => t.tarea === aspecto)
  const titulo = presentacion?.etiqueta ?? 'Proceso colaborativo'
  const marco = { idEquipo, seccionActiva: 'proceso' as const, aspecto, titulo }

  if (equipo.isPending || actividad.isPending || ponderacion.isPending) {
    return (
      <AppShellEquipo {...marco}>
        <div className={styles.cargando} role="status" aria-label="Cargando el aspecto">
          <IconoCargando size={24} />
        </div>
      </AppShellEquipo>
    )
  }

  const idAspecto = ponderacion.data?.componentes
    .flatMap((c) => c.aspectos)
    .find((a) => a.clave === aspecto)?.id
  if (!equipo.data || !actividad.data || !presentacion || !idAspecto) {
    return (
      <AppShellEquipo {...marco}>
        <AvisoError mensaje="No encontramos este aspecto del proceso colaborativo." />
      </AppShellEquipo>
    )
  }

  const participa = actividad.data.rol === 'participante'
  const esMiEquipo = actividad.data.idMiEquipo === idEquipo

  return (
    <AppShellEquipo {...marco}>
      <Card className={styles.tarjeta}>
        <p className={styles.descripcion}>{presentacion.descripcion}</p>
        {participa ? (
          esMiEquipo ? (
            <VistaParticipante
              idActividad={idActividad}
              idEquipo={idEquipo}
              aspecto={aspecto}
              puedeResponder={
                actividad.data.capacidades?.includes('responder_instrumento') ?? false
              }
            />
          ) : (
            <p className={styles.apagado}>Solo ves el proceso colaborativo de tu equipo.</p>
          )
        ) : (
          <VistaOrganizador
            idActividad={idActividad}
            idAspecto={idAspecto}
            idEquipo={idEquipo}
            puedeCapturar={
              actividad.data.configuracion?.calificacion === 'habilitada' &&
              (actividad.data.capacidades?.includes('capturar_puntaje') ?? false)
            }
            integrantes={equipo.data.integrantes.filter((i) => i.rol === 'participante')}
          />
        )}
      </Card>
    </AppShellEquipo>
  )
}
