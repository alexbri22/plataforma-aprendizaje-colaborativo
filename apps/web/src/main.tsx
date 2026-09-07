import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { PantallaMisActividades } from './features/actividades'
import { PantallaCuentas, RutaAdmin } from './features/administracion'
import { PantallaInicio } from './features/contenido-publico/PantallaInicio.tsx'
import { PantallaIngresar, PantallaRegistrarse } from './features/cuentas'
import { PantallaMuestraInsignias } from './features/insignias'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PantallaInicio />} />
          <Route path="/ingresar" element={<PantallaIngresar />} />
          <Route path="/registrarse" element={<PantallaRegistrarse />} />
          <Route path="/insignias" element={<PantallaMuestraInsignias />} />
          <Route path="/actividades" element={<PantallaMisActividades />} />
          <Route
            path="/admin/cuentas"
            element={
              <RutaAdmin>
                <PantallaCuentas />
              </RutaAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
