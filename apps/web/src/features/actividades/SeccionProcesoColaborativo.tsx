import { generarPeriodos, type Periodicidad, type PeriodoReporte } from '@plataforma/shared'
import { useState, type ChangeEvent } from 'react'
import { Button, Card, Select } from '../../components/ui'
import type { CambiosPeriodo } from './actividades.api'
import {
  etiquetaInstrumento,
  INSTRUMENTOS_POR_TAREA,
  OPCIONES_PERIODICIDAD,
  TAREAS_PROCESO_COLABORATIVO,
  type InstrumentoRecurso,
  type TareaProcesoColaborativo,
} from './configuracionFunciones'
import { PanelCalendarioProcesoColaborativo } from './PanelCalendarioProcesoColaborativo'
import styles from './SeccionProcesoColaborativo.module.css'

type PeriodicidadElegida = Periodicidad | 'ninguna'

type RecursoElegido = InstrumentoRecurso | 'ninguno'

interface EstadoTarea {
  recurso: RecursoElegido
  periodicidad: PeriodicidadElegida
  periodos: PeriodoReporte[]
}

function estadoInicial(): Record<TareaProcesoColaborativo, EstadoTarea> {
  const estado = {} as Record<TareaProcesoColaborativo, EstadoTarea>
  for (const { tarea } of TAREAS_PROCESO_COLABORATIVO) {
    estado[tarea] = { recurso: 'ninguno', periodicidad: 'ninguna', periodos: [] }
  }
  return estado
}

function aFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

function comoTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

function generarPeriodosDeTarea(
  tarea: TareaProcesoColaborativo,
  periodicidad: Periodicidad,
  fechaInicioActividad: string,
  fechaTerminoActividad: string,
): PeriodoReporte[] {
  return generarPeriodos(
    aFecha(fechaInicioActividad),
    aFecha(fechaTerminoActividad),
    periodicidad,
  ).map((periodo) => ({
    id: `${tarea}-${periodo.orden}`,
    orden: periodo.orden,
    fechaInicio: comoTexto(periodo.fechaInicio),
    fechaFin: comoTexto(periodo.fechaFin),
    estado: 'activo',
  }))
}

export interface SeccionProcesoColaborativoProps {
  fechaInicioActividad: string
  fechaTerminoActividad: string
}

// Los cinco aspectos del aprendizaje colaborativo de Johnson y Johnson
// (docs/concepto-producto.md §1) que todavía no existen en el servidor
// (@plataforma/shared no los incluye en FuncionSeguimiento): el estado vive
// solo en este componente hasta que el modelo de datos se cierre y haya un
// endpoint real que lo reciba, como antes pasó con Actividades (ver
// actividades.fixtures.ts).
export function SeccionProcesoColaborativo({
  fechaInicioActividad,
  fechaTerminoActividad,
}: SeccionProcesoColaborativoProps) {
  const [estado, setEstado] = useState(estadoInicial)
  const [panelAbierto, setPanelAbierto] = useState<TareaProcesoColaborativo | null>(null)

  // Un solo instrumento por tarea: elegirlo es lo que la habilita, así que
  // volver a "Ninguno" también borra su calendario.
  function elegirRecurso(tarea: TareaProcesoColaborativo, recurso: RecursoElegido) {
    setEstado((previo) => ({
      ...previo,
      [tarea]:
        recurso === 'ninguno'
          ? { recurso, periodicidad: 'ninguna', periodos: [] }
          : { ...previo[tarea], recurso },
    }))
  }

  function elegirPeriodicidad(tarea: TareaProcesoColaborativo, periodicidad: PeriodicidadElegida) {
    setEstado((previo) => ({
      ...previo,
      [tarea]: {
        ...previo[tarea],
        periodicidad,
        periodos:
          periodicidad === 'ninguna'
            ? []
            : generarPeriodosDeTarea(
                tarea,
                periodicidad,
                fechaInicioActividad,
                fechaTerminoActividad,
              ),
      },
    }))
  }

  function cambiarPeriodo(
    tarea: TareaProcesoColaborativo,
    idPeriodo: string,
    cambios: CambiosPeriodo,
  ) {
    setEstado((previo) => ({
      ...previo,
      [tarea]: {
        ...previo[tarea],
        periodos: previo[tarea].periodos.map((periodo) =>
          periodo.id === idPeriodo ? { ...periodo, ...cambios } : periodo,
        ),
      },
    }))
  }

  const tareaDelPanel = TAREAS_PROCESO_COLABORATIVO.find((t) => t.tarea === panelAbierto)

  return (
    <section aria-labelledby="titulo-proceso-colaborativo" className={styles.seccion}>
      <h2 id="titulo-proceso-colaborativo" className={styles.titulo}>
        Proceso colaborativo
      </h2>
      <p className={styles.descripcion}>
        Con qué instrumento se evalúa cada aspecto del trabajo colaborativo, y cada cuánto.
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
                  Recurso
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  Periodicidad
                </th>
                <th scope="col" className={styles.encabezadoColumna}>
                  <span className={styles.soloLectorPantalla}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {TAREAS_PROCESO_COLABORATIVO.map(({ tarea, etiqueta, descripcion }) => {
                const estadoTarea = estado[tarea]
                const habilitada = estadoTarea.recurso !== 'ninguno'
                return (
                  <tr key={tarea}>
                    <th scope="row" className={styles.celdaTarea}>
                      <span className={styles.nombreTarea}>{etiqueta}</span>
                      <span className={styles.descripcionTarea}>{descripcion}</span>
                    </th>
                    <td className={styles.celdaControl}>
                      <Select
                        label={`Recurso de ${etiqueta}`}
                        ocultarEtiqueta
                        value={estadoTarea.recurso}
                        onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                          elegirRecurso(tarea, evento.target.value as RecursoElegido)
                        }
                      >
                        <option value="ninguno">Ninguno</option>
                        {INSTRUMENTOS_POR_TAREA[tarea].map((instrumento) => (
                          <option key={instrumento} value={instrumento}>
                            {etiquetaInstrumento(instrumento)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className={styles.celdaControl}>
                      <Select
                        label={`Periodicidad de ${etiqueta}`}
                        ocultarEtiqueta
                        value={estadoTarea.periodicidad}
                        disabled={!habilitada}
                        onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                          elegirPeriodicidad(tarea, evento.target.value as PeriodicidadElegida)
                        }
                      >
                        {OPCIONES_PERIODICIDAD.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className={styles.celdaAccion}>
                      {estadoTarea.periodos.length > 0 ? (
                        <Button variant="secondary" onClick={() => setPanelAbierto(tarea)}>
                          Editar calendario
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {tareaDelPanel ? (
        <PanelCalendarioProcesoColaborativo
          titulo={tareaDelPanel.etiqueta}
          periodos={estado[tareaDelPanel.tarea].periodos}
          abierto={panelAbierto !== null}
          onCerrar={() => setPanelAbierto(null)}
          onCambiarPeriodo={(idPeriodo, cambios) =>
            cambiarPeriodo(tareaDelPanel.tarea, idPeriodo, cambios)
          }
        />
      ) : null}
    </section>
  )
}
