import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { IconoCargando } from '../../components/ui'
import { useSesion } from '../cuentas'
import styles from './PantallaCuentas.module.css'

export function RutaAdmin({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion()

  if (cargando) {
    return (
      <div className={styles.cargando} role="status" aria-label="Verificando sesión">
        <IconoCargando size={24} />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/ingresar" replace />
  if (usuario.tipoCuenta !== 'administrador') return <Navigate to="/" replace />

  return <>{children}</>
}
