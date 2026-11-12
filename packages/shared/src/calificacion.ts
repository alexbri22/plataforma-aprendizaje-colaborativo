/*
 * Calificación ponderada (docs/diseno-desarrollo-general.md §4.2): la
 * calificación final se calcula, no se captura. Tres niveles con peso propio
 * —componentes, aspectos e instrumentos—, valores por defecto, el catálogo
 * de aspectos del proceso colaborativo con la plantilla que admite cada uno,
 * y la función de cálculo que consumen por igual la API y la pantalla de
 * planificación.
 *
 * Fuentes: docs/diseno-desarrollo-general.md §4.2, §4.4, §4.6, §5.3.
 *          docs/diseno-desarrollo-nucleo.md §10.1, §10.3.
 */

import {
  bitacoraHabilitada,
  parsearEstadoEspacioEquipo,
  type ElementoEspacioEquipo,
} from './actividades.js'

/** Plantillas del sistema (general §4.2). Sus reactivos llegan con el
 * incremento de autoevaluaciones; aquí solo las claves, que son estables:
 * nunca se renombran ni se reutilizan. */
export const CLAVES_PLANTILLA = [
  'autoevaluacion_responsabilidad',
  'autoevaluacion_comunicacion',
  'autoevaluacion_interdependencia',
  'evaluacion_pares',
] as const
export type ClavePlantilla = (typeof CLAVES_PLANTILLA)[number]

export const NOMBRE_PLANTILLA: Readonly<Record<ClavePlantilla, string>> = {
  autoevaluacion_responsabilidad: 'Mi responsabilidad individual y grupal',
  autoevaluacion_comunicacion: 'Mi comunicación con los compañeros',
  autoevaluacion_interdependencia: 'Mi contribución a la interdependencia positiva',
  evaluacion_pares: 'Evaluación por pares',
}

/** Tipos de instrumento (material de requerimientos, lámina de Proceso
 * colaborativo). El tipo dice qué es; el formato, cómo se aplica. */
export const TIPOS_INSTRUMENTO = [
  'cuestionario_autoevaluacion',
  'cuestionario',
  'entrevista',
  'rubrica',
  'coevaluacion',
  'examen',
  'diario_aprendizaje',
] as const
export type TipoInstrumento = (typeof TIPOS_INSTRUMENTO)[number]

export const NOMBRE_TIPO: Readonly<Record<TipoInstrumento, string>> = {
  cuestionario_autoevaluacion: 'Cuestionario de autoevaluación',
  cuestionario: 'Cuestionario',
  entrevista: 'Entrevista',
  rubrica: 'Rúbrica',
  coevaluacion: 'Coevaluación',
  examen: 'Examen',
  diario_aprendizaje: 'Diario de aprendizaje',
}

/** Formato en que se aplica un instrumento (columna `origen`). plantilla: se
 * responde en la plataforma y se puntúa solo. enlace: una actividad externa
 * (un formulario, una entrevista, un examen) a la que lleva su enlace; quien
 * participa entrega ahí la constancia de que la hizo y quien organiza
 * captura el puntaje. manual: solo el proyecto y la bitácora, que quien
 * organiza puntúa sobre lo que se hizo en la plataforma; nunca se elige. */
export const ORIGENES_INSTRUMENTO = ['plantilla', 'enlace', 'manual'] as const
export type OrigenInstrumento = (typeof ORIGENES_INSTRUMENTO)[number]

// Un aspecto que todavía no tiene plantilla para ninguno de sus tipos.
const SIN_PLANTILLA: Partial<Record<TipoInstrumento, ClavePlantilla>> = {}

/** Los cinco aspectos de concepto §1, los tipos que admite cada uno (lámina
 * "Definición de recursos", que coincide tipo por tipo) y la plantilla del
 * sistema que existe para alguno de esos tipos (P-36, resuelta en general
 * §4.2). La evaluación por pares no es un aspecto: es la plantilla del tipo
 * coevaluación (P-38). */
export const ASPECTOS_PROCESO = [
  {
    clave: 'definicion_responsabilidades',
    nombre: 'Definición de responsabilidades',
    tipos: ['cuestionario_autoevaluacion', 'cuestionario', 'entrevista', 'rubrica'],
    plantillas: SIN_PLANTILLA,
  },
  {
    clave: 'interdependencia_positiva',
    nombre: 'Interdependencia positiva',
    tipos: ['cuestionario_autoevaluacion', 'diario_aprendizaje'],
    plantillas: { cuestionario_autoevaluacion: 'autoevaluacion_interdependencia' },
  },
  {
    clave: 'responsabilidad_individual_grupal',
    nombre: 'Responsabilidad individual y grupal',
    tipos: ['cuestionario_autoevaluacion', 'coevaluacion', 'examen', 'entrevista', 'rubrica'],
    plantillas: {
      cuestionario_autoevaluacion: 'autoevaluacion_responsabilidad',
      coevaluacion: 'evaluacion_pares',
    },
  },
  {
    clave: 'interaccion',
    nombre: 'Interacción',
    tipos: ['cuestionario', 'entrevista', 'rubrica'],
    plantillas: SIN_PLANTILLA,
  },
  {
    clave: 'evaluacion_grupo_habilidades_sociales',
    nombre: 'Evaluación de grupo y habilidades sociales',
    tipos: ['cuestionario_autoevaluacion', 'coevaluacion', 'cuestionario', 'entrevista', 'rubrica'],
    plantillas: {
      cuestionario_autoevaluacion: 'autoevaluacion_comunicacion',
      coevaluacion: 'evaluacion_pares',
    },
  },
] as const satisfies readonly {
  clave: string
  nombre: string
  tipos: readonly TipoInstrumento[]
  plantillas: Partial<Record<TipoInstrumento, ClavePlantilla>>
}[]
export type ClaveAspectoProceso = (typeof ASPECTOS_PROCESO)[number]['clave']

/** La plantilla del sistema para un tipo en un aspecto, si existe. */
export function plantillaPara(claveAspecto: string, tipo: TipoInstrumento): ClavePlantilla | null {
  const aspecto = ASPECTOS_PROCESO.find((a) => a.clave === claveAspecto)
  const plantillas: Partial<Record<TipoInstrumento, ClavePlantilla>> = aspecto?.plantillas ?? {}
  return plantillas[tipo] ?? null
}

/** Los formatos que se ofrecen para un tipo en un aspecto: la plantilla
 * primero, si existe, y la actividad externa, que admite cualquier tipo. */
export function formatosPara(claveAspecto: string, tipo: TipoInstrumento): OrigenInstrumento[] {
  return [...(plantillaPara(claveAspecto, tipo) ? (['plantilla'] as const) : []), 'enlace']
}

export const CLAVES_COMPONENTE = {
  proyecto: 'proyecto',
  proceso: 'proceso',
  aprendizaje: 'aprendizaje',
} as const

/** Los aspectos del proyecto colaborativo son los elementos del espacio de
 * equipo (P-40): cada uno con su porcentaje del proyecto, y sin contar
 * mientras está deshabilitado. La clave es la del elemento. */
/** El aspecto de la bitácora individual, dentro del proyecto: no aplica con
 * la función `bitacora_individual` deshabilitada, y se puntúa por persona,
 * no por equipo. */
export const ASPECTO_BITACORA = 'bitacora'

export const ASPECTOS_PROYECTO: readonly {
  clave: ElementoEspacioEquipo | typeof ASPECTO_BITACORA
  nombre: string
}[] = [
  { clave: 'metas', nombre: 'Metas' },
  { clave: 'planeacion', nombre: 'Planeación' },
  { clave: 'avances', nombre: 'Avances' },
  { clave: 'recursos', nombre: 'Materiales' },
  { clave: 'producto', nombre: 'Producto' },
  { clave: ASPECTO_BITACORA, nombre: 'Bitácora' },
]

/** Aprendizaje: la valoración de quien organiza, un solo puntaje por
 * participante a su criterio, sin relación con nada de la plataforma. */
export const ASPECTO_APRENDIZAJE = 'valoracion'

/** Reparto equitativo en enteros que suman 100; el residuo va a los primeros
 * (general §4.2). Con 6: [17, 17, 17, 17, 16, 16]. */
export function repartoEquitativo(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(100 / n)
  const residuo = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < residuo ? 1 : 0))
}

export interface InstrumentoPorDefecto {
  nombre: string
  /** Nulo en el proyecto y la bitácora, que no son de ningún tipo del catálogo. */
  tipo: TipoInstrumento | null
  origen: OrigenInstrumento
  clavePlantilla: ClavePlantilla | null
}

export interface AspectoPorDefecto {
  clave: string
  nombre: string
  peso: number
  instrumentos: InstrumentoPorDefecto[]
}

export interface ComponentePorDefecto {
  clave: string
  nombre: string
  peso: number
  aspectos: AspectoPorDefecto[]
}

/** Estructura con la que nace toda actividad (general §4.2, P-40): proyecto
 * 40, proceso 40 y aprendizaje 20. Los aspectos del proceso no traen
 * instrumentos: quien organiza los elige. */
export function estructuraPorDefecto(): ComponentePorDefecto[] {
  const aspectosProceso = ASPECTOS_PROCESO.map(({ clave, nombre }) => ({ clave, nombre }))
  const pesosProceso = repartoEquitativo(aspectosProceso.length)
  const pesosProyecto = repartoEquitativo(ASPECTOS_PROYECTO.length)

  return [
    {
      clave: CLAVES_COMPONENTE.proyecto,
      nombre: 'Proyecto colaborativo',
      peso: 40,
      // Un aspecto por elemento del espacio de equipo, con su porcentaje del
      // proyecto (P-40), y un instrumento manual que quien organiza puntúa.
      aspectos: ASPECTOS_PROYECTO.map((aspecto, i) => ({
        ...aspecto,
        peso: pesosProyecto[i],
        instrumentos: [
          { nombre: aspecto.nombre, tipo: null, origen: 'manual', clavePlantilla: null },
        ],
      })),
    },
    {
      clave: CLAVES_COMPONENTE.proceso,
      nombre: 'Proceso colaborativo',
      peso: 40,
      aspectos: aspectosProceso.map((aspecto, i) => ({
        ...aspecto,
        peso: pesosProceso[i],
        instrumentos: [],
      })),
    },
    {
      clave: CLAVES_COMPONENTE.aprendizaje,
      nombre: 'Aprendizaje',
      peso: 20,
      aspectos: [
        {
          clave: ASPECTO_APRENDIZAJE,
          nombre: 'Aprendizaje',
          peso: 100,
          instrumentos: [
            { nombre: 'Aprendizaje', tipo: null, origen: 'manual', clavePlantilla: null },
          ],
        },
      ],
    },
  ]
}

/*
 * Contrato de la API (nucleo §10.5): GET/PUT /api/actividades/{id}/ponderacion.
 */

export interface InstrumentoDePonderacion {
  id: string
  nombre: string
  tipo: TipoInstrumento | null
  origen: OrigenInstrumento
  clavePlantilla: ClavePlantilla | null
  /** Solo en formato enlace; nulo mientras quien organiza no lo escribe. */
  enlace: string | null
  /** YYYY-MM-DD. Sin efecto todavía (P-41). */
  fechaPlanificada: string | null
  orden: number
  /** Con respuestas o entregas, no se reemplaza ni cambia de formato
   * (nucleo §10.1). */
  conRespuestas: boolean
}

export interface AspectoDePonderacion {
  id: string
  clave: string
  nombre: string
  peso: number
  orden: number
  instrumentos: InstrumentoDePonderacion[]
}

export interface ComponenteDePonderacion {
  id: string
  clave: string
  nombre: string
  peso: number
  orden: number
  aspectos: AspectoDePonderacion[]
}

export interface Ponderacion {
  componentes: ComponenteDePonderacion[]
}

/** Si un aspecto está apagado por la configuración de la actividad
 * (nucleo §10.3): la bitácora con su función deshabilitada o un elemento del
 * espacio de equipo deshabilitado. Apagado
 * vale 0 y su peso no entra en la suma de su nivel. */
export function aspectoDeshabilitado(
  claveComponente: string,
  claveAspecto: string,
  configuracion: Readonly<Partial<Record<string, string>>>,
): boolean {
  if (claveAspecto === ASPECTO_BITACORA)
    return !bitacoraHabilitada(configuracion.bitacora_individual)
  if (claveComponente === CLAVES_COMPONENTE.proyecto) {
    const espacio = parsearEstadoEspacioEquipo(configuracion.espacio_equipo ?? '')
    return espacio?.[claveAspecto as ElementoEspacioEquipo] === 'deshabilitado'
  }
  return false
}

/** Un componente está apagado si todos sus aspectos lo están (el proyecto,
 * con todo el espacio de equipo y la bitácora deshabilitados). */
export function componenteDeshabilitado(
  componente: { clave: string; aspectos: readonly { clave: string }[] },
  configuracion: Readonly<Partial<Record<string, string>>>,
): boolean {
  return componente.aspectos.every((aspecto) =>
    aspectoDeshabilitado(componente.clave, aspecto.clave, configuracion),
  )
}

/** Instrumentos que no aplican a nadie por la configuración de la
 * actividad: los de los aspectos apagados (aspectoDeshabilitado). Lo que no
 * aplica a una persona en particular (un equipo de uno) lo decide quien
 * calcula. */
export function instrumentosSinFuncion(
  ponderacion: Ponderacion,
  configuracion: Readonly<Partial<Record<string, string>>>,
): Set<string> {
  const sinFuncion = new Set<string>()
  for (const componente of ponderacion.componentes) {
    for (const aspecto of componente.aspectos) {
      if (aspectoDeshabilitado(componente.clave, aspecto.clave, configuracion)) {
        for (const instrumento of aspecto.instrumentos) sinFuncion.add(instrumento.id)
      }
    }
  }
  return sinFuncion
}

/** La suma de los pesos que cuentan en un nivel: lo apagado vale 0 y no
 * entra (general §4.6). */
export function sumaDePesosActivos(pesos: readonly { peso: number; apagado: boolean }[]): number {
  return pesos.reduce((total, p) => total + (p.apagado ? 0 : p.peso), 0)
}

/*
 * Cálculo (general §4.2, nucleo §10.3).
 */

/** El puntaje de un instrumento para un participante (nucleo §10.3). */
export type EstadoPuntaje =
  { estado: 'valor'; valor: number } | { estado: 'no_aplica' } | { estado: 'pendiente' }

/** Lo mínimo que el cálculo necesita de la estructura: ids y pesos. */
export interface EstructuraParaCalculo {
  componentes: {
    id: string
    peso: number
    aspectos: { id: string; peso: number; instrumentos: { id: string }[] }[]
  }[]
}

export interface InstrumentoCalculado {
  id: string
  /** Porcentaje de la calificación final, ya redistribuido; 0 si no aplica. */
  pesoEfectivo: number
  puntaje: EstadoPuntaje
}

export interface AspectoCalculado {
  id: string
  pesoEfectivo: number
  /** 0 a 100, o null si ningún instrumento del aspecto aplica. */
  valor: number | null
  instrumentos: InstrumentoCalculado[]
}

export interface ComponenteCalculado {
  id: string
  pesoEfectivo: number
  valor: number | null
  aspectos: AspectoCalculado[]
}

export interface CalificacionCalculada {
  /** 0 a 100, o null si nada aplica al participante. */
  valor: number | null
  /** Algún instrumento que aplica está pendiente y cuenta 0 (P-39). */
  provisional: boolean
  componentes: ComponenteCalculado[]
}

// Promedio ponderado entre los que aplican; null si ninguno aplica o si los
// que aplican pesan 0 (no hay a quién redistribuir).
function promedioPonderado(partes: { peso: number; valor: number | null }[]): {
  valor: number | null
  pesoAplicable: number
} {
  const aplicables = partes.filter((parte) => parte.valor !== null)
  const pesoAplicable = aplicables.reduce((total, parte) => total + parte.peso, 0)
  if (pesoAplicable === 0) return { valor: null, pesoAplicable: 0 }
  const suma = aplicables.reduce((total, parte) => total + parte.peso * (parte.valor as number), 0)
  return { valor: suma / pesoAplicable, pesoAplicable }
}

/** La calificación de un participante (general §4.2). Los instrumentos de un
 * aspecto valen lo mismo entre sí. Lo que no aplica reparte su peso entre
 * los del mismo nivel, en proporción a sus pesos; si nada de un nivel aplica,
 * el reparto sube al nivel de arriba. Un pendiente cuenta 0 y marca la
 * calificación como provisional (P-39). */
export function calcularCalificacion(
  estructura: EstructuraParaCalculo,
  puntajeDe: (idInstrumento: string) => EstadoPuntaje,
): CalificacionCalculada {
  // De abajo arriba: valor de cada aspecto y componente, null si no aplica.
  const componentes = estructura.componentes.map((componente) => {
    const aspectos = componente.aspectos.map((aspecto) => {
      const instrumentos = aspecto.instrumentos.map((instrumento) => ({
        id: instrumento.id,
        puntaje: puntajeDe(instrumento.id),
      }))
      const aplicables = instrumentos.filter((i) => i.puntaje.estado !== 'no_aplica')
      const valor =
        aplicables.length === 0
          ? null
          : aplicables.reduce(
              (total, i) => total + (i.puntaje.estado === 'valor' ? i.puntaje.valor : 0),
              0,
            ) / aplicables.length
      return {
        id: aspecto.id,
        peso: aspecto.peso,
        valor,
        instrumentos,
        aplicables: aplicables.length,
      }
    })
    const { valor, pesoAplicable } = promedioPonderado(aspectos)
    return { id: componente.id, peso: componente.peso, valor, aspectos, pesoAplicable }
  })

  const final = promedioPonderado(componentes)

  // De arriba abajo: el peso efectivo de cada parte, ya redistribuido.
  const calculados: ComponenteCalculado[] = componentes.map((componente) => {
    const pesoComponente =
      componente.valor === null ? 0 : (100 * componente.peso) / final.pesoAplicable
    return {
      id: componente.id,
      pesoEfectivo: pesoComponente,
      valor: componente.valor,
      aspectos: componente.aspectos.map((aspecto) => {
        const pesoAspecto =
          aspecto.valor === null || componente.pesoAplicable === 0
            ? 0
            : (pesoComponente * aspecto.peso) / componente.pesoAplicable
        return {
          id: aspecto.id,
          pesoEfectivo: pesoAspecto,
          valor: aspecto.valor,
          instrumentos: aspecto.instrumentos.map((instrumento) => ({
            id: instrumento.id,
            puntaje: instrumento.puntaje,
            pesoEfectivo:
              instrumento.puntaje.estado === 'no_aplica' ? 0 : pesoAspecto / aspecto.aplicables,
          })),
        }
      }),
    }
  })

  // Solo hace provisional un pendiente que de verdad pesa: uno de un aspecto
  // o componente con peso 0 no cambia el resultado.
  const provisional = calculados.some((componente) =>
    componente.aspectos.some((aspecto) =>
      aspecto.instrumentos.some(
        (instrumento) => instrumento.puntaje.estado === 'pendiente' && instrumento.pesoEfectivo > 0,
      ),
    ),
  )

  return { valor: final.valor, provisional, componentes: calculados }
}

/*
 * Contrato de la API de calificaciones (nucleo §10.5).
 */

/** Un instrumento en el desglose de un participante. */
export interface InstrumentoDelDesglose {
  id: string
  nombre: string
  origen: OrigenInstrumento
  clavePlantilla: ClavePlantilla | null
  fechaPlanificada: string | null
  puntaje: EstadoPuntaje
  /** Porcentaje de la calificación final, ya redistribuido. */
  pesoEfectivo: number
  /** Quien organiza captura su puntaje: no se puntúa solo (una actividad
   * externa, un elemento del proyecto o la bitácora). */
  capturable: boolean
}

export interface AspectoDelDesglose {
  id: string
  clave: string
  nombre: string
  pesoEfectivo: number
  valor: number | null
  instrumentos: InstrumentoDelDesglose[]
}

export interface ComponenteDelDesglose {
  id: string
  clave: string
  nombre: string
  pesoEfectivo: number
  valor: number | null
  aspectos: AspectoDelDesglose[]
}

/** La calificación de un participante con su desglose (nucleo §10.3). */
export interface DesgloseCalificacion {
  idMembresia: string
  nombre: string
  equipo: { id: string; nombre: string } | null
  valor: number | null
  provisional: boolean
  /** Lo calificado hasta ahora (P-18): el promedio de lo que ya tiene
   * puntaje, sin contar lo pendiente, y qué porcentaje de la calificación
   * cubre. Es lo que ve quien participa durante el desarrollo. */
  parcial: { valor: number | null; cubre: number }
  componentes: ComponenteDelDesglose[]
}

/** Una fila de la lista de calificaciones de quien organiza. */
export interface CalificacionDeParticipante {
  idMembresia: string
  nombre: string
  equipo: { id: string; nombre: string } | null
  valor: number | null
  provisional: boolean
  /** Lo que pesa y le toca calificar a quien organiza (proyecto, bitácora,
   * aprendizaje, actividades externas), por nombre. */
  porCalificar: string[]
  /** Lo que pesa y sigue pendiente de parte del participante: cuestionarios
   * por responder. */
  porResponder: number
}

/** El proyecto de un equipo para la captura por equipo (P-40). */
export interface ProyectoDeEquipo {
  idEquipo: string
  nombre: string
  integrantes: number
  elementos: {
    idInstrumento: string
    clave: string
    nombre: string
    /** El puntaje común, o nulo si nadie tiene o difieren. */
    valor: number | null
    /** Alguien del equipo tiene un puntaje distinto: un ajuste individual. */
    ajustado: boolean
  }[]
}

/** Un puntaje de 0 a 100 con a lo más dos decimales (general §4.4). */
export function esPuntajeValido(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= 100 &&
    // A lo más dos decimales, con tolerancia al redondeo del punto flotante
    // (66.67 * 100 no da exactamente 6667).
    Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6
  )
}
