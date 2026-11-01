import type { Equipo } from '@plataforma/shared'
import {
  SECCIONES_ESPACIO_EQUIPO,
  TAREAS_PROCESO_COLABORATIVO,
  bitacoraPropiaHabilitada,
  estaHabilitada,
  type Actividad,
} from '../../features/actividades'

/** La pantalla de la actividad que se está viendo: decide qué ítem del
 * nivel queda marcado. */
export type SeccionActividad =
  | 'resumen'
  | 'planificar'
  | 'equipos'
  | 'participantes'
  | 'reconocer'
  | 'insignias'
  | 'metas'
  | 'avances'
  | 'recursos'
  | 'bitacora'
  | 'bitacoras'
  | 'bitacora-integrante'

/** Dónde está la persona: dentro de una actividad, o dentro de un equipo
 * (que cuelga de una actividad). */
export type ContextoNav =
  | { idActividad: string; seccion: SeccionActividad }
  | { idEquipo: string; seccion: SeccionActividad; idMembresia?: string }

export interface ItemNavActividad {
  clave: string
  etiqueta: string
  /** Sin destino: algo que existe en el mapa del sitio pero todavía no
   * tiene pantalla (los aspectos de Proceso colaborativo). */
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

export type EntradaNavActividad =
  ({ tipo: 'item' } & ItemNavActividad) | ({ tipo: 'grupo' } & GrupoNavActividad)

export interface NavActividad {
  /** El rol en la actividad: Organizo o Participo. */
  rama: 'organizo' | 'participo'
  nombreActividad: string
  /** El nivel de arriba, al que lleva la flecha de la barra lateral. */
  volver: { etiqueta: string; to: string }
  /** Encabezado: el nombre de la actividad. */
  titulo: string
  /** Bloques separados por una línea. El primero va sin título (es el de
   * la actividad, la del encabezado); los de equipo lo llevan ("Mi equipo:
   * Alfa"), para que se vea a qué pertenece cada ítem. */
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

const ETIQUETAS_SECCION_EQUIPO = {
  metas: 'Metas',
  avances: 'Avances',
  recursos: 'Materiales',
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

// Proceso colaborativo: cómo trabaja el equipo (los cinco elementos de
// Johnson y Johnson). Todavía sin pantallas (nucleo §9.1): se anuncia sin
// enlace, plegado, para que exista en el mapa del sitio sin prometer nada.
function grupoProceso(): EntradaNavActividad {
  return {
    tipo: 'grupo',
    clave: 'proceso',
    etiqueta: 'Proceso colaborativo',
    plegadoPorDefecto: true,
    // Las mismas cinco tareas, con el mismo nombre, que se planifican en
    // Planificar › Proceso colaborativo.
    items: TAREAS_PROCESO_COLABORATIVO.map(({ tarea, etiqueta }) => ({
      clave: tarea,
      etiqueta,
      activo: false,
    })),
  }
}

// La barra lateral dentro de una actividad muestra solo esa actividad, con
// una flecha a Organizo o Participo (decisión de producto, tras probar un
// árbol anidado que costaba leer). Arriba, lo de toda la actividad; debajo,
// cada equipo en su propio bloque con título ("Mi equipo: Alfa", "Equipo:
// Abejas"), nunca como un nivel más de sangría. Función pura para poder
// probarla sin renderizar.
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
  const nombreActividad = actividad.nombre

  if (organiza) {
    const entradas: EntradaNavActividad[] = [
      item('resumen', 'Resumen', `/actividades/${id}`, seccion === 'resumen'),
    ]
    if (actividad.capacidades?.some((c) => CAPACIDADES_PLANIFICAR.includes(c))) {
      entradas.push(
        item(
          'planificar',
          'Planificar',
          `/actividades/${id}/configuracion`,
          seccion === 'planificar',
        ),
      )
    }
    entradas.push(
      item('equipos', 'Equipos', `/actividades/${id}/equipos`, seccion === 'equipos'),
      item(
        'participantes',
        'Participantes',
        `/actividades/${id}/participantes`,
        seccion === 'participantes',
      ),
    )
    if (ritual?.abierto) {
      entradas.push(
        item('reconocer', 'Reconocer', `/actividades/${id}/reconocer`, seccion === 'reconocer'),
      )
    }
    const secciones: SeccionNavActividad[] = [{ clave: 'actividad', entradas }]

    // El equipo que se está revisando, en su propio bloque.
    if (idEquipoAbierto) {
      const entradasEquipo: EntradaNavActividad[] = [
        grupoProyecto(actividad, idEquipoAbierto, seccion),
        grupoProceso(),
      ]
      if (actividad.configuracion?.bitacora_individual === 'habilitada') {
        entradasEquipo.push(
          item(
            'bitacoras',
            'Bitácoras',
            `/equipos/${idEquipoAbierto}/bitacoras`,
            seccion === 'bitacoras' || seccion === 'bitacora-integrante',
          ),
        )
      }
      secciones.push({
        clave: 'equipo',
        titulo: equipo ? `Equipo: ${equipo.nombre}` : 'Equipo',
        entradas: entradasEquipo,
      })
    }

    return {
      rama: 'organizo',
      nombreActividad,
      volver: { etiqueta: 'Organizo', to: '/actividades/organizo' },
      titulo: nombreActividad,
      secciones,
    }
  }

  const rama = 'participo'
  const idMiEquipo = actividad.idMiEquipo ?? null
  const idOtroEquipo = idEquipoAbierto && idEquipoAbierto !== idMiEquipo ? idEquipoAbierto : null

  // Primero lo de toda la actividad (igual que para quien organiza), y
  // debajo, con su propio título, lo de su equipo.
  const secciones: SeccionNavActividad[] = [
    {
      clave: 'actividad',
      entradas: [
        item('resumen', 'Resumen', `/actividades/${id}/resumen`, seccion === 'resumen'),
        item('equipos', 'Equipos', `/actividades/${id}/equipos`, seccion === 'equipos'),
      ],
    },
  ]

  if (idMiEquipo) {
    const entradas: EntradaNavActividad[] = [
      grupoProyecto(actividad, idMiEquipo, seccion),
      grupoProceso(),
    ]
    if (bitacoraPropiaHabilitada(actividad)) {
      entradas.push(
        item('bitacora', 'Mi bitácora', `/equipos/${idMiEquipo}/bitacora`, seccion === 'bitacora'),
      )
    }
    if (ritual && (ritual.abierto || ritual.aplicados)) {
      const items: ItemNavActividad[] = []
      if (ritual.abierto) {
        items.push({
          clave: 'reconocer',
          etiqueta: 'Reconocer al equipo',
          to: `/actividades/${id}/reconocer`,
          activo: seccion === 'reconocer',
        })
      }
      items.push({
        clave: 'insignias',
        etiqueta: 'Mis reconocimientos',
        to: `/actividades/${id}/insignias`,
        activo: seccion === 'insignias',
      })
      entradas.push({ tipo: 'grupo', clave: 'reconocimientos', etiqueta: 'Reconocimientos', items })
    }
    secciones.push({
      clave: 'mi-equipo',
      titulo: miEquipo ? `Mi equipo: ${miEquipo.nombre}` : 'Mi equipo',
      entradas,
    })
  }

  // Mirando el espacio de otro equipo (desde Equipos): un bloque más, debajo
  // del propio.
  if (idOtroEquipo) {
    secciones.push({
      clave: 'otro-equipo',
      titulo: equipo ? `Equipo: ${equipo.nombre}` : 'Equipo',
      entradas: [grupoProyecto(actividad, idOtroEquipo, seccion), grupoProceso()],
    })
  }

  return {
    rama,
    nombreActividad,
    volver: { etiqueta: 'Participo', to: '/actividades/participo' },
    titulo: nombreActividad,
    secciones,
  }
}
