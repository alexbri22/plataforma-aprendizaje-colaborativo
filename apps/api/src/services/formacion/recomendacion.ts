import {
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_NIVEL_CURSO,
  NIVELES_CURSO,
  type ElementoColaboracion,
  type NivelCurso,
} from '@plataforma/shared'

/*
 * Recomendador de rutas de aprendizaje (docs/diseno-desarrollo-formacion.md,
 * nota del incremento 4, sección "Algoritmo de recomendación").
 *
 * Es un recomendador basado en contenido y explicable: a cada ruta le da un
 * puntaje con una fórmula fija y dice por qué. Usa solo datos formativos de
 * la propia persona —lo que declaró querer fortalecer y los cursos que empezó
 * o terminó— y los metadatos de los cursos. Nunca usa calificaciones,
 * insignias ni actividades: medir desempeño es de Insignias (§4.1 y §11.3).
 *
 * Es una función pura, sin base de datos, para poder probarla con perfiles
 * sintéticos y explicarla paso a paso.
 *
 * Señales, cada una entre 0 y 1, calculadas sobre los cursos disponibles de
 * la ruta (los retirados no cuentan):
 *
 * - Interés: qué parte de la ruta trabaja los elementos que la persona eligió.
 *   Si no eligió ninguno, se toman los de los cursos que tiene en curso
 *   (interés implícito). Si no hay ninguno de los dos, la señal no aplica y
 *   su peso se reparte entre las demás.
 * - Brecha: qué parte de lo que trabaja la ruta son elementos que la persona
 *   aún no ha cubierto con cursos terminados. Los cinco elementos se
 *   necesitan juntos (§3), así que llenar huecos tiene sentido pedagógico.
 * - Continuidad: cuánto de la ruta ya hizo (un curso terminado vale 1; uno
 *   empezado, 0.5). Seguir es mejor que dispersarse.
 * - Nivel adecuado: si la ruta empieza en el nivel que le toca (el siguiente
 *   al más alto que ha terminado; inicial si no ha terminado nada).
 *
 * Puntaje = suma ponderada de las señales que aplican, dividida entre la suma
 * de sus pesos. Las rutas que la persona ya terminó o que no tienen cursos
 * disponibles no se recomiendan. Empates: primero la destacada, luego el
 * orden editorial.
 *
 * Arranque en frío: sin preferencias y sin cursos no hay nada personal que
 * medir; el modo es "editorial" y la ruta destacada va primero.
 */

export const PESOS_RECOMENDACION = {
  interes: 0.4,
  brecha: 0.25,
  continuidad: 0.2,
  nivel: 0.15,
} as const

/** Cuántos cursos terminados que trabajan un elemento hacen falta para
 * considerarlo cubierto. Con uno solo, la cobertura es parcial (0.5). */
export const CURSOS_PARA_CUBRIR_ELEMENTO = 2

/** Peso de un curso empezado (no terminado) en la continuidad. */
export const PESO_CURSO_EMPEZADO = 0.5

export type SenalRecomendacion = keyof typeof PESOS_RECOMENDACION

export interface CursoDelPerfil {
  idCurso: string
  estado: 'en_curso' | 'completado'
  elementos: readonly ElementoColaboracion[]
  nivel: NivelCurso | null
}

export interface PerfilFormativo {
  /** Lo que la persona eligió fortalecer (hasta MAX_ELEMENTOS_PREFERIDOS). */
  preferidos: readonly ElementoColaboracion[]
  /** Sus cursos empezados o terminados, publicados o ya retirados. */
  cursos: readonly CursoDelPerfil[]
}

export interface CursoParaRecomendar {
  idCurso: string
  elementos: readonly ElementoColaboracion[]
  nivel: NivelCurso | null
  disponible: boolean
}

export interface RutaParaRecomendar {
  idRuta: string
  destacada: boolean
  orden: number
  cursos: readonly CursoParaRecomendar[]
}

export interface Recomendacion {
  idRuta: string
  /** De 0 a 100. */
  puntaje: number
  /** Cada señal entre 0 y 1; null si no aplica a esta persona. */
  senales: Record<SenalRecomendacion, number | null>
  /** Por qué se recomienda, de lo que más pesó a lo que menos (hasta 3). */
  razones: string[]
  avance: { completados: number; total: number }
}

export interface ResultadoRecomendacion {
  /** "editorial" si no había datos de la persona (arranque en frío). */
  modo: 'personalizado' | 'editorial'
  recomendaciones: Recomendacion[]
}

function lista(etiquetas: string[]): string {
  if (etiquetas.length <= 1) return etiquetas.join('')
  return `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas[etiquetas.length - 1]}`
}

function nombres(elementos: Iterable<ElementoColaboracion>): string {
  return lista([...elementos].map((e) => ETIQUETAS_ELEMENTO[e]))
}

const RANGO_NIVEL: Readonly<Record<NivelCurso, number>> = {
  inicial: 0,
  intermedio: 1,
  avanzado: 2,
}

/** El nivel que le toca: el siguiente al más alto que ha terminado. */
export function nivelSugerido(perfil: PerfilFormativo): NivelCurso {
  const rangos = perfil.cursos
    .filter((c) => c.estado === 'completado' && c.nivel)
    .map((c) => RANGO_NIVEL[c.nivel as NivelCurso])
  if (rangos.length === 0) return 'inicial'
  return NIVELES_CURSO[Math.min(Math.max(...rangos) + 1, NIVELES_CURSO.length - 1)]
}

/** Qué tan cubierto tiene cada elemento con cursos terminados, de 0 a 1. */
export function coberturaPorElemento(perfil: PerfilFormativo): Map<ElementoColaboracion, number> {
  const conteo = new Map<ElementoColaboracion, number>()
  for (const c of perfil.cursos) {
    if (c.estado !== 'completado') continue
    for (const e of c.elementos) conteo.set(e, (conteo.get(e) ?? 0) + 1)
  }
  return new Map([...conteo].map(([e, n]) => [e, Math.min(1, n / CURSOS_PARA_CUBRIR_ELEMENTO)]))
}

/** Interés declarado o, si no hay, el implícito de los cursos en curso. */
function interesDe(perfil: PerfilFormativo): {
  elementos: Set<ElementoColaboracion>
  origen: 'declarado' | 'implicito' | null
} {
  if (perfil.preferidos.length > 0) {
    return { elementos: new Set(perfil.preferidos), origen: 'declarado' }
  }
  const implicito = new Set(
    perfil.cursos.filter((c) => c.estado === 'en_curso').flatMap((c) => c.elementos),
  )
  return implicito.size > 0
    ? { elementos: implicito, origen: 'implicito' }
    : { elementos: implicito, origen: null }
}

interface Calculo {
  recomendacion: Recomendacion
  destacada: boolean
  orden: number
}

function calcular(
  ruta: RutaParaRecomendar,
  perfil: PerfilFormativo,
  interes: ReturnType<typeof interesDe>,
  cobertura: Map<ElementoColaboracion, number>,
  sugerido: NivelCurso,
): Calculo | null {
  const disponibles = ruta.cursos.filter((c) => c.disponible)
  if (disponibles.length === 0) return null

  const estado = new Map(perfil.cursos.map((c) => [c.idCurso, c.estado]))
  const completados = disponibles.filter((c) => estado.get(c.idCurso) === 'completado').length
  if (completados === disponibles.length) return null // ya la terminó

  // Parte de la ruta que trabaja cada elemento.
  const parte = new Map<ElementoColaboracion, number>()
  for (const c of disponibles) {
    for (const e of new Set(c.elementos)) parte.set(e, (parte.get(e) ?? 0) + 1 / disponibles.length)
  }

  // Interés: promedio, sobre los elementos de interés, de la parte de la ruta
  // que los trabaja.
  const enInteres = [...interes.elementos].filter((e) => parte.has(e))
  const senalInteres =
    interes.origen === null
      ? null
      : [...interes.elementos].reduce((total, e) => total + (parte.get(e) ?? 0), 0) /
        interes.elementos.size

  // Brecha: de lo que trabaja la ruta, cuánto falta por cubrir.
  const totalParte = [...parte.values()].reduce((a, b) => a + b, 0)
  const senalBrecha =
    totalParte === 0
      ? 0
      : [...parte].reduce((total, [e, p]) => total + p * (1 - (cobertura.get(e) ?? 0)), 0) /
        totalParte
  const sinCubrir = [...parte.keys()].filter((e) => (cobertura.get(e) ?? 0) === 0)

  // Continuidad: lo que ya hizo de esta ruta.
  const empezados = disponibles.filter((c) => estado.get(c.idCurso) === 'en_curso').length
  const senalContinuidad = (completados + PESO_CURSO_EMPEZADO * empezados) / disponibles.length

  // Nivel: dónde empieza la ruta contra lo que le toca.
  const inicio = disponibles[0].nivel
  const diferencia = inicio === null ? 0 : RANGO_NIVEL[inicio] - RANGO_NIVEL[sugerido]
  const senalNivel = diferencia <= 0 ? 1 : diferencia === 1 ? 0.5 : 0

  const senales: Record<SenalRecomendacion, number | null> = {
    interes: senalInteres,
    brecha: senalBrecha,
    continuidad: senalContinuidad,
    nivel: senalNivel,
  }
  let suma = 0
  let pesos = 0
  for (const [senal, valor] of Object.entries(senales) as [SenalRecomendacion, number | null][]) {
    if (valor === null) continue
    suma += PESOS_RECOMENDACION[senal] * valor
    pesos += PESOS_RECOMENDACION[senal]
  }
  const puntaje = Math.round((suma / pesos) * 100)

  // Razones: una por señal que aportó, de la que más pesó a la que menos.
  const candidatas: { aporte: number; texto: string }[] = []
  if (senalInteres && enInteres.length > 0) {
    candidatas.push({
      aporte: PESOS_RECOMENDACION.interes * senalInteres,
      texto:
        interes.origen === 'declarado'
          ? `Trabaja ${nombres(enInteres)}, que elegiste fortalecer.`
          : `Trabaja ${nombres(enInteres)}, como los cursos que estás haciendo.`,
    })
  }
  if (sinCubrir.length > 0) {
    candidatas.push({
      aporte: PESOS_RECOMENDACION.brecha * senalBrecha,
      texto: `Cubre ${nombres(sinCubrir)}, que aún no has trabajado en ningún curso completado.`,
    })
  }
  if (senalContinuidad > 0) {
    candidatas.push({
      aporte: PESOS_RECOMENDACION.continuidad * senalContinuidad,
      texto:
        completados > 0
          ? `Ya terminaste ${completados} de ${disponibles.length} cursos de esta ruta.`
          : `Ya empezaste un curso de esta ruta.`,
    })
  }
  if (inicio && diferencia <= 0) {
    candidatas.push({
      aporte: PESOS_RECOMENDACION.nivel * senalNivel,
      texto: `Empieza en nivel ${ETIQUETAS_NIVEL_CURSO[inicio].toLowerCase()}, adecuado para ti.`,
    })
  }

  return {
    destacada: ruta.destacada,
    orden: ruta.orden,
    recomendacion: {
      idRuta: ruta.idRuta,
      puntaje,
      senales,
      razones: candidatas
        .sort((a, b) => b.aporte - a.aporte)
        .slice(0, 3)
        .map((r) => r.texto),
      avance: { completados, total: disponibles.length },
    },
  }
}

export function recomendarRutas(
  perfil: PerfilFormativo,
  rutas: readonly RutaParaRecomendar[],
): ResultadoRecomendacion {
  const interes = interesDe(perfil)
  const cobertura = coberturaPorElemento(perfil)
  const sugerido = nivelSugerido(perfil)
  const editorial = perfil.preferidos.length === 0 && perfil.cursos.length === 0

  const calculos = rutas
    .map((r) => calcular(r, perfil, interes, cobertura, sugerido))
    .filter((c): c is Calculo => c !== null)

  calculos.sort((a, b) => {
    // En frío no hay nada personal que comparar: manda la destacada.
    if (editorial && a.destacada !== b.destacada) return a.destacada ? -1 : 1
    if (b.recomendacion.puntaje !== a.recomendacion.puntaje) {
      return b.recomendacion.puntaje - a.recomendacion.puntaje
    }
    if (a.destacada !== b.destacada) return a.destacada ? -1 : 1
    return a.orden - b.orden || a.recomendacion.idRuta.localeCompare(b.recomendacion.idRuta)
  })

  return {
    modo: editorial ? 'editorial' : 'personalizado',
    recomendaciones: calculos.map((c) =>
      editorial && c.destacada
        ? {
            ...c.recomendacion,
            razones: ['Ruta destacada por el equipo de contenido para empezar.'],
          }
        : c.recomendacion,
    ),
  }
}
