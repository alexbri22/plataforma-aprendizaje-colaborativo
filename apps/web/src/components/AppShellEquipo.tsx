import type { ElementoEspacioEquipo } from '@plataforma/shared'
import type { ReactNode } from 'react'
import type { PistaDePantalla } from '../features/ayuda'
import { AppShell } from './AppShell'

export type SeccionEquipo = ElementoEspacioEquipo | 'bitacora' | 'bitacoras' | 'bitacora-integrante'

export interface AppShellEquipoProps {
  idEquipo: string
  seccionActiva: SeccionEquipo
  /** Solo con 'bitacora-integrante': de quién es la bitácora que se ve. */
  idMembresia?: string
  titulo: string
  /** Pantallas de detalle (la bitácora de alguien): a dónde regresa la flecha
   * del título y cómo se llama ese lugar. */
  volverA?: string
  volverEtiqueta?: string
  ayuda?: PistaDePantalla
  acciones?: ReactNode
  children: ReactNode
}

// Las pantallas del espacio de un equipo (metas, avances, materiales y
// bitácoras). Ya no hay una barra lateral aparte (decisión de producto: un
// solo shell): el equipo es un nivel más de la actividad en la barra de
// AppShell. Esto solo traduce el idEquipo de la URL a ese contexto.
export function AppShellEquipo({
  idEquipo,
  seccionActiva,
  idMembresia,
  titulo,
  volverA,
  volverEtiqueta,
  ayuda,
  acciones,
  children,
}: AppShellEquipoProps) {
  return (
    <AppShell
      seccionActiva="actividades"
      titulo={titulo}
      volverA={volverA}
      volverEtiqueta={volverEtiqueta}
      ayuda={ayuda}
      acciones={acciones}
      contexto={{ idEquipo, seccion: seccionActiva, idMembresia }}
    >
      {children}
    </AppShell>
  )
}
