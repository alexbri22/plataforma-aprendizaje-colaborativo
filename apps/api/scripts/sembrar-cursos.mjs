import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { textoDeBusquedaCatalogo } from '@plataforma/shared'

// Carga tres cursos de ejemplo (docs/diseno-desarrollo-formacion.md §4) que
// reutilizan los recursos de `npm run sembrar-recursos`, así que hay que correr
// ese primero. Solo inserta si no hay cursos: correrlo dos veces no duplica
// nada ni pisa lo que el administrador haya editado.
//
// El contenido es un primer borrador editorial; se ajusta desde /admin/cursos.
//
// Uso: npm run sembrar-cursos

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('Falta DATABASE_URL en apps/api/.env (ver .env.example)')
}

// `recurso` se resuelve por título contra la biblioteca publicada.
const CURSOS = [
  {
    titulo: 'Acuerdos y responsabilidades claras',
    resumen: 'Convierte una conversación en compromisos concretos, visibles y realizables.',
    objetivo:
      'Definir quién hace qué y para cuándo, y dejarlo por escrito en un acuerdo breve que el equipo pueda revisar.',
    practicaFinal: 'Un acuerdo de colaboración de una página, listo para usar con tu equipo.',
    area: 'organizacion',
    nivel: 'inicial',
    elementos: ['responsabilidades', 'interdependencia_positiva'],
    lecciones: [
      {
        tipo: 'recurso',
        recurso: 'Roles que rotan: repartir el trabajo sin cargar a una sola persona',
      },
      { tipo: 'recurso', recurso: 'Plantilla de acuerdos claros' },
      {
        tipo: 'practica',
        titulo: 'Redacta el acuerdo de tu equipo',
        duracionMin: 15,
        contenido: `Usa la plantilla de la lección anterior con un trabajo real o imaginario.

1. Escribe la meta del equipo en una sola frase.
2. Anota qué aporta cada persona, con verbos concretos: **entregar**, **revisar**, **presentar**.
3. Decide qué pasa si alguien no puede cumplir.

**Revisa tu acuerdo:** ¿alguien que no estuvo en la reunión entendería quién hace qué?`,
      },
      {
        tipo: 'reflexion',
        titulo: '¿Qué vas a cambiar?',
        duracionMin: 5,
        contenido:
          'Piensa en tu último trabajo en equipo. ¿Qué compromiso quedó sin dueño, y cómo lo habrías evitado con un acuerdo?',
      },
    ],
  },
  {
    titulo: 'Reuniones breves que producen decisiones',
    resumen: 'Prepara una agenda corta y termina cada reunión con acuerdos y responsables.',
    objetivo:
      'Conducir una reunión de 15 minutos con un objetivo claro y registrar lo decidido para que no se pierda.',
    practicaFinal: 'Una agenda preparada para la próxima reunión de tu equipo.',
    area: 'coordinacion',
    nivel: 'inicial',
    elementos: ['interaccion_promotora', 'responsabilidades'],
    lecciones: [
      { tipo: 'recurso', recurso: 'Guía para una reunión breve' },
      { tipo: 'recurso', recurso: 'Acuerdos que se recuerdan: documentar sin burocracia' },
      {
        tipo: 'practica',
        titulo: 'Prepara tu próxima reunión',
        duracionMin: 10,
        contenido: `Completa la guía de reunión para la siguiente vez que se junte tu equipo.

- Escribe el objetivo en una frase.
- Elige quién coordina y quién registra.
- Separa lo que hay que **decidir** de lo que solo hay que **informar**: lo segundo puede ir por escrito.`,
      },
      {
        tipo: 'reflexion',
        titulo: '¿Para qué se juntan?',
        duracionMin: 5,
        contenido: '¿Qué reunión de tu equipo pudo haber sido un mensaje? ¿Qué la hizo necesaria?',
      },
    ],
  },
  {
    titulo: 'Retrospectivas para mejorar',
    resumen: 'Revisa cómo colaboró el grupo y acuerda un cambio pequeño para la siguiente ocasión.',
    objetivo:
      'Revisar el trabajo en equipo sin buscar culpables y terminar con una mejora concreta, con responsable y fecha.',
    practicaFinal: 'Una mejora acordada por el equipo para la siguiente entrega.',
    area: 'reflexion',
    nivel: 'intermedio',
    elementos: ['procesamiento_grupal'],
    lecciones: [
      { tipo: 'recurso', recurso: 'Los cinco elementos del aprendizaje colaborativo' },
      { tipo: 'recurso', recurso: 'Preguntas para una retrospectiva' },
      {
        tipo: 'practica',
        titulo: 'Haz una retrospectiva de 15 minutos',
        duracionMin: 15,
        contenido: `Reúne a tu equipo al terminar una entrega.

1. Cada persona responde las preguntas por escrito, sin hablar, durante 5 minutos.
2. Compartan sus respuestas sin debatirlas todavía.
3. Elijan **una sola** mejora y escríbanla con responsable y fecha.`,
      },
      {
        tipo: 'reflexion',
        titulo: 'Tu parte en el equipo',
        duracionMin: 5,
        contenido: '¿Qué hiciste tú que ayudó al equipo a avanzar? ¿Qué harías distinto?',
      },
    ],
  },
]

const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

try {
  const existentes = await prisma.curso.count()
  if (existentes > 0) {
    console.log(`Ya hay ${existentes} cursos; no se siembra nada.`)
  } else {
    const admin = await prisma.usuario.findFirst({
      where: { tipoCuenta: 'administrador' },
      orderBy: { fechaRegistro: 'asc' },
      select: { idUsuario: true },
    })

    const titulos = CURSOS.flatMap((c) => c.lecciones.flatMap((l) => l.recurso ?? []))
    const recursos = await prisma.recursoFormativo.findMany({
      where: { titulo: { in: titulos }, estatus: 'publicado' },
      select: { idRecurso: true, titulo: true },
    })
    const idPorTitulo = new Map(recursos.map((r) => [r.titulo, r.idRecurso]))
    const faltan = titulos.filter((t) => !idPorTitulo.has(t))
    if (faltan.length > 0) {
      throw new Error(
        `Faltan recursos publicados: ${faltan.join('; ')}. Corre primero npm run sembrar-recursos.`,
      )
    }

    for (const [orden, { lecciones, ...ficha }] of CURSOS.entries()) {
      await prisma.curso.create({
        data: {
          ...ficha,
          orden,
          estatus: 'publicado',
          idUsuarioAutor: admin?.idUsuario ?? null,
          // create no pasa por crearCurso: el texto de búsqueda se arma aquí.
          textoBusqueda: textoDeBusquedaCatalogo(
            [ficha.titulo, ficha.resumen, ficha.objetivo],
            ficha.area,
            ficha.elementos,
          ),
          lecciones: {
            create: lecciones.map(({ recurso, ...leccion }, i) => ({
              ...leccion,
              orden: i,
              idRecurso: recurso ? idPorTitulo.get(recurso) : null,
            })),
          },
        },
      })
    }
    console.log(`Sembrados ${CURSOS.length} cursos publicados.`)
  }
} catch (error) {
  console.error(`No se pudieron sembrar los cursos: ${error?.message ?? error}`)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
