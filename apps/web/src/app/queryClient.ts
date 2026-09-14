import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Estado del servidor (docs/diseno-desarrollo-general.md §2.1): un
      // reintento basta en desarrollo, no la cadena de reintentos por
      // defecto de TanStack Query pensada para redes móviles inestables.
      retry: 1,
    },
  },
})
