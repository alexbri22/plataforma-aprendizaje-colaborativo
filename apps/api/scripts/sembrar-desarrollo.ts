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
import { crearActividad } from '../src/services/actividades/actividades.service.js'
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
]
const APELLIDOS = ['Soto', 'Vega', 'Rios', 'Luna', 'Mora', 'Paz', 'Cruz', 'Gil', 'Nava', 'Ortiz']

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

interface Escenario {
  nombre: string
  organizador: string
  participantes: string[]
  coorganizadores?: string[]
  estado: 'inscripcion' | 'formacion_equipos'
  formacion: 'autogestionado' | 'propuesta_sistema' | 'manual'
  equiposEsperados: number
  limites?: { minimo?: number; maximo?: number }
  // Equipos ya formados: nombre y quiénes los integran.
  equipos?: { nombre: string; integrantes: string[] }[]
}

async function sembrar(escenario: Escenario, idPorCorreo: Map<string, string>) {
  const idUsuario = (correoLocal: string) => idPorCorreo.get(correoLocal) as string

  const actividad = await crearActividad(idUsuario(escenario.organizador), {
    nombre: escenario.nombre,
    objetivo: 'Datos de prueba para recorrer la aplicación.',
    informacionGeneral: 'Actividad creada por el script de sembrado de desarrollo.',
    fechaInicio: fecha(0),
    fechaTermino: fecha(60),
    fechaLimiteInscripcion: fecha(7),
    plazoCierreDias: 14,
    numeroEquiposEsperado: escenario.equiposEsperados,
  })

  const membresia: Record<string, string> = {}
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
  await prisma.actividad.update({
    where: { idActividad: actividad.id },
    data: {
      estado: escenario.estado,
      tamanoMinimoEquipo: escenario.limites?.minimo ?? null,
      tamanoMaximoEquipo: escenario.limites?.maximo ?? null,
    },
  })

  for (const equipo of escenario.equipos ?? []) {
    const creado = await prisma.equipo.create({
      data: { idActividad: actividad.id, nombre: equipo.nombre },
    })
    await prisma.integranteEquipo.createMany({
      data: equipo.integrantes.map((c) => ({
        idEquipo: creado.idEquipo,
        idMembresia: membresia[c],
      })),
    })
  }

  console.log(`  ✓ ${escenario.nombre}  (${escenario.estado}, ${escenario.formacion})`)
}

async function main() {
  await limpiar()
  const hash = await hashContrasena(CONTRASENA)

  const idPorCorreo = new Map<string, string>()
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
    idPorCorreo.set(p.correoLocal, u.idUsuario)
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
      nombre: 'Seed · Propuesta del sistema',
      organizador: 'org',
      participantes: a(1, 10),
      estado: 'formacion_equipos',
      formacion: 'propuesta_sistema',
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

  console.log(`
Cuentas (contraseña: ${CONTRASENA})
  org${DOMINIO}      organiza casi todas las actividades
  profe${DOMINIO}    co-organizador en "Formación autogestionada" y en la creada por un estudiante
  alumno01${DOMINIO} … alumno15${DOMINIO}   participantes (alumno01 organiza "Creada por un estudiante")
`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
