-- Base separada para las pruebas de integración. Los tests limpian sus
-- tablas entre casos (ver apps/api/src/routes/cuentas.test.ts), así que si
-- corrieran contra la misma base que el desarrollo local, cada `npm test`
-- borraría cuentas reales creadas a mano. Se migra con
-- `npm run pretest -w apps/api` (automático antes de `npm test`).
CREATE DATABASE plataforma_test OWNER plataforma;
