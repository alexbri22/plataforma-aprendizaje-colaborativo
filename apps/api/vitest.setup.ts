import http from 'node:http'
import { afterAll, vi } from 'vitest'

// supertest abre un servidor en un puerto efímero por cada request(app). Desde
// Node 19 el agente global mantiene los sockets abiertos (keep-alive), y si un
// servidor nuevo recibe el puerto de uno ya cerrado, la petición puede salir
// por un socket viejo: "socket hang up" o "Parse Error: Expected HTTP/". Sin
// conexiones reutilizables no hay socket viejo que reusar.
http.globalAgent = new http.Agent({ keepAlive: false })

// Con Node 24 lo anterior no basta: abrir y cerrar un servidor por petición
// sigue dando "socket hang up" de vez en cuando (un test distinto en cada
// corrida). request(app) recibe aquí un único servidor por app, abierto una
// vez por archivo de pruebas, así que ya no hay puertos que se reciclen.
const servidores = new Map<unknown, http.Server>()

vi.mock('supertest', async (importOriginal) => {
  const original = await importOriginal<typeof import('supertest')>()
  const request = ((app: unknown, ...resto: unknown[]) => {
    if (typeof app !== 'function') return original.default(app as never, ...(resto as []))
    let servidor = servidores.get(app)
    if (!servidor) {
      servidor = http.createServer(app as http.RequestListener).listen(0)
      servidores.set(app, servidor)
    }
    return original.default(servidor, ...(resto as []))
  }) as typeof original.default
  return { ...original, default: request }
})

afterAll(async () => {
  await Promise.all([...servidores.values()].map((s) => new Promise((listo) => s.close(listo))))
  servidores.clear()
})
