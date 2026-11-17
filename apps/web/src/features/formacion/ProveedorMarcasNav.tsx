import type { ReactNode } from 'react'
import { MarcasNavContexto } from '../../components/marcasNav'
import { useAvisosPropuestas } from './usePropuestas'

/** Provee las marcas de la barra lateral que dependen de Formación: las
 * decisiones nuevas sobre mis propuestas, junto a "Mi formación" (nota del
 * incremento 6). Se monta una vez, en App. */
export function ProveedorMarcasNav({ children }: { children: ReactNode }) {
  const pendientes = useAvisosPropuestas().data ?? 0
  const marcas =
    pendientes > 0
      ? {
          'mi-formacion': `${pendientes} ${
            pendientes === 1
              ? 'decisión nueva sobre tus propuestas'
              : 'decisiones nuevas sobre tus propuestas'
          }`,
        }
      : {}
  return <MarcasNavContexto.Provider value={marcas}>{children}</MarcasNavContexto.Provider>
}
