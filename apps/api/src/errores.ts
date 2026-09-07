// Errores de dominio tipados: los servicios no conocen códigos de estado,
// solo señalan el fallo (docs/diseno-desarrollo-nucleo.md §2.3). La capa de
// rutas los traduce a la forma de respuesta de §3.1 vía manejadorErrores.

export type CodigoError =
  | 'validacion'
  | 'correo_duplicado'
  | 'credenciales_invalidas'
  | 'cuenta_desactivada'
  | 'sin_sesion'
  | 'clave_invalida'
  | 'ya_es_miembro'
  | 'actividad_no_encontrada'
  | 'accion_no_permitida'
  | 'fase_no_permite_accion'
  | 'sin_participantes'
  | 'usuario_no_encontrado'
  | 'organizador_unico'

export abstract class ErrorDominio extends Error {
  abstract readonly codigo: CodigoError
  abstract readonly status: number
  detallePorCampo?: Record<string, string>
}

export class ErrorValidacion extends ErrorDominio {
  readonly codigo = 'validacion' as const
  readonly status = 400

  constructor(readonly detallePorCampo: Record<string, string>) {
    super('La petición no es válida.')
  }
}

export class ErrorCorreoDuplicado extends ErrorDominio {
  readonly codigo = 'correo_duplicado' as const
  readonly status = 409

  constructor() {
    super('Ya existe una cuenta con este correo.')
  }
}

export class ErrorCredencialesInvalidas extends ErrorDominio {
  readonly codigo = 'credenciales_invalidas' as const
  readonly status = 401

  constructor() {
    super('Correo o contraseña incorrectos.')
  }
}

export class ErrorCuentaDesactivada extends ErrorDominio {
  readonly codigo = 'cuenta_desactivada' as const
  readonly status = 401

  constructor() {
    super('Esta cuenta está desactivada.')
  }
}

export class ErrorSinSesion extends ErrorDominio {
  readonly codigo = 'sin_sesion' as const
  readonly status = 401

  constructor() {
    super('No hay una sesión activa.')
  }
}

// Misma respuesta tanto si la clave no corresponde a ninguna actividad como
// si corresponde a una que ya salió de inscripción (docs/diseno-desarrollo-nucleo.md
// §7.2: "deja de funcionar... y no se reactiva"). No distinguir ambos casos
// sigue el mismo criterio de 3.3 para no revelar de más.
export class ErrorClaveInvalida extends ErrorDominio {
  readonly codigo = 'clave_invalida' as const
  readonly status = 404

  constructor() {
    super('Esta clave no corresponde a ninguna actividad que admita unirse.')
  }
}

export class ErrorYaEsMiembro extends ErrorDominio {
  readonly codigo = 'ya_es_miembro' as const
  readonly status = 409

  constructor() {
    super('Ya formas parte de esta actividad.')
  }
}

// Mismo criterio que ErrorClaveInvalida: un actor sin membresía no debe
// poder distinguir entre que la actividad no existe y que no es suya
// (docs/diseno-desarrollo-nucleo.md §3.3).
export class ErrorActividadNoEncontrada extends ErrorDominio {
  readonly codigo = 'actividad_no_encontrada' as const
  readonly status = 404

  constructor() {
    super('No encontramos esta actividad, o no formas parte de ella.')
  }
}

// El actor es miembro pero su rol (o los permisos de su co-organización) no
// alcanzan para la acción (docs/diseno-desarrollo-nucleo.md §3.3, fila de
// 403).
export class ErrorAccionNoPermitida extends ErrorDominio {
  readonly codigo = 'accion_no_permitida' as const
  readonly status = 403

  constructor() {
    super('No tienes permiso para realizar esta acción en esta actividad.')
  }
}

// Condición temporal, no de permisos: la fase actual de la actividad no
// habilita la acción (docs/diseno-desarrollo-nucleo.md §3.3, fila de 409).
export class ErrorFaseNoPermiteAccion extends ErrorDominio {
  readonly codigo = 'fase_no_permite_accion' as const
  readonly status = 409

  constructor(mensaje: string) {
    super(mensaje)
  }
}

// Precondición de la transición Inscripción → Formación
// (docs/diseno-desarrollo-nucleo.md §7.4): "al menos un participante".
export class ErrorSinParticipantes extends ErrorDominio {
  readonly codigo = 'sin_participantes' as const
  readonly status = 422

  constructor() {
    super('No puedes cerrar la inscripción sin al menos un participante.')
  }
}

export class ErrorUsuarioNoEncontrado extends ErrorDominio {
  readonly codigo = 'usuario_no_encontrado' as const
  readonly status = 404

  constructor() {
    super('No encontramos ese usuario.')
  }
}

// Toda actividad tiene exactamente una membresía con rol de organizador
// (docs/diseno-desarrollo-general.md §4.6): promover al organizador mismo a
// co-organizador dejaría a la actividad sin uno.
export class ErrorOrganizadorUnico extends ErrorDominio {
  readonly codigo = 'organizador_unico' as const
  readonly status = 422

  constructor() {
    super('Quien organiza la actividad no puede convertirse en co-organizador.')
  }
}
