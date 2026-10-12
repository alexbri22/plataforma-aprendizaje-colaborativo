import { Avatar, AvisoError, IconoCargando, PanelLateral } from '../../components/ui'
import { agruparPorDia, formatearHora } from './agrupar'
import { descripcionEvento } from './descripcion'
import { useHistorial } from './useHistorial'
import styles from './PanelHistorial.module.css'

interface PanelHistorialProps {
  idActividad: string
  abierto: boolean
  onCerrar: () => void
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
// (§11.3, "Cierre y consulta"). Como panel lateral y no una pantalla propia
// (decisión de producto, mismo criterio que PanelAjustesFormacion): no saca
// a quien organiza de donde está. Lista compacta agrupada por día, sin una
// tarjeta por evento — referencia: el historial de versiones de Google Docs.
export function PanelHistorial({ idActividad, abierto, onCerrar }: PanelHistorialProps) {
  // La consulta solo importa mientras el panel está abierto; TanStack Query
  // mantiene en caché lo ya traído, así que reabrir no vuelve a pedirlo salvo
  // que algo lo invalide (una escritura registrable).
  const historialQuery = useHistorial(idActividad, { enabled: abierto })

  return (
    <PanelLateral abierto={abierto} titulo="Historial" onCerrar={onCerrar}>
      {historialQuery.isPending ? (
        <div className={styles.cargando} role="status" aria-label="Cargando el historial">
          <IconoCargando size={20} />
        </div>
      ) : historialQuery.isError || !historialQuery.data ? (
        <AvisoError mensaje="No pudimos cargar el historial." />
      ) : historialQuery.data.length === 0 ? (
        <p className={styles.ayuda}>Todavía no hay nada que mostrar aquí.</p>
      ) : (
        agruparPorDia(historialQuery.data).map((grupo) => (
          <div key={grupo.dia} className={styles.grupo}>
            <p className={styles.grupoTitulo}>{grupo.dia}</p>
            {grupo.eventos.map((evento) => {
              const { nombre, apellidoPaterno } = partirNombre(evento.actor)
              return (
                <div key={evento.id} className={styles.fila}>
                  <Avatar nombre={nombre} apellidoPaterno={apellidoPaterno} fotoUrl={null} />
                  <div className={styles.filaTextos}>
                    <span className={styles.filaDescripcion}>{descripcionEvento(evento)}</span>
                    <span className={styles.filaActor}>{evento.actor ?? 'Sistema'}</span>
                  </div>
                  <span className={styles.filaHora}>{formatearHora(evento.fecha)}</span>
                </div>
              )
            })}
          </div>
        ))
      )}
    </PanelLateral>
  )
}
