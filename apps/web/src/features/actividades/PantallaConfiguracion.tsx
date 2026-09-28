import {
  parsearEstadoEspacioEquipo,
  type EstadoEspacioEquipo,
  type FuncionSeguimiento,
} from '@plataforma/shared'
import { useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Button, Card, IconoCargando, Select, Switch } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { FUNCIONES_SIMPLES } from './configuracionFunciones'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { SeccionProyectoColaborativo } from './SeccionProyectoColaborativo'
import { useActividad, useConfigurarFuncionMutation } from './useActividades'
import styles from './PantallaConfiguracion.module.css'

// Todas las de interruptor primero y luego las de picklist, para que el
// patrón visual de cada fila no se interrumpa a media lista.
const FUNCIONES_ORDENADAS = [
  ...FUNCIONES_SIMPLES.filter((definicion) => definicion.opciones.length === 2),
  ...FUNCIONES_SIMPLES.filter((definicion) => definicion.opciones.length !== 2),
]
const ESPACIO_EQUIPO_POR_DEFECTO: EstadoEspacioEquipo = {
  metas: 'opcional',
  avances: 'opcional',
  recursos: 'opcional',
}

export function PantallaConfiguracion() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const configurarMutacion = useConfigurarFuncionMutation(id)
  const [estados, setEstados] = useState<Record<string, EstadoCampo>>({})

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
      <AppShell seccionActiva="actividades" titulo="Configuración">
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

  // Dos capacidades distintas porque las fases donde cada una aplica también
  // lo son: las funciones dejan de poder cambiarse al entrar a desarrollo,
  // pero ajustar el calendario de avances (mover una fecha, cancelar una
  // entrega) sigue siendo posible mientras la actividad se desarrolla
  // (capacidades.ts, ajustar_periodos).
  const puedeConfigurar = actividad.capacidades?.includes('configurar_funciones') ?? false
  const puedeAjustarPeriodos = actividad.capacidades?.includes('ajustar_periodos') ?? false

  return (
    <AppShell
      seccionActiva="actividades"
      titulo={`Configuración — ${actividad.nombre}`}
      acciones={
        <Button variant="secondary" to={`/actividades/${id}`}>
          Volver al resumen
        </Button>
      }
    >
      {!puedeConfigurar && !puedeAjustarPeriodos ? (
        <Card className={styles.seccionCard}>
          <p className={styles.texto}>No tienes permiso para configurar esta actividad.</p>
        </Card>
      ) : (
        <div className={styles.contenido}>
          <p className={styles.introduccion}>
            Define cómo se organizan los equipos, qué seguimiento y evaluación tendrá la actividad y
            con qué frecuencia se revisa el trabajo.
          </p>

          {!puedeConfigurar ? (
            <p className={styles.aviso}>
              Las funciones ya no pueden cambiarse en esta fase. Aún puedes ajustar el calendario de
              avances.
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
            puedeConfigurar={puedeConfigurar}
            puedeAjustarPeriodos={puedeAjustarPeriodos}
            estados={estados}
            guardar={guardar}
          />
        </div>
      )}
    </AppShell>
  )
}
