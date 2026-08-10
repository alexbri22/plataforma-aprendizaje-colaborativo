import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// process.env en vez del helper env(): este archivo se carga para *todo*
// comando de Prisma, incluido `generate` en el postinstall de CI, que no
// se conecta a ninguna base — solo lee el esquema. env() lanza si la
// variable no existe; process.env simplemente la deja undefined.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
    // Solo migrate dev la usa, para detectar deriva.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
