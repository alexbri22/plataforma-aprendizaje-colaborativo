import { randomBytes } from 'node:crypto'
import type { CookieOptions } from 'express'
import { config } from '../../config.js'

// Identificador de sesión: aleatorio y opaco, sin relación con el usuario
// (docs/diseno-desarrollo-nucleo.md §3.2 — se rota al iniciar sesión).
export function generarIdSesion(): string {
  return randomBytes(32).toString('base64url')
}

export function calcularExpiracionAbsoluta(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + config.sesion.tiempoAbsolutoHoras * 60 * 60 * 1000)
}

export function sesionInactivaDesde(ultimaActividad: Date, ahora: Date = new Date()): boolean {
  const limiteMs = config.sesion.tiempoInactividadHoras * 60 * 60 * 1000
  return ahora.getTime() - ultimaActividad.getTime() > limiteMs
}

// httpOnly + Secure + SameSite (docs/diseno-desarrollo-nucleo.md §3.2).
// Secure solo en producción: en dev el cliente y la API se sirven por http.
export const opcionesCookieSesion: CookieOptions = {
  httpOnly: true,
  secure: config.produccion,
  sameSite: 'lax',
  path: '/',
}
