import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSesion } from '../cuentas'
import {
  guardarReflexion,
  inscribirse,
  marcarLeccion,
  obtenerMiProgreso,
  type MiProgresoCurso,
} from './formacion.api'

// El progreso cuelga de ['formacion', 'me'], aparte de ['cursos']: un cambio
// del administrador no tiene por qué releerlo, y una marca no relee el
// catálogo. Al cambiar de cuenta, useSesion borra todo menos la sesión, así
// que el progreso de una persona nunca se le muestra a otra.
const RAIZ_PROPIA = ['formacion', 'me'] as const
const claveProgreso = (idCurso: string) => [...RAIZ_PROPIA, 'curso', idCurso] as const

/** Mi progreso en un curso. Sin sesión no se pide: el visor se lee igual. */
export function useMiProgreso(idCurso: string) {
  const { usuario } = useSesion()
  return useQuery({
    queryKey: claveProgreso(idCurso),
    queryFn: () => obtenerMiProgreso(idCurso),
    enabled: usuario !== null && idCurso !== '',
    retry: false,
  })
}

function useGuardarProgreso(idCurso: string) {
  const queryClient = useQueryClient()
  return (progreso: MiProgresoCurso) => {
    queryClient.setQueryData(claveProgreso(idCurso), progreso)
    // "Mi formación" y "Continúa aprendiendo" dependen de esto.
    void queryClient.invalidateQueries({
      queryKey: RAIZ_PROPIA,
      predicate: (q) => q.queryKey[2] !== 'curso',
    })
  }
}

export function useInscribirse(idCurso: string) {
  const guardar = useGuardarProgreso(idCurso)
  return useMutation({
    mutationFn: () => inscribirse(idCurso),
    onSuccess: guardar,
  })
}

export function useMarcarLeccion(idCurso: string) {
  const guardar = useGuardarProgreso(idCurso)
  return useMutation({
    mutationFn: ({ idLeccion, completada }: { idLeccion: string; completada: boolean }) =>
      marcarLeccion(idCurso, idLeccion, completada),
    onSuccess: (resultado) => guardar(resultado.progreso),
  })
}

export function useGuardarReflexion(idCurso: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idLeccion, texto }: { idLeccion: string; texto: string }) =>
      guardarReflexion(idCurso, idLeccion, texto),
    onSuccess: (reflexion, { idLeccion }) => {
      // La reflexión inscribe al curso si no lo estaba: se relee el progreso
      // para tener la inscripción, y mientras tanto se pone la respuesta.
      queryClient.setQueryData<MiProgresoCurso>(claveProgreso(idCurso), (actual) =>
        actual
          ? {
              ...actual,
              reflexiones: [
                ...actual.reflexiones.filter((r) => r.idLeccion !== idLeccion),
                ...(reflexion ? [reflexion] : []),
              ],
            }
          : actual,
      )
      void queryClient.invalidateQueries({ queryKey: RAIZ_PROPIA })
    },
  })
}
