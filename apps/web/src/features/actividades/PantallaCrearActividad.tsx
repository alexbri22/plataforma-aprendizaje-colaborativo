import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Button,
  Card,
  Checkbox,
  IconoCargando,
  Input,
  Textarea,
} from '../../components/ui'
import { formatearFecha, sumarDias } from './formato'
import { useCrearActividadMutation } from './useActividades'
import { validarCampoRequerido, validarEnteroPositivo } from './validacion'
import styles from './PantallaCrearActividad.module.css'

interface Valores {
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: string
  fechaTermino: string
  fechaLimiteInscripcion: string
  plazoCierreDias: string
  numeroEquiposEsperado: string
}

type Errores = Partial<Record<keyof Valores, string>>

const VALORES_INICIALES: Valores = {
  nombre: '',
  objetivo: '',
  informacionGeneral: '',
  fechaInicio: '',
  fechaTermino: '',
  fechaLimiteInscripcion: '',
  plazoCierreDias: '',
  numeroEquiposEsperado: '',
}

// Pendiente de confirmar en reunión de equipo (ver comentario en
// DatosCrearActividad, actividades.api.ts): son telemetría, no modos de
// gestión — la actividad no cambia de comportamiento según lo que se marque
// aquí, cada función de seguimiento se configura por separado.
const TIPOS_ACTIVIDAD_PERCIBIDA = ['Dirigida', 'Semi-dirigida', 'Autodirigida']

const MENSAJE_ERROR_GENERICO = 'No pudimos crear la actividad. Intenta de nuevo.'

function obtenerError(campo: keyof Valores, valores: Valores): string | undefined {
  const requerido = validarCampoRequerido(valores[campo])
  if (requerido) return requerido

  if (campo === 'plazoCierreDias' || campo === 'numeroEquiposEsperado') {
    const entero = validarEnteroPositivo(valores[campo])
    if (entero) return entero
  }

  if (
    campo === 'fechaTermino' &&
    valores.fechaInicio &&
    valores.fechaTermino <= valores.fechaInicio
  ) {
    return 'Debe ser posterior a la fecha de inicio.'
  }

  if (
    campo === 'fechaLimiteInscripcion' &&
    valores.fechaTermino &&
    valores.fechaLimiteInscripcion >= valores.fechaTermino
  ) {
    return 'Debe ser anterior a la fecha de término.'
  }
  return undefined
}

// Las fechas explicadas con los datos de la propia actividad, no con
// definiciones: así se ve qué pasa cuándo, y un error (la inscripción
// después del término) salta a la vista. Cada tramo aparece en cuanto hay
// datos para calcularlo.
function ResumenFechas({ valores }: { valores: Valores }) {
  const { fechaInicio, fechaTermino, fechaLimiteInscripcion, plazoCierreDias } = valores
  const dias = Number(plazoCierreDias)
  const tramos: { etiqueta: string; valor: string }[] = []

  if (fechaLimiteInscripcion) {
    tramos.push({
      etiqueta: 'Inscripción con la clave',
      valor: `hasta el ${formatearFecha(fechaLimiteInscripcion)}`,
    })
  }
  if (fechaInicio && fechaTermino && fechaTermino > fechaInicio) {
    tramos.push({
      etiqueta: 'Trabajo en equipo',
      valor: `del ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaTermino)}`,
    })
  }
  if (fechaTermino && Number.isInteger(dias) && dias > 0) {
    tramos.push({
      etiqueta: 'Reconocimientos',
      valor: `del ${formatearFecha(fechaTermino)} al ${formatearFecha(sumarDias(fechaTermino, dias))}`,
    })
  }

  if (tramos.length === 0) return null
  return (
    <dl className={styles.resumenFechas} aria-live="polite">
      {tramos.map((tramo) => (
        <div key={tramo.etiqueta} className={styles.tramo}>
          <dt>{tramo.etiqueta}</dt>
          <dd>{tramo.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PantallaCrearActividad() {
  const navigate = useNavigate()
  const mutacion = useCrearActividadMutation()
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES)
  const [tipoPercibido, setTipoPercibido] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  function actualizarCampo(campo: keyof Valores, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }))
  }

  function manejarCambio(campo: keyof Valores) {
    return (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      actualizarCampo(campo, evento.target.value)
  }

  function validarCampo(campo: keyof Valores) {
    setErrores((actuales) => ({ ...actuales, [campo]: obtenerError(campo, valores) }))
  }

  // A lo más uno: elegir otro reemplaza la selección; elegir el mismo la
  // quita, para no forzar una respuesta en un campo opcional.
  function seleccionarTipoPercibido(tipo: string) {
    setTipoPercibido((actual) => (actual === tipo ? null : tipo))
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const campos = Object.keys(VALORES_INICIALES) as (keyof Valores)[]
    const nuevosErrores: Errores = {}
    for (const campo of campos) {
      nuevosErrores[campo] = obtenerError(campo, valores)
    }
    setErrores(nuevosErrores)

    const campoInvalido = campos.find((campo) => nuevosErrores[campo])
    if (campoInvalido) {
      document.getElementById(campoInvalido)?.focus()
      return
    }

    setErrorEnvio(null)
    try {
      const nueva = await mutacion.mutateAsync({
        nombre: valores.nombre,
        objetivo: valores.objetivo,
        informacionGeneral: valores.informacionGeneral,
        fechaInicio: valores.fechaInicio,
        fechaTermino: valores.fechaTermino,
        fechaLimiteInscripcion: valores.fechaLimiteInscripcion,
        plazoCierreDias: Number(valores.plazoCierreDias),
        numeroEquiposEsperado: Number(valores.numeroEquiposEsperado),
        tipoActividadPercibida: tipoPercibido ?? undefined,
      })
      navigate(`/actividades/${nueva.id}`)
    } catch {
      setErrorEnvio(MENSAJE_ERROR_GENERICO)
    }
  }

  return (
    <AppShell
      seccionActiva="actividades-organizo"
      titulo="Crear actividad"
      volverA={'/actividades/organizo'}
    >
      <Card className={styles.card}>
        <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
          {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}

          <section className={styles.seccion} aria-labelledby="seccion-participantes">
            <h2 id="seccion-participantes" className={styles.seccionTitulo}>
              Lo que verán los participantes
            </h2>
            <Input
              id="nombre"
              label="Nombre de la actividad"
              ayuda="Así aparece en la lista de los participantes."
              value={valores.nombre}
              onChange={manejarCambio('nombre')}
              onBlur={() => validarCampo('nombre')}
              error={errores.nombre}
              disabled={mutacion.isPending}
              required
            />
            <Textarea
              id="objetivo"
              label="Objetivo"
              ayuda="Qué se espera que logren. Aparece en la tarjeta de la actividad."
              rows={2}
              value={valores.objetivo}
              onChange={manejarCambio('objetivo')}
              onBlur={() => validarCampo('objetivo')}
              error={errores.objetivo}
              disabled={mutacion.isPending}
              required
            />
            <Textarea
              id="informacionGeneral"
              label="Información general"
              ayuda="Qué producto deben entregar los equipos y qué mínimos debe cumplir."
              rows={2}
              value={valores.informacionGeneral}
              onChange={manejarCambio('informacionGeneral')}
              onBlur={() => validarCampo('informacionGeneral')}
              error={errores.informacionGeneral}
              disabled={mutacion.isPending}
              required
            />
          </section>

          <section className={styles.seccion} aria-labelledby="seccion-calendario">
            <h2 id="seccion-calendario" className={styles.seccionTitulo}>
              Calendario
            </h2>
            <div className={styles.filaDos}>
              <Input
                id="fechaInicio"
                label="Fecha de inicio"
                type="date"
                value={valores.fechaInicio}
                onChange={manejarCambio('fechaInicio')}
                onBlur={() => validarCampo('fechaInicio')}
                error={errores.fechaInicio}
                disabled={mutacion.isPending}
                required
              />
              <Input
                id="fechaTermino"
                label="Fecha de término"
                type="date"
                value={valores.fechaTermino}
                onChange={manejarCambio('fechaTermino')}
                onBlur={() => validarCampo('fechaTermino')}
                error={errores.fechaTermino}
                disabled={mutacion.isPending}
                required
              />
            </div>
            {/* Una sola ayuda para las dos fechas, debajo del par: cuentan
                lo mismo y repetirla en cada una sería ruido. */}
            <p className={styles.ayudaPar}>
              Las entregas de avances se reparten entre estas dos fechas.
            </p>
            <Input
              id="fechaLimiteInscripcion"
              label="Fecha límite de inscripción"
              ayuda="Último día para unirse con la clave. Al terminar ese día, si ya hay participantes, pasa sola a la formación de equipos."
              type="date"
              value={valores.fechaLimiteInscripcion}
              onChange={manejarCambio('fechaLimiteInscripcion')}
              onBlur={() => validarCampo('fechaLimiteInscripcion')}
              error={errores.fechaLimiteInscripcion}
              disabled={mutacion.isPending}
              required
            />
          </section>

          <section className={styles.seccion} aria-labelledby="seccion-equipos">
            <h2 id="seccion-equipos" className={styles.seccionTitulo}>
              Equipos y cierre
            </h2>
            <Input
              id="numeroEquiposEsperado"
              label="Equipos esperados"
              ayuda="Cuántos equipos sugerirá Co3 al repartir a los participantes. Después puedes ajustarlos."
              type="number"
              min="1"
              value={valores.numeroEquiposEsperado}
              onChange={manejarCambio('numeroEquiposEsperado')}
              onBlur={() => validarCampo('numeroEquiposEsperado')}
              error={errores.numeroEquiposEsperado}
              disabled={mutacion.isPending}
              required
            />
            <Input
              id="plazoCierreDias"
              label="Días para reconocer al cierre"
              ayuda="Días después del término en que los participantes se reconocen entre sí."
              type="number"
              min="1"
              value={valores.plazoCierreDias}
              onChange={manejarCambio('plazoCierreDias')}
              onBlur={() => validarCampo('plazoCierreDias')}
              error={errores.plazoCierreDias}
              disabled={mutacion.isPending}
              required
            />
            <ResumenFechas valores={valores} />
          </section>

          {/* El divisor lo pone el bloque y no el fieldset: el navegador corta
              el borde de un fieldset a la altura de su leyenda. */}
          <div className={styles.seccion}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>
                ¿Cómo describirías esta actividad? <span className={styles.opcional}>Opcional</span>
              </legend>
              <p className={styles.ayuda}>Solo para estadística; no cambia nada de la actividad.</p>
              <div className={styles.opciones}>
                {TIPOS_ACTIVIDAD_PERCIBIDA.map((tipo) => (
                  <Checkbox
                    key={tipo}
                    label={tipo}
                    checked={tipoPercibido === tipo}
                    onChange={() => seleccionarTipoPercibido(tipo)}
                    disabled={mutacion.isPending}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <p className={styles.nota}>
            Estos datos no se pueden cambiar después de crear la actividad.
          </p>
          <Button type="submit" disabled={mutacion.isPending} className={styles.enviar}>
            {mutacion.isPending ? (
              <>
                <IconoCargando />
                Creando…
              </>
            ) : (
              'Crear actividad'
            )}
          </Button>
        </form>
      </Card>
    </AppShell>
  )
}
