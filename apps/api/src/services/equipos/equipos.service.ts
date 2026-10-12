import { Prisma } from '@prisma/client'
import { randomInt } from 'node:crypto'
import {
  SEMILLA_MAXIMA,
  TAMANO_MINIMO_EQUIPO,
  type Equipo,
  type ListaEquipos,
  type PropuestaEquipos,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorEquipoBajoMinimo,
  ErrorEquipoLleno,
  ErrorEquipoNoEncontrado,
  ErrorIntercambioInvalido,
  ErrorMiembroNoAsignable,
  ErrorNombreEquipoDuplicado,
  ErrorParticipanteRequiereEquipo,
  ErrorPropuestaSinParticipantes,
  ErrorSinEquipos,
} from '../../errores.js'
import {
  numeroEquiposDePropuesta,
  proponerEquipos,
  repartirConMaximo,
  type AsignacionReparto,
} from '../../utilidades/reparto.js'
import {
  autorizarAccion,
  avanzarAFaseDesarrollo,
  bloquearActividadParaEquipos,
  buscarMembresiaConPermisos,
  exigirAccion,
  lanzarSiRechazada,
  listarMiembros,
  obtenerLimitesEquipo,
  type ActividadParaEquipos,
  type MembresiaActor,
  type MiembroDeActividad,
} from '../actividades/actividades.service.js'
import type { ResultadoAutorizacion } from '../actividades/capacidades.js'
import { registrarEvento } from '../historial/historial.service.js'
import type { CambiosEquipo } from './validacion.js'

// Módulo de Equipos (docs/diseno-desarrollo-nucleo.md §8). Es dueño de las
// tablas `equipos` e `integrantes_equipo`; de la actividad y de las membresías
// solo conoce lo que expone la capa de servicios de Actividades.
//
// Toda escritura sigue los cinco pasos de nucleo §2.3, dentro de una
// transacción que empieza tomando la fila de la actividad (FOR UPDATE): cargar,
// autorizar con la función de capacidades, verificar las reglas que el
// esquema no expresa (general §4.6), escribir y registrar el evento. Los
// permisos salen del rol, de los permisos del co-organizador y del estado de la
// función formacion_equipos; la actividad no tiene ni se le consulta ningún
// "tipo".

type ClienteBD = Prisma.TransactionClient

const MENSAJE_FORMACION = 'Los equipos no pueden modificarse en esta fase.'

function esNombreDuplicado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

// Los equipos en orden de creación con sus integrantes, y quiénes quedan sin
// equipo. Un integrante con la membresía desactivada conserva su fila (su
// lugar y su autoría) pero no aparece ni cuenta: sale del equipo a efectos de
// equilibrio, de "sin equipo" y de la transición automática, y al reactivarse
// vuelve a su equipo.
async function cargarEquipos(
  cliente: ClienteBD,
  idActividad: string,
): Promise<Pick<ListaEquipos, 'equipos' | 'sinEquipo'>> {
  const [filas, miembros] = await Promise.all([
    cliente.equipo.findMany({
      where: { idActividad },
      orderBy: { orden: 'asc' },
      include: { integrantes: { select: { idMembresia: true } } },
    }),
    listarMiembros(idActividad, cliente),
  ])

  const equipoDe = new Map<string, string>()
  for (const fila of filas) {
    for (const integrante of fila.integrantes) equipoDe.set(integrante.idMembresia, fila.idEquipo)
  }

  const equipos: Equipo[] = filas.map((fila) => ({
    id: fila.idEquipo,
    nombre: fila.nombre,
    descripcionActividad: fila.descripcionActividad,
    formaDeTrabajo: fila.formaDeTrabajo,
    integrantes: [],
  }))
  const porId = new Map(equipos.map((equipo) => [equipo.id, equipo]))

  const sinEquipo: ListaEquipos['sinEquipo'] = []
  for (const miembro of miembros) {
    if (!miembro.activa) continue
    const idEquipo = equipoDe.get(miembro.idMembresia)
    if (idEquipo) {
      porId.get(idEquipo)?.integrantes.push({
        idMembresia: miembro.idMembresia,
        nombre: miembro.nombre,
        rol: miembro.rol,
      })
    } else if (miembro.rol === 'participante') {
      sinEquipo.push({ idMembresia: miembro.idMembresia, nombre: miembro.nombre })
    }
  }

  return { equipos, sinEquipo }
}

// GET /api/actividades/{id}/equipos: la lista, con la membresía de quien
// consulta para que la pantalla sepa cuál es su equipo.
export async function listarEquipos(
  idActividad: string,
  idMiMembresia: string,
): Promise<ListaEquipos> {
  return {
    idMiMembresia,
    limites: await obtenerLimitesEquipo(idActividad),
    ...(await cargarEquipos(prisma, idActividad)),
  }
}

async function obtenerEquipo(
  cliente: ClienteBD,
  idActividad: string,
  idEquipo: string,
): Promise<Equipo> {
  const { equipos } = await cargarEquipos(cliente, idActividad)
  const equipo = equipos.find((e) => e.id === idEquipo)
  if (!equipo) throw new ErrorEquipoNoEncontrado()
  return equipo
}

// ---------------------------------------------------------------------------
// Piezas comunes de escritura
// ---------------------------------------------------------------------------

// Cuando quien actúa puede por dos caminos (gestionar equipos, o el
// autoservicio sobre sí mismo), y ninguno está abierto, se informa el motivo
// del camino que le corresponde por rol: el participante no tiene otro que
// elegir_equipo; quien organiza, el de gestión.
function rechazoRelevante(
  membresia: MembresiaActor,
  gestion: ResultadoAutorizacion,
  autoservicio: ResultadoAutorizacion,
): ResultadoAutorizacion {
  return membresia.rol === 'participante' ? autoservicio : gestion
}

// Mover o retirar a alguien: quien gestiona equipos lo hace con cualquiera,
// en formación y en desarrollo; cada persona puede, además, hacerlo consigo
// misma con la función autogestionada. Sobre otra persona solo cuenta la
// gestión.
function exigirAsignacion(
  membresia: MembresiaActor,
  actividad: ActividadParaEquipos,
  idMembresiaObjetivo: string,
): void {
  const { estado, formacionEquipos } = actividad
  const gestion = autorizarAccion(membresia, 'asignar_integrantes', estado, formacionEquipos)
  if (gestion.concedido) return

  const esUnoMismo = idMembresiaObjetivo === membresia.idMembresia
  const autoservicio = esUnoMismo
    ? autorizarAccion(membresia, 'elegir_equipo', estado, formacionEquipos)
    : gestion
  if (autoservicio.concedido) return
  lanzarSiRechazada(rechazoRelevante(membresia, gestion, autoservicio), MENSAJE_FORMACION)
}

async function contarIntegrantesActivos(
  tx: ClienteBD,
  idActividad: string,
  idEquipo: string,
): Promise<number> {
  const filas = await tx.integranteEquipo.findMany({
    where: { idEquipo },
    select: { idMembresia: true },
  })
  const activos = new Set(
    (await listarMiembros(idActividad, tx)).filter((m) => m.activa).map((m) => m.idMembresia),
  )
  return filas.filter((f) => activos.has(f.idMembresia)).length
}

// Ubica a una membresía en un equipo, sacándola del anterior si lo tenía.
// Devuelve false, sin escribir ni registrar nada, si ya estaba ahí.
async function colocarIntegrante(
  tx: ClienteBD,
  actividad: ActividadParaEquipos,
  equipo: { idEquipo: string; nombre: string },
  miembro: MiembroDeActividad,
  idUsuarioActor: string,
): Promise<boolean> {
  const previo = await tx.integranteEquipo.findUnique({
    where: { idMembresia: miembro.idMembresia },
    include: { equipo: { select: { idEquipo: true, nombre: true } } },
  })
  if (previo?.idEquipo === equipo.idEquipo) return false

  // El máximo de integrantes se aplica a todos, también a quien organiza
  // (P-27). Cuentan los integrantes activos: un desactivado no ocupa lugar.
  const maximo = actividad.limites.maximo
  if (
    maximo !== null &&
    (await contarIntegrantesActivos(tx, actividad.idActividad, equipo.idEquipo)) >= maximo
  ) {
    throw new ErrorEquipoLleno(maximo)
  }

  if (previo) {
    await tx.integranteEquipo.delete({
      where: {
        idEquipo_idMembresia: { idEquipo: previo.idEquipo, idMembresia: miembro.idMembresia },
      },
    })
  }
  await tx.integranteEquipo.create({
    data: { idEquipo: equipo.idEquipo, idMembresia: miembro.idMembresia },
  })

  await registrarEvento(tx, {
    idActividad: actividad.idActividad,
    tipoActor: 'usuario',
    idUsuarioActor,
    tipoEvento: 'integrante_asignado',
    tipoEntidad: 'equipo',
    idEntidad: equipo.idEquipo,
    datos: {
      idMembresia: miembro.idMembresia,
      nombre: miembro.nombre,
      equipoAnterior: previo ? { id: previo.equipo.idEquipo, nombre: previo.equipo.nombre } : null,
      equipoNuevo: { id: equipo.idEquipo, nombre: equipo.nombre },
    },
    categoria: 'estructura',
  })
  return true
}

interface EstadoDeEquipos {
  equipos: { id: string; nombre: string; integrantes: number }[]
  participantesSinEquipo: MiembroDeActividad[]
}

// Equipos en orden de creación con cuántos integrantes activos tiene cada uno,
// y los participantes activos sin equipo en orden de incorporación (nucleo
// §8.3, paso 1). Un desactivado no cuenta en ninguna de las dos cosas.
async function leerEstadoDeEquipos(tx: ClienteBD, idActividad: string): Promise<EstadoDeEquipos> {
  const { equipos, sinEquipo } = await cargarEquipos(tx, idActividad)
  const miembros = await listarMiembros(idActividad, tx)
  const porId = new Map(miembros.map((m) => [m.idMembresia, m]))
  return {
    equipos: equipos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      integrantes: e.integrantes.length,
    })),
    participantesSinEquipo: sinEquipo.map((p) => porId.get(p.idMembresia)!),
  }
}

// Simula, sin escribir nada, el conteo final de cada equipo (los que ya
// existían más lo que decida el reparto, equipos nuevos incluidos) para
// decidir si cerrar la formación dejaría a alguno por debajo de
// TAMANO_MINIMO_EQUIPO (P-27 resuelta). Cuenta también a los equipos que ya
// estaban así desde antes, aunque el reparto no los toque: el piso rige al
// cerrar, no solo para lo que el reparto acaba de mover.
function algunEquipoQuedaBajoMinimo(
  equipos: { id: string; integrantes: number }[],
  asignaciones: readonly AsignacionReparto[],
  equiposNuevos: readonly string[],
): boolean {
  const conteos = new Map(equipos.map((e) => [e.id, e.integrantes]))
  for (const id of equiposNuevos) conteos.set(id, 0)
  for (const asignacion of asignaciones) {
    conteos.set(asignacion.idEquipo, (conteos.get(asignacion.idEquipo) ?? 0) + 1)
  }
  return [...conteos.values()].some((cantidad) => cantidad < TAMANO_MINIMO_EQUIPO)
}

// Formación → Desarrollo de forma automática (nucleo §7.4): con la función en
// autogestionado, en cuanto nadie queda sin equipo. Se evalúa al final de toda
// escritura que pueda dejar a alguien con equipo. Requiere al menos un equipo
// y un participante: sin ellos "nadie sin equipo" es vacuo y no hay a quién
// pasar a desarrollo. El actor del evento es el sistema. Tampoco pasa a
// desarrollo con algún equipo por debajo de TAMANO_MINIMO_EQUIPO (P-27
// resuelta): a diferencia de cerrarFormacion, aquí no hay nada que rechazar
// con un error — la actividad simplemente se queda en formación hasta que
// quien organiza lo resuelva a mano.
async function cerrarSiNadieQuedaSinEquipo(
  tx: ClienteBD,
  actividad: ActividadParaEquipos,
): Promise<boolean> {
  if (actividad.estado !== 'formacion_equipos' || actividad.formacionEquipos !== 'autogestionado') {
    return false
  }
  const { equipos, participantesSinEquipo } = await leerEstadoDeEquipos(tx, actividad.idActividad)
  if (equipos.length === 0 || participantesSinEquipo.length > 0) return false
  if (algunEquipoQuedaBajoMinimo(equipos, [], [])) return false

  const miembros = await listarMiembros(actividad.idActividad, tx)
  if (!miembros.some((m) => m.activa && m.rol === 'participante')) return false

  return avanzarAFaseDesarrollo(tx, actividad.idActividad, { tipo: 'sistema' }, 'sin_rezagados')
}

async function encontrarMiembro(
  tx: ClienteBD,
  idActividad: string,
  idMembresia: string,
): Promise<MiembroDeActividad | undefined> {
  return (await listarMiembros(idActividad, tx)).find((m) => m.idMembresia === idMembresia)
}

// Resuelve el equipo y la membresía del actor en su actividad. Las rutas
// /equipos/{id} no pasan por cargarContextoActividad; para quien no es
// miembro de la actividad del equipo la respuesta es la misma que si el
// equipo no existiera (nucleo §3.3).
async function contextoDeEquipo(idEquipo: string, idUsuario: string) {
  const equipo = await prisma.equipo.findUnique({ where: { idEquipo } })
  if (!equipo) throw new ErrorEquipoNoEncontrado()
  const membresia = await buscarMembresiaConPermisos(idUsuario, equipo.idActividad)
  if (!membresia) throw new ErrorEquipoNoEncontrado()
  return { idActividad: equipo.idActividad, membresia }
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

// POST /api/actividades/{id}/equipos (nucleo §8.6): quien gestiona equipos
// crea el equipo sin pertenecer a él; quien no, con la función en
// autogestionado, lo crea y queda dentro (un participante que ya estaba en
// otro equipo se mueve).
export async function crearEquipo(
  idActividad: string,
  nombre: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaActor,
): Promise<Equipo> {
  const idEquipo = await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    const { estado, formacionEquipos } = actividad

    const gestion = autorizarAccion(membresiaActor, 'formar_equipos', estado, formacionEquipos)
    const autoservicio = autorizarAccion(membresiaActor, 'elegir_equipo', estado, formacionEquipos)
    const seUne = !gestion.concedido && autoservicio.concedido
    if (!gestion.concedido && !autoservicio.concedido) {
      lanzarSiRechazada(rechazoRelevante(membresiaActor, gestion, autoservicio), MENSAJE_FORMACION)
    }

    let creado
    try {
      creado = await tx.equipo.create({ data: { idActividad, nombre } })
    } catch (error) {
      if (esNombreDuplicado(error)) throw new ErrorNombreEquipoDuplicado()
      throw error
    }

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'equipo_creado',
      tipoEntidad: 'equipo',
      idEntidad: creado.idEquipo,
      datos: { nombre: creado.nombre },
      categoria: 'estructura',
    })

    if (seUne) {
      const miembro = await encontrarMiembro(tx, idActividad, membresiaActor.idMembresia)
      await colocarIntegrante(tx, actividad, creado, miembro!, idUsuarioActor)
    }

    await cerrarSiNadieQuedaSinEquipo(tx, actividad)
    return creado.idEquipo
  })

  return obtenerEquipo(prisma, idActividad, idEquipo)
}

// PUT /api/equipos/{id}/integrantes/{idMembresia}: asigna o mueve. Quien
// gestiona equipos asigna a cualquiera, en formación y en desarrollo; cada
// persona puede elegir su propio equipo solo con la función autogestionada.
// Quien organiza o co-organiza puede integrar un equipo, pero no está
// obligado a hacerlo (general §7.3).
export async function asignarIntegrante(
  idEquipo: string,
  idMembresiaObjetivo: string,
  idUsuarioActor: string,
): Promise<Equipo> {
  const { idActividad, membresia } = await contextoDeEquipo(idEquipo, idUsuarioActor)

  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    const equipo = await tx.equipo.findUnique({ where: { idEquipo } })
    if (!equipo) throw new ErrorEquipoNoEncontrado()

    exigirAsignacion(membresia, actividad, idMembresiaObjetivo)

    // §4.6: la membresía es de esta actividad y está activa.
    const miembro = await encontrarMiembro(tx, idActividad, idMembresiaObjetivo)
    if (!miembro || !miembro.activa) throw new ErrorMiembroNoAsignable()

    await colocarIntegrante(tx, actividad, equipo, miembro, idUsuarioActor)
    await cerrarSiNadieQuedaSinEquipo(tx, actividad)
  })

  return obtenerEquipo(prisma, idActividad, idEquipo)
}

// POST /api/actividades/{id}/equipos/intercambio: dos personas de equipos
// distintos se cambian de lugar en una sola operación. Es la única forma de
// moverlas cuando ambos equipos están llenos (con el máximo de integrantes, P-27,
// ninguna puede entrar a un equipo lleno) y, ya en desarrollo, cuando nadie
// puede quedar sin equipo. El tamaño de los dos equipos no cambia, así que
// respeta el máximo. Es gestión de equipos: la acción de asignar integrantes.
export async function intercambiarIntegrantes(
  idActividad: string,
  idMembresiaA: string,
  idMembresiaB: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    exigirAccion(
      membresiaActor,
      'asignar_integrantes',
      actividad.estado,
      'Los equipos no pueden modificarse en esta fase.',
      actividad.formacionEquipos,
    )

    if (idMembresiaA === idMembresiaB) throw new ErrorIntercambioInvalido()

    const miembros = await listarMiembros(idActividad, tx)
    const miembroA = miembros.find((m) => m.idMembresia === idMembresiaA)
    const miembroB = miembros.find((m) => m.idMembresia === idMembresiaB)
    if (!miembroA || !miembroA.activa || !miembroB || !miembroB.activa) {
      throw new ErrorMiembroNoAsignable()
    }

    const filas = await tx.integranteEquipo.findMany({
      where: { idMembresia: { in: [idMembresiaA, idMembresiaB] } },
      include: { equipo: { select: { idEquipo: true, nombre: true, idActividad: true } } },
    })
    const filaA = filas.find((f) => f.idMembresia === idMembresiaA)
    const filaB = filas.find((f) => f.idMembresia === idMembresiaB)
    if (
      !filaA ||
      !filaB ||
      filaA.equipo.idActividad !== idActividad ||
      filaB.equipo.idActividad !== idActividad ||
      filaA.idEquipo === filaB.idEquipo
    ) {
      throw new ErrorIntercambioInvalido()
    }

    // La unicidad es por membresía: se borran las dos filas antes de crear las
    // cruzadas.
    await tx.integranteEquipo.deleteMany({
      where: { idMembresia: { in: [idMembresiaA, idMembresiaB] } },
    })
    await tx.integranteEquipo.createMany({
      data: [
        { idEquipo: filaB.idEquipo, idMembresia: idMembresiaA },
        { idEquipo: filaA.idEquipo, idMembresia: idMembresiaB },
      ],
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'integrantes_intercambiados',
      tipoEntidad: 'actividad',
      idEntidad: idActividad,
      datos: {
        a: {
          idMembresia: idMembresiaA,
          nombre: miembroA.nombre,
          de: { id: filaA.equipo.idEquipo, nombre: filaA.equipo.nombre },
          a: { id: filaB.equipo.idEquipo, nombre: filaB.equipo.nombre },
        },
        b: {
          idMembresia: idMembresiaB,
          nombre: miembroB.nombre,
          de: { id: filaB.equipo.idEquipo, nombre: filaB.equipo.nombre },
          a: { id: filaA.equipo.idEquipo, nombre: filaA.equipo.nombre },
        },
      },
      categoria: 'estructura',
    })
  })
}

// DELETE /api/equipos/{id}/integrantes/{idMembresia}: saca a alguien de un
// equipo. Quien organiza o co-organiza puede salir siempre; un participante,
// solo durante la formación (después pertenece siempre a un equipo, general
// §4.6, y solo se mueve). Idempotente: retirar a quien no integra el equipo no
// escribe nada.
export async function retirarIntegrante(
  idEquipo: string,
  idMembresiaObjetivo: string,
  idUsuarioActor: string,
): Promise<Equipo> {
  const { idActividad, membresia } = await contextoDeEquipo(idEquipo, idUsuarioActor)

  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    const equipo = await tx.equipo.findUnique({ where: { idEquipo } })
    if (!equipo) throw new ErrorEquipoNoEncontrado()

    exigirAsignacion(membresia, actividad, idMembresiaObjetivo)

    const miembro = await encontrarMiembro(tx, idActividad, idMembresiaObjetivo)
    if (!miembro) throw new ErrorMiembroNoAsignable()
    // Durante la formación un participante puede quedar sin equipo (es lo que
    // pasa antes de asignarlo). Ya en desarrollo pertenece siempre a uno
    // (general §4.6) y solo se mueve.
    if (miembro.rol === 'participante' && actividad.estado !== 'formacion_equipos') {
      throw new ErrorParticipanteRequiereEquipo()
    }

    const fila = await tx.integranteEquipo.findUnique({
      where: { idEquipo_idMembresia: { idEquipo, idMembresia: idMembresiaObjetivo } },
    })
    if (!fila) return

    await tx.integranteEquipo.delete({
      where: { idEquipo_idMembresia: { idEquipo, idMembresia: idMembresiaObjetivo } },
    })
    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'integrante_retirado',
      tipoEntidad: 'equipo',
      idEntidad: idEquipo,
      datos: {
        idMembresia: miembro.idMembresia,
        nombre: miembro.nombre,
        equipo: { id: equipo.idEquipo, nombre: equipo.nombre },
      },
      categoria: 'estructura',
    })
  })

  return obtenerEquipo(prisma, idActividad, idEquipo)
}

// PATCH /api/equipos/{id}: nombre, descripción y forma de trabajo. Quien
// gestiona equipos edita cualquiera; un participante, solo el suyo (§8.5).
export async function editarEquipo(
  idEquipo: string,
  cambios: CambiosEquipo,
  idUsuarioActor: string,
): Promise<Equipo> {
  const { idActividad, membresia } = await contextoDeEquipo(idEquipo, idUsuarioActor)

  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    exigirAccion(
      membresia,
      'editar_equipo',
      actividad.estado,
      'El equipo no puede editarse en esta fase.',
      actividad.formacionEquipos,
    )

    const actual = await tx.equipo.findUnique({ where: { idEquipo } })
    if (!actual) throw new ErrorEquipoNoEncontrado()

    // Que sea el equipo del propio participante depende de datos: lo verifica
    // el servicio, no la tabla de capacidades (nucleo §2.1).
    if (membresia.rol === 'participante') {
      const integra = await tx.integranteEquipo.findUnique({
        where: { idEquipo_idMembresia: { idEquipo, idMembresia: membresia.idMembresia } },
      })
      if (!integra) throw new ErrorAccionNoPermitida()
    }

    const antes: Record<string, string | null> = {}
    const despues: Record<string, string | null> = {}
    for (const campo of ['nombre', 'descripcionActividad', 'formaDeTrabajo'] as const) {
      const nuevo = cambios[campo]
      if (nuevo !== undefined && nuevo !== actual[campo]) {
        antes[campo] = actual[campo]
        despues[campo] = nuevo
      }
    }
    if (Object.keys(despues).length === 0) return

    try {
      await tx.equipo.update({ where: { idEquipo }, data: despues })
    } catch (error) {
      if (esNombreDuplicado(error)) throw new ErrorNombreEquipoDuplicado()
      throw error
    }

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'equipo_modificado',
      tipoEntidad: 'equipo',
      idEntidad: idEquipo,
      datos: { nombre: actual.nombre, antes, despues },
      categoria: 'estructura',
    })
  })

  return obtenerEquipo(prisma, idActividad, idEquipo)
}

// DELETE /api/equipos/{id}: elimina el equipo, solo durante la formación.
// Sus integrantes quedan sin equipo, que en formación es un estado válido; en
// esa fase el equipo no tiene contenido que perder (el espacio de equipo llega
// con el desarrollo). El evento conserva lo eliminado, con sus integrantes.
export async function eliminarEquipo(idEquipo: string, idUsuarioActor: string): Promise<void> {
  const { idActividad, membresia } = await contextoDeEquipo(idEquipo, idUsuarioActor)

  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    exigirAccion(
      membresia,
      'formar_equipos',
      actividad.estado,
      'Los equipos solo pueden eliminarse durante la formación.',
      actividad.formacionEquipos,
    )

    const equipo = await tx.equipo.findUnique({
      where: { idEquipo },
      include: { integrantes: { select: { idMembresia: true } } },
    })
    if (!equipo) throw new ErrorEquipoNoEncontrado()

    const nombreMiembro = new Map(
      (await listarMiembros(idActividad, tx)).map((m) => [m.idMembresia, m.nombre]),
    )
    await tx.equipo.delete({ where: { idEquipo } })
    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'equipo_eliminado',
      tipoEntidad: 'equipo',
      idEntidad: idEquipo,
      datos: {
        nombre: equipo.nombre,
        descripcionActividad: equipo.descripcionActividad,
        formaDeTrabajo: equipo.formaDeTrabajo,
        integrantes: equipo.integrantes.map((i) => ({
          idMembresia: i.idMembresia,
          nombre: nombreMiembro.get(i.idMembresia) ?? '',
        })),
      },
      categoria: 'estructura',
    })
  })
}

// POST /api/actividades/{id}/formacion/cierre (nucleo §7.4 y §7.7): cierra la
// formación por acción de quien organiza. Requiere al menos un equipo. Reparte
// entre los equipos a quienes quedaron sin uno, con un solo evento del
// sistema (§8.3), y pasa a desarrollo. Vale en los tres estados de la función.
export async function cerrarFormacion(
  idActividad: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    exigirAccion(
      membresiaActor,
      'cerrar_formacion',
      actividad.estado,
      'La formación de equipos no está abierta en esta actividad.',
      actividad.formacionEquipos,
    )

    const { equipos, participantesSinEquipo } = await leerEstadoDeEquipos(tx, idActividad)
    if (equipos.length === 0) throw new ErrorSinEquipos()

    // Con un máximo de integrantes, si todos los equipos están llenos se crean
    // los equipos nuevos que hagan falta (P-27); vacío si nadie quedó sin
    // equipo. Se calcula antes de rechazar o escribir nada: el piso de
    // TAMANO_MINIMO_EQUIPO (P-27 resuelta) se revisa sobre el resultado final
    // —equipos que ya existían incluidos, no solo lo que el reparto mueve—
    // y si lo viola no se crea ningún equipo ni se asigna a nadie.
    const { asignaciones, equiposNuevos } = repartirConMaximo(
      equipos.map((e) => ({ id: e.id, integrantes: e.integrantes })),
      participantesSinEquipo.map((p) => p.idMembresia),
      actividad.limites.maximo,
    )
    if (algunEquipoQuedaBajoMinimo(equipos, asignaciones, equiposNuevos)) {
      throw new ErrorEquipoBajoMinimo()
    }

    if (participantesSinEquipo.length > 0) {
      const nombreEquipo = new Map(equipos.map((e) => [e.id, e.nombre]))
      const idReal = new Map<string, string>()
      const usados = new Set(equipos.map((e) => e.nombre.toLowerCase()))
      const equiposCreados: { id: string; nombre: string }[] = []
      let siguiente = equipos.length + 1
      for (const idProvisional of equiposNuevos) {
        while (usados.has(`equipo ${siguiente}`)) siguiente += 1
        const creado = await tx.equipo.create({
          data: { idActividad, nombre: `Equipo ${siguiente}` },
        })
        usados.add(creado.nombre.toLowerCase())
        idReal.set(idProvisional, creado.idEquipo)
        nombreEquipo.set(creado.idEquipo, creado.nombre)
        equiposCreados.push({ id: creado.idEquipo, nombre: creado.nombre })
      }

      const definitivas = asignaciones.map((a) => ({
        idMembresia: a.idMembresia,
        idEquipo: idReal.get(a.idEquipo) ?? a.idEquipo,
      }))
      await tx.integranteEquipo.createMany({ data: definitivas })

      const nombreMiembro = new Map(participantesSinEquipo.map((p) => [p.idMembresia, p.nombre]))
      await registrarEvento(tx, {
        idActividad,
        tipoActor: 'sistema',
        idUsuarioActor: null,
        tipoEvento: 'reparto_automatico',
        tipoEntidad: 'actividad',
        idEntidad: idActividad,
        datos: {
          asignaciones: definitivas.map((a) => ({
            idMembresia: a.idMembresia,
            nombre: nombreMiembro.get(a.idMembresia) ?? '',
            idEquipo: a.idEquipo,
            nombreEquipo: nombreEquipo.get(a.idEquipo) ?? '',
          })),
          equiposCreados,
          maximo: actividad.limites.maximo,
        },
        categoria: 'estructura',
      })
    }

    await avanzarAFaseDesarrollo(tx, idActividad, { tipo: 'usuario', idUsuario: idUsuarioActor })
  })
}

// POST /api/actividades/{id}/equipos/propuesta (nucleo §8.2, con la decisión
// de producto de materializarla): reparte a todos los participantes activos en
// `numero_equipos_esperado` equipos vacíos, con el orden barajado por una
// semilla, y los deja como equipos normales en formación. Se ajustan con la
// asignación manual, y confirmar es la propia transición a desarrollo: no hay
// estado "borrador".
//
// Si ya había equipos, los reemplaza (en formación no tienen contenido). Con
// menos participantes que equipos esperados propone tantos equipos como
// participantes, para no dejar equipos vacíos. Puede repetirse: cada vez, con
// una semilla nueva. La semilla, el resultado y lo reemplazado quedan en un
// solo evento, de modo que la propuesta se explica y se reproduce.
export async function generarPropuesta(
  idActividad: string,
  semillaSolicitada: number | undefined,
  idUsuarioActor: string,
  membresiaActor: MembresiaActor,
): Promise<PropuestaEquipos> {
  const resultado = await prisma.$transaction(async (tx) => {
    const actividad = await bloquearActividadParaEquipos(tx, idActividad)
    exigirAccion(
      membresiaActor,
      'generar_propuesta_equipos',
      actividad.estado,
      'La propuesta de equipos solo puede generarse durante la formación.',
      actividad.formacionEquipos,
    )

    const miembros = await listarMiembros(idActividad, tx)
    const participantes = miembros.filter((m) => m.activa && m.rol === 'participante')
    const numeroEquipos = numeroEquiposDePropuesta(
      actividad.numeroEquiposEsperado,
      participantes.length,
      actividad.limites.maximo,
    )
    if (numeroEquipos === 0) throw new ErrorPropuestaSinParticipantes()

    const semilla = semillaSolicitada ?? randomInt(0, SEMILLA_MAXIMA + 1)
    const reparto = proponerEquipos(
      participantes.map((p) => p.idMembresia),
      numeroEquipos,
      semilla,
    )

    // Lo que se reemplaza queda en el evento: es el único lugar donde
    // sobrevive. Se leen las filas tal cual, con quienes estén desactivados:
    // su lugar también se pierde al borrar el equipo.
    const nombreMiembro = new Map(miembros.map((m) => [m.idMembresia, m.nombre]))
    const previos = await tx.equipo.findMany({
      where: { idActividad },
      orderBy: { orden: 'asc' },
      include: { integrantes: { select: { idMembresia: true } } },
    })
    await tx.equipo.deleteMany({ where: { idActividad } })

    const propuestos: { nombre: string; integrantes: { idMembresia: string; nombre: string }[] }[] =
      []
    for (let i = 0; i < reparto.length; i += 1) {
      // Uno por uno: `orden` es una secuencia y define el orden de creación.
      const creado = await tx.equipo.create({ data: { idActividad, nombre: `Equipo ${i + 1}` } })
      await tx.integranteEquipo.createMany({
        data: reparto[i].map((idMembresia) => ({ idEquipo: creado.idEquipo, idMembresia })),
      })
      propuestos.push({
        nombre: creado.nombre,
        integrantes: reparto[i].map((idMembresia) => ({
          idMembresia,
          nombre: nombreMiembro.get(idMembresia) ?? '',
        })),
      })
    }

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'propuesta_generada',
      tipoEntidad: 'actividad',
      idEntidad: idActividad,
      datos: {
        semilla,
        numeroEquipos,
        numeroEquiposEsperado: actividad.numeroEquiposEsperado,
        maximo: actividad.limites.maximo,
        equipos: propuestos,
        reemplazados: previos.map((e) => ({
          nombre: e.nombre,
          descripcionActividad: e.descripcionActividad,
          formaDeTrabajo: e.formaDeTrabajo,
          integrantes: e.integrantes.map((i) => ({
            idMembresia: i.idMembresia,
            nombre: nombreMiembro.get(i.idMembresia) ?? '',
          })),
        })),
      },
      categoria: 'estructura',
    })

    return { semilla, numeroEquipos, numeroEquiposEsperado: actividad.numeroEquiposEsperado }
  })

  return {
    ...resultado,
    ...(await listarEquipos(idActividad, membresiaActor.idMembresia)),
  }
}
