import type { IdPista } from '@plataforma/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSesion } from '../cuentas'
import { marcarPistaVista, obtenerPistasVistas, reiniciarPistas } from './ayuda.api'

const CLAVE_PISTAS = ['pistas'] as const

// Qué ayudas de primera vez ya vio la persona. Se pide una vez por sesión
// (staleTime infinito: solo cambia por lo que hace esta misma persona aquí).
// Mientras carga, o si falla, ninguna ayuda se abre sola: es preferible no
// mostrar una ayuda a mostrarla de más.
export function usePistas() {
  const { usuario } = useSesion()
  const queryClient = useQueryClient()
  const consulta = useQuery({
    queryKey: CLAVE_PISTAS,
    queryFn: obtenerPistasVistas,
    enabled: Boolean(usuario),
    staleTime: Infinity,
  })

  // Optimista: la ayuda se cierra al instante; si el PUT falla, la peor
  // consecuencia es que vuelva a aparecer otro día.
  // `mutate` es estable entre renders: así `marcar` también lo es y puede ir
  // en dependencias (Modal reinicia el foco si cambia su onCerrar).
  const { mutate: marcar } = useMutation({
    mutationFn: marcarPistaVista,
    onMutate: (idPista) => {
      queryClient.setQueryData<IdPista[]>(CLAVE_PISTAS, (vistas = []) =>
        vistas.includes(idPista) ? vistas : [...vistas, idPista],
      )
    },
  })

  const reiniciar = useMutation({
    mutationFn: reiniciarPistas,
    onSuccess: () => queryClient.setQueryData<IdPista[]>(CLAVE_PISTAS, []),
  })

  const vistas = consulta.data
  return {
    /** Si la ayuda debe abrirse sola: se sabe con certeza que no la ha visto. */
    pendiente: (idPista: IdPista) => vistas !== undefined && !vistas.includes(idPista),
    marcar,
    reiniciar: reiniciar.mutateAsync,
    reiniciando: reiniciar.isPending,
  }
}
