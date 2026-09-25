import { ESTADOS_FORMACION_EQUIPOS } from '@plataforma/shared'
import { useState, type ChangeEvent } from 'react'
import { AvisoError, PanelLateral, Select } from '../../components/ui'
import {
  CamposTamanoEquipos,
  ErrorActividad,
  useConfigurarFuncionMutation,
  type Actividad,
} from '../actividades'
import { ETIQUETA_FORMACION } from './etiquetas'
import styles from './PanelAjustesFormacion.module.css'

interface PanelAjustesFormacionProps {
  abierto: boolean
  actividad: Actividad
  onCerrar: () => void
}

// La configuración de la formación de equipos, editable donde se usa. Son los
// mismos ajustes de la pantalla de Configuración (misma mutación, mismas
// reglas del servidor), en un panel lateral para no sacar a quien organiza de
// los equipos (DESIGN.md, "Side Panel").
export function PanelAjustesFormacion({
  abierto,
  actividad,
  onCerrar,
}: PanelAjustesFormacionProps) {
  const configurar = useConfigurarFuncionMutation(actividad.id)
  const [error, setError] = useState<string | null>(null)

  async function cambiarEstado(evento: ChangeEvent<HTMLSelectElement>) {
    setError(null)
    try {
      await configurar.mutateAsync({
        funcion: 'formacion_equipos',
        cuerpo: { estado: evento.target.value },
      })
    } catch (e) {
      setError(e instanceof ErrorActividad ? e.message : 'No pudimos guardar el cambio.')
    }
  }

  return (
    <PanelLateral abierto={abierto} titulo="Formación de equipos" onCerrar={onCerrar}>
      <div className={styles.contenido}>
        {error ? <AvisoError mensaje={error} /> : null}
        <Select
          label="Cómo se forman"
          value={actividad.configuracion?.formacion_equipos ?? 'autogestionado'}
          disabled={configurar.isPending}
          onChange={cambiarEstado}
        >
          {ESTADOS_FORMACION_EQUIPOS.map((estado) => (
            <option key={estado} value={estado}>
              {ETIQUETA_FORMACION[estado]}
            </option>
          ))}
        </Select>
        <div className={styles.tamano}>
          <CamposTamanoEquipos
            idActividad={actividad.id}
            minimo={actividad.tamanoMinimoEquipo}
            maximo={actividad.tamanoMaximoEquipo}
            habilitado
          />
        </div>
      </div>
    </PanelLateral>
  )
}
