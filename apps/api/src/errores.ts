// Errores de dominio tipados: los servicios no conocen códigos de estado,
// solo señalan el fallo (docs/diseno-desarrollo-nucleo.md §2.3). La capa de
// rutas los traduce a la forma de respuesta de §3.1 vía manejadorErrores.

export type CodigoError =
  | 'validacion'
  | 'correo_duplicado'
  | 'credenciales_invalidas'
  | 'cuenta_desactivada'
  | 'sin_sesion'
  | 'no_autorizado'
  | 'usuario_no_encontrado'

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

// Sesión válida pero sin el tipo de cuenta que la acción exige (plano de
// cuenta, docs/diseno-desarrollo-general.md §7.1/§7.2). Se distingue de
// sin_sesion porque el actor sí está autenticado: es autorización, no
// autenticación.
export class ErrorNoAutorizado extends ErrorDominio {
  readonly codigo = 'no_autorizado' as const
  readonly status = 403

  constructor() {
    super('No tienes permiso para realizar esta acción.')
  }
}

export class ErrorUsuarioNoEncontrado extends ErrorDominio {
  readonly codigo = 'usuario_no_encontrado' as const
  readonly status = 404

  constructor() {
    super('No existe una cuenta con ese identificador.')
  }
}
