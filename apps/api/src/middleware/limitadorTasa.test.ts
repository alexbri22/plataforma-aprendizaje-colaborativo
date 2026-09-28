import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { crearLimitador } from './limitadorTasa.js'

function crearAppDePrueba(max: number) {
  const app = express()
  app.get('/ruta', crearLimitador(15, max), (_req, res) => res.status(200).json({ ok: true }))
  return app
}

function crearAppDePruebaConClave(max: number) {
  const app = express()
  app.get(
    '/ruta',
    crearLimitador(15, max, (req) => req.headers['x-clave'] as string),
    (_req, res) => res.status(200).json({ ok: true }),
  )
  return app
}

describe('crearLimitador', () => {
  it('permite peticiones dentro del límite', async () => {
    const app = crearAppDePrueba(2)
    await request(app).get('/ruta').expect(200)
    await request(app).get('/ruta').expect(200)
  })

  it('responde 429 con la forma del error una vez excedido el límite', async () => {
    const app = crearAppDePrueba(1)
    await request(app).get('/ruta').expect(200)

    const respuesta = await request(app).get('/ruta').expect(429)
    expect(respuesta.body).toEqual({
      codigo: 'limite_intentos',
      mensaje: 'Demasiados intentos. Intenta de nuevo más tarde.',
    })
  })

  it('lleva el conteo por la clave del keyGenerator, no por IP', async () => {
    const app = crearAppDePruebaConClave(1)

    await request(app).get('/ruta').set('x-clave', 'sesion-a').expect(200)
    await request(app).get('/ruta').set('x-clave', 'sesion-a').expect(429)

    // Misma IP (supertest), otra clave: no comparte el conteo anterior.
    await request(app).get('/ruta').set('x-clave', 'sesion-b').expect(200)
  })
})
