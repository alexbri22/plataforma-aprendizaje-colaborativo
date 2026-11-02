import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { AvisoError, Button, Modal, Textarea } from '../../components/ui'
import { rechazarSolicitudNombre, type SolicitudNombreAdmin } from './api'
import styles from './ModalRestablecerContrasena.module.css'

interface ModalRechazarSolicitudProps {
  // Solicitud a rechazar; null cuando el modal está cerrado.
  solicitud: SolicitudNombreAdmin | null
  onCerrar: () => void
}

// Mismo límite que el API (services/cuentas/validacion.ts, MAX_MOTIVO_RECHAZO).
const MAX_MOTIVO = 500

/** Rechazo de un cambio de nombre con un motivo opcional, que la persona lee
 * en su perfil (docs/diseno-desarrollo-nucleo.md §6.3). */
export function ModalRechazarSolicitud({ solicitud, onCerrar }: ModalRechazarSolicitudProps) {
  const queryClient = useQueryClient()
  const [motivo, setMotivo] = useState('')

  const rechazar = useMutation({
    mutationFn: () => rechazarSolicitudNombre(solicitud!.idSolicitud, motivo.trim()),
    onSuccess: onCerrar,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'solicitudes-nombre'] }),
  })

  if (!solicitud) return null

  const { nombre, apellidoPaterno, apellidoMaterno } = solicitud.solicitado

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    rechazar.mutate()
  }

  return (
    <Modal
      abierto={solicitud !== null}
      onCerrar={onCerrar}
      titulo="Rechazar cambio de nombre"
      descripcion={
        <>
          {solicitud.usuario.nombre} {solicitud.usuario.apellidoPaterno} pidió cambiar su nombre a{' '}
          <strong>
            {nombre} {apellidoPaterno} {apellidoMaterno}
          </strong>
          . Su nombre se queda como está.
        </>
      }
    >
      <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
        {rechazar.isError ? <AvisoError mensaje={rechazar.error.message} /> : null}
        <Textarea
          id="motivo-rechazo"
          label="Motivo (opcional, lo verá en su perfil)"
          value={motivo}
          maxLength={MAX_MOTIVO}
          onChange={(evento) => setMotivo(evento.target.value)}
          disabled={rechazar.isPending}
        />
        <div className={styles.acciones}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCerrar}
            disabled={rechazar.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={rechazar.isPending}>
            {rechazar.isPending ? 'Rechazando…' : 'Rechazar solicitud'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
