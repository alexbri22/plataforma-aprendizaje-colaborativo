import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  EntradaActividades,
  PantallaConfiguracion,
  PantallaOperacion,
  PantallaConfirmarCierre,
  PantallaCrearActividad,
  PantallaInscripcion,
  PantallaMisActividades,
  PantallaResumenActividad,
  PantallaUnirseConClave,
} from '../features/actividades'
import {
  PantallaContenido,
  PantallaCuentas,
  PantallaCursos,
  PantallaEditarCurso,
  PantallaEditarRecurso,
  RutaAdmin,
} from '../features/administracion'
import { PantallaInicio } from '../features/contenido-publico/PantallaInicio.tsx'
import { PantallaAspectoProceso } from '../features/evaluacion/PantallaAspectoProceso'
import { PantallaCalificaciones } from '../features/evaluacion/PantallaCalificaciones'
import { PantallaDesgloseParticipante } from '../features/evaluacion/PantallaDesgloseParticipante'
import { PantallaMisResultados } from '../features/evaluacion/PantallaMisResultados'
import { PantallaResponderPlantilla } from '../features/evaluacion/PantallaResponderPlantilla'
import { PantallaIngresar, PantallaRegistrarse } from '../features/cuentas'
import { PantallaEquipos } from '../features/equipos'
import {
  PantallaCurso,
  PantallaLeccion,
  PantallaRecurso,
  PantallaRecursos,
} from '../features/formacion'
import {
  PantallaMisReconocimientos,
  PantallaMuestraInsignias,
  PantallaParticipantes,
  PantallaReconocer,
  PantallaReconocimientosDeParticipante,
} from '../features/insignias'
import { PantallaPerfil, PantallaPerfilDeUsuario } from '../features/perfil'
import {
  PantallaBitacoraDeParticipante,
  PantallaBitacorasDeEquipo,
  PantallaEspacioEquipo,
  PantallaMiBitacora,
  PantallaPublicacion,
  PantallaRetroalimentacion,
} from '../features/seguimiento'
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
          {/* Organizo y Participo son ramificaciones propias del mapa del sitio
              (barra lateral), no pestañas de una misma pantalla: cada una
              tiene su única acción posible (crear / unirse con clave). La
              ruta sin ramificación elige la rama que la persona usa
              (EntradaActividades). */}
          <Route
            path="/actividades"
            element={
              <RutaProtegida>
                <EntradaActividades />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/organizo"
            element={
              <RutaProtegida>
                <PantallaMisActividades rol="organizo" />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/participo"
            element={
              <RutaProtegida>
                <PantallaMisActividades rol="participo" />
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
          {/* Datos de la actividad, desde la barra lateral. A diferencia de
              /actividades/:id, nunca lleva a la pantalla de la etapa. */}
          <Route
            path="/actividades/:id/resumen"
            element={
              <RutaProtegida>
                <PantallaResumenActividad soloResumen />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/inscripcion"
            element={
              <RutaProtegida>
                <PantallaInscripcion />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/cierre"
            element={
              <RutaProtegida>
                <PantallaConfirmarCierre />
              </RutaProtegida>
            }
          />
          {/* "Planificar" es el nombre visible de Configuración. */}
          <Route
            path="/actividades/:id/planificar"
            element={<Navigate to="../configuracion" relative="path" replace />}
          />
          <Route
            path="/actividades/:id/configuracion"
            element={
              <RutaProtegida>
                <PantallaConfiguracion />
              </RutaProtegida>
            }
          />
          {/* Conformación de equipos (Creación) sigue abierta toda la
              actividad para reasignar y editar; Equipos (Desarrollo) es
              para entrar a revisar el espacio de cada uno. */}
          <Route
            path="/actividades/:id/conformacion"
            element={
              <RutaProtegida>
                <PantallaEquipos vista="conformacion" />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/equipos"
            element={
              <RutaProtegida>
                <PantallaEquipos vista="equipos" />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/publicacion"
            element={
              <RutaProtegida>
                <PantallaPublicacion />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/evaluacion"
            element={
              <RutaProtegida>
                <PantallaRetroalimentacion />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/operacion"
            element={
              <RutaProtegida>
                <PantallaOperacion />
              </RutaProtegida>
            }
          />
          {/* Espacio de equipo (nucleo §9.1): shell de navegación propio
              (AppShellEquipo), scoped por idEquipo y no por idActividad —
              simétrico con PATCH/DELETE /api/equipos/{id}. Sirve tanto al
              participante entrando a su propio equipo como a quien
              organiza revisando el de otro. */}
          <Route path="/equipos/:idEquipo" element={<Navigate to="metas" replace />} />
          <Route
            path="/equipos/:idEquipo/metas"
            element={
              <RutaProtegida>
                <PantallaEspacioEquipo tipo="metas" />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/avances"
            element={
              <RutaProtegida>
                <PantallaEspacioEquipo tipo="avances" />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/recursos"
            element={
              <RutaProtegida>
                <PantallaEspacioEquipo tipo="recursos" />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/planeacion"
            element={
              <RutaProtegida>
                <PantallaEspacioEquipo tipo="planeacion" />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/producto"
            element={
              <RutaProtegida>
                <PantallaEspacioEquipo tipo="producto" />
              </RutaProtegida>
            }
          />
          {/* Bitácora individual (nucleo §9.3, §9.5): vinculada a la propia
              membresía, no al equipo, pero vive bajo /equipos (decisión de
              producto): se llega aquí desde el espacio de equipo y el
              camino de vuelta es el mismo shell, no una salida hacia
              /actividades. La propia (participante) y la de otro
              (organizador/co-organizador con `leer_bitacoras`) son dos
              rutas distintas porque son dos pantallas distintas: una se
              escribe, la otra es de solo lectura. */}
          <Route
            path="/equipos/:idEquipo/bitacora"
            element={
              <RutaProtegida>
                <PantallaMiBitacora />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/bitacoras"
            element={
              <RutaProtegida>
                <PantallaBitacorasDeEquipo />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/participantes/:idMembresia/bitacora"
            element={
              <RutaProtegida>
                <PantallaBitacoraDeParticipante />
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
            path="/actividades/:id/calificaciones"
            element={
              <RutaProtegida>
                <PantallaCalificaciones />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/calificaciones/:idMembresia"
            element={
              <RutaProtegida>
                <PantallaDesgloseParticipante />
              </RutaProtegida>
            }
          />
          <Route
            path="/actividades/:id/resultados"
            element={
              <RutaProtegida>
                <PantallaMisResultados />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/proceso/:aspecto"
            element={
              <RutaProtegida>
                <PantallaAspectoProceso />
              </RutaProtegida>
            }
          />
          <Route
            path="/equipos/:idEquipo/proceso/:aspecto/:idInstrumento"
            element={
              <RutaProtegida>
                <PantallaResponderPlantilla />
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
          <Route
            path="/admin/cursos"
            element={
              <RutaAdmin>
                <PantallaCursos />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/cursos/nuevo"
            element={
              <RutaAdmin>
                <PantallaEditarCurso />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/cursos/:id"
            element={
              <RutaAdmin>
                <PantallaEditarCurso />
              </RutaAdmin>
            }
          />
          {/* Públicas, sin RutaProtegida (docs/diseno-desarrollo-nucleo.md §4.1:
              "contenido formativo" no exige sesión). */}
          <Route path="/recursos" element={<PantallaRecursos />} />
          <Route path="/recursos/:id" element={<PantallaRecurso />} />
          <Route path="/cursos/:id" element={<PantallaCurso />} />
          <Route path="/cursos/:id/lecciones/:idLeccion" element={<PantallaLeccion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
