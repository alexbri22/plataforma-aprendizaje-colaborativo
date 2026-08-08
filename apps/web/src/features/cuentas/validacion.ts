const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCampoRequerido(valor: string): string | undefined {
  return valor.trim() ? undefined : 'Este campo es obligatorio.'
}

export function validarCorreo(valor: string): string | undefined {
  if (!valor.trim()) return 'Este campo es obligatorio.'
  return PATRON_CORREO.test(valor) ? undefined : 'Ingresa un correo válido.'
}

export function validarContrasena(valor: string): string | undefined {
  if (!valor) return 'Este campo es obligatorio.'
  return valor.length >= 8 ? undefined : 'La contraseña debe tener al menos 8 caracteres.'
}

export function validarConfirmacionContrasena(
  contrasena: string,
  confirmacion: string,
): string | undefined {
  if (!confirmacion) return 'Este campo es obligatorio.'
  return contrasena === confirmacion ? undefined : 'Las contraseñas no coinciden.'
}
