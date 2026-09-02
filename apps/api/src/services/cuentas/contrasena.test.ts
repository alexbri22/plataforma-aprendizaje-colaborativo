import { describe, expect, it } from 'vitest'
import { hashContrasena, verificarContrasena } from './contrasena.js'

describe('contrasena', () => {
  it('produce un hash distinto del valor original', async () => {
    const hash = await hashContrasena('mi-contrasena-secreta')
    expect(hash).not.toBe('mi-contrasena-secreta')
    expect(hash.startsWith('$argon2id$')).toBe(true)
  })

  it('verifica correctamente la contraseña que generó el hash', async () => {
    const hash = await hashContrasena('mi-contrasena-secreta')
    await expect(verificarContrasena(hash, 'mi-contrasena-secreta')).resolves.toBe(true)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashContrasena('mi-contrasena-secreta')
    await expect(verificarContrasena(hash, 'otra-cosa')).resolves.toBe(false)
  })
})
