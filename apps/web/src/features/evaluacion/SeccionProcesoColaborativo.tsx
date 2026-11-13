import {
  ASPECTOS_PROCESO,
  CLAVES_COMPONENTE,
  NOMBRE_TIPO,
  aspectoDeshabilitado,
  formatosPara,
  sumaDePesosActivos,
  type AspectoDePonderacion,
  type Periodicidad,
  type TipoInstrumento,
} from '@plataforma/shared'
import { Fragment, useState, type ChangeEvent } from 'react'
import { Badge, Button, Card, IconoCargando, Select } from '../../components/ui'
import {
  OPCIONES_PERIODICIDAD,
  TAREAS_PROCESO_COLABORATIVO,
} from '../actividades/configuracionFunciones'
import {
  IndicadorCampo,
  MENSAJE_ERROR_GUARDADO,
  type EstadoCampo,
} from '../actividades/IndicadorCampo'
import type { Actividad } from '../actividades/tipos'
import { AvisoSuma } from './AvisoSuma'
import { CampoPeso } from './CampoPeso'
import { PanelCalendarioInstrumentos } from './PanelCalendarioInstrumentos'
import { ErrorPonderacion, type DefinicionInstrumentos } from './ponderacion.api'
import { periodicidadDeAspecto } from './ponderacion'
import { useDefinirInstrumentosMutation, usePonderacion } from './usePonderacion'
import styles from './SeccionProcesoColaborativo.module.css'

type PeriodicidadElegida = Periodicidad | 'ninguna'

// Si alguna instancia ya se ajustó en el calendario (formato distinto del que
// trae al crearse, un enlace escrito o una fecha movida): regenerarlas lo
// perdería.
function tieneAjustes(aspecto: AspectoDePonderacion, periodicidad: string): boolean {
  return (
    periodicidad === 'personalizada' ||
    aspecto.instrumentos.some(
      (i) =>
        i.enlace !== null ||
        (i.tipo !== null && i.origen !== formatosPara(aspecto.clave, i.tipo)[0]),
    )
  )
}

// Proceso colaborativo (general §4.2, nucleo §10.1): por cada aspecto, el tipo
// de instrumento, cada cuánto se aplica y su porcentaje del proceso. El
// formato de cada aplicación (plantilla, enlace o captura manual) se elige en
// su calendario, como las fechas de Avances. La evaluación por pares es la
// plantilla del tipo coevaluación (P-38).
export function SeccionProcesoColaborativo({ actividad }: { actividad: Actividad }) {
  const ponderacionQuery = usePonderacion(actividad.id)
  const definir = useDefinirInstrumentosMutation(actividad.id)
  const [estados, setEstados] = useState<Record<string, EstadoCampo>>({})
  const [idCalendario, setIdCalendario] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<{
    idAspecto: string
    definicion: DefinicionInstrumentos
  } | null>(null)

  const puedeConfigurar = actividad.capacidades?.includes('configurar_calificacion') ?? false
  const calificacionHabilitada = actividad.configuracion?.calificacion === 'habilitada'
  const configuracion = actividad.configuracion ?? {}
  const fechaInicio = actividad.fechaInicio ?? ''
  const fechaTermino = actividad.fechaTermino ?? fechaInicio

  async function guardar(idAspecto: string, definicion: DefinicionInstrumentos) {
    setPendiente(null)
    setEstados((previo) => ({ ...previo, [idAspecto]: { status: 'guardando' } }))
    try {
      await definir.mutateAsync({ idAspecto, definicion })
      setEstados((previo) => ({ ...previo, [idAspecto]: { status: 'guardado' } }))
    } catch (error) {
      setEstados((previo) => ({
        ...previo,
        [idAspecto]: {
          status: 'error',
          mensaje: error instanceof ErrorPonderacion ? error.message : MENSAJE_ERROR_GUARDADO,
        },
      }))
    }
  }

  if (ponderacionQuery.isPending) return <IconoCargando size={20} />
  if (ponderacionQuery.isError) {
    return <p className={styles.descripcion}>No pudimos cargar el proceso colaborativo.</p>
  }

  const proceso = ponderacionQuery.data.componentes.find(
    (c) => c.clave === CLAVES_COMPONENTE.proceso,
  )
  const aspectos = proceso?.aspectos ?? []
  const apagado = (aspecto: AspectoDePonderacion) =>
    aspectoDeshabilitado(CLAVES_COMPONENTE.proceso, aspecto.clave, configuracion)
  const aspectoCalendario = aspectos.find((a) => a.id === idCalendario)
  const partes = aspectos.map((a) => ({ peso: a.peso, apagado: apagado(a) }))
  const columnas = calificacionHabilitada ? 5 : 4

  return (
    <section aria-labelledby="titulo-proceso-colaborativo" className={styles.seccion}>
      <h2 id="titulo-proceso-colaborativo" className={styles.titulo}>
        Proceso colaborativo
      </h2>
      <p className={styles.descripcion}>
        Con qué instrumento se evalúa cada aspecto del trabajo colaborativo y cada cuánto.
      </p>

      <Card className={styles.tarjeta}>
        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col" className={styles.encabezadoColumna}>
                  Aspecto
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Instrumento
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Periodicidad
                </th>
                {calificacionHabilitada ? (
                  <th scope="col" className={styles.encabezadoColumna}>
                    Porcentaje
                  </th>
                ) : null}
                <th scope="col" className={styles.encabezadoColumna}>
                  <span className={styles.soloLectorPantalla}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {aspectos.map((aspecto) => {
                const catalogo = ASPECTOS_PROCESO.find((a) => a.clave === aspecto.clave)
                const presentacion = TAREAS_PROCESO_COLABORATIVO.find(
                  (t) => t.tarea === aspecto.clave,
                )
                const tipo = aspecto.instrumentos[0]?.tipo ?? null
                // Con respuestas, sus instancias ya no se reemplazan (nucleo
                // §10.1): tipo y periodicidad quedan fijos.
                const conRespuestas = aspecto.instrumentos.some((i) => i.conRespuestas)
                const periodicidad = periodicidadDeAspecto(aspecto, fechaInicio, fechaTermino)

                // Cambiar el tipo o la periodicidad regenera las aplicaciones;
                // si ya tenían ajustes, se pide confirmación antes.
                function cambiar(definicion: DefinicionInstrumentos) {
                  if (tieneAjustes(aspecto, periodicidad))
                    setPendiente({ idAspecto: aspecto.id, definicion })
                  else void guardar(aspecto.id, definicion)
                }

                return (
                  <Fragment key={aspecto.id}>
                    <tr>
                      <th scope="row" className={styles.celdaTarea}>
                        <span className={styles.nombreTarea}>{aspecto.nombre}</span>
                        {presentacion ? (
                          <span className={styles.descripcionTarea}>
                            {presentacion.descripcion}
                          </span>
                        ) : null}
                      </th>
                      <td className={styles.celdaControl}>
                        <div className={styles.controles}>
                          <Select
                            label={`Instrumento de ${aspecto.nombre}`}
                            ocultarEtiqueta
                            value={tipo ?? ''}
                            disabled={!puedeConfigurar || conRespuestas}
                            onChange={(evento: ChangeEvent<HTMLSelectElement>) => {
                              const nuevo = evento.target.value as TipoInstrumento | ''
                              cambiar(
                                nuevo === ''
                                  ? { tipo: null }
                                  : {
                                      tipo: nuevo,
                                      // Un calendario ajustado a mano no se
                                      // puede regenerar igual: se parte de una.
                                      periodicidad:
                                        periodicidad === 'personalizada' ? 'ninguna' : periodicidad,
                                    },
                              )
                            }}
                          >
                            <option value="">Ninguno</option>
                            {(catalogo?.tipos ?? []).map((t) => (
                              <option key={t} value={t}>
                                {NOMBRE_TIPO[t]}
                              </option>
                            ))}
                          </Select>
                          {/* Sin instrumento conserva su porcentaje: falta
                                elegirlo, no descontarlo. */}
                          {calificacionHabilitada && !tipo && aspecto.peso > 0 ? (
                            <Badge variant="warning">Elige un instrumento</Badge>
                          ) : null}
                          {conRespuestas ? <Badge variant="neutral">Con respuestas</Badge> : null}
                          {aspecto.instrumentos.some((i) => i.origen === 'enlace' && !i.enlace) ? (
                            <Badge variant="warning">Falta el enlace</Badge>
                          ) : null}
                          <IndicadorCampo estado={estados[aspecto.id]} />
                        </div>
                      </td>
                      <td className={styles.celdaControl}>
                        <Select
                          label={`Periodicidad de ${aspecto.nombre}`}
                          ocultarEtiqueta
                          value={periodicidad}
                          disabled={!puedeConfigurar || !tipo || conRespuestas}
                          onChange={(evento: ChangeEvent<HTMLSelectElement>) => {
                            if (tipo && evento.target.value !== 'personalizada') {
                              cambiar({
                                tipo,
                                periodicidad: evento.target.value as PeriodicidadElegida,
                              })
                            }
                          }}
                        >
                          {OPCIONES_PERIODICIDAD.map((opcion) => (
                            <option key={opcion.valor} value={opcion.valor}>
                              {opcion.valor === 'ninguna' ? 'Una sola vez' : opcion.etiqueta}
                            </option>
                          ))}
                          {periodicidad === 'personalizada' ? (
                            <option value="personalizada" disabled>
                              Personalizada
                            </option>
                          ) : null}
                        </Select>
                      </td>
                      {calificacionHabilitada ? (
                        <td className={styles.celdaPeso}>
                          <CampoPeso
                            idActividad={actividad.id}
                            parte="aspecto"
                            id={aspecto.id}
                            nombre={aspecto.nombre}
                            peso={aspecto.peso}
                            apagado={apagado(aspecto)}
                            puedeEditar={puedeConfigurar}
                          />
                        </td>
                      ) : null}
                      <td className={styles.celdaAccion}>
                        {tipo ? (
                          <Button variant="secondary" onClick={() => setIdCalendario(aspecto.id)}>
                            Editar calendario
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {pendiente?.idAspecto === aspecto.id ? (
                      <tr className={styles.filaConfirmacion}>
                        <td colSpan={columnas}>
                          <div className={styles.confirmacion}>
                            <p className={styles.confirmacionTexto}>
                              Esto reemplaza las {aspecto.instrumentos.length} aplicaciones
                              actuales, con los formatos y enlaces que ajustaste.
                            </p>
                            <div className={styles.confirmacionAcciones}>
                              <Button
                                size="sm"
                                onClick={() => void guardar(aspecto.id, pendiente.definicion)}
                              >
                                Reemplazar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPendiente(null)}
                              >
                                Mantener las actuales
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
            {calificacionHabilitada && sumaDePesosActivos(partes) !== 100 ? (
              <tfoot>
                <tr>
                  <td colSpan={columnas} className={styles.pie}>
                    <AvisoSuma partes={partes} />
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>

      {aspectoCalendario ? (
        <PanelCalendarioInstrumentos
          idActividad={actividad.id}
          aspecto={aspectoCalendario}
          puedeAjustar={puedeConfigurar}
          onCerrar={() => setIdCalendario(null)}
        />
      ) : null}
    </section>
  )
}
