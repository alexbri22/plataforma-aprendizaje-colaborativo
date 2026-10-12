import type { CategoriaEvento, Prisma, RolMembresia, TipoActorHistorial } from '@prisma/client'
import type { EventoHistorial } from '@plataforma/shared'
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

// Categorías visibles para un participante (general §7.3, fila "Consultar
// los eventos de aportación y estructura", P-10): no ve evaluación dirigida
// a otros. Este incremento ("Espacio de equipo y cierre de fase", nucleo
// §11.2) es la consulta mínima de §5.5 — cronológica, sin filtros ni
// agregación de ediciones consecutivas, que son Fase B (§11.3, "Cierre y
// consulta"). Como todavía no hay eventos de evaluación con sujeto propio
// que distinguir de los de terceros, el participante simplemente no ve la
// categoría evaluación por ahora.
const CATEGORIAS_DE_PARTICIPANTE: readonly CategoriaEvento[] = ['aportacion', 'estructura']

// GET /api/actividades/{id}/historial: cronológico inverso. El organizador y
// los co-organizadores ven todo (general §7.3); un participante, solo
// aportación y estructura.
export async function listarHistorial(
  idActividad: string,
  rolActor: RolMembresia,
): Promise<EventoHistorial[]> {
  const filas = await prisma.historial.findMany({
    where: {
      idActividad,
      ...(rolActor === 'participante'
        ? { categoria: { in: [...CATEGORIAS_DE_PARTICIPANTE] } }
        : {}),
    },
    include: { usuarioActor: { select: { nombre: true, apellidoPaterno: true } } },
    orderBy: { fecha: 'desc' },
  })

  return filas.map((fila) => ({
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
  }))
}
