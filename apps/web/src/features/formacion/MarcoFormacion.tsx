import type { ReactNode } from 'react'
import { AppShell, type SeccionApp } from '../../components/AppShell'
import { Encabezado } from '../../components/Encabezado'
import { IconoCargando } from '../../components/ui'
import { useSesion } from '../cuentas'
import { AvisoSinCuenta } from './AvisoSinCuenta'
import { DentroDeAppContexto } from './marcoContexto'
import styles from './MarcoFormacion.module.css'

export interface MarcoFormacionProps {
  titulo: string
  /** Qué ítem de la barra lateral marca, con sesión. */
  seccionActiva?: SeccionApp
  children: ReactNode
}

// El contenido formativo es público (concepto §2.6): sin sesión se muestra
// con el Encabezado público y el aviso de que el progreso no se guarda; con
// sesión, dentro del AppShell, para que quien ya entró no pierda su
// navegación. Mismo criterio que PantallaProximamente.
export function MarcoFormacion({
  titulo,
  seccionActiva = 'recursos',
  children,
}: MarcoFormacionProps) {
  const { usuario, cargando } = useSesion()

  if (cargando) {
    return (
      <div className={styles.cargando} role="status" aria-label="Cargando">
        <IconoCargando size={24} />
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className={styles.paginaPublica}>
        <Encabezado />
        <AvisoSinCuenta />
        <main id="contenido">{children}</main>
      </div>
    )
  }

  return (
    <AppShell seccionActiva={seccionActiva} titulo={titulo}>
      <DentroDeAppContexto.Provider value={true}>{children}</DentroDeAppContexto.Provider>
    </AppShell>
  )
}
