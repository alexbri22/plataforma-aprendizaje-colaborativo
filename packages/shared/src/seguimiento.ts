/*
 * Contrato de la API del contenido del espacio de equipo (nucleo §9.1, §9.4):
 * metas, avances y recursos. El atributo de tipo y los tres estados de
 * configuración (deshabilitado/opcional/obligatorio) ya están en
 * actividades.ts, porque de ahí sale el gate de habilitado/deshabilitado que
 * este módulo reutiliza. Lo que falta aquí es la forma de un elemento con
 * contenido real.
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.4, §5.2.
 *          docs/diseno-desarrollo-nucleo.md §9.1, §9.4.
 */

import type { ElementoEspacioEquipo } from './actividades.js'

export const LONGITUD_MAXIMA_CONTENIDO_ELEMENTO = 2000

/** Un elemento del espacio de equipo con su contenido (general §5.2:
 * elementos_espacio_equipo). Cualquier integrante del equipo puede crear,
 * editar o eliminar cualquiera, por eso `autor` identifica a quien lo
 * escribió sin que eso limite quién puede tocarlo después (nucleo §9.1). */
export interface ElementoDeEspacioEquipo {
  id: string
  tipo: ElementoEspacioEquipo
  contenido: string
  idMembresiaAutor: string
  autor: string
  fechaCreacion: string
  fechaActualizacion: string
}
