import { useParams } from 'react-router-dom'
import { CATALOGO_INSIGNIAS } from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { IconoCategoria } from './IconoCategoria'
import { VitrinaInsignias } from './VitrinaInsignias'
import { useAcumulado, useRecibidos } from './useReconocimientos'
import styles from './PantallaMisReconocimientos.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' })

function fechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/**
 * Lo que recibiste en esta actividad y tu acumulado global. Lo de la
 * actividad se revela cuando termina el cierre, no antes; lo que ves aquí lo
 * ves solo tú, y quien organiza. El resto de participantes no.
 */
export function PantallaMisReconocimientos() {
  const { id = '' } = useParams<{ id: string }>()
  const recibidos = useRecibidos(id)
  const acumulado = useAcumulado()

  if (recibidos.isPending || acumulado.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis reconocimientos">
        <div className={styles.cargando} role="status" aria-label="Cargando tus reconocimientos">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (recibidos.isError || acumulado.isError || !recibidos.data || !acumulado.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Mis reconocimientos">
        <AvisoError mensaje="No pudimos cargar tus reconocimientos." />
      </AppShell>
    )
  }

  const { aplicados, fechaLimite, reconocimientos } = recibidos.data
  const cierre = FORMATO_FECHA.format(fechaLocal(fechaLimite))

  // Puntos de esta actividad por categoría, en el orden del catálogo.
  const porCategoria = CATALOGO_INSIGNIAS.map((definicion) => ({
    definicion,
    recibidos: reconocimientos.filter((r) => r.categoria === definicion.id),
  })).filter((c) => c.recibidos.length > 0)

  return (
    <AppShell seccionActiva="actividades" titulo="Mis reconocimientos">
      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>En esta actividad</h2>
        <Card>
          {!aplicados ? (
            <p className={styles.texto}>
              Lo que te reconocieron se revela el {cierre}, cuando termine el periodo de cierre.
              Hasta entonces nadie lo ve, tampoco tú.
            </p>
          ) : porCategoria.length === 0 ? (
            <p className={styles.texto}>Nadie te reconoció en esta actividad.</p>
          ) : (
            <ul className={styles.recibidos}>
              {porCategoria.map(({ definicion, recibidos: lista }) => (
                <li key={definicion.id} className={styles.categoria}>
                  <div className={styles.categoriaCabecera}>
                    <IconoCategoria categoria={definicion.id} className={styles.emblema} />
                    <span className={styles.categoriaNombre}>{definicion.nombre}</span>
                    <span className={styles.puntos}>
                      {(() => {
                        const total = lista.reduce((suma, r) => suma + r.puntos, 0)
                        return `+${total} ${total === 1 ? 'pt' : 'pts'}`
                      })()}
                    </span>
                  </div>
                  <ul className={styles.frases}>
                    {lista.map((r, i) => (
                      <li key={i} className={styles.frase}>
                        “{r.frase}”
                        {r.fuente === 'organizador' ? (
                          <span className={styles.fuente}> — de quien organiza</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.nota}>
            Solo tú ves esto, además de quien organiza la actividad. Tus compañeros no.
          </p>
        </Card>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tu acumulado</h2>
        <p className={styles.texto}>
          Suma todas las actividades cuyo cierre ya terminó. Cada insignia progresa por separado, y
          la comparación es contra ti: no hay tablas de posiciones.
        </p>
        <Card>
          <VitrinaInsignias puntos={acumulado.data} />
        </Card>
      </section>
    </AppShell>
  )
}
