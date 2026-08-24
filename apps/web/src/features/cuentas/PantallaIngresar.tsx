import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AvisoError, Button, IconoCargando, Input } from '../../components/ui'
import { CampoContrasena } from './CampoContrasena'
import { PantallaAutenticacion } from './PantallaAutenticacion'
import { ErrorCuenta } from './api'
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
      setErrorEnvio(error instanceof ErrorCuenta ? error.message : MENSAJE_ERROR_GENERICO)
    }
  }

  return (
    <PantallaAutenticacion
      titulo="Ingresar"
      subtitulo="Entra a tu cuenta para continuar con tus actividades."
      pie={
        <>
          ¿No tienes cuenta? <Link to="/registrarse">Regístrate</Link>
        </>
      }
    >
      <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
        {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}

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

        <Button type="submit" disabled={mutacion.isPending} className={styles.enviar}>
          {mutacion.isPending ? (
            <>
              <IconoCargando />
              Ingresando…
            </>
          ) : (
            'Ingresar'
          )}
        </Button>
      </form>
    </PantallaAutenticacion>
  )
}
