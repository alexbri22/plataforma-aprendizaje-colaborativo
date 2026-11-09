import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSesion } from '../cuentas'
import {
  cambiarGuardado,
  estaGuardado,
  guardarPreferencias,
  guardarReflexion,
  inscribirse,
  listarRecursosGuardados,
  marcarLeccion,
  obtenerMiFormacion,
  obtenerMiProgreso,
  obtenerPreferencias,
  obtenerRecomendaciones,
  type MiProgresoCurso,
} from './formacion.api'

// El progreso cuelga de ['formacion', 'me'], aparte de ['cursos']: un cambio
// del administrador no tiene por qué releerlo, y una marca no relee el
// catálogo. Al cambiar de cuenta, useSesion borra todo menos la sesión, así
// que el progreso de una persona nunca se le muestra a otra.
const RAIZ_PROPIA = ['formacion', 'me'] as const
const claveProgreso = (idCurso: string) => [...RAIZ_PROPIA, 'curso', idCurso] as const
const CLAVE_MIS_CURSOS = [...RAIZ_PROPIA, 'cursos'] as const
const RAIZ_GUARDADOS = [...RAIZ_PROPIA, 'guardados'] as const
const CLAVE_RECOMENDACIONES = [...RAIZ_PROPIA, 'recomendaciones'] as const
const CLAVE_PREFERENCIAS = [...RAIZ_PROPIA, 'preferencias'] as const

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
    // "Mi formación", "Continúa aprendiendo" y la ruta recomendada dependen
    // de esto.
    void queryClient.invalidateQueries({ queryKey: CLAVE_MIS_CURSOS })
    void queryClient.invalidateQueries({ queryKey: CLAVE_RECOMENDACIONES })
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
      void queryClient.invalidateQueries({ queryKey: claveProgreso(idCurso) })
      void queryClient.invalidateQueries({ queryKey: CLAVE_MIS_CURSOS })
    },
  })
}

/** Mis cursos en curso y terminados. Sin sesión no se pide. */
export function useMiFormacion() {
  const { usuario } = useSesion()
  return useQuery({
    queryKey: CLAVE_MIS_CURSOS,
    queryFn: obtenerMiFormacion,
    enabled: usuario !== null,
  })
}

/** Mis recursos guardados; `pagina` empieza en 1, como en la API. */
export function useRecursosGuardados(pagina: number, porPagina: number) {
  return useQuery({
    queryKey: [...RAIZ_GUARDADOS, 'lista', { pagina, porPagina }],
    queryFn: () => listarRecursosGuardados(pagina, porPagina),
    placeholderData: keepPreviousData,
  })
}

export function useRecursoGuardado(idRecurso: string) {
  const { usuario } = useSesion()
  return useQuery({
    queryKey: [...RAIZ_GUARDADOS, 'estado', idRecurso],
    queryFn: () => estaGuardado(idRecurso),
    enabled: usuario !== null && idRecurso !== '',
  })
}

/** Guardar o quitar un recurso. Guardar no inicia ningún curso. */
export function useCambiarGuardado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idRecurso, guardar }: { idRecurso: string; guardar: boolean }) =>
      cambiarGuardado(idRecurso, guardar),
    onSuccess: (_, { idRecurso, guardar }) => {
      queryClient.setQueryData([...RAIZ_GUARDADOS, 'estado', idRecurso], guardar)
      void queryClient.invalidateQueries({ queryKey: [...RAIZ_GUARDADOS, 'lista'] })
    },
  })
}

/** Las rutas que más le convienen a la persona, con sus razones. */
export function useRecomendaciones() {
  const { usuario } = useSesion()
  return useQuery({
    queryKey: CLAVE_RECOMENDACIONES,
    queryFn: () => obtenerRecomendaciones(3),
    enabled: usuario !== null,
  })
}

/** Lo que la persona quiere fortalecer (hasta dos elementos). */
export function usePreferencias() {
  const { usuario } = useSesion()
  return useQuery({
    queryKey: CLAVE_PREFERENCIAS,
    queryFn: obtenerPreferencias,
    enabled: usuario !== null,
  })
}

export function useGuardarPreferencias() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: guardarPreferencias,
    onSuccess: (elementos) => {
      queryClient.setQueryData(CLAVE_PREFERENCIAS, elementos)
      void queryClient.invalidateQueries({ queryKey: CLAVE_RECOMENDACIONES })
    },
  })
}
