import { esIdPista, type IdPista } from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorValidacion } from '../../errores.js'

// Qué ayudas de primera vez ya vio la persona (PistaVista). Una fila con un
// id que dejó de existir en IDS_PISTA se ignora al leer, en vez de romper.
export async function listarPistasVistas(idUsuario: string): Promise<IdPista[]> {
  const filas = await prisma.pistaVista.findMany({
    where: { idUsuario },
    select: { idPista: true },
  })
  return filas.map((fila) => fila.idPista).filter(esIdPista)
}

// Idempotente: marcar dos veces la misma ayuda (dos pestañas, un reintento)
// no falla ni duplica.
export async function marcarPistaVista(idUsuario: string, idPista: string): Promise<void> {
  if (!esIdPista(idPista)) throw new ErrorValidacion({ idPista: 'Esa ayuda no existe.' })
  await prisma.pistaVista.createMany({ data: [{ idUsuario, idPista }], skipDuplicates: true })
}

// "Volver a ver las ayudas" desde el perfil: todas reaparecen una vez,
// incluida la bienvenida.
export async function reiniciarPistas(idUsuario: string): Promise<void> {
  await prisma.pistaVista.deleteMany({ where: { idUsuario } })
}
