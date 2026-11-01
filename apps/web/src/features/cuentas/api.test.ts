import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorCuenta, iniciarSesion, registrarUsuario } from './api'

function responder(status: number, cuerpo: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status })),
  )
}

async function errorDe(promesa: Promise<unknown>): Promise<ErrorCuenta> {
  try {
    await promesa
  } catch (error) {
    if (error instanceof ErrorCuenta) return error
    throw error
  }
  throw new Error('se esperaba un ErrorCuenta')
}

const CREDENCIALES = { correo: 'ana@example.com', contrasena: 'clave1234' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('iniciarSesion', () => {
  it('no menciona los intentos mientras quedan muchos', async () => {
    responder(401, { codigo: 'credenciales_invalidas', intentosRestantes: 8 })
    const error = await errorDe(iniciarSesion(CREDENCIALES))
    expect(error.message).toBe('Correo o contraseña incorrectos.')
  })

  it('avisa cuántos intentos quedan cuando son pocos', async () => {
    responder(401, { codigo: 'credenciales_invalidas', intentosRestantes: 2 })
    const error = await errorDe(iniciarSesion(CREDENCIALES))
    expect(error.message).toBe(
      'Correo o contraseña incorrectos. Te quedan 2 intentos antes de una pausa.',
    )
    expect(error.reintentarEnSegundos).toBeUndefined()
  })

  it('con el último intento gastado, trae cuánto esperar', async () => {
    responder(401, {
      codigo: 'credenciales_invalidas',
      intentosRestantes: 0,
      reintentarEnSegundos: 600,
    })
    const error = await errorDe(iniciarSesion(CREDENCIALES))
    expect(error.message).toBe(
      'Correo o contraseña incorrectos. Ya no te quedan intentos por ahora.',
    )
    expect(error.reintentarEnSegundos).toBe(600)
  })

  it('en un 429 trae cuánto esperar', async () => {
    responder(429, { codigo: 'limite_intentos', reintentarEnSegundos: 300 })
    const error = await errorDe(iniciarSesion(CREDENCIALES))
    expect(error.message).toBe('Demasiados intentos.')
    expect(error.reintentarEnSegundos).toBe(300)
  })

  it('distingue una cuenta desactivada de una contraseña incorrecta', async () => {
    responder(401, { codigo: 'cuenta_desactivada', mensaje: 'Esta cuenta está desactivada.' })
    const error = await errorDe(iniciarSesion(CREDENCIALES))
    expect(error.message).toMatch(/^Esta cuenta está desactivada\./)
  })
})

describe('registrarUsuario', () => {
  it('pasa el detalle por campo de un 400 de validación', async () => {
    responder(400, {
      codigo: 'validacion',
      mensaje: 'La petición no es válida.',
      detallePorCampo: { correo: 'El correo no es válido.' },
    })
    const error = await errorDe(
      registrarUsuario({
        nombre: 'Ana',
        apellidoPaterno: 'García',
        apellidoMaterno: 'López',
        nivelEstudios: 'Licenciatura',
        institucionEducativa: 'UNAM',
        ...CREDENCIALES,
      }),
    )
    expect(error.message).toBe('Revisa los campos marcados.')
    expect(error.detallePorCampo).toEqual({ correo: 'El correo no es válido.' })
  })
})
