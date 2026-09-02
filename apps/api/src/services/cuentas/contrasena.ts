import argon2 from 'argon2'
import { config } from '../../config.js'

// Derivación irreversible de costo configurable (docs/diseno-desarrollo-nucleo.md
// §3.2): argon2id, con el costo fijado por variables de entorno.
export function hashContrasena(contrasena: string): Promise<string> {
  return argon2.hash(contrasena, {
    type: argon2.argon2id,
    memoryCost: config.argon2.memoryCostKiB,
    timeCost: config.argon2.timeCost,
    parallelism: config.argon2.parallelism,
  })
}

export function verificarContrasena(hash: string, contrasena: string): Promise<boolean> {
  return argon2.verify(hash, contrasena)
}
