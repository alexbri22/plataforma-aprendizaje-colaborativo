import type {
  ElementoEspacioEquipo,
  EstadoEspacioEquipo,
  FuncionSeguimiento,
  Periodicidad,
} from '@plataforma/shared'
import { Fragment, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button, Card, IconoCargando, Select } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { inferirPeriodicidad, resumirCalendario } from './calendario'
import {
  ELEMENTOS_ESPACIO_EQUIPO_UI,
  OPCIONES_ELEMENTO_ESPACIO_EQUIPO,
  OPCIONES_PERIODICIDAD,
} from './configuracionFunciones'
import { formatearFecha } from './formato'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { PanelCalendarioAvances } from './PanelCalendarioAvances'
import { useDefinirPeriodosMutation, usePeriodos } from './useActividades'
import styles from './SeccionProyectoColaborativo.module.css'

type PeriodicidadElegida = Periodicidad | 'ninguna'

function NoAplica() {
  return (
    <span className={styles.noAplica}>
      <span aria-hidden="true">—</span>
      <span className={styles.soloLectorPantalla}>No aplica</span>
    </span>
  )
}

export interface SeccionProyectoColaborativoProps {
  idActividad: string
  estadoEspacioEquipo: EstadoEspacioEquipo
  /** configurar_funciones: cambiar el estado de un elemento o regenerar el calendario. */
  puedeConfigurar: boolean
  /** ajustar_periodos: mover fechas de un avance o cancelarlo. */
  puedeAjustarPeriodos: boolean
  estados: Record<string, EstadoCampo>
  /** Resuelve a true si el servidor aceptó el cambio; los errores ya los muestra su indicador. */
  guardar: (
    clave: string,
    funcion: FuncionSeguimiento,
    cuerpo: Record<string, string>,
  ) => Promise<boolean>
}

// Metas, Avances y Recursos: el espacio de equipo que la actividad pone a
// disposición. Los tres tienen estado (Deshabilitado / Opcional /
// Obligatorio); solo Avances tiene calendario, porque es lo que hay que
// revisar cada cierto tiempo (docs/diseno-desarrollo-nucleo.md §9.2).
export function SeccionProyectoColaborativo({
  idActividad,
  estadoEspacioEquipo,
  puedeConfigurar,
  puedeAjustarPeriodos,
  estados,
  guardar,
}: SeccionProyectoColaborativoProps) {
  const periodosQuery = usePeriodos(idActividad)
  const definirMutacion = useDefinirPeriodosMutation(idActividad)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [pendiente, setPendiente] = useState<PeriodicidadElegida | null>(null)
  const [estadoCalendario, setEstadoCalendario] = useState<EstadoCampo | undefined>()

  const periodos = periodosQuery.data ?? []
  const inferida = inferirPeriodicidad(periodos)
  const resumen = resumirCalendario(periodos)
  const avancesHabilitado = estadoEspacioEquipo.avances !== 'deshabilitado'

  async function aplicarPeriodicidad(nueva: PeriodicidadElegida) {
    setPendiente(null)
    setEstadoCalendario({ status: 'guardando' })
    try {
      await definirMutacion.mutateAsync(nueva)
      setEstadoCalendario({ status: 'guardado' })
    } catch (error) {
      setEstadoCalendario({
        status: 'error',
        mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  // Regenerar descarta los ajustes hechos a mano y los avances cancelados, así
  // que si ya hay un calendario se pide confirmación antes (patrón inline,
  // como el cierre de inscripción en PantallaResumenActividad).
  function elegirPeriodicidad(evento: ChangeEvent<HTMLSelectElement>) {
    const nueva = evento.target.value as PeriodicidadElegida
    if (nueva === inferida) return
    if (periodos.length > 0) setPendiente(nueva)
    else void aplicarPeriodicidad(nueva)
  }

  // El PUT de espacio_equipo lleva los tres elementos a la vez. Si cada cambio
  // se armara con lo último que devolvió la consulta, dos cambios seguidos
  // (antes de que la consulta se refresque) partirían del mismo estado viejo y
  // el que llegara al servidor al final pisaría al otro. Por eso los guardados
  // se hacen de uno en uno, y cada uno se arma en el momento de enviarse sobre
  // el último estado que el servidor confirmó. Uno que falla no lo cambia: su
  // indicador muestra el error y no se guarda a escondidas con el siguiente.
  const confirmado = useRef(estadoEspacioEquipo)
  const cola = useRef<Promise<unknown>>(Promise.resolve())
  const guardadosPendientes = useRef(0)

  // Lo que llega del servidor manda cuando no hay guardados en curso (otra
  // persona pudo cambiar algo). Se compara el contenido y no el objeto: la
  // pantalla se vuelve a pintar con el estado viejo justo después de guardar,
  // y eso no debe reemplazar lo que ya se confirmó.
  const contenidoDelServidor = JSON.stringify(estadoEspacioEquipo)
  useEffect(() => {
    if (guardadosPendientes.current === 0) confirmado.current = JSON.parse(contenidoDelServidor)
  }, [contenidoDelServidor])

  function elegirEstado(elemento: ElementoEspacioEquipo, valor: string) {
    guardadosPendientes.current += 1
    cola.current = cola.current
      .catch(() => undefined) // un rechazo no debe dejar sin ejecutar los guardados que siguen
      .then(async () => {
        const cuerpo = { ...confirmado.current, [elemento]: valor }
        const guardado = await guardar(`espacio_equipo:${elemento}`, 'espacio_equipo', cuerpo)
        if (guardado) confirmado.current = cuerpo
      })
      .finally(() => {
        guardadosPendientes.current -= 1
      })
  }

  const etiquetaPendiente = OPCIONES_PERIODICIDAD.find((o) => o.valor === pendiente)?.etiqueta

  function celdaPeriodicidad() {
    if (!avancesHabilitado) {
      return <p className={styles.ayuda}>Habilita Avances para definir su calendario.</p>
    }
    if (periodosQuery.isPending) return <IconoCargando size={16} />
    if (periodosQuery.isError) {
      return <p className={styles.ayuda}>No pudimos cargar el calendario.</p>
    }
    return (
      <>
        <Select
          label="Periodicidad de Avances"
          ocultarEtiqueta
          value={inferida}
          disabled={!puedeConfigurar || definirMutacion.isPending}
          onChange={elegirPeriodicidad}
        >
          {OPCIONES_PERIODICIDAD.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
          {inferida === 'personalizada' ? (
            <option value="personalizada" disabled>
              Personalizada
            </option>
          ) : null}
        </Select>
        <IndicadorCampo estado={estadoCalendario} />
      </>
    )
  }

  return (
    <section aria-labelledby="titulo-proyecto-colaborativo" className={styles.seccion}>
      <h2 id="titulo-proyecto-colaborativo" className={styles.titulo}>
        Proyecto colaborativo
      </h2>
      <p className={styles.descripcion}>
        Qué comparten los equipos mientras trabajan y con qué frecuencia se revisa su avance.
      </p>

      <Card className={styles.tarjeta}>
        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col" className={styles.encabezadoColumna}>
                  Tarea
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Estado
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Periodicidad
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Fecha de inicio
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Fecha de cierre
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  <span className={styles.soloLectorPantalla}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ELEMENTOS_ESPACIO_EQUIPO_UI.map(({ elemento, etiqueta, descripcion }) => {
                const esAvances = elemento === 'avances'
                return (
                  <Fragment key={elemento}>
                    <tr>
                      <th scope="row" className={styles.celdaTarea}>
                        <span className={styles.nombreTarea}>{etiqueta}</span>
                        <span className={styles.descripcionTarea}>{descripcion}</span>
                      </th>
                      <td className={styles.celdaControl}>
                        <Select
                          label={`Estado de ${etiqueta}`}
                          ocultarEtiqueta
                          value={estadoEspacioEquipo[elemento]}
                          disabled={!puedeConfigurar}
                          onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                            elegirEstado(elemento, evento.target.value)
                          }
                        >
                          {OPCIONES_ELEMENTO_ESPACIO_EQUIPO.map((opcion) => (
                            <option key={opcion.valor} value={opcion.valor}>
                              {opcion.etiqueta}
                            </option>
                          ))}
                        </Select>
                        <IndicadorCampo estado={estados[`espacio_equipo:${elemento}`]} />
                      </td>
                      <td className={styles.celdaControl}>
                        {esAvances ? celdaPeriodicidad() : <NoAplica />}
                      </td>
                      <td className={styles.celdaFecha}>
                        {esAvances && resumen.inicio ? (
                          formatearFecha(resumen.inicio)
                        ) : (
                          <NoAplica />
                        )}
                      </td>
                      <td className={styles.celdaFecha}>
                        {esAvances && resumen.fin ? formatearFecha(resumen.fin) : <NoAplica />}
                      </td>
                      <td className={styles.celdaAccion}>
                        {esAvances && avancesHabilitado ? (
                          <Button
                            variant="secondary"
                            disabled={periodos.length === 0}
                            onClick={() => setPanelAbierto(true)}
                          >
                            Editar calendario
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {esAvances && pendiente !== null ? (
                      <tr className={styles.filaConfirmacion}>
                        <td colSpan={6}>
                          <div className={styles.confirmacion}>
                            <p className={styles.confirmacionTexto}>
                              {pendiente === 'ninguna'
                                ? `Quitar el calendario borra los ${periodos.length} avances actuales.`
                                : `Cambiar a ${etiquetaPendiente?.toLowerCase()} reemplaza los ${periodos.length} avances actuales, incluidos los que ajustaste o cancelaste.`}
                            </p>
                            <div className={styles.confirmacionAcciones}>
                              <Button size="sm" onClick={() => void aplicarPeriodicidad(pendiente)}>
                                Reemplazar calendario
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPendiente(null)}
                              >
                                Mantener el actual
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
          </table>
        </div>
      </Card>

      <PanelCalendarioAvances
        idActividad={idActividad}
        periodos={periodos}
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        puedeAjustar={puedeAjustarPeriodos}
      />
    </section>
  )
}
