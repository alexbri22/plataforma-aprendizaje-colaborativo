import { useSesion } from '../features/cuentas'
import { AppShell, type SeccionApp } from './AppShell'
import { Encabezado } from './Encabezado'
import { IconoCargando } from './ui'
import styles from './PantallaProximamente.module.css'

export interface PantallaProximamenteProps {
  seccionActiva: SeccionApp
  titulo: string
  descripcion: string
  /**
   * Marca una pantalla alcanzable sin sesión (docs/diseno-desarrollo-nucleo.md
   * §4.1, zona pública). En ese caso el cascarón depende de si hay sesión:
   * Encabezado público si no la hay, AppShell si la hay — nunca fuerza el
   * dashboard sobre alguien que nunca inició sesión.
   */
  publica?: boolean
}

// Placeholder de un módulo o pantalla que otro subsistema construye
// (docs/diseno-desarrollo-general.md §3.4). Este componente solo provee el
// entrypoint — nav, ruta y cascarón — no implementa el contenido.
export function PantallaProximamente({
  seccionActiva,
  titulo,
  descripcion,
  publica = false,
}: PantallaProximamenteProps) {
  const { usuario, cargando } = useSesion()

  if (publica && cargando) {
    return (
      <div className={styles.cargando} role="status" aria-label="Cargando">
        <IconoCargando size={24} />
      </div>
    )
  }

  if (publica && !usuario) {
    return (
      <div className={styles.paginaPublica}>
        <Encabezado />
        <main id="contenido" className={styles.mainPublico}>
          <h1 className={styles.tituloPublico}>{titulo}</h1>
          <p className={styles.texto}>{descripcion}</p>
        </main>
      </div>
    )
  }

  return (
    <AppShell seccionActiva={seccionActiva} titulo={titulo}>
      <p className={styles.texto}>{descripcion}</p>
    </AppShell>
  )
}
