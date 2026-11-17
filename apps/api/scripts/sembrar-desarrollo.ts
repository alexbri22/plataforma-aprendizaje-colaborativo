// Datos de demostración para recorrer la aplicación en el navegador con
// varios participantes: un recorrido completo con todas las funciones
// habilitadas, una actividad por etapa, más escenarios puntuales. Crea
// usuarios @seed.local. Se puede
// volver a ejecutar: primero borra lo que creó antes (todo lo que cuelga de
// esos usuarios) y no toca ninguna otra cuenta.
//
//   npm run seed:dev -w apps/api
//
// Todas las cuentas usan la misma contraseña (CONTRASENA).
import {
  PERMISOS_COORGANIZADOR_POR_DEFECTO,
  PLANTILLAS_INSTRUMENTO,
  generarPeriodos,
  repartoEquitativo,
  serializarEstadoEspacioEquipo,
  type ClavePlantilla,
  type ElementoEspacioEquipo,
  type FuncionSeguimiento,
  type Periodicidad,
  type RespuestasBitacora,
  type TipoInstrumento,
} from '@plataforma/shared'
import { prisma } from '../src/data/prisma.js'
import { config } from '../src/config.js'
import {
  buscarMembresiaConPermisos,
  crearActividad,
  nombreCompleto,
} from '../src/services/actividades/actividades.service.js'
import { crearEntradaBitacora as crearEntradaBitacoraDeServicio } from '../src/services/seguimiento/bitacora.service.js'
// Efecto de carga: registra la estructura de calificación por defecto que
// recibe toda actividad al crearse (registrarAlCrearActividad).
import { definirInstrumentos } from '../src/services/evaluacion/ponderacion.service.js'
import { guardarEntrega } from '../src/services/evaluacion/entregas.service.js'
import { responderInstrumento } from '../src/services/evaluacion/respuestas.service.js'
import {
  crearComentarioSobreElemento,
  crearComentarioSobreEntrada,
  crearRetroalimentacionDeEquipo,
} from '../src/services/seguimiento/comentarios.service.js'
import { guardarPublicacion } from '../src/services/seguimiento/publicaciones.service.js'
import { crearElemento as crearElementoDeServicio } from '../src/services/seguimiento/elementos.service.js'
import { hashContrasena } from '../src/services/cuentas/contrasena.js'

const CONTRASENA = 'contrasena-larga'
const DOMINIO = '@seed.local'

// Fuera de localhost (p. ej. producción) hace falta un permiso explícito:
// las cuentas semilla comparten una contraseña conocida y limpiar() borra
// cualquier @seed.local que encuentre cada vez que se corre, así que
// apuntar esto a una base con usuarios reales por accidente sería grave.
// PERMITIR_SEMBRAR_PRODUCCION=si es ese permiso explícito, no un
// descuido: quien lo pasa ya decidió que esa base no tiene nada que
// proteger de esto todavía.
const permitido = process.env.PERMITIR_SEMBRAR_PRODUCCION === 'si'
const esBaseLocal =
  process.env.NODE_ENV !== 'production' && /localhost|127\.0\.0\.1/.test(config.databaseUrl)
if (!permitido && !esBaseLocal) {
  throw new Error(
    'El sembrado es solo para una base de datos local de desarrollo. ' +
      'Para correrlo contra otra base a propósito, pasa PERMITIR_SEMBRAR_PRODUCCION=si.',
  )
}

const NOMBRES = [
  'Ana',
  'Beto',
  'Carla',
  'Diego',
  'Elena',
  'Fer',
  'Gina',
  'Hugo',
  'Irene',
  'Jorge',
  'Karla',
  'Luis',
  'Marta',
  'Nico',
  'Olivia',
  'Pedro',
  'Queta',
  'Rafa',
  'Sofía',
  'Tomás',
  'Ursula',
  'Víctor',
  'Wendy',
  'Ximena',
  'Yair',
  'Zoe',
  'Abel',
  'Brenda',
  'César',
  'Dalia',
  'Emilio',
  'Flor',
  'Gael',
  'Hilda',
  'Iván',
  'Julia',
  'Kevin',
  'Lucía',
  'Mateo',
  'Nora',
]
const APELLIDOS = [
  'Soto',
  'Vega',
  'Rios',
  'Luna',
  'Mora',
  'Paz',
  'Cruz',
  'Gil',
  'Nava',
  'Ortiz',
  'Reyes',
  'Salas',
]

async function crearUsuario(correoLocal: string, nombre: string, apellido: string, hash: string) {
  return prisma.usuario.create({
    data: {
      nombre,
      apellidoPaterno: apellido,
      apellidoMaterno: 'García',
      nivelEstudios: 'licenciatura',
      institucionEducativa: 'UNAM',
      correo: `${correoLocal}${DOMINIO}`,
      contrasena: hash,
    },
  })
}

async function limpiar() {
  const usuarios = await prisma.usuario.findMany({
    where: { correo: { endsWith: DOMINIO } },
    select: { idUsuario: true },
  })
  const ids = usuarios.map((u) => u.idUsuario)
  const propias = await prisma.membresia.findMany({
    where: { idUsuario: { in: ids }, rol: 'organizador' },
    select: { idActividad: true },
  })
  const idsActividades = propias.map((m) => m.idActividad)
  // Borrar una actividad semilla arrastra en cascada todo lo que cuelga de
  // ella. Fuera de localhost, si alguien real ya se unió a una, eso incluye
  // su trabajo: mejor no refrescar que borrarlo.
  if (!esBaseLocal) {
    const ajenas = await prisma.membresia.findMany({
      where: { idActividad: { in: idsActividades }, idUsuario: { notIn: ids } },
      select: { idActividad: true },
      distinct: ['idActividad'],
    })
    if (ajenas.length > 0) {
      throw new Error(
        `No se refresca el sembrado: ${ajenas.length} actividad(es) semilla tienen ` +
          'miembros que no son @seed.local y se borraría su trabajo.',
      )
    }
  }
  await prisma.actividad.deleteMany({
    where: { idActividad: { in: idsActividades } },
  })
  await prisma.usuario.deleteMany({ where: { idUsuario: { in: ids } } })
}

function fecha(diasDesdeHoy: number): Date {
  const hoy = new Date()
  return new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + diasDesdeHoy),
  )
}

// Contenido del espacio de equipo, bitácora y comentarios (nucleo §9.1,
// §9.3, §10.4): a diferencia de equipos e integrantes arriba (que sí
// escriben directo con Prisma, como dato de arranque), este contenido pasa
// por la capa de servicios real — exactamente lo que haría la API — para
// que cada creación emita su evento de historial (nucleo §2.4). Sembrar
// escribiendo la tabla directamente dejaba una actividad con metas, avances
// y bitácora, pero sin una sola fila en `historial`: el panel de Historial
// se veía vacío pese al contenido.
async function crearElementoEspacio(
  idEquipo: string,
  idUsuarioAutor: string,
  tipo: 'metas' | 'avances' | 'recursos',
  contenido: string,
) {
  return crearElementoDeServicio(idEquipo, tipo, contenido, null, idUsuarioAutor)
}

// Las bitácoras del sembrado son guiadas (nucleo §9.3): un texto suelto del sembrado va como
// respuesta a la primera pregunta.
async function crearEntradaBitacora(
  idActividad: string,
  idUsuarioAutor: string,
  respuestas: RespuestasBitacora | string,
) {
  const membresiaActor = await buscarMembresiaConPermisos(idUsuarioAutor, idActividad)
  if (!membresiaActor) {
    throw new Error(
      `Sembrado inconsistente: ${idUsuarioAutor} no tiene membresía en ${idActividad}.`,
    )
  }
  return crearEntradaBitacoraDeServicio(
    { idActividad, estado: 'desarrollo' },
    {
      respuestas:
        typeof respuestas === 'string' ? { conocimientos_adquiridos: respuestas } : respuestas,
    },
    idUsuarioAutor,
    membresiaActor,
  )
}

async function crearComentarioSobreElementoDeSeed(
  idElemento: string,
  idUsuarioAutor: string,
  contenido: string,
) {
  return crearComentarioSobreElemento(idElemento, contenido, idUsuarioAutor)
}

async function crearComentarioSobreEntradaDeSeed(
  idEntrada: string,
  idUsuarioAutor: string,
  contenido: string,
) {
  return crearComentarioSobreEntrada(idEntrada, contenido, idUsuarioAutor)
}

interface Escenario {
  nombre: string
  objetivo?: string
  organizador: string
  participantes: string[]
  coorganizadores?: string[]
  estado: 'inscripcion' | 'formacion_equipos' | 'desarrollo' | 'cierre'
  formacion: 'autogestionado' | 'manual'
  equiposEsperados: number
  limites?: { minimo?: number; maximo?: number }
  // Equipos ya formados: nombre y quiénes los integran.
  equipos?: { nombre: string; integrantes: string[] }[]
  // Por defecto hoy y hoy+60 (abajo). Un escenario que ya debe verse en
  // desarrollo o cierre necesita fechaTermino en el pasado: la ventana de
  // reconocimiento (insignias.service.ts, función ventana()) se calcula a
  // partir de esa fecha y de plazoCierreDias, no del campo estado.
  fechaInicio?: Date
  fechaTermino?: Date
  plazoCierreDias?: number
  // Estado de otras funciones además de formacion_equipos (general §6.2):
  // típicamente bitacora_individual, para los escenarios que la necesitan
  // habilitada (nace deshabilitada por defecto). espacio_equipo no hace
  // falta aquí: nace opcional, que ya basta para crear elementos.
  configuracion?: Partial<Record<FuncionSeguimiento, string>>
}

interface ActividadSembrada {
  idActividad: string
  // Por correo local de la persona.
  membresia: Record<string, string>
  // Por nombre del equipo, tal como se declaró en Escenario.equipos.
  idEquipoPorNombre: Record<string, string>
}

async function sembrar(
  escenario: Escenario,
  idPorCorreo: Map<string, { id: string; nombreCompleto: string }>,
): Promise<ActividadSembrada> {
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id

  const actividad = await crearActividad(
    idUsuario(escenario.organizador),
    idPorCorreo.get(escenario.organizador)!.nombreCompleto,
    {
      nombre: escenario.nombre,
      objetivo: escenario.objetivo ?? 'Mostrar un caso concreto de la plataforma.',
      informacionGeneral: 'Actividad de demostración, creada por el script de sembrado.',
      fechaInicio: escenario.fechaInicio ?? fecha(0),
      fechaTermino: escenario.fechaTermino ?? fecha(60),
      fechaLimiteInscripcion: fecha(7),
      plazoCierreDias: escenario.plazoCierreDias ?? 14,
      numeroEquiposEsperado: escenario.equiposEsperados,
    },
  )

  // crearActividad ya creó la membresía de organizador (general §4.2: "el
  // organizador es la membresía con rol organizador"); se recupera aquí para
  // que el mapa cubra a las tres personas que pueden ser autoras de algo
  // (elementos, bitácora, comentarios), no solo a participantes.
  const membresiaOrganizador = await prisma.membresia.findFirstOrThrow({
    where: { idActividad: actividad.id, rol: 'organizador' },
  })
  const membresia: Record<string, string> = {
    [escenario.organizador]: membresiaOrganizador.idMembresia,
  }
  for (const correoLocal of escenario.participantes) {
    const m = await prisma.membresia.create({
      data: { idActividad: actividad.id, idUsuario: idUsuario(correoLocal), rol: 'participante' },
    })
    membresia[correoLocal] = m.idMembresia
  }
  for (const correoLocal of escenario.coorganizadores ?? []) {
    const m = await prisma.membresia.create({
      data: { idActividad: actividad.id, idUsuario: idUsuario(correoLocal), rol: 'co_organizador' },
    })
    membresia[correoLocal] = m.idMembresia
    await prisma.permisoCoorganizadorMembresia.createMany({
      data: PERMISOS_COORGANIZADOR_POR_DEFECTO.map((permiso) => ({
        idMembresia: m.idMembresia,
        permiso,
      })),
    })
  }

  const funcion: FuncionSeguimiento = 'formacion_equipos'
  await prisma.configuracionFuncion.update({
    where: { idActividad_funcion: { idActividad: actividad.id, funcion } },
    data: { estado: escenario.formacion },
  })
  for (const [otraFuncion, estado] of Object.entries(escenario.configuracion ?? {})) {
    await prisma.configuracionFuncion.update({
      where: {
        idActividad_funcion: {
          idActividad: actividad.id,
          funcion: otraFuncion as FuncionSeguimiento,
        },
      },
      data: { estado },
    })
  }
  await prisma.actividad.update({
    where: { idActividad: actividad.id },
    data: {
      estado: escenario.estado,
      tamanoMinimoEquipo: escenario.limites?.minimo ?? null,
      tamanoMaximoEquipo: escenario.limites?.maximo ?? null,
    },
  })

  const idEquipoPorNombre: Record<string, string> = {}
  for (const equipo of escenario.equipos ?? []) {
    const creado = await prisma.equipo.create({
      data: { idActividad: actividad.id, nombre: equipo.nombre },
    })
    idEquipoPorNombre[equipo.nombre] = creado.idEquipo
    await prisma.integranteEquipo.createMany({
      data: equipo.integrantes.map((c) => ({
        idEquipo: creado.idEquipo,
        idMembresia: membresia[c],
      })),
    })
  }

  console.log(`  ✓ ${escenario.nombre}  (${escenario.estado}, ${escenario.formacion})`)
  return { idActividad: actividad.id, membresia, idEquipoPorNombre }
}

type IdPorCorreo = Map<string, { id: string; nombreCompleto: string }>

// "Estudio de mercado · Un equipo grande con mucho historial": un solo equipo de
// seis, con doce avances y doce entradas de bitácora, todas comentadas.
// Con páginas de 20 no llega a paginar: eso lo cubre "Bitácora muy cargada".
async function sembrarEnDesarrolloEquipoGrande(idPorCorreo: IdPorCorreo) {
  const participantes = ['alumno10', 'alumno11', 'alumno12', 'alumno13', 'alumno14', 'alumno15']
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id

  const { idActividad, idEquipoPorNombre } = await sembrar(
    {
      nombre: 'Estudio de mercado · Un equipo grande con mucho historial',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes,
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      configuracion: { bitacora_individual: 'guiada' },
      equipos: [{ nombre: 'Equipo único', integrantes: participantes }],
      fechaInicio: fecha(-35),
      fechaTermino: fecha(25),
    },
    idPorCorreo,
  )

  const idEquipo = idEquipoPorNombre['Equipo único']

  const metaUnica = await crearElementoEspacio(
    idEquipo,
    idUsuario(participantes[0]),
    'metas',
    'Terminar el análisis de datos y tener la primera gráfica lista para la revisión de la semana 6.',
  )
  const recursoUnico = await crearElementoEspacio(
    idEquipo,
    idUsuario(participantes[1]),
    'recursos',
    'Base de datos pública que estamos usando: datos.ejemplo.gob/dataset-2026',
  )
  await crearComentarioSobreElementoDeSeed(
    metaUnica.id,
    idUsuario('profe'),
    'Buena meta, concreta y con fecha. ¿La gráfica va a ir en el reporte final también?',
  )
  await crearComentarioSobreElementoDeSeed(
    recursoUnico.id,
    idUsuario('profe'),
    'Revisen que el dataset siga vigente, a veces estas fuentes públicas se actualizan sin avisar.',
  )

  const FRASES_AVANCE = [
    'Terminé la parte que me tocaba de la investigación inicial.',
    'Avancé con el borrador, falta la revisión de estilo.',
    'Me atoré con un error raro en los datos, ya lo resolvimos entre dos.',
    'Hoy fue un día lento, retomo con más calma la próxima sesión.',
    'Subí la versión actualizada a la carpeta compartida del equipo.',
    'Platicamos como equipo para repartirnos lo que falta antes de la revisión.',
  ]
  const FRASES_BITACORA = [
    'Me costó entender el formato de los datos que nos tocaron, ya le encontré la lógica.',
    'Hoy avancé poco porque tuve otro examen, mañana le dedico más tiempo.',
    'Me ayudó mucho platicar con el equipo antes de seguir, estaba atorado.',
    'Terminé mi parte antes de lo que pensaba, voy a adelantar la siguiente.',
    'Sigo sin entender bien un punto de la rúbrica, lo voy a preguntar en la próxima sesión.',
    'Buen avance hoy, el equipo está más coordinado que la semana pasada.',
  ]

  const COMENTARIOS_PROFE_AVANCE = [
    'Buen avance, sigue documentando así de claro.',
    '¿Qué tanto cambió el borrador después de la revisión de estilo?',
    'Me alegra que lo resolvieran entre dos, eso también cuenta como avance.',
    'Los días lentos pasan, lo importante es que lo anotes.',
    'Perfecto, así cualquiera del equipo puede retomarlo.',
    'Buena señal que ya se estén organizando mejor como equipo.',
  ]
  const COMENTARIOS_PROFE_BITACORA = [
    'Ya le vas encontrando la lógica, eso es lo que quiero ver aquí.',
    'Pasa, lo importante es que lo registres en vez de omitirlo.',
    'Qué bueno que platicaron antes de seguir, eso evita más atascos.',
    'Buen ritmo, no te confíes y sigue anotando también lo que se dificulta.',
    'Pregúntalo en la próxima sesión, para eso es el espacio.',
    'Se nota la mejora en coordinación del equipo.',
  ]

  // Dos avances y dos entradas por persona (12 de cada uno). Con páginas de
  // 20 no se pagina aquí (eso lo cubre "Bitácora muy cargada"). Profe comenta todo
  // lo que se agrega, para la demo de "qué tanto puede comentar quien
  // organiza o co-organiza" (nucleo §10.4); org además comenta una entrada,
  // para que no todo venga de la misma cuenta.
  for (const [i, correo] of participantes.entries()) {
    const idUsuarioAutor = idUsuario(correo)
    const primerAvance = await crearElementoEspacio(
      idEquipo,
      idUsuarioAutor,
      'avances',
      FRASES_AVANCE[i],
    )
    const segundoAvance = await crearElementoEspacio(
      idEquipo,
      idUsuarioAutor,
      'avances',
      FRASES_AVANCE[(i + 3) % FRASES_AVANCE.length],
    )
    await crearComentarioSobreElementoDeSeed(
      primerAvance.id,
      idUsuario('profe'),
      COMENTARIOS_PROFE_AVANCE[i],
    )
    await crearComentarioSobreElementoDeSeed(
      segundoAvance.id,
      idUsuario('profe'),
      COMENTARIOS_PROFE_AVANCE[(i + 3) % COMENTARIOS_PROFE_AVANCE.length],
    )
    const primeraEntrada = await crearEntradaBitacora(
      idActividad,
      idUsuarioAutor,
      FRASES_BITACORA[i],
    )
    const segundaEntrada = await crearEntradaBitacora(
      idActividad,
      idUsuarioAutor,
      FRASES_BITACORA[(i + 3) % FRASES_BITACORA.length],
    )
    await crearComentarioSobreEntradaDeSeed(
      primeraEntrada.id,
      idUsuario('profe'),
      COMENTARIOS_PROFE_BITACORA[i],
    )
    if (i === 0) {
      await crearComentarioSobreEntradaDeSeed(
        segundaEntrada.id,
        idUsuario('org'),
        'Qué bueno que ya le encontraste el modo. Avísame si se repite el error.',
      )
    } else {
      await crearComentarioSobreEntradaDeSeed(
        segundaEntrada.id,
        idUsuario('profe'),
        COMENTARIOS_PROFE_BITACORA[(i + 3) % COMENTARIOS_PROFE_BITACORA.length],
      )
    }
  }

  console.log('    equipo de 6, 12 avances, 12 entradas de bitácora, todas comentadas')
}

// "Diario de prácticas · Una bitácora con muchas entradas": el caso que motivó
// las tarjetas colapsadas (TarjetaElemento, TarjetaEntradaBitacora, nucleo
// §9.3/§9.1) — una sola persona con más de veinticinco entradas de
// bitácora, para ver de verdad cómo se comporta la pantalla con un volumen
// de contenido que una tarjeta por entrada, siempre expandida, no habría
// aguantado. El equipo también lleva una carga pareja de metas, avances y
// recursos (más de veinte elementos en total).
async function sembrarBitacoraMuyCargada(idPorCorreo: IdPorCorreo) {
  const cargada = 'alumno20'
  const companero = 'alumno21'
  const participantes = [cargada, companero]
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id

  const { idActividad, idEquipoPorNombre } = await sembrar(
    {
      nombre: 'Diario de prácticas · Una bitácora con muchas entradas',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes,
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      configuracion: { bitacora_individual: 'guiada' },
      equipos: [{ nombre: 'Equipo denso', integrantes: participantes }],
      fechaInicio: fecha(-60),
      fechaTermino: fecha(30),
    },
    idPorCorreo,
  )

  const idEquipo = idEquipoPorNombre['Equipo denso']
  const idUsuarioCargada = idUsuario(cargada)

  const FRASES_BITACORA = [
    'Hoy revisé la literatura del tema y encontré tres fuentes buenas.',
    'Avancé con el capítulo dos, todavía falta la conclusión.',
    'Me tardé más de lo esperado armando la encuesta.',
    'Buen día de trabajo, terminé antes de lo que pensaba.',
    'Se me complicó la parte estadística, voy a pedir ayuda en asesoría.',
    'Retomé después de unos días sin avanzar, cuesta volver al ritmo.',
    'Platiqué con mi compañero y nos repartimos lo que falta.',
    'Corregí los comentarios de la revisión anterior.',
    'Día corto, solo alcancé a revisar referencias.',
    'Terminé el borrador completo del capítulo tres.',
  ]
  const FRASES_AVANCE = [
    'Avancé con la introducción del documento.',
    'Terminé la primera versión de los instrumentos.',
    'Revisamos entre los dos la metodología propuesta.',
    'Ajusté el cronograma porque nos atrasamos una semana.',
    'Subí la versión más reciente a la carpeta compartida.',
  ]
  const FRASES_RECURSO = [
    'Plantilla de citas en formato APA: ejemplo.edu/plantilla-apa',
    'Guía de la universidad para el documento final: ejemplo.edu/guia-tesina',
    'Carpeta compartida con las entrevistas transcritas',
  ]
  const FRASES_META = [
    'Tener el capítulo dos completo antes de la siguiente asesoría.',
    'Aplicar la encuesta a por lo menos treinta personas este mes.',
    'Entregar el borrador completo antes del cierre.',
  ]

  // Más de veinticinco entradas en la misma bitácora: el caso que importa
  // demostrar. Un comentario del organizador cada cinco entradas, para ver
  // también cómo se ven varios comentarios repartidos en una lista larga.
  const TOTAL_ENTRADAS = 27
  for (let i = 0; i < TOTAL_ENTRADAS; i++) {
    const entrada = await crearEntradaBitacora(
      idActividad,
      idUsuarioCargada,
      `${FRASES_BITACORA[i % FRASES_BITACORA.length]} (entrada ${i + 1})`,
    )
    if (i % 5 === 0) {
      await crearComentarioSobreEntradaDeSeed(
        entrada.id,
        idUsuario('org'),
        'Buen ritmo. Sigue anotando también lo que se te dificulta, no solo lo que avanzas.',
      )
    }
  }

  const COMENTARIOS_PROFE_AVANCE = [
    'Buen avance, sigue así de constante.',
    'Me gusta que ya tengan una primera versión, ahora a pulirla.',
    'Buena decisión revisarlo juntos antes de seguir.',
    'Está bien ajustar el cronograma a tiempo, mejor eso que apurarse al final.',
    'Perfecto, así queda disponible para los dos.',
  ]

  // El espacio de equipo también cargado: más de veinte elementos entre
  // los tres tipos, repartidos entre los dos integrantes. Profe comenta
  // todo lo que se agrega, misma razón que en sembrarEnDesarrolloEquipoGrande.
  for (let i = 0; i < 10; i++) {
    const autor = i % 2 === 0 ? idUsuarioCargada : idUsuario(companero)
    const avance = await crearElementoEspacio(
      idEquipo,
      autor,
      'avances',
      `${FRASES_AVANCE[i % FRASES_AVANCE.length]} (${i + 1})`,
    )
    await crearComentarioSobreElementoDeSeed(
      avance.id,
      idUsuario('profe'),
      COMENTARIOS_PROFE_AVANCE[i % COMENTARIOS_PROFE_AVANCE.length],
    )
  }
  for (const frase of FRASES_META) {
    const meta = await crearElementoEspacio(idEquipo, idUsuarioCargada, 'metas', frase)
    await crearComentarioSobreElementoDeSeed(
      meta.id,
      idUsuario('profe'),
      'Buena meta, concreta y con fecha. Avísenme si ven que no va a alcanzar el tiempo.',
    )
  }
  for (const frase of FRASES_RECURSO) {
    const recurso = await crearElementoEspacio(idEquipo, idUsuario(companero), 'recursos', frase)
    await crearComentarioSobreElementoDeSeed(
      recurso.id,
      idUsuario('profe'),
      'Buen recurso, agréguenlo también a la carpeta general del grupo si no está ahí.',
    )
  }

  console.log(
    `    bitácora de ${TOTAL_ENTRADAS} entradas en una sola persona, espacio de equipo con 16 elementos`,
  )
}

// ---------------------------------------------------------------------------
// Recorrido completo: actividades con todas las funciones habilitadas, una
// por etapa, para mostrar la plataforma de punta a punta en una reunión.
// Todo el contenido pasa por la capa de servicios (deja historial). Se crea
// con la actividad en desarrollo, como lo haría la gente, y al final se lleva
// a su etapa (cierre o archivada).
// ---------------------------------------------------------------------------

// Todas las funciones habilitadas: bitácora guiada, calificación,
// reconocimientos entre todos y los cinco elementos del espacio de equipo.
const TODO_HABILITADO: Partial<Record<FuncionSeguimiento, string>> = {
  bitacora_individual: 'guiada',
  calificacion: 'habilitada',
  insignias: 'organizador_y_participantes',
  espacio_equipo: serializarEstadoEspacioEquipo({
    metas: 'obligatorio',
    planeacion: 'opcional',
    avances: 'obligatorio',
    recursos: 'opcional',
    producto: 'obligatorio',
  }),
}

// Un calendario de revisiones por elemento (nucleo §9.2), cada uno con su
// periodicidad, entre el inicio y el término de la actividad.
const CALENDARIOS: { elemento: string; periodicidad: Periodicidad }[] = [
  { elemento: 'metas', periodicidad: 'mensual' },
  { elemento: 'planeacion', periodicidad: 'mensual' },
  { elemento: 'avances', periodicidad: 'semanal' },
  { elemento: 'producto', periodicidad: 'mensual' },
  { elemento: 'bitacora', periodicidad: 'quincenal' },
]

async function sembrarCalendarios(idActividad: string, inicio: Date, termino: Date) {
  for (const { elemento, periodicidad } of CALENDARIOS) {
    await prisma.periodoReporte.createMany({
      data: generarPeriodos(inicio, termino, periodicidad).map((p) => ({
        idActividad,
        elemento,
        ...p,
      })),
    })
  }
}

// Un instrumento por aspecto del proceso, quincenal: autoevaluaciones con
// plantilla, la evaluación por pares y actividades externas con su enlace.
const INSTRUMENTOS_PROCESO: { aspecto: string; tipo: TipoInstrumento }[] = [
  { aspecto: 'definicion_responsabilidades', tipo: 'entrevista' },
  { aspecto: 'interdependencia_positiva', tipo: 'cuestionario_autoevaluacion' },
  { aspecto: 'responsabilidad_individual_grupal', tipo: 'coevaluacion' },
  { aspecto: 'interaccion', tipo: 'rubrica' },
  { aspecto: 'evaluacion_grupo_habilidades_sociales', tipo: 'cuestionario_autoevaluacion' },
]

async function sembrarInstrumentos(idActividad: string, idUsuarioOrganizador: string) {
  const actividad = await prisma.actividad.findUniqueOrThrow({ where: { idActividad } })
  const membresia = await buscarMembresiaConPermisos(idUsuarioOrganizador, idActividad)
  for (const { aspecto, tipo } of INSTRUMENTOS_PROCESO) {
    const fila = await prisma.aspectoCalificacion.findFirstOrThrow({
      where: { clave: aspecto, componente: { idActividad } },
    })
    await definirInstrumentos(
      actividad,
      fila.idAspecto,
      { tipo, periodicidad: 'quincenal' },
      idUsuarioOrganizador,
      membresia!,
    )
  }
  // Las actividades externas necesitan su enlace para poder entregarse.
  await prisma.instrumento.updateMany({
    where: { origen: 'enlace', aspecto: { componente: { idActividad } } },
    data: { enlace: 'https://forms.example.com/co3-actividad-externa' },
  })
}

interface EquipoDelRecorrido {
  nombre: string
  integrantes: string[]
  descripcion: string
  metas: string[]
  planeacion: string[]
  avances: string[]
  materiales: string[]
  producto: string
}

interface Recorrido {
  nombre: string
  objetivo: string
  organizador: string
  coorganizadores?: string[]
  equipos: EquipoDelRecorrido[]
  etapa: 'inscripcion' | 'desarrollo' | 'cierre' | 'archivada'
  fechaInicio: Date
  fechaTermino: Date
  // Equipos (por nombre) que ya publicaron su proyecto; solo en cierre o
  // archivada.
  publicados?: string[]
  // Qué tan avanzada va la calificación: nada, lo del desarrollo, o todo.
  calificacion: 'nada' | 'parcial' | 'completa'
}

const RESPUESTAS_BITACORA: RespuestasBitacora[] = [
  {
    conocimientos_adquiridos:
      'Aprendí a dividir el problema en partes que cada quien puede avanzar.',
    tareas_cumplidas: 'Sí, terminé la parte que me tocaba de la investigación.',
    aportacion_concreta: 'Propuse el formato de la tabla donde juntamos los datos.',
  },
  {
    aspecto_mas_dificil: 'Ponernos de acuerdo en el alcance; queríamos abarcar demasiado.',
    duda_pendiente: '¿Cuántas fuentes necesitamos para que el análisis sea confiable?',
  },
  {
    conocimientos_adquiridos: 'Entendí mejor cómo presentar resultados con gráficas sencillas.',
    importancia_cooperar: 'Escuchar primero las ideas de todos nos ahorró rehacer trabajo.',
  },
]

async function sembrarRecorrido(r: Recorrido, idPorCorreo: IdPorCorreo) {
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id
  const conEquipos = r.etapa !== 'inscripcion'
  const participantes = r.equipos.flatMap((e) => e.integrantes)

  const { idActividad, membresia, idEquipoPorNombre } = await sembrar(
    {
      nombre: r.nombre,
      objetivo: r.objetivo,
      organizador: r.organizador,
      coorganizadores: r.coorganizadores,
      participantes,
      estado: conEquipos ? 'desarrollo' : 'inscripcion',
      formacion: 'autogestionado',
      equiposEsperados: r.equipos.length,
      equipos: conEquipos
        ? r.equipos.map((e) => ({ nombre: e.nombre, integrantes: e.integrantes }))
        : undefined,
      configuracion: TODO_HABILITADO,
      fechaInicio: r.fechaInicio,
      fechaTermino: r.fechaTermino,
      plazoCierreDias: 21,
    },
    idPorCorreo,
  )
  await sembrarCalendarios(idActividad, r.fechaInicio, r.fechaTermino)
  await sembrarInstrumentos(idActividad, idUsuario(r.organizador))
  if (!conEquipos) return

  // Lo publicado se reparte en el tiempo desde el inicio, para que Operación
  // de la planeación muestre revisiones completadas, atrasadas y por venir.
  const transcurrido = Math.min(Date.now(), r.fechaTermino.getTime()) - r.fechaInicio.getTime()
  const enElAvance = (fraccion: number) =>
    new Date(r.fechaInicio.getTime() + Math.round(transcurrido * fraccion))

  for (const [e, equipo] of r.equipos.entries()) {
    const idEquipo = idEquipoPorNombre[equipo.nombre]
    const autor = (i: number) => idUsuario(equipo.integrantes[i % equipo.integrantes.length])
    await prisma.equipo.update({
      where: { idEquipo },
      data: { descripcionActividad: equipo.descripcion },
    })

    const crear = async (tipo: ElementoEspacioEquipo, contenido: string, i: number, f: number) => {
      const creado = await crearElementoDeServicio(idEquipo, tipo, contenido, null, autor(i))
      await prisma.elementoEspacioEquipo.update({
        where: { idElemento: creado.id },
        data: { fechaCreacion: enElAvance(f), fechaActualizacion: enElAvance(f) },
      })
      return creado
    }
    const meta = await crear('metas', equipo.metas[0], 0, 0.05)
    for (const [i, texto] of equipo.metas.slice(1).entries()) {
      await crear('metas', texto, i + 1, 0.08)
    }
    for (const [i, texto] of equipo.planeacion.entries()) await crear('planeacion', texto, i, 0.1)
    // Los avances se reparten entre el inicio y hoy. El último equipo deja
    // de publicar antes, para que se vea una revisión atrasada.
    const hasta = e === r.equipos.length - 1 ? 0.6 : 0.95
    const avances = equipo.avances
    for (const [i, texto] of avances.entries()) {
      await crear(
        'avances',
        texto,
        i,
        0.15 + ((hasta - 0.15) * i) / Math.max(1, avances.length - 1),
      )
    }
    for (const [i, texto] of equipo.materiales.entries()) await crear('recursos', texto, i, 0.2)
    await crear('producto', equipo.producto, 1, 0.9)

    // La bitácora de cada integrante, en dos momentos.
    for (const [i, correo] of equipo.integrantes.entries()) {
      for (const [j, f] of [0.3, 0.8].entries()) {
        const entrada = await crearEntradaBitacora(
          idActividad,
          idUsuario(correo),
          RESPUESTAS_BITACORA[(i + j) % RESPUESTAS_BITACORA.length],
        )
        await prisma.bitacora.update({
          where: { idEntrada: entrada.id },
          data: { fechaCreacion: enElAvance(f), fechaActualizacion: enElAvance(f) },
        })
        if (i === 0 && j === 0) {
          await crearComentarioSobreEntradaDeSeed(
            entrada.id,
            idUsuario(r.organizador),
            'Buena reflexión. Para la próxima, cuenta también qué harías distinto.',
          )
        }
      }
    }

    // Un comentario sobre un elemento concreto y retroalimentación sobre
    // cómo trabaja el equipo.
    await crearComentarioSobreElementoDeSeed(
      meta.id,
      idUsuario(r.organizador),
      'Ponle una fecha objetivo a esta meta para poder darle seguimiento.',
    )
    await crearRetroalimentacionDeEquipo(
      idEquipo,
      'metas',
      'Definieron metas claras e incorporaron rápido los comentarios.',
      idUsuario(r.organizador),
    )
    await crearRetroalimentacionDeEquipo(
      idEquipo,
      'general',
      'Se nota la buena organización; cuiden que todos participen por igual.',
      idUsuario(r.organizador),
    )
    if (r.coorganizadores?.length) {
      await crearRetroalimentacionDeEquipo(
        idEquipo,
        'avances',
        'Los avances son constantes; agreguen evidencia (fotos, datos) a cada uno.',
        idUsuario(r.coorganizadores[0]),
      )
    }
  }

  // Proceso colaborativo: respuestas a las autoevaluaciones y a la evaluación
  // por pares, y entregas de las actividades externas, en las instancias cuya
  // fecha ya pasó. Con la calificación incompleta, el último integrante de
  // cada equipo va atrasado.
  const actividadFila = await prisma.actividad.findUniqueOrThrow({ where: { idActividad } })
  const pasadas = await prisma.instrumento.findMany({
    where: {
      fechaPlanificada: { lt: new Date() },
      aspecto: { componente: { idActividad, clave: 'proceso' } },
    },
  })
  for (const equipo of r.equipos) {
    const idsEquipo = equipo.integrantes.map((c) => membresia[c])
    for (const [k, correo] of equipo.integrantes.entries()) {
      if (k === equipo.integrantes.length - 1 && r.calificacion !== 'completa') continue
      const actor = await buscarMembresiaConPermisos(idUsuario(correo), idActividad)
      for (const instancia of pasadas) {
        if (instancia.origen === 'enlace') {
          await guardarEntrega(
            actividadFila,
            actor!,
            instancia.idInstrumento,
            { contenido: 'Hecha; el resumen está en la carpeta del equipo.', enlace: null },
            idUsuario(correo),
          )
          continue
        }
        const plantilla = PLANTILLAS_INSTRUMENTO[instancia.clavePlantilla as ClavePlantilla]
        const reparto = repartoEquitativo(idsEquipo.length)
        const valor =
          plantilla.campo === 'likert'
            ? Object.fromEntries(plantilla.reactivos.map((x, i) => [x.clave, 3 + ((i + k) % 2)]))
            : Object.fromEntries(
                plantilla.reactivos.map((x) => [
                  x.clave,
                  Object.fromEntries(idsEquipo.map((id, i) => [id, reparto[i]])),
                ]),
              )
        await responderInstrumento(
          actividadFila,
          actor!,
          instancia.idInstrumento,
          valor,
          idUsuario(correo),
        )
      }
    }
  }

  // Puntajes que captura quien organiza. Parcial: metas, planeación, avances
  // y bitácora. Completa: todo lo capturable, incluido Aprendizaje.
  if (r.calificacion !== 'nada') {
    const instrumentos = await prisma.instrumento.findMany({
      where: { origen: { in: ['manual', 'enlace'] }, aspecto: { componente: { idActividad } } },
      include: { aspecto: { include: { componente: true } } },
    })
    for (const [e, equipo] of r.equipos.entries()) {
      for (const [k, correo] of equipo.integrantes.entries()) {
        for (const instrumento of instrumentos) {
          const componente = instrumento.aspecto.componente.clave
          const clave = instrumento.aspecto.clave
          const deLoParcial =
            componente === 'proyecto' &&
            ['metas', 'planeacion', 'avances', 'bitacora'].includes(clave)
          if (r.calificacion === 'parcial' && !deLoParcial) continue
          if (instrumento.fechaPlanificada && instrumento.fechaPlanificada > new Date()) continue
          const valor =
            componente === 'proyecto' && clave !== 'bitacora'
              ? 95 - e * 7
              : 80 + ((k * 7 + e * 3) % 20)
          await prisma.puntajeCapturado.create({
            data: {
              idInstrumento: instrumento.idInstrumento,
              idMembresia: membresia[correo],
              valor,
              idMembresiaCalificador: membresia[r.organizador],
            },
          })
        }
      }
    }
  }

  if (r.etapa === 'desarrollo') return
  await prisma.actividad.update({ where: { idActividad }, data: { estado: 'cierre' } })

  // Publicación de proyectos: el entregable final de los equipos que ya lo
  // subieron.
  const actividadEnCierre = await prisma.actividad.findUniqueOrThrow({ where: { idActividad } })
  for (const equipo of r.equipos.filter((x) => r.publicados?.includes(x.nombre))) {
    const correo = equipo.integrantes[0]
    const actor = await buscarMembresiaConPermisos(idUsuario(correo), idActividad)
    await guardarPublicacion(
      actividadEnCierre,
      actor!,
      {
        descripcion: equipo.producto,
        enlace: `https://video.example.com/${equipo.nombre.toLowerCase().replace(/\s+/g, '-')}`,
      },
      idUsuario(correo),
    )
  }

  if (r.etapa === 'archivada') {
    await prisma.actividad.update({ where: { idActividad }, data: { estado: 'archivada' } })
  }
  console.log(`    con su contenido, llevada a ${r.etapa}`)
}

// Tres equipos de tres con un tema cada uno, para los recorridos. Los
// integrantes salen de los alumnos que se le pasen.
function equiposDe(
  alumnos: string[],
  temas: { nombre: string; tema: string; producto: string }[],
): EquipoDelRecorrido[] {
  return temas.map(({ nombre, tema, producto }, i) => ({
    nombre,
    integrantes: alumnos.slice(i * 3, i * 3 + 3),
    descripcion: `Investigamos ${tema} y presentamos una propuesta para la escuela.`,
    metas: [
      `Reunir datos confiables sobre ${tema} de al menos cinco fuentes.`,
      'Presentar un prototipo o maqueta que se pueda probar con usuarios.',
    ],
    planeacion: [
      'Semana 1: investigación. Responsable de fuentes: cada integrante trae dos.',
      'Semana 3: prototipo. Responsable: quien tenga menos carga esa semana.',
    ],
    avances: [
      `Terminamos la lista de fuentes sobre ${tema} y repartimos lecturas.`,
      'Hicimos la primera encuesta en el grupo; tenemos 34 respuestas.',
      'Armamos el borrador de la propuesta con los resultados de la encuesta.',
      'Probamos el prototipo con compañeros de otro grupo y anotamos mejoras.',
    ],
    materiales: [
      'Carpeta compartida con las fuentes y la encuesta: drive.example.com/equipo',
      'Plantilla del reporte final que compartió la profesora.',
    ],
    producto,
  }))
}

async function main() {
  await limpiar()
  const hash = await hashContrasena(CONTRASENA)

  const idPorCorreo = new Map<string, { id: string; nombreCompleto: string }>()
  const alumnos = NOMBRES.map((nombre, i) => ({
    correoLocal: `alumno${String(i + 1).padStart(2, '0')}`,
    nombre,
    apellido: APELLIDOS[i % APELLIDOS.length],
  }))
  const personas = [
    { correoLocal: 'org', nombre: 'Olga', apellido: 'Organizadora' },
    { correoLocal: 'profe', nombre: 'Pablo', apellido: 'Profesor' },
    ...alumnos,
  ]
  for (const p of personas) {
    const u = await crearUsuario(p.correoLocal, p.nombre, p.apellido, hash)
    idPorCorreo.set(p.correoLocal, { id: u.idUsuario, nombreCompleto: nombreCompleto(u) })
  }

  const a = (desde: number, hasta: number) =>
    alumnos.slice(desde - 1, hasta).map((x) => x.correoLocal)

  // -- Recorrido completo: todas las funciones habilitadas, una por etapa ----
  console.log('Recorrido completo (todas las funciones habilitadas):')
  await sembrarRecorrido(
    {
      nombre: 'Taller de diseño de apps',
      objetivo: 'Diseñar en equipo una app que resuelva un problema de la comunidad escolar.',
      organizador: 'org',
      coorganizadores: ['profe'],
      equipos: equiposDe(a(1, 9), [
        { nombre: 'Agenda escolar', tema: 'cómo se organizan las tareas', producto: '' },
        { nombre: 'Cafetería', tema: 'las filas de la cafetería', producto: '' },
        { nombre: 'Biblioteca', tema: 'el préstamo de libros', producto: '' },
      ]),
      etapa: 'inscripcion',
      fechaInicio: fecha(10),
      fechaTermino: fecha(70),
      calificacion: 'nada',
    },
    idPorCorreo,
  )
  await sembrarRecorrido(
    {
      nombre: 'Feria de ciencias: energía en casa',
      objetivo: 'Proponer, en equipo, una forma de ahorrar energía en casa y medir su efecto.',
      organizador: 'org',
      coorganizadores: ['profe'],
      equipos: equiposDe(a(1, 9), [
        {
          nombre: 'Paneles solares',
          tema: 'los paneles solares caseros',
          producto: 'Maqueta de un panel solar casero y medición de lo que genera en un día.',
        },
        {
          nombre: 'Ahorro de agua',
          tema: 'el consumo de agua caliente',
          producto: 'Guía para reducir el uso del calentador, con datos de tres familias.',
        },
        {
          nombre: 'Composta',
          tema: 'la composta y el gas de cocina',
          producto: 'Prototipo de compostero y estimación del gas que se ahorra.',
        },
      ]),
      etapa: 'desarrollo',
      fechaInicio: fecha(-35),
      fechaTermino: fecha(25),
      calificacion: 'parcial',
    },
    idPorCorreo,
  )
  await sembrarRecorrido(
    {
      nombre: 'Hackatón de movilidad urbana',
      objetivo: 'Diseñar una solución para moverse de forma más segura alrededor de la escuela.',
      organizador: 'org',
      coorganizadores: ['profe'],
      equipos: equiposDe(a(10, 18), [
        {
          nombre: 'Ruta segura',
          tema: 'los cruces peligrosos cerca de la escuela',
          producto: 'Mapa de cruces peligrosos y propuesta de señalización, en video.',
        },
        {
          nombre: 'Bici compartida',
          tema: 'el uso de la bicicleta para llegar a clase',
          producto: 'Plan de un sistema de préstamo de bicicletas, con presupuesto.',
        },
        {
          nombre: 'Parada inteligente',
          tema: 'la espera del transporte público',
          producto: 'Prototipo de una pantalla con horarios estimados del camión.',
        },
      ]),
      etapa: 'cierre',
      fechaInicio: fecha(-70),
      fechaTermino: fecha(-4),
      publicados: ['Ruta segura', 'Bici compartida'],
      calificacion: 'completa',
    },
    idPorCorreo,
  )
  await sembrarRecorrido(
    {
      nombre: 'Seminario de periodismo escolar',
      objetivo: 'Publicar en equipo un número de un periódico escolar con notas verificadas.',
      organizador: 'org',
      equipos: equiposDe(a(19, 27), [
        {
          nombre: 'La Gaceta',
          tema: 'las noticias del plantel',
          producto: 'Número especial de La Gaceta, en PDF, con seis notas verificadas.',
        },
        {
          nombre: 'Voces',
          tema: 'las opiniones de los estudiantes',
          producto: 'Serie de entrevistas a estudiantes de todos los grados.',
        },
        {
          nombre: 'Pulso',
          tema: 'los datos de la vida escolar',
          producto: 'Infografías sobre asistencia, deportes y uso de la biblioteca.',
        },
      ]),
      etapa: 'archivada',
      fechaInicio: fecha(-140),
      fechaTermino: fecha(-80),
      publicados: ['La Gaceta', 'Voces', 'Pulso'],
      calificacion: 'completa',
    },
    idPorCorreo,
  )

  // -- Escenarios puntuales, para mostrar un caso concreto -------------------
  console.log('Escenarios puntuales:')
  await sembrar(
    {
      nombre: 'Proyecto de biología · Cada quien elige su equipo',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes: a(1, 8),
      estado: 'formacion_equipos',
      formacion: 'autogestionado',
      equiposEsperados: 3,
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Laboratorio de química · La profesora arma los equipos',
      organizador: 'org',
      participantes: a(1, 8),
      estado: 'formacion_equipos',
      formacion: 'manual',
      equiposEsperados: 3,
      equipos: [
        { nombre: 'Alfa', integrantes: a(1, 2) },
        { nombre: 'Beta', integrantes: a(3, 3) },
        { nombre: 'Gamma', integrantes: [] },
      ],
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Club de debate · Sin equipos todavía (sugerir equipos)',
      organizador: 'org',
      participantes: a(1, 10),
      estado: 'formacion_equipos',
      formacion: 'manual',
      equiposEsperados: 3,
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Curso de fotografía · Equipos de 2 a 3 personas',
      organizador: 'org',
      participantes: a(1, 10),
      estado: 'formacion_equipos',
      formacion: 'autogestionado',
      equiposEsperados: 3,
      limites: { minimo: 2, maximo: 3 },
      equipos: [
        { nombre: 'Lleno', integrantes: a(1, 3) },
        { nombre: 'Solitario', integrantes: a(4, 4) },
      ],
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Torneo de ajedrez · Organizado por un estudiante',
      organizador: 'alumno01',
      coorganizadores: ['profe'],
      participantes: a(2, 7),
      estado: 'formacion_equipos',
      formacion: 'autogestionado',
      equiposEsperados: 2,
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Clase de matemáticas · 40 participantes',
      organizador: 'org',
      participantes: a(1, 40),
      estado: 'formacion_equipos',
      formacion: 'manual',
      equiposEsperados: 5,
      equipos: [
        { nombre: 'Alfa', integrantes: a(1, 6) },
        { nombre: 'Beta', integrantes: a(7, 12) },
        { nombre: 'Gamma', integrantes: [] },
      ],
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Concurso de robótica · Equipos llenos (intercambiar integrantes)',
      organizador: 'org',
      participantes: a(1, 8),
      estado: 'formacion_equipos',
      formacion: 'manual',
      equiposEsperados: 4,
      limites: { maximo: 2 },
      equipos: [
        { nombre: 'Alfa', integrantes: a(1, 2) },
        { nombre: 'Beta', integrantes: a(3, 4) },
        { nombre: 'Gamma', integrantes: a(5, 6) },
        { nombre: 'Delta', integrantes: a(7, 8) },
      ],
    },
    idPorCorreo,
  )
  await sembrarEnDesarrolloEquipoGrande(idPorCorreo)
  await sembrarBitacoraMuyCargada(idPorCorreo)

  // -- Olga como participante: profe organiza, Olga participa ---------------
  // Para ver la experiencia de quien participa con la misma cuenta.
  console.log('Olga como participante:')
  await sembrar(
    {
      nombre: 'Olga como participante · Inscripción abierta',
      organizador: 'profe',
      participantes: ['org', ...a(1, 2)],
      estado: 'inscripcion',
      formacion: 'autogestionado',
      equiposEsperados: 2,
    },
    idPorCorreo,
  )
  // Olga queda sin equipo a propósito: puede unirse a Alfa o crear uno.
  await sembrar(
    {
      nombre: 'Olga como participante · Formación de equipos',
      organizador: 'profe',
      participantes: ['org', ...a(1, 5)],
      estado: 'formacion_equipos',
      formacion: 'autogestionado',
      equiposEsperados: 2,
      equipos: [{ nombre: 'Alfa', integrantes: a(1, 3) }],
    },
    idPorCorreo,
  )
  await sembrarRecorrido(
    {
      nombre: 'Olga como participante · Desarrollo',
      objetivo: 'Recorrer como participante el espacio del equipo, la bitácora y el proceso.',
      organizador: 'profe',
      equipos: equiposDe(
        ['org', ...a(28, 32)],
        [
          {
            nombre: 'Huerto escolar',
            tema: 'un huerto en la azotea',
            producto: 'Diseño del huerto y calendario de siembra.',
          },
          {
            nombre: 'Reciclaje',
            tema: 'la separación de residuos',
            producto: 'Campaña de separación con contenedores rotulados.',
          },
        ],
      ),
      etapa: 'desarrollo',
      fechaInicio: fecha(-30),
      fechaTermino: fecha(30),
      calificacion: 'parcial',
    },
    idPorCorreo,
  )
  // En cierre: Olga ve su calificación, publica el proyecto de su equipo (que
  // todavía no lo hace) y reconoce a sus compañeros.
  await sembrarRecorrido(
    {
      nombre: 'Olga como participante · Cierre (publicar, calificación, reconocer)',
      objetivo: 'Recorrer como participante lo que pasa al cerrar una actividad.',
      organizador: 'profe',
      equipos: equiposDe(
        ['org', ...a(33, 37)],
        [
          {
            nombre: 'Radio escolar',
            tema: 'un programa de radio en el recreo',
            producto: 'Piloto de 10 minutos del programa de radio.',
          },
          {
            nombre: 'Mural',
            tema: 'un mural sobre la historia del barrio',
            producto: 'Boceto final del mural y fotos del proceso.',
          },
        ],
      ),
      etapa: 'cierre',
      fechaInicio: fecha(-60),
      fechaTermino: fecha(-3),
      publicados: ['Mural'],
      calificacion: 'completa',
    },
    idPorCorreo,
  )

  console.log(`
Cuentas (contraseña: ${CONTRASENA})
  org${DOMINIO}      Olga, organiza el recorrido completo y los escenarios puntuales;
                     participa en las cuatro "Olga como participante · …"
  profe${DOMINIO}    Pablo, co-organiza el recorrido y organiza las de Olga como participante
  alumno01${DOMINIO} … alumno40${DOMINIO}   participantes
`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
