import type {
  AvanceDeInstrumento,
  CumplimientoDeInstrumento,
  EntregaDeInstrumento,
  InstrumentoPorResponder,
  MisResultadosPares,
  OrigenInstrumento,
  Periodicidad,
  Ponderacion,
  RespuestasDeInstrumento,
  RespuestasDistribucion,
  RespuestasLikert,
  ResultadosParesDeEquipo,
  TipoInstrumento,
} from '@plataforma/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ErrorPonderacion extends Error {}

const MENSAJE_SIN_CONEXION = 'No pudimos comunicarnos con Co3. Intenta de nuevo en un momento.'

// El mensaje del servidor, o el primero de su detalle por campo (la suma de
// pesos de un nivel viene ahí: ErrorValidacion, nucleo §3.1).
async function leerMensajeError(respuesta: Response, mensajePorDefecto: string): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as {
      mensaje?: unknown
      detallePorCampo?: Record<string, unknown>
    }
    const delDetalle = Object.values(cuerpo.detallePorCampo ?? {}).find(
      (v) => typeof v === 'string',
    )
    if (typeof delDetalle === 'string') return delDetalle
    if (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()) return cuerpo.mensaje
  } catch {
    // el cuerpo no es JSON válido o está vacío; usamos el mensaje por defecto
  }
  return mensajePorDefecto
}

async function pedir(
  ruta: string,
  metodo: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
  cuerpo?: unknown,
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      credentials: 'include',
      ...(cuerpo === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    })
  } catch {
    throw new ErrorPonderacion(MENSAJE_SIN_CONEXION)
  }
}

async function ponderacionDe(respuesta: Response, mensajePorDefecto: string): Promise<Ponderacion> {
  if (!respuesta.ok)
    throw new ErrorPonderacion(await leerMensajeError(respuesta, mensajePorDefecto))
  return ((await respuesta.json()) as { ponderacion: Ponderacion }).ponderacion
}

// GET /api/actividades/{id}/ponderacion (nucleo §10.5).
export async function obtenerPonderacion(idActividad: string): Promise<Ponderacion> {
  return ponderacionDe(
    await pedir(`/api/actividades/${encodeURIComponent(idActividad)}/ponderacion`, 'GET'),
    'No pudimos cargar los pesos de la calificación.',
  )
}

// PATCH /api/actividades/{id}/componentes/{id} y .../aspectos/{id}: el peso
// de una parte, guardado al salir del campo.
export async function guardarPeso(
  idActividad: string,
  parte: 'componente' | 'aspecto',
  id: string,
  peso: number,
): Promise<Ponderacion> {
  return ponderacionDe(
    await pedir(
      `/api/actividades/${encodeURIComponent(idActividad)}/${parte}s/${encodeURIComponent(id)}`,
      'PATCH',
      { peso },
    ),
    'No pudimos guardar el porcentaje. Intenta de nuevo.',
  )
}

/** El tipo de instrumento de un aspecto del proceso y su periodicidad
 * (nucleo §10.1); tipo nulo lo quita. El formato se elige por instancia. */
export type DefinicionInstrumentos =
  { tipo: null } | { tipo: TipoInstrumento; periodicidad: Periodicidad | 'ninguna' }

// PUT /api/actividades/{id}/aspectos/{idAspecto}/instrumentos.
export async function definirInstrumentos(
  idActividad: string,
  idAspecto: string,
  definicion: DefinicionInstrumentos,
): Promise<Ponderacion> {
  return ponderacionDe(
    await pedir(
      `/api/actividades/${encodeURIComponent(idActividad)}/aspectos/${encodeURIComponent(idAspecto)}/instrumentos`,
      'PUT',
      definicion,
    ),
    'No pudimos guardar el instrumento. Intenta de nuevo.',
  )
}

/** Lo que se ajusta de una instancia del calendario; lo ausente no cambia. */
export interface CambiosInstrumento {
  formato?: OrigenInstrumento
  enlace?: string | null
  fechaPlanificada?: string | null
}

// PATCH /api/actividades/{id}/instrumentos/{idInstrumento}.
export async function actualizarInstrumento(
  idActividad: string,
  idInstrumento: string,
  cambios: CambiosInstrumento,
): Promise<Ponderacion> {
  return ponderacionDe(
    await pedir(
      `/api/actividades/${encodeURIComponent(idActividad)}/instrumentos/${encodeURIComponent(idInstrumento)}`,
      'PATCH',
      cambios,
    ),
    'No pudimos guardar el cambio. Intenta de nuevo.',
  )
}

/*
 * Lo que responde quien participa (nucleo §10.5).
 */

async function exigirOk(respuesta: Response, mensajePorDefecto: string): Promise<Response> {
  if (!respuesta.ok)
    throw new ErrorPonderacion(await leerMensajeError(respuesta, mensajePorDefecto))
  return respuesta
}

// GET /api/actividades/{id}/mis-instrumentos.
export async function obtenerMisInstrumentos(
  idActividad: string,
): Promise<InstrumentoPorResponder[]> {
  const respuesta = await exigirOk(
    await pedir(`/api/actividades/${encodeURIComponent(idActividad)}/mis-instrumentos`, 'GET'),
    'No pudimos cargar tus evaluaciones.',
  )
  return ((await respuesta.json()) as { instrumentos: InstrumentoPorResponder[] }).instrumentos
}

// GET /api/actividades/{id}/cumplimiento-instrumentos: para quien organiza,
// cuántos completaron cada instancia (Operación de la planeación).
export async function obtenerAvanceDeInstrumentos(
  idActividad: string,
): Promise<AvanceDeInstrumento[]> {
  const respuesta = await exigirOk(
    await pedir(
      `/api/actividades/${encodeURIComponent(idActividad)}/cumplimiento-instrumentos`,
      'GET',
    ),
    'No pudimos cargar las evaluaciones.',
  )
  return ((await respuesta.json()) as { instrumentos: AvanceDeInstrumento[] }).instrumentos
}

function rutaRespuestas(idActividad: string, idInstrumento: string): string {
  return `/api/actividades/${encodeURIComponent(idActividad)}/instrumentos/${encodeURIComponent(idInstrumento)}/respuestas`
}

// GET .../instrumentos/{id}/respuestas: quien participa recibe solo las suyas.
export async function obtenerRespuestas(
  idActividad: string,
  idInstrumento: string,
): Promise<RespuestasDeInstrumento[]> {
  const respuesta = await exigirOk(
    await pedir(rutaRespuestas(idActividad, idInstrumento), 'GET'),
    'No pudimos cargar las respuestas.',
  )
  return ((await respuesta.json()) as { respuestas: RespuestasDeInstrumento[] }).respuestas
}

// PUT .../instrumentos/{id}/respuestas: la plantilla completa.
export async function responderInstrumento(
  idActividad: string,
  idInstrumento: string,
  respuestas: RespuestasLikert | RespuestasDistribucion,
): Promise<RespuestasDeInstrumento> {
  const respuesta = await exigirOk(
    await pedir(rutaRespuestas(idActividad, idInstrumento), 'PUT', { respuestas }),
    'No pudimos guardar tus respuestas. Intenta de nuevo.',
  )
  return ((await respuesta.json()) as { respuestas: RespuestasDeInstrumento }).respuestas
}

function rutaInstrumento(idActividad: string, idInstrumento: string): string {
  return `/api/actividades/${encodeURIComponent(idActividad)}/instrumentos/${encodeURIComponent(idInstrumento)}`
}

// GET .../instrumentos/{id}/entregas: la propia, o todas para quien organiza.
export async function obtenerEntregas(
  idActividad: string,
  idInstrumento: string,
): Promise<EntregaDeInstrumento[]> {
  const respuesta = await exigirOk(
    await pedir(`${rutaInstrumento(idActividad, idInstrumento)}/entregas`, 'GET'),
    'No pudimos cargar las entregas.',
  )
  return ((await respuesta.json()) as { entregas: EntregaDeInstrumento[] }).entregas
}

async function entregaDe(respuesta: Response, mensaje: string): Promise<EntregaDeInstrumento> {
  await exigirOk(respuesta, mensaje)
  return ((await respuesta.json()) as { entrega: EntregaDeInstrumento }).entrega
}

// PUT .../instrumentos/{id}/entrega: registra o corrige la entrega propia.
export async function guardarEntrega(
  idActividad: string,
  idInstrumento: string,
  datos: { contenido: string; enlace: string | null },
): Promise<EntregaDeInstrumento> {
  return entregaDe(
    await pedir(`${rutaInstrumento(idActividad, idInstrumento)}/entrega`, 'PUT', datos),
    'No pudimos guardar tu entrega. Intenta de nuevo.',
  )
}

// PUT .../entrega/archivo: el cuerpo es el archivo; el nombre va en
// X-Nombre-Archivo, como el archivo de un elemento.
export async function subirArchivoEntrega(
  idActividad: string,
  idInstrumento: string,
  archivo: File,
  tipo: string,
): Promise<EntregaDeInstrumento> {
  let respuesta: Response
  try {
    respuesta = await fetch(
      `${BASE_URL}${rutaInstrumento(idActividad, idInstrumento)}/entrega/archivo`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': encodeURIComponent(archivo.name) },
        body: archivo,
      },
    )
  } catch {
    throw new ErrorPonderacion(MENSAJE_SIN_CONEXION)
  }
  return entregaDe(respuesta, 'No pudimos subir el archivo. Intenta de nuevo.')
}

export async function quitarArchivoEntrega(
  idActividad: string,
  idInstrumento: string,
): Promise<EntregaDeInstrumento> {
  return entregaDe(
    await pedir(`${rutaInstrumento(idActividad, idInstrumento)}/entrega/archivo`, 'DELETE'),
    'No pudimos quitar el archivo. Intenta de nuevo.',
  )
}

export function urlArchivoEntrega(
  idActividad: string,
  idInstrumento: string,
  idEntrega: string,
): string {
  return `${BASE_URL}${rutaInstrumento(idActividad, idInstrumento)}/entregas/${encodeURIComponent(idEntrega)}/archivo`
}

// GET /api/actividades/{id}/aspectos/{idAspecto}/cumplimiento: para quien
// organiza.
export async function obtenerCumplimiento(
  idActividad: string,
  idAspecto: string,
): Promise<CumplimientoDeInstrumento[]> {
  const respuesta = await exigirOk(
    await pedir(
      `/api/actividades/${encodeURIComponent(idActividad)}/aspectos/${encodeURIComponent(idAspecto)}/cumplimiento`,
      'GET',
    ),
    'No pudimos cargar quién ha completado los instrumentos.',
  )
  return ((await respuesta.json()) as { instrumentos: CumplimientoDeInstrumento[] }).instrumentos
}

// GET .../instrumentos/{id}/pares?idEquipo=: para quien organiza.
export async function obtenerResultadosPares(
  idActividad: string,
  idInstrumento: string,
  idEquipo: string,
): Promise<ResultadosParesDeEquipo> {
  const respuesta = await exigirOk(
    await pedir(
      `${rutaInstrumento(idActividad, idInstrumento)}/pares?idEquipo=${encodeURIComponent(idEquipo)}`,
      'GET',
    ),
    'No pudimos cargar los resultados de la evaluación por pares.',
  )
  return ((await respuesta.json()) as { resultados: ResultadosParesDeEquipo }).resultados
}

// GET .../instrumentos/{id}/pares/mios: lo que le dieron sus compañeros.
export async function obtenerMisResultadosPares(
  idActividad: string,
  idInstrumento: string,
): Promise<MisResultadosPares> {
  const respuesta = await exigirOk(
    await pedir(`${rutaInstrumento(idActividad, idInstrumento)}/pares/mios`, 'GET'),
    'No pudimos cargar tus resultados.',
  )
  return ((await respuesta.json()) as { resultados: MisResultadosPares }).resultados
}
