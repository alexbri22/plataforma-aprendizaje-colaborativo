import { createApp } from '../apps/api/src/app.js'

// Adaptador para Vercel Functions: Vercel solo descubre funciones bajo un
// directorio /api en la raíz del proyecto, así que este archivo vive aquí
// en vez de junto al resto de apps/api. Una app de Express ya es un handler
// (req, res) válido, así que no hace falta envoltura adicional ni reescribir
// rutas o servicios — apps/api/src/index.ts sigue siendo el punto de entrada
// para desarrollo local y para un despliegue con servidor persistente.
//
// No se llama [...path].ts: ese catch-all por nombre de archivo no estaba
// enrutando peticiones de más de un segmento bajo /api (confirmado: una
// función literal en una ruta de dos segmentos sí respondía, la catch-all
// no). El rewrite explícito de vercel.json hacia esta ruta fija es el
// mecanismo que ya funciona en este proyecto (el mismo que usa el fallback
// de la SPA), así que en vez de depender del descubrimiento automático por
// nombre de archivo, se fuerza el enrutamiento con esa regla.
export default createApp()
