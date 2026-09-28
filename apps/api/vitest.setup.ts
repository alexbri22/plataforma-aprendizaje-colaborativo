import http from 'node:http'

// supertest abre un servidor en un puerto efímero por cada request(app). Desde
// Node 19 el agente global mantiene los sockets abiertos (keep-alive), y si un
// servidor nuevo recibe el puerto de uno ya cerrado, la petición puede salir
// por un socket viejo: "socket hang up" o "Parse Error: Expected HTTP/". Sin
// conexiones reutilizables no hay socket viejo que reusar.
http.globalAgent = new http.Agent({ keepAlive: false })
