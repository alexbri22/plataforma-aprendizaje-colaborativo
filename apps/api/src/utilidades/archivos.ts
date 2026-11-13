import { MAX_BYTES_ARCHIVO_ELEMENTO, esTipoArchivoElemento } from '@plataforma/shared'
import { ErrorArchivoInvalido } from '../errores.js'

// Archivo adjunto de un elemento del espacio de equipo o de la entrega de una
// actividad externa: mismas reglas en los dos (nucleo §9.1, §10.1).

// Firmas de los primeros bytes de cada formato admitido: el tipo que manda
// el navegador se puede falsear, el contenido no tanto. Los Office actuales
// son un ZIP; los anteriores a 2007, un contenedor OLE.
const FIRMAS: { tipos: string[]; firma: number[]; desde?: number }[] = [
  { tipos: ['application/pdf'], firma: [0x25, 0x50, 0x44, 0x46] },
  { tipos: ['image/png'], firma: [0x89, 0x50, 0x4e, 0x47] },
  { tipos: ['image/jpeg'], firma: [0xff, 0xd8, 0xff] },
  { tipos: ['image/gif'], firma: [0x47, 0x49, 0x46, 0x38] },
  { tipos: ['image/webp'], firma: [0x57, 0x45, 0x42, 0x50], desde: 8 },
  {
    tipos: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    firma: [0x50, 0x4b, 0x03, 0x04],
  },
  {
    tipos: ['application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'],
    firma: [0xd0, 0xcf, 0x11, 0xe0],
  },
]

function coincideConSuTipo(tipo: string, contenido: Buffer): boolean {
  const regla = FIRMAS.find((f) => f.tipos.includes(tipo))
  if (!regla) return false
  const desde = regla.desde ?? 0
  return regla.firma.every((byte, i) => contenido[desde + i] === byte)
}

export function limpiarNombreArchivo(nombre: string): string {
  const base = nombre
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f"]/g, '')
    .trim()
    .slice(0, 120)
  return base || 'archivo'
}

// Lanza ErrorArchivoInvalido si el archivo no es de un tipo admitido, está
// vacío, pesa de más o su contenido no corresponde a su tipo.
export function validarArchivoAdjunto(tipo: string, contenido: Buffer): void {
  if (!esTipoArchivoElemento(tipo)) {
    throw new ErrorArchivoInvalido('Solo se admiten PDF, imágenes y documentos de Office.')
  }
  if (contenido.length === 0) throw new ErrorArchivoInvalido('El archivo llegó vacío.')
  if (contenido.length > MAX_BYTES_ARCHIVO_ELEMENTO) {
    throw new ErrorArchivoInvalido('El archivo pesa más de 4 MB. Súbelo a Drive y pega el enlace.')
  }
  if (!coincideConSuTipo(tipo, contenido)) {
    throw new ErrorArchivoInvalido('El archivo no corresponde a su tipo o está dañado.')
  }
}
