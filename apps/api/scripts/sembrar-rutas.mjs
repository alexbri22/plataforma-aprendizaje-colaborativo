import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { textoDeBusquedaCatalogo } from '@plataforma/shared'

// Carga dos rutas de aprendizaje de ejemplo (docs/diseno-desarrollo-formacion.md
// §4.1) con los cursos de `npm run sembrar-cursos`, así que hay que correr ese
// primero. Solo inserta si no hay rutas: correrlo dos veces no duplica nada
// ni pisa lo que el administrador haya editado.
//
// El contenido es un primer borrador editorial; se ajusta desde /admin/rutas.
//
// Uso: npm run sembrar-rutas

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('Falta DATABASE_URL en apps/api/.env (ver .env.example)')
}

// `cursos` se resuelven por título contra los cursos publicados.
const RUTAS = [
  {
    titulo: 'Organización y corresponsabilidad',
    finalidad:
      'Para equipos que necesitan coordinar mejor sus aportes y salir de cada reunión con acuerdos claros.',
    descripcion:
      'Empieza por definir quién hace qué y termina con reuniones breves que producen decisiones. Al final tendrás un acuerdo de colaboración y una agenda lista para usar.',
    destacada: true,
    cursos: ['Acuerdos y responsabilidades claras', 'Reuniones breves que producen decisiones'],
  },
  {
    titulo: 'Mejora continua del equipo',
    finalidad:
      'Para equipos que quieren revisar cómo colaboran y acordar una mejora concreta para el siguiente ciclo.',
    descripcion:
      'Usa las reuniones para decidir y las retrospectivas para aprender de lo que pasó, sin buscar culpables.',
    destacada: false,
    cursos: ['Reuniones breves que producen decisiones', 'Retrospectivas para mejorar'],
  },
]

const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

try {
  const existentes = await prisma.rutaFormativa.count()
  if (existentes > 0) {
    console.log(`Ya hay ${existentes} rutas; no se siembra nada.`)
  } else {
    const admin = await prisma.usuario.findFirst({
      where: { tipoCuenta: 'administrador' },
      orderBy: { fechaRegistro: 'asc' },
      select: { idUsuario: true },
    })

    const titulos = [...new Set(RUTAS.flatMap((r) => r.cursos))]
    const cursos = await prisma.curso.findMany({
      where: { titulo: { in: titulos }, estatus: 'publicado' },
      select: { idCurso: true, titulo: true },
    })
    const idPorTitulo = new Map(cursos.map((c) => [c.titulo, c.idCurso]))
    const faltan = titulos.filter((t) => !idPorTitulo.has(t))
    if (faltan.length > 0) {
      throw new Error(
        `Faltan cursos publicados: ${faltan.join('; ')}. Corre primero npm run sembrar-cursos.`,
      )
    }

    for (const [orden, { cursos: lista, ...ficha }] of RUTAS.entries()) {
      await prisma.rutaFormativa.create({
        data: {
          ...ficha,
          orden,
          estatus: 'publicado',
          idUsuarioAutor: admin?.idUsuario ?? null,
          // create no pasa por crearRuta: el texto de búsqueda se arma aquí.
          textoBusqueda: textoDeBusquedaCatalogo(
            [ficha.titulo, ficha.finalidad, ficha.descripcion],
            null,
            [],
          ),
          cursos: {
            create: lista.map((titulo, i) => ({ idCurso: idPorTitulo.get(titulo), orden: i })),
          },
        },
      })
    }
    console.log(`Sembradas ${RUTAS.length} rutas publicadas.`)
  }
} catch (error) {
  console.error(`No se pudieron sembrar las rutas: ${error?.message ?? error}`)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
