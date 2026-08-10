import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { PantallaMisActividades } from './features/actividades'
import { PantallaInicio } from './features/contenido-publico/PantallaInicio.tsx'
import { PantallaIngresar, PantallaRegistrarse } from './features/cuentas'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PantallaInicio />} />
        <Route path="/ingresar" element={<PantallaIngresar />} />
        <Route path="/registrarse" element={<PantallaRegistrarse />} />
        <Route path="/actividades" element={<PantallaMisActividades />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
