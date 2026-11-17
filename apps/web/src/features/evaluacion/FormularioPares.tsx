import {
  PLANTILLAS_INSTRUMENTO,
  repartoVigente,
  validarRespuestasDistribucion,
  type IntegranteEquipo,
  type RespuestasDistribucion,
} from '@plataforma/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvisoAdvertencia, AvisoError, Button, IconoCargando, Input } from '../../components/ui'
import { useResponderInstrumentoMutation } from './useRespuestas'
import styles from './FormularioPares.module.css'

const ACCIONES = PLANTILLAS_INSTRUMENTO.evaluacion_pares.reactivos

interface FormularioParesProps {
  idActividad: string
  idInstrumento: string
  /** Participantes del equipo, quien responde incluido. */
  integrantes: IntegranteEquipo[]
  idMiMembresia: string
  iniciales: RespuestasDistribucion | null
  puedeResponder: boolean
  alTerminar: string
}

// Un porcentaje escrito es válido si es un entero de 0 a 100.
function esPorcentaje(texto: string): boolean {
  const n = Number(texto)
  return texto.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 100
}

// Por qué no se puede seguir con este reparto, o null si suma 100 con
// porcentajes válidos. En blanco del todo no hay nada que advertir todavía.
function problemaDelReparto(valores: string[]): string | null {
  if (valores.every((v) => v.trim() === '')) return null
  if (valores.some((v) => v.trim() !== '' && !esPorcentaje(v))) {
    return 'Cada porcentaje debe ser un número entero de 0 a 100.'
  }
  if (valores.some((v) => v.trim() === '')) {
    return 'Escribe un porcentaje para cada integrante, aunque sea 0.'
  }
  const suma = valores.reduce((total, v) => total + Number(v), 0)
  if (suma < 100) return `Faltan ${100 - suma} % para llegar a 100.`
  if (suma > 100) return `Sobran ${suma - 100} %: entre todos deben sumar 100.`
  return null
}

// Un reparto vacío: todos en blanco, para que la persona decida cada número.
function vacio(integrantes: IntegranteEquipo[]): Record<string, string> {
  return Object.fromEntries(integrantes.map((i) => [i.idMembresia, '']))
}

// La evaluación por pares (nucleo §10.6): una acción a la vez, con su
// ejemplo, el reparto del 100 % entre los integrantes y lo que falta para
// llegar a 100. Se envía al terminar la última. Una respuesta hecha para
// otro equipo (hubo una reasignación) no se precarga: hay que repartir de
// nuevo.
export function FormularioPares({
  idActividad,
  idInstrumento,
  integrantes,
  idMiMembresia,
  iniciales,
  puedeResponder,
  alTerminar,
}: FormularioParesProps) {
  const navigate = useNavigate()
  const responder = useResponderInstrumentoMutation(idActividad, idInstrumento)
  const ids = integrantes.map((i) => i.idMembresia)
  const vigentes = iniciales && repartoVigente(iniciales, ids) ? iniciales : null
  const [paso, setPaso] = useState(0)
  const [repartos, setRepartos] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(
      ACCIONES.map((a) => [
        a.clave,
        vigentes
          ? Object.fromEntries(ids.map((id) => [id, String(vigentes[a.clave]?.[id] ?? '')]))
          : vacio(integrantes),
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  const accion = ACCIONES[paso]
  const reparto = repartos[accion.clave]
  const valores = ids.map((id) => reparto[id])
  const problema = problemaDelReparto(valores)
  const enBlanco = valores.every((v) => v.trim() === '')
  const listo = !enBlanco && problema === null
  const ultima = paso === ACCIONES.length - 1

  async function enviar() {
    const respuestas = Object.fromEntries(
      ACCIONES.map((a) => [
        a.clave,
        Object.fromEntries(ids.map((id) => [id, Number(repartos[a.clave][id])])),
      ]),
    )
    const validacion = validarRespuestasDistribucion(
      PLANTILLAS_INSTRUMENTO.evaluacion_pares,
      respuestas,
      ids,
    )
    if ('errores' in validacion) {
      const primera = ACCIONES.findIndex((a) => validacion.errores[a.clave])
      if (primera >= 0) setPaso(primera)
      setError(Object.values(validacion.errores)[0])
      return
    }
    setError(null)
    try {
      await responder.mutateAsync(validacion.respuestas)
      navigate(alTerminar)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tu evaluación.')
    }
  }

  return (
    <div className={styles.formulario}>
      <div className={styles.encabezado}>
        <span className={styles.paso}>
          Acción {paso + 1} de {ACCIONES.length}
        </span>
        <h2 className={styles.accion}>{accion.texto}</h2>
        <p className={styles.ejemplo}>Por ejemplo: {accion.ejemplo}</p>
      </div>

      <div className={styles.reparto} role="group" aria-label={`Reparto de ${accion.texto}`}>
        {integrantes.map((integrante) => (
          <div key={integrante.idMembresia} className={styles.integrante}>
            <Input
              label={
                integrante.idMembresia === idMiMembresia
                  ? `${integrante.nombre} (tú)`
                  : integrante.nombre
              }
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={reparto[integrante.idMembresia]}
              error={
                reparto[integrante.idMembresia].trim() !== '' &&
                !esPorcentaje(reparto[integrante.idMembresia])
                  ? 'De 0 a 100'
                  : undefined
              }
              disabled={!puedeResponder || responder.isPending}
              onChange={(e) =>
                setRepartos((previos) => ({
                  ...previos,
                  [accion.clave]: {
                    ...previos[accion.clave],
                    [integrante.idMembresia]: e.target.value,
                  },
                }))
              }
            />
            <span className={styles.porcentaje} aria-hidden="true">
              %
            </span>
          </div>
        ))}
      </div>

      {problema ? (
        <AvisoAdvertencia mensaje={problema} />
      ) : listo ? (
        <p className={styles.sumaLista}>Suma 100 %</p>
      ) : (
        <p className={styles.suma}>Reparte el 100 % entre los integrantes.</p>
      )}

      {error ? <AvisoError mensaje={error} /> : null}

      <div className={styles.acciones}>
        <Button
          variant="secondary"
          disabled={paso === 0 || responder.isPending}
          onClick={() => setPaso((p) => p - 1)}
        >
          Anterior
        </Button>
        {ultima ? (
          puedeResponder ? (
            <Button disabled={!listo || responder.isPending} onClick={() => void enviar()}>
              {responder.isPending ? <IconoCargando size={14} /> : 'Enviar evaluación'}
            </Button>
          ) : null
        ) : (
          <Button
            disabled={(puedeResponder && !listo) || responder.isPending}
            onClick={() => {
              setError(null)
              setPaso((p) => p + 1)
            }}
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  )
}
