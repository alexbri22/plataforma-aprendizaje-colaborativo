/*
 * Plantillas de instrumento del sistema (docs/diseno-desarrollo-general.md
 * §5.3, "Plantillas de instrumento en código"; nucleo §10.1): los reactivos
 * del documento de evaluaciones de las coordinadoras, en código como el
 * catálogo de insignias. Una actividad referencia la plantilla por su clave y
 * cada respuesta se guarda por clave de reactivo.
 *
 * Las claves de plantilla y de reactivo son estables: nunca se renombran ni
 * se reutilizan. Cambiar el sentido de un reactivo es una clave nueva, y la
 * anterior sale del formulario sin borrarse mientras haya respuestas que la
 * usen.
 */

import type { ClavePlantilla } from './calificacion.js'
import type { ArchivoDeElemento } from './seguimiento.js'

/** Escala de las autoevaluaciones (nucleo §10.1). */
export const ESCALA_LIKERT = [
  { valor: 1, etiqueta: 'Nunca' },
  { valor: 2, etiqueta: 'Algunas veces' },
  { valor: 3, etiqueta: 'Casi siempre' },
  { valor: 4, etiqueta: 'Siempre' },
] as const

export type TipoCampoReactivo = 'likert' | 'distribucion_integrantes'

export interface Reactivo {
  clave: string
  texto: string
  /** Solo informativo: el ejemplo de una acción de la evaluación por pares. */
  ejemplo?: string
}

export interface PlantillaInstrumento {
  clave: ClavePlantilla
  nombre: string
  campo: TipoCampoReactivo
  reactivos: readonly Reactivo[]
}

export const PLANTILLAS_INSTRUMENTO: Readonly<Record<ClavePlantilla, PlantillaInstrumento>> = {
  autoevaluacion_responsabilidad: {
    clave: 'autoevaluacion_responsabilidad',
    nombre: 'Mi responsabilidad individual y grupal',
    campo: 'likert',
    reactivos: [
      {
        clave: 'tareas_correspondientes',
        texto: 'He cumplido con las tareas que me correspondían.',
      },
      {
        clave: 'tiempo_y_esfuerzo',
        texto: 'He dedicado el tiempo y el esfuerzo necesarios para realizar mi trabajo.',
      },
      {
        clave: 'objetivos_del_equipo',
        texto: 'He contribuido activamente al cumplimiento de los objetivos del equipo.',
      },
      {
        // El documento dice "con a de otro compañero": errata de "con la".
        clave: 'averiguar_diferencias',
        texto:
          'Cuando mi respuesta no ha coincidido con la de otro compañero, he tratado de averiguar por qué.',
      },
      {
        clave: 'consultar_dudas',
        texto: 'Cuando no he comprendido algo, lo he consultado con los demás.',
      },
      {
        clave: 'ayudar_a_comprender',
        texto: 'Me he preocupado por ayudar a mis compañeros a comprender y aprender.',
      },
      {
        clave: 'acuerdos_y_compromisos',
        texto: 'He cumplido los acuerdos y compromisos establecidos por el equipo.',
      },
      {
        clave: 'reconocer_errores',
        texto: 'He reconocido mis errores y he intentado corregirlos.',
      },
      {
        clave: 'objetivos_comunes',
        texto: 'He contribuido a que el equipo alcance sus objetivos comunes.',
      },
    ],
  },
  autoevaluacion_comunicacion: {
    clave: 'autoevaluacion_comunicacion',
    nombre: 'Mi comunicación con los compañeros',
    campo: 'likert',
    reactivos: [
      {
        clave: 'ideas_claras',
        texto: 'He expresado mis ideas y opiniones de manera clara y respetuosa.',
      },
      {
        clave: 'escucha_atenta',
        texto: 'He escuchado atentamente las aportaciones de mis compañeros.',
      },
      { clave: 'turnos_de_palabra', texto: 'He respetado los turnos de palabra.' },
      {
        clave: 'preguntas_para_aclarar',
        texto: 'He realizado preguntas cuando necesitaba aclarar alguna información.',
      },
      { clave: 'aceptar_criticas', texto: 'He aceptado las críticas y sugerencias constructivas.' },
      {
        clave: 'desacuerdos_respetuosos',
        texto: 'He expresado mis desacuerdos de manera respetuosa.',
      },
      {
        clave: 'compartir_informacion',
        texto: 'He compartido información y conocimientos que podían ayudar al equipo.',
      },
      {
        clave: 'animar_a_participar',
        texto: 'He animado a mis compañeros a participar y expresar sus opiniones.',
      },
    ],
  },
  autoevaluacion_interdependencia: {
    clave: 'autoevaluacion_interdependencia',
    nombre: 'Mi contribución a la interdependencia positiva',
    campo: 'likert',
    reactivos: [
      {
        clave: 'aprendizaje_compartido',
        texto:
          'He comprendido que mi aprendizaje también contribuye al aprendizaje de mis compañeros.',
      },
      {
        clave: 'compartir_conocimientos',
        texto: 'He compartido mis conocimientos y recursos con los demás.',
      },
      { clave: 'ofrecer_ayuda', texto: 'He ofrecido ayuda cuando algún compañero la necesitaba.' },
      { clave: 'solicitar_ayuda', texto: 'He solicitado ayuda cuando no comprendía algo.' },
      {
        clave: 'comprobar_comprension',
        texto: 'Me he interesado por comprobar que todos los integrantes comprendían la actividad.',
      },
      {
        clave: 'valorar_aportaciones',
        texto: 'He reconocido y valorado las aportaciones de mis compañeros.',
      },
      {
        clave: 'ambiente_de_confianza',
        texto: 'He contribuido a crear un ambiente de confianza y colaboración.',
      },
      {
        clave: 'exito_de_todos',
        texto:
          'He comprendido que el éxito del equipo depende del esfuerzo y aprendizaje de todos.',
      },
    ],
  },
  // Se responde con el incremento de Evaluación por pares (nucleo §10.2).
  evaluacion_pares: {
    clave: 'evaluacion_pares',
    nombre: 'Evaluación por pares',
    campo: 'distribucion_integrantes',
    reactivos: [
      {
        clave: 'aportar_ideas',
        texto: 'Aportar ideas',
        ejemplo: 'Propuso una solución diferente.',
      },
      {
        clave: 'fomentar_participacion',
        texto: 'Fomentar la participación',
        ejemplo: 'Invitó a participar a quien hablaba menos.',
      },
      {
        clave: 'resumir_e_integrar',
        texto: 'Resumir e integrar el trabajo',
        ejemplo: 'Unificó las ideas del equipo.',
      },
      {
        clave: 'comprobar_lo_aprendido',
        texto: 'Comprobar lo aprendido',
        ejemplo: 'Preguntó si todos habían comprendido.',
      },
      {
        clave: 'relacionar_con_lo_asimilado',
        texto: 'Relacionar lo nuevo con lo ya asimilado',
        ejemplo: 'Conectó el tema con contenidos anteriores.',
      },
      {
        clave: 'organizar_al_grupo',
        texto: 'Organizar al grupo',
        ejemplo: 'Coordinó las tareas y los tiempos.',
      },
      {
        clave: 'escuchar_y_respetar',
        texto: 'Escuchar y respetar',
        ejemplo: 'Escuchó sin interrumpir y tuvo en cuenta otras opiniones.',
      },
      {
        clave: 'ayudar_a_los_companeros',
        texto: 'Ayudar a los compañeros',
        ejemplo: 'Explicó un contenido a otro integrante.',
      },
      {
        clave: 'cumplir_compromisos',
        texto: 'Cumplir compromisos',
        ejemplo: 'Entregó su parte en el plazo acordado.',
      },
    ],
  },
}

/** Respuestas de una autoevaluación: un valor de la escala por reactivo. */
export type RespuestasLikert = Record<string, number>

/** Validación de una autoevaluación, la misma en el cliente y en el
 * servidor. Exige todos los reactivos (nucleo §10.1: el promedio nunca se
 * calcula sobre un formulario incompleto) y devuelve el error por clave en
 * lugar de lanzar. */
export function validarRespuestasLikert(
  plantilla: PlantillaInstrumento,
  valor: unknown,
): { respuestas: RespuestasLikert } | { errores: Record<string, string> } {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return { errores: { respuestas: 'Responde todos los reactivos.' } }
  }
  const entrada = valor as Record<string, unknown>
  const claves = plantilla.reactivos.map((r) => r.clave)
  const errores: Record<string, string> = {}
  for (const clave of Object.keys(entrada)) {
    if (!claves.includes(clave)) errores[clave] = 'No es un reactivo de este cuestionario.'
  }
  const respuestas: RespuestasLikert = {}
  for (const clave of claves) {
    const v = entrada[clave]
    if (v === undefined || v === null) {
      errores[clave] = 'Elige una opción.'
    } else if (!ESCALA_LIKERT.some((opcion) => opcion.valor === v)) {
      errores[clave] = 'Debe ser un valor de la escala, de 1 a 4.'
    } else {
      respuestas[clave] = v as number
    }
  }
  return Object.keys(errores).length > 0 ? { errores } : { respuestas }
}

/** Puntaje de una autoevaluación (nucleo §10.1): (promedio − 1) / 3,
 * expresado de 0 a 100 con dos decimales. */
export function puntajeLikert(
  plantilla: PlantillaInstrumento,
  respuestas: RespuestasLikert,
): number {
  const valores = plantilla.reactivos.map((r) => respuestas[r.clave])
  const promedio = valores.reduce((suma, v) => suma + v, 0) / valores.length
  return Math.round(((promedio - 1) / 3) * 10000) / 100
}

/** Respuestas de una evaluación por pares (nucleo §10.2): por cada acción,
 * el porcentaje que quien responde le da a cada integrante de su equipo,
 * incluido él mismo, por id de membresía. */
export type RespuestasDistribucion = Record<string, Record<string, number>>

/** Validación de una evaluación por pares contra los integrantes del equipo
 * al momento de responder (nucleo §10.2): en cada acción, exactamente esos
 * integrantes, con enteros de 0 a 100 que suman 100. */
export function validarRespuestasDistribucion(
  plantilla: PlantillaInstrumento,
  valor: unknown,
  integrantes: readonly string[],
): { respuestas: RespuestasDistribucion } | { errores: Record<string, string> } {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return { errores: { respuestas: 'Reparte el 100 % en cada acción.' } }
  }
  const entrada = valor as Record<string, unknown>
  const claves = plantilla.reactivos.map((r) => r.clave)
  const errores: Record<string, string> = {}
  for (const clave of Object.keys(entrada)) {
    if (!claves.includes(clave)) errores[clave] = 'No es una acción de esta evaluación.'
  }
  const respuestas: RespuestasDistribucion = {}
  for (const clave of claves) {
    const reparto = entrada[clave]
    if (!reparto || typeof reparto !== 'object' || Array.isArray(reparto)) {
      errores[clave] = 'Reparte el 100 % entre los integrantes.'
      continue
    }
    const porIntegrante = reparto as Record<string, unknown>
    const ids = Object.keys(porIntegrante)
    if (ids.length !== integrantes.length || !integrantes.every((id) => ids.includes(id))) {
      errores[clave] = 'El reparto no coincide con los integrantes de tu equipo.'
      continue
    }
    const valores = integrantes.map((id) => porIntegrante[id])
    if (!valores.every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100)) {
      errores[clave] = 'Cada porcentaje debe ser un entero de 0 a 100.'
      continue
    }
    const suma = (valores as number[]).reduce((a, b) => a + b, 0)
    if (suma !== 100) {
      errores[clave] = `Suma ${suma} %; debe sumar 100 %.`
      continue
    }
    respuestas[clave] = Object.fromEntries(
      integrantes.map((id) => [id, porIntegrante[id] as number]),
    )
  }
  return Object.keys(errores).length > 0 ? { errores } : { respuestas }
}

/** Si una respuesta de pares sigue valiendo para el equipo actual: su
 * reparto nombra exactamente a sus integrantes. Una reasignación la deja
 * fuera del cálculo y pide responder de nuevo (nucleo §10.2). */
export function repartoVigente(
  respuestas: RespuestasDistribucion,
  integrantes: readonly string[],
): boolean {
  return Object.values(respuestas).every((reparto) => {
    const ids = Object.keys(reparto)
    return ids.length === integrantes.length && integrantes.every((id) => ids.includes(id))
  })
}

export interface ResultadoPares {
  /** De 0 a 100, o nulo si no aplica: equipo de una persona, o nadie más
   * respondió (nucleo §10.2). */
  puntaje: number | null
  porAccion: {
    clave: string
    /** Promedio que le dieron los demás que respondieron; nulo si ninguno. */
    recibido: number | null
    /** Lo que se dio a sí mismo, solo como contraste; nulo si no respondió. */
    autoasignado: number | null
  }[]
}

const redondear = (n: number) => Math.round(n * 100) / 100

/** Puntaje de pares de un integrante (nucleo §10.2, P-37): por acción, el
 * promedio que le asignaron los demás integrantes que respondieron, entre la
 * parte igualitaria 100 / n; el puntaje es min(1, promedio de los factores),
 * de 0 a 100. Solo cuentan respuestas vigentes para el equipo actual. */
export function calcularPares(
  plantilla: PlantillaInstrumento,
  idMembresia: string,
  integrantes: readonly string[],
  respuestasPorAutor: Readonly<Record<string, RespuestasDistribucion>>,
): ResultadoPares {
  const n = integrantes.length
  const vigentes = Object.entries(respuestasPorAutor).filter(([, r]) =>
    repartoVigente(r, integrantes),
  )
  const deOtros = vigentes.filter(([autor]) => autor !== idMembresia).map(([, r]) => r)
  const propias = vigentes.find(([autor]) => autor === idMembresia)?.[1]

  const porAccion = plantilla.reactivos.map(({ clave }) => {
    const recibidos = deOtros.map((r) => r[clave]?.[idMembresia] ?? 0)
    return {
      clave,
      recibido:
        recibidos.length > 0
          ? redondear(recibidos.reduce((a, b) => a + b, 0) / recibidos.length)
          : null,
      autoasignado: propias?.[clave]?.[idMembresia] ?? null,
    }
  })

  if (n < 2 || deOtros.length === 0) return { puntaje: null, porAccion }
  const igualitaria = 100 / n
  const factores = porAccion.map((a) => (a.recibido ?? 0) / igualitaria)
  const promedio = factores.reduce((a, b) => a + b, 0) / factores.length
  return { puntaje: redondear(Math.min(1, promedio) * 100), porAccion }
}

/*
 * Contrato de la API (nucleo §10.5): mis instrumentos y respuestas.
 */

/** Un instrumento que le toca a quien participa: una autoevaluación con
 * plantilla, que responde aquí, o una actividad externa, que completa con
 * una entrega. */
export interface InstrumentoPorResponder {
  id: string
  nombre: string
  aspecto: { clave: string; nombre: string }
  formato: 'plantilla' | 'enlace'
  clavePlantilla: ClavePlantilla | null
  /** Solo en formato enlace; nulo mientras quien organiza no lo escribe. */
  enlace: string | null
  fechaPlanificada: string | null
  /** Cuándo respondió la plantilla o registró su entrega por última vez;
   * nulo mientras esté pendiente. */
  completadoEn: string | null
}

export const LONGITUD_MAXIMA_CONTENIDO_ENTREGA = 2000

/** Con lo que quien participa completa una actividad externa (nucleo
 * §10.1): una nota y, si quiere, un enlace o un archivo, como un avance. */
export interface EntregaDeInstrumento {
  id: string
  idInstrumento: string
  idMembresia: string
  contenido: string
  enlace: string | null
  archivo: ArchivoDeElemento | null
  fechaCreacion: string
  fechaActualizacion: string
}

/** Para quien organiza: una instancia de un aspecto y quiénes ya la
 * completaron (respondieron la plantilla o entregaron la actividad). */
export interface CumplimientoDeInstrumento {
  id: string
  nombre: string
  formato: 'plantilla' | 'enlace'
  clavePlantilla: ClavePlantilla | null
  fechaPlanificada: string | null
  completados: { idMembresia: string; fecha: string }[]
  /** Puntajes capturados de una actividad externa: lo ya revisado. */
  puntajes: { idMembresia: string; valor: number }[]
}

/** Operación de la planeación, para quien organiza: una instancia del
 * proceso colaborativo y cuántos participantes ya la completaron. */
export interface AvanceDeInstrumento {
  id: string
  nombre: string
  aspecto: { clave: string; nombre: string }
  fechaPlanificada: string | null
  completados: number
  /** Participantes con equipo, que son a quienes les toca. */
  total: number
}

export interface RespuestasDeInstrumento {
  idInstrumento: string
  idMembresia: string
  /** Escala por reactivo en una autoevaluación; reparto por acción en la
   * evaluación por pares. */
  respuestas: RespuestasLikert | RespuestasDistribucion
  fecha: string
}

/** Para quien participa (nucleo §10.2, P-08): lo que le dieron sus
 * compañeros en conjunto, sin quién dio qué. Solo con dos o más compañeros
 * que hayan respondido: con uno, el promedio sería su voto. */
export interface MisResultadosPares {
  idInstrumento: string
  /** 100 / n: lo que le tocaría si todos aportaran igual. */
  parteIgual: number
  /** Compañeros que ya respondieron (sin contarse). */
  respondieron: number
  /** Nulo mientras respondan menos de dos. */
  porAccion: { clave: string; recibido: number }[] | null
}

/** Mínimo de compañeros que deben haber respondido para mostrarle a alguien
 * lo que recibió sin revelar el voto de uno solo. */
export const MINIMO_RESPUESTAS_PARES_VISIBLES = 2

/** Para quien organiza (nucleo §10.2): los resultados de pares de un equipo,
 * con la autoasignación de cada quien como contraste. */
export interface ResultadosParesDeEquipo {
  idInstrumento: string
  integrantes: ({ idMembresia: string; respondio: boolean } & ResultadoPares)[]
}
