import type { AreaHabilidad, ElementoColaboracion } from '@plataforma/shared'

/*
 * Catálogo editorial de microcursos y ruta destacada
 * (docs/diseno-desarrollo-formacion.md §4 y §4.1), tal como los muestra el
 * diseño de la pantalla. Todavía no hay API de cursos: llega en el
 * incremento 2 (cursos, lecciones y rutas). Hasta entonces se muestran como
 * vista previa del catálogo, sin enlace a un curso que aún no existe.
 */

export interface CursoPrevio {
  id: string
  titulo: string
  descripcion: string
  area: AreaHabilidad
  duracionMin: number
  nivel: 'Inicial' | 'Intermedio'
  elemento: ElementoColaboracion
}

export const CURSOS_PREVIOS: CursoPrevio[] = [
  {
    id: 'comunicacion-clara',
    titulo: 'Comunicación clara en equipos',
    descripcion: 'Expresa ideas, necesidades y acuerdos de forma breve, directa y respetuosa.',
    area: 'comunicacion',
    duracionMin: 30,
    nivel: 'Inicial',
    elemento: 'interaccion_promotora',
  },
  {
    id: 'escucha-activa',
    titulo: 'Escucha activa y preguntas útiles',
    descripcion: 'Comprende antes de responder y formula preguntas que ayudan al grupo a avanzar.',
    area: 'comunicacion',
    duracionMin: 25,
    nivel: 'Inicial',
    elemento: 'interaccion_promotora',
  },
  {
    id: 'acuerdos-responsabilidades',
    titulo: 'Acuerdos y responsabilidades claras',
    descripcion: 'Convierte una conversación en compromisos concretos, visibles y realizables.',
    area: 'organizacion',
    duracionMin: 35,
    nivel: 'Intermedio',
    elemento: 'responsabilidades',
  },
  {
    id: 'metas-compartidas',
    titulo: 'Metas compartidas e interdependencia',
    descripcion:
      'Diseña objetivos en los que cada contribución sea necesaria para el resultado común.',
    area: 'organizacion',
    duracionMin: 40,
    nivel: 'Intermedio',
    elemento: 'interdependencia_positiva',
  },
  {
    id: 'desacuerdos-respeto',
    titulo: 'Resolver desacuerdos con respeto',
    descripcion: 'Separa a las personas del problema y transforma tensiones en decisiones útiles.',
    area: 'conflictos',
    duracionMin: 35,
    nivel: 'Intermedio',
    elemento: 'procesamiento_grupal',
  },
  {
    id: 'retrospectivas',
    titulo: 'Retrospectivas para mejorar',
    descripcion:
      'Revisa cómo colaboró el grupo y acuerda un cambio pequeño para la siguiente ocasión.',
    area: 'reflexion',
    duracionMin: 30,
    nivel: 'Inicial',
    elemento: 'procesamiento_grupal',
  },
]

export const RUTA_DESTACADA = {
  titulo: 'Comunicación y confianza',
  descripcion:
    'Tres pasos para expresar ideas con claridad, escuchar con atención y ofrecer retroalimentación útil.',
  pasos: [
    { titulo: 'Comunicación clara en equipos', detalle: '30 min · Inicial' },
    { titulo: 'Escucha activa y preguntas útiles', detalle: '25 min · Inicial' },
    { titulo: 'Retroalimentación que ayuda a mejorar', detalle: '35 min · Intermedio' },
  ],
}
