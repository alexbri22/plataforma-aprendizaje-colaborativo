export function validarCampoRequerido(valor: string): string | undefined {
  return valor.trim() ? undefined : 'Este campo es obligatorio.'
}

// El formulario usa noValidate (control total del mensaje y del enfoque en
// el primer campo inválido), así que el atributo `min` del input no basta
// para bloquear el envío: replica aquí la regla de entero positivo que
// exige el backend (services/actividades/validacion.ts).
export function validarEnteroPositivo(valor: string): string | undefined {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0
    ? undefined
    : 'Debe ser un número entero mayor a cero.'
}
