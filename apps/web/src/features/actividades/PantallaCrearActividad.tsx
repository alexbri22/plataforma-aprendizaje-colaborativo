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
import { useCrearActividadMutation } from './useActividades'
import { validarCampoRequerido } from './validacion'
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

  if (
    campo === 'fechaTermino' &&
    valores.fechaInicio &&
    valores.fechaTermino <= valores.fechaInicio
  ) {
    return 'Debe ser posterior a la fecha de inicio.'
  }
  return undefined
}

export function PantallaCrearActividad() {
  const navigate = useNavigate()
  const mutacion = useCrearActividadMutation()
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES)
  const [tiposPercibidos, setTiposPercibidos] = useState<string[]>([])
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

  function alternarTipoPercibido(tipo: string) {
    setTiposPercibidos((actuales) =>
      actuales.includes(tipo) ? actuales.filter((item) => item !== tipo) : [...actuales, tipo],
    )
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
        tiposActividadPercibida: tiposPercibidos.length > 0 ? tiposPercibidos : undefined,
      })
      navigate(`/actividades/${nueva.id}`)
    } catch {
      setErrorEnvio(MENSAJE_ERROR_GENERICO)
    }
  }

  return (
    <AppShell seccionActiva="actividades" titulo="Crear actividad">
      <Card className={styles.card}>
        <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
          {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}

          <Input
            id="nombre"
            label="Nombre de la actividad"
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
            placeholder="Descripción del tipo de producto que se debe entregar, características mínimas que debe cumplir."
            value={valores.informacionGeneral}
            onChange={manejarCambio('informacionGeneral')}
            onBlur={() => validarCampo('informacionGeneral')}
            error={errores.informacionGeneral}
            disabled={mutacion.isPending}
            required
          />

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

          <Input
            id="fechaLimiteInscripcion"
            label="Fecha límite de inscripción"
            type="date"
            value={valores.fechaLimiteInscripcion}
            onChange={manejarCambio('fechaLimiteInscripcion')}
            onBlur={() => validarCampo('fechaLimiteInscripcion')}
            error={errores.fechaLimiteInscripcion}
            disabled={mutacion.isPending}
            required
          />

          <div className={styles.filaDos}>
            <Input
              id="plazoCierreDias"
              label="Plazo de cierre (días)"
              type="number"
              min="1"
              value={valores.plazoCierreDias}
              onChange={manejarCambio('plazoCierreDias')}
              onBlur={() => validarCampo('plazoCierreDias')}
              error={errores.plazoCierreDias}
              disabled={mutacion.isPending}
              required
            />
            <Input
              id="numeroEquiposEsperado"
              label="Número de equipos esperado"
              type="number"
              min="1"
              value={valores.numeroEquiposEsperado}
              onChange={manejarCambio('numeroEquiposEsperado')}
              onBlur={() => validarCampo('numeroEquiposEsperado')}
              error={errores.numeroEquiposEsperado}
              disabled={mutacion.isPending}
              required
            />
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>¿Cómo describirías esta actividad?</legend>
            <p className={styles.ayuda}>
              Uso interno, para entender qué tanta libertad sueles ceder a los participantes. No
              cambia la configuración de la actividad — eso se define función por función después de
              crearla.
            </p>
            <div className={styles.opciones}>
              {TIPOS_ACTIVIDAD_PERCIBIDA.map((tipo) => (
                <Checkbox
                  key={tipo}
                  label={tipo}
                  checked={tiposPercibidos.includes(tipo)}
                  onChange={() => alternarTipoPercibido(tipo)}
                  disabled={mutacion.isPending}
                />
              ))}
            </div>
          </fieldset>

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
