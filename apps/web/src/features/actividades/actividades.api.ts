import { ACTIVIDADES_PRUEBA, INVITACIONES_PRUEBA } from './actividades.fixtures'
import type { Actividad, InvitacionPendiente } from './tipos'

// Simulación en memoria mientras el módulo de Actividades no existe en el
// backend (docs/diseno-desarrollo-nucleo.md §11.2, incremento "Actividades I"
// en curso). La forma de estas funciones imita la del cliente HTTP real
// (docs/diseno-desarrollo-nucleo.md §7.7) para que sustituirlas por fetch
// no obligue a tocar los hooks ni las pantallas que las consumen.

let actividades: Actividad[] = [...ACTIVIDADES_PRUEBA]
let invitaciones: InvitacionPendiente[] = [...INVITACIONES_PRUEBA]
let contadorNuevas = 0

export async function obtenerActividades(): Promise<Actividad[]> {
  return actividades
}

export async function obtenerActividad(id: string): Promise<Actividad> {
  const actividad = actividades.find((item) => item.id === id)
  if (!actividad) throw new Error('No encontramos esta actividad.')
  return actividad
}

export async function obtenerInvitaciones(): Promise<InvitacionPendiente[]> {
  return invitaciones
}

// Campos de docs/diseno-desarrollo-general.md §5.1 (relación 'actividades').
// docs/diseno-desarrollo-nucleo.md §7.1 solo exige nombre y objetivo — el
// resto queda obligatorio aquí por decisión de producto en curso, pendiente
// de confirmarse en la reunión de equipo (a diferencia de esos campos, los
// aquí obligatorios sí son editables después mientras la actividad no salga
// de Configuración).
export interface DatosCrearActividad {
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: string
  fechaTermino: string
  fechaLimiteInscripcion: string
  plazoCierreDias: number
  numeroEquiposEsperado: number
  // Autopercepción de quien organiza sobre cuánta libertad piensa ceder.
  // No configura ninguna función de seguimiento ni existe en el diccionario
  // de datos: es un campo de telemetría, pendiente de confirmación de
  // alcance en la reunión de equipo. No debe interpretarse como el modo de
  // gestión de la actividad — esa idea se descartó explícitamente en
  // concepto-producto.md §1 a favor de configurar cada función por separado.
  tiposActividadPercibida?: string[]
}

// Alfabeto de docs/diseno-desarrollo-nucleo.md §7.2: mayúsculas y dígitos
// sin glifos confundibles al dictarse (sin 0, O, 1, I, L). Aquí es
// Math.random porque es un mock de cliente para ilustrar el flujo; la
// versión real la genera el servidor con un generador criptográficamente
// seguro y comprueba unicidad al insertar.
const ALFABETO_CLAVE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generarClave(): string {
  let clave = ''
  for (let i = 0; i < 8; i += 1) {
    clave += ALFABETO_CLAVE[Math.floor(Math.random() * ALFABETO_CLAVE.length)]
  }
  return clave
}

export async function crearActividad(datos: DatosCrearActividad): Promise<Actividad> {
  contadorNuevas += 1
  // Decisión de producto en curso: la clave se genera desde la creación en
  // vez de esperar a una acción explícita de "abrir inscripción" separada
  // (que es como lo describe docs/diseno-desarrollo-nucleo.md §7.1-7.2 y
  // §7.4 — la transición Configuración → Inscripción). La fase
  // 'configuracion' se conserva en tipos.ts porque documenta el ciclo de
  // vida real, aunque este mock ya no la produzca.
  const clave = generarClave()
  const nueva: Actividad = {
    id: `act-nueva-${contadorNuevas}`,
    nombre: datos.nombre,
    objetivo: datos.objetivo,
    informacionGeneral: datos.informacionGeneral,
    fechaInicio: datos.fechaInicio,
    fechaTermino: datos.fechaTermino,
    fechaLimiteInscripcion: datos.fechaLimiteInscripcion,
    plazoCierreDias: datos.plazoCierreDias,
    numeroEquiposEsperado: datos.numeroEquiposEsperado,
    fase: 'inscripcion',
    claveIngreso: clave,
    rol: 'organizador',
    numParticipantes: 0,
    fechaClave: `Clave: ${clave}`,
  }
  actividades = [...actividades, nueva]
  return nueva
}

export async function aceptarInvitacion(id: string): Promise<Actividad> {
  const invitacion = invitaciones.find((item) => item.id === id)
  if (!invitacion) throw new Error('La invitación ya no está disponible.')

  invitaciones = invitaciones.filter((item) => item.id !== id)
  const nueva: Actividad = {
    id: invitacion.id,
    nombre: invitacion.nombre,
    objetivo: invitacion.objetivo,
    fase: 'inscripcion',
    rol: 'participante',
    numParticipantes: 0,
    fechaClave: 'Te uniste recién',
  }
  actividades = [...actividades, nueva]
  return nueva
}

export async function rechazarInvitacion(id: string): Promise<void> {
  invitaciones = invitaciones.filter((item) => item.id !== id)
}

// Únicamente para pruebas: el estado vive a nivel de módulo (simula una
// base de datos), así que sin esto una prueba heredaría las mutaciones de
// la anterior.
export function _reiniciarDatosDePrueba(): void {
  actividades = [...ACTIVIDADES_PRUEBA]
  invitaciones = [...INVITACIONES_PRUEBA]
  contadorNuevas = 0
}
