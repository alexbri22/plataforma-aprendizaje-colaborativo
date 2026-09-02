import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Select } from '../../components/ui'
import { AvisoError } from './AvisoError'
import { CampoContrasena } from './CampoContrasena'
import { IconoCargando } from './IconoCargando'
import { PantallaAutenticacion } from './PantallaAutenticacion'
import { ErrorCuenta, registrarUsuario } from './api'
import {
  validarCampoRequerido,
  validarConfirmacionContrasena,
  validarContrasena,
  validarCorreo,
} from './validacion'
import styles from './PantallaRegistrarse.module.css'

interface Valores {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  nivelEstudios: string
  institucionEducativa: string
  correo: string
  contrasena: string
  confirmarContrasena: string
}

type Errores = Partial<Record<keyof Valores, string>>

const VALORES_INICIALES: Valores = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  nivelEstudios: '',
  institucionEducativa: '',
  correo: '',
  contrasena: '',
  confirmarContrasena: '',
}

const NIVELES_ESTUDIO = [
  'Primaria',
  'Secundaria',
  'Preparatoria o bachillerato',
  'Licenciatura',
  'Posgrado',
  'Otro',
]

const MENSAJE_ERROR_GENERICO = 'No pudimos crear tu cuenta. Intenta de nuevo.'

function obtenerError(campo: keyof Valores, valores: Valores): string | undefined {
  switch (campo) {
    case 'correo':
      return validarCorreo(valores.correo)
    case 'contrasena':
      return validarContrasena(valores.contrasena)
    case 'confirmarContrasena':
      return validarConfirmacionContrasena(valores.contrasena, valores.confirmarContrasena)
    default:
      return validarCampoRequerido(valores[campo])
  }
}

export function PantallaRegistrarse() {
  const navigate = useNavigate()
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES)
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function actualizarCampo(campo: keyof Valores, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }))
  }

  function validarCampo(campo: keyof Valores) {
    setErrores((actuales) => ({ ...actuales, [campo]: obtenerError(campo, valores) }))
  }

  // Si la contraseña cambia después de que "confirmar contraseña" ya fue
  // validada, revalida esa coincidencia en vez de dejar un error obsoleto.
  function manejarCambioContrasena(valor: string) {
    actualizarCampo('contrasena', valor)
    if (!valores.confirmarContrasena) return
    setErrores((actuales) => ({
      ...actuales,
      confirmarContrasena: validarConfirmacionContrasena(valor, valores.confirmarContrasena),
    }))
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
    setEnviando(true)
    try {
      await registrarUsuario({
        nombre: valores.nombre,
        apellidoPaterno: valores.apellidoPaterno,
        apellidoMaterno: valores.apellidoMaterno,
        nivelEstudios: valores.nivelEstudios,
        institucionEducativa: valores.institucionEducativa,
        correo: valores.correo,
        contrasena: valores.contrasena,
      })
      navigate('/actividades')
    } catch (error) {
      setErrorEnvio(error instanceof ErrorCuenta ? error.message : MENSAJE_ERROR_GENERICO)
    } finally {
      setEnviando(false)
    }
  }

  function manejarCambioTexto(campo: keyof Valores) {
    return (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      actualizarCampo(campo, evento.target.value)
  }

  return (
    <PantallaAutenticacion
      titulo="Crear cuenta"
      subtitulo="Regístrate para organizar o participar en actividades colaborativas."
      anchoCard="amplia"
      pie={
        <>
          ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link>
        </>
      }
    >
      <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
        {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}

        <Input
          id="nombre"
          label="Nombre"
          autoComplete="given-name"
          value={valores.nombre}
          onChange={manejarCambioTexto('nombre')}
          onBlur={() => validarCampo('nombre')}
          error={errores.nombre}
          disabled={enviando}
          required
        />
        <div className={styles.filaDos}>
          <Input
            id="apellidoPaterno"
            label="Apellido paterno"
            autoComplete="family-name"
            value={valores.apellidoPaterno}
            onChange={manejarCambioTexto('apellidoPaterno')}
            onBlur={() => validarCampo('apellidoPaterno')}
            error={errores.apellidoPaterno}
            disabled={enviando}
            required
          />
          <Input
            id="apellidoMaterno"
            label="Apellido materno"
            autoComplete="additional-name"
            value={valores.apellidoMaterno}
            onChange={manejarCambioTexto('apellidoMaterno')}
            onBlur={() => validarCampo('apellidoMaterno')}
            error={errores.apellidoMaterno}
            disabled={enviando}
            required
          />
        </div>
        <div className={styles.filaDos}>
          <Select
            id="nivelEstudios"
            label="Nivel de estudios"
            value={valores.nivelEstudios}
            onChange={manejarCambioTexto('nivelEstudios')}
            onBlur={() => validarCampo('nivelEstudios')}
            error={errores.nivelEstudios}
            disabled={enviando}
            required
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            {NIVELES_ESTUDIO.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </Select>
          <Input
            id="institucionEducativa"
            label="Institución educativa"
            autoComplete="organization"
            value={valores.institucionEducativa}
            onChange={manejarCambioTexto('institucionEducativa')}
            onBlur={() => validarCampo('institucionEducativa')}
            error={errores.institucionEducativa}
            disabled={enviando}
            required
          />
        </div>
        <Input
          id="correo"
          label="Correo"
          type="email"
          autoComplete="email"
          value={valores.correo}
          onChange={manejarCambioTexto('correo')}
          onBlur={() => validarCampo('correo')}
          error={errores.correo}
          disabled={enviando}
          required
        />
        <div className={styles.filaDos}>
          <CampoContrasena
            id="contrasena"
            label="Contraseña"
            value={valores.contrasena}
            onChange={manejarCambioContrasena}
            onBlur={() => validarCampo('contrasena')}
            error={errores.contrasena}
            autoComplete="new-password"
            disabled={enviando}
          />
          <CampoContrasena
            id="confirmarContrasena"
            label="Confirmar contraseña"
            value={valores.confirmarContrasena}
            onChange={(valor) => actualizarCampo('confirmarContrasena', valor)}
            onBlur={() => validarCampo('confirmarContrasena')}
            error={errores.confirmarContrasena}
            autoComplete="new-password"
            disabled={enviando}
          />
        </div>

        <Button type="submit" disabled={enviando} className={styles.enviar}>
          {enviando ? (
            <>
              <IconoCargando />
              Creando cuenta…
            </>
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </form>
    </PantallaAutenticacion>
  )
}
