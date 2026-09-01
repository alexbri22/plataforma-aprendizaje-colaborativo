import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PantallaProximamente } from '../components/PantallaProximamente'
import {
  PantallaCrearActividad,
  PantallaMisActividades,
  PantallaResumenActividad,
  PantallaUnirseConClave,
} from '../features/actividades'
import { PantallaInicio } from '../features/contenido-publico/PantallaInicio.tsx'
import { PantallaIngresar, PantallaRegistrarse } from '../features/cuentas'
import { queryClient } from './queryClient'
import { RutaProtegida } from './RutaProtegida'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PantallaInicio />} />
          <Route path="/ingresar" element={<PantallaIngresar />} />
          <Route path="/registrarse" element={<PantallaRegistrarse />} />
          <Route
            path="/actividades"
            element={
              <RutaProtegida>
                <PantallaMisActividades />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/nueva"
            element={
              <RutaProtegida>
                <PantallaCrearActividad />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id"
            element={
              <RutaProtegida>
                <PantallaResumenActividad />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/unirse"
            element={
              <RutaProtegida>
                <PantallaUnirseConClave />
              </RutaProtegida>
            }
          />
          <Route
            path="/insignias"
            element={
              <RutaProtegida>
                <PantallaProximamente
                  seccionActiva="insignias"
                  titulo="Insignias"
                  descripcion="Todavía no está construido. Aquí verás el catálogo de insignias y tu rango acumulado en cada categoría."
                />
              </RutaProtegida>
            }
          />
          {/* Pública, sin RutaProtegida (docs/diseno-desarrollo-nucleo.md §4.1:
              "contenido formativo" no exige sesión). Entrypoint para el
              módulo de Contenido formativo — lo construye e implementa su
              responsable, no este módulo. */}
          <Route
            path="/recursos"
            element={
              <PantallaProximamente
                publica
                seccionActiva="recursos"
                titulo="Recursos"
                descripcion="Todavía no está construido. Aquí vivirá el contenido formativo sobre qué es colaborar y cómo colaborar."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
