import type { EventoHistorial } from '@plataforma/shared'

// A dónde lleva un clic sobre un evento del historial: "ir directamente a
// revisarlo", ya con la tarjeta exacta abierta (nucleo §5.5) — entre veinte
// tarjetas colapsadas, encontrar la que cambió era el problema que ?abrir=
// resuelve (PantallaEspacioEquipo, PantallaMiBitacora,
// PantallaBitacoraDeParticipante lo leen para expandir y hacer scroll).
// Solo los tipos de evento que cargan lo necesario en `datos` (nucleo §5.1)
// tienen destino; el resto (fase_avanzada, configuracion_modificada,
// equipo_creado…) no lo tiene y el evento se queda como texto plano, igual
// que hoy — ningún tipo pierde su entrada en descripcion.ts por no tener
// destino aquí.
function esCadena(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0
}

function destinoDeElemento(idEquipo: unknown, tipo: unknown, idAbrir: string): string | null {
  if (!esCadena(idEquipo) || !esCadena(tipo)) return null
  if (tipo !== 'metas' && tipo !== 'avances' && tipo !== 'recursos') return null
  return `/equipos/${idEquipo}/${tipo}?abrir=${idAbrir}`
}

// La bitácora vive dentro del espacio de equipo (decisión de producto:
// PantallaMiBitacora, PantallaBitacoraDeParticipante), no fuera de las
// actividades, así que su destino también cuelga de /equipos/{id} — por eso
// hace falta el idEquipo del autor de la entrada al momento del evento
// (datos.idEquipo, resuelto en bitacora.service.ts/comentarios.service.ts
// vía obtenerIdEquipoDeMembresia), no el idActividad que ya no basta.
function destinoDeBitacora(
  idEquipo: unknown,
  idMembresia: unknown,
  idMiMembresia: string | undefined,
  idAbrir: string,
): string | null {
  if (!esCadena(idEquipo) || !esCadena(idMembresia)) return null
  return idMembresia === idMiMembresia
    ? `/equipos/${idEquipo}/bitacora?abrir=${idAbrir}`
    : `/equipos/${idEquipo}/participantes/${idMembresia}/bitacora?abrir=${idAbrir}`
}

/** `idMiMembresia`: la propia membresía de quien mira el historial, para
 * distinguir "mi bitácora" de la de otra persona (nucleo §9.4). Puede faltar
 * (todavía cargando la actividad); mientras tanto ningún evento de
 * bitácora tiene destino, que es el valor seguro. */
export function destinoDeEvento(
  evento: EventoHistorial,
  idMiMembresia: string | undefined,
): string | null {
  const d = evento.datos

  if (evento.tipoEntidad === 'elemento_espacio_equipo') {
    return destinoDeElemento(d.idEquipo, d.tipo, evento.idEntidad)
  }
  if (evento.tipoEntidad === 'bitacora') {
    return destinoDeBitacora(d.idEquipo, d.idMembresia, idMiMembresia, evento.idEntidad)
  }
  if (evento.tipoEntidad === 'comentario') {
    // El id a abrir es el de lo comentado, no el del comentario mismo: el
    // comentario no es una tarjeta propia, vive dentro de la de su elemento
    // o entrada (ComentariosDeElemento/ComentariosDeEntrada).
    if (!esCadena(d.idEntidadComentada)) return null
    if (d.tipoEntidadComentada === 'elemento_espacio_equipo') {
      return destinoDeElemento(d.idEquipo, d.tipoElemento, d.idEntidadComentada)
    }
    if (d.tipoEntidadComentada === 'bitacora') {
      return destinoDeBitacora(d.idEquipo, d.idMembresia, idMiMembresia, d.idEntidadComentada)
    }
  }
  return null
}
