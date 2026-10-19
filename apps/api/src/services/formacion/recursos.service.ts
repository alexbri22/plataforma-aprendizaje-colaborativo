import type { Prisma } from '@prisma/client'
import {
  MAX_BYTES_ARCHIVO_RECURSO,
  TIPOS_CON_ARCHIVO,
  TIPOS_CON_URL,
  esTipoArchivoRecurso,
  esUrlSegura,
  normalizarBusqueda,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusRecurso,
  type Paginacion,
  type SeccionFormativa,
  type TipoRecurso,
} from '@plataforma/shared'
import { prisma } from '../../data/prisma.js'
import { ErrorArchivoInvalido, ErrorRecursoNoEncontrado, ErrorValidacion } from '../../errores.js'
import type { DatosRecurso, FiltrosRecursos, PeticionPagina } from './validacion.js'

/*
 * Biblioteca de recursos formativos (docs/diseno-desarrollo-formacion.md §6 y
 * §12.3). En este alcance solo el administrador crea y publica; el público
 * (con o sin sesión) solo ve lo publicado.
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
  fechaCreacion: string
  autor: { idUsuario: string; nombre: string } | null
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

// ---- Administración ----

/** El archivo de un recurso en cualquier estatus, para que el administrador
 * lo revise antes de publicarlo (§12.3, vista previa). */
export async function obtenerArchivoAdmin(
  idRecurso: string,
): Promise<{ contenido: Uint8Array; tipo: string; nombre: string }> {
  const archivo = await prisma.archivoRecurso.findUnique({
    where: { idRecurso },
    select: { contenido: true, tipo: true, nombre: true },
  })
  if (!archivo) throw new ErrorRecursoNoEncontrado()
  return archivo
}

export async function listarRecursosAdmin(
  pagina: PeticionPagina = PRIMERA_PAGINA,
): Promise<PaginaDe<RecursoAdmin>> {
  return paginar({}, pagina, aAdmin)
}

export async function obtenerRecursoAdmin(idRecurso: string): Promise<RecursoAdmin> {
  const fila = await prisma.recursoFormativo.findUnique({
    where: { idRecurso },
    include: INCLUIR_METADATOS,
  })
  if (!fila) throw new ErrorRecursoNoEncontrado()
  return aAdmin(fila)
}

type RecursoCombinado = DatosRecurso & { tieneArchivo: boolean }

/** Lo que guarda la columna texto_busqueda. La migración que la creó rellena
 * los recursos existentes con la misma regla; si esto cambia, hay que
 * recalcularla. */
function textoDeBusqueda(
  r: Pick<DatosRecurso, 'titulo' | 'resumen' | 'area' | 'elementos'>,
): string {
  return normalizarBusqueda([r.titulo, r.resumen, r.area ?? '', ...r.elementos].join(' '))
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

const TRANSICIONES: Readonly<Record<EstatusRecurso, readonly EstatusRecurso[]>> = {
  borrador: ['borrador', 'publicado'],
  publicado: ['publicado', 'retirado'],
  retirado: ['retirado', 'publicado'],
}

export async function crearRecurso(
  idUsuarioAutor: string,
  datos: Partial<DatosRecurso>,
): Promise<RecursoAdmin> {
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
    ((await prisma.recursoFormativo.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1

  const fila = await prisma.recursoFormativo.create({
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
      textoBusqueda: textoDeBusqueda(combinado),
      idUsuarioAutor,
    },
    include: INCLUIR_METADATOS,
  })
  return aAdmin(fila)
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
 */
async function conRecursoBloqueado<T>(
  idRecurso: string,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const bloqueado = await tx.$queryRaw<{ id_recurso: string }[]>`
      SELECT id_recurso FROM recursos_formativos WHERE id_recurso = ${idRecurso} FOR UPDATE`
    if (bloqueado.length === 0) throw new ErrorRecursoNoEncontrado()
    return operacion(tx)
  })
}

export async function actualizarRecurso(
  idRecurso: string,
  cambios: Partial<DatosRecurso>,
): Promise<RecursoAdmin> {
  const fila = await conRecursoBloqueado(idRecurso, async (tx) => {
    const actual = await tx.recursoFormativo.findUniqueOrThrow({
      where: { idRecurso },
      include: INCLUIR_METADATOS,
    })

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
    return tx.recursoFormativo.update({
      where: { idRecurso },
      data: { ...cambios, textoBusqueda: textoDeBusqueda(final) },
      include: INCLUIR_METADATOS,
    })
  })
  return aAdmin(fila)
}

/** Borra el recurso y, en cascada, su archivo. No hay vuelta atrás: para
 * ocultarlo de forma reversible está retirar. */
export async function eliminarRecurso(idRecurso: string): Promise<void> {
  await conRecursoBloqueado(idRecurso, (tx) => tx.recursoFormativo.delete({ where: { idRecurso } }))
}

// Firma de un PDF: los primeros bytes son "%PDF-". Se comprueba además del
// Content-Type porque ese encabezado lo decide el cliente.
const FIRMA_PDF = Buffer.from('%PDF-', 'ascii')

export async function guardarArchivoRecurso(
  idRecurso: string,
  tipo: string,
  nombre: string,
  contenido: Buffer,
): Promise<RecursoAdmin> {
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
  await conRecursoBloqueado(idRecurso, async (tx) => {
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
  return obtenerRecursoAdmin(idRecurso)
}

export async function quitarArchivoRecurso(idRecurso: string): Promise<RecursoAdmin> {
  await conRecursoBloqueado(idRecurso, async (tx) => {
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
  return obtenerRecursoAdmin(idRecurso)
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
