/*
 * Perfil de usuario: el contrato de la foto y las etiquetas del nivel de
 * estudios. Vive en shared porque el cliente reduce y convierte la foto antes
 * de subirla y el API la vuelve a verificar al recibirla; si los límites se
 * escribieran dos veces, el día que uno cambie el otro empezaría a rechazar
 * fotos que el cliente cree válidas.
 *
 * Fuente: docs/diseno-desarrollo-nucleo.md, sección 6.3.
 */

/** Tipos de imagen admitidos para la foto de perfil. */
export const TIPOS_FOTO_PERFIL = ['image/jpeg', 'image/png', 'image/webp'] as const

export type TipoFotoPerfil = (typeof TIPOS_FOTO_PERFIL)[number]

/** Lado, en píxeles, al que el cliente reduce la foto antes de subirla. Es
 * cuadrada: se recorta al centro, no se deforma. */
export const LADO_FOTO_PERFIL = 256

/** Tamaño máximo del archivo que el API acepta. Una foto de 256 px en WebP
 * pesa 10-30 KB; el margen es para PNG con transparencia y clientes que no
 * puedan producir WebP. */
export const MAX_BYTES_FOTO_PERFIL = 512 * 1024

export function esTipoFotoPerfil(tipo: string): tipo is TipoFotoPerfil {
  return (TIPOS_FOTO_PERFIL as readonly string[]).includes(tipo)
}

/** Catálogo de nivel de estudios (docs/diseno-desarrollo-general.md §5.1) con
 * la etiqueta que se muestra. La llave es el valor que guarda la base. */
export const NIVELES_ESTUDIOS = [
  'primaria',
  'secundaria',
  'preparatoria_o_bachillerato',
  'licenciatura',
  'posgrado',
  'otro',
] as const

export type NivelEstudios = (typeof NIVELES_ESTUDIOS)[number]

export const ETIQUETAS_NIVEL_ESTUDIOS: Readonly<Record<NivelEstudios, string>> = {
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  preparatoria_o_bachillerato: 'Preparatoria o bachillerato',
  licenciatura: 'Licenciatura',
  posgrado: 'Posgrado',
  otro: 'Otro',
}
