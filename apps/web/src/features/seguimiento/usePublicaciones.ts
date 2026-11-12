import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  guardarPublicacion,
  obtenerPublicaciones,
  quitarArchivoPublicacion,
  subirArchivoPublicacion,
} from './publicaciones.api'

export function clavePublicaciones(idActividad: string) {
  return ['actividades', idActividad, 'publicaciones'] as const
}

export function usePublicaciones(idActividad: string) {
  return useQuery({
    queryKey: clavePublicaciones(idActividad),
    queryFn: () => obtenerPublicaciones(idActividad),
    enabled: Boolean(idActividad),
  })
}

export interface DatosPublicacion {
  descripcion: string
  enlace: string | null
  /** Un archivo nuevo para subir, o 'quitar' para quitar el actual. */
  archivo?: File | 'quitar'
}

// Guarda la descripción y el enlace, y después el archivo si cambió: son dos
// peticiones, como los adjuntos del espacio de equipo.
export function useGuardarPublicacionMutation(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivo, ...datos }: DatosPublicacion) => {
      await guardarPublicacion(idActividad, datos)
      if (archivo === 'quitar') await quitarArchivoPublicacion(idActividad)
      else if (archivo) await subirArchivoPublicacion(idActividad, archivo)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: clavePublicaciones(idActividad) }),
  })
}
