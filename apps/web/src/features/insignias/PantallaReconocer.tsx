import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Card, IconoCargando } from '../../components/ui'
import { RitualReconocimiento, type ReconocimientoBorrador } from './RitualReconocimiento'
import { useGuardarReconocimientos, useRitual } from './useReconocimientos'
import styles from './PantallaReconocer.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' })

function fechaLocal(iso: string): Date {
  // 'YYYY-MM-DD' se interpreta como UTC por Date; se arma con año/mes/día
  // locales para que "el 14" no se vuelva "el 13" al oeste de Greenwich.
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/**
 * El ritual de cierre dentro de su actividad. Carga compañeros, presupuesto y
 * lo ya guardado desde la API; guardar reemplaza el conjunto. Sirve tanto a
 * participantes como a quien organiza: la diferencia —sin presupuesto, vale
 * doble— la dicta el servidor y el componente solo la muestra.
 */
export function PantallaReconocer() {
  const { id = '' } = useParams<{ id: string }>()
  const ritual = useRitual(id)
  const guardar = useGuardarReconocimientos(id)

  if (ritual.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Reconoce el trabajo de tu equipo">
        <div className={styles.cargando} role="status" aria-label="Cargando el ritual">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (ritual.isError || !ritual.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Reconoce el trabajo de tu equipo">
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShell>
    )
  }

  const { contexto, reconocimientos } = ritual.data
  const cierre = FORMATO_FECHA.format(fechaLocal(contexto.fechaLimite))

  const onGuardar = (borradores: readonly ReconocimientoBorrador[]) =>
    guardar.mutate(
      borradores.map((b) => ({
        idMembresiaReceptor: b.integranteId,
        categoria: b.categoria,
        frase: b.frase,
      })),
    )

  return (
    <AppShell seccionActiva="actividades" titulo="Reconoce el trabajo de tu equipo">
      <div className={styles.encabezado}>
        <Badge variant="accent">Periodo de cierre</Badge>
        <p className={styles.lede}>
          <strong>{contexto.actividad.nombre}</strong> terminó. Antes de que cierre, reparte tus
          reconocimientos entre los compañeros del equipo. Toma dos o tres minutos.
        </p>
      </div>

      <Card>
        {contexto.aplicados ? (
          <p className={styles.aviso}>
            El periodo de cierre terminó el {cierre}. Los reconocimientos ya se aplicaron y no se
            pueden cambiar.
          </p>
        ) : !contexto.abierto ? (
          <p className={styles.aviso}>
            Los reconocimientos se dan cuando la actividad termina. Vuelve entonces: tendrás hasta
            el {cierre}.
          </p>
        ) : contexto.companeros.length === 0 ? (
          <p className={styles.aviso}>Todavía no hay compañeros a quienes reconocer.</p>
        ) : (
          <>
            {guardar.isError ? <AvisoError mensaje={guardar.error.message} /> : null}
            <RitualReconocimiento
              companeros={contexto.companeros.map((c) => ({ id: c.idMembresia, nombre: c.nombre }))}
              presupuesto={contexto.presupuesto}
              reconocimientosIniciales={reconocimientos.map((r) => ({
                integranteId: r.idMembresiaReceptor,
                categoria: r.categoria,
                frase: r.frase,
              }))}
              fechaLimite={fechaLocal(contexto.fechaLimite)}
              guardado={guardar.isSuccess}
              onGuardar={onGuardar}
            />
          </>
        )}
      </Card>
    </AppShell>
  )
}
