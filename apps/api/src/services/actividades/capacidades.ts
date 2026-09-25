import type {
  EstadoActividad,
  EstadoMembresia,
  PermisoCoorganizador,
  RolMembresia,
} from '@prisma/client'
import {
  ACCIONES_ACTIVIDAD,
  type AccionActividad,
  type EstadoFormacionEquipos,
} from '@plataforma/shared'

// La función de autorización única del módulo (docs/diseno-desarrollo-nucleo.md
// §2.2): "toda la matriz de permisos se resuelve en una sola función". Las
// dos tablas que consulta (fase por acción, rol/permiso por acción) son
// datos y no condicionales encadenados, por lo mismo que ahí se explica: una
// tabla se recorre en una prueba, una cadena de condicionales se reconstruye
// a mano.
//
// Alcance: las acciones del catálogo (@plataforma/shared, ACCIONES_ACTIVIDAD),
// que hoy cubren Actividades y Equipos. Cuando Seguimiento y Evaluación
// tengan sus propias acciones, se agregan aquí sin tocar las existentes.
//
// Los permisos salen de tres cosas y de nada más: el rol (o los permisos
// del co-organizador), la fase y el estado de la función que gobierna la
// acción. Nunca de "qué tipo de actividad es": no existe tal cosa.

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
  // Estado de la función `formacion_equipos`. Solo lo consultan las acciones
  // de ESTADOS_FORMACION_POR_ACCION; si una de ellas llega sin él se rechaza.
  formacionEquipos?: EstadoFormacionEquipos
}

// 'fase' y 'funcion' son ambas condiciones temporales (409 en la API, nucleo
// §3.3); se distinguen para que el mensaje diga qué falta.
export type MotivoRechazo = 'fase' | 'funcion' | 'rol'

export type ResultadoAutorizacion =
  { concedido: true } | { concedido: false; motivo: MotivoRechazo }

// Permiso de co-organizador que sustituye al rol para cada acción
// (docs/diseno-desarrollo-general.md §7.3). `null`: cualquier co-organizador
// activo la tiene, sin permiso concreto (elegir equipo es sobre uno mismo).
const PERMISO_REQUERIDO_POR_ACCION: Readonly<Record<AccionActividad, PermisoCoorganizador | null>> =
  {
    configurar_funciones: 'configurar_actividad',
    ajustar_funciones: 'configurar_actividad',
    ajustar_periodos: 'configurar_actividad',
    cerrar_inscripcion: 'gestionar_inscripcion',
    agregar_coorganizador: 'gestionar_coorganizadores',
    formar_equipos: 'gestionar_equipos',
    asignar_integrantes: 'gestionar_equipos',
    cerrar_formacion: 'gestionar_equipos',
    generar_propuesta_equipos: 'gestionar_equipos',
    elegir_equipo: null,
    editar_equipo: 'gestionar_equipos',
  }

// Acciones abiertas además a los participantes, sobre sí mismos (elegir
// equipo) o sobre su propio equipo (editarlo). Quien organiza o co-organiza
// las tiene por su rol o permiso, como cualquier otra. autorizar() solo
// decide que la acción está abierta al rol; que un participante actúe solo
// sobre sí o sobre su equipo depende de datos y lo verifica el servicio
// (nucleo §2.1).
const ACCIONES_DE_AUTOSERVICIO: readonly AccionActividad[] = ['elegir_equipo', 'editar_equipo']

// Estados de `formacion_equipos` en los que cada acción está abierta.
// Sin entrada: en cualquiera. Elegir equipo es cosa de los participantes
// solo cuando el organizador dejó la formación autogestionada; la propuesta
// del sistema es una ayuda de la asignación por quien organiza, así que solo
// existe en `manual`.
const ESTADOS_FORMACION_POR_ACCION: Readonly<
  Partial<Record<AccionActividad, readonly EstadoFormacionEquipos[]>>
> = {
  elegir_equipo: ['autogestionado'],
  generar_propuesta_equipos: ['manual'],
}

// Tabla acción por fase (docs/diseno-desarrollo-nucleo.md §7.4 y general
// §6.2). configurar_funciones es el cambio libre de las tres fases previas al
// desarrollo; ajustar_funciones cubre desarrollo y cierre, donde una función
// puede habilitarse pero no deshabilitarse ni cambiar de modo si ya tiene datos
// (P-17). Esa condición depende de datos de otros módulos y la verifica el
// servicio (services/actividades/cambiosDeFuncion.ts). Son dos acciones y no
// una porque regenerar el calendario de avances descarta los ajustes
// individuales y solo procede antes del desarrollo (nucleo §9.2), y usa
// configurar_funciones. agregar_coorganizador se permite en toda fase salvo
// archivada, que es de solo lectura para todos sin excepción (general §7.4).
//
// ajustar_periodos (mover las fechas de un periodo de avances o cancelarlo)
// llega hasta desarrollo, a diferencia de configurar_funciones: el motivo de
// editar periodos uno a uno es justo absorber lo que pasa durante la
// actividad (un periodo que cae en vacaciones, una entrega que se cancela;
// nucleo §9.2).
const FASES_POR_ACCION: Readonly<Record<AccionActividad, readonly EstadoActividad[]>> = {
  configurar_funciones: ['configuracion', 'inscripcion', 'formacion_equipos'],
  ajustar_funciones: ['desarrollo', 'cierre'],
  ajustar_periodos: ['configuracion', 'inscripcion', 'formacion_equipos', 'desarrollo'],
  cerrar_inscripcion: ['inscripcion'],
  agregar_coorganizador: [
    'configuracion',
    'inscripcion',
    'formacion_equipos',
    'desarrollo',
    'cierre',
  ],
  // Equipos (nucleo §7.4 y §8; general §6.1: en cierre se prohíben los
  // cambios de composición). Crear, eliminar y proponer equipos es cosa de la
  // formación; reasignar llega hasta desarrollo (§8.4); editar el nombre y
  // la descripción llega hasta cierre (§8.5: hasta que se archive).
  formar_equipos: ['formacion_equipos'],
  asignar_integrantes: ['formacion_equipos', 'desarrollo'],
  cerrar_formacion: ['formacion_equipos'],
  elegir_equipo: ['formacion_equipos'],
  editar_equipo: ['formacion_equipos', 'desarrollo', 'cierre'],
  generar_propuesta_equipos: ['formacion_equipos'],
}

// Orden de evaluación de nucleo §2.2: de lo más general y barato a lo más
// específico: archivada, membresía, fase, estado de la función, rol. Un
// participante solo puede las acciones de autoservicio.
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

  const estadosFormacion = ESTADOS_FORMACION_POR_ACCION[accion]
  if (
    estadosFormacion &&
    (!actividad.formacionEquipos || !estadosFormacion.includes(actividad.formacionEquipos))
  ) {
    return { concedido: false, motivo: 'funcion' }
  }

  if (actor.rol === 'organizador') return { concedido: true }

  if (actor.rol === 'co_organizador') {
    const permisoRequerido = PERMISO_REQUERIDO_POR_ACCION[accion]
    if (permisoRequerido === null || actor.permisos.has(permisoRequerido)) {
      return { concedido: true }
    }
    return { concedido: false, motivo: 'rol' }
  }

  if (ACCIONES_DE_AUTOSERVICIO.includes(accion)) return { concedido: true }
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
