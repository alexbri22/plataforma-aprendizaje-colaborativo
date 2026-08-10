import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    // Opcional a propósito: solo migrate dev la usa para detectar deriva.
    // migrate deploy (scripts/migrar-bd-pruebas.mjs, CI) no la necesita, y
    // env() lanza si la variable no existe — process.env no.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
