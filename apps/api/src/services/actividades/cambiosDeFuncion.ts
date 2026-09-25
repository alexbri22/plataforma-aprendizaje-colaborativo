import type { Prisma } from '@prisma/client'
import {
  ELEMENTOS_ESPACIO_EQUIPO,
  parsearEstadoEspacioEquipo,
  type FuncionSeguimiento,
} from '@plataforma/shared'

// Regla de modificación de general §6.2 (P-17): "durante configuración,
// inscripción y formación de equipos, el estado de cualquier función puede
// cambiarse libremente. A partir del desarrollo, una función puede habilitarse
// pero no deshabilitarse ni cambiar de modo si ya existen datos asociados a
// ella". Aquí vive esa condición; la fase la decide la función de autorización
// (acción ajustar_funciones).

// Una función deshabilitada no tiene nada que perder al habilitarse.
function estaHabilitada(funcion: FuncionSeguimiento, estado: string): boolean {
  if (funcion === 'espacio_equipo') {
    const espacio = parsearEstadoEspacioEquipo(estado)
    // Un valor ilegible se trata como habilitado: es lo conservador.
    return espacio === null || ELEMENTOS_ESPACIO_EQUIPO.some((e) => espacio[e] !== 'deshabilitado')
  }
  return estado !== 'deshabilitada' && estado !== 'deshabilitado'
}

// espacio_equipo agrupa tres elementos: habilitar uno deshabilitado es
// libre aunque otro ya tenga contenido; tocar uno ya habilitado no.
function soloHabilitaElementos(anterior: string, nuevo: string): boolean {
  const antes = parsearEstadoEspacioEquipo(anterior)
  const despues = parsearEstadoEspacioEquipo(nuevo)
  if (!antes || !despues) return false
  return ELEMENTOS_ESPACIO_EQUIPO.every(
    (e) => antes[e] === despues[e] || antes[e] === 'deshabilitado',
  )
}

export type EvaluacionCambio = { permitido: true } | { permitido: false; motivo: string }

/** `motivoDatos` es null si la función no tiene datos en la actividad, o el
 * motivo, listo para mostrarse, si los tiene. */
export function evaluarCambioEnCurso(
  funcion: FuncionSeguimiento,
  anterior: string | null,
  nuevo: string,
  motivoDatos: string | null,
): EvaluacionCambio {
  if (anterior === nuevo) return { permitido: true }
  if (anterior === null || !estaHabilitada(funcion, anterior)) return { permitido: true }
  if (funcion === 'espacio_equipo' && soloHabilitaElementos(anterior, nuevo)) {
    return { permitido: true }
  }
  if (motivoDatos === null) return { permitido: true }
  return { permitido: false, motivo: motivoDatos }
}

type ComprobadorDeDatos = (
  tx: Prisma.TransactionClient,
  idActividad: string,
) => Promise<string | null>

const SIN_DATOS_POSIBLES: ComprobadorDeDatos = async () => null

// Un comprobador por función, dueño de saber si esa función ya tiene datos en
// la actividad. Están todas listadas a propósito (lo verifica una prueba): al
// implementar el módulo dueño de una función, su comprobador debe reemplazar
// al de aquí, que solo es correcto mientras ese módulo no exista. Cada módulo
// consulta lo suyo; ninguno lee tablas ajenas (general §3.4).
export const COMPROBADORES_DE_DATOS: Readonly<Record<FuncionSeguimiento, ComprobadorDeDatos>> = {
  // En desarrollo y cierre la formación ya se cerró: sus equipos son los datos
  // y cambiar su estado ya no significaría nada.
  formacion_equipos: async () =>
    'La formación de equipos ya se cerró: su configuración no puede cambiar.',
  // Pendiente del módulo de Insignias, cuyas tablas no se leen desde aquí.
  // Mientras tanto se asume que puede haber otorgamientos: solo puede
  // habilitarse. Su responsable debe sustituir este comprobador por una
  // consulta a su capa de servicios.
  insignias: async () =>
    'Esta función puede tener reconocimientos otorgados: solo puede habilitarse, no deshabilitarse ni cambiar de modo.',
  // Los módulos dueños de estas funciones aún no existen, así que todavía no
  // puede haber datos.
  bitacora_individual: SIN_DATOS_POSIBLES,
  calificacion: SIN_DATOS_POSIBLES,
  autoevaluacion_individual: SIN_DATOS_POSIBLES,
  autoevaluacion_grupal: SIN_DATOS_POSIBLES,
  evaluacion_pares: SIN_DATOS_POSIBLES,
  espacio_equipo: SIN_DATOS_POSIBLES,
}
