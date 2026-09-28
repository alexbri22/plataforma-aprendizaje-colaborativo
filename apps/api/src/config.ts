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

// Bajo Vitest (process.env.VITEST) se usa una base separada de la de
// desarrollo: los tests limpian sus tablas entre casos y correrlos contra
// DATABASE_URL borraría cuentas reales cada vez que alguien corre `npm
// test`. Se migra sola con el script "pretest".
const nombreVariableBaseDeDatos = process.env.VITEST ? 'DATABASE_URL_TEST' : 'DATABASE_URL'

// Mismo criterio que la base de datos separada: las pruebas de integración
// registran muchas más cuentas por archivo que un uso real en la misma
// ventana de quince minutos (una por caso, para que beforeEach pueda
// limpiar la tabla de usuarios entre pruebas), así que el límite de
// producción las haría fallar por 429 sin que eso indique ningún problema
// de seguridad.
const nombreVariableRegistroMax = process.env.VITEST
  ? 'RATE_LIMIT_REGISTRO_MAX_TEST'
  : 'RATE_LIMIT_REGISTRO_MAX'

export const config = {
  puerto: numero('PORT', 3001),
  databaseUrl: requerida(nombreVariableBaseDeDatos),
  // Lista separada por comas: en Vercel, apps/web y esta API se sirven
  // desde el mismo despliegue (api/servidor.ts, enrutada por el rewrite de
  // vercel.json), así que el navegador nunca hace una petición cruzada ahí.
  // Esto solo importa para acceso directo al API sin pasar por ese
  // despliegue — depuración local, curl, o un cliente futuro.
  webOrigins: (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean),
  produccion: process.env.NODE_ENV === 'production',
  // Protege el endpoint que dispara la tarea programada de transiciones
  // vencidas (docs/diseno-desarrollo-nucleo.md §7.5): Vercel Cron Jobs
  // manda este valor como "Authorization: Bearer <secreto>" en cada
  // invocación (ver vercel.json, sección "crons"). Sin configurar, el
  // endpoint rechaza toda petición — no hay un valor por defecto seguro.
  cronSecret: process.env.CRON_SECRET,
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
      max: numero(nombreVariableRegistroMax, 20),
    },
    sesion: {
      ventanaMin: numero('RATE_LIMIT_SESION_VENTANA_MIN', 15),
      max: numero('RATE_LIMIT_SESION_MAX', 10),
    },
    // Consulta por clave de ingreso (docs/diseno-desarrollo-nucleo.md §3.2 y
    // §3.3): el espacio de claves es grande, pero sin límite de intentos
    // seguiría siendo posible recorrerlo por fuerza bruta.
    clave: {
      ventanaMin: numero('RATE_LIMIT_CLAVE_VENTANA_MIN', 15),
      max: numero('RATE_LIMIT_CLAVE_MAX', 20),
    },
  },
}
