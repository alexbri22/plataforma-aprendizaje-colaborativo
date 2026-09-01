import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Las pruebas de integración de rutas comparten un único PostgreSQL real
    // (docs/diseno-desarrollo-nucleo.md §12.2) y cada archivo limpia sus
    // propias tablas en beforeEach; en paralelo, dos archivos que tocan las
    // mismas tablas (p. ej. usuarios/sesiones desde cuentas.test.ts y
    // actividades.test.ts) se pisan entre sí. Sin la transacción por prueba
    // que ese mismo párrafo describe como pieza del incremento de
    // "Desbloqueo" (§11.2, todavía no implementada), la alternativa correcta
    // es no paralelizar archivos.
    fileParallelism: false,
  },
})
