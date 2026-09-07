import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Encabezado } from '../../components/Encabezado'
import { obtenerSesion } from '../cuentas/api'
import styles from './PantallaCuentas.module.css'

export function RutaAdmin({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['sesion'],
    queryFn: obtenerSesion,
    retry: false,
  })

  if (isPending) {
    return (
      <div className={styles.page}>
        <Encabezado />
        <main id="contenido" className={styles.mainCentrado}>
          <p role="status" className={styles.estadoTexto}>
            Verificando tu sesión…
          </p>
        </main>
      </div>
    )
  }

  if (isError || !data) return <Navigate to="/ingresar" replace />
  if (data.tipoCuenta !== 'administrador') return <Navigate to="/" replace />

  return <>{children}</>
}
