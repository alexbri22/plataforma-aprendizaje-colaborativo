import { useMemo, useState, type ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, IconoCargando, Input } from '../../components/ui'
import { SelectorFase } from './SelectorFase'
import { TarjetaActividad } from './TarjetaActividad'
import type { FaseActividad } from './tipos'
import { useActividades } from './useActividades'
import styles from './PantallaMisActividades.module.css'

export type RolListaActividades = 'organizo' | 'participo'
type FiltroEstado = FaseActividad | 'todas'

export interface PantallaMisActividadesProps {
  rol: RolListaActividades
}

// Organizo y Participo son ramificaciones propias del mapa del sitio (barra
// lateral), no pestañas de una misma pantalla: cada una tiene su única
// acción posible, para que no compitan entre ellas en la barra superior.
const CONFIG_ROL: Record<
  RolListaActividades,
  { titulo: string; accion: ReactNode; textoVacio: string }
> = {
  organizo: {
    titulo: 'Organizo',
    accion: <Button to="/actividades/nueva">Crear actividad</Button>,
    textoVacio: 'Todavía no organizas ninguna actividad. Crea la primera para empezar.',
  },
  participo: {
    titulo: 'Participo',
    accion: <Button to="/actividades/unirse">Unirse con clave</Button>,
    textoVacio:
      'Todavía no participas en ninguna actividad. Únete con la clave que te compartieron.',
  },
}

// Minúsculas y sin acentos, para que "genetica" encuentre "Debate de genética".
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
}

export function PantallaMisActividades({ rol }: PantallaMisActividadesProps) {
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas')
  const [busqueda, setBusqueda] = useState('')

  const config = CONFIG_ROL[rol]
  const seccionActiva = rol === 'organizo' ? 'actividades-organizo' : 'actividades-participo'

  const actividadesQuery = useActividades()
  const actividades = useMemo(() => actividadesQuery.data ?? [], [actividadesQuery.data])

  const actividadesRol = useMemo(
    () =>
      actividades.filter((a) =>
        rol === 'organizo'
          ? a.rol === 'organizador' || a.rol === 'co-organizador'
          : a.rol === 'participante',
      ),
    [actividades, rol],
  )

  // Estados de pantalla (docs/diseno-desarrollo-nucleo.md §4.5): carga,
  // error, vacío y el normal. "Sin acceso" no aplica: la ruta ya exige
  // sesión (RutaProtegida) y esta pantalla no depende de membresía.
  if (actividadesQuery.isPending) {
    return (
      <AppShell seccionActiva={seccionActiva} titulo={config.titulo}>
        <div className={styles.cargando} role="status" aria-label="Cargando tus actividades">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadesQuery.isError) {
    return (
      <AppShell seccionActiva={seccionActiva} titulo={config.titulo}>
        <p className={styles.textoVacioTab}>
          No pudimos cargar tus actividades. Intenta recargar la página.
        </p>
      </AppShell>
    )
  }

  if (actividadesRol.length === 0) {
    return (
      <AppShell seccionActiva={seccionActiva} titulo={config.titulo}>
        <div className={styles.vacioInicial}>
          <p className={styles.texto}>{config.textoVacio}</p>
          <div className={styles.accionesVacio}>{config.accion}</div>
        </div>
      </AppShell>
    )
  }

  const termino = normalizarTexto(busqueda.trim())
  const hayFiltros = termino !== '' || filtroEstado !== 'todas'
  const actividadesVisibles = actividadesRol.filter(
    (actividad) =>
      (filtroEstado === 'todas' || actividad.fase === filtroEstado) &&
      (termino === '' ||
        normalizarTexto(
          `${actividad.nombre} ${actividad.claveIngreso ?? ''} ${actividad.nombreOrganizador}`,
        ).includes(termino)),
  )

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEstado('todas')
  }

  return (
    <AppShell seccionActiva={seccionActiva} titulo={config.titulo} acciones={config.accion}>
      <div className={styles.contenido}>
        <div className={styles.barraFiltros}>
          <div className={styles.busqueda}>
            <Input
              label="Buscar actividades"
              type="search"
              placeholder="Nombre, clave u organizador"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>

          <SelectorFase valor={filtroEstado} onCambiar={setFiltroEstado} />
        </div>

        {actividadesVisibles.length === 0 ? (
          <div className={styles.sinResultados}>
            <p className={styles.textoVacioTab}>
              Ninguna actividad coincide con tu búsqueda o filtro.
            </p>
            {hayFiltros ? (
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
    </AppShell>
  )
}
