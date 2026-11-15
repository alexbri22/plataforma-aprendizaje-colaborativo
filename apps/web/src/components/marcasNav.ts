import { createContext, useContext } from 'react'
import type { SeccionApp } from './AppShell'

/**
 * Marcas de la barra lateral: un aviso pendiente junto a un ítem (por
 * ejemplo, decisiones nuevas sobre mis propuestas en "Mi formación"). El
 * AppShell solo las lee; las provee quien tiene el dato (ProveedorMarcasNav de
 * Formación, montado en App). Cada marca es el texto que la explica: el punto
 * solo acompaña, nunca la sustituye. Sin proveedor no hay marcas, así que una
 * pantalla probada sola no pide nada de más.
 */
export type MarcasNav = Partial<Record<SeccionApp, string>>

export const MarcasNavContexto = createContext<MarcasNav>({})

export function useMarcasNav(): MarcasNav {
  return useContext(MarcasNavContexto)
}
