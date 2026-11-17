import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { TipoContenido } from '@plataforma/shared'
import { useSesion } from '../cuentas'
import {
  actualizarLeccionPropuesta,
  actualizarPropuestaCurso,
  actualizarPropuestaRecurso,
  agregarLeccionPropuesta,
  cancelarEnvioPropuesta,
  contarAvisosPropuestas,
  crearPropuestaCurso,
  crearPropuestaRecurso,
  decidirRevision,
  eliminarLeccionPropuesta,
  eliminarPropuesta,
  enviarPropuesta,
  listarColaRevision,
  listarMisPropuestas,
  marcarAvisoVisto,
  obtenerPropuestaCurso,
  obtenerPropuestaRecurso,
  obtenerRevision,
  quitarArchivoPropuesta,
  reordenarLeccionesPropuesta,
  subirArchivoPropuesta,
  type DatosCurso,
  type DatosDecision,
  type DatosLeccion,
  type DatosRecurso,
  type PropuestaCurso,
  type PropuestaRecurso,
} from './formacion.api'

/*
 * Autoría abierta (nota del incremento 6). Las propuestas son datos privados
 * de su autor: cuelgan de ['formacion', 'me', idUsuario, 'propuestas'], con el
 * id de la persona en la clave, como el resto de Mi formación (useProgreso).
 * La cola del administrador cuelga de ['revisiones'].
 *
 * Los hooks de edición tienen la misma forma que los del panel (useCursos y
 * useRecursos), para que el mismo editor use unos u otros según su modo.
 */

const raiz = (idUsuario: string) => ['formacion', 'me', idUsuario, 'propuestas'] as const
const claveRecurso = (idUsuario: string, id: string) => [...raiz(idUsuario), 'recurso', id] as const
const claveCurso = (idUsuario: string, id: string) => [...raiz(idUsuario), 'curso', id] as const
const RAIZ_REVISIONES = ['revisiones'] as const

function useIdUsuario(): string {
  return useSesion().usuario?.idUsuario ?? ''
}

/** Contexto de una mutación: de quién era la sesión cuando empezó, para no
 * escribir lo de una persona en la caché de otra (ver useProgreso). */
interface Dueno {
  idUsuario: string
}

function useAnotarDueno(): () => Dueno {
  const idUsuario = useIdUsuario()
  return () => ({ idUsuario })
}

function invalidarMias(queryClient: QueryClient, idUsuario: string) {
  void queryClient.invalidateQueries({ queryKey: [...raiz(idUsuario), 'lista'] })
  void queryClient.invalidateQueries({ queryKey: [...raiz(idUsuario), 'avisos'] })
}

/** Mis propuestas, con su estado y su última decisión. */
export function useMisPropuestas() {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: [...raiz(idUsuario), 'lista'],
    queryFn: listarMisPropuestas,
    enabled: idUsuario !== '',
  })
}

/** Cuántas decisiones no he visto. Sin sondeo rápido: una decisión tarda
 * horas, así que basta con revisar al volver a la pestaña y cada minuto. */
export function useAvisosPropuestas() {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: [...raiz(idUsuario), 'avisos'],
    queryFn: contarAvisosPropuestas,
    enabled: idUsuario !== '',
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// ---- Recursos propuestos ----

export function usePropuestaRecurso(id: string | undefined) {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claveRecurso(idUsuario, id ?? ''),
    queryFn: () => obtenerPropuestaRecurso(id as string),
    enabled: Boolean(id) && idUsuario !== '',
    retry: false,
    // Como en el panel: el editor espera esta lectura para llenar el
    // formulario.
    refetchOnMount: 'always',
  })
}

function useMutacionPropuestaRecurso<TVariables>(
  fn: (variables: TVariables) => Promise<PropuestaRecurso>,
) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: fn,
    onMutate: anotar,
    onSuccess: (recurso, _variables, dueno) => {
      if (!dueno?.idUsuario) return
      queryClient.setQueryData(claveRecurso(dueno.idUsuario, recurso.idRecurso), recurso)
      invalidarMias(queryClient, dueno.idUsuario)
    },
  })
}

export function useCrearPropuestaRecurso() {
  return useMutacionPropuestaRecurso((datos: Partial<DatosRecurso>) => crearPropuestaRecurso(datos))
}

export function useActualizarPropuestaRecurso(id: string) {
  return useMutacionPropuestaRecurso((cambios: Partial<DatosRecurso> & { versionFicha?: number }) =>
    actualizarPropuestaRecurso(id, cambios),
  )
}

export function useSubirArchivoPropuesta(id: string) {
  return useMutacionPropuestaRecurso((archivo: File) => subirArchivoPropuesta(id, archivo))
}

export function useQuitarArchivoPropuesta(id: string) {
  return useMutacionPropuestaRecurso(() => quitarArchivoPropuesta(id))
}

// ---- Cursos propuestos ----

export function usePropuestaCurso(id: string | undefined) {
  const idUsuario = useIdUsuario()
  return useQuery({
    queryKey: claveCurso(idUsuario, id ?? ''),
    queryFn: () => obtenerPropuestaCurso(id as string),
    enabled: Boolean(id) && idUsuario !== '',
    retry: false,
    refetchOnMount: 'always',
  })
}

function useMutacionPropuestaCurso<TVariables>(
  fn: (variables: TVariables) => Promise<PropuestaCurso>,
) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: fn,
    onMutate: anotar,
    onSuccess: (curso, _variables, dueno) => {
      if (!dueno?.idUsuario) return
      queryClient.setQueryData(claveCurso(dueno.idUsuario, curso.idCurso), curso)
      invalidarMias(queryClient, dueno.idUsuario)
    },
  })
}

export function useCrearPropuestaCurso() {
  return useMutacionPropuestaCurso((datos: Partial<DatosCurso>) => crearPropuestaCurso(datos))
}

export function useActualizarPropuestaCurso(id: string) {
  return useMutacionPropuestaCurso((cambios: Partial<DatosCurso> & { versionFicha?: number }) =>
    actualizarPropuestaCurso(id, cambios),
  )
}

export function useAgregarLeccionPropuesta(id: string) {
  return useMutacionPropuestaCurso((datos: Partial<DatosLeccion>) =>
    agregarLeccionPropuesta(id, datos),
  )
}

export function useActualizarLeccionPropuesta(id: string) {
  return useMutacionPropuestaCurso(
    ({ idLeccion, cambios }: { idLeccion: string; cambios: Partial<DatosLeccion> }) =>
      actualizarLeccionPropuesta(id, idLeccion, cambios),
  )
}

export function useEliminarLeccionPropuesta(id: string) {
  return useMutacionPropuestaCurso((idLeccion: string) => eliminarLeccionPropuesta(id, idLeccion))
}

export function useReordenarLeccionesPropuesta(id: string) {
  return useMutacionPropuestaCurso((lecciones: string[]) =>
    reordenarLeccionesPropuesta(id, lecciones),
  )
}

// ---- Lo que vale para las dos ----

/** Acciones sobre una propuesta que no devuelven el contenido: eliminar,
 * enviar, cancelar el envío y marcar el aviso como visto. Después se relee lo
 * mío. */
function useAccionPropuesta(fn: (variables: { tipo: TipoContenido; id: string }) => Promise<void>) {
  const queryClient = useQueryClient()
  const anotar = useAnotarDueno()
  return useMutation({
    mutationFn: fn,
    onMutate: anotar,
    onSuccess: (_resultado, _variables, dueno) => {
      if (!dueno?.idUsuario) return
      void queryClient.invalidateQueries({ queryKey: raiz(dueno.idUsuario) })
    },
  })
}

export function useEliminarPropuesta() {
  return useAccionPropuesta(({ tipo, id }) => eliminarPropuesta(tipo, id))
}

export function useEnviarPropuesta() {
  return useAccionPropuesta(({ tipo, id }) => enviarPropuesta(tipo, id))
}

export function useCancelarEnvio() {
  return useAccionPropuesta(({ tipo, id }) => cancelarEnvioPropuesta(tipo, id))
}

export function useMarcarAvisoVisto() {
  return useAccionPropuesta(({ tipo, id }) => marcarAvisoVisto(tipo, id))
}

// ---- Revisión (administrador) ----

export function useColaRevision() {
  return useQuery({ queryKey: [...RAIZ_REVISIONES, 'cola'], queryFn: listarColaRevision })
}

export function useRevision(tipo: TipoContenido, id: string) {
  return useQuery({
    queryKey: [...RAIZ_REVISIONES, tipo, id],
    queryFn: () => obtenerRevision(tipo, id),
    enabled: id !== '',
    retry: false,
  })
}

export function useDecidirRevision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, id, datos }: { tipo: TipoContenido; id: string; datos: DatosDecision }) =>
      decidirRevision(tipo, id, datos),
    onSuccess: () => {
      // Una decisión cambia la cola, el panel y, si publica o retira, el
      // catálogo.
      void queryClient.invalidateQueries({ queryKey: RAIZ_REVISIONES })
      void queryClient.invalidateQueries({ queryKey: ['recursos'] })
      void queryClient.invalidateQueries({ queryKey: ['cursos'] })
    },
  })
}
