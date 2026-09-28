import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarDatosPerfil,
  cambiarContrasena,
  obtenerPerfilDeUsuario,
  obtenerPerfilPropio,
  quitarFoto,
  subirFoto,
  type CambioContrasena,
  type DatosPerfil,
  type Usuario,
  CLAVE_SESION,
} from '../cuentas'

// ['usuarios', 'yo'] y ['usuarios', id] cuelgan de la misma raíz: invalidar
// ['usuarios'] tras editar el perfil refresca las dos vistas. La sesión
// (CLAVE_SESION) se actualiza aparte porque es la que pinta el AppShell.
export const CLAVE_PERFIL_PROPIO = ['usuarios', 'yo'] as const
const claveDeUsuario = (id: string) => ['usuarios', id] as const

export function usePerfilPropio() {
  return useQuery({ queryKey: CLAVE_PERFIL_PROPIO, queryFn: obtenerPerfilPropio })
}

export function usePerfilDeUsuario(idUsuario: string) {
  return useQuery({
    queryKey: claveDeUsuario(idUsuario),
    queryFn: () => obtenerPerfilDeUsuario(idUsuario),
  })
}

function useMutacionDeUsuario<TVariables>(fn: (variables: TVariables) => Promise<Usuario>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (usuario) => {
      queryClient.setQueryData(CLAVE_SESION, usuario)
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useActualizarDatosPerfil() {
  return useMutacionDeUsuario((datos: DatosPerfil) => actualizarDatosPerfil(datos))
}

export function useSubirFoto() {
  return useMutacionDeUsuario((foto: Blob) => subirFoto(foto))
}

export function useQuitarFoto() {
  return useMutacionDeUsuario(() => quitarFoto())
}

export function useCambiarContrasena() {
  return useMutation({ mutationFn: (cambio: CambioContrasena) => cambiarContrasena(cambio) })
}
