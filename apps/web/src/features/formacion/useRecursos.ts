import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarRecurso,
  crearRecurso,
  eliminarRecurso,
  listarRecursos,
  listarRecursosAdmin,
  obtenerRecurso,
  obtenerRecursoAdmin,
  quitarArchivoRecurso,
  subirArchivoRecurso,
  type ConsultaRecursos,
  type DatosRecurso,
  type RecursoAdmin,
} from './formacion.api'

// Todo cuelga de ['recursos']: cualquier cambio del administrador invalida esa
// raíz y así el catálogo público y el panel se refrescan juntos.
const RAIZ = ['recursos'] as const
const CLAVE_PUBLICOS = ['recursos', 'publicos'] as const
const clavePublico = (id: string) => ['recursos', 'publicos', id] as const
const CLAVE_ADMIN = ['recursos', 'admin'] as const
const claveAdmin = (id: string) => ['recursos', 'admin', id] as const

// keepPreviousData: al cambiar de página o de filtro se sigue viendo la página
// anterior hasta que llega la nueva, en vez de vaciar la lista.
export function useRecursosPublicos(consulta: ConsultaRecursos = {}) {
  return useQuery({
    queryKey: [...CLAVE_PUBLICOS, 'lista', consulta],
    queryFn: () => listarRecursos(consulta),
    placeholderData: keepPreviousData,
  })
}

export function useRecursoPublico(idRecurso: string) {
  return useQuery({
    queryKey: clavePublico(idRecurso),
    queryFn: () => obtenerRecurso(idRecurso),
    retry: false,
  })
}

export function useRecursosAdmin(pagina: number, porPagina?: number) {
  return useQuery({
    queryKey: [...CLAVE_ADMIN, 'lista', { pagina, porPagina }],
    queryFn: () => listarRecursosAdmin({ pagina, porPagina }),
    placeholderData: keepPreviousData,
  })
}

export function useRecursoAdmin(idRecurso: string | undefined) {
  return useQuery({
    queryKey: claveAdmin(idRecurso ?? ''),
    queryFn: () => obtenerRecursoAdmin(idRecurso as string),
    enabled: Boolean(idRecurso),
    retry: false,
  })
}

function useMutacionRecurso<TVariables>(fn: (variables: TVariables) => Promise<RecursoAdmin>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (recurso) => {
      queryClient.setQueryData(claveAdmin(recurso.idRecurso), recurso)
      void queryClient.invalidateQueries({ queryKey: RAIZ })
    },
  })
}

export function useCrearRecurso() {
  return useMutacionRecurso((datos: Partial<DatosRecurso>) => crearRecurso(datos))
}

export function useActualizarRecurso(idRecurso: string) {
  return useMutacionRecurso((cambios: Partial<DatosRecurso>) =>
    actualizarRecurso(idRecurso, cambios),
  )
}

export function useSubirArchivoRecurso(idRecurso: string) {
  return useMutacionRecurso((archivo: File) => subirArchivoRecurso(idRecurso, archivo))
}

export function useQuitarArchivoRecurso(idRecurso: string) {
  return useMutacionRecurso(() => quitarArchivoRecurso(idRecurso))
}

export function useEliminarRecurso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idRecurso: string) => eliminarRecurso(idRecurso),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: RAIZ }),
  })
}
