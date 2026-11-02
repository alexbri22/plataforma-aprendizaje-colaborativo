import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { EnlacePerfil } from '../../components/EnlacePerfil'
import { AvisoError, Button, Card } from '../../components/ui'
import { ModalRechazarSolicitud } from './ModalRechazarSolicitud'
import { aprobarSolicitudNombre, listarSolicitudesNombre, type SolicitudNombreAdmin } from './api'
import styles from './SolicitudesNombre.module.css'

const CLAVE_SOLICITUDES_NOMBRE = ['admin', 'solicitudes-nombre'] as const

/** Las solicitudes llegan de otras sesiones: la lista se relee sola para que
 * aparezcan sin recargar la página. */
const INTERVALO_SOLICITUDES_MS = 15000

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
    refetchInterval: INTERVALO_SOLICITUDES_MS,
  })

  // Invalida ['admin'] y no solo las solicitudes: aprobar cambia el nombre que
  // muestra la tabla de cuentas. También tras un error: si la persona canceló
  // o reemplazó la solicitud, la lista releída ya no la trae.
  const aprobar = useMutation({
    mutationFn: (idSolicitud: string) => aprobarSolicitudNombre(idSolicitud),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  const pendientes = solicitudes.data ?? []

  // Los errores y el modal quedan fuera de la tarjeta: si resolver la última
  // solicitud falla porque ya no estaba pendiente, la lista releída queda
  // vacía y la tarjeta desaparece, pero el error y el modal abierto siguen.
  return (
    <>
      {solicitudes.isError ? <AvisoError mensaje={solicitudes.error.message} /> : null}
      {aprobar.isError ? <AvisoError mensaje={aprobar.error.message} /> : null}
      {pendientes.length > 0 ? (
        <section aria-labelledby="titulo-solicitudes-nombre">
          <Card className={styles.tarjeta}>
            <h2 id="titulo-solicitudes-nombre" className={styles.titulo}>
              Solicitudes de cambio de nombre ({pendientes.length})
            </h2>
            <ul className={styles.lista}>
              {pendientes.map((solicitud) => {
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
        </section>
      ) : null}

      {/* key por solicitud: cada apertura empieza con el motivo vacío. */}
      <ModalRechazarSolicitud
        key={enRechazo?.idSolicitud ?? 'cerrado'}
        solicitud={enRechazo}
        onCerrar={() => setEnRechazo(null)}
      />
    </>
  )
}
