import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza el esqueleto inicial', () => {
    render(<App />)
    expect(screen.getByText('Contador: 0')).toBeInTheDocument()
  })
})
