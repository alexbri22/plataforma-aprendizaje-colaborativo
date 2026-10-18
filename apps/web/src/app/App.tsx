import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  PantallaConfiguracion,
  PantallaCrearActividad,
  PantallaMisActividades,
  PantallaResumenActividad,
  PantallaUnirseConClave,
} from '../features/actividades'
import {
  PantallaContenido,
  PantallaCuentas,
  PantallaEditarRecurso,
  RutaAdmin,
} from '../features/administracion'
import { PantallaInicio } from '../features/contenido-publico/PantallaInicio.tsx'
import { PantallaIngresar, PantallaRegistrarse } from '../features/cuentas'
import { PantallaRecurso, PantallaRecursos } from '../features/formacion'
import {
  PantallaMisReconocimientos,
  PantallaMuestraInsignias,
  PantallaParticipantes,
  PantallaReconocer,
  PantallaReconocimientosDeParticipante,
} from '../features/insignias'
import { PantallaPerfil, PantallaPerfilDeUsuario } from '../features/perfil'
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
            path="/actividades/:id/configuracion"
            element={
              <RutaProtegida>
                <PantallaConfiguracion />
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
          {/* El perfil propio y el básico de otra persona
              (docs/diseno-desarrollo-nucleo.md §6.6). */}
          <Route
            path="/perfil"
            element={
              <RutaProtegida>
                <PantallaPerfil />
              </RutaProtegida>
            }
          />
          <Route
            path="/usuarios/:id"
            element={
              <RutaProtegida>
                <PantallaPerfilDeUsuario />
              </RutaProtegida>
            }
          />
          <Route
            path="/insignias"
            element={
              <RutaProtegida>
                <PantallaMuestraInsignias />
              </RutaProtegida>
            }
          />
          {/* Insignias dentro de la actividad: el ritual, lo recibido y la
              vista de quien organiza. Todas requieren sesión; qué puede ver
              cada rol lo decide la API (docs/diseno-desarrollo-general.md §7.4). */}
          <Route
            path="/actividades/:id/reconocer"
            element={
              <RutaProtegida>
                <PantallaReconocer />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/insignias"
            element={
              <RutaProtegida>
                <PantallaMisReconocimientos />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/participantes"
            element={
              <RutaProtegida>
                <PantallaParticipantes />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/participantes/:idMembresia"
            element={
              <RutaProtegida>
                <PantallaReconocimientosDeParticipante />
              </RutaProtegida>
            }
          />
          {/* Solo administradores; RutaAdmin también redirige a /ingresar
              a quien no tiene sesión. */}
          <Route
            path="/admin/cuentas"
            element={
              <RutaAdmin>
                <PantallaCuentas />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/contenido"
            element={
              <RutaAdmin>
                <PantallaContenido />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/contenido/nuevo"
            element={
              <RutaAdmin>
                <PantallaEditarRecurso />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/contenido/:id"
            element={
              <RutaAdmin>
                <PantallaEditarRecurso />
              </RutaAdmin>
            }
          />
          {/* Públicas, sin RutaProtegida (docs/diseno-desarrollo-nucleo.md §4.1:
              "contenido formativo" no exige sesión). */}
          <Route path="/recursos" element={<PantallaRecursos />} />
          <Route path="/recursos/:id" element={<PantallaRecurso />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
