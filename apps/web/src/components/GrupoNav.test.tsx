import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { GrupoNav } from './GrupoNav'

describe('GrupoNav', () => {
  beforeEach(() => localStorage.clear())

  it('plegadoPorDefecto arranca cerrado y recuerda lo que la persona elige', async () => {
    const usuario = userEvent.setup()
    const { unmount } = render(
      <GrupoNav
        claveAlmacenamiento="prueba.grupo"
        etiqueta="Proceso colaborativo"
        plegadoPorDefecto
      >
        <span>Interacción</span>
      </GrupoNav>,
    )
    const encabezado = screen.getByRole('button', { name: 'Proceso colaborativo' })
    expect(encabezado).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(encabezado)
    expect(encabezado).toHaveAttribute('aria-expanded', 'true')
    unmount()

    render(
      <GrupoNav
        claveAlmacenamiento="prueba.grupo"
        etiqueta="Proceso colaborativo"
        plegadoPorDefecto
      >
        <span>Interacción</span>
      </GrupoNav>,
    )
    expect(screen.getByRole('button', { name: 'Proceso colaborativo' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('se abre si la pantalla actual aparece dentro después de montar', () => {
    localStorage.setItem('prueba.grupo', 'false')
    const { rerender } = render(
      <GrupoNav claveAlmacenamiento="prueba.grupo" etiqueta="Proyecto colaborativo">
        <span>Metas</span>
      </GrupoNav>,
    )
    const encabezado = screen.getByRole('button', { name: 'Proyecto colaborativo' })
    expect(encabezado).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <GrupoNav claveAlmacenamiento="prueba.grupo" etiqueta="Proyecto colaborativo" contieneActivo>
        <span>Metas</span>
      </GrupoNav>,
    )
    expect(encabezado).toHaveAttribute('aria-expanded', 'true')
  })

  it('fijo no se pliega: sin botón, con los ítems siempre a la vista y la marca al lado', () => {
    render(
      <GrupoNav
        claveAlmacenamiento="prueba.etapa"
        etiqueta="Creación"
        variante="etapa"
        marca={<span>Actual</span>}
        fijo
      >
        <span>Datos de la actividad</span>
      </GrupoNav>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Creación')).toBeInTheDocument()
    expect(screen.getByText('Actual')).toBeInTheDocument()
    expect(screen.getByText('Datos de la actividad')).toBeVisible()
  })

  it('una etapa que no es fija se pliega y muestra su marca dentro del botón', async () => {
    const usuario = userEvent.setup()
    render(
      <GrupoNav
        claveAlmacenamiento="prueba.etapa.proxima"
        etiqueta="Cierre"
        variante="etapa"
        marca={<span>Próxima</span>}
        plegadoPorDefecto
      >
        <span>Calificaciones</span>
      </GrupoNav>,
    )

    const encabezado = screen.getByRole('button', { name: /Cierre/ })
    expect(encabezado).toHaveTextContent('Próxima')
    expect(encabezado).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(encabezado)
    expect(encabezado).toHaveAttribute('aria-expanded', 'true')
  })
})
