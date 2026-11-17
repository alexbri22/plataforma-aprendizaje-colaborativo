import {
  CRITERIOS_PUBLICACION,
  DECISIONES_CON_MOTIVO,
  LARGO_MAXIMO_MOTIVO,
  esDecisionRevision,
  esTipoContenido,
  type CriterioPublicacion,
  type DecisionRevision,
  type TipoContenido,
} from '@plataforma/shared'
import { ErrorValidacion } from '../../errores.js'
import { validarDatosCurso, type DatosCurso } from './cursos.validacion.js'
import { validarDatosRecurso, type DatosRecurso } from './validacion.js'

/*
 * Forma de lo que llega en la autoría abierta (nota del incremento 6): lo que
 * el autor edita de su propuesta y lo que el administrador decide sobre ella.
 */

type Datos = Record<string, unknown>

function comoObjeto(cuerpo: unknown): Datos {
  return (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Datos
}

/** Lo que solo decide el administrador. Llega como error y no se ignora: un
 * autor que manda `estatus: publicado` debe saber que eso no publica nada. */
function sinCamposDelAdministrador(cuerpo: unknown): void {
  const datos = comoObjeto(cuerpo)
  const detalle: Record<string, string> = {}
  if (datos.estatus !== undefined) {
    detalle.estatus = 'El estado de una propuesta cambia al enviarla a revisión.'
  }
  if (datos.orden !== undefined) {
    detalle.orden = 'El lugar en el catálogo lo decide el administrador.'
  }
  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
}

export function validarDatosPropuestaRecurso(
  cuerpo: unknown,
  parcial: boolean,
): Partial<DatosRecurso> {
  sinCamposDelAdministrador(cuerpo)
  return validarDatosRecurso(cuerpo, parcial)
}

export function validarDatosPropuestaCurso(cuerpo: unknown, parcial: boolean): Partial<DatosCurso> {
  sinCamposDelAdministrador(cuerpo)
  return validarDatosCurso(cuerpo, parcial)
}

/** El tipo de contenido que llega en la ruta (`recursos` o `cursos`). */
export function validarTipoContenido(valor: unknown): TipoContenido {
  const singular = typeof valor === 'string' ? valor.replace(/s$/, '') : ''
  if (esTipoContenido(singular)) return singular
  throw new ErrorValidacion({ tipo: 'Solo se proponen recursos y cursos.' })
}

export interface DecisionValidada {
  decision: DecisionRevision
  motivo: string
  criterios: CriterioPublicacion[]
}

const IDS_CRITERIOS: readonly string[] = CRITERIOS_PUBLICACION.map((c) => c.id)

/**
 * Una decisión del administrador (MOD-01). El motivo es obligatorio al pedir
 * cambios, rechazar y retirar: la persona debe saber qué cambiar o por qué no
 * se publicó. Aprobar exige marcar los siete criterios de §6.4 y admite un
 * comentario.
 */
export function validarDecision(cuerpo: unknown): DecisionValidada {
  const datos = comoObjeto(cuerpo)
  const detalle: Record<string, string> = {}

  const decision = datos.decision
  if (typeof decision !== 'string' || !esDecisionRevision(decision)) {
    throw new ErrorValidacion({ decision: 'Elige una decisión válida.' })
  }

  let motivo = ''
  if (datos.motivo !== undefined) {
    if (typeof datos.motivo !== 'string') detalle.motivo = 'Escribe el motivo como texto.'
    else motivo = datos.motivo.trim()
  }
  if (motivo.length > LARGO_MAXIMO_MOTIVO) {
    detalle.motivo = `El motivo admite hasta ${LARGO_MAXIMO_MOTIVO} caracteres.`
  } else if (DECISIONES_CON_MOTIVO.includes(decision) && !motivo && !detalle.motivo) {
    detalle.motivo =
      decision === 'pedir_cambios'
        ? 'Explica qué hay que cambiar.'
        : decision === 'rechazar'
          ? 'Explica por qué no se publica.'
          : 'Explica por qué se retira.'
  }

  let criterios: CriterioPublicacion[] = []
  if (datos.criterios !== undefined) {
    if (
      Array.isArray(datos.criterios) &&
      datos.criterios.every((c) => typeof c === 'string' && IDS_CRITERIOS.includes(c))
    ) {
      criterios = [...new Set(datos.criterios as CriterioPublicacion[])]
    } else {
      detalle.criterios = 'Los criterios no son válidos.'
    }
  }
  if (decision === 'aprobar' && !detalle.criterios && criterios.length !== IDS_CRITERIOS.length) {
    detalle.criterios = 'Para aprobar, revisa y marca los siete criterios de publicación.'
  }

  if (Object.keys(detalle).length > 0) throw new ErrorValidacion(detalle)
  return { decision, motivo, criterios }
}
