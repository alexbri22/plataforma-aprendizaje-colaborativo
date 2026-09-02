import { createApp } from '../apps/api/src/app.js'

// Adaptador para Vercel Functions: Vercel solo descubre funciones bajo un
// directorio /api en la raíz del proyecto, así que este archivo vive aquí
// en vez de junto al resto de apps/api. El nombre [...path] lo hace un
// catch-all que atiende cualquier ruta bajo /api/* de forma nativa, sin
// depender de un rewrite. Una app de Express ya es un handler (req, res)
// válido, así que no hace falta envoltura adicional ni reescribir rutas o
// servicios — apps/api/src/index.ts sigue siendo el punto de entrada para
// desarrollo local y para un despliegue con servidor persistente.
export default createApp()
