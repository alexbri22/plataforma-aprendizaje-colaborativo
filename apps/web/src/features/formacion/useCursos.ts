import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarCurso,
  actualizarLeccion,
  agregarLeccion,
  crearCurso,
  eliminarCurso,
  eliminarLeccion,
  listarCursos,
  listarCursosAdmin,
  obtenerCurso,
  obtenerCursoAdmin,
  obtenerLeccion,
  reordenarLecciones,
  type ConsultaCursos,
  type CursoAdmin,
  type DatosCurso,
  type DatosLeccion,
} from './formacion.api'

// Todo cuelga de ['cursos'], como recursos cuelga de ['recursos']: un cambio
// del administrador refresca a la vez el panel y el catálogo público.
const RAIZ = ['cursos'] as const
const CLAVE_PUBLICOS = ['cursos', 'publicos'] as const
const CLAVE_ADMIN = ['cursos', 'admin'] as const
const claveAdmin = (id: string) => ['cursos', 'admin', 'detalle', id] as const

export function useCursosPublicos(consulta: ConsultaCursos = {}) {
  return useQuery({
    queryKey: [...CLAVE_PUBLICOS, 'lista', consulta],
    queryFn: () => listarCursos(consulta),
    placeholderData: keepPreviousData,
  })
}

export function useCursoPublico(idCurso: string) {
  return useQuery({
    queryKey: [...CLAVE_PUBLICOS, 'detalle', idCurso],
    queryFn: () => obtenerCurso(idCurso),
    retry: false,
  })
}

export function useLeccionPublica(idCurso: string, idLeccion: string) {
  return useQuery({
    queryKey: [...CLAVE_PUBLICOS, 'leccion', idCurso, idLeccion],
    queryFn: () => obtenerLeccion(idCurso, idLeccion),
    retry: false,
  })
}

export function useCursosAdmin(pagina: number) {
  return useQuery({
    queryKey: [...CLAVE_ADMIN, 'lista', { pagina }],
    queryFn: () => listarCursosAdmin({ pagina }),
    placeholderData: keepPreviousData,
  })
}

export function useCursoAdmin(idCurso: string | undefined) {
  return useQuery({
    queryKey: claveAdmin(idCurso ?? ''),
    queryFn: () => obtenerCursoAdmin(idCurso as string),
    enabled: Boolean(idCurso),
    retry: false,
  })
}

function useMutacionCurso<TVariables>(fn: (variables: TVariables) => Promise<CursoAdmin>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (curso) => {
      queryClient.setQueryData(claveAdmin(curso.idCurso), curso)
      void queryClient.invalidateQueries({ queryKey: RAIZ })
    },
  })
}

export function useCrearCurso() {
  return useMutacionCurso((datos: Partial<DatosCurso>) => crearCurso(datos))
}

export function useActualizarCurso(idCurso: string) {
  return useMutacionCurso((cambios: Partial<DatosCurso>) => actualizarCurso(idCurso, cambios))
}

export function useAgregarLeccion(idCurso: string) {
  return useMutacionCurso((datos: Partial<DatosLeccion>) => agregarLeccion(idCurso, datos))
}

export function useActualizarLeccion(idCurso: string) {
  return useMutacionCurso(
    ({ idLeccion, cambios }: { idLeccion: string; cambios: Partial<DatosLeccion> }) =>
      actualizarLeccion(idCurso, idLeccion, cambios),
  )
}

export function useEliminarLeccion(idCurso: string) {
  return useMutacionCurso((idLeccion: string) => eliminarLeccion(idCurso, idLeccion))
}

export function useReordenarLecciones(idCurso: string) {
  return useMutacionCurso((lecciones: string[]) => reordenarLecciones(idCurso, lecciones))
}

export function useEliminarCurso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idCurso: string) => eliminarCurso(idCurso),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: RAIZ }),
  })
}
