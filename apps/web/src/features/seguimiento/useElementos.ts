import type { ElementoEspacioEquipo } from '@plataforma/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claveEquipo } from '../equipos/useEquipos'
import {
  crearElemento,
  editarElemento,
  eliminarElemento,
  obtenerElementos,
  quitarArchivoElemento,
  subirArchivoElemento,
} from './elementos.api'

/** Lo que se guarda de un elemento. `archivo`: undefined lo deja como está,
 * null lo quita, un File lo adjunta o reemplaza. */
export interface DatosElemento {
  contenido: string
  enlace: string | null
  archivo?: File | null
}

// Cuelga de ['equipos', idEquipo] (nucleo §4.2, "escribir en el espacio de un
// equipo invalida ese equipo") y no de la actividad: dos equipos de la misma
// actividad no se invalidan entre sí.
export function claveElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  return [...claveEquipo(idEquipo), 'elementos', tipo] as const
}

export function useElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  return useQuery({
    queryKey: claveElementos(idEquipo, tipo),
    queryFn: () => obtenerElementos(idEquipo, tipo),
  })
}

function useInvalidarElementos(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: claveElementos(idEquipo, tipo) })
}

// El archivo va en una segunda petición (el cuerpo es el archivo tal cual,
// no JSON). Si esa falla, el texto ya quedó guardado: se invalida igual,
// para que la lista lo muestre, y el error dice qué faltó.
async function guardarArchivo(idElemento: string, archivo: File | null | undefined) {
  if (archivo === undefined) return
  if (archivo === null) await quitarArchivoElemento(idElemento)
  else await subirArchivoElemento(idElemento, archivo)
}

/** El elemento se creó, pero su archivo no se subió. Quien lo reciba no
 * debe volver a crearlo: el archivo se adjunta editando el elemento. */
export class ErrorArchivoSinSubir extends Error {
  constructor(causa: unknown) {
    const motivo = causa instanceof Error ? ` ${causa.message}` : ''
    super(`Se agregó, pero no el archivo.${motivo} Ábrelo para adjuntarlo de nuevo.`)
  }
}

export function useCrearElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: async ({ contenido, enlace, archivo }: DatosElemento) => {
      const creado = await crearElemento(idEquipo, tipo, contenido, enlace)
      try {
        await guardarArchivo(creado.id, archivo)
      } catch (error) {
        throw new ErrorArchivoSinSubir(error)
      }
    },
    onSettled: invalidar,
  })
}

export function useEditarElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: async ({
      idElemento,
      contenido,
      enlace,
      archivo,
    }: DatosElemento & { idElemento: string }) => {
      await editarElemento(idElemento, contenido, enlace)
      await guardarArchivo(idElemento, archivo)
    },
    onSettled: invalidar,
  })
}

export function useEliminarElementoMutation(idEquipo: string, tipo: ElementoEspacioEquipo) {
  const invalidar = useInvalidarElementos(idEquipo, tipo)
  return useMutation({
    mutationFn: (idElemento: string) => eliminarElemento(idElemento),
    onSuccess: invalidar,
  })
}
