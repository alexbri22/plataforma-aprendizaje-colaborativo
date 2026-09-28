import { useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, IconoCargando, Input, Select, Tabs } from '../../components/ui'
import { infoFase, ORDEN_FASES } from './fase'
import { TarjetaActividad } from './TarjetaActividad'
import type { FaseActividad } from './tipos'
import { useActividades } from './useActividades'
import styles from './PantallaMisActividades.module.css'

type RolTab = 'organizo' | 'participo'
type FiltroEstado = FaseActividad | 'todas'

const TABS = [
  { id: 'organizo', etiqueta: 'Organizo' },
  { id: 'participo', etiqueta: 'Participo' },
]

// Minúsculas y sin acentos, para que "genetica" encuentre "Debate de genética".
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
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
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [busqueda, setBusqueda] = useState('')

  const actividadesQuery = useActividades()

  const actividades = useMemo(() => actividadesQuery.data ?? [], [actividadesQuery.data])

  const actividadesOrganizo = useMemo(
    () => actividades.filter((a) => a.rol === 'organizador' || a.rol === 'co-organizador'),
    [actividades],
  )
  const actividadesParticipo = useMemo(
    () => actividades.filter((a) => a.rol === 'participante'),
    [actividades],
  )

  // Estados de pantalla (docs/diseno-desarrollo-nucleo.md §4.5): carga,
  // error, vacío y el normal. "Sin acceso" no aplica: la ruta ya exige
  // sesión (RutaProtegida) y esta pantalla no depende de membresía.
  if (actividadesQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis actividades">
        <div className={styles.cargando} role="status" aria-label="Cargando tus actividades">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadesQuery.isError) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis actividades">
        <p className={styles.textoVacioTab}>
          No pudimos cargar tus actividades. Intenta recargar la página.
        </p>
      </AppShell>
    )
  }

  const sinNadaTodavia = actividades.length === 0

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

  const actividadesTab = tab === 'organizo' ? actividadesOrganizo : actividadesParticipo
  const termino = normalizarTexto(busqueda.trim())
  const hayFiltros = termino !== '' || filtroEstado !== 'todas'
  const actividadesVisibles = actividadesTab.filter(
    (actividad) =>
      (filtroEstado === 'todas' || actividad.fase === filtroEstado) &&
      (termino === '' ||
        normalizarTexto(`${actividad.nombre} ${actividad.objetivo}`).includes(termino)),
  )
  const mensajeVacioTab =
    actividadesTab.length > 0
      ? 'Ninguna actividad coincide con tu búsqueda o filtro.'
      : tab === 'organizo'
        ? 'Todavía no organizas ninguna actividad.'
        : 'Todavía no participas en ninguna actividad.'

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEstado('todas')
  }

  return (
    <AppShell seccionActiva="actividades" titulo="Mis actividades" acciones={ACCIONES_ACTIVIDAD}>
      <div className={styles.contenido}>
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
          {actividadesTab.length > 0 ? (
            <div className={styles.barraFiltros}>
              <div className={styles.busqueda}>
                <Input
                  label="Buscar actividades"
                  type="search"
                  placeholder="Nombre u objetivo"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                />
              </div>
              <div className={styles.filtro}>
                <Select
                  label="Ver actividades en"
                  value={filtroEstado}
                  onChange={(evento) => setFiltroEstado(evento.target.value as FiltroEstado)}
                >
                  <option value="todas">Todos los estados</option>
                  {ORDEN_FASES.map((fase) => (
                    <option key={fase} value={fase}>
                      {infoFase(fase).etiqueta}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : null}

          {actividadesVisibles.length === 0 ? (
            <div className={styles.sinResultados}>
              <p className={styles.textoVacioTab}>{mensajeVacioTab}</p>
              {actividadesTab.length > 0 && hayFiltros ? (
                <Button variant="secondary" size="sm" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className={styles.grid}>
              {actividadesVisibles.map((actividad) => (
                <TarjetaActividad key={actividad.id} actividad={actividad} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
