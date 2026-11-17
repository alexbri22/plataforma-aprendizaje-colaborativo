import { useQuery } from '@tanstack/react-query'
import { obtenerConstanciasDeUsuario, verificarConstancia } from './formacion.api'

/*
 * Constancias que no son mías (las propias están en useProgreso, junto al
 * resto de mis datos). Las de otra persona cuelgan de su id: lo que se ve
 * depende de lo que ella decidió mostrar, no de quién mira. La verificación
 * es pública y cuelga del folio.
 */

/** Las constancias que el perfil de otra persona muestra; vacía si las ocultó. */
export function useConstanciasDeUsuario(idUsuario: string) {
  return useQuery({
    queryKey: ['formacion', 'usuarios', idUsuario, 'constancias'],
    queryFn: () => obtenerConstanciasDeUsuario(idUsuario),
    enabled: idUsuario !== '',
  })
}

/** Página pública de verificación. Un 404 es una respuesta, no un fallo: no
 * se reintenta. */
export function useConstanciaVerificada(folio: string) {
  return useQuery({
    queryKey: ['constancias', folio],
    queryFn: () => verificarConstancia(folio),
    enabled: folio !== '',
    retry: false,
  })
}
