import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AvisoError, Button, IconoCargando, Input } from '../../components/ui'
import { CampoContrasena } from './CampoContrasena'
import { PantallaAutenticacion } from './PantallaAutenticacion'
import { ErrorCuenta } from './api'
import { describirEspera, formatearCuentaRegresiva, useEsperaReintento } from './useEsperaReintento'
import { useIniciarSesionMutation } from './useSesion'
import { validarContrasena, validarCorreo } from './validacion'
import styles from './PantallaIngresar.module.css'

interface Errores {
  correo?: string
  contrasena?: string
}

const MENSAJE_ERROR_GENERICO = 'No pudimos iniciar tu sesión. Intenta de nuevo.'
const DESTINO_POR_DEFECTO = '/actividades'

export function PantallaIngresar() {
  const navigate = useNavigate()
  // RutaProtegida deja aquí a dónde iba quien no tenía sesión, para
  // retomarlo tras autenticarse (docs/diseno-desarrollo-nucleo.md §4.1).
  const location = useLocation()
  const destino = (location.state as { desde?: string } | null)?.desde ?? DESTINO_POR_DEFECTO
  const mutacion = useIniciarSesionMutation()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  // El aviso de espera dice "en N minutos": al terminar la espera ya no es
  // cierto, así que se retira junto con el bloqueo del botón.
  const [errorEsDeEspera, setErrorEsDeEspera] = useState(false)
  const espera = useEsperaReintento()

  const errorVisible = errorEsDeEspera && !espera.esperando ? null : errorEnvio

  function obtenerError(campo: keyof Errores): string | undefined {
    if (campo === 'correo') return validarCorreo(correo)
    return validarContrasena(contrasena)
  }

  function validarCampo(campo: keyof Errores) {
    setErrores((actuales) => ({ ...actuales, [campo]: obtenerError(campo) }))
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const nuevosErrores: Errores = {
      correo: validarCorreo(correo),
      contrasena: validarContrasena(contrasena),
    }
    setErrores(nuevosErrores)

    const campoInvalido = (Object.keys(nuevosErrores) as (keyof Errores)[]).find(
      (campo) => nuevosErrores[campo],
    )
    if (campoInvalido) {
      document.getElementById(campoInvalido)?.focus()
      return
    }

    setErrorEnvio(null)
    try {
      await mutacion.mutateAsync({ correo, contrasena })
      navigate(destino, { replace: true })
    } catch (error) {
      if (error instanceof ErrorCuenta && error.reintentarEnSegundos) {
        espera.iniciar(error.reintentarEnSegundos)
        setErrorEsDeEspera(true)
        setErrorEnvio(
          `${error.message} Vuelve a intentarlo en ${describirEspera(error.reintentarEnSegundos)}.`,
        )
        return
      }
      setErrorEsDeEspera(false)
      setErrorEnvio(error instanceof ErrorCuenta ? error.message : MENSAJE_ERROR_GENERICO)
    }
  }

  return (
    <PantallaAutenticacion
      titulo="Ingresar"
      subtitulo="Entra a tu cuenta para continuar con tus actividades."
      pie={
        <>
          ¿No tienes cuenta? <Link to="/registrarse">Crea una</Link>
        </>
      }
    >
      <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
        {errorVisible ? <AvisoError mensaje={errorVisible} /> : null}

        <Input
          id="correo"
          label="Correo"
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => setCorreo(evento.target.value)}
          onBlur={() => validarCampo('correo')}
          error={errores.correo}
          disabled={mutacion.isPending}
          required
        />

        <CampoContrasena
          id="contrasena"
          label="Contraseña"
          value={contrasena}
          onChange={setContrasena}
          onBlur={() => validarCampo('contrasena')}
          error={errores.contrasena}
          autoComplete="current-password"
          disabled={mutacion.isPending}
        />

        <Button
          type="submit"
          disabled={mutacion.isPending || espera.esperando}
          className={styles.enviar}
        >
          {mutacion.isPending ? (
            <>
              <IconoCargando />
              Ingresando…
            </>
          ) : espera.esperando ? (
            `Espera ${formatearCuentaRegresiva(espera.segundosRestantes)}`
          ) : (
            'Ingresar'
          )}
        </Button>
      </form>
    </PantallaAutenticacion>
  )
}
