import { AvisoError, Button } from '../../components/ui'
import type { SolicitudNombre } from '../cuentas'
import { useDescartarSolicitudNombre } from './usePerfil'
import styles from './AvisoSolicitudNombre.module.css'

interface AvisoSolicitudNombreProps {
  solicitud: SolicitudNombre
}

/**
 * Estado del cambio de nombre que pidió una cuenta de usuario
 * (docs/diseno-desarrollo-nucleo.md §6.3). Pendiente: confirma que llegó al
 * administrador y deja cancelarla. Rechazada: dice por qué, si hubo motivo,
 * hasta que la persona lo descarte o envíe otra.
 */
export function AvisoSolicitudNombre({ solicitud }: AvisoSolicitudNombreProps) {
  const descartar = useDescartarSolicitudNombre()
  const nombre = `${solicitud.nombre} ${solicitud.apellidoPaterno} ${solicitud.apellidoMaterno}`
  const pendiente = solicitud.estado === 'pendiente'

  return (
    <div className={pendiente ? styles.pendiente : styles.rechazada}>
      <div role="status" className={styles.texto}>
        {pendiente ? (
          <>
            <p className={styles.titulo}>Solicitud enviada al administrador</p>
            <p>
              Pediste cambiar tu nombre a <strong>{nombre}</strong>. Tu nombre cambiará cuando un
              administrador apruebe el cambio.
            </p>
          </>
        ) : (
          <>
            <p className={styles.titulo}>Tu cambio de nombre fue rechazado</p>
            <p>
              Un administrador rechazó el cambio a <strong>{nombre}</strong>. Puedes enviar otra
              solicitud con el formulario.
            </p>
            {solicitud.motivoRechazo ? (
              <p className={styles.motivo}>Motivo: {solicitud.motivoRechazo}</p>
            ) : null}
          </>
        )}
      </div>
      {descartar.isError ? <AvisoError mensaje={descartar.error.message} /> : null}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={descartar.isPending}
          onClick={() => descartar.mutate()}
        >
          {pendiente ? 'Cancelar solicitud' : 'Entendido'}
        </Button>
      </div>
    </div>
  )
}
