import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { EnlacePerfil } from '../../components/EnlacePerfil'
import { AvisoError, Button, Card } from '../../components/ui'
import { ModalRechazarSolicitud } from './ModalRechazarSolicitud'
import { aprobarSolicitudNombre, listarSolicitudesNombre, type SolicitudNombreAdmin } from './api'
import styles from './SolicitudesNombre.module.css'

const CLAVE_SOLICITUDES_NOMBRE = ['admin', 'solicitudes-nombre'] as const

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function nombreCompleto(n: { nombre: string; apellidoPaterno: string; apellidoMaterno: string }) {
  return `${n.nombre} ${n.apellidoPaterno} ${n.apellidoMaterno}`
}

/**
 * Solicitudes de cambio de nombre pendientes (docs/diseno-desarrollo-nucleo.md
 * §6.3), arriba de la tabla de cuentas. No ocupa lugar si no hay ninguna.
 */
export function SolicitudesNombre() {
  const queryClient = useQueryClient()
  const [enRechazo, setEnRechazo] = useState<SolicitudNombreAdmin | null>(null)

  const solicitudes = useQuery({
    queryKey: CLAVE_SOLICITUDES_NOMBRE,
    queryFn: listarSolicitudesNombre,
    retry: false,
  })

  // Invalida ['admin'] y no solo las solicitudes: aprobar cambia el nombre que
  // muestra la tabla de cuentas. También tras un error: si la persona canceló
  // o reemplazó la solicitud, la lista releída ya no la trae.
  const aprobar = useMutation({
    mutationFn: (idSolicitud: string) => aprobarSolicitudNombre(idSolicitud),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  if (solicitudes.isError) {
    return <AvisoError mensaje={solicitudes.error.message} />
  }
  if (!solicitudes.data || solicitudes.data.length === 0) return null

  return (
    <section aria-labelledby="titulo-solicitudes-nombre">
      <Card className={styles.tarjeta}>
        <h2 id="titulo-solicitudes-nombre" className={styles.titulo}>
          Solicitudes de cambio de nombre ({solicitudes.data.length})
        </h2>
        {aprobar.isError ? <AvisoError mensaje={aprobar.error.message} /> : null}
        <ul className={styles.lista}>
          {solicitudes.data.map((solicitud) => {
            const solicitado = nombreCompleto(solicitud.solicitado)
            const ocupada = aprobar.isPending && aprobar.variables === solicitud.idSolicitud
            return (
              <li key={solicitud.idSolicitud} className={styles.solicitud}>
                <div className={styles.datos}>
                  <p className={styles.cambio}>
                    <EnlacePerfil idUsuario={solicitud.usuario.idUsuario}>
                      {nombreCompleto(solicitud.usuario)}
                    </EnlacePerfil>
                    <span aria-hidden="true"> → </span>
                    <span className={styles.srOnly}> pide cambiar su nombre a </span>
                    <strong>{solicitado}</strong>
                  </p>
                  <p className={styles.detalle}>
                    {solicitud.usuario.correo} ·{' '}
                    {FORMATO_FECHA.format(new Date(solicitud.creadaEn))}
                  </p>
                </div>
                <div className={styles.acciones}>
                  <Button
                    size="sm"
                    disabled={aprobar.isPending}
                    onClick={() => aprobar.mutate(solicitud.idSolicitud)}
                    aria-label={`Aprobar el cambio a ${solicitado}`}
                  >
                    {ocupada ? 'Aprobando…' : 'Aprobar'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={aprobar.isPending}
                    onClick={() => setEnRechazo(solicitud)}
                    aria-label={`Rechazar el cambio a ${solicitado}`}
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* key por solicitud: cada apertura empieza con el motivo vacío. */}
      <ModalRechazarSolicitud
        key={enRechazo?.idSolicitud ?? 'cerrado'}
        solicitud={enRechazo}
        onCerrar={() => setEnRechazo(null)}
      />
    </section>
  )
}
