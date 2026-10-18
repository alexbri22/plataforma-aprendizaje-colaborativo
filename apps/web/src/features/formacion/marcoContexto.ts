import { createContext, useContext } from 'react'

// Si la pantalla formativa se muestra dentro del AppShell (hay sesión). Ahí la
// barra superior ya pone el <h1> de la página, así que el título propio de la
// pantalla baja a <h2> y el contenedor no repite el margen del shell.
export const DentroDeAppContexto = createContext(false)

export function useDentroDeApp(): boolean {
  return useContext(DentroDeAppContexto)
}
