import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarDatosPerfil,
  cambiarContrasena,
  cambiarVisibilidadCorreo,
  descartarSolicitudNombre,
  obtenerPerfilDeUsuario,
  obtenerPerfilPropio,
  quitarFoto,
  solicitarCambioNombre,
  subirFoto,
  type CambioContrasena,
  type DatosPerfil,
  type SolicitudNombre,
  type Usuario,
  CLAVE_SESION,
} from '../cuentas'

// ['usuarios', 'yo'] y ['usuarios', id] cuelgan de la misma raíz: invalidar
// ['usuarios'] tras editar el perfil refresca las dos vistas. La sesión
// (CLAVE_SESION) se actualiza aparte porque es la que pinta el AppShell.
export const CLAVE_PERFIL_PROPIO = ['usuarios', 'yo'] as const
const claveDeUsuario = (id: string) => ['usuarios', id] as const

/** Cada cuánto se relee el perfil mientras hay una solicitud de cambio de
 * nombre pendiente: la resuelve otra persona, en otra sesión. */
export const INTERVALO_SOLICITUD_PENDIENTE_MS = 2000

export function usePerfilPropio() {
  const queryClient = useQueryClient()
  const perfil = useQuery({
    queryKey: CLAVE_PERFIL_PROPIO,
    queryFn: obtenerPerfilPropio,
    refetchInterval: (query) =>
      query.state.data?.solicitudNombre?.estado === 'pendiente'
        ? INTERVALO_SOLICITUD_PENDIENTE_MS
        : false,
  })

  // Si un administrador aprobó el nombre, el perfil releído ya lo trae pero
  // la sesión, que pinta el AppShell, no: se le copia sin otra petición.
  const datos = perfil.data
  useEffect(() => {
    if (!datos) return
    queryClient.setQueryData<Usuario | null>(CLAVE_SESION, (sesion) =>
      sesion &&
      (sesion.nombre !== datos.nombre ||
        sesion.apellidoPaterno !== datos.apellidoPaterno ||
        sesion.apellidoMaterno !== datos.apellidoMaterno)
        ? {
            ...sesion,
            nombre: datos.nombre,
            apellidoPaterno: datos.apellidoPaterno,
            apellidoMaterno: datos.apellidoMaterno,
          }
        : sesion,
    )
  }, [datos, queryClient])

  return perfil
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

// El interruptor pinta `variables` mientras la mutación está pendiente. Por eso
// onSettled devuelve la invalidación: la mutación no termina hasta que el
// perfil releído trae el valor nuevo, y el interruptor no regresa un instante
// a la posición anterior.
export function useCambiarVisibilidadCorreo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (correoPublico: boolean) => cambiarVisibilidadCorreo(correoPublico),
    onSuccess: (usuario) => queryClient.setQueryData(CLAVE_SESION, usuario),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_PERFIL_PROPIO }),
  })
}

// Una solicitud no cambia el nombre: solo hay que releer el perfil propio,
// que es donde aparece. La invalidación se devuelve para que la mutación siga
// pendiente hasta que el aviso ya esté en pantalla.
export function useSolicitarCambioNombre() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosPerfil) => solicitarCambioNombre(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_PERFIL_PROPIO }),
  })
}

// onSettled y no onSuccess: si falló porque la solicitud cambió mientras tanto
// (la aprobaron, la rechazaron o se envió otra), releer el perfil muestra su
// estado actual en vez de dejar un aviso que ya no corresponde.
export function useDescartarSolicitudNombre() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (solicitud: SolicitudNombre) => descartarSolicitudNombre(solicitud),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_PERFIL_PROPIO }),
  })
}

export function useCambiarContrasena() {
  return useMutation({ mutationFn: (cambio: CambioContrasena) => cambiarContrasena(cambio) })
}
