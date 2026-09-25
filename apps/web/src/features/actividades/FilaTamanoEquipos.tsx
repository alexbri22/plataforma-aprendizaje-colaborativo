import { LIMITE_MAXIMO_TAMANO_EQUIPO } from '@plataforma/shared'
import { useState } from 'react'
import { Input } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { IndicadorCampo, MENSAJE_ERROR_GUARDADO, type EstadoCampo } from './IndicadorCampo'
import { useFijarLimitesEquipoMutation } from './useActividades'
import styles from './FilaTamanoEquipos.module.css'

interface CamposTamanoEquiposProps {
  idActividad: string
  minimo: number | null | undefined
  maximo: number | null | undefined
  /** configurar_funciones: es un cambio libre, solo antes del desarrollo. */
  habilitado: boolean
}

type Campo = 'minimo' | 'maximo'

const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor))

// Ajuste de la formación de equipos (nucleo §8.8, P-27): cuántas personas
// puede tener un equipo. Vacío es sin límite. El máximo lo aplica el servidor
// a todos, también a quien organiza; el mínimo solo advierte. Autoguardado al
// salir del campo, como el resto de la configuración.
export function CamposTamanoEquipos({
  idActividad,
  minimo,
  maximo,
  habilitado,
}: CamposTamanoEquiposProps) {
  const [valores, setValores] = useState<Record<Campo, string>>({
    minimo: texto(minimo),
    maximo: texto(maximo),
  })
  const [estado, setEstado] = useState<EstadoCampo | undefined>()
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const guardar = useFijarLimitesEquipoMutation(idActividad)

  const actuales: Record<Campo, string> = { minimo: texto(minimo), maximo: texto(maximo) }

  async function alSalir(campo: Campo) {
    const escrito = valores[campo].trim()
    if (escrito === actuales[campo]) return

    let valor: number | null = null
    if (escrito !== '') {
      valor = Number(escrito)
      if (!Number.isInteger(valor) || valor < 1 || valor > LIMITE_MAXIMO_TAMANO_EQUIPO) {
        setErrores({
          [campo]: `Escribe un entero de 1 a ${LIMITE_MAXIMO_TAMANO_EQUIPO}, o déjalo vacío.`,
        })
        return
      }
    }

    setErrores({})
    setEstado({ status: 'guardando' })
    try {
      await guardar.mutateAsync({ [campo]: valor })
      setEstado({ status: 'guardado' })
    } catch (error) {
      setValores((previo) => ({ ...previo, [campo]: actuales[campo] }))
      setEstado({
        status: 'error',
        mensaje: error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_GUARDADO,
      })
    }
  }

  return (
    <div className={styles.control}>
      <div className={styles.campos}>
        {(['minimo', 'maximo'] as const).map((campo) => (
          <Input
            key={campo}
            label={campo === 'minimo' ? 'Mínimo de integrantes' : 'Máximo de integrantes'}
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITE_MAXIMO_TAMANO_EQUIPO}
            placeholder="Sin límite"
            value={valores[campo]}
            disabled={!habilitado}
            error={errores[campo]}
            onChange={(e) => setValores((previo) => ({ ...previo, [campo]: e.target.value }))}
            onBlur={() => alSalir(campo)}
          />
        ))}
      </div>
      <IndicadorCampo estado={estado} />
    </div>
  )
}

type FilaTamanoEquiposProps = CamposTamanoEquiposProps

// La misma configuración como una fila de la pantalla de Configuración.
export function FilaTamanoEquipos(props: FilaTamanoEquiposProps) {
  return (
    <div className={styles.fila}>
      <div className={styles.texto}>
        <h3 className={styles.titulo}>Tamaño de los equipos</h3>
        <p className={styles.descripcion}>
          Cuántas personas puede tener cada equipo. Vacío, sin límite.
        </p>
      </div>
      <CamposTamanoEquipos {...props} />
    </div>
  )
}
