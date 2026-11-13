import {
  CLAVES_COMPONENTE,
  bitacoraHabilitada,
  sumaDePesosActivos,
  type AspectoDePonderacion,
  type ElementoConCalendario,
  type ElementoEspacioEquipo,
  type EstadoEspacioEquipo,
  type FuncionSeguimiento,
  type Periodicidad,
  type PeriodoReporte,
} from '@plataforma/shared'
import { Fragment, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button, Card, IconoCargando, Select } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { inferirPeriodicidad, resumirCalendario } from './calendario'
import {
  BITACORA_UI,
  ELEMENTOS_ESPACIO_EQUIPO_UI,
  OPCIONES_BITACORA,
  OPCIONES_ELEMENTO_ESPACIO_EQUIPO,
  OPCIONES_PERIODICIDAD,
  type OpcionEstado,
} from './configuracionFunciones'
import { formatearFecha } from './formato'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { PanelCalendarioAvances } from './PanelCalendarioAvances'
import { AvisoSuma } from '../evaluacion/AvisoSuma'
import { CampoPeso } from '../evaluacion/CampoPeso'
import { usePonderacion } from '../evaluacion/usePonderacion'
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
  /** El estado de la función bitacora_individual. */
  estadoBitacora: string
  /** configurar_funciones o ajustar_funciones: cambiar el estado de un elemento. */
  puedeConfigurar: boolean
  /** configurar_funciones: regenerar un calendario, que descarta los ajustes
   * individuales y solo procede antes del desarrollo. */
  puedeRegenerarCalendario: boolean
  /** ajustar_periodos: mover fechas de una revisión o cancelarla. */
  puedeAjustarPeriodos: boolean
  /** Calificación habilitada: cada elemento muestra su porcentaje del
   * proyecto (P-40), editable con configurar_calificacion. */
  calificacionHabilitada: boolean
  puedeConfigurarCalificacion: boolean
  estados: Record<string, EstadoCampo>
  /** Resuelve a true si el servidor aceptó el cambio; los errores ya los muestra su indicador. */
  guardar: (
    clave: string,
    funcion: FuncionSeguimiento,
    cuerpo: Record<string, string>,
  ) => Promise<boolean>
}

interface FilaElementoProps {
  idActividad: string
  elemento: ElementoConCalendario
  etiqueta: string
  descripcion: string
  /** El estado elegido y sus opciones (los del espacio de equipo o los de la
   * bitácora). */
  estado: string
  opciones: OpcionEstado[]
  habilitado: boolean
  periodos: PeriodoReporte[]
  periodosCargando: boolean
  periodosConError: boolean
  aspecto: AspectoDePonderacion | undefined
  conPorcentaje: boolean
  columnas: number
  puedeConfigurar: boolean
  puedeRegenerarCalendario: boolean
  puedeConfigurarCalificacion: boolean
  estadoCampo: EstadoCampo | undefined
  onElegirEstado: (valor: string) => void
  onEditarCalendario: () => void
}

// Una fila: el estado del elemento, su calendario de revisiones (cada
// elemento el suyo) y su porcentaje del proyecto.
function FilaElemento({
  idActividad,
  elemento,
  etiqueta,
  descripcion,
  estado,
  opciones,
  habilitado,
  periodos,
  periodosCargando,
  periodosConError,
  aspecto,
  conPorcentaje,
  columnas,
  puedeConfigurar,
  puedeRegenerarCalendario,
  puedeConfigurarCalificacion,
  estadoCampo,
  onElegirEstado,
  onEditarCalendario,
}: FilaElementoProps) {
  const definirMutacion = useDefinirPeriodosMutation(idActividad)
  const [pendiente, setPendiente] = useState<PeriodicidadElegida | null>(null)
  const [estadoCalendario, setEstadoCalendario] = useState<EstadoCampo | undefined>()
  const inferida = inferirPeriodicidad(periodos)
  const resumen = resumirCalendario(periodos)
  const etiquetaPendiente = OPCIONES_PERIODICIDAD.find((o) => o.valor === pendiente)?.etiqueta

  async function aplicarPeriodicidad(nueva: PeriodicidadElegida) {
    setPendiente(null)
    setEstadoCalendario({ status: 'guardando' })
    try {
      await definirMutacion.mutateAsync({ elemento, periodicidad: nueva })
      setEstadoCalendario({ status: 'guardado' })
    } catch (error) {
      setEstadoCalendario({
        status: 'error',
        mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  // Regenerar descarta los ajustes hechos a mano y las revisiones canceladas,
  // así que si ya hay un calendario se pide confirmación antes.
  function elegirPeriodicidad(evento: ChangeEvent<HTMLSelectElement>) {
    const nueva = evento.target.value as PeriodicidadElegida
    if (nueva === inferida) return
    if (periodos.length > 0) setPendiente(nueva)
    else void aplicarPeriodicidad(nueva)
  }

  function celdaPeriodicidad() {
    if (!habilitado) return <NoAplica />
    if (periodosCargando) return <IconoCargando size={16} />
    if (periodosConError) return <p className={styles.ayuda}>No pudimos cargar el calendario.</p>
    return (
      <>
        <Select
          label={`Periodicidad de ${etiqueta}`}
          ocultarEtiqueta
          value={inferida}
          disabled={!puedeRegenerarCalendario || definirMutacion.isPending}
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
    <Fragment>
      <tr>
        <th scope="row" className={styles.celdaTarea}>
          <span className={styles.nombreTarea}>{etiqueta}</span>
          <span className={styles.descripcionTarea}>{descripcion}</span>
        </th>
        <td className={styles.celdaControl}>
          <Select
            label={`Estado de ${etiqueta}`}
            ocultarEtiqueta
            value={estado}
            disabled={!puedeConfigurar}
            onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
              onElegirEstado(evento.target.value)
            }
          >
            {opciones.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </Select>
          <IndicadorCampo estado={estadoCampo} />
        </td>
        <td className={styles.celdaControl}>{celdaPeriodicidad()}</td>
        <td className={styles.celdaFecha}>
          {habilitado && resumen.inicio ? formatearFecha(resumen.inicio) : <NoAplica />}
        </td>
        <td className={styles.celdaFecha}>
          {habilitado && resumen.fin ? formatearFecha(resumen.fin) : <NoAplica />}
        </td>
        {conPorcentaje ? (
          <td className={styles.celdaPeso}>
            {aspecto ? (
              <CampoPeso
                idActividad={idActividad}
                parte="aspecto"
                id={aspecto.id}
                nombre={etiqueta}
                peso={aspecto.peso}
                apagado={!habilitado}
                puedeEditar={puedeConfigurarCalificacion}
              />
            ) : null}
          </td>
        ) : null}
        <td className={styles.celdaAccion}>
          {habilitado && periodos.length > 0 ? (
            <Button variant="secondary" onClick={onEditarCalendario}>
              Editar calendario
            </Button>
          ) : null}
        </td>
      </tr>
      {pendiente !== null ? (
        <tr className={styles.filaConfirmacion}>
          <td colSpan={columnas}>
            <div className={styles.confirmacion}>
              <p className={styles.confirmacionTexto}>
                {pendiente === 'ninguna'
                  ? `Quitar el calendario borra las ${periodos.length} revisiones actuales.`
                  : `Cambiar a ${etiquetaPendiente?.toLowerCase()} reemplaza las ${periodos.length} revisiones actuales, incluidas las que ajustaste o cancelaste.`}
              </p>
              <div className={styles.confirmacionAcciones}>
                <Button size="sm" onClick={() => void aplicarPeriodicidad(pendiente)}>
                  Reemplazar calendario
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPendiente(null)}>
                  Mantener el actual
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}

// Lo que comparten los equipos (Metas, Planeación, Avances, Materiales,
// Producto) y la bitácora de cada participante. Cada uno tiene estado, su
// propio calendario de revisiones, para que se sepa cuándo se va a revisar
// (docs/diseno-desarrollo-nucleo.md §9.2), y su porcentaje del proyecto.
export function SeccionProyectoColaborativo({
  idActividad,
  estadoEspacioEquipo,
  estadoBitacora,
  puedeConfigurar,
  puedeRegenerarCalendario,
  puedeAjustarPeriodos,
  calificacionHabilitada,
  puedeConfigurarCalificacion,
  estados,
  guardar,
}: SeccionProyectoColaborativoProps) {
  const ponderacionQuery = usePonderacion(idActividad)
  // Los aspectos del proyecto son los elementos del espacio de equipo y la
  // bitácora, con la misma clave (P-40); uno deshabilitado vale 0.
  const aspectosProyecto =
    ponderacionQuery.data?.componentes.find((c) => c.clave === CLAVES_COMPONENTE.proyecto)
      ?.aspectos ?? []
  const conPorcentaje = calificacionHabilitada && aspectosProyecto.length > 0
  const bitacoraActiva = bitacoraHabilitada(estadoBitacora)
  const habilitado = (elemento: ElementoConCalendario) =>
    elemento === 'bitacora' ? bitacoraActiva : estadoEspacioEquipo[elemento] !== 'deshabilitado'
  const partes = aspectosProyecto.map((a) => ({
    peso: a.peso,
    apagado: !habilitado(a.clave as ElementoConCalendario),
  }))
  const columnas = conPorcentaje ? 7 : 6
  const periodosQuery = usePeriodos(idActividad)
  const [elementoEnPanel, setElementoEnPanel] = useState<ElementoConCalendario | null>(null)
  const periodosDe = (elemento: ElementoConCalendario) =>
    (periodosQuery.data ?? []).filter((p) => p.elemento === elemento)

  // El PUT de espacio_equipo lleva los cinco elementos a la vez. Si cada
  // cambio se armara con lo último que devolvió la consulta, dos cambios
  // seguidos (antes de que la consulta se refresque) partirían del mismo
  // estado viejo y el que llegara al servidor al final pisaría al otro. Por
  // eso los guardados se hacen de uno en uno, y cada uno se arma en el momento
  // de enviarse sobre el último estado que el servidor confirmó.
  const confirmado = useRef(estadoEspacioEquipo)
  const cola = useRef<Promise<unknown>>(Promise.resolve())
  const guardadosPendientes = useRef(0)

  // Lo que llega del servidor manda cuando no hay guardados en curso (otra
  // persona pudo cambiar algo). Se compara el contenido y no el objeto.
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

  const filas = [
    ...ELEMENTOS_ESPACIO_EQUIPO_UI.map((ui) => ({
      ...ui,
      estado: estadoEspacioEquipo[ui.elemento],
      opciones: OPCIONES_ELEMENTO_ESPACIO_EQUIPO,
      claveIndicador: `espacio_equipo:${ui.elemento}`,
      onElegirEstado: (valor: string) => elegirEstado(ui.elemento, valor),
    })),
    {
      ...BITACORA_UI,
      estado: estadoBitacora,
      opciones: OPCIONES_BITACORA,
      claveIndicador: 'bitacora_individual',
      onElegirEstado: (valor: string) =>
        void guardar('bitacora_individual', 'bitacora_individual', { estado: valor }),
    },
  ]
  const enPanel = filas.find((f) => f.elemento === elementoEnPanel)

  return (
    <section aria-labelledby="titulo-proyecto-colaborativo" className={styles.seccion}>
      <h2 id="titulo-proyecto-colaborativo" className={styles.titulo}>
        Proyecto colaborativo
      </h2>
      <p className={styles.descripcion}>
        Qué comparten los equipos mientras trabajan y cada cuánto se revisa. Obligatorio no bloquea
        nada: solo se le recuerda al equipo si falta.
      </p>

      <Card className={styles.tarjeta}>
        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col" className={styles.encabezadoColumna}>
                  Elemento
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
                {conPorcentaje ? (
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
              {filas.map((fila) => (
                <FilaElemento
                  key={fila.elemento}
                  idActividad={idActividad}
                  elemento={fila.elemento}
                  etiqueta={fila.etiqueta}
                  descripcion={fila.descripcion}
                  estado={fila.estado}
                  opciones={fila.opciones}
                  habilitado={habilitado(fila.elemento)}
                  periodos={periodosDe(fila.elemento)}
                  periodosCargando={periodosQuery.isPending}
                  periodosConError={periodosQuery.isError}
                  aspecto={aspectosProyecto.find((a) => a.clave === fila.elemento)}
                  conPorcentaje={conPorcentaje}
                  columnas={columnas}
                  puedeConfigurar={puedeConfigurar}
                  puedeRegenerarCalendario={puedeRegenerarCalendario}
                  puedeConfigurarCalificacion={puedeConfigurarCalificacion}
                  estadoCampo={estados[fila.claveIndicador]}
                  onElegirEstado={fila.onElegirEstado}
                  onEditarCalendario={() => setElementoEnPanel(fila.elemento)}
                />
              ))}
            </tbody>
            {conPorcentaje && sumaDePesosActivos(partes) !== 100 ? (
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

      <PanelCalendarioAvances
        idActividad={idActividad}
        nombre={enPanel?.etiqueta ?? ''}
        periodos={elementoEnPanel ? periodosDe(elementoEnPanel) : []}
        abierto={elementoEnPanel !== null}
        onCerrar={() => setElementoEnPanel(null)}
        puedeAjustar={puedeAjustarPeriodos}
      />
    </section>
  )
}
