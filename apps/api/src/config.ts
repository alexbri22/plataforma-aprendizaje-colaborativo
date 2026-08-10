import 'dotenv/config'

function numero(nombre: string, porDefecto: number): number {
  const valor = process.env[nombre]
  return valor ? Number(valor) : porDefecto
}

function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`)
  return valor
}

export const config = {
  puerto: numero('PORT', 3001),
  databaseUrl: requerida('DATABASE_URL'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  produccion: process.env.NODE_ENV === 'production',
  sesion: {
    nombreCookie: process.env.SESSION_COOKIE_NAME ?? 'sesion',
    // P-22 (docs/diseno-desarrollo-nucleo.md §6.7) no tiene valor confirmado
    // todavía: estos son la propuesta por defecto, documentada en
    // .env.example, hasta que se resuelva.
    tiempoInactividadHoras: numero('SESSION_IDLE_TIMEOUT_HORAS', 168),
    tiempoAbsolutoHoras: numero('SESSION_ABSOLUTE_TIMEOUT_HORAS', 720),
  },
  argon2: {
    memoryCostKiB: numero('ARGON2_MEMORY_COST_KIB', 19456),
    timeCost: numero('ARGON2_TIME_COST', 2),
    parallelism: numero('ARGON2_PARALLELISM', 1),
  },
  limiteIntentos: {
    registro: {
      ventanaMin: numero('RATE_LIMIT_REGISTRO_VENTANA_MIN', 15),
      max: numero('RATE_LIMIT_REGISTRO_MAX', 20),
    },
    sesion: {
      ventanaMin: numero('RATE_LIMIT_SESION_VENTANA_MIN', 15),
      max: numero('RATE_LIMIT_SESION_MAX', 10),
    },
  },
}
