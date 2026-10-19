// Datos de prueba para recorrer la aplicación en el navegador con varios
// participantes. Solo para desarrollo: crea usuarios @seed.local y algunas
// actividades en distintas fases y con distinta configuración. Se puede
// volver a ejecutar: primero borra lo que creó antes (todo lo que cuelga de
// esos usuarios) y no toca ninguna otra cuenta.
//
//   npm run seed:dev -w apps/api
//
// Todas las cuentas usan la misma contraseña (CONTRASENA).
import { PERMISOS_COORGANIZADOR_POR_DEFECTO, type FuncionSeguimiento } from '@plataforma/shared'
import { prisma } from '../src/data/prisma.js'
import { config } from '../src/config.js'
import {
  buscarMembresiaConPermisos,
  crearActividad,
  nombreCompleto,
} from '../src/services/actividades/actividades.service.js'
import { crearEntradaBitacora as crearEntradaBitacoraDeServicio } from '../src/services/seguimiento/bitacora.service.js'
import {
  crearComentarioSobreElemento,
  crearComentarioSobreEntrada,
} from '../src/services/seguimiento/comentarios.service.js'
import { crearElemento as crearElementoDeServicio } from '../src/services/seguimiento/elementos.service.js'
import { hashContrasena } from '../src/services/cuentas/contrasena.js'

const CONTRASENA = 'contrasena-larga'
const DOMINIO = '@seed.local'

if (process.env.NODE_ENV === 'production' || !/localhost|127\.0\.0\.1/.test(config.databaseUrl)) {
  throw new Error('El sembrado es solo para una base de datos local de desarrollo.')
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
      apellidoMaterno: 'Seed',
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
  await prisma.actividad.deleteMany({
    where: { idActividad: { in: propias.map((m) => m.idActividad) } },
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
  return crearElementoDeServicio(idEquipo, tipo, contenido, idUsuarioAutor)
}

async function crearEntradaBitacora(
  idActividad: string,
  idUsuarioAutor: string,
  contenido: string,
) {
  const membresiaActor = await buscarMembresiaConPermisos(idUsuarioAutor, idActividad)
  if (!membresiaActor) {
    throw new Error(
      `Sembrado inconsistente: ${idUsuarioAutor} no tiene membresía en ${idActividad}.`,
    )
  }
  return crearEntradaBitacoraDeServicio(
    { idActividad, estado: 'desarrollo' },
    contenido,
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
      objetivo: 'Datos de prueba para recorrer la aplicación.',
      informacionGeneral: 'Actividad creada por el script de sembrado de desarrollo.',
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

// "Seed · En desarrollo, con contenido": la actividad de demo completa —
// dos equipos chicos, cada uno con metas, avances y recursos ya escritos,
// bitácora habilitada con entradas por participante, y comentarios de
// quien organiza y de profe (co-organizador) puestos en las cuatro
// secciones (metas, avances, recursos, bitácora), para dar un recorrido de
// punta a punta sin tener que capturar nada antes. También deja contenido
// para ver el historial completo: general (configuración, fase) y, con
// ?idEquipo=, lo propio de cada equipo (nucleo §10.4, §5.5).
async function sembrarEnDesarrolloConContenido(idPorCorreo: IdPorCorreo) {
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id

  const { idActividad, idEquipoPorNombre } = await sembrar(
    {
      nombre: 'Seed · En desarrollo, con contenido',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes: ['alumno01', 'alumno02', 'alumno03', 'alumno04', 'alumno05', 'alumno06'],
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 2,
      configuracion: { bitacora_individual: 'habilitada' },
      equipos: [
        { nombre: 'Alfa', integrantes: ['alumno01', 'alumno02', 'alumno03'] },
        { nombre: 'Beta', integrantes: ['alumno04', 'alumno05', 'alumno06'] },
      ],
      fechaInicio: fecha(-15),
      fechaTermino: fecha(15),
    },
    idPorCorreo,
  )

  const idAlfa = idEquipoPorNombre.Alfa
  const idBeta = idEquipoPorNombre.Beta

  const metaAlfa = await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno01'),
    'metas',
    'Entregar el prototipo funcional con las tres pantallas principales antes de la siguiente revisión.',
  )
  await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno02'),
    'metas',
    'Repartir las cinco pruebas de usuario entre los tres, dos personas cada una.',
  )
  const recursoAlfa = await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno01'),
    'recursos',
    'Carpeta de Figma con los wireframes: figma.com/file/equipo-alfa-wireframes',
  )
  await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno01'),
    'avances',
    'Terminé el wireframe de la pantalla de inicio y lo subí a la carpeta compartida.',
  )
  await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno02'),
    'avances',
    'Empecé la pantalla de detalle, falta conectar los datos reales.',
  )
  await crearElementoEspacio(
    idAlfa,
    idUsuario('alumno03'),
    'avances',
    'Hice dos de las cinco pruebas de usuario que nos tocaban, los comentarios fueron buenos.',
  )

  const metaBeta = await crearElementoEspacio(
    idBeta,
    idUsuario('alumno04'),
    'metas',
    'Terminar la integración con la API de pagos antes del día 15.',
  )
  await crearElementoEspacio(
    idBeta,
    idUsuario('alumno05'),
    'recursos',
    'Guía de la pasarela de pagos que estamos usando: docs.pasarela-ejemplo.com',
  )
  await crearElementoEspacio(
    idBeta,
    idUsuario('alumno06'),
    'recursos',
    'Plantilla del reporte final que compartió el profesor',
  )
  const avanceAlumno04 = await crearElementoEspacio(
    idBeta,
    idUsuario('alumno04'),
    'avances',
    'La API de pagos ya responde en sandbox, falta probar con tarjetas rechazadas.',
  )
  await crearElementoEspacio(
    idBeta,
    idUsuario('alumno05'),
    'avances',
    'Escribí la primera versión del documento de integración, falta la sección de errores.',
  )

  const primeraEntradaAlumno01 = await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno01'),
    'Hoy me costó decidir la jerarquía visual de la pantalla de inicio, al final usé la que vimos en clase.',
  )
  await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno01'),
    'Avancé más rápido de lo que esperaba con el wireframe de detalle.',
  )
  const entradaAlumno02 = await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno02'),
    'Se me complicó conectar los datos simulados, voy a pedirle ayuda a Ana mañana.',
  )
  await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno03'),
    'Las pruebas de usuario me dieron nervios al principio pero salieron mejor de lo que pensé.',
  )
  await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno04'),
    'Tuve que leer la documentación de la pasarela de pagos tres veces para entenderla bien.',
  )
  await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno05'),
    'Escribir el reporte me tomó más tiempo del que pensé, pero ya le agarré el modo.',
  )
  await crearEntradaBitacora(
    idActividad,
    idUsuario('alumno06'),
    'Todavía no he empezado mi parte, la semana que entra me pongo con esto.',
  )

  // Comentarios de quien organiza y de profe, en las cuatro secciones:
  // metas, avances, recursos y bitácora. La visibilidad de cada uno la
  // hereda lo comentado (concepto §5.3) — los de elemento los ve todo el
  // equipo, los de bitácora solo su autor y quien organiza o co-organiza.
  await crearComentarioSobreElementoDeSeed(
    metaAlfa.id,
    idUsuario('org'),
    'Buena meta. Ponle una fecha límite concreta a cada una de las pruebas de usuario.',
  )
  await crearComentarioSobreElementoDeSeed(
    avanceAlumno04.id,
    idUsuario('profe'),
    '¿Ya probaron qué pasa si la tarjeta es rechazada a la mitad del pago?',
  )
  await crearComentarioSobreElementoDeSeed(
    recursoAlfa.id,
    idUsuario('profe'),
    'Buen avance. Agreguen también los wireframes de la pantalla de detalle cuando estén listos.',
  )
  await crearComentarioSobreElementoDeSeed(
    metaBeta.id,
    idUsuario('org'),
    '¿Qué pasa si no se alcanza el día 15? Avísenme con tiempo si van a necesitar más días.',
  )
  await crearComentarioSobreEntradaDeSeed(
    primeraEntradaAlumno01.id,
    idUsuario('org'),
    'Me da gusto ver que recurriste a lo que vimos en clase. Sigue así.',
  )
  await crearComentarioSobreEntradaDeSeed(
    entradaAlumno02.id,
    idUsuario('profe'),
    'Pregúntale a Ana con confianza, para eso están trabajando en equipo.',
  )

  console.log('    con metas, avances, recursos, bitácora y comentarios en las cuatro secciones')
}

// "Seed · En desarrollo, equipo grande con historial": un solo equipo de
// seis, con más de diez avances y diez entradas de bitácora (a propósito,
// para ver la paginación en acción), y un comentario ya puesto.
async function sembrarEnDesarrolloEquipoGrande(idPorCorreo: IdPorCorreo) {
  const participantes = ['alumno10', 'alumno11', 'alumno12', 'alumno13', 'alumno14', 'alumno15']
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal)!.id

  const { idActividad, idEquipoPorNombre } = await sembrar(
    {
      nombre: 'Seed · En desarrollo, equipo grande con historial',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes,
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      configuracion: { bitacora_individual: 'habilitada' },
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

  // Dos avances y dos entradas por persona (12 de cada uno): supera el
  // tamaño de página de ambas listas (10) a propósito. Profe comenta todo
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

  console.log('    equipo de 6, 12 avances, 12 entradas de bitácora (para probar la paginación)')
}

// "Seed · Bitácora muy cargada (ejemplo de densidad)": el caso que motivó
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
      nombre: 'Seed · Bitácora muy cargada (ejemplo de densidad)',
      organizador: 'org',
      coorganizadores: ['profe'],
      participantes,
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      configuracion: { bitacora_individual: 'habilitada' },
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

  console.log('Actividades:')
  await sembrar(
    {
      nombre: 'Seed · Inscripción abierta',
      organizador: 'org',
      participantes: a(1, 3),
      estado: 'inscripcion',
      formacion: 'autogestionado',
      equiposEsperados: 2,
    },
    idPorCorreo,
  )
  await sembrar(
    {
      nombre: 'Seed · Formación autogestionada',
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
      nombre: 'Seed · Formación manual',
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
      nombre: 'Seed · Manual sin equipos (probar la propuesta)',
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
      nombre: 'Seed · Con máximo de 3 y mínimo de 2',
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
      nombre: 'Seed · Creada por un estudiante',
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
      nombre: 'Seed · Muchos participantes',
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
      nombre: 'Seed · Equipos llenos (probar el intercambio)',
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

  // La transición a cierre ya es real (POST /actividades/{id}/cierre), pero
  // la automática por fecha de término (docs/diseno-desarrollo-nucleo.md
  // §7.5) no existe todavía: este escenario sigue forzando el estado y las
  // fechas a mano para no depender de ella. fechaTermino en el pasado y
  // plazoCierreDias generoso para que la ventana de reconocimiento
  // (insignias.service.ts, ventana()) esté abierta hoy.
  await sembrar(
    {
      nombre: 'Seed · En cierre (probar reconocimiento)',
      organizador: 'org',
      participantes: a(1, 8),
      estado: 'cierre',
      formacion: 'autogestionado',
      equiposEsperados: 2,
      equipos: [
        { nombre: 'Alfa', integrantes: a(1, 4) },
        { nombre: 'Beta', integrantes: a(5, 8) },
      ],
      fechaInicio: fecha(-30),
      fechaTermino: fecha(-3),
      plazoCierreDias: 14,
    },
    idPorCorreo,
  )

  // Dos actividades en desarrollo con contenido real (metas, avances,
  // recursos, bitácora y comentarios ya escritos), para navegar como
  // organizador sin tener que capturar nada primero y ver cómo se ve una
  // actividad a medio camino. A diferencia de los escenarios de arriba
  // (formación), y de los "Olga participa" de abajo (donde Olga es
  // participante), aquí org@seed.local organiza, igual que en el resto de
  // su cuenta.

  await sembrarEnDesarrolloConContenido(idPorCorreo)
  await sembrarEnDesarrolloEquipoGrande(idPorCorreo)
  await sembrarBitacoraMuyCargada(idPorCorreo)

  // Las cuatro siguientes ponen a Olga (org@seed.local, quien organiza casi
  // todo lo de arriba) como participante en vez de organizadora, una por
  // cada fase donde su experiencia cambia — para probar escenarios de
  // participante sin tener que cerrar sesión y entrar con un alumno.
  // profe@seed.local organiza las cuatro.
  await sembrar(
    {
      nombre: 'Seed · Olga participa: inscripción abierta',
      organizador: 'profe',
      participantes: ['org', ...a(1, 2)],
      estado: 'inscripcion',
      formacion: 'autogestionado',
      equiposEsperados: 2,
    },
    idPorCorreo,
  )

  // Olga queda sin equipo a propósito (los demás ya tienen el suyo): puede
  // elegir entrar a Alfa o formar uno nuevo.
  await sembrar(
    {
      nombre: 'Seed · Olga participa: formación autogestionada',
      organizador: 'profe',
      participantes: ['org', ...a(1, 5)],
      estado: 'formacion_equipos',
      formacion: 'autogestionado',
      equiposEsperados: 2,
      equipos: [{ nombre: 'Alfa', integrantes: a(1, 3) }],
    },
    idPorCorreo,
  )

  // Olga ya integra un equipo de cuatro, actividad en desarrollo: puede
  // crear metas, avances y recursos (usar_espacio_equipo solo es válido en
  // esta fase), pero ya no puede cambiarse de equipo por su cuenta
  // (elegir_equipo solo vale durante la formación).
  await sembrar(
    {
      nombre: 'Seed · Olga participa: en desarrollo (espacio de equipo)',
      organizador: 'profe',
      participantes: ['org', ...a(1, 3)],
      estado: 'desarrollo',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      equipos: [{ nombre: 'Alfa', integrantes: ['org', ...a(1, 3)] }],
    },
    idPorCorreo,
  )

  // Mismo equipo de cuatro, ya en cierre con la ventana abierta: Olga puede
  // dar reconocimiento a sus compañeros de equipo (no a los de otros
  // equipos, P-10) y ver qué le llega a ella.
  await sembrar(
    {
      nombre: 'Seed · Olga participa: en cierre (dar reconocimiento)',
      organizador: 'profe',
      participantes: ['org', ...a(1, 3)],
      estado: 'cierre',
      formacion: 'autogestionado',
      equiposEsperados: 1,
      equipos: [{ nombre: 'Alfa', integrantes: ['org', ...a(1, 3)] }],
      fechaInicio: fecha(-30),
      fechaTermino: fecha(-3),
      plazoCierreDias: 14,
    },
    idPorCorreo,
  )

  console.log(`
Cuentas (contraseña: ${CONTRASENA})
  org${DOMINIO}      organiza casi todas las actividades; participa (no organiza) en las cuatro
                     "Olga participa: …", una por fase, para probar escenarios de participante
                     con esta misma cuenta
  profe${DOMINIO}    co-organizador en "Formación autogestionada" y en la creada por un estudiante;
                     organiza las cuatro "Olga participa: …"
  alumno01${DOMINIO} … alumno40${DOMINIO}   participantes (alumno01 organiza "Creada por un estudiante")
`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
