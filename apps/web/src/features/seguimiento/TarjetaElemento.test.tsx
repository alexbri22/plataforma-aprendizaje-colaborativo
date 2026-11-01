import type { ElementoDeEspacioEquipo } from '@plataforma/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TarjetaElemento } from './TarjetaElemento'

function elemento(sobrescribir: Partial<ElementoDeEspacioEquipo> = {}): ElementoDeEspacioEquipo {
  return {
    id: 'el-1',
    tipo: 'metas',
    contenido: 'Contenido original',
    idMembresiaAutor: 'yo',
    autor: 'Ana García',
    fechaCreacion: '2026-10-01T10:00:00.000Z',
    fechaActualizacion: '2026-10-01T10:00:00.000Z',
    ...sobrescribir,
  }
}

// Expandir la tarjeta monta ComentariosDeElemento, que usa React Query
// (useComentariosDeElemento): sin un QueryClient en el árbol, useQuery
// lanza antes de que la tarjeta llegue a pintarse.
function tarjeta(props: Partial<ComponentProps<typeof TarjetaElemento>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <TarjetaElemento
        elemento={elemento()}
        puedeEscribir
        guardando={false}
        eliminando={false}
        error={null}
        onGuardar={vi.fn().mockResolvedValue(undefined)}
        onEliminar={vi.fn()}
        idMiMembresia="yo"
        puedeComentar={false}
        {...props}
      />
    </QueryClientProvider>
  )
}

describe('TarjetaElemento', () => {
  // borrador se inicializa con useState(elemento.contenido), que React solo
  // evalúa al montar: sin este reinicio, abrir la edición después de que el
  // contenido cambió por fuera (otro integrante lo editó, un refetch) mostraría
  // la versión vieja, y guardar la sobrescribiría encima de la nueva.
  it('al editar, parte del contenido actual aunque haya cambiado desde que se montó', async () => {
    const usuario = userEvent.setup()
    const { rerender } = render(tarjeta())

    rerender(tarjeta({ elemento: elemento({ contenido: 'Contenido actualizado por otro' }) }))

    await usuario.click(screen.getByRole('button', { name: /actualizado por otro/ }))
    await usuario.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('Contenido')).toHaveValue('Contenido actualizado por otro')
  })

  it('cancelar descarta el borrador y vuelve a mostrar el contenido guardado', async () => {
    const usuario = userEvent.setup()
    render(tarjeta())

    await usuario.click(screen.getByRole('button', { name: /Contenido original/ }))
    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.clear(screen.getByLabelText('Contenido'))
    await usuario.type(screen.getByLabelText('Contenido'), 'Un cambio sin guardar')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Aparece dos veces a propósito: una en la vista previa del encabezado
    // (fija, no cambia al expandir) y otra en el contenido completo del
    // panel — ver TarjetaElemento.module.css.
    expect(screen.getAllByText('Contenido original')).toHaveLength(2)
  })
})
