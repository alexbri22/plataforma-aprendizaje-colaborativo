import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('sin foto muestra las iniciales', () => {
    const { container } = render(<Avatar nombre="Ana" apellidoPaterno="García" fotoUrl={null} />)

    expect(container.textContent).toBe('AG')
    expect(container.querySelector('img')).toBeNull()
  })

  it('con foto la muestra con credenciales, sin texto alternativo que repita el nombre', () => {
    const { container } = render(
      <Avatar nombre="Ana" apellidoPaterno="García" fotoUrl="http://api.test/foto" />,
    )

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'http://api.test/foto')
    expect(img).toHaveAttribute('crossorigin', 'use-credentials')
    expect(img).toHaveAttribute('alt', '')
    expect(container.textContent).toBe('')
  })
})
