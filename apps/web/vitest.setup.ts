import '@testing-library/jest-dom/vitest'
import { IDS_PISTA } from '@plataforma/shared'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// Las ayudas de primera vez (el "?" que se abre solo y la bienvenida) se
// dan por vistas en todas las pruebas: si no, cualquier pantalla abriría un
// globo o un diálogo encima de lo que la prueba revisa. Las pruebas de
// features/ayuda lo cambian con vi.mocked(obtenerPistasVistas).
vi.mock('./src/features/ayuda/ayuda.api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  obtenerPistasVistas: vi.fn().mockResolvedValue([...IDS_PISTA]),
  marcarPistaVista: vi.fn().mockResolvedValue(undefined),
  reiniciarPistas: vi.fn().mockResolvedValue(undefined),
}))
