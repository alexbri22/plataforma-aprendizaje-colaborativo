import 'dotenv/config'
import { execSync } from 'node:child_process'

// Aplica las migraciones existentes a DATABASE_URL_TEST (sin detección de
// deriva ni base sombra: eso solo hace falta para crear migraciones nuevas,
// no para aplicar las que ya existen). Corre antes de cada `npm test`.
const url = process.env.DATABASE_URL_TEST
if (!url) {
  throw new Error('Falta DATABASE_URL_TEST en apps/api/.env (ver .env.example)')
}

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
})
