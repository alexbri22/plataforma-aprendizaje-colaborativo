import {
  validarContenidoBitacora,
  validarRespuestasBitacora,
  type ContenidoBitacora,
} from '@plataforma/shared'

// El borrador de una entrada tiene la forma de su formato (nucleo §9.3):
// respuestas por pregunta si es guiada, texto si es libre.

export function borradorVacio(formato: 'guiada' | 'libre'): ContenidoBitacora {
  return formato === 'guiada' ? { respuestas: {} } : { contenido: '' }
}

export function borradorSinTexto(borrador: ContenidoBitacora): boolean {
  return 'respuestas' in borrador
    ? !Object.values(borrador.respuestas).some((texto) => texto?.trim())
    : !borrador.contenido.trim()
}

// La misma validación que el servidor, según el formato del borrador.
export function validarBorrador(
  borrador: ContenidoBitacora,
): ContenidoBitacora | { errores: Record<string, string> } {
  return 'respuestas' in borrador
    ? validarRespuestasBitacora(borrador.respuestas)
    : validarContenidoBitacora(borrador.contenido)
}
