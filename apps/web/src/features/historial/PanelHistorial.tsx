import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvisoError, Button, IconoCargando, PanelLateral } from '../../components/ui'
import { agruparPorDia, formatearHora } from './agrupar'
import { descripcionEvento } from './descripcion'
import { destinoDeEvento } from './destino'
import { useHistorial } from './useHistorial'
import styles from './PanelHistorial.module.css'

interface PanelHistorialProps {
  idActividad: string
  abierto: boolean
  onCerrar: () => void
  /** Acota la vista a este equipo (entrypoint de Historial en el espacio de
   * equipo, AppShellEquipo): "qué pasó en este equipo", no en toda la
   * actividad. Sin él, la vista completa de siempre (PantallaResumenActividad). */
  idEquipo?: string
  /** La propia membresía del actor (actividad.idMiMembresia): para que un
   * clic en un evento de bitácora distinga "mi bitácora" de la de otra
   * persona (nucleo §9.4). Sin ella, esos eventos no llevan a ningún lado. */
  idMiMembresia?: string
}

// El actor llega como "Nombre ApellidoPaterno" ya unido (historial.service.ts
// lo arma así en el servidor); se parte aquí nada más para las iniciales del
// Avatar, que las pide por separado.
function partirNombre(actor: string | null): { nombre: string; apellidoPaterno: string } {
  if (!actor) return { nombre: 'Sistema', apellidoPaterno: '' }
  const [nombre, ...resto] = actor.split(' ')
  return { nombre, apellidoPaterno: resto.join(' ') }
}

// Consulta cronológica mínima del historial (nucleo §5.5, §11.2): sin
// filtros ni agregación de ediciones consecutivas todavía, que son Fase B
// (§11.3, "Cierre y consulta"). Sí paginada por cursor (nucleo §3.1: el
// historial no tiene cota de tamaño), con "Cargar más" al final en vez de
// scroll infinito automático — más simple y más predecible en un panel
// lateral compacto, donde el volumen esperado por apertura es bajo. Como
// panel lateral y no una pantalla propia (decisión de producto, mismo
// criterio que PanelAjustesFormacion): no saca a quien organiza de donde
// está. Lista compacta agrupada por día, sin una tarjeta por evento —
// referencia: el historial de versiones de Google Docs.
export function PanelHistorial({
  idActividad,
  abierto,
  onCerrar,
  idEquipo,
  idMiMembresia,
}: PanelHistorialProps) {
  // La consulta solo importa mientras el panel está abierto; TanStack Query
  // mantiene en caché lo ya traído, así que reabrir no vuelve a pedirlo salvo
  // que algo lo invalide (una escritura registrable).
  const historialQuery = useHistorial(idActividad, { enabled: abierto, idEquipo })

  // Páginas ya cargadas, aplanadas: agruparPorDia no distingue de qué página
  // vino cada evento, solo le importa el orden cronológico que el servidor
  // ya le dio a cada una (nucleo §5.5).
  const eventos = useMemo(
    () => historialQuery.data?.pages.flatMap((pagina) => pagina.eventos) ?? [],
    [historialQuery.data],
  )

  return (
    <PanelLateral abierto={abierto} titulo="Historial" onCerrar={onCerrar}>
      {historialQuery.isPending ? (
        <div className={styles.cargando} role="status" aria-label="Cargando el historial">
          <IconoCargando size={20} />
        </div>
      ) : historialQuery.isError || !historialQuery.data ? (
        <AvisoError mensaje="No pudimos cargar el historial." />
      ) : eventos.length === 0 ? (
        <p className={styles.ayuda}>Todavía no hay nada que mostrar aquí.</p>
      ) : (
        <>
          {agruparPorDia(eventos).map((grupo) => (
            <div key={grupo.dia} className={styles.grupo}>
              <p className={styles.grupoTitulo}>{grupo.dia}</p>
              {grupo.eventos.map((evento) => {
                const { nombre, apellidoPaterno } = partirNombre(evento.actor)
                const destino = destinoDeEvento(evento, idMiMembresia)
                const contenidoFila = (
                  <>
                    <Avatar nombre={nombre} apellidoPaterno={apellidoPaterno} fotoUrl={null} />
                    <div className={styles.filaTextos}>
                      <span className={styles.filaDescripcion}>{descripcionEvento(evento)}</span>
                      <span className={styles.filaActor}>{evento.actor ?? 'Sistema'}</span>
                    </div>
                    <span className={styles.filaHora}>{formatearHora(evento.fecha)}</span>
                  </>
                )
                // Ir directamente a revisarlo: solo si el tipo de evento
                // trae lo necesario para construir el destino (destino.ts).
                // El resto se queda como texto, igual que antes.
                return destino ? (
                  <Link
                    key={evento.id}
                    to={destino}
                    className={`${styles.fila} ${styles.filaEnlace}`}
                    onClick={onCerrar}
                  >
                    {contenidoFila}
                  </Link>
                ) : (
                  <div key={evento.id} className={styles.fila}>
                    {contenidoFila}
                  </div>
                )
              })}
            </div>
          ))}
          {historialQuery.hasNextPage ? (
            <div className={styles.cargarMas}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => historialQuery.fetchNextPage()}
                disabled={historialQuery.isFetchingNextPage}
              >
                {historialQuery.isFetchingNextPage ? (
                  <>
                    <IconoCargando size={16} />
                    Cargando…
                  </>
                ) : (
                  'Cargar más'
                )}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </PanelLateral>
  )
}
