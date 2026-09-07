import {
  parsearEstadoEspacioEquipo,
  type EstadoEspacioEquipo,
  type FuncionSeguimiento,
} from '@plataforma/shared'
import { useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Button, Card, IconoCargando, Select } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import {
  ELEMENTOS_ESPACIO_EQUIPO_UI,
  FUNCIONES_SIMPLES,
  OPCIONES_ELEMENTO_ESPACIO_EQUIPO,
} from './configuracionFunciones'
import { useActividad, useConfigurarFuncionMutation } from './useActividades'
import styles from './PantallaConfiguracion.module.css'

const MENSAJE_ERROR_GENERICO = 'No pudimos guardar este cambio. Intenta de nuevo.'
const ESPACIO_EQUIPO_POR_DEFECTO: EstadoEspacioEquipo = {
  metas: 'opcional',
  avances: 'opcional',
  recursos: 'opcional',
}

interface EstadoCampo {
  status: 'guardando' | 'guardado' | 'error'
  mensaje?: string
}

function IndicadorCampo({ estado }: { estado?: EstadoCampo }) {
  if (!estado) return null
  if (estado.status === 'guardando') {
    return (
      <span className={styles.indicador}>
        <IconoCargando size={14} /> Guardando…
      </span>
    )
  }
  if (estado.status === 'error') {
    return (
      <span className={`${styles.indicador} ${styles.indicadorError}`} role="alert">
        {estado.mensaje}
      </span>
    )
  }
  return <span className={styles.indicador}>Guardado</span>
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
  ) {
    setEstados((previo) => ({ ...previo, [clave]: { status: 'guardando' } }))
    try {
      await configurarMutacion.mutateAsync({ funcion, cuerpo })
      setEstados((previo) => ({ ...previo, [clave]: { status: 'guardado' } }))
    } catch (error) {
      setEstados((previo) => ({
        ...previo,
        [clave]: {
          status: 'error',
          mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GENERICO,
        },
      }))
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
      {!actividad.capacidades?.includes('configurar_funciones') ? (
        <Card className={styles.seccionCard}>
          <p className={styles.texto}>No tienes permiso para configurar esta actividad.</p>
        </Card>
      ) : (
        <div className={styles.contenido}>
          {FUNCIONES_SIMPLES.map((definicion) => {
            const valorActual =
              actividad.configuracion?.[definicion.funcion] ?? definicion.opciones[0].valor
            return (
              <Card key={definicion.funcion} className={styles.seccionCard}>
                <div className={styles.encabezadoCampo}>
                  <p className={styles.descripcionCampo}>{definicion.descripcion}</p>
                  <IndicadorCampo estado={estados[definicion.funcion]} />
                </div>
                <Select
                  label={definicion.titulo}
                  value={valorActual}
                  onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                    guardar(definicion.funcion, definicion.funcion, { estado: evento.target.value })
                  }
                >
                  {definicion.opciones.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </Select>
              </Card>
            )
          })}

          <Card className={`${styles.seccionCard} ${styles.seccionCardAncha}`}>
            <div className={styles.encabezadoCampo}>
              <div>
                <h2 className={styles.tituloCampo}>Espacio de equipo</h2>
                <p className={styles.descripcionCampo}>
                  Qué elementos usan los equipos para compartir su trabajo, y si son obligatorios.
                </p>
              </div>
              <IndicadorCampo estado={estados.espacio_equipo} />
            </div>
            <div className={styles.gridEspacioEquipo}>
              {ELEMENTOS_ESPACIO_EQUIPO_UI.map(({ elemento, etiqueta }) => {
                const actual =
                  parsearEstadoEspacioEquipo(actividad.configuracion?.espacio_equipo ?? '') ??
                  ESPACIO_EQUIPO_POR_DEFECTO
                return (
                  <Select
                    key={elemento}
                    label={etiqueta}
                    value={actual[elemento]}
                    onChange={(evento: ChangeEvent<HTMLSelectElement>) => {
                      const siguiente = { ...actual, [elemento]: evento.target.value }
                      guardar('espacio_equipo', 'espacio_equipo', siguiente)
                    }}
                  >
                    {OPCIONES_ELEMENTO_ESPACIO_EQUIPO.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </Select>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
