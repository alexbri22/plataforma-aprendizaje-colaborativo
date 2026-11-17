import {
  parsearEstadoEspacioEquipo,
  type EstadoEspacioEquipo,
  type FuncionSeguimiento,
} from '@plataforma/shared'
import { useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Card, IconoCargando, Select, Switch } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { FUNCIONES_SIMPLES } from './configuracionFunciones'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { SeccionProyectoColaborativo } from './SeccionProyectoColaborativo'
import { PesosComponentes } from '../evaluacion/PesosComponentes'
import { SeccionProcesoColaborativo } from '../evaluacion/SeccionProcesoColaborativo'
import { usePonderacion } from '../evaluacion/usePonderacion'
import { useActividad, useConfigurarFuncionMutation } from './useActividades'
import styles from './PantallaConfiguracion.module.css'

// La formación de equipos no está aquí: se configura en la pantalla de Equipos,
// donde se usa. Todas las de interruptor primero y luego las de picklist, para
// que el patrón visual de cada fila no se interrumpa a media lista.
// La bitácora tampoco: va en la tabla del proyecto colaborativo, con su
// porcentaje y su calendario de revisiones.
const FUNCIONES_CONFIGURABLES_AQUI = FUNCIONES_SIMPLES.filter(
  (definicion) =>
    definicion.funcion !== 'formacion_equipos' && definicion.funcion !== 'bitacora_individual',
)
const FUNCIONES_ORDENADAS = [
  ...FUNCIONES_CONFIGURABLES_AQUI.filter((definicion) => definicion.opciones.length === 2),
  ...FUNCIONES_CONFIGURABLES_AQUI.filter((definicion) => definicion.opciones.length !== 2),
]
const ESPACIO_EQUIPO_POR_DEFECTO: EstadoEspacioEquipo = {
  metas: 'opcional',
  planeacion: 'opcional',
  avances: 'opcional',
  recursos: 'opcional',
  producto: 'opcional',
}

export function PantallaConfiguracion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const configurarMutacion = useConfigurarFuncionMutation(id)
  const [estados, setEstados] = useState<Record<string, EstadoCampo>>({})
  const ponderacionQuery = usePonderacion(id)

  async function guardar(
    clave: string,
    funcion: FuncionSeguimiento,
    cuerpo: Record<string, string>,
  ): Promise<boolean> {
    setEstados((previo) => ({ ...previo, [clave]: { status: 'guardando' } }))
    try {
      await configurarMutacion.mutateAsync({ funcion, cuerpo })
      setEstados((previo) => ({ ...previo, [clave]: { status: 'guardado' } }))
      return true
    } catch (error) {
      setEstados((previo) => ({
        ...previo,
        [clave]: {
          status: 'error',
          mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GUARDADO,
        },
      }))
      return false
    }
  }

  if (actividadQuery.isPending) {
    return (
      <AppShell
        seccionActiva="actividades"
        titulo="Planificar"
        contexto={{ idActividad: id, seccion: 'planificar' }}
      >
        <div className={styles.cargando} role="status" aria-label="Cargando la configuración">
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
  const estadoEspacioEquipo =
    parsearEstadoEspacioEquipo(actividad.configuracion?.espacio_equipo ?? '') ??
    ESPACIO_EQUIPO_POR_DEFECTO
  // Tres capacidades porque las fases donde cada una aplica también lo son
  // (capacidades.ts): configurar_funciones es el cambio libre previo al
  // desarrollo; ajustar_funciones, en desarrollo y cierre, permite habilitar y
  // deshabilitar solo lo que aún no tiene datos (P-17), y el servidor explica
  // el rechazo junto al control; ajustar_periodos mueve o cancela un avance.
  // Regenerar el calendario entero sigue siendo solo configurar_funciones.
  const puedeConfigurarLibre = actividad.capacidades?.includes('configurar_funciones') ?? false
  const puedeAjustarFunciones = actividad.capacidades?.includes('ajustar_funciones') ?? false
  const puedeConfigurar = puedeConfigurarLibre || puedeAjustarFunciones
  const puedeAjustarPeriodos = actividad.capacidades?.includes('ajustar_periodos') ?? false

  return (
    <AppShell
      seccionActiva="actividades"
      // El nombre de la entrada de la barra lateral por la que se llega en
      // cada etapa (construirNavActividad).
      titulo="Planificar"
      contexto={{ idActividad: id, seccion: 'planificar' }}
      ayuda="planificar"
    >
      {!puedeConfigurar && !puedeAjustarPeriodos ? (
        <Card className={styles.seccionCard}>
          <p className={styles.texto}>No tienes permiso para planificar esta actividad.</p>
        </Card>
      ) : (
        <div className={styles.contenido}>
          <p className={styles.introduccion}>
            Qué seguimiento y evaluación tendrá la actividad y con qué frecuencia se revisa el
            trabajo. La formación de equipos se ajusta en Equipos.
          </p>

          {!puedeConfigurar ? (
            <p className={styles.aviso}>
              Las funciones ya no pueden cambiarse en esta etapa. Aún puedes ajustar el calendario
              de entregas.
            </p>
          ) : puedeAjustarFunciones ? (
            <p className={styles.aviso}>
              La actividad ya está en marcha: puedes habilitar funciones, y deshabilitarlas o
              cambiar su modo mientras aún no tengan datos.
            </p>
          ) : null}

          <section aria-labelledby="titulo-general" className={styles.seccion}>
            <h2 id="titulo-general" className={styles.tituloSeccion}>
              General
            </h2>
            <Card className={styles.lista}>
              {FUNCIONES_ORDENADAS.map((definicion) => {
                const valorActual =
                  actividad.configuracion?.[definicion.funcion] ?? definicion.opciones[0].valor
                return (
                  <div key={definicion.funcion} className={styles.fila}>
                    <div className={styles.filaTexto}>
                      <h3 className={styles.tituloCampo}>{definicion.titulo}</h3>
                      <p className={styles.descripcionCampo}>{definicion.descripcion}</p>
                      {/* Los porcentajes de los componentes, en la misma fila:
                          se configuran donde se usan (DESIGN.md). */}
                      {definicion.funcion === 'calificacion' &&
                      valorActual === 'habilitada' &&
                      ponderacionQuery.data ? (
                        <PesosComponentes
                          actividad={actividad}
                          ponderacion={ponderacionQuery.data}
                        />
                      ) : null}
                    </div>
                    <div className={styles.filaControl}>
                      {definicion.opciones.length === 2 ? (
                        <Switch
                          label={definicion.titulo}
                          ocultarEtiqueta
                          checked={valorActual === definicion.opciones[1].valor}
                          disabled={!puedeConfigurar}
                          onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                            guardar(definicion.funcion, definicion.funcion, {
                              estado: evento.target.checked
                                ? definicion.opciones[1].valor
                                : definicion.opciones[0].valor,
                            })
                          }
                        />
                      ) : (
                        <div className={styles.controlAncho}>
                          <Select
                            label={definicion.titulo}
                            ocultarEtiqueta
                            value={valorActual}
                            disabled={!puedeConfigurar}
                            onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                              guardar(definicion.funcion, definicion.funcion, {
                                estado: evento.target.value,
                              })
                            }
                          >
                            {definicion.opciones.map((opcion) => (
                              <option key={opcion.valor} value={opcion.valor}>
                                {opcion.etiqueta}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      <IndicadorCampo estado={estados[definicion.funcion]} />
                    </div>
                  </div>
                )
              })}
            </Card>
          </section>

          <SeccionProyectoColaborativo
            idActividad={id}
            estadoEspacioEquipo={estadoEspacioEquipo}
            estadoBitacora={actividad.configuracion?.bitacora_individual ?? 'deshabilitada'}
            puedeConfigurar={puedeConfigurar}
            puedeRegenerarCalendario={puedeConfigurarLibre}
            puedeAjustarPeriodos={puedeAjustarPeriodos}
            calificacionHabilitada={actividad.configuracion?.calificacion === 'habilitada'}
            puedeConfigurarCalificacion={
              actividad.capacidades?.includes('configurar_calificacion') ?? false
            }
            estados={estados}
            guardar={guardar}
          />

          <SeccionProcesoColaborativo actividad={actividad} />
        </div>
      )}
    </AppShell>
  )
}
