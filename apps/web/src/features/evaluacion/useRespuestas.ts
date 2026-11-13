import type { RespuestasDistribucion, RespuestasLikert } from '@plataforma/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveActividad } from '../actividades/useActividades'
import { tipoDeArchivo } from '../seguimiento/elementos.api'
import {
  guardarEntrega,
  obtenerAvanceDeInstrumentos,
  obtenerCumplimiento,
  obtenerEntregas,
  obtenerMisInstrumentos,
  obtenerMisResultadosPares,
  obtenerRespuestas,
  obtenerResultadosPares,
  quitarArchivoEntrega,
  responderInstrumento,
  subirArchivoEntrega,
} from './ponderacion.api'

// Cuelgan de la actividad, como la ponderación: una invalidación de la
// actividad no las deja obsoletas por separado.
export function claveMisInstrumentos(idActividad: string) {
  return [...claveActividad(idActividad), 'mis-instrumentos'] as const
}

function claveRespuestas(idActividad: string, idInstrumento: string) {
  return [...claveActividad(idActividad), 'respuestas', idInstrumento] as const
}

function claveEntregas(idActividad: string, idInstrumento: string) {
  return [...claveActividad(idActividad), 'entregas', idInstrumento] as const
}

function claveCumplimiento(idActividad: string, idAspecto: string) {
  return [...claveActividad(idActividad), 'cumplimiento', idAspecto] as const
}

export function useMisInstrumentos(idActividad: string, habilitado = true) {
  return useQuery({
    queryKey: claveMisInstrumentos(idActividad),
    queryFn: () => obtenerMisInstrumentos(idActividad),
    enabled: Boolean(idActividad) && habilitado,
  })
}

/** Para quien organiza: cuántos completaron cada instancia del proceso. */
export function useAvanceDeInstrumentos(idActividad: string, habilitado = true) {
  return useQuery({
    queryKey: [...claveActividad(idActividad), 'cumplimiento-instrumentos'] as const,
    queryFn: () => obtenerAvanceDeInstrumentos(idActividad),
    enabled: Boolean(idActividad) && habilitado,
  })
}

/** Las respuestas a una plantilla: quien participa recibe solo la suya;
 * quien organiza, las de todos. */
export function useRespuestas(idActividad: string, idInstrumento: string) {
  return useQuery({
    queryKey: claveRespuestas(idActividad, idInstrumento),
    queryFn: () => obtenerRespuestas(idActividad, idInstrumento),
    enabled: Boolean(idActividad && idInstrumento),
  })
}

/** Las entregas de una actividad externa, con el mismo criterio. */
export function useEntregas(idActividad: string, idInstrumento: string) {
  return useQuery({
    queryKey: claveEntregas(idActividad, idInstrumento),
    queryFn: () => obtenerEntregas(idActividad, idInstrumento),
    enabled: Boolean(idActividad && idInstrumento),
  })
}

export function useCumplimiento(idActividad: string, idAspecto: string) {
  return useQuery({
    queryKey: claveCumplimiento(idActividad, idAspecto),
    queryFn: () => obtenerCumplimiento(idActividad, idAspecto),
    enabled: Boolean(idActividad && idAspecto),
  })
}

export function useResultadosPares(idActividad: string, idInstrumento: string, idEquipo: string) {
  return useQuery({
    queryKey: [...claveActividad(idActividad), 'pares', idInstrumento, idEquipo] as const,
    queryFn: () => obtenerResultadosPares(idActividad, idInstrumento, idEquipo),
    enabled: Boolean(idActividad && idInstrumento && idEquipo),
  })
}

export function useMisResultadosPares(idActividad: string, idInstrumento: string) {
  return useQuery({
    queryKey: [...claveActividad(idActividad), 'pares-mios', idInstrumento] as const,
    queryFn: () => obtenerMisResultadosPares(idActividad, idInstrumento),
    enabled: Boolean(idActividad && idInstrumento),
  })
}

export function useResponderInstrumentoMutation(idActividad: string, idInstrumento: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (respuestas: RespuestasLikert | RespuestasDistribucion) =>
      responderInstrumento(idActividad, idInstrumento, respuestas),
    onSuccess: (guardadas) => {
      queryClient.setQueryData(claveRespuestas(idActividad, idInstrumento), [guardadas])
      // La lista marca la autoevaluación como completada.
      return queryClient.invalidateQueries({ queryKey: claveMisInstrumentos(idActividad) })
    },
  })
}

export interface DatosEntrega {
  contenido: string
  enlace: string | null
  /** Un archivo nuevo para subir, o null para dejar el que haya. */
  archivoNuevo: File | null
  quitarArchivo: boolean
}

// La nota y el enlace primero, que crean la entrega; luego el archivo, que
// cuelga de ella.
export function useGuardarEntregaMutation(idActividad: string, idInstrumento: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contenido, enlace, archivoNuevo, quitarArchivo }: DatosEntrega) => {
      let entrega = await guardarEntrega(idActividad, idInstrumento, { contenido, enlace })
      if (archivoNuevo) {
        entrega = await subirArchivoEntrega(
          idActividad,
          idInstrumento,
          archivoNuevo,
          tipoDeArchivo(archivoNuevo),
        )
      } else if (quitarArchivo && entrega.archivo) {
        entrega = await quitarArchivoEntrega(idActividad, idInstrumento)
      }
      return entrega
    },
    onSuccess: (entrega) => {
      queryClient.setQueryData(claveEntregas(idActividad, idInstrumento), [entrega])
      return queryClient.invalidateQueries({ queryKey: claveMisInstrumentos(idActividad) })
    },
  })
}
