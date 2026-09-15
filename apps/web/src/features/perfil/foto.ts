import {
  LADO_FOTO_PERFIL,
  MAX_BYTES_FOTO_PERFIL,
  TIPOS_FOTO_PERFIL,
  esTipoFotoPerfil,
} from '@plataforma/shared'

/*
 * Prepara una imagen elegida por el usuario para subirla como foto de perfil:
 * la recorta al centro en cuadrado, la reduce a LADO_FOTO_PERFIL píxeles y la
 * codifica en WebP (o JPEG donde el navegador no sepa producir WebP).
 *
 * Se hace aquí y no en el servidor porque el API corre como función sin
 * sistema de archivos y sin un decodificador de imágenes propio
 * (docs/diseno-desarrollo-nucleo.md §6.3): una foto de cámara de 5 MB se
 * convierte en 20 KB antes de salir del navegador, y el servidor solo tiene
 * que comprobar tipo, firma y tamaño.
 */

/** Hasta dónde se acepta el archivo original antes de reducirlo. Es el
 * límite de lo que se lee en memoria, no de lo que se sube. */
export const MAX_BYTES_ORIGEN = 20 * 1024 * 1024

export const TIPOS_ACEPTADOS = TIPOS_FOTO_PERFIL.join(',')

export class ErrorFoto extends Error {}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad))
}

export async function prepararFoto(archivo: File): Promise<Blob> {
  if (!esTipoFotoPerfil(archivo.type)) {
    throw new ErrorFoto('Elige una imagen JPEG, PNG o WebP.')
  }
  if (archivo.size > MAX_BYTES_ORIGEN) {
    throw new ErrorFoto('La imagen es demasiado grande. Prueba con una de menos de 20 MB.')
  }

  let imagen: ImageBitmap
  try {
    // `from-image` aplica la orientación EXIF: sin eso, una foto tomada con
    // el teléfono en vertical llega acostada.
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorFoto('No pudimos leer esa imagen. Prueba con otro archivo.')
  }

  try {
    const lado = Math.min(imagen.width, imagen.height)
    const x = (imagen.width - lado) / 2
    const y = (imagen.height - lado) / 2

    const lienzo = document.createElement('canvas')
    lienzo.width = LADO_FOTO_PERFIL
    lienzo.height = LADO_FOTO_PERFIL
    const contexto = lienzo.getContext('2d')
    if (!contexto) throw new ErrorFoto('Tu navegador no puede procesar la imagen.')
    contexto.drawImage(imagen, x, y, lado, lado, 0, 0, LADO_FOTO_PERFIL, LADO_FOTO_PERFIL)

    // Safari viejo devuelve PNG cuando se le pide WebP; el tipo del blob es
    // la verdad, no lo que se pidió.
    let blob = await aBlob(lienzo, 'image/webp', 0.85)
    if (!blob || blob.type !== 'image/webp') blob = await aBlob(lienzo, 'image/jpeg', 0.85)
    if (!blob || !esTipoFotoPerfil(blob.type)) {
      throw new ErrorFoto('Tu navegador no puede procesar la imagen.')
    }
    if (blob.size > MAX_BYTES_FOTO_PERFIL) {
      throw new ErrorFoto('No pudimos reducir la imagen lo suficiente. Prueba con otra.')
    }
    return blob
  } finally {
    imagen.close()
  }
}
