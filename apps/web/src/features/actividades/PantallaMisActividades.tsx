import { useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, IconoCargando, Tabs } from '../../components/ui'
import { grupoVisual, ORDEN_GRUPOS_VISUALES, TITULO_GRUPO_FASE, type GrupoFaseVisual } from './fase'
import { TarjetaActividad } from './TarjetaActividad'
import { TarjetaInvitacion } from './TarjetaInvitacion'
import type { Actividad } from './tipos'
import {
  useAceptarInvitacionMutation,
  useActividades,
  useInvitaciones,
  useRechazarInvitacionMutation,
} from './useActividades'
import styles from './PantallaMisActividades.module.css'

type RolTab = 'organizo' | 'participo'

const TABS = [
  { id: 'organizo', etiqueta: 'Organizo' },
  { id: 'participo', etiqueta: 'Participo' },
]

function agruparPorFase(actividades: Actividad[]): Array<[GrupoFaseVisual, Actividad[]]> {
  return ORDEN_GRUPOS_VISUALES.map((grupo): [GrupoFaseVisual, Actividad[]] => [
    grupo,
    actividades.filter((actividad) => grupoVisual(actividad.fase) === grupo),
  ]).filter(([, lista]) => lista.length > 0)
}

const ACCIONES_ACTIVIDAD = (
  <>
    <Button to="/actividades/nueva">Crear actividad</Button>
    <Button to="/actividades/unirse" variant="secondary">
      Unirse con clave
    </Button>
  </>
)

export function PantallaMisActividades() {
  const [tab, setTab] = useState<RolTab>('organizo')

  const actividadesQuery = useActividades()
  const invitacionesQuery = useInvitaciones()
  const aceptarInvitacion = useAceptarInvitacionMutation()
  const rechazarInvitacion = useRechazarInvitacionMutation()

  const actividades = useMemo(() => actividadesQuery.data ?? [], [actividadesQuery.data])
  const invitaciones = useMemo(() => invitacionesQuery.data ?? [], [invitacionesQuery.data])

  const actividadesOrganizo = useMemo(
    () => actividades.filter((a) => a.rol === 'organizador' || a.rol === 'co-organizador'),
    [actividades],
  )
  const actividadesParticipo = useMemo(
    () => actividades.filter((a) => a.rol === 'participante'),
    [actividades],
  )

  const gruposOrganizo = useMemo(() => agruparPorFase(actividadesOrganizo), [actividadesOrganizo])
  const gruposParticipo = useMemo(
    () => agruparPorFase(actividadesParticipo),
    [actividadesParticipo],
  )

  // Estados de pantalla (docs/diseno-desarrollo-nucleo.md §4.5): carga,
  // error, vacío y el normal. "Sin acceso" no aplica: la ruta ya exige
  // sesión (RutaProtegida) y esta pantalla no depende de membresía.
  if (actividadesQuery.isPending || invitacionesQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis actividades">
        <div className={styles.cargando} role="status" aria-label="Cargando tus actividades">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadesQuery.isError || invitacionesQuery.isError) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis actividades">
        <p className={styles.textoVacioTab}>
          No pudimos cargar tus actividades. Intenta recargar la página.
        </p>
      </AppShell>
    )
  }

  const sinNadaTodavia = actividades.length === 0 && invitaciones.length === 0

  if (sinNadaTodavia) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis actividades">
        <div className={styles.vacioInicial}>
          <p className={styles.texto}>
            Aquí verás las actividades colaborativas que organices o en las que participes. Empieza
            creando una o uniéndote con una clave de ingreso.
          </p>
          <div className={styles.accionesVacio}>
            <Button to="/actividades/nueva">Crear actividad</Button>
            <Button to="/actividades/unirse" variant="secondary">
              Unirse con clave
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const grupoActivo = tab === 'organizo' ? gruposOrganizo : gruposParticipo
  const mensajeVacioTab =
    tab === 'organizo'
      ? 'Todavía no organizas ninguna actividad.'
      : 'Todavía no participas en ninguna actividad.'

  return (
    <AppShell seccionActiva="actividades" titulo="Mis actividades" acciones={ACCIONES_ACTIVIDAD}>
      <div className={styles.contenido}>
        {invitaciones.length > 0 ? (
          <section className={styles.seccion} aria-label="Invitaciones pendientes">
            <h2 className={styles.tituloSeccion}>Invitaciones pendientes</h2>
            <div className={styles.listaInvitaciones}>
              {invitaciones.map((invitacion) => (
                <TarjetaInvitacion
                  key={invitacion.id}
                  invitacion={invitacion}
                  onAceptar={(id) => aceptarInvitacion.mutate(id)}
                  onRechazar={(id) => rechazarInvitacion.mutate(id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <Tabs
          label="Rol en la actividad"
          items={TABS}
          valor={tab}
          onCambiar={(id) => setTab(id as RolTab)}
          className={styles.tabs}
        />

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className={styles.panel}
        >
          {grupoActivo.length === 0 ? (
            <p className={styles.textoVacioTab}>{mensajeVacioTab}</p>
          ) : (
            grupoActivo.map(([grupo, actividadesGrupo]) => (
              <section key={grupo} className={styles.grupoFase}>
                <h2 className={styles.tituloSeccion}>{TITULO_GRUPO_FASE[grupo]}</h2>
                <div className={styles.grid}>
                  {actividadesGrupo.map((actividad) => (
                    <TarjetaActividad key={actividad.id} actividad={actividad} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
