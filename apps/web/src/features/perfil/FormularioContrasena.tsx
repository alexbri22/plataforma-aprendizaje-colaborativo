import { useState, type FormEvent } from 'react'
import { AvisoError, Button } from '../../components/ui'
import { useCambiarContrasena } from './usePerfil'
import styles from './FormularioPerfil.module.css'
import {
  ErrorPerfil,
  CampoContrasena,
  validarConfirmacionContrasena,
  validarContrasena,
} from '../cuentas'

interface Valores {
  contrasenaActual: string
  contrasenaNueva: string
  confirmacion: string
}

type Errores = Partial<Record<keyof Valores, string>>

const VACIO: Valores = { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' }

/** Cambio de contraseña exigiendo la actual. Al completarse, el servidor
 * cierra las demás sesiones (docs/diseno-desarrollo-nucleo.md §3.2). */
export function FormularioContrasena() {
  const mutacion = useCambiarContrasena()
  const [valores, setValores] = useState<Valores>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  function actualizar(campo: keyof Valores, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }))
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nuevos: Errores = {
      contrasenaActual: valores.contrasenaActual ? undefined : 'Escribe tu contraseña actual.',
      contrasenaNueva: validarContrasena(valores.contrasenaNueva),
      confirmacion: validarConfirmacionContrasena(valores.contrasenaNueva, valores.confirmacion),
    }
    if (!nuevos.contrasenaNueva && valores.contrasenaNueva === valores.contrasenaActual) {
      nuevos.contrasenaNueva = 'La contraseña nueva debe ser distinta de la actual.'
    }
    setErrores(nuevos)

    const invalido = (Object.keys(nuevos) as (keyof Valores)[]).find((campo) => nuevos[campo])
    if (invalido) {
      document.getElementById(`contrasena-${invalido}`)?.focus()
      return
    }

    setErrorEnvio(null)
    try {
      await mutacion.mutateAsync({
        contrasenaActual: valores.contrasenaActual,
        contrasenaNueva: valores.contrasenaNueva,
      })
      setValores(VACIO)
    } catch (error) {
      if (error instanceof ErrorPerfil && error.detallePorCampo) {
        setErrores(error.detallePorCampo)
      }
      setErrorEnvio(error instanceof Error ? error.message : 'No pudimos cambiar tu contraseña.')
    }
  }

  return (
    <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
      {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}
      <CampoContrasena
        id="contrasena-contrasenaActual"
        label="Contraseña actual"
        autoComplete="current-password"
        value={valores.contrasenaActual}
        onChange={(valor) => actualizar('contrasenaActual', valor)}
        error={errores.contrasenaActual}
        disabled={mutacion.isPending}
      />
      <div className={styles.filaDos}>
        <CampoContrasena
          id="contrasena-contrasenaNueva"
          label="Contraseña nueva"
          autoComplete="new-password"
          value={valores.contrasenaNueva}
          onChange={(valor) => actualizar('contrasenaNueva', valor)}
          error={errores.contrasenaNueva}
          disabled={mutacion.isPending}
        />
        <CampoContrasena
          id="contrasena-confirmacion"
          label="Confirmar contraseña nueva"
          autoComplete="new-password"
          value={valores.confirmacion}
          onChange={(valor) => actualizar('confirmacion', valor)}
          error={errores.confirmacion}
          disabled={mutacion.isPending}
        />
      </div>
      <p className={styles.nota}>Al cambiarla se cerrarán tus otras sesiones; esta se mantiene.</p>
      <div className={styles.acciones}>
        <Button type="submit" variant="secondary" disabled={mutacion.isPending}>
          {mutacion.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
        {mutacion.isSuccess && valores === VACIO ? (
          <p className={styles.confirmacion} role="status">
            Contraseña cambiada.
          </p>
        ) : null}
      </div>
    </form>
  )
}
