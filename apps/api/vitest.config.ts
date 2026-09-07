import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Los archivos que tocan la base comparten una única DATABASE_URL_TEST y
    // limpian sus tablas en beforeEach (ver cuentas.test.ts / admin.test.ts).
    // Ese diseño supone ejecución secuencial: en paralelo, el beforeEach de un
    // archivo borra las filas que otro está usando. Sin aislamiento por
    // esquema/base por worker, serializar los archivos es la garantía correcta.
    fileParallelism: false,
  },
})
