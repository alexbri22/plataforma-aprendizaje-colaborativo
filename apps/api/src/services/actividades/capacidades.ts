import type {
  EstadoActividad,
  EstadoMembresia,
  PermisoCoorganizador,
  RolMembresia,
} from '@prisma/client'
import { ACCIONES_ACTIVIDAD, type AccionActividad } from '@plataforma/shared'

// La función de autorización única del módulo (docs/diseno-desarrollo-nucleo.md
// §2.2): "toda la matriz de permisos se resuelve en una sola función". Las
// dos tablas que consulta (fase por acción, rol/permiso por acción) son
// datos y no condicionales encadenados, por lo mismo que ahí se explica: una
// tabla se recorre en una prueba, una cadena de condicionales se reconstruye
// a mano.
//
// Alcance de este incremento: solo existen las tres acciones del catálogo
// (@plataforma/shared, ACCIONES_ACTIVIDAD). Cuando Equipos, Seguimiento y
// Evaluación tengan sus propias acciones, se agregan aquí sin tocar las
// existentes.

export interface ContextoActorActividad {
  rol: RolMembresia
  estadoMembresia: EstadoMembresia
  // Solo relevante cuando rol es 'co_organizador'; vacío en cualquier otro
  // caso (docs/diseno-desarrollo-general.md §4.6: "Solo las membresías con
  // rol de co-organizador tienen filas" de permisos).
  permisos: ReadonlySet<PermisoCoorganizador>
}

export interface ActividadParaAutorizacion {
  estado: EstadoActividad
}

export type MotivoRechazo = 'fase' | 'rol'

export type ResultadoAutorizacion =
  { concedido: true } | { concedido: false; motivo: MotivoRechazo }

// Permiso de co-organizador que sustituye al rol para cada acción. Una
// acción sin entrada aquí no es ejecutable por co-organizador bajo ningún
// permiso (no ocurre hoy: las tres acciones del catálogo tienen permiso
// equivalente, docs/diseno-desarrollo-general.md §7.3).
const PERMISO_REQUERIDO_POR_ACCION: Readonly<Record<AccionActividad, PermisoCoorganizador>> = {
  configurar_funciones: 'configurar_actividad',
  cerrar_inscripcion: 'gestionar_inscripcion',
  agregar_coorganizador: 'gestionar_coorganizadores',
}

// Tabla acción por fase (docs/diseno-desarrollo-nucleo.md §7.4 y general
// §6.2). configurar_funciones se limita a las tres fases donde general §6.2
// permite cambiar libremente el estado de cualquier función; el matiz de
// "habilitar sin deshabilitar si ya hay datos" a partir de desarrollo (P-17)
// no se implementa todavía porque ninguna actividad de este incremento
// alcanza esa fase (Formación → Desarrollo depende de Equipos, fuera de
// alcance). agregar_coorganizador se permite en toda fase salvo archivada,
// que es de solo lectura para todos sin excepción (general §7.4).
const FASES_POR_ACCION: Readonly<Record<AccionActividad, readonly EstadoActividad[]>> = {
  configurar_funciones: ['configuracion', 'inscripcion', 'formacion_equipos'],
  cerrar_inscripcion: ['inscripcion'],
  agregar_coorganizador: [
    'configuracion',
    'inscripcion',
    'formacion_equipos',
    'desarrollo',
    'cierre',
  ],
}

// Orden de evaluación de nucleo §2.2: de lo más general y barato a lo más
// específico. Ninguna de las tres acciones de este catálogo la permite un
// participante (docs/diseno-desarrollo-general.md §7.3, columna
// Participante: "—" en las tres filas relevantes).
export function autorizar(
  actor: ContextoActorActividad,
  accion: AccionActividad,
  actividad: ActividadParaAutorizacion,
): ResultadoAutorizacion {
  if (actividad.estado === 'archivada') return { concedido: false, motivo: 'fase' }
  if (actor.estadoMembresia === 'desactivada') return { concedido: false, motivo: 'rol' }
  if (!FASES_POR_ACCION[accion].includes(actividad.estado)) {
    return { concedido: false, motivo: 'fase' }
  }

  if (actor.rol === 'organizador') return { concedido: true }

  if (actor.rol === 'co_organizador') {
    const permisoRequerido = PERMISO_REQUERIDO_POR_ACCION[accion]
    if (actor.permisos.has(permisoRequerido)) return { concedido: true }
    return { concedido: false, motivo: 'rol' }
  }

  return { concedido: false, motivo: 'rol' }
}

// Conjunto de acciones que el actor puede ejecutar ahora mismo, calculado
// por el servidor y expuesto en GET /api/actividades/{id}
// (docs/diseno-desarrollo-nucleo.md §4.3): el cliente solo consulta este
// conjunto, nunca vuelve a evaluar rol ni fase por su cuenta.
export function capacidadesDe(
  actor: ContextoActorActividad,
  actividad: ActividadParaAutorizacion,
): AccionActividad[] {
  return ACCIONES_ACTIVIDAD.filter(
    (accion) => autorizar(actor, accion, actividad).concedido === true,
  )
}
