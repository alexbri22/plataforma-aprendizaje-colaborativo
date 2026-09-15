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
  | 'sin_permiso'
  | 'fuera_de_plazo'

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

// Misma respuesta si la actividad no existe que si existe pero el actor no es
// miembro: distinguirlas revelaría que hay una actividad con ese id a quien
// no tiene nada que ver con ella (mismo criterio que ErrorClaveInvalida).
export class ErrorActividadNoEncontrada extends ErrorDominio {
  readonly codigo = 'actividad_no_encontrada' as const
  readonly status = 404

  constructor() {
    super('No encontramos esta actividad.')
  }
}

export class ErrorSinPermiso extends ErrorDominio {
  readonly codigo = 'sin_permiso' as const
  readonly status = 403

  constructor(mensaje = 'No tienes permiso para hacer esto en esta actividad.') {
    super(mensaje)
  }
}

export class ErrorFueraDePlazo extends ErrorDominio {
  readonly codigo = 'fuera_de_plazo' as const
  readonly status = 409

  constructor(mensaje: string) {
    super(mensaje)
  }
}
