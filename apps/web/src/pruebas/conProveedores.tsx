import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

/** Monta `ui` con lo que toda pantalla autenticada necesita: un QueryClient
 * nuevo (sin reintentos, para que un error se vea de inmediato) y un router
 * en memoria. AppShell pide datos (la actividad del contexto, las ayudas),
 * así que ya no se puede montar sin proveedor. */
export function renderConProveedores(ui: ReactElement, { ruta = '/' }: { ruta?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
