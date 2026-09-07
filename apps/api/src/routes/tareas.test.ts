import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { config } from '../config.js'

const app = createApp()

// La lógica de la tarea (qué actividades transiciona y por qué) se prueba
// contra transicionarActividadesVencidas() directamente en
// routes/actividades.test.ts; aquí solo se cubre el límite de autorización
// de este endpoint, que Vercel Cron Jobs invoca con el secreto de
// vercel.json ("crons") y no con una sesión de usuario.
describe('GET /api/tareas/transiciones-vencidas', () => {
  it('responde 401 sin el encabezado de autorización', async () => {
    const respuesta = await request(app).get('/api/tareas/transiciones-vencidas')
    expect(respuesta.status).toBe(401)
  })

  it('responde 401 con un secreto incorrecto', async () => {
    const respuesta = await request(app)
      .get('/api/tareas/transiciones-vencidas')
      .set('Authorization', 'Bearer secreto-equivocado')
    expect(respuesta.status).toBe(401)
  })

  it('responde 200 con el secreto configurado', async () => {
    const respuesta = await request(app)
      .get('/api/tareas/transiciones-vencidas')
      .set('Authorization', `Bearer ${config.cronSecret}`)
    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({ procesadas: expect.any(Number) })
  })
})
