import { bitacoraHabilitada } from '@plataforma/shared'
import type { Equipo } from '@plataforma/shared'
import {
  SECCIONES_ESPACIO_EQUIPO,
  TAREAS_PROCESO_COLABORATIVO,
  bitacoraPropiaHabilitada,
  estaHabilitada,
  formatearFecha,
  type Actividad,
  type FaseActividad,
} from '../../features/actividades'

/** La pantalla de la actividad que se está viendo: decide qué ítem del
 * nivel queda marcado. */
export type SeccionActividad =
  | 'resumen'
  | 'planificar'
  | 'inscripcion'
  | 'cierre'
  | 'conformacion'
  | 'operacion'
  | 'equipos'
  | 'participantes'
  | 'proceso'
  | 'calificaciones'
  | 'evaluacion'
  | 'publicacion'
  | 'resultados'
  | 'reconocer'
  | 'insignias'
  | 'metas'
  | 'planeacion'
  | 'avances'
  | 'recursos'
  | 'producto'
  | 'bitacora'
  | 'bitacoras'
  | 'bitacora-integrante'

/** Dónde está la persona: dentro de una actividad, o dentro de un equipo
 * (que cuelga de una actividad). */
export type ContextoNav =
  | { idActividad: string; seccion: SeccionActividad }
  | { idEquipo: string; seccion: SeccionActividad; idMembresia?: string; aspecto?: string }

export interface ItemNavActividad {
  clave: string
  etiqueta: string
  /** Sin destino: algo que existe en el mapa del sitio pero todavía no
   * tiene pantalla, o que se habilita en una etapa posterior. */
  to?: string
  activo: boolean
}

export interface GrupoNavActividad {
  clave: string
  etiqueta: string
  items: ItemNavActividad[]
  /** Arranca plegado la primera vez (si no contiene la pantalla actual). */
  plegadoPorDefecto?: boolean
}

export type EstadoEtapa = 'actual' | 'hecha' | 'proxima'

export interface EtapaNavActividad {
  clave: Etapa
  etiqueta: string
  estado: EstadoEtapa
  entradas: EntradaNavActividad[]
}

/** Un título sin enlace con sus entradas debajo ("Mi equipo: Alfa"). */
export interface BloqueNavActividad {
  clave: string
  etiqueta: string
  entradas: EntradaNavActividad[]
}

export type EntradaNavActividad =
  | ({ tipo: 'item' } & ItemNavActividad)
  | ({ tipo: 'grupo' } & GrupoNavActividad)
  | ({ tipo: 'etapa' } & EtapaNavActividad)
  | ({ tipo: 'bloque' } & BloqueNavActividad)

export interface NavActividad {
  /** El rol en la actividad: Organizo o Participo. */
  rama: 'organizo' | 'participo'
  nombreActividad: string
  /** La única flecha dentro de una actividad, en la barra lateral: siempre
   * al nivel de arriba, no a la pantalla anterior. La actividad sube a
   * Organizo o Participo; un equipo que se revisa, a Equipos. */
  volver: { etiqueta: string; to: string }
  /** Encabezado: el nombre de la actividad (o del equipo, en el nivel 3). */
  titulo: string
  /** Debajo del título: quién organiza, la fecha de cierre y, en el nivel
   * 3, la actividad. */
  subtitulos: string[]
  secciones: SeccionNavActividad[]
}

export interface SeccionNavActividad {
  clave: string
  titulo?: string
  entradas: EntradaNavActividad[]
}

interface Datos {
  actividad: Actividad
  /** El equipo que se está viendo, si se está dentro de uno. */
  equipo?: Equipo
  /** El equipo propio de quien participa (puede ser el mismo que `equipo`). */
  miEquipo?: Equipo
  ritual?: { abierto: boolean; aplicados: boolean }
  contexto: ContextoNav
}

export type Etapa = 'creacion' | 'desarrollo' | 'cierre'

const ETAPAS: Etapa[] = ['creacion', 'desarrollo', 'cierre']

const ETIQUETAS_ETAPA: Record<Etapa, string> = {
  creacion: 'Creación',
  desarrollo: 'Desarrollo',
  cierre: 'Cierre',
}

// Archivada no es una etapa más: con ella las tres quedan hechas.
const ETAPA_POR_FASE: Record<FaseActividad, Etapa | null> = {
  configuracion: 'creacion',
  inscripcion: 'creacion',
  formacion_equipos: 'creacion',
  desarrollo: 'desarrollo',
  cierre: 'cierre',
  archivada: null,
}

/** La etapa en curso, o null si la actividad ya se archivó. */
export function etapaDeActividad(actividad: Actividad): Etapa | null {
  return ETAPA_POR_FASE[actividad.fase]
}

const ETIQUETAS_SECCION_EQUIPO = {
  metas: 'Metas',
  planeacion: 'Planeación',
  avances: 'Avances',
  recursos: 'Materiales',
  producto: 'Producto',
} as const

const CAPACIDADES_PLANIFICAR = ['configurar_funciones', 'ajustar_funciones', 'ajustar_periodos']

function item(
  clave: string,
  etiqueta: string,
  to: string | undefined,
  activo: boolean,
): EntradaNavActividad {
  return { tipo: 'item', clave, etiqueta, to, activo }
}

// Una etapa próxima se puede abrir para ver qué tendrá, pero nada lleva a
// ningún lado todavía.
function sinEnlaces(entradas: EntradaNavActividad[]): EntradaNavActividad[] {
  return entradas.map((entrada) => {
    if (entrada.tipo === 'item') return { ...entrada, to: undefined }
    if (entrada.tipo === 'grupo') {
      return { ...entrada, items: entrada.items.map((i) => ({ ...i, to: undefined })) }
    }
    return { ...entrada, entradas: sinEnlaces(entrada.entradas) }
  })
}

function etapas(
  actual: Etapa | null,
  entradasPorEtapa: Record<Etapa, EntradaNavActividad[]>,
): EntradaNavActividad[] {
  const indiceActual = actual ? ETAPAS.indexOf(actual) : ETAPAS.length
  return ETAPAS.map((etapa, indice) => {
    const estado: EstadoEtapa =
      indice < indiceActual ? 'hecha' : indice === indiceActual ? 'actual' : 'proxima'
    const entradas = entradasPorEtapa[etapa]
    return {
      tipo: 'etapa',
      clave: etapa,
      etiqueta: ETIQUETAS_ETAPA[etapa],
      estado,
      entradas: estado === 'proxima' ? sinEnlaces(entradas) : entradas,
    }
  })
}

// Proyecto colaborativo: lo que el equipo produce (metas, avances,
// materiales). Una sección deshabilitada no existe en la interfaz (nucleo
// §4.3); la actual, si se llegó por URL directa, sigue visible para que la
// pantalla explique por qué no hay nada.
function grupoProyecto(
  actividad: Actividad,
  idEquipo: string,
  seccion: SeccionActividad,
): EntradaNavActividad {
  return {
    tipo: 'grupo',
    clave: 'proyecto',
    etiqueta: 'Proyecto colaborativo',
    items: SECCIONES_ESPACIO_EQUIPO.filter(
      (s) => s === seccion || estaHabilitada(actividad, s),
    ).map((s) => ({
      clave: s,
      etiqueta: ETIQUETAS_SECCION_EQUIPO[s],
      to: `/equipos/${idEquipo}/${s}`,
      activo: s === seccion,
    })),
  }
}

// Proceso colaborativo: cómo trabaja el equipo. Cada aspecto lleva a sus
// instrumentos (nucleo §10.6): quien participa los responde o entrega ahí, y
// quien organiza ve, dentro del equipo, quién los completó.
function grupoProceso(idEquipo: string, aspectoActivo: string | null): EntradaNavActividad {
  return {
    tipo: 'grupo',
    clave: 'proceso',
    etiqueta: 'Proceso colaborativo',
    plegadoPorDefecto: aspectoActivo === null,
    // Las mismas cinco tareas, con el mismo nombre, que se planifican en
    // Planificar › Proceso colaborativo.
    items: TAREAS_PROCESO_COLABORATIVO.map(({ tarea, etiqueta }) => ({
      clave: tarea,
      etiqueta,
      to: `/equipos/${idEquipo}/proceso/${tarea}`,
      activo: tarea === aspectoActivo,
    })),
  }
}

function fechaDeCierre(actividad: Actividad): string | null {
  if (!actividad.fechaTermino) return null
  const verbo = actividad.fase === 'cierre' || actividad.fase === 'archivada' ? 'Cerró' : 'Cierra'
  return `${verbo} el ${formatearFecha(actividad.fechaTermino)}`
}

// La barra lateral muestra un solo nivel a la vez (arquitectura de
// información acordada con producto). Nivel 2, dentro de una actividad: las
// tres etapas como grupos, la actual abierta. Nivel 3, solo para quien
// organiza: un equipo, al que se entra desde Equipos. Quien participa ve su
// equipo dentro del nivel 2. Función pura para poder probarla sin renderizar.
export function construirNavActividad({
  actividad,
  equipo,
  miEquipo,
  ritual,
  contexto,
}: Datos): NavActividad {
  const { seccion } = contexto
  const id = actividad.id
  const organiza = actividad.rol !== 'participante'
  const idEquipoAbierto = 'idEquipo' in contexto ? contexto.idEquipo : null
  const aspectoAbierto =
    'idEquipo' in contexto && contexto.seccion === 'proceso' ? (contexto.aspecto ?? null) : null
  const nombreActividad = actividad.nombre
  const actual = etapaDeActividad(actividad)
  const cierre = fechaDeCierre(actividad)
  const equipos = `/actividades/${id}/equipos`
  const conformacion = `/actividades/${id}/conformacion`
  const operacion = `/actividades/${id}/operacion`
  const datos = `/actividades/${id}/resumen`
  // Planificar y Conformación de equipos (Creación) siguen abiertas toda la
  // actividad: ahí se ajusta la configuración y se reasignan integrantes
  // después de empezar. Equipos (Desarrollo) es otra pantalla: para entrar
  // a revisar el espacio de cada equipo. Operación de la planeación es el
  // día a día de lo planificado: qué vence y qué sigue.
  const enCreacion = actual === 'creacion'
  const calificacionHabilitada = actividad.configuracion?.calificacion === 'habilitada'

  if (organiza && idEquipoAbierto) {
    const entradas: EntradaNavActividad[] = [
      grupoProyecto(actividad, idEquipoAbierto, seccion),
      grupoProceso(idEquipoAbierto, aspectoAbierto),
    ]
    if (bitacoraHabilitada(actividad.configuracion?.bitacora_individual)) {
      entradas.push(
        item(
          'bitacoras',
          'Bitácoras',
          `/equipos/${idEquipoAbierto}/bitacoras`,
          seccion === 'bitacoras' || seccion === 'bitacora-integrante',
        ),
      )
    }
    return {
      rama: 'organizo',
      nombreActividad,
      volver: { etiqueta: 'Equipos', to: equipos },
      titulo: equipo?.nombre ?? 'Equipo',
      subtitulos: [nombreActividad, ...(cierre ? [cierre] : [])],
      secciones: [{ clave: 'equipo', entradas }],
    }
  }

  if (organiza) {
    const puedePlanificar = actividad.capacidades?.some((c) => CAPACIDADES_PLANIFICAR.includes(c))
    return {
      rama: 'organizo',
      nombreActividad,
      volver: { etiqueta: 'Organizo', to: '/actividades/organizo' },
      titulo: nombreActividad,
      subtitulos: cierre ? [cierre] : [],
      secciones: [
        {
          clave: 'etapas',
          entradas: etapas(actual, {
            creacion: [
              item('datos', 'Datos de la actividad', datos, seccion === 'resumen'),
              ...(puedePlanificar
                ? [
                    item(
                      'planificar',
                      'Planificar',
                      `/actividades/${id}/configuracion`,
                      seccion === 'planificar',
                    ),
                  ]
                : []),
              item(
                'inscripcion',
                'Inscripción',
                `/actividades/${id}/inscripcion`,
                seccion === 'inscripcion',
              ),
              item(
                'conformacion',
                'Conformación de equipos',
                conformacion,
                seccion === 'conformacion',
              ),
            ],
            desarrollo: [
              item('operacion', 'Operación de la planeación', operacion, seccion === 'operacion'),
              item('equipos', 'Equipos', equipos, seccion === 'equipos'),
              // La retroalimentación de quien organiza sobre cómo trabaja
              // cada equipo; no las calificaciones, que son del cierre.
              item(
                'evaluacion',
                'Evaluación y retroalimentación',
                `/actividades/${id}/evaluacion`,
                seccion === 'evaluacion',
              ),
            ],
            cierre: [
              item(
                'confirmar-cierre',
                'Confirmar cierre de actividad',
                `/actividades/${id}/cierre`,
                seccion === 'cierre',
              ),
              item(
                'reconocer',
                'Otorgar reconocimientos',
                ritual?.abierto ? `/actividades/${id}/reconocer` : undefined,
                seccion === 'reconocer',
              ),
              // Solo en el cierre. Durante el desarrollo, quien organiza captura
              // los puntajes donde ve el trabajo (cada sección del equipo, cada
              // aspecto del proceso, cada bitácora), sin ver el acumulado.
              item(
                'calificaciones',
                'Calificaciones',
                calificacionHabilitada ? `/actividades/${id}/calificaciones` : undefined,
                seccion === 'calificaciones',
              ),
              item(
                'publicacion',
                'Publicación de proyectos',
                `/actividades/${id}/publicacion`,
                seccion === 'publicacion',
              ),
            ],
          }),
        },
      ],
    }
  }

  const idMiEquipo = actividad.idMiEquipo ?? null
  // Mirar el espacio de otro equipo no marca nada del propio: cuenta como
  // estar en Equipos, de donde se llega.
  const mirandoOtroEquipo = idEquipoAbierto !== null && idEquipoAbierto !== idMiEquipo
  const seccionPropia = mirandoOtroEquipo ? 'equipos' : seccion
  const desarrollo: EntradaNavActividad[] = []
  if (idMiEquipo) {
    const entradasEquipo: EntradaNavActividad[] = [
      grupoProyecto(actividad, idMiEquipo, mirandoOtroEquipo ? 'resumen' : seccion),
      grupoProceso(idMiEquipo, mirandoOtroEquipo ? null : aspectoAbierto),
    ]
    if (bitacoraPropiaHabilitada(actividad)) {
      entradasEquipo.push(
        item(
          'bitacora',
          'Mi bitácora',
          `/equipos/${idMiEquipo}/bitacora`,
          seccionPropia === 'bitacora',
        ),
      )
    }
    desarrollo.push({
      tipo: 'bloque',
      clave: 'mi-equipo',
      etiqueta: miEquipo ? `Mi equipo: ${miEquipo.nombre}` : 'Mi equipo',
      entradas: entradasEquipo,
    })
  }
  const autogestionada = actividad.configuracion?.formacion_equipos !== 'manual'
  desarrollo.push(
    item('operacion', 'Operación de la planeación', operacion, seccion === 'operacion'),
    item('equipos', 'Equipos', equipos, seccionPropia === 'equipos'),
    // La retroalimentación que ha recibido su equipo; su calificación se
    // ve en el cierre.
    item(
      'evaluacion',
      'Evaluación y retroalimentación',
      `/actividades/${id}/evaluacion`,
      seccion === 'evaluacion',
    ),
  )

  return {
    rama: 'participo',
    nombreActividad,
    volver: { etiqueta: 'Participo', to: '/actividades/participo' },
    titulo: nombreActividad,
    subtitulos: [
      ...(actividad.nombreOrganizador ? [`Organiza ${actividad.nombreOrganizador}`] : []),
      ...(cierre ? [cierre] : []),
    ],
    secciones: [
      {
        clave: 'etapas',
        entradas: etapas(actual, {
          creacion: [
            item('datos', 'Datos de la actividad', datos, seccion === 'resumen'),
            ...(autogestionada
              ? [
                  // Quien participa solo elige equipo durante la formación;
                  // después no le queda nada que hacer aquí.
                  item(
                    'conformacion',
                    'Conformación de equipos',
                    enCreacion ? conformacion : undefined,
                    seccion === 'conformacion' && enCreacion,
                  ),
                ]
              : []),
          ],
          desarrollo,
          cierre: [
            // Con la misma condición del ritual que antes: solo mientras está
            // abierto.
            ...(ritual?.abierto
              ? [
                  item(
                    'reconocer',
                    'Otorgar reconocimientos',
                    `/actividades/${id}/reconocer`,
                    seccion === 'reconocer',
                  ),
                ]
              : []),
            item(
              'calificaciones',
              'Calificaciones',
              calificacionHabilitada ? `/actividades/${id}/resultados` : undefined,
              seccion === 'resultados',
            ),
            item(
              'publicacion',
              'Publicación de proyectos',
              `/actividades/${id}/publicacion`,
              seccion === 'publicacion',
            ),
          ],
        }),
      },
    ],
  }
}
