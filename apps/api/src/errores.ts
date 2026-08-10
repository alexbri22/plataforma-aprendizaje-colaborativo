// Errores de dominio tipados: los servicios no conocen códigos de estado,
// solo señalan el fallo (docs/diseno-desarrollo-nucleo.md §2.3). La capa de
// rutas los traduce a la forma de respuesta de §3.1 vía manejadorErrores.

export type CodigoError =
  | 'validacion'
  | 'correo_duplicado'
  | 'credenciales_invalidas'
  | 'cuenta_desactivada'
  | 'sin_sesion'

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
