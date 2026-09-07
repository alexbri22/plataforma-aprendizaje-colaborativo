import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { IconoCargando } from '../components/ui'
import { useSesion } from '../features/cuentas'
import styles from './RutaProtegida.module.css'

export interface RutaProtegidaProps {
  children: ReactNode
}

// Estado que RutaProtegida deja en la navegación a /ingresar, para que esa
// pantalla pueda retomar el destino original tras autenticarse
// (docs/diseno-desarrollo-nucleo.md §4.1: "conservando el destino").
export interface EstadoRedireccion {
  desde: string
}

// Las rutas protegidas verifican sesión en el router (docs/diseno-desarrollo-general.md
// §2.1). La verificación de permisos por rol es responsabilidad del
// servidor; esto solo evita mostrar el cascarón de la app a quien no tiene
// sesión.
export function RutaProtegida({ children }: RutaProtegidaProps) {
  const { usuario, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) {
    return (
      <div className={styles.cargando} role="status" aria-label="Verificando sesión">
        <IconoCargando size={24} />
      </div>
    )
  }

  if (!usuario) {
    const estado: EstadoRedireccion = { desde: ubicacion.pathname + ubicacion.search }
    return <Navigate to="/ingresar" state={estado} replace />
  }

  return <>{children}</>
}
