/** Lleva la vista y el foco a un elemento del formulario. Si es un grupo de
 * opciones, el foco va a su primer control. */
export function llevarA(destino: HTMLElement) {
  const enfocable =
    destino instanceof HTMLFieldSetElement
      ? (destino.querySelector<HTMLElement>('input, select, textarea') ?? destino)
      : destino
  destino.scrollIntoView({ behavior: 'smooth', block: 'center' })
  enfocable.focus({ preventScroll: true })
}
