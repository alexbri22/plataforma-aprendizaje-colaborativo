import {
  ESCALA_LIKERT,
  NOMBRE_PLANTILLA,
  PLANTILLAS_INSTRUMENTO,
  validarRespuestasLikert,
  type RespuestasDistribucion,
  type RespuestasLikert,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import { AvisoError, Button, Card, IconoCargando } from '../../components/ui'
import { formatearFechaHora, TAREAS_PROCESO_COLABORATIVO, useActividad } from '../actividades'
import { useEquipo } from '../equipos/useEquipos'
import { FormularioPares } from './FormularioPares'
import { useMisInstrumentos, useRespuestas, useResponderInstrumentoMutation } from './useRespuestas'
import styles from './PantallaResponderPlantilla.module.css'

interface FormularioProps {
  idActividad: string
  idInstrumento: string
  clavePlantilla: keyof typeof PLANTILLAS_INSTRUMENTO
  iniciales: RespuestasLikert
  puedeResponder: boolean
  yaRespondida: boolean
  /** A dónde vuelve al guardar. */
  alTerminar: string
}

// Los reactivos con la escala de cuatro valores (nucleo §10.6). Se envían
// completos: el promedio nunca se calcula sobre un formulario a medias.
function FormularioAutoevaluacion({
  idActividad,
  idInstrumento,
  clavePlantilla,
  iniciales,
  puedeResponder,
  yaRespondida,
  alTerminar,
}: FormularioProps) {
  const navigate = useNavigate()
  const plantilla = PLANTILLAS_INSTRUMENTO[clavePlantilla]
  const responder = useResponderInstrumentoMutation(idActividad, idInstrumento)
  const [respuestas, setRespuestas] = useState<RespuestasLikert>(iniciales)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const faltan = plantilla.reactivos.filter((r) => respuestas[r.clave] === undefined).length

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const validacion = validarRespuestasLikert(plantilla, respuestas)
    if ('errores' in validacion) {
      setErrores(validacion.errores)
      return
    }
    setError(null)
    try {
      await responder.mutateAsync(validacion.respuestas)
      navigate(alTerminar)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar tus respuestas.')
    }
  }

  return (
    <form onSubmit={enviar} className={styles.formulario}>
      <div className={styles.encabezado} aria-hidden="true">
        <span />
        {ESCALA_LIKERT.map((opcion) => (
          <span key={opcion.valor} className={styles.opcionEncabezado}>
            {opcion.etiqueta}
          </span>
        ))}
      </div>
      {plantilla.reactivos.map((reactivo) => (
        <div
          key={reactivo.clave}
          role="radiogroup"
          aria-labelledby={`reactivo-${reactivo.clave}`}
          aria-invalid={errores[reactivo.clave] ? true : undefined}
          className={styles.reactivo}
        >
          <span id={`reactivo-${reactivo.clave}`} className={styles.texto}>
            {reactivo.texto}
            {errores[reactivo.clave] ? (
              <span className={styles.error}>{errores[reactivo.clave]}</span>
            ) : null}
          </span>
          {ESCALA_LIKERT.map((opcion) => (
            <label key={opcion.valor} className={styles.opcion}>
              <input
                type="radio"
                name={reactivo.clave}
                value={opcion.valor}
                checked={respuestas[reactivo.clave] === opcion.valor}
                disabled={!puedeResponder}
                onChange={() => {
                  setRespuestas((previas) => ({ ...previas, [reactivo.clave]: opcion.valor }))
                  setErrores((previos) =>
                    Object.fromEntries(
                      Object.entries(previos).filter(([clave]) => clave !== reactivo.clave),
                    ),
                  )
                }}
              />
              <span className={styles.etiquetaOpcion}>{opcion.etiqueta}</span>
            </label>
          ))}
        </div>
      ))}
      {error ? <AvisoError mensaje={error} /> : null}
      {puedeResponder ? (
        <div className={styles.acciones}>
          <Button type="submit" disabled={responder.isPending || faltan > 0}>
            {responder.isPending ? (
              <IconoCargando size={14} />
            ) : yaRespondida ? (
              'Guardar cambios'
            ) : (
              'Enviar respuestas'
            )}
          </Button>
          {faltan > 0 ? (
            <span className={styles.faltan}>
              {faltan === 1 ? 'Falta 1 reactivo' : `Faltan ${faltan} reactivos`}
            </span>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}

// Responder una plantilla (nucleo §10.6), dentro del aspecto al que
// pertenece: una autoevaluación de escala o la evaluación por pares. Quien
// ya respondió la ve con sus respuestas y puede cambiarlas mientras la fase
// lo permita.
export function PantallaResponderPlantilla() {
  const {
    idEquipo = '',
    aspecto = '',
    idInstrumento = '',
  } = useParams<{ idEquipo: string; aspecto: string; idInstrumento: string }>()
  const equipo = useEquipo(idEquipo)
  const idActividad = equipo.data?.idActividad ?? ''
  const actividad = useActividad(idActividad, { enabled: Boolean(idActividad) })
  const instrumentos = useMisInstrumentos(idActividad)
  const respuestas = useRespuestas(idActividad, idInstrumento)
  const marco = {
    idEquipo,
    seccionActiva: 'proceso' as const,
    aspecto,
    volverA: `/equipos/${idEquipo}/proceso/${aspecto}`,
    volverEtiqueta: TAREAS_PROCESO_COLABORATIVO.find((t) => t.tarea === aspecto)?.etiqueta,
  }

  if (equipo.isPending || actividad.isPending || instrumentos.isPending || respuestas.isPending) {
    return (
      <AppShellEquipo {...marco} titulo="Evaluación">
        <div className={styles.cargando} role="status" aria-label="Cargando la evaluación">
          <IconoCargando size={24} />
        </div>
      </AppShellEquipo>
    )
  }

  const instrumento = instrumentos.data?.find((i) => i.id === idInstrumento)
  if (
    actividad.isError ||
    respuestas.isError ||
    !actividad.data ||
    !instrumento?.clavePlantilla ||
    instrumento.formato !== 'plantilla'
  ) {
    return (
      <AppShellEquipo {...marco} titulo="Evaluación">
        <AvisoError mensaje="No encontramos esta evaluación." />
      </AppShellEquipo>
    )
  }

  const puedeResponder = actividad.data.capacidades?.includes('responder_instrumento') ?? false
  const propia = respuestas.data?.[0]
  const esPares = instrumento.clavePlantilla === 'evaluacion_pares'

  return (
    <AppShellEquipo {...marco} titulo={NOMBRE_PLANTILLA[instrumento.clavePlantilla]}>
      <Card className={styles.tarjeta}>
        <p className={styles.nota}>
          {[
            instrumento.nombre,
            instrumento.completadoEn
              ? `Respondida el ${formatearFechaHora(instrumento.completadoEn)}`
              : null,
            esPares ? 'Reparte el 100 % de cada acción entre quienes la realizaron' : null,
            puedeResponder ? null : 'Se responde durante el desarrollo y el cierre.',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {esPares ? (
          <FormularioPares
            idActividad={idActividad}
            idInstrumento={idInstrumento}
            integrantes={(equipo.data?.integrantes ?? []).filter((i) => i.rol === 'participante')}
            idMiMembresia={actividad.data.idMiMembresia ?? ''}
            iniciales={(propia?.respuestas as RespuestasDistribucion | undefined) ?? null}
            puedeResponder={puedeResponder}
            alTerminar={marco.volverA}
          />
        ) : (
          <FormularioAutoevaluacion
            idActividad={idActividad}
            idInstrumento={idInstrumento}
            clavePlantilla={instrumento.clavePlantilla}
            iniciales={(propia?.respuestas as RespuestasLikert | undefined) ?? {}}
            puedeResponder={puedeResponder}
            yaRespondida={Boolean(propia)}
            alTerminar={marco.volverA}
          />
        )}
      </Card>
    </AppShellEquipo>
  )
}
