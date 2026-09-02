// Archivo temporal de diagnóstico: función nativa de Vercel (no pasa por
// Express ni por api/[...path].ts) en una ruta de dos segmentos fijos
// (/api/diagnostico/prueba), para aislar si el 404 de /api/claves/{clave}
// es del mecanismo catch-all o un límite de la plataforma para cualquier
// ruta de /api con más de un segmento. Se borra en cuanto se diagnostique.
export default function handler(
  _req: unknown,
  res: { status: (n: number) => { json: (b: unknown) => void } },
) {
  res.status(200).json({ ok: true, ruta: 'diagnostico/prueba' })
}
