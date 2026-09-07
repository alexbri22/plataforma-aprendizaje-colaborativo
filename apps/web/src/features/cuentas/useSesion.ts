import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActual,
  registrarUsuario,
  type CredencialesIngreso,
  type DatosRegistro,
  type Usuario,
} from './api'

// Clave única para la sesión actual: docs/diseno-desarrollo-general.md §2.1
// fija que la caché de TanStack Query es la única copia del estado del
// servidor en el cliente — ningún componente guarda una segunda copia.
export const CLAVE_SESION = ['sesion'] as const

export function useSesion() {
  const { data, isPending } = useQuery({
    queryKey: CLAVE_SESION,
    queryFn: obtenerSesionActual,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return { usuario: data ?? null, cargando: isPending }
}

export function useIniciarSesionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credenciales: CredencialesIngreso) => iniciarSesion(credenciales),
    onSuccess: (usuario: Usuario) => {
      queryClient.setQueryData(CLAVE_SESION, usuario)
    },
  })
}

export function useRegistrarUsuarioMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosRegistro) => registrarUsuario(datos),
    onSuccess: (usuario: Usuario) => {
      queryClient.setQueryData(CLAVE_SESION, usuario)
    },
  })
}

export function useCerrarSesionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cerrarSesion,
    onSuccess: () => {
      queryClient.setQueryData(CLAVE_SESION, null)
    },
  })
}
