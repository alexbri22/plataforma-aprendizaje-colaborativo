import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
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

/*
 * Datos privados de la persona: progreso, reflexiones, Mi formación,
 * guardados, preferencias y recomendaciones. Cuelgan de
 * ['formacion', 'me', idUsuario], aparte de ['cursos']: un cambio del
 * administrador no tiene por qué releerlos, y una marca no relee el catálogo.
 *
 * El id de la persona va en cada clave. Al cambiar de cuenta, useSesion borra
 * la caché, pero eso no detiene una mutación que ya iba en camino: si la
 * respuesta de A llega cuando ya entró B, escribirla en una clave sin dueño
 * se la mostraría a B. Por eso cada mutación anota al empezar (onMutate) de
 * quién es, y al terminar escribe solo en las claves de esa persona.
 */

const raizPropia = (idUsuario: string) => ['formacion', 'me', idUsuario] as const
const claves = (idUsuario: string) => ({
  progreso: (idCurso: string) => [...raizPropia(idUsuario), 'curso', idCurso] as const,
  misCursos: [...raizPropia(idUsuario), 'cursos'] as const,
  guardados: [...raizPropia(idUsuario), 'guardados'] as const,
  recomendaciones: [...raizPropia(idUsuario), 'recomendaciones'] as const,
  preferencias: [...raizPropia(idUsuario), 'preferencias'] as const,
})

/** El id de la sesión actual, o '' sin sesión (las consultas no se piden). */
function useIdUsuario(): string {
  const { usuario } = useSesion()
  return usuario?.idUsuario ?? ''
}

/** Contexto de una mutación: de quién era la sesión cuando empezó. */
interface Dueno {
  idUsuario: string
}

/** Para onMutate: anota la sesión con la que empieza la mutación. */
function useAnotarDueno(): () => Dueno {
  const idUsuario = useIdUsuario()
  return () => ({ idUsuario })
}

function guardarProgreso(queryClient: QueryClient, idUsuario: string, progreso: MiProgresoCurso) {
  if (!idUsuario) return
  const c = claves(idUsuario)
  queryClient.setQueryData(c.progreso(progreso.idCurso), progreso)
  // "Mi formación", "Continúa aprendiendo" y la ruta recomendada dependen de
  // esto.
  void queryClient.invalidateQueries({ queryKey: c.misCursos })
  void queryClient.invalidateQueries({ queryKey: c.recomendaciones })
}

/** Mi progreso en un curso. Sin sesión no se pide: el visor se lee igual. */
export function useMiProgreso(idCurso: string) {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claves(idUsuario).progreso(idCurso),
    queryFn: () => obtenerMiProgreso(idCurso),
    enabled: idUsuario !== '' && idCurso !== '',
    retry: false,
  })
}

export function useInscribirse(idCurso: string) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: () => inscribirse(idCurso),
    onMutate: anotar,
    onSuccess: (progreso, _variables, dueno) =>
      guardarProgreso(queryClient, dueno?.idUsuario ?? '', progreso),
  })
}

export function useMarcarLeccion(idCurso: string) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: ({ idLeccion, completada }: { idLeccion: string; completada: boolean }) =>
      marcarLeccion(idCurso, idLeccion, completada),
    onMutate: anotar,
    onSuccess: (resultado, _variables, dueno) =>
      guardarProgreso(queryClient, dueno?.idUsuario ?? '', resultado.progreso),
  })
}

export function useGuardarReflexion(idCurso: string) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: ({ idLeccion, texto }: { idLeccion: string; texto: string }) =>
      guardarReflexion(idCurso, idLeccion, texto),
    onMutate: anotar,
    onSuccess: (reflexion, { idLeccion }, dueno) => {
      if (!dueno?.idUsuario) return
      const c = claves(dueno.idUsuario)
      // La reflexión inscribe al curso si no lo estaba: se relee el progreso
      // para tener la inscripción, y mientras tanto se pone la respuesta.
      queryClient.setQueryData<MiProgresoCurso>(c.progreso(idCurso), (actual) =>
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
      void queryClient.invalidateQueries({ queryKey: c.progreso(idCurso) })
      void queryClient.invalidateQueries({ queryKey: c.misCursos })
    },
  })
}

/** Mis cursos en curso y terminados. Sin sesión no se pide. */
export function useMiFormacion() {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claves(idUsuario).misCursos,
    queryFn: obtenerMiFormacion,
    enabled: idUsuario !== '',
  })
}

/** Mis recursos guardados; `pagina` empieza en 1, como en la API. */
export function useRecursosGuardados(pagina: number, porPagina: number) {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: [...claves(idUsuario).guardados, 'lista', { pagina, porPagina }],
    queryFn: () => listarRecursosGuardados(pagina, porPagina),
    enabled: idUsuario !== '',
    placeholderData: keepPreviousData,
  })
}

export function useRecursoGuardado(idRecurso: string) {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: [...claves(idUsuario).guardados, 'estado', idRecurso],
    queryFn: () => estaGuardado(idRecurso),
    enabled: idUsuario !== '' && idRecurso !== '',
  })
}

/** Guardar o quitar un recurso. Guardar no inicia ningún curso. */
export function useCambiarGuardado() {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: ({ idRecurso, guardar }: { idRecurso: string; guardar: boolean }) =>
      cambiarGuardado(idRecurso, guardar),
    onMutate: anotar,
    onSuccess: (_, { idRecurso, guardar }, dueno) => {
      if (!dueno?.idUsuario) return
      const { guardados } = claves(dueno.idUsuario)
      queryClient.setQueryData([...guardados, 'estado', idRecurso], guardar)
      void queryClient.invalidateQueries({ queryKey: [...guardados, 'lista'] })
    },
  })
}

/** Las rutas que más le convienen a la persona, con sus razones. */
export function useRecomendaciones() {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claves(idUsuario).recomendaciones,
    queryFn: () => obtenerRecomendaciones(3),
    enabled: idUsuario !== '',
  })
}

/** Lo que la persona quiere fortalecer (hasta dos elementos). */
export function usePreferencias() {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claves(idUsuario).preferencias,
    queryFn: obtenerPreferencias,
    enabled: idUsuario !== '',
  })
}

export function useGuardarPreferencias() {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: guardarPreferencias,
    onMutate: anotar,
    onSuccess: (elementos, _variables, dueno) => {
      if (!dueno?.idUsuario) return
      const c = claves(dueno.idUsuario)
      queryClient.setQueryData(c.preferencias, elementos)
      void queryClient.invalidateQueries({ queryKey: c.recomendaciones })
    },
  })
}
