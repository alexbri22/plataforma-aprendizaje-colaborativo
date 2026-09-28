import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  guardarReconocimientos,
  obtenerAcumulado,
  obtenerRecibidos,
  obtenerRecibidosDeParticipante,
  obtenerRecibidosEnPerfil,
  obtenerRitual,
  type ReconocimientoPropio,
} from './insignias.api'

// Claves jerárquicas bajo la actividad (docs/diseno-desarrollo-general.md
// §3.5): invalidar ['actividades', id] arrastra todo lo de insignias de esa
// actividad, y el acumulado global cuelga de ['insignias'].
const claveRitual = (id: string) => ['actividades', id, 'reconocimientos'] as const
const claveRecibidos = (id: string) => ['actividades', id, 'reconocimientos', 'recibidos'] as const
const claveDeParticipante = (id: string, idMembresia: string) =>
  ['actividades', id, 'participantes', idMembresia, 'reconocimientos'] as const
const CLAVE_ACUMULADO = ['insignias', 'acumulado'] as const
const CLAVE_RECIBIDOS_EN_PERFIL = ['insignias', 'recibidos'] as const

export function useRitual(idActividad: string) {
  return useQuery({ queryKey: claveRitual(idActividad), queryFn: () => obtenerRitual(idActividad) })
}

export function useGuardarReconocimientos(idActividad: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reconocimientos: ReconocimientoPropio[]) =>
      guardarReconocimientos(idActividad, reconocimientos),
    onSuccess: () => {
      // Lo guardado cambia el ritual (borrador) y lo que verán los demás
      // (recibidos de participante, acumulado, frases del perfil): se
      // invalida todo lo de la actividad más lo global de insignias.
      void queryClient.invalidateQueries({ queryKey: ['actividades', idActividad] })
      void queryClient.invalidateQueries({ queryKey: ['insignias'] })
    },
  })
}

export function useRecibidos(idActividad: string) {
  return useQuery({
    queryKey: claveRecibidos(idActividad),
    queryFn: () => obtenerRecibidos(idActividad),
  })
}

export function useRecibidosDeParticipante(idActividad: string, idMembresia: string) {
  return useQuery({
    queryKey: claveDeParticipante(idActividad, idMembresia),
    queryFn: () => obtenerRecibidosDeParticipante(idActividad, idMembresia),
  })
}

export function useAcumulado() {
  return useQuery({ queryKey: CLAVE_ACUMULADO, queryFn: obtenerAcumulado })
}

export function useRecibidosEnPerfil() {
  return useQuery({ queryKey: CLAVE_RECIBIDOS_EN_PERFIL, queryFn: obtenerRecibidosEnPerfil })
}
