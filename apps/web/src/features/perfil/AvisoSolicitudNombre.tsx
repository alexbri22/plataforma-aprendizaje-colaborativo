import { AvisoError, Button } from '../../components/ui'
import type { SolicitudNombre } from '../cuentas'
import { useDescartarSolicitudNombre } from './usePerfil'
import styles from './AvisoSolicitudNombre.module.css'

interface AvisoSolicitudNombreProps {
  solicitud: SolicitudNombre
}

const CLASE_POR_ESTADO: Record<SolicitudNombre['estado'], string> = {
  pendiente: styles.pendiente,
  aprobada: styles.aprobada,
  rechazada: styles.rechazada,
}

/**
 * Estado del cambio de nombre que pidió una cuenta de usuario
 * (docs/diseno-desarrollo-nucleo.md §6.3). Pendiente: confirma que llegó al
 * administrador y deja cancelarla. Aprobada o rechazada (con su motivo, si lo
 * hubo): avisa hasta que la persona lo descarte o envíe otra. Mientras está
 * pendiente, el perfil se relee solo (usePerfilPropio), así que el cambio de
 * estado aparece sin recargar.
 */
export function AvisoSolicitudNombre({ solicitud }: AvisoSolicitudNombreProps) {
  const descartar = useDescartarSolicitudNombre()
  const nombre = `${solicitud.nombre} ${solicitud.apellidoPaterno} ${solicitud.apellidoMaterno}`

  return (
    <div className={CLASE_POR_ESTADO[solicitud.estado]}>
      <div role="status" className={styles.texto}>
        {solicitud.estado === 'pendiente' ? (
          <>
            <p className={styles.titulo}>Solicitud enviada al administrador</p>
            <p>
              Pediste cambiar tu nombre a <strong>{nombre}</strong>. Tu nombre cambiará cuando un
              administrador apruebe el cambio.
            </p>
          </>
        ) : solicitud.estado === 'aprobada' ? (
          <>
            <p className={styles.titulo}>Tu cambio de nombre fue aprobado</p>
            <p>
              Ahora tu nombre es <strong>{nombre}</strong>.
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
          onClick={() => descartar.mutate(solicitud)}
        >
          {solicitud.estado === 'pendiente' ? 'Cancelar solicitud' : 'Entendido'}
        </Button>
      </div>
    </div>
  )
}
