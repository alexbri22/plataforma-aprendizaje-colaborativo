import { NivelEstudios } from '@prisma/client'
import { ErrorValidacion } from '../../errores.js'

const VALORES_NIVEL_ESTUDIOS = new Set<string>(Object.values(NivelEstudios))

// apps/web/src/features/cuentas/PantallaRegistrarse.tsx envía la etiqueta
// visible ("Preparatoria o bachillerato"), no el valor del catálogo de
// docs/diseno-desarrollo-general.md §5.1 ("preparatoria_o_bachillerato").
// Sin un paquete de validación compartido (item 1, fuera de alcance de esta
// tarea) esta correspondencia queda duplicada aquí; moverla a
// packages/shared eliminaría el duplicado.
const ETIQUETA_A_NIVEL_ESTUDIOS: Record<string, NivelEstudios> = {
  primaria: NivelEstudios.primaria,
  secundaria: NivelEstudios.secundaria,
  'preparatoria o bachillerato': NivelEstudios.preparatoria_o_bachillerato,
  licenciatura: NivelEstudios.licenciatura,
  posgrado: NivelEstudios.posgrado,
  otro: NivelEstudios.otro,
}

function normalizarNivelEstudios(valor: unknown): NivelEstudios | undefined {
  if (typeof valor !== 'string') return undefined
  const clave = valor.trim().toLowerCase()
  if (VALORES_NIVEL_ESTUDIOS.has(clave)) return clave as NivelEstudios
  return ETIQUETA_A_NIVEL_ESTUDIOS[clave]
}

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requerido(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined
  const limpio = valor.trim()
  return limpio.length > 0 ? limpio : undefined
}

export interface DatosRegistroValidados {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  nivelEstudios: NivelEstudios
  institucionEducativa: string
  correo: string
  contrasena: string
}

// Registro y credenciales (docs/diseno-desarrollo-nucleo.md §6.2): longitud
// mínima de ocho caracteres, sin reglas de composición.
const LONGITUD_MINIMA_CONTRASENA = 8

export function validarDatosRegistro(cuerpo: unknown): DatosRegistroValidados {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detallePorCampo: Record<string, string> = {}

  const nombre = requerido(datos.nombre)
  if (!nombre) detallePorCampo.nombre = 'El nombre es requerido.'

  const apellidoPaterno = requerido(datos.apellidoPaterno)
  if (!apellidoPaterno) detallePorCampo.apellidoPaterno = 'El apellido paterno es requerido.'

  const apellidoMaterno = requerido(datos.apellidoMaterno)
  if (!apellidoMaterno) detallePorCampo.apellidoMaterno = 'El apellido materno es requerido.'

  const nivelEstudios = normalizarNivelEstudios(datos.nivelEstudios)
  if (!nivelEstudios) detallePorCampo.nivelEstudios = 'Selecciona un nivel de estudios válido.'

  const institucionEducativa = requerido(datos.institucionEducativa)
  if (!institucionEducativa) {
    detallePorCampo.institucionEducativa = 'La institución educativa es requerida.'
  }

  const correo = requerido(datos.correo)
  if (!correo || !CORREO_RE.test(correo)) {
    detallePorCampo.correo = 'Ingresa un correo válido.'
  }

  const contrasena = typeof datos.contrasena === 'string' ? datos.contrasena : ''
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    detallePorCampo.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
  }

  if (Object.keys(detallePorCampo).length > 0) {
    throw new ErrorValidacion(detallePorCampo)
  }

  return {
    nombre: nombre as string,
    apellidoPaterno: apellidoPaterno as string,
    apellidoMaterno: apellidoMaterno as string,
    nivelEstudios: nivelEstudios as NivelEstudios,
    institucionEducativa: institucionEducativa as string,
    correo: correo as string,
    contrasena,
  }
}

export interface CredencialesValidadas {
  correo: string
  contrasena: string
}

export function validarCredenciales(cuerpo: unknown): CredencialesValidadas {
  const datos = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  const detallePorCampo: Record<string, string> = {}

  const correo = requerido(datos.correo)
  if (!correo) detallePorCampo.correo = 'El correo es requerido.'

  const contrasena = typeof datos.contrasena === 'string' ? datos.contrasena : ''
  if (!contrasena) detallePorCampo.contrasena = 'La contraseña es requerida.'

  if (Object.keys(detallePorCampo).length > 0) {
    throw new ErrorValidacion(detallePorCampo)
  }

  return { correo: correo as string, contrasena }
}
