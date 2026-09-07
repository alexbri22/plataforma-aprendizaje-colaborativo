import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '../../components/ui'
import { AvisoError } from '../cuentas/AvisoError'
import { ErrorAdmin, restablecerContrasena, type CuentaAdmin } from './api'
import styles from './ModalRestablecerContrasena.module.css'

interface ModalRestablecerContrasenaProps {
  // Cuenta objetivo; null cuando el modal está cerrado.
  cuenta: CuentaAdmin | null
  onCerrar: () => void
}

const LONGITUD_MINIMA = 8
const MENSAJE_ERROR_GENERICO = 'No pudimos restablecer la contraseña. Intenta de nuevo.'

function nombreCompleto(cuenta: CuentaAdmin): string {
  return `${cuenta.nombre} ${cuenta.apellidoPaterno} ${cuenta.apellidoMaterno}`
}

export function ModalRestablecerContrasena({ cuenta, onCerrar }: ModalRestablecerContrasenaProps) {
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<{ contrasena?: string; confirmacion?: string }>({})

  const mutacion = useMutation({
    mutationFn: (nueva: string) => restablecerContrasena(cuenta!.idUsuario, nueva),
  })

  if (!cuenta) return null

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const nuevosErrores: { contrasena?: string; confirmacion?: string } = {}
    if (contrasena.length < LONGITUD_MINIMA) {
      nuevosErrores.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (confirmacion !== contrasena) {
      nuevosErrores.confirmacion = 'Las contraseñas no coinciden.'
    }
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    mutacion.mutate(contrasena)
  }

  const nombre = nombreCompleto(cuenta)

  return (
    <Modal
      abierto={cuenta !== null}
      onCerrar={onCerrar}
      titulo="Restablecer contraseña"
      descripcion={
        mutacion.isSuccess ? undefined : (
          <>
            Define una nueva contraseña para <strong>{nombre}</strong> ({cuenta.correo}).
            Comunícasela por tu canal habitual: sus sesiones abiertas se cerrarán.
          </>
        )
      }
    >
      {mutacion.isSuccess ? (
        <div className={styles.exito}>
          <p role="status" className={styles.exitoTexto}>
            Contraseña restablecida para <strong>{nombre}</strong>. Sus sesiones se cerraron; deberá
            ingresar con la nueva contraseña.
          </p>
          <div className={styles.acciones}>
            <Button type="button" onClick={onCerrar}>
              Listo
            </Button>
          </div>
        </div>
      ) : (
        <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
          {mutacion.isError ? (
            <AvisoError
              mensaje={
                mutacion.error instanceof ErrorAdmin
                  ? mutacion.error.message
                  : MENSAJE_ERROR_GENERICO
              }
            />
          ) : null}

          <Input
            id="nueva-contrasena"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            error={errores.contrasena}
            disabled={mutacion.isPending}
            required
          />

          <Input
            id="confirmar-contrasena"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            error={errores.confirmacion}
            disabled={mutacion.isPending}
            required
          />

          <div className={styles.acciones}>
            <Button
              type="button"
              variant="secondary"
              onClick={onCerrar}
              disabled={mutacion.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutacion.isPending}>
              {mutacion.isPending ? 'Restableciendo…' : 'Restablecer contraseña'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
