import type { Prisma } from '@prisma/client'
import {
  MAX_BYTES_ARCHIVO_RECURSO,
  TIPOS_CON_ARCHIVO,
  TIPOS_CON_URL,
  esTipoArchivoRecurso,
  esUrlSegura,
  normalizarBusqueda,
  textoDeBusquedaCatalogo,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusRecurso,
  type OrigenContenido,
  type Paginacion,
  type SeccionFormativa,
  type TipoRecurso,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import {
  ErrorArchivoInvalido,
  ErrorPropuestaNoEditable,
  ErrorPropuestaNoEliminable,
  ErrorRecursoDesactualizado,
  ErrorRecursoEnUso,
  ErrorRecursoNoEncontrado,
  ErrorValidacion,
} from '../../errores.js'
import { ADMIN, exigirEditable, puedeVer, type Acceso, type EstadoContenido } from './acceso.js'
import { fijarFinalizaciones } from './calculoProgreso.js'
import { emitirConstanciasDeRutas } from './constancias.service.js'
import { cursosQueUsanRecurso } from './usoDeRecursos.js'
import type { DatosRecurso, FiltrosRecursos, PeticionPagina } from './validacion.js'

/*
 * Biblioteca de recursos formativos (docs/diseno-desarrollo-formacion.md §6 y
 * §12.3). El administrador crea y publica su contenido (editorial); un usuario
 * puede proponer el suyo, que pasa por revisión (nota del incremento 6; quién
 * ve y edita qué está en acceso.ts). El público solo ve lo publicado.
 *
 * Transiciones de estatus: borrador → publicado → retirado → publicado. Un
 * recurso publicado no vuelve a borrador: se edita en sitio (no hay versiones
 * mientras la autoría sea solo del administrador) y, si hay un problema, se
 * retira. Retirar es lo reversible (deja de verse y se puede volver a
 * publicar); eliminar borra el recurso y su archivo para siempre, en
 * cualquier estatus. La interfaz pide confirmación antes de hacerlo.
 */

export interface ArchivoPublico {
  nombre: string
  tamano: number
  url: string
}

/** Lo que el catálogo lista: sin el cuerpo, que puede ser largo. */
export interface ResumenRecurso {
  idRecurso: string
  seccion: SeccionFormativa
  titulo: string
  resumen: string
  tipoRecurso: TipoRecurso
  area: AreaHabilidad | null
  elementos: ElementoColaboracion[]
  duracionMin: number | null
  orden: number
  fechaActualizacion: string
  archivo: ArchivoPublico | null
}

export interface RecursoPublico extends ResumenRecurso {
  contenido: string
  transcripcion: string
  fuente: string
  licencia: string
}

export interface RecursoAdmin extends RecursoPublico {
  estatus: EstatusRecurso
  origen: OrigenContenido
  versionFicha: number
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
}

/** Un recurso visto en su editor: además dice en qué cursos se usa, para
 * avisar antes de retirarlo y explicar por qué no se puede eliminar. */
export interface RecursoAdminDetalle extends RecursoAdmin {
  usadoEn: { idCurso: string; titulo: string; estatus: EstatusRecurso }[]
}

async function conUso(recurso: RecursoAdmin): Promise<RecursoAdminDetalle> {
  return { ...recurso, usadoEn: await cursosQueUsanRecurso(recurso.idRecurso) }
}

export interface FiltrosRecursosAdmin {
  texto?: string
  estatus?: EstatusRecurso
  tiposRecurso?: TipoRecurso[]
}

// Nunca se selecciona el contenido del archivo al leer recursos: puede pesar
// megas y solo lo necesita la ruta de descarga.
const INCLUIR_METADATOS = {
  archivo: { select: { nombre: true, tamano: true, actualizadoEn: true } },
  autor: { select: { idUsuario: true, nombre: true, apellidoPaterno: true } },
} satisfies Prisma.RecursoFormativoInclude

type FilaRecurso = Prisma.RecursoFormativoGetPayload<{ include: typeof INCLUIR_METADATOS }>

// El id al final desempata: sin un orden total, dos recursos con el mismo
// orden y fecha podrían intercambiarse entre páginas y uno aparecer dos veces.
const ORDEN_CATALOGO = [
  { orden: 'asc' },
  { fechaCreacion: 'asc' },
  { idRecurso: 'asc' },
] satisfies Prisma.RecursoFormativoOrderByWithRelationInput[]

function aResumen(fila: FilaRecurso): ResumenRecurso {
  return {
    idRecurso: fila.idRecurso,
    seccion: fila.seccion,
    titulo: fila.titulo,
    resumen: fila.resumen,
    tipoRecurso: fila.tipoRecurso,
    area: fila.area as AreaHabilidad | null,
    elementos: fila.elementos as ElementoColaboracion[],
    duracionMin: fila.duracionMin,
    orden: fila.orden,
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
    // La URL lleva la fecha del archivo para que un archivo nuevo sea una URL
    // nueva. No se cachea sin plazo (ver la ruta de descarga): retirar o
    // borrar el recurso debe poder cortar el acceso.
    archivo: fila.archivo
      ? {
          nombre: fila.archivo.nombre,
          tamano: fila.archivo.tamano,
          url: `/api/recursos/${fila.idRecurso}/archivo?v=${fila.archivo.actualizadoEn.getTime()}`,
        }
      : null,
  }
}

function aPublico(fila: FilaRecurso): RecursoPublico {
  return {
    ...aResumen(fila),
    contenido: fila.contenido,
    transcripcion: fila.transcripcion,
    fuente: fila.fuente,
    licencia: fila.licencia,
  }
}

function aAdmin(fila: FilaRecurso): RecursoAdmin {
  return {
    ...aPublico(fila),
    estatus: fila.estatus,
    origen: fila.origen,
    versionFicha: fila.versionFicha,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    autor: fila.autor
      ? {
          idUsuario: fila.autor.idUsuario,
          nombre: `${fila.autor.nombre} ${fila.autor.apellidoPaterno}`,
        }
      : null,
  }
}

export interface PaginaDe<T> {
  recursos: T[]
  paginacion: Paginacion
}

const PRIMERA_PAGINA: PeticionPagina = { pagina: 1, porPagina: 50 }

/** Cuenta y lee una página en la misma transacción, para que el total y las
 * filas correspondan al mismo momento. */
async function paginar<T>(
  where: Prisma.RecursoFormativoWhereInput,
  { pagina, porPagina }: PeticionPagina,
  convertir: (fila: FilaRecurso) => T,
): Promise<PaginaDe<T>> {
  const [total, filas] = await prisma.$transaction([
    prisma.recursoFormativo.count({ where }),
    prisma.recursoFormativo.findMany({
      where,
      include: INCLUIR_METADATOS,
      orderBy: ORDEN_CATALOGO,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    recursos: filas.map(convertir),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

// ---- Público ----

export async function listarRecursosPublicados(
  filtros: FiltrosRecursos = {},
  pagina: PeticionPagina = PRIMERA_PAGINA,
): Promise<PaginaDe<ResumenRecurso>> {
  const where: Prisma.RecursoFormativoWhereInput = { estatus: 'publicado' }
  if (filtros.seccion) where.seccion = filtros.seccion
  if (filtros.area) where.area = filtros.area
  if (filtros.tiposRecurso) where.tipoRecurso = { in: filtros.tiposRecurso }
  if (filtros.texto) {
    where.textoBusqueda = { contains: normalizarBusqueda(filtros.texto) }
  }
  return paginar(where, pagina, aResumen)
}

export async function obtenerRecursoPublicado(idRecurso: string): Promise<RecursoPublico> {
  const fila = await prisma.recursoFormativo.findFirst({
    where: { idRecurso, estatus: 'publicado' },
    include: INCLUIR_METADATOS,
  })
  if (!fila) throw new ErrorRecursoNoEncontrado()
  return aPublico(fila)
}

export async function obtenerArchivoPublicado(
  idRecurso: string,
): Promise<{ contenido: Uint8Array; tipo: string; nombre: string }> {
  const archivo = await prisma.archivoRecurso.findFirst({
    where: { idRecurso, recurso: { estatus: 'publicado' } },
    select: { contenido: true, tipo: true, nombre: true },
  })
  if (!archivo) throw new ErrorRecursoNoEncontrado()
  return archivo
}

// ---- Biblioteca personal (REC-02) ----
//
// Guardar un recurso para después. Es solo un marcador: no inicia un curso
// ni genera medición, y nadie más ve qué guardó cada persona.

/** Guarda un recurso publicado. Guardarlo otra vez no hace nada. */
export async function guardarRecurso(idUsuario: string, idRecurso: string): Promise<void> {
  const existe = await prisma.recursoFormativo.findFirst({
    where: { idRecurso, estatus: 'publicado' },
    select: { idRecurso: true },
  })
  if (!existe) throw new ErrorRecursoNoEncontrado()
  await prisma.recursoGuardado.createMany({
    data: [{ idUsuario, idRecurso }],
    skipDuplicates: true,
  })
}

/** Quita un recurso guardado, en cualquier estatus. Si no estaba, no pasa
 * nada. */
export async function quitarRecursoGuardado(idUsuario: string, idRecurso: string): Promise<void> {
  await prisma.recursoGuardado.deleteMany({ where: { idUsuario, idRecurso } })
}

export async function estaGuardado(idUsuario: string, idRecurso: string): Promise<boolean> {
  const fila = await prisma.recursoGuardado.findUnique({
    where: { idUsuario_idRecurso: { idUsuario, idRecurso } },
    select: { idRecurso: true },
  })
  return fila !== null
}

/** Mis recursos guardados, el más reciente primero. Solo los publicados: uno
 * retirado se oculta (su título no se expone, igual que en un curso) y vuelve
 * a aparecer si se publica de nuevo. */
export async function listarRecursosGuardados(
  idUsuario: string,
  { pagina, porPagina }: PeticionPagina,
): Promise<PaginaDe<ResumenRecurso>> {
  const where: Prisma.RecursoGuardadoWhereInput = { idUsuario, recurso: { estatus: 'publicado' } }
  const [total, filas] = await prisma.$transaction([
    prisma.recursoGuardado.count({ where }),
    prisma.recursoGuardado.findMany({
      where,
      include: { recurso: { include: INCLUIR_METADATOS } },
      orderBy: [{ fechaGuardado: 'desc' }, { idRecurso: 'asc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ])
  return {
    recursos: filas.map((f) => aResumen(f.recurso)),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  }
}

// ---- Administración ----

/** El archivo de un recurso en cualquier estatus, para revisarlo antes de
 * publicarlo (§12.3, vista previa): el administrador, el de lo que ve; el
 * autor, el de su propuesta. */
export async function obtenerArchivoAdmin(
  idRecurso: string,
  acceso: Acceso = ADMIN,
): Promise<{ contenido: Uint8Array; tipo: string; nombre: string }> {
  const fila = await prisma.recursoFormativo.findUnique({
    where: { idRecurso },
    select: {
      origen: true,
      estatus: true,
      idUsuarioAutor: true,
      archivo: { select: { contenido: true, tipo: true, nombre: true } },
    },
  })
  if (!fila || !puedeVer(fila, acceso) || !fila.archivo) throw new ErrorRecursoNoEncontrado()
  return fila.archivo
}

/** Lo que el panel no lista: las propuestas que su autor todavía prepara. */
export const SIN_PROPUESTAS_PRIVADAS = {
  NOT: { origen: 'propuesta', estatus: { in: ['borrador', 'cambios_solicitados'] } },
} satisfies Prisma.RecursoFormativoWhereInput

/** Los recursos del panel: el contenido editorial y las propuestas que ya
 * llegaron a revisión. Los filtros sirven también al editor de cursos, que
 * busca en la biblioteca el recurso que quiere usar como lección. */
export async function listarRecursosAdmin(
  pagina: PeticionPagina = PRIMERA_PAGINA,
  filtros: FiltrosRecursosAdmin = {},
): Promise<PaginaDe<RecursoAdmin>> {
  const where: Prisma.RecursoFormativoWhereInput = { ...SIN_PROPUESTAS_PRIVADAS }
  if (filtros.estatus) where.estatus = filtros.estatus
  if (filtros.tiposRecurso) where.tipoRecurso = { in: filtros.tiposRecurso }
  if (filtros.texto) where.textoBusqueda = { contains: normalizarBusqueda(filtros.texto) }
  return paginar(where, pagina, aAdmin)
}

/** Un recurso en su editor. Lo que quien llama no puede ver responde 404. */
export async function obtenerRecursoAdmin(
  idRecurso: string,
  acceso: Acceso = ADMIN,
): Promise<RecursoAdminDetalle> {
  const fila = await prisma.recursoFormativo.findUnique({
    where: { idRecurso },
    include: INCLUIR_METADATOS,
  })
  if (!fila || !puedeVer(fila, acceso)) throw new ErrorRecursoNoEncontrado()
  return conUso(aAdmin(fila))
}

type RecursoCombinado = DatosRecurso & { tieneArchivo: boolean }

/** Lo que guarda la columna texto_busqueda. La migración que la creó rellena
 * los recursos existentes con la misma regla; si esto cambia, hay que
 * recalcularla. */
function textoDeBusqueda(
  r: Pick<DatosRecurso, 'titulo' | 'resumen' | 'area' | 'elementos'>,
): string {
  return textoDeBusquedaCatalogo([r.titulo, r.resumen], r.area, r.elementos)
}

/**
 * Reglas que cruzan campos, sobre el recurso ya combinado con la edición.
 * Siempre: si el tipo es de enlace, el contenido (cuando lo hay) es una URL
 * https. Al estar publicado, además, los mínimos de §6.4 que el sistema puede
 * comprobar.
 */
function validarCoherencia(r: RecursoCombinado): void {
  const detalle: Record<string, string> = {}
  const esDeUrl = TIPOS_CON_URL.includes(r.tipoRecurso)

  if (esDeUrl && r.contenido && !esUrlSegura(r.contenido)) {
    detalle.contenido = 'Debe ser una dirección que empiece con https://.'
  }

  if (r.estatus === 'publicado') {
    if (!r.resumen) detalle.resumen = 'Escribe un resumen antes de publicar.'
    if (!r.area) detalle.area = 'Elige el área de habilidad antes de publicar.'
    if (r.elementos.length === 0) {
      detalle.elementos = 'Relaciona al menos un elemento de colaboración.'
    }
    if (r.duracionMin === null) detalle.duracionMin = 'Indica la duración antes de publicar.'
    if (!r.fuente) detalle.fuente = 'Indica la fuente o autoría antes de publicar.'
    if (!r.licencia) detalle.licencia = 'Indica la licencia o derechos de uso antes de publicar.'

    switch (r.tipoRecurso) {
      case 'texto':
        if (!r.contenido) detalle.contenido = 'El artículo no tiene contenido.'
        break
      case 'plantilla':
        if (!r.contenido && !r.tieneArchivo) {
          detalle.contenido = 'Escribe las instrucciones o adjunta el archivo de la plantilla.'
        }
        break
      case 'pdf':
        if (!r.tieneArchivo) detalle.archivo = 'Adjunta el PDF antes de publicar.'
        break
      case 'video':
        if (!r.contenido) detalle.contenido = 'Indica la dirección del video.'
        // Accesibilidad obligatoria para video (§6.2 y §10.2).
        if (!r.transcripcion) {
          detalle.transcripcion = 'El video necesita transcripción o descripción de subtítulos.'
        }
        break
      case 'enlace':
        if (!r.contenido) detalle.contenido = 'Indica la dirección del enlace.'
        break
    }
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
}

/** El recurso tal como está, para revisar sus mínimos antes de publicarlo. */
function combinadoDe(fila: FilaRecurso): RecursoCombinado {
  return {
    seccion: fila.seccion,
    titulo: fila.titulo,
    resumen: fila.resumen,
    tipoRecurso: fila.tipoRecurso,
    contenido: fila.contenido,
    transcripcion: fila.transcripcion,
    area: fila.area as AreaHabilidad | null,
    elementos: fila.elementos as ElementoColaboracion[],
    duracionMin: fila.duracionMin,
    fuente: fila.fuente,
    licencia: fila.licencia,
    orden: fila.orden,
    estatus: fila.estatus,
    tieneArchivo: fila.archivo !== null,
  }
}

/** Los mínimos de publicación de un recurso que ya existe. Los usa la
 * revisión: al enviar una propuesta y al aprobarla. */
export async function validarRecursoPublicable(
  tx: Prisma.TransactionClient,
  idRecurso: string,
): Promise<void> {
  const fila = await tx.recursoFormativo.findUniqueOrThrow({
    where: { idRecurso },
    include: INCLUIR_METADATOS,
  })
  validarCoherencia({ ...combinadoDe(fila), estatus: 'publicado' })
}

// Las transiciones que el administrador hace directamente sobre su contenido.
// Los estados de revisión no aparecen: los recorren solo las propuestas, con
// un envío o una decisión (revision.service.ts).
const TRANSICIONES: Readonly<Record<EstatusRecurso, readonly EstatusRecurso[]>> = {
  borrador: ['borrador', 'publicado'],
  publicado: ['publicado', 'retirado'],
  retirado: ['retirado', 'publicado'],
  en_revision: ['en_revision'],
  cambios_solicitados: ['cambios_solicitados'],
  rechazado: ['rechazado'],
}

export interface OpcionesAlta {
  /** Una propuesta nace en borrador y es solo de su autor. */
  origen?: OrigenContenido
  /** Para crearlo dentro de otra transacción (la del límite de propuestas). */
  cliente?: Prisma.TransactionClient
}

export async function crearRecurso(
  idUsuarioAutor: string,
  datos: Partial<DatosRecurso>,
  {
    origen = 'editorial',
    cliente = prisma as unknown as Prisma.TransactionClient,
  }: OpcionesAlta = {},
): Promise<RecursoAdminDetalle> {
  // El alta ya validó sección, título y tipo como obligatorios.
  const combinado = {
    resumen: '',
    contenido: '',
    transcripcion: '',
    area: null,
    elementos: [],
    duracionMin: null,
    fuente: '',
    licencia: '',
    orden: 0,
    estatus: 'borrador',
    ...datos,
    tieneArchivo: false,
  } as RecursoCombinado
  // Un PDF no se puede publicar en el mismo alta: el archivo se sube después.
  validarCoherencia(combinado)

  // Por defecto al final de la lista.
  const orden =
    datos.orden ??
    ((await cliente.recursoFormativo.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1

  const fila = await cliente.recursoFormativo.create({
    data: {
      seccion: combinado.seccion,
      titulo: combinado.titulo,
      resumen: combinado.resumen,
      tipoRecurso: combinado.tipoRecurso,
      contenido: combinado.contenido,
      transcripcion: combinado.transcripcion,
      area: combinado.area,
      elementos: combinado.elementos,
      duracionMin: combinado.duracionMin,
      fuente: combinado.fuente,
      licencia: combinado.licencia,
      orden,
      estatus: combinado.estatus,
      origen,
      textoBusqueda: textoDeBusqueda(combinado),
      idUsuarioAutor,
    },
    include: INCLUIR_METADATOS,
  })
  return { ...aAdmin(fila), usadoEn: [] }
}

/**
 * Toda modificación de un recurso existente (ficha, estatus, archivo,
 * borrado) corre dentro de una transacción que primero bloquea su fila con
 * SELECT … FOR UPDATE. Así la lectura, la validación de los mínimos y la
 * escritura de una petición no se intercalan con las de otra sobre el mismo
 * recurso: sin el bloqueo, publicar un borrador completo mientras otra
 * petición vacía su contenido (o quita su PDF) podía dejar publicado un
 * recurso que no cumple los mínimos. Las peticiones sobre recursos distintos
 * no se esperan entre sí.
 *
 * Con la fila bloqueada se decide además si quien llama la puede ver (si no,
 * 404) y se le entrega su estado, para que la operación decida si la puede
 * editar (acceso.ts). La revisión usa el mismo bloqueo, así que un envío, una
 * decisión y una edición de la misma propuesta se forman en fila.
 */
export async function conRecursoBloqueado<T>(
  idRecurso: string,
  acceso: Acceso,
  operacion: (tx: Prisma.TransactionClient, estado: EstadoContenido) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<
      { origen: OrigenContenido; estatus: EstatusRecurso; id_usuario_autor: string | null }[]
    >`
      SELECT origen::text AS origen, estatus::text AS estatus, id_usuario_autor
      FROM recursos_formativos WHERE id_recurso = ${idRecurso} FOR UPDATE`
    const estado = filas[0]
      ? {
          origen: filas[0].origen,
          estatus: filas[0].estatus,
          idUsuarioAutor: filas[0].id_usuario_autor,
        }
      : null
    if (!estado || !puedeVer(estado, acceso)) throw new ErrorRecursoNoEncontrado()
    return operacion(tx, estado)
  })
}

/**
 * Lo que sigue a que un recurso cambie de estatus. Retirarlo hace que su
 * lección deje de contar para terminar los cursos que lo usan: quien ya tenía
 * hechas las demás los termina. Las rutas se revisan una vez, al final: el
 * candado de las rutas es lo último que pide la transacción, después de
 * bloquear todas las inscripciones.
 */
export async function alCambiarEstatusRecurso(
  tx: Prisma.TransactionClient,
  idRecurso: string,
): Promise<void> {
  const cursos = (await cursosQueUsanRecurso(idRecurso, tx)).map((c) => c.idCurso)
  const terminaron: string[] = []
  for (const idCurso of cursos) terminaron.push(...(await fijarFinalizaciones(tx, idCurso)))
  if (terminaron.length > 0) {
    await emitirConstanciasDeRutas(tx, { idsCurso: cursos, idsUsuario: terminaron })
  }
}

/** Editar un recurso. El administrador edita su contenido y las propuestas ya
 * publicadas; el autor, su propuesta mientras la prepara. `versionLeida` es
 * la versión de la ficha que el editor leyó: si cambió, no se sobrescribe. */
export async function actualizarRecurso(
  idRecurso: string,
  cambios: Partial<DatosRecurso>,
  acceso: Acceso = ADMIN,
  versionLeida?: number,
): Promise<RecursoAdminDetalle> {
  const fila = await conRecursoBloqueado(idRecurso, acceso, async (tx, estado) => {
    exigirEditable(estado, acceso)
    const actual = await tx.recursoFormativo.findUniqueOrThrow({
      where: { idRecurso },
      include: INCLUIR_METADATOS,
    })
    if (versionLeida !== undefined && versionLeida !== actual.versionFicha) {
      throw new ErrorRecursoDesactualizado()
    }
    // El estatus de una propuesta no se edita: cambia con un envío o con una
    // decisión que lleva motivo (revision.service.ts).
    if (
      actual.origen === 'propuesta' &&
      cambios.estatus !== undefined &&
      cambios.estatus !== actual.estatus
    ) {
      throw new ErrorPropuestaNoEditable(
        'Las decisiones sobre una propuesta se toman desde la cola de revisión, con motivo.',
      )
    }

    if (cambios.estatus && !TRANSICIONES[actual.estatus].includes(cambios.estatus)) {
      throw new ErrorValidacion({
        estatus:
          actual.estatus === 'borrador'
            ? 'Un borrador solo puede publicarse.'
            : 'Un recurso publicado no vuelve a borrador; edítalo o retíralo.',
      })
    }

    const tipoFinal = cambios.tipoRecurso ?? actual.tipoRecurso
    // Cambiar a un tipo que no admite archivo lo descarta: quedaría huérfano,
    // sin forma de verse ni de quitarse desde la interfaz.
    const descartarArchivo = actual.archivo !== null && !TIPOS_CON_ARCHIVO.includes(tipoFinal)

    const final: RecursoCombinado = {
      seccion: actual.seccion,
      titulo: actual.titulo,
      resumen: actual.resumen,
      tipoRecurso: actual.tipoRecurso,
      contenido: actual.contenido,
      transcripcion: actual.transcripcion,
      area: actual.area as AreaHabilidad | null,
      elementos: actual.elementos as ElementoColaboracion[],
      duracionMin: actual.duracionMin,
      fuente: actual.fuente,
      licencia: actual.licencia,
      orden: actual.orden,
      estatus: actual.estatus,
      ...cambios,
      tieneArchivo: actual.archivo !== null && !descartarArchivo,
    }
    validarCoherencia(final)

    if (descartarArchivo) await tx.archivoRecurso.delete({ where: { idRecurso } })
    const actualizado = await tx.recursoFormativo.update({
      where: { idRecurso },
      data: {
        ...cambios,
        textoBusqueda: textoDeBusqueda(final),
        versionFicha: { increment: 1 },
      },
      include: INCLUIR_METADATOS,
    })
    if (actualizado.estatus !== actual.estatus) await alCambiarEstatusRecurso(tx, idRecurso)
    return actualizado
  })
  return conUso(aAdmin(fila))
}

/** Borra el recurso y su archivo, salvo que algún curso lo use: entonces
 * hay que quitarlo de esos cursos primero, o retirarlo. La llave RESTRICT de
 * lecciones_curso lo garantiza en la base; aquí se comprueba antes para dar
 * un mensaje que nombre los cursos.
 *
 * El administrador no borra propuestas: las rechaza o las retira. El autor
 * borra la suya mientras la prepara o si se rechazó, nunca en revisión ni ya
 * publicada. */
export async function eliminarRecurso(idRecurso: string, acceso: Acceso = ADMIN): Promise<void> {
  await conRecursoBloqueado(idRecurso, acceso, async (tx, estado) => {
    exigirEliminable(estado, acceso)
    const cursos = await cursosQueUsanRecurso(idRecurso, tx)
    if (cursos.length > 0) throw new ErrorRecursoEnUso(cursos)
    try {
      await tx.recursoFormativo.delete({ where: { idRecurso } })
    } catch (error) {
      // Una lección agregada después de la comprobación: la llave foránea
      // rechaza el borrado (P2003) y se responde igual.
      if ((error as { code?: string }).code === 'P2003') {
        throw new ErrorRecursoEnUso(await cursosQueUsanRecurso(idRecurso))
      }
      throw error
    }
  })
}

// Firma de un PDF: los primeros bytes son "%PDF-". Se comprueba además del
// Content-Type porque ese encabezado lo decide el cliente.
const FIRMA_PDF = Buffer.from('%PDF-', 'ascii')

export async function guardarArchivoRecurso(
  idRecurso: string,
  tipo: string,
  nombre: string,
  contenido: Buffer,
  acceso: Acceso = ADMIN,
): Promise<RecursoAdminDetalle> {
  // El contenido se valida antes de abrir la transacción: no depende del
  // estado del recurso y así el bloqueo dura lo menos posible.
  if (!esTipoArchivoRecurso(tipo)) throw new ErrorArchivoInvalido('El archivo debe ser PDF.')
  if (contenido.length === 0) throw new ErrorArchivoInvalido('El archivo llegó vacío.')
  if (contenido.length > MAX_BYTES_ARCHIVO_RECURSO) {
    throw new ErrorArchivoInvalido('El archivo pesa más de lo permitido.')
  }
  if (!contenido.subarray(0, FIRMA_PDF.length).equals(FIRMA_PDF)) {
    throw new ErrorArchivoInvalido('El archivo no es un PDF válido.')
  }

  const nombreLimpio = limpiarNombreArchivo(nombre)
  const datos = {
    contenido: new Uint8Array(contenido),
    tipo,
    nombre: nombreLimpio,
    tamano: contenido.length,
    actualizadoEn: new Date(),
  }
  await conRecursoBloqueado(idRecurso, acceso, async (tx, estado) => {
    exigirEditable(estado, acceso)
    // El tipo se lee con la fila bloqueada: un cambio de tipo simultáneo no
    // puede dejar el archivo huérfano en un recurso que no lo admite.
    const { tipoRecurso } = await tx.recursoFormativo.findUniqueOrThrow({
      where: { idRecurso },
      select: { tipoRecurso: true },
    })
    if (!TIPOS_CON_ARCHIVO.includes(tipoRecurso)) {
      throw new ErrorArchivoInvalido('Este tipo de recurso no admite archivo adjunto.')
    }
    await tx.archivoRecurso.upsert({
      where: { idRecurso },
      create: { idRecurso, ...datos },
      update: datos,
    })
  })
  return obtenerRecursoAdmin(idRecurso, acceso)
}

export async function quitarArchivoRecurso(
  idRecurso: string,
  acceso: Acceso = ADMIN,
): Promise<RecursoAdminDetalle> {
  await conRecursoBloqueado(idRecurso, acceso, async (tx, estado) => {
    exigirEditable(estado, acceso)
    const actual = await tx.recursoFormativo.findUniqueOrThrow({
      where: { idRecurso },
      select: { estatus: true, tipoRecurso: true, contenido: true },
    })
    // Quitarlo dejaría publicado un recurso que ya no cumple los mínimos.
    if (
      actual.estatus === 'publicado' &&
      (actual.tipoRecurso === 'pdf' || (actual.tipoRecurso === 'plantilla' && !actual.contenido))
    ) {
      throw new ErrorValidacion({
        archivo: 'El recurso publicado depende de este archivo. Sube otro o retira el recurso.',
      })
    }
    await tx.archivoRecurso.deleteMany({ where: { idRecurso } })
  })
  return obtenerRecursoAdmin(idRecurso, acceso)
}

/** Quién borra qué (ver eliminarRecurso). Lo comparte cursos.service. */
export function exigirEliminable(estado: EstadoContenido, acceso: Acceso): void {
  if (estado.origen !== 'propuesta') return
  if (acceso.rol === 'admin') {
    throw new ErrorPropuestaNoEliminable(
      'Una propuesta no se elimina desde el panel: recházala o retírala.',
    )
  }
  if (estado.estatus === 'en_revision') {
    throw new ErrorPropuestaNoEliminable(
      'Tu propuesta está en revisión. Cancela el envío para poder eliminarla.',
    )
  }
  if (estado.estatus === 'publicado' || estado.estatus === 'retirado') {
    throw new ErrorPropuestaNoEliminable(
      'Esta propuesta ya se publicó: solo el administrador puede retirarla.',
    )
  }
}

/** Nombre con el que se ofrece la descarga: sin rutas ni caracteres de
 * control, con extensión .pdf. */
function limpiarNombreArchivo(nombre: string): string {
  const base = nombre
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f"]/g, '')
    .trim()
    .slice(0, 120)
  if (!base) return 'recurso.pdf'
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`
}
