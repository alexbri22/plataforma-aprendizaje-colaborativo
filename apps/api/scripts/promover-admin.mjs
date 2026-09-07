import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Promueve una cuenta existente a administrador. El registro público solo
// crea cuentas de tipo usuario (docs/diseno-desarrollo-general.md §7.2), así
// que el primer administrador se designa fuera de la aplicación, sobre una
// cuenta ya registrada por el flujo normal.
//
// Uso: npm run promover-admin -- correo@ejemplo.com

const correo = process.argv[2]
if (!correo) {
  console.error('Uso: npm run promover-admin -- <correo>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('Falta DATABASE_URL en apps/api/.env (ver .env.example)')
}

const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

try {
  const usuario = await prisma.usuario.update({
    where: { correo },
    data: { tipoCuenta: 'administrador' },
    select: { correo: true, tipoCuenta: true },
  })
  console.log(`Cuenta ${usuario.correo} promovida a ${usuario.tipoCuenta}.`)
} catch (error) {
  if (error?.code === 'P2025') {
    console.error(`No existe ninguna cuenta con el correo ${correo}.`)
  } else {
    console.error(`No se pudo promover ${correo}: ${error?.message ?? error}`)
  }
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
