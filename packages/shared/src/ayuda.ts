/** Las ayudas de primera vez: la bienvenida y el "?" de cada pantalla. Cada
 * una se muestra sola una vez por persona; el servidor recuerda cuáles ya
 * vio para que no se repitan en otro dispositivo. */
export const IDS_PISTA = [
  'bienvenida',
  'resumen',
  'planificar',
  'inscripcion',
  'conformacion',
  'operacion',
  'equipos',
  'metas',
  'planeacion',
  'avances',
  'materiales',
  'producto',
  'bitacora',
  'reconocer',
] as const

export type IdPista = (typeof IDS_PISTA)[number]

export function esIdPista(valor: unknown): valor is IdPista {
  return typeof valor === 'string' && (IDS_PISTA as readonly string[]).includes(valor)
}
