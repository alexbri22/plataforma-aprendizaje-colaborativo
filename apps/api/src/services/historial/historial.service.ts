import type { CategoriaEvento, Prisma, RolMembresia, TipoActorHistorial } from '@prisma/client'
import type { PaginaHistorial } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'

// Emisión mínima y provisional (decisión de alcance de este incremento): no
// es todavía la envoltura transaccional de emisión garantizada de
// docs/diseno-desarrollo-nucleo.md §2.4 (que comprueba que todo servicio de
// escritura registre al menos un evento y aborta si no). Esa envoltura, el
// modelo de consulta con filtros y la agregación de ediciones consecutivas
// quedan para el incremento de "Desbloqueo" (nucleo §11.2). Lo que sí se
// respeta ya: el evento se escribe dentro de la misma transacción que el
// cambio que describe (nucleo §2.4, primera propiedad del mecanismo
// completo), porque quien llama pasa el cliente de transacción y no el
// cliente global.
export interface DatosEvento {
  idActividad: string
  tipoActor: TipoActorHistorial
  // Nulo cuando tipoActor es 'sistema' (docs/diseno-desarrollo-general.md
  // §4.4: "id_usuario_actor... anulable").
  idUsuarioActor: string | null
  tipoEvento: string
  tipoEntidad: string
  idEntidad: string
  // Debe bastar para entender el evento sin consultar la entidad afectada
  // (nucleo §5.1): nombre del equipo, valor anterior/nuevo, fase de
  // origen/destino, etc., según el tipo de operación.
  datos: Prisma.InputJsonValue
  categoria: CategoriaEvento
}

export async function registrarEvento(
  tx: Prisma.TransactionClient,
  evento: DatosEvento,
): Promise<void> {
  await tx.historial.create({ data: evento })
}

// Estructura (P-10) no es un bloque homogéneo: una parte es de la actividad
// completa (quien organiza la configura, afecta a todos por igual) y otra es
// de un equipo en particular. Clasificación por tipoEvento, no por quién lo
// dispara (reparto_automatico y propuesta_generada también son acción de
// quien organiza, pero listan la composición de TODOS los equipos a la vez
// en un solo evento — ninguna de las dos listas de abajo las incluye a
// propósito, así que un participante nunca las ve).
const EVENTOS_ESTRUCTURA_DE_ACTIVIDAD: readonly string[] = [
  'actividad_creada',
  'fase_avanzada',
  'configuracion_modificada',
  'co_organizador_modificado',
  'periodos_definidos',
  'periodo_modificado',
]

// Visibles solo para quien integra alguno de los equipos que el evento toca
// (datos.equipos, escrito por quien emite cada uno — ver equipos.service.ts).
// integrante_asignado e integrantes_intercambiados tocan dos equipos cuando
// hay movimiento entre ambos: lo ve quien integra cualquiera de los dos, no
// solo el de destino.
const EVENTOS_ESTRUCTURA_DE_EQUIPO: readonly string[] = [
  'equipo_creado',
  'equipo_modificado',
  'equipo_eliminado',
  'integrante_asignado',
  'integrante_retirado',
  'integrantes_intercambiados',
]

// reparto_automatico y propuesta_generada listan la composición de TODOS
// los equipos a la vez en un solo evento: gestión de equipos de quien
// organiza, no la estructura de un equipo en particular (por eso no están
// en EVENTOS_ESTRUCTURA_DE_EQUIPO) ni tampoco de la actividad en el sentido
// de configuración/fase. Cuentan como "generales" solo para quien organiza
// o co-organiza — un participante nunca los ve, pida el equipo que pida.
const EVENTOS_DE_FORMACION_DE_EQUIPOS: readonly string[] = [
  'reparto_automatico',
  'propuesta_generada',
]

function tiposGenerales(rolActor: RolMembresia): string[] {
  return rolActor === 'participante'
    ? [...EVENTOS_ESTRUCTURA_DE_ACTIVIDAD]
    : [...EVENTOS_ESTRUCTURA_DE_ACTIVIDAD, ...EVENTOS_DE_FORMACION_DE_EQUIPOS]
}

// Tope del lado del servidor, no una sugerencia del cliente: nucleo §3.1
// ("el historial se pagina por cursor, porque es la única relación que
// crece sin cota"). limite en la query (GET /historial) puede pedir menos,
// nunca más.
const LIMITE_HISTORIAL_POR_DEFECTO = 30
const LIMITE_HISTORIAL_MAXIMO = 100

export function limiteHistorialValido(limiteSolicitado: number | undefined): number {
  if (!limiteSolicitado || !Number.isInteger(limiteSolicitado) || limiteSolicitado < 1) {
    return LIMITE_HISTORIAL_POR_DEFECTO
  }
  return Math.min(limiteSolicitado, LIMITE_HISTORIAL_MAXIMO)
}

// Eventos de evaluación cuyo `datos.idEquipo` identifica el equipo del
// elemento comentado (comentarios.service.ts los escribe así desde este
// incremento): un comentario sobre un elemento es, para efectos del
// historial de un equipo, tan "de ese equipo" como el elemento mismo. Los
// comentarios sobre una entrada de bitácora no entran aquí: la bitácora no
// es del equipo (nucleo §9.3), así que no tienen lugar en una vista acotada
// a un equipo.
const EVENTOS_EVALUACION_DE_EQUIPO: readonly string[] = [
  'comentario_escrito',
  'comentario_modificado',
]

// GET /api/actividades/{id}/historial: cronológico inverso, paginado por
// cursor (nucleo §3.1 — ver limiteHistorialValido).
//
// Dos vistas, no una sola recortada por rol (decisión de producto vigente,
// distinta de la original de nucleo §5.5):
//
// - Sin idEquipoFiltro (el panel del resumen de la actividad,
//   PantallaResumenActividad): solo estructura de la actividad completa
//   (cambios de fase, de configuración, de co-organizadores…), para
//   cualquier rol. Es la vista de "qué cambió en la actividad", no un
//   mezclador de aportaciones de todos los equipos.
// - Con idEquipoFiltro (el entrypoint de Historial dentro del espacio de
//   equipo, AppShellEquipo): lo anterior más lo propio de ese equipo —
//   estructura del equipo, aportación y comentarios sobre sus elementos.
//   Es la vista de "qué cambió en este equipo", general y específico juntos.
//
// Un participante solo puede pedir su propio equipo (P-10): si idEquipoFiltro
// no es el suyo (idEquipoActor, resuelto por la ruta vía Equipos — nucleo
// §1.2, "ningún módulo accede a los datos de otro directamente"), las ramas
// de ese equipo no aplican y solo ve la estructura de la actividad. Ninguna
// de las dos vistas incluye categoría evaluación salvo los comentarios sobre
// elementos del equipo pedido: calificaciones e insignias siguen fuera del
// historial de cualquiera que no sea quien organiza (general §7.3), y esa
// restricción no ha cambiado aquí.
export async function listarHistorial(
  idActividad: string,
  rolActor: RolMembresia,
  idEquipoActor: string | null,
  paginacion: { cursor?: string; limite?: number } = {},
  idEquipoFiltro?: string,
): Promise<PaginaHistorial> {
  const puedeVerEseEquipo = rolActor !== 'participante' || idEquipoFiltro === idEquipoActor
  const generales: Prisma.HistorialWhereInput = {
    categoria: 'estructura',
    tipoEvento: { in: tiposGenerales(rolActor) },
  }

  const where: Prisma.HistorialWhereInput =
    idEquipoFiltro && puedeVerEseEquipo
      ? {
          idActividad,
          OR: [
            generales,
            {
              categoria: 'estructura' as CategoriaEvento,
              tipoEvento: { in: [...EVENTOS_ESTRUCTURA_DE_EQUIPO] },
              datos: { path: ['equipos'], array_contains: idEquipoFiltro },
            },
            {
              categoria: 'aportacion' as CategoriaEvento,
              datos: { path: ['idEquipo'], equals: idEquipoFiltro },
            },
            {
              categoria: 'evaluacion' as CategoriaEvento,
              tipoEvento: { in: [...EVENTOS_EVALUACION_DE_EQUIPO] },
              datos: { path: ['idEquipo'], equals: idEquipoFiltro },
            },
          ],
        }
      : { idActividad, ...generales }

  const limite = limiteHistorialValido(paginacion.limite)

  // fecha por sí sola no define un orden total: dos eventos de la misma
  // transacción (p. ej. fase_avanzada y lo que la dispara) pueden compartir
  // instante. idEvento como desempate (ambos descendente, mismo criterio que
  // el cursor de Prisma espera para retomar justo después de la fila ancla)
  // es lo que hace que el cursor no repita ni salte eventos entre páginas.
  const filas = await prisma.historial.findMany({
    where,
    include: { usuarioActor: { select: { nombre: true, apellidoPaterno: true } } },
    orderBy: [{ fecha: 'desc' }, { idEvento: 'desc' }],
    take: limite + 1,
    ...(paginacion.cursor ? { cursor: { idEvento: paginacion.cursor }, skip: 1 } : {}),
  })

  const hayMas = filas.length > limite
  const pagina = hayMas ? filas.slice(0, limite) : filas

  return {
    eventos: pagina.map((fila) => ({
      id: fila.idEvento,
      tipoEvento: fila.tipoEvento,
      tipoEntidad: fila.tipoEntidad,
      idEntidad: fila.idEntidad,
      categoria: fila.categoria,
      actor: fila.usuarioActor
        ? `${fila.usuarioActor.nombre} ${fila.usuarioActor.apellidoPaterno}`.trim()
        : null,
      datos: fila.datos as Record<string, unknown>,
      fecha: fila.fecha.toISOString(),
    })),
    cursorSiguiente: hayMas ? (pagina.at(-1)?.idEvento ?? null) : null,
  }
}
