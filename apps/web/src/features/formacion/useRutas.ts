import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarRuta,
  crearRuta,
  eliminarRuta,
  listarRutas,
  listarRutasAdmin,
  obtenerRuta,
  obtenerRutaAdmin,
  reemplazarCursosRuta,
  type DatosRuta,
  type RutaAdmin,
} from './formacion.api'

// Todo cuelga de ['rutas'], como cursos de ['cursos']. Un cambio del
// administrador también invalida las recomendaciones de quien esté viendo.
const RAIZ = ['rutas'] as const
const CLAVE_ADMIN = ['rutas', 'admin'] as const
const claveAdmin = (id: string) => ['rutas', 'admin', 'detalle', id] as const

export function useRutasAdmin(pagina: number) {
  return useQuery({
    queryKey: [...CLAVE_ADMIN, 'lista', { pagina }],
    queryFn: () => listarRutasAdmin(pagina),
    placeholderData: keepPreviousData,
  })
}

export function useRutaAdmin(idRuta: string | undefined) {
  return useQuery({
    queryKey: claveAdmin(idRuta ?? ''),
    queryFn: () => obtenerRutaAdmin(idRuta as string),
    enabled: Boolean(idRuta),
    retry: false,
    // El editor llena su formulario con esta lectura: siempre debe ocurrir.
    refetchOnMount: 'always',
  })
}

function useMutacionRuta<TVariables>(fn: (variables: TVariables) => Promise<RutaAdmin>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (ruta) => {
      queryClient.setQueryData(claveAdmin(ruta.idRuta), ruta)
      void queryClient.invalidateQueries({ queryKey: RAIZ })
    },
  })
}

export function useCrearRuta() {
  return useMutacionRuta((datos: Partial<DatosRuta>) => crearRuta(datos))
}

export function useActualizarRuta(idRuta: string) {
  return useMutacionRuta((cambios: Partial<DatosRuta> & { versionFicha?: number }) =>
    actualizarRuta(idRuta, cambios),
  )
}

export function useReemplazarCursosRuta(idRuta: string) {
  return useMutacionRuta(({ cursos, versionFicha }: { cursos: string[]; versionFicha?: number }) =>
    reemplazarCursosRuta(idRuta, cursos, versionFicha),
  )
}

export function useEliminarRuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idRuta: string) => eliminarRuta(idRuta),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: RAIZ }),
  })
}

/** Catálogo público de rutas (la destacada primero). Es pequeño: se pide
 * completo. */
export function useRutasPublicas() {
  return useQuery({ queryKey: ['rutas', 'publicas', 'lista'], queryFn: listarRutas })
}

export function useRutaPublica(idRuta: string) {
  return useQuery({
    queryKey: ['rutas', 'publicas', 'detalle', idRuta],
    queryFn: () => obtenerRuta(idRuta),
    retry: false,
  })
}

/** Si hay rutas publicadas: el hero de /recursos solo ofrece ir a ellas si sí. */
export function useHayRutas(): boolean {
  const { data } = useRutasPublicas()
  return (data?.rutas.length ?? 0) > 0
}
