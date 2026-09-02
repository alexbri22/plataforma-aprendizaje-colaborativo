import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { config } from '../config.js'

// Cliente único de Prisma (docs/diseno-desarrollo-nucleo.md §2.5). Los
// servicios lo importan directamente y escriben sus propias consultas: no
// hay interfaz de repositorio intermedia.
const adapter = new PrismaPg({ connectionString: config.databaseUrl })
export const prisma = new PrismaClient({ adapter })
