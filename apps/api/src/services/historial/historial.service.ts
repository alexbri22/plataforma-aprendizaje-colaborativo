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

// GET /api/actividades/{id}/historial: cronológico inverso, paginado por
// cursor (nucleo §3.1 — ver limiteHistorialValido). El organizador y los
// co-organizadores ven todo (general §7.3); un participante, los eventos de
// estructura de la actividad completa, los de estructura y aportación de su
// propio equipo (P-10), y ninguno de evaluación — categoría ausente de las
// ramas del OR de abajo, no hace falta excluirla aparte. idEquipoActor llega
// resuelto desde la ruta en vez de resolverse aquí: este servicio no conoce
// la tabla de integrantes, que es de Equipos (nucleo §1.2, "ningún módulo
// accede a los datos de otro directamente").
export async function listarHistorial(
  idActividad: string,
  rolActor: RolMembresia,
  idEquipoActor: string | null,
  paginacion: { cursor?: string; limite?: number } = {},
): Promise<PaginaHistorial> {
  const filtroParticipante: Prisma.HistorialWhereInput | undefined =
    rolActor === 'participante'
      ? {
          OR: [
            { categoria: 'estructura', tipoEvento: { in: [...EVENTOS_ESTRUCTURA_DE_ACTIVIDAD] } },
            // Sin equipo (todavía no le asignan uno, o el suyo se eliminó):
            // ningún evento de equipo ni de aportación es suyo. idEquipo(s)
            // viven dentro de `datos` y no como columna propia porque el
            // evento es polimórfico (nucleo §1.2, general §4.4).
            ...(idEquipoActor
              ? [
                  {
                    categoria: 'estructura' as CategoriaEvento,
                    tipoEvento: { in: [...EVENTOS_ESTRUCTURA_DE_EQUIPO] },
                    datos: { path: ['equipos'], array_contains: idEquipoActor },
                  },
                  {
                    categoria: 'aportacion' as CategoriaEvento,
                    datos: { path: ['idEquipo'], equals: idEquipoActor },
                  },
                ]
              : []),
          ],
        }
      : undefined

  const limite = limiteHistorialValido(paginacion.limite)

  // fecha por sí sola no define un orden total: dos eventos de la misma
  // transacción (p. ej. fase_avanzada y lo que la dispara) pueden compartir
  // instante. idEvento como desempate (ambos descendente, mismo criterio que
  // el cursor de Prisma espera para retomar justo después de la fila ancla)
  // es lo que hace que el cursor no repita ni salte eventos entre páginas.
  const filas = await prisma.historial.findMany({
    where: { idActividad, ...filtroParticipante },
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
