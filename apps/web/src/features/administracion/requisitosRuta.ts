import { MAX_CURSOS_RUTA, MIN_CURSOS_RUTA } from '@plataforma/shared'
import type { CursoDeRuta } from '../formacion'
import type { Requisito } from './requisitosCurso'

/**
 * Lo que falta para publicar una ruta, en vivo. Repite las reglas de
 * validarPublicable en rutas.service.ts para no enterarse hasta el final;
 * quien decide es el servidor.
 */
export function requisitosRuta(finalidad: string, cursos: CursoDeRuta[]): Requisito[] {
  return [
    { texto: 'Finalidad escrita', cumplido: finalidad.trim() !== '' },
    {
      texto: `De ${MIN_CURSOS_RUTA} a ${MAX_CURSOS_RUTA} cursos`,
      cumplido: cursos.length >= MIN_CURSOS_RUTA && cursos.length <= MAX_CURSOS_RUTA,
    },
    {
      texto: 'Todos los cursos publicados',
      cumplido: cursos.length > 0 && cursos.every((c) => c.estatus === 'publicado'),
    },
  ]
}
