import {
  ETIQUETAS_ELEMENTO,
  MAX_LECCIONES_CURSO,
  MIN_LECCIONES_CURSO,
  type ElementoColaboracion,
} from '@plataforma/shared'
import type { LeccionAdmin } from '../formacion'

export interface FichaFormulario {
  resumen: string
  objetivo: string
  area: string | null
  nivel: string | null
  practicaFinal: string
  elementos: ElementoColaboracion[]
}

export interface Requisito {
  texto: string
  cumplido: boolean
}

/**
 * Lista de lo que falta para publicar, en vivo mientras se edita. Es una
 * ayuda: quien decide es el servidor (validarPublicable en cursos.service.ts)
 * y aquí se repiten sus mismas reglas para no enterarse hasta el final.
 */
export function requisitosParaPublicar(
  ficha: FichaFormulario,
  lecciones: LeccionAdmin[],
): Requisito[] {
  const fichaCompleta =
    [ficha.resumen, ficha.objetivo, ficha.practicaFinal].every((t) => t.trim() !== '') &&
    Boolean(ficha.area) &&
    Boolean(ficha.nivel)

  return [
    { texto: 'Ficha completa', cumplido: fichaCompleta },
    {
      texto: `Al menos un elemento de colaboración${
        ficha.elementos.length === 1 ? ` (${ETIQUETAS_ELEMENTO[ficha.elementos[0]]})` : ''
      }`,
      cumplido: ficha.elementos.length > 0,
    },
    {
      texto: `De ${MIN_LECCIONES_CURSO} a ${MAX_LECCIONES_CURSO} lecciones`,
      cumplido: lecciones.length >= MIN_LECCIONES_CURSO && lecciones.length <= MAX_LECCIONES_CURSO,
    },
    { texto: 'Una práctica', cumplido: lecciones.some((l) => l.tipo === 'practica') },
    { texto: 'Una reflexión', cumplido: lecciones.some((l) => l.tipo === 'reflexion') },
    {
      texto: 'Lecciones completas',
      cumplido: lecciones.every((l) =>
        l.tipo === 'recurso'
          ? l.recurso?.estatus === 'publicado'
          : Boolean(l.titulo && l.contenido && l.duracionMin !== null),
      ),
    },
  ]
}
