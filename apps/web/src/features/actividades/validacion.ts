export function validarCampoRequerido(valor: string): string | undefined {
  return valor.trim() ? undefined : 'Este campo es obligatorio.'
}
