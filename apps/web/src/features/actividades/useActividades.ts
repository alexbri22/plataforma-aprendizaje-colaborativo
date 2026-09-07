import type { FuncionSeguimiento } from '@plataforma/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  aceptarInvitacion,
  buscarActividadPorClave,
  cerrarInscripcion,
  configurarFuncion,
  crearActividad,
  obtenerActividad,
  obtenerActividades,
  obtenerInvitaciones,
  obtenerParticipantes,
  rechazarInvitacion,
  unirseConClave,
  type DatosCrearActividad,
} from './actividades.api'

// docs/diseno-desarrollo-nucleo.md §4.2 fija ['actividades'] y
// ['actividades', id] como claves para "Actividades del usuario" y "Una
// actividad con sus capacidades". Se reutilizan aquí para que sustituir el
// origen de datos por el backend real no cambie ninguna clave ni
// invalidación.
export const CLAVE_ACTIVIDADES = ['actividades'] as const
export const CLAVE_INVITACIONES = ['invitaciones'] as const

function claveActividad(id: string) {
  return [...CLAVE_ACTIVIDADES, id] as const
}

export function useActividades() {
  return useQuery({ queryKey: CLAVE_ACTIVIDADES, queryFn: obtenerActividades })
}

export function useActividad(id: string) {
  return useQuery({ queryKey: claveActividad(id), queryFn: () => obtenerActividad(id) })
}

// Avanzar de fase invalida la actividad completa, incluida su entrada en el
// listado: el cambio de fase modifica tanto las capacidades como el badge
// que "Mis actividades" pinta para ella (docs/diseno-desarrollo-nucleo.md
// §4.2, fila "Avanzar de fase").
export function useCerrarInscripcionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cerrarInscripcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claveActividad(id) })
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
    },
  })
}

// Autoguardado por campo: cada control de PantallaConfiguracion llama a
// mutateAsync por su cuenta y sigue su propio estado local de
// guardando/guardado/error (el objeto de mutación compartido solo importa
// para la invalidación, no para el indicador visual de cada campo, porque
// varios campos pueden guardarse en paralelo).
export function useConfigurarFuncionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ funcion, cuerpo }: { funcion: FuncionSeguimiento; cuerpo: Record<string, string> }) =>
      configurarFuncion(id, funcion, cuerpo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claveActividad(id) })
    },
  })
}

export function useParticipantes(id: string) {
  return useQuery({
    queryKey: [...claveActividad(id), 'participantes'] as const,
    queryFn: () => obtenerParticipantes(id),
  })
}

export function useInvitaciones() {
  return useQuery({ queryKey: CLAVE_INVITACIONES, queryFn: obtenerInvitaciones })
}

export function useCrearActividadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosCrearActividad) => crearActividad(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
    },
  })
}

export function useAceptarInvitacionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => aceptarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
      queryClient.invalidateQueries({ queryKey: CLAVE_INVITACIONES })
    },
  })
}

export function useRechazarInvitacionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rechazarInvitacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_INVITACIONES })
    },
  })
}

// Vista previa por clave (docs/diseno-desarrollo-nucleo.md §3.3): no vive en
// el catálogo de claves de §4.2 porque no es un recurso de una actividad de
// la que el actor sea miembro. `enabled` evita consultar mientras el campo
// está vacío o recién cambió.
export function useVistaPreviaClave(clave: string, enabled: boolean) {
  return useQuery({
    queryKey: ['claves', clave] as const,
    queryFn: () => buscarActividadPorClave(clave),
    enabled,
    retry: false,
  })
}

export function useUnirseConClaveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clave: string) => unirseConClave(clave),
    onSuccess: (actividad) => {
      // La actividad nueva debe aparecer en "Mis actividades" (§4.2), y su
      // conteo de participantes y su lista cambiaron para quien ya la
      // tenía abierta (por ejemplo, quien organiza viendo el Resumen).
      queryClient.invalidateQueries({ queryKey: CLAVE_ACTIVIDADES })
      queryClient.invalidateQueries({ queryKey: claveActividad(actividad.id) })
    },
  })
}
