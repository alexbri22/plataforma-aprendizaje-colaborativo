import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../components/ui'
import { AvisoError } from './AvisoError'
import { CampoContrasena } from './CampoContrasena'
import { IconoCargando } from './IconoCargando'
import { PantallaAutenticacion } from './PantallaAutenticacion'
import { ErrorCuenta, iniciarSesion } from './api'
import { validarContrasena, validarCorreo } from './validacion'
import styles from './PantallaIngresar.module.css'

interface Errores {
  correo?: string
  contrasena?: string
}

const MENSAJE_ERROR_GENERICO = 'No pudimos iniciar tu sesión. Intenta de nuevo.'

export function PantallaIngresar() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

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
    setEnviando(true)
    try {
      await iniciarSesion({ correo, contrasena })
      navigate('/')
    } catch (error) {
      setErrorEnvio(error instanceof ErrorCuenta ? error.message : MENSAJE_ERROR_GENERICO)
    } finally {
      setEnviando(false)
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
          disabled={enviando}
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
          disabled={enviando}
        />

        <Button type="submit" disabled={enviando} className={styles.enviar}>
          {enviando ? (
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
