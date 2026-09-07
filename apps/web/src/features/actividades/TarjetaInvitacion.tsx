import { Button, Card } from '../../components/ui'
import type { InvitacionPendiente } from './tipos'
import styles from './TarjetaInvitacion.module.css'

export interface TarjetaInvitacionProps {
  invitacion: InvitacionPendiente
  onAceptar: (id: string) => void
  onRechazar: (id: string) => void
}

export function TarjetaInvitacion({ invitacion, onAceptar, onRechazar }: TarjetaInvitacionProps) {
  return (
    <Card className={styles.tarjeta}>
      <div className={styles.contenido}>
        <h3 className={styles.nombre}>{invitacion.nombre}</h3>
        <p className={styles.objetivo}>{invitacion.objetivo}</p>
        <p className={styles.invitadoPor}>Invitación de {invitacion.invitadoPor}</p>
      </div>

      <div className={styles.acciones}>
        <Button size="sm" onClick={() => onAceptar(invitacion.id)}>
          Aceptar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onRechazar(invitacion.id)}>
          Rechazar
        </Button>
      </div>
    </Card>
  )
}
