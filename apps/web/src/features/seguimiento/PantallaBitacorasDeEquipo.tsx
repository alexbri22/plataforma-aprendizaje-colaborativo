import type { IntegranteEquipo } from '@plataforma/shared'
import { Link, useParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { formatearFechaHora } from '../actividades'
import { useEquipo } from '../equipos/useEquipos'
import { IconoChevron } from './IconoChevron'
import { useBitacora } from './useBitacora'
import styles from './PantallaBitacorasDeEquipo.module.css'

function resumirBitacora(fechas: string[]): string {
  if (fechas.length === 0) return 'Sin entradas todavía'
  const ultima = fechas.reduce((a, b) => (a > b ? a : b))
  const cuantas = fechas.length === 1 ? '1 entrada' : `${fechas.length} entradas`
  return `${cuantas} · la última el ${formatearFechaHora(ultima)}`
}

// Cada fila consulta su propia bitácora (misma clave que la pantalla de
// detalle, así que abrirla después sale de la caché): los equipos son de
// pocas personas y así se ve de un vistazo quién lleva al día la suya.
function FilaBitacora({
  integrante,
  idActividad,
  idEquipo,
}: {
  integrante: IntegranteEquipo
  idActividad: string
  idEquipo: string
}) {
  const entradas = useBitacora(idActividad, integrante.idMembresia)
  const resumen = entradas.data
    ? resumirBitacora(entradas.data.map((entrada) => entrada.fechaCreacion))
    : entradas.isError
      ? 'No pudimos ver sus entradas'
      : null

  return (
    <li>
      <Link
        to={`/equipos/${idEquipo}/participantes/${integrante.idMembresia}/bitacora`}
        className={styles.fila}
      >
        <span className={styles.textos}>
          <span className={styles.nombre}>{integrante.nombre}</span>
          {resumen ? <span className={styles.resumen}>{resumen}</span> : null}
        </span>
        <IconoChevron className={styles.chevron} />
      </Link>
    </li>
  )
}

// Las bitácoras individuales de un equipo, para quien organiza (nucleo §9.3,
// P-06): una sola entrada en la barra lateral que lleva aquí, y aquí se
// elige de quién leer, con su nombre completo. El permiso real
// (`leer_bitacoras`) lo verifica el servidor en cada bitácora.
export function PantallaBitacorasDeEquipo() {
  const { idEquipo = '' } = useParams<{ idEquipo: string }>()
  const equipoQuery = useEquipo(idEquipo)

  return (
    <AppShellEquipo
      idEquipo={idEquipo}
      seccionActiva="bitacoras"
      titulo="Bitácoras"
      ayuda="bitacora"
    >
      {equipoQuery.isPending ? (
        <div className={styles.cargando} role="status" aria-label="Cargando el equipo">
          <IconoCargando size={24} />
        </div>
      ) : equipoQuery.isError ? (
        <AvisoError mensaje="No encontramos este equipo, o ya no formas parte de su actividad." />
      ) : (
        (() => {
          const participantes = equipoQuery.data.integrantes.filter(
            (integrante) => integrante.rol === 'participante',
          )
          return participantes.length === 0 ? (
            <p className={styles.vacio}>Este equipo todavía no tiene participantes.</p>
          ) : (
            <Card className={styles.tarjeta}>
              <ul className={styles.lista}>
                {participantes.map((integrante) => (
                  <FilaBitacora
                    key={integrante.idMembresia}
                    integrante={integrante}
                    idActividad={equipoQuery.data.idActividad}
                    idEquipo={idEquipo}
                  />
                ))}
              </ul>
            </Card>
          )
        })()
      )}
    </AppShellEquipo>
  )
}
