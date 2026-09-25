import {
  Prisma,
  type EstadoActividad,
  type EstadoMembresia,
  type RolMembresia,
} from '@prisma/client'
import {
  CONFIGURACION_POR_DEFECTO,
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  esEstadoFormacionEquipos,
  type AccionActividad,
  type EstadoFormacionEquipos,
  type FuncionSeguimiento,
  type PermisoCoorganizador,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorAccionNoPermitida,
  ErrorActividadNoEncontrada,
  ErrorClaveInvalida,
  ErrorFaseNoPermiteAccion,
  ErrorOrganizadorUnico,
  ErrorSinParticipantes,
  ErrorUsuarioNoEncontrado,
  ErrorYaEsMiembro,
} from '../../errores.js'
import { registrarEvento } from '../historial/historial.service.js'
import {
  autorizar,
  capacidadesDe,
  type ContextoActorActividad,
  type MotivoRechazo,
  type ResultadoAutorizacion,
} from './capacidades.js'
import { generarClaveIngreso } from './claveIngreso.js'
import type { DatosCrearActividadValidados } from './validacion.js'
import { aFechaCalendario, finDeDiaEnCDMX } from '../../utilidades/fechas.js'

// Fase que expone la API, calcada de
// apps/web/src/features/actividades/tipos.ts (FaseActividad): las seis fases
// del ciclo de vida (docs/diseno-desarrollo-general.md §6.1). Formación de
// equipos ya no se pliega en inscripción: con Equipos deja de ser transicional
// y las pantallas necesitan distinguirla.
export type FaseActividad =
  'configuracion' | 'inscripcion' | 'formacion_equipos' | 'desarrollo' | 'cierre' | 'archivada'

export type RolActividad = 'organizador' | 'co-organizador' | 'participante'

export interface ActividadRespuesta {
  id: string
  nombre: string
  objetivo: string
  fase: FaseActividad
  rol: RolActividad
  numParticipantes: number
  fechaClave: string
  claveIngreso?: string
  informacionGeneral: string
  fechaInicio: string
  fechaTermino: string
  fechaLimiteInscripcion: string
  plazoCierreDias: number
  numeroEquiposEsperado: number
}

// GET /api/actividades/{id} agrega el conjunto de capacidades del actor y la
// configuración de las ocho funciones a la forma básica de
// ActividadRespuesta (docs/diseno-desarrollo-nucleo.md §4.3 y §7.7). El
// listado (GET /api/actividades) no los incluye: ninguna pantalla que lo
// consume decide acciones por elemento (§4.2, clave de query por id).
export interface ActividadConCapacidades extends ActividadRespuesta {
  capacidades: AccionActividad[]
  configuracion: Record<FuncionSeguimiento, string>
}

// Forma mínima de membresía que necesita la función de autorización: la que
// deja lista middleware/contextoActividad.ts. No importamos el tipo desde
// ahí para no crear una dependencia servicio → middleware; ambos apuntan a
// la misma forma por coincidencia de contrato, no por herencia de tipo.
export interface MembresiaConPermisos {
  rol: RolMembresia
  estado: EstadoMembresia
  permisos: { permiso: PermisoCoorganizador }[]
}

function contextoDe(membresia: MembresiaConPermisos): ContextoActorActividad {
  return {
    rol: membresia.rol,
    estadoMembresia: membresia.estado,
    permisos: new Set(membresia.permisos.map((p) => p.permiso)),
  }
}

// Traduce el resultado de autorizar() a la respuesta de la API
// (docs/diseno-desarrollo-nucleo.md §3.3): 409 si es la fase la que impide
// la acción, 403 si es el rol.
function lanzarErrorDeAutorizacion(motivo: MotivoRechazo, mensajeFase: string): never {
  if (motivo === 'fase') throw new ErrorFaseNoPermiteAccion(mensajeFase)
  if (motivo === 'funcion') {
    throw new ErrorFaseNoPermiteAccion(
      'La configuración actual de la formación de equipos no permite esta acción.',
    )
  }
  throw new ErrorAccionNoPermitida()
}

// Punto de entrada de autorización para otros módulos (Seguimiento
// decide sobre sus propios datos, pero la matriz de permisos de la actividad
// es de este módulo: nucleo §2.2, "una sola función"). Lanza el error de
// dominio que corresponde; si no lanza, la acción está concedida.
export function exigirAccion(
  membresia: MembresiaConPermisos,
  accion: AccionActividad,
  estado: EstadoActividad,
  mensajeFase: string,
  formacionEquipos?: EstadoFormacionEquipos,
): void {
  const resultado = autorizar(contextoDe(membresia), accion, { estado, formacionEquipos })
  if (!resultado.concedido) lanzarErrorDeAutorizacion(resultado.motivo, mensajeFase)
}

// Variante de exigirAccion que no lanza: para quien decide entre dos caminos
// según lo que el actor pueda hacer (por ejemplo, un participante que crea un
// equipo por elegir_equipo y quien organiza por formar_equipos). La decisión
// sigue siendo de autorizar(): esto solo la expone.
export function autorizarAccion(
  membresia: MembresiaConPermisos,
  accion: AccionActividad,
  estado: EstadoActividad,
  formacionEquipos?: EstadoFormacionEquipos,
): ResultadoAutorizacion {
  return autorizar(contextoDe(membresia), accion, { estado, formacionEquipos })
}

// Lanza el error de dominio que corresponde a un rechazo ya calculado.
export function lanzarSiRechazada(resultado: ResultadoAutorizacion, mensajeFase: string): void {
  if (!resultado.concedido) lanzarErrorDeAutorizacion(resultado.motivo, mensajeFase)
}

const FASE_POR_ESTADO: Record<EstadoActividad, FaseActividad> = {
  configuracion: 'configuracion',
  inscripcion: 'inscripcion',
  formacion_equipos: 'formacion_equipos',
  desarrollo: 'desarrollo',
  cierre: 'cierre',
  archivada: 'archivada',
}

const ROL_POR_ROL_MEMBRESIA: Record<RolMembresia, RolActividad> = {
  organizador: 'organizador',
  co_organizador: 'co-organizador',
  participante: 'participante',
}

interface ActividadConMembresiasYConteo {
  idActividad: string
  nombre: string
  objetivo: string
  informacionGeneral: string
  fechaInicio: Date
  fechaTermino: Date
  fechaLimiteInscripcion: Date
  plazoCierreDias: number
  numeroEquiposEsperado: number
  estado: EstadoActividad
  claveIngreso: string | null
  membresias: { rol: RolMembresia }[]
}

interface ActividadConMembresiasYConfiguracion extends ActividadConMembresiasYConteo {
  configuracion: { funcion: FuncionSeguimiento; estado: string }[]
}

const INCLUIR_MEMBRESIAS_Y_CONFIGURACION = {
  membresias: { select: { rol: true as const } },
  configuracion: true as const,
}

// numParticipantes cuenta solo membresías con rol=participante, no toda
// membresía activa: co-organizadores no son "participantes" del trabajo en
// equipo (docs/diseno-desarrollo-nucleo.md §7.7 no lo distingue; al nacer la
// actividad solo existe el organizador, así que ambas lecturas dan 0 aquí).
function aRespuesta(
  actividad: ActividadConMembresiasYConteo,
  rolDelActor: RolMembresia,
): ActividadRespuesta {
  const numParticipantes = actividad.membresias.filter((m) => m.rol === 'participante').length

  return {
    id: actividad.idActividad,
    nombre: actividad.nombre,
    objetivo: actividad.objetivo,
    fase: FASE_POR_ESTADO[actividad.estado],
    rol: ROL_POR_ROL_MEMBRESIA[rolDelActor],
    numParticipantes,
    // Texto derivado, no una columna (docs/diseno-desarrollo-nucleo.md §7.2):
    // igual que apps/web/.../actividades.api.ts construye su mock.
    fechaClave: `Clave: ${actividad.claveIngreso}`,
    claveIngreso: actividad.claveIngreso ?? undefined,
    informacionGeneral: actividad.informacionGeneral,
    fechaInicio: aFechaCalendario(actividad.fechaInicio),
    fechaTermino: aFechaCalendario(actividad.fechaTermino),
    fechaLimiteInscripcion: aFechaCalendario(actividad.fechaLimiteInscripcion),
    plazoCierreDias: actividad.plazoCierreDias,
    numeroEquiposEsperado: actividad.numeroEquiposEsperado,
  }
}

function aMapaConfiguracion(
  filas: { funcion: FuncionSeguimiento; estado: string }[],
): Record<FuncionSeguimiento, string> {
  const mapa = {} as Record<FuncionSeguimiento, string>
  for (const fila of filas) mapa[fila.funcion] = fila.estado
  return mapa
}

// Estado de la función `formacion_equipos` a partir de las filas de
// configuración de la actividad. Un valor que no esté en el catálogo (dato
// corrupto) se trata como ausente: las acciones que dependen de él se cierran.
export function estadoFormacionEquipos(
  filas: { funcion: FuncionSeguimiento; estado: string }[],
): EstadoFormacionEquipos | undefined {
  const estado = filas.find((fila) => fila.funcion === 'formacion_equipos')?.estado
  return esEstadoFormacionEquipos(estado) ? estado : undefined
}

function aRespuestaConCapacidades(
  actividad: ActividadConMembresiasYConfiguracion,
  membresiaActor: MembresiaConPermisos,
): ActividadConCapacidades {
  return {
    ...aRespuesta(actividad, membresiaActor.rol),
    capacidades: capacidadesDe(contextoDe(membresiaActor), {
      estado: actividad.estado,
      formacionEquipos: estadoFormacionEquipos(actividad.configuracion),
    }),
    configuracion: aMapaConfiguracion(actividad.configuracion),
  }
}

async function cargarActividadConMembresiasYConfiguracion(
  idActividad: string,
): Promise<ActividadConMembresiasYConfiguracion> {
  return prisma.actividad.findUniqueOrThrow({
    where: { idActividad },
    include: INCLUIR_MEMBRESIAS_Y_CONFIGURACION,
  })
}

const INTENTOS_MAXIMOS_CLAVE_INGRESO = 5

function esColisionClaveIngreso(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    (error.meta?.target as string[] | undefined)?.includes('clave_ingreso') === true
  )
}

// Crea la actividad y, en la misma transacción, la membresía de organizador
// para quien la crea (docs/diseno-desarrollo-nucleo.md §7.7). La clave de
// ingreso se genera aquí y no al abrir la inscripción por separado: decisión
// de producto documentada en docs/diseno-desarrollo-general.md §5.1. Se
// reintenta en colisión de unicidad de la clave (§7.2).
export async function crearActividad(
  idUsuarioOrganizador: string,
  datos: DatosCrearActividadValidados,
): Promise<ActividadRespuesta> {
  for (let intento = 1; intento <= INTENTOS_MAXIMOS_CLAVE_INGRESO; intento += 1) {
    const claveIngreso = generarClaveIngreso()

    try {
      const actividad = await prisma.$transaction(async (tx) => {
        const creada = await tx.actividad.create({
          data: {
            nombre: datos.nombre,
            objetivo: datos.objetivo,
            informacionGeneral: datos.informacionGeneral,
            fechaInicio: datos.fechaInicio,
            fechaTermino: datos.fechaTermino,
            fechaLimiteInscripcion: datos.fechaLimiteInscripcion,
            plazoCierreDias: datos.plazoCierreDias,
            numeroEquiposEsperado: datos.numeroEquiposEsperado,
            estado: 'inscripcion',
            claveIngreso,
          },
        })

        await tx.membresia.create({
          data: {
            idActividad: creada.idActividad,
            idUsuario: idUsuarioOrganizador,
            rol: 'organizador',
            estado: 'activa',
          },
        })

        // Configuración por defecto de las ocho funciones (P-25, nucleo
        // §7.1 y §7.9): se insertan aquí y no se dejan implícitas, porque
        // una función sin fila no tiene un estado que autorizar() ni el
        // cliente puedan leer.
        await tx.configuracionFuncion.createMany({
          data: Object.entries(CONFIGURACION_POR_DEFECTO).map(([funcion, estado]) => ({
            idActividad: creada.idActividad,
            funcion: funcion as FuncionSeguimiento,
            estado,
          })),
        })

        await registrarEvento(tx, {
          idActividad: creada.idActividad,
          tipoActor: 'usuario',
          idUsuarioActor: idUsuarioOrganizador,
          tipoEvento: 'actividad_creada',
          tipoEntidad: 'actividad',
          idEntidad: creada.idActividad,
          datos: { nombre: creada.nombre },
          categoria: 'estructura',
        })

        return creada
      })

      return aRespuesta({ ...actividad, membresias: [] }, 'organizador')
    } catch (error) {
      if (esColisionClaveIngreso(error) && intento < INTENTOS_MAXIMOS_CLAVE_INGRESO) continue
      throw error
    }
  }

  // Inalcanzable: el bucle anterior siempre retorna o lanza.
  throw new Error('No fue posible generar una clave de ingreso única.')
}

// Actividades donde el actor tiene membresía activa, con su rol en cada una
// (docs/diseno-desarrollo-nucleo.md §7.7, clave de query ['actividades'] de
// §4.2).
export async function listarActividadesDeUsuario(idUsuario: string): Promise<ActividadRespuesta[]> {
  const membresias = await prisma.membresia.findMany({
    where: { idUsuario, estado: 'activa' },
    include: { actividad: { include: { membresias: { select: { rol: true } } } } },
    orderBy: { fechaUnion: 'desc' },
  })

  return membresias.map((membresia) => aRespuesta(membresia.actividad, membresia.rol))
}

export interface VistaPreviaActividad {
  nombre: string
  objetivo: string
  nombreOrganizador: string
}

interface UsuarioNombre {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
}

function nombreCompleto(usuario: UsuarioNombre): string {
  return `${usuario.nombre} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`
}

// Busca la actividad que admite unión con esta clave, en la fase de
// inscripción únicamente: una clave cuya actividad ya avanzó de fase "deja de
// funcionar... y no se reactiva" (docs/diseno-desarrollo-nucleo.md §7.2), así
// que se trata igual que una clave que no corresponde a nada (§7.2, ver
// ErrorClaveInvalida).
async function actividadJoinablePorClave(clave: string) {
  return prisma.actividad.findFirst({ where: { claveIngreso: clave, estado: 'inscripcion' } })
}

// GET /api/claves/{clave} (docs/diseno-desarrollo-nucleo.md §7.7 y §3.3): la
// única ruta de la API que no exige membresía, así que devuelve solo lo
// mínimo para decidir si unirse — nombre, objetivo y quién organiza — y nada
// que permita distinguir esta actividad de otra ajena.
export async function buscarActividadPorClave(clave: string): Promise<VistaPreviaActividad> {
  const actividad = await actividadJoinablePorClave(clave)
  if (!actividad) throw new ErrorClaveInvalida()

  const organizador = await prisma.membresia.findFirst({
    where: { idActividad: actividad.idActividad, rol: 'organizador' },
    include: {
      usuario: { select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true } },
    },
  })
  // Toda actividad tiene exactamente una membresía de organizador
  // (docs/diseno-desarrollo-general.md §4.6): si falta, es un dato
  // inconsistente y no una clave inválida.
  if (!organizador) throw new Error('La actividad no tiene organizador.')

  return {
    nombre: actividad.nombre,
    objetivo: actividad.objetivo,
    nombreOrganizador: nombreCompleto(organizador.usuario),
  }
}

// POST /api/claves/{clave}/union (docs/diseno-desarrollo-nucleo.md §7.7): se
// une como participante. La colisión de unicidad (idActividad, idUsuario) es
// la fuente de verdad de "ya es miembro" y no una comprobación previa, para
// no dejar una ventana entre leer y escribir.
export async function unirseConClave(
  clave: string,
  idUsuario: string,
): Promise<ActividadRespuesta> {
  const actividad = await actividadJoinablePorClave(clave)
  if (!actividad) throw new ErrorClaveInvalida()

  try {
    await prisma.membresia.create({
      data: {
        idActividad: actividad.idActividad,
        idUsuario,
        rol: 'participante',
        estado: 'activa',
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ErrorYaEsMiembro()
    }
    throw error
  }

  const actividadActualizada = await prisma.actividad.findUniqueOrThrow({
    where: { idActividad: actividad.idActividad },
    include: { membresias: { select: { rol: true } } },
  })

  return aRespuesta(actividadActualizada, 'participante')
}

// GET /api/actividades/{id} (docs/diseno-desarrollo-nucleo.md §7.7):
// actividad, configuración y capacidades del actor. middleware/contextoActividad.ts
// ya resolvió que el actor es miembro; aquí solo se construye la respuesta.
export async function obtenerActividadPorId(
  idActividad: string,
  membresiaActor: MembresiaConPermisos,
): Promise<ActividadConCapacidades> {
  const actividad = await cargarActividadConMembresiasYConfiguracion(idActividad)
  return aRespuestaConCapacidades(actividad, membresiaActor)
}

export type ActorTransicion = { tipo: 'usuario'; idUsuario: string } | { tipo: 'sistema' }

// Escritura y evento de la transición Inscripción → Formación, compartidos
// entre el disparo manual (cerrarInscripcion) y el automático por
// vencimiento de fecha (transicionarActividadesVencidas). Ambos casos
// escriben el mismo cambio; lo único que varía es el actor del evento
// (docs/diseno-desarrollo-general.md §6.1, "las transiciones automáticas
// por fecha son eventos del sistema").
async function escribirCierreInscripcion(
  tx: Prisma.TransactionClient,
  idActividad: string,
  actor: ActorTransicion,
): Promise<void> {
  await tx.actividad.update({ where: { idActividad }, data: { estado: 'formacion_equipos' } })
  await registrarEvento(tx, {
    idActividad,
    tipoActor: actor.tipo,
    idUsuarioActor: actor.tipo === 'usuario' ? actor.idUsuario : null,
    tipoEvento: 'fase_avanzada',
    tipoEntidad: 'actividad',
    idEntidad: idActividad,
    datos: {
      faseOrigen: 'inscripcion',
      faseDestino: 'formacion_equipos',
      disparadoPor: actor.tipo,
    },
    categoria: 'estructura',
  })
}

// POST /api/actividades/{id}/inscripcion/cierre (docs/diseno-desarrollo-nucleo.md
// §7.4 y §7.7): cierra la inscripción y pasa a formación de equipos. La
// clave de ingreso deja de admitir uniones como efecto colateral del cambio
// de estado (actividadJoinablePorClave solo busca en estado 'inscripcion'),
// no por una escritura aparte.
export async function cerrarInscripcion(
  idActividad: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<ActividadConCapacidades> {
  const actividad = await cargarActividadConMembresiasYConfiguracion(idActividad)

  const resultado = autorizar(contextoDe(membresiaActor), 'cerrar_inscripcion', {
    estado: actividad.estado,
  })
  if (!resultado.concedido) {
    lanzarErrorDeAutorizacion(resultado.motivo, 'La inscripción no está abierta en esta actividad.')
  }

  // Precondición de la transición (§7.4): "al menos un participante". Un
  // solo participante sí basta (caso límite de la misma sección).
  const numParticipantes = actividad.membresias.filter((m) => m.rol === 'participante').length
  if (numParticipantes === 0) throw new ErrorSinParticipantes()

  await prisma.$transaction((tx) =>
    escribirCierreInscripcion(tx, idActividad, { tipo: 'usuario', idUsuario: idUsuarioActor }),
  )

  return obtenerActividadPorId(idActividad, membresiaActor)
}

// Tarea programada de nucleo §7.5: recorre las actividades con la fecha
// límite de inscripción vencida y las hace avanzar, con el sistema como
// actor. Se conserva además la evaluación al leer (autorizar() vuelve a
// comprobar la fase en cerrarInscripcion), como salvaguarda ante un
// disparo atrasado o duplicado de esta tarea.
export async function transicionarActividadesVencidas(
  ahora: Date = new Date(),
): Promise<{ procesadas: number; omitidasPorSinParticipantes: number }> {
  const candidatas = await prisma.actividad.findMany({
    where: { estado: 'inscripcion' },
    include: { membresias: { select: { rol: true } } },
  })

  const vencidas = candidatas.filter(
    (actividad) => finDeDiaEnCDMX(actividad.fechaLimiteInscripcion) <= ahora,
  )

  let procesadas = 0
  let omitidasPorSinParticipantes = 0

  for (const actividad of vencidas) {
    const numParticipantes = actividad.membresias.filter((m) => m.rol === 'participante').length
    // Caso límite de §7.4: la fecha vence sin ningún participante. La
    // transición no ocurre y la actividad permanece en inscripción; no hay
    // mecanismo de aviso al organizador en este incremento (el alcance de
    // correo de nucleo §6.1 no lo contempla).
    if (numParticipantes === 0) {
      omitidasPorSinParticipantes += 1
      continue
    }

    await prisma.$transaction((tx) =>
      escribirCierreInscripcion(tx, actividad.idActividad, { tipo: 'sistema' }),
    )
    procesadas += 1
  }

  return { procesadas, omitidasPorSinParticipantes }
}

// PUT /api/actividades/{id}/configuracion/{funcion} (docs/diseno-desarrollo-nucleo.md
// §7.7 y general §6.2): fija el estado de una función. `estadoNuevo` ya
// llegó validado contra el catálogo de la función (validarDatosConfigurarFuncion).
export async function configurarFuncion(
  idActividad: string,
  funcion: FuncionSeguimiento,
  estadoNuevo: string,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<ActividadConCapacidades> {
  const actividad = await cargarActividadConMembresiasYConfiguracion(idActividad)

  const resultado = autorizar(contextoDe(membresiaActor), 'configurar_funciones', {
    estado: actividad.estado,
  })
  if (!resultado.concedido) {
    lanzarErrorDeAutorizacion(
      resultado.motivo,
      'La configuración no puede modificarse en esta fase.',
    )
  }

  const estadoAnterior = actividad.configuracion.find((c) => c.funcion === funcion)?.estado ?? null

  await prisma.$transaction(async (tx) => {
    await tx.configuracionFuncion.upsert({
      where: { idActividad_funcion: { idActividad, funcion } },
      update: { estado: estadoNuevo },
      create: { idActividad, funcion, estado: estadoNuevo },
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'configuracion_modificada',
      tipoEntidad: 'configuracion_funcion',
      idEntidad: funcion,
      datos: { funcion, estadoAnterior, estadoNuevo },
      categoria: 'estructura',
    })
  })

  return obtenerActividadPorId(idActividad, membresiaActor)
}

// PUT /api/actividades/{id}/coorganizadores/{idUsuario} (docs/diseno-desarrollo-nucleo.md
// §7.6 y §7.7): agrega o promueve. Un participante promovido conserva su
// lugar en un equipo (general §7.3, quien organiza puede integrar uno). Retirar
// el rol (DELETE) queda fuera del incremento de Equipos.
export async function agregarOPromoverCoorganizador(
  idActividad: string,
  idUsuarioObjetivo: string,
  permisosSolicitados: PermisoCoorganizador[] | undefined,
  idUsuarioActor: string,
  membresiaActor: MembresiaConPermisos,
): Promise<ActividadConCapacidades> {
  const actividad = await cargarActividadConMembresiasYConfiguracion(idActividad)

  const resultado = autorizar(contextoDe(membresiaActor), 'agregar_coorganizador', {
    estado: actividad.estado,
  })
  if (!resultado.concedido) {
    lanzarErrorDeAutorizacion(resultado.motivo, 'No puedes agregar co-organizadores en esta fase.')
  }

  const usuarioObjetivo = await prisma.usuario.findUnique({
    where: { idUsuario: idUsuarioObjetivo },
  })
  if (!usuarioObjetivo) throw new ErrorUsuarioNoEncontrado()

  const membresiaObjetivoExistente = await prisma.membresia.findUnique({
    where: { idActividad_idUsuario: { idActividad, idUsuario: idUsuarioObjetivo } },
  })
  // Toda actividad tiene exactamente una membresía de organizador (general
  // §4.6): promover al organizador mismo la dejaría sin ninguna.
  if (membresiaObjetivoExistente?.rol === 'organizador') throw new ErrorOrganizadorUnico()

  const permisos = permisosSolicitados ?? [...PERMISOS_COORGANIZADOR_POR_DEFECTO]

  await prisma.$transaction(async (tx) => {
    const membresiaFinal = await tx.membresia.upsert({
      where: { idActividad_idUsuario: { idActividad, idUsuario: idUsuarioObjetivo } },
      update: { rol: 'co_organizador', estado: 'activa' },
      create: {
        idActividad,
        idUsuario: idUsuarioObjetivo,
        rol: 'co_organizador',
        estado: 'activa',
      },
    })

    // Reemplaza el conjunto completo en vez de aplicar un diff: PUT es la
    // operación idempotente de nucleo §3.1 ("aplica actualizaciones
    // parciales" es PATCH; esta ruta fija el conjunto final de permisos).
    await tx.permisoCoorganizadorMembresia.deleteMany({
      where: { idMembresia: membresiaFinal.idMembresia },
    })
    await tx.permisoCoorganizadorMembresia.createMany({
      data: permisos.map((permiso) => ({ idMembresia: membresiaFinal.idMembresia, permiso })),
    })

    await registrarEvento(tx, {
      idActividad,
      tipoActor: 'usuario',
      idUsuarioActor,
      tipoEvento: 'co_organizador_modificado',
      tipoEntidad: 'membresia',
      idEntidad: membresiaFinal.idMembresia,
      datos: { idUsuario: idUsuarioObjetivo, permisos },
      categoria: 'estructura',
    })
  })

  return obtenerActividadPorId(idActividad, membresiaActor)
}

// ---------------------------------------------------------------------------
// Lo que otros módulos necesitan saber de una actividad y sus miembros. Es la
// única puerta: el módulo de insignias no consulta membresías por su cuenta
// (docs/diseno-desarrollo-general.md §3.4, regla de frontera).
// ---------------------------------------------------------------------------

export interface MembresiaEnActividad {
  idMembresia: string
  idActividad: string
  idUsuario: string
  rol: RolMembresia
  actividad: {
    nombre: string
    estado: EstadoActividad
    fechaTermino: Date
    plazoCierreDias: number
  }
}

/** Membresía activa del usuario en la actividad. Si no existe —o la
 * actividad no existe— lanza el mismo error en ambos casos. */
export async function obtenerMembresiaActiva(
  idUsuario: string,
  idActividad: string,
): Promise<MembresiaEnActividad> {
  const membresia = await prisma.membresia.findFirst({
    where: { idUsuario, idActividad, estado: 'activa' },
    include: {
      actividad: {
        select: { nombre: true, estado: true, fechaTermino: true, plazoCierreDias: true },
      },
    },
  })
  if (!membresia) throw new ErrorActividadNoEncontrada()
  return membresia
}

export interface ParticipanteDeActividad {
  idMembresia: string
  idUsuario: string
  nombre: string
  rol: RolActividad
  fechaUnion: string
}

// Miembros activos con rol participante, que son quienes hacen el trabajo y
// a quienes se reconoce. Organizador y co-organizadores no entran: no
// pertenecen a un equipo (docs/diseno-desarrollo-general.md §7.3, "El
// organizador no integra un equipo").
export async function listarParticipantes(
  idActividad: string,
  cliente: Prisma.TransactionClient = prisma,
): Promise<ParticipanteDeActividad[]> {
  const membresias = await cliente.membresia.findMany({
    where: { idActividad, estado: 'activa', rol: 'participante' },
    include: { usuario: { select: { nombre: true, apellidoPaterno: true } } },
    orderBy: { fechaUnion: 'asc' },
  })
  return membresias.map((m) => ({
    idMembresia: m.idMembresia,
    idUsuario: m.idUsuario,
    nombre: `${m.usuario.nombre} ${m.usuario.apellidoPaterno}`.trim(),
    rol: ROL_POR_ROL_MEMBRESIA[m.rol],
    fechaUnion: m.fechaUnion.toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Lo que Equipos necesita de Actividades (docs/diseno-desarrollo-nucleo.md
// §8): sus tablas son de este módulo y Equipos no las consulta.
// ---------------------------------------------------------------------------

export type MembresiaActor = MembresiaConPermisos & { idMembresia: string }

/** Membresía del usuario en la actividad, activa o no, con sus permisos, o
 * null si no es miembro. Sirve a las rutas que no cuelgan de la actividad
 * (/equipos/{id}), donde no corre cargarContextoActividad; el llamador decide
 * qué responder a un no miembro. */
export async function buscarMembresiaConPermisos(
  idUsuario: string,
  idActividad: string,
): Promise<MembresiaActor | null> {
  return prisma.membresia.findUnique({
    where: { idActividad_idUsuario: { idActividad, idUsuario } },
    include: { permisos: true },
  })
}

export interface MiembroDeActividad {
  idMembresia: string
  nombre: string
  rol: RolActividad
  activa: boolean
}

/** Todas las membresías de la actividad, de cualquier rol y estado, en orden
 * de incorporación. Quien integra un equipo puede ser organizador,
 * co-organizador o participante (general §7.3). */
export async function listarMiembros(
  idActividad: string,
  cliente: Prisma.TransactionClient = prisma,
): Promise<MiembroDeActividad[]> {
  const membresias = await cliente.membresia.findMany({
    where: { idActividad },
    include: { usuario: { select: { nombre: true, apellidoPaterno: true } } },
    orderBy: { fechaUnion: 'asc' },
  })
  return membresias.map((m) => ({
    idMembresia: m.idMembresia,
    nombre: `${m.usuario.nombre} ${m.usuario.apellidoPaterno}`.trim(),
    rol: ROL_POR_ROL_MEMBRESIA[m.rol],
    activa: m.estado === 'activa',
  }))
}

export interface ActividadParaEquipos {
  idActividad: string
  estado: EstadoActividad
  formacionEquipos: EstadoFormacionEquipos | undefined
  numeroEquiposEsperado: number
}

/** Lee la actividad y toma su fila con FOR UPDATE. Toda escritura de Equipos
 * empieza aquí: serializa las escrituras de una misma actividad, de modo que
 * "nadie queda sin equipo" y la transición automática se evalúan sobre un
 * estado que ninguna otra petición está cambiando a la vez. */
export async function bloquearActividadParaEquipos(
  tx: Prisma.TransactionClient,
  idActividad: string,
): Promise<ActividadParaEquipos> {
  await tx.$queryRaw`SELECT 1 FROM actividades WHERE id_actividad = ${idActividad} FOR UPDATE`
  const actividad = await tx.actividad.findUniqueOrThrow({
    where: { idActividad },
    include: { configuracion: true },
  })
  return {
    idActividad,
    estado: actividad.estado,
    formacionEquipos: estadoFormacionEquipos(actividad.configuracion),
    numeroEquiposEsperado: actividad.numeroEquiposEsperado,
  }
}

/** Formación → Desarrollo (nucleo §7.4). Devuelve false, sin escribir nada,
 * si la actividad ya no estaba en formación: una transición no se ejecuta dos
 * veces ni se ejecuta desde otra fase. `motivo` distingue las automáticas. */
export async function avanzarAFaseDesarrollo(
  tx: Prisma.TransactionClient,
  idActividad: string,
  actor: ActorTransicion,
  motivo?: string,
): Promise<boolean> {
  const { count } = await tx.actividad.updateMany({
    where: { idActividad, estado: 'formacion_equipos' },
    data: { estado: 'desarrollo' },
  })
  if (count === 0) return false

  await registrarEvento(tx, {
    idActividad,
    tipoActor: actor.tipo,
    idUsuarioActor: actor.tipo === 'usuario' ? actor.idUsuario : null,
    tipoEvento: 'fase_avanzada',
    tipoEntidad: 'actividad',
    idEntidad: idActividad,
    datos: {
      faseOrigen: 'formacion_equipos',
      faseDestino: 'desarrollo',
      disparadoPor: actor.tipo,
      ...(motivo ? { motivo } : {}),
    },
    categoria: 'estructura',
  })
  return true
}
