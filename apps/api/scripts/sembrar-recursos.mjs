import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Carga los recursos formativos iniciales (docs/diseno-desarrollo-formacion.md
// §11.2, incremento B1) para que el catálogo no arranque vacío. Solo inserta
// si la tabla está vacía: correrlo dos veces no duplica nada, y nunca pisa lo
// que el administrador haya editado después.
//
// El contenido es un primer borrador editorial propio de la plataforma; se
// revisa y ajusta desde el panel /admin/contenido como cualquier otro recurso.
//
// Uso: npm run sembrar-recursos

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('Falta DATABASE_URL en apps/api/.env (ver .env.example)')
}

const FUENTE = 'Equipo Co3, contenido propio'
const LICENCIA = 'Uso libre dentro de la plataforma'

const RECURSOS = [
  {
    seccion: 'que_es_colaborar',
    titulo: 'Los cinco elementos del aprendizaje colaborativo',
    resumen:
      'Qué distingue a un equipo que colabora de un grupo que solo reparte tareas, según Johnson y Johnson.',
    tipoRecurso: 'texto',
    area: 'reflexion',
    elementos: [
      'responsabilidades',
      'interdependencia_positiva',
      'responsabilidad_individual_grupal',
      'interaccion_promotora',
      'procesamiento_grupal',
    ],
    duracionMin: 6,
    contenido: `Trabajar en grupo no es lo mismo que colaborar. Un grupo puede entregar un trabajo en el que cada quien hizo su parte sin hablar con nadie. Colaborar exige algo más: que el resultado dependa de lo que todos aportan y de cómo lo coordinan.

David y Roger Johnson describen cinco elementos que, cuando están presentes, convierten a un grupo en un equipo que aprende junto.

## 1. Responsabilidades claras

Cada persona sabe qué le toca, qué espera de los demás y qué esperan de ella. No se trata de repartir por repartir: se trata de que nadie tenga que adivinar.

## 2. Interdependencia positiva

La meta es compartida y cada aporte es necesario para alcanzarla. Si una persona puede terminar sola, no hay interdependencia.

## 3. Responsabilidad individual y grupal

El equipo responde por el resultado y cada integrante responde por su aporte. Las dos cosas a la vez: ni "el equipo lo hizo" oculta a quien no participó, ni el aporte individual importa más que el resultado común.

## 4. Interacción promotora

Las personas se explican, se preguntan, se ayudan y deciden juntas. La colaboración ocurre en esas conversaciones, no solo en el documento final.

## 5. Procesamiento del grupo

De vez en cuando el equipo se detiene a revisar cómo está trabajando: qué funciona, qué no y qué va a cambiar. Sin esta revisión, los mismos problemas se repiten.

**Para llevar:** en tu próximo trabajo en equipo, revisa cuál de los cinco elementos está más débil. Suele ser el mejor lugar para empezar.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Roles que rotan: repartir el trabajo sin cargar a una sola persona',
    resumen:
      'Una forma sencilla de distribuir responsabilidades para que todo el equipo aprenda de cada parte.',
    tipoRecurso: 'texto',
    area: 'organizacion',
    elementos: ['responsabilidades', 'responsabilidad_individual_grupal'],
    duracionMin: 6,
    contenido: `En muchos equipos la misma persona termina coordinando, revisando y entregando. No es mala voluntad: es la costumbre de dejar que lo haga quien "lo hace mejor". El costo es que esa persona se satura y el resto no aprende esa parte.

## Qué es rotar roles

Definir tres o cuatro roles que el equipo necesita y cambiar quién los ocupa en cada entrega o cada semana. Por ejemplo:

- **Coordinación:** propone la agenda y cuida los plazos.
- **Registro:** anota acuerdos y los comparte al terminar.
- **Revisión:** lee el avance antes de entregarlo.
- **Enlace:** es quien habla con el profesor o con otros equipos.

## Cómo empezar

1. Elijan los roles que de verdad necesitan. Menos es mejor.
2. Escriban en una línea qué hace cada rol.
3. Asignen el primer turno y la fecha del siguiente cambio.
4. Al rotar, quien deja el rol le explica a quien entra lo que aprendió.

**Señal de que funciona:** cualquier integrante podría tomar cualquier rol sin que el trabajo se detenga.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Acuerdos que se recuerdan: documentar sin burocracia',
    resumen:
      'Qué anotar después de una reunión para que los compromisos no se pierdan al día siguiente.',
    tipoRecurso: 'texto',
    area: 'coordinacion',
    elementos: ['responsabilidades', 'interaccion_promotora'],
    duracionMin: 4,
    contenido: `Una reunión puede terminar con muy buenas ideas y, dos días después, nadie recuerda quién iba a hacer qué. No hace falta un acta formal: basta con registrar tres cosas.

## Las tres preguntas

- **¿Qué decidimos?** Una línea por decisión, en palabras simples.
- **¿Quién lo hace?** Un nombre, no "el equipo".
- **¿Para cuándo?** Una fecha concreta, no "pronto".

## Dónde anotarlo

En un lugar que todo el equipo vea sin buscar: el espacio del equipo en la plataforma, un documento compartido fijado o el chat del grupo. Lo importante es que sea siempre el mismo lugar.

## Un ejemplo

> Decidimos usar la encuesta como fuente principal. **Ana** redacta las preguntas para el **jueves 12**. **Luis** revisa que sean claras para el **viernes 13**.

Tres líneas bastan para que el acuerdo sobreviva a la reunión.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Negociar sin "ganar o perder": acuerdos que convienen a todo el grupo',
    resumen:
      'Cómo pasar de defender posturas a construir una solución que el equipo pueda sostener.',
    tipoRecurso: 'texto',
    area: 'conflictos',
    elementos: ['interaccion_promotora', 'procesamiento_grupal'],
    duracionMin: 7,
    contenido: `Cuando dos personas del equipo quieren cosas distintas, es fácil que la conversación se convierta en ver quién gana. El problema es que, si alguien pierde, el equipo pierde con él: esa persona se desconecta del trabajo.

## Posturas e intereses

Una **postura** es lo que alguien pide: "hagamos la presentación en video". Un **interés** es por qué lo pide: "me preocupa no hablar bien en público". Dos posturas opuestas pueden esconder intereses compatibles.

## Tres pasos

1. **Pregunta el porqué.** "¿Qué te preocupa de la otra opción?" Escucha la respuesta completa antes de contestar.
2. **Nombra lo que comparten.** "Los dos queremos una buena calificación y no quedar mal frente al grupo."
3. **Busquen una tercera opción.** Con los intereses sobre la mesa suele aparecer algo que nadie había propuesto: por ejemplo, presentar en vivo con apoyo de un video corto.

## Cuándo pedir ayuda

Si después de dos intentos no hay acuerdo, pidan a otra persona del equipo que facilite la conversación, o acudan a quien organiza la actividad. Pedir ayuda no es fracasar.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Guía para una reunión breve',
    resumen: 'Una agenda de 15 minutos que termina con decisiones y responsables.',
    tipoRecurso: 'plantilla',
    area: 'coordinacion',
    elementos: ['interaccion_promotora', 'responsabilidades'],
    duracionMin: 3,
    contenido: `Copia esta guía antes de cada reunión y complétala junto con el equipo.

## Antes (2 min)

- **Objetivo de la reunión:** ___
- **Quién coordina:** ___
- **Quién registra:** ___

## Durante (10 min)

1. **Avances (3 min):** cada persona dice en una frase qué terminó.
2. **Bloqueos (3 min):** ¿qué nos impide avanzar? ¿Quién puede ayudar?
3. **Decisiones (4 min):** lo que hay que decidir hoy.

## Al cerrar (3 min)

| Acuerdo | Responsable | Fecha |
| --- | --- | --- |
| ___ | ___ | ___ |

**Regla:** si un tema necesita más de 5 minutos, se agenda aparte con solo quienes lo necesitan.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Plantilla de acuerdos claros',
    resumen: 'Un acuerdo de colaboración de una página para empezar un proyecto en equipo.',
    tipoRecurso: 'plantilla',
    area: 'organizacion',
    elementos: ['responsabilidades', 'interdependencia_positiva'],
    duracionMin: 10,
    contenido: `Completen este acuerdo en la primera reunión del proyecto. Vuelvan a él cuando algo no esté funcionando.

## Nuestra meta

En una frase, ¿qué queremos lograr juntos? ___

## Lo que aporta cada quien

- **Nombre:** ___ — **se compromete a:** ___
- **Nombre:** ___ — **se compromete a:** ___
- **Nombre:** ___ — **se compromete a:** ___

## Cómo nos comunicamos

- **Canal principal:** ___
- **Tiempo máximo para responder:** ___
- **Reunión fija:** día ___, hora ___

## Si algo falla

- Si alguien no puede cumplir, avisa antes de ___.
- Si hay un desacuerdo, primero ___; si no se resuelve, ___.

## Revisión

Revisaremos este acuerdo el ___.`,
  },
  {
    seccion: 'como_colaborar',
    titulo: 'Preguntas para una retrospectiva',
    resumen: 'Cinco preguntas para revisar cómo colaboró el equipo y acordar una mejora.',
    tipoRecurso: 'plantilla',
    area: 'reflexion',
    elementos: ['procesamiento_grupal'],
    duracionMin: 5,
    contenido: `Úsenlas al terminar una entrega o cada dos semanas. Cada persona responde por escrito antes de comentar en grupo, para que todas las voces cuenten.

1. **¿Qué funcionó bien** en cómo trabajamos juntos?
2. **¿Qué nos costó** más de lo necesario?
3. **¿En qué momento** alguien del equipo te ayudó a avanzar?
4. **¿Qué harías distinto** si empezáramos de nuevo?
5. **¿Qué una cosa** vamos a cambiar para la próxima entrega?

**Cierre:** escriban la mejora de la pregunta 5 como acuerdo, con responsable y fecha, y revísenla en la siguiente retrospectiva.`,
  },
]

const adapter = new PrismaPg({ connectionString: url })
const prisma = new PrismaClient({ adapter })

try {
  const existentes = await prisma.recursoFormativo.count()
  if (existentes > 0) {
    console.log(`Ya hay ${existentes} recursos; no se siembra nada.`)
  } else {
    // El autor es el primer administrador si existe; si no, queda sin autor.
    const admin = await prisma.usuario.findFirst({
      where: { tipoCuenta: 'administrador' },
      orderBy: { fechaRegistro: 'asc' },
      select: { idUsuario: true },
    })
    await prisma.recursoFormativo.createMany({
      data: RECURSOS.map((recurso, orden) => ({
        ...recurso,
        fuente: FUENTE,
        licencia: LICENCIA,
        orden,
        estatus: 'publicado',
        idUsuarioAutor: admin?.idUsuario ?? null,
      })),
    })
    console.log(`Sembrados ${RECURSOS.length} recursos publicados.`)
  }
} catch (error) {
  console.error(`No se pudieron sembrar los recursos: ${error?.message ?? error}`)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
