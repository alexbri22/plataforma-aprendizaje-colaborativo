import { randomInt } from 'node:crypto'

// Alfabeto de docs/diseno-desarrollo-nucleo.md §7.2: mayúsculas y dígitos sin
// glifos confundibles al dictarse o copiarse a mano (sin 0, O, 1, I, L). El
// mock de apps/web/src/features/actividades/actividades.api.ts usa el mismo
// alfabeto con Math.random; aquí es crypto.randomInt porque es la clave real
// con la que se une gente a una actividad.
const ALFABETO_CLAVE_INGRESO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LONGITUD_CLAVE_INGRESO = 8

export function generarClaveIngreso(): string {
  let clave = ''
  for (let i = 0; i < LONGITUD_CLAVE_INGRESO; i += 1) {
    clave += ALFABETO_CLAVE_INGRESO[randomInt(ALFABETO_CLAVE_INGRESO.length)]
  }
  return clave
}
