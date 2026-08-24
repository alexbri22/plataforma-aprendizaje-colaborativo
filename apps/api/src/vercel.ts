import { createApp } from './app.js'

// Adaptador para Vercel Functions: una app de Express ya es un handler
// (req, res) válido, así que no hace falta envoltura adicional. vercel.json
// (raíz del repo) reescribe /api/* y /health hacia esta función,
// preservando la URL original — Express la enruta exactamente igual que en
// index.ts, que sigue siendo el punto de entrada para desarrollo local y
// para un despliegue con servidor persistente.
export default createApp()
