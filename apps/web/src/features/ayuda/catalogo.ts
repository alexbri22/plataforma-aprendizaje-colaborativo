import type { IdPista } from '@plataforma/shared'

type PistaDePantalla = Exclude<IdPista, 'bienvenida'>

interface TextoPista {
  titulo: string
  /** Para quien organiza o co-organiza. */
  organiza: string
  /** Para quien participa; si falta, se usa el mismo de quien organiza. */
  participa?: string
}

// Única fuente del texto del "?" de cada pantalla. Una o dos frases: dicen
// para qué sirve la pantalla, no cómo se usa cada control (eso lo dicen las
// ayudas de cada campo). Revisado con producto.
export const CATALOGO_PISTAS: Record<PistaDePantalla, TextoPista> = {
  resumen: {
    titulo: 'Datos de la actividad',
    organiza:
      'Lo general de la actividad: qué te toca en la etapa actual, el objetivo y los detalles, como fechas, inscripción y participantes.',
    participa:
      'Lo general de la actividad: objetivo, fechas y quién organiza. El trabajo del día a día está en tu equipo.',
  },
  planificar: {
    titulo: 'Planificar',
    organiza:
      'Qué seguimiento tendrá la actividad y qué comparten los equipos. Algunas opciones dejan de poder cambiarse cuando la actividad avanza.',
  },
  inscripcion: {
    titulo: 'Inscripción',
    organiza:
      'Comparte la clave para que los participantes se unan. La inscripción cierra sola en su fecha, o puedes cerrarla antes.',
  },
  equipos: {
    titulo: 'Equipos',
    organiza:
      'Al cerrar la inscripción, sugiere equipos o deja que cada quien elija el suyo. Al confirmarlos empieza el desarrollo.',
    participa:
      'Todos los equipos de la actividad. Si la formación es libre, únete al que quieras mientras haya lugar.',
  },
  metas: {
    titulo: 'Metas',
    organiza:
      'Lo que el equipo se propone lograr. Cualquiera del equipo puede agregar; tú puedes comentar.',
    participa:
      'Lo que tu equipo se propone lograr. Cualquiera del equipo puede agregar; quien organiza puede comentar.',
  },
  planeacion: {
    titulo: 'Planeación',
    organiza: 'Cómo se organiza el equipo para lograr sus metas: tareas, responsables y fechas.',
    participa: 'Cómo se organiza tu equipo para lograr sus metas: tareas, responsables y fechas.',
  },
  avances: {
    titulo: 'Avances',
    organiza: 'Lo que el equipo va entregando, según el calendario de entregas.',
    participa: 'Lo que tu equipo va entregando, según el calendario de entregas.',
  },
  materiales: {
    titulo: 'Materiales',
    organiza: 'Enlaces y archivos que el equipo necesita a la mano.',
  },
  producto: {
    titulo: 'Producto',
    organiza: 'Lo que el equipo entrega como resultado final de la actividad.',
    participa: 'Lo que tu equipo entrega como resultado final de la actividad.',
  },
  bitacora: {
    titulo: 'Bitácora',
    organiza:
      'El registro personal de cada participante: qué hizo y qué se le dificultó. Puedes comentar sus entradas.',
    participa:
      'Tu registro personal: qué hiciste y qué se te dificultó. Solo lo ven tú y quien organiza.',
  },
  reconocer: {
    titulo: 'Reconocer',
    organiza: 'Reconoce lo que aportó cada participante antes de que termine el cierre.',
    participa: 'Reconoce lo que aportó cada compañero antes de que termine el cierre.',
  },
}

export function textoPista(idPista: PistaDePantalla, organiza: boolean) {
  const pista = CATALOGO_PISTAS[idPista]
  return {
    titulo: pista.titulo,
    cuerpo: organiza ? pista.organiza : (pista.participa ?? pista.organiza),
  }
}

export type { PistaDePantalla }
