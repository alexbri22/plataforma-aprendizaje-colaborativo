import type { CategoriaEvento, Prisma, TipoActorHistorial } from '@prisma/client'

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
