import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PantallaInicio } from './features/contenido-publico/PantallaInicio.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PantallaInicio />
  </StrictMode>,
)
