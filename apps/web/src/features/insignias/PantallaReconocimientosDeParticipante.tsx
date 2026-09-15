import { Link, useParams } from 'react-router-dom'
import { CATALOGO_INSIGNIAS } from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Card, IconoCargando } from '../../components/ui'
import { IconoCategoria } from './IconoCategoria'
import { useRecibidosDeParticipante } from './useReconocimientos'
import styles from './PantallaReconocimientosDeParticipante.module.css'

/**
 * Lo que recibió un participante en esta actividad, con quién se lo dio. Es
 * la vista de validación ligera de quien organiza (concepto §6): ve la
 * atribución completa, que al receptor se le oculta. Disponible durante la
 * ventana, no solo después, porque moderar es parte del cierre.
 */
export function PantallaReconocimientosDeParticipante() {
  const { id = '', idMembresia = '' } = useParams<{ id: string; idMembresia: string }>()
  const consulta = useRecibidosDeParticipante(id, idMembresia)

  if (consulta.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Reconocimientos">
        <div className={styles.cargando} role="status" aria-label="Cargando reconocimientos">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (consulta.isError || !consulta.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Reconocimientos">
        <AvisoError mensaje={consulta.error?.message ?? 'No pudimos cargar esta vista.'} />
      </AppShell>
    )
  }

  const { participante, reconocimientos } = consulta.data
  const total = reconocimientos.reduce((suma, r) => suma + r.puntos, 0)
  const porCategoria = CATALOGO_INSIGNIAS.map((definicion) => ({
    definicion,
    lista: reconocimientos.filter((r) => r.categoria === definicion.id),
  })).filter((c) => c.lista.length > 0)

  return (
    <AppShell
      seccionActiva="actividades"
      titulo={participante.nombre}
      acciones={
        <Link to={`/actividades/${id}/participantes`} className={styles.volver}>
          Todos los participantes
        </Link>
      }
    >
      <Card>
        {porCategoria.length === 0 ? (
          <p className={styles.texto}>Nadie ha reconocido a {participante.nombre} todavía.</p>
        ) : (
          <>
            <p className={styles.resumen}>
              {reconocimientos.length}{' '}
              {reconocimientos.length === 1 ? 'reconocimiento' : 'reconocimientos'}, {total} puntos
              en esta actividad.
            </p>
            <ul className={styles.categorias}>
              {porCategoria.map(({ definicion, lista }) => (
                <li key={definicion.id} className={styles.categoria}>
                  <div className={styles.cabecera}>
                    <IconoCategoria categoria={definicion.id} className={styles.emblema} />
                    <span className={styles.nombre}>{definicion.nombre}</span>
                  </div>
                  <ul className={styles.frases}>
                    {lista.map((r, i) => (
                      <li key={i} className={styles.frase}>
                        <span>“{r.frase}”</span>
                        <span className={styles.autor}>
                          {r.otorgadoPor ?? 'Sistema'}
                          {r.fuente === 'organizador' ? ' · organiza' : ''} · {r.puntos}{' '}
                          {r.puntos === 1 ? 'pt' : 'pts'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className={styles.nota}>
          Esta atribución la ves solo tú, como organizador. {participante.nombre} verá las insignias
          y las frases cuando termine el cierre, sin saber de quién vienen.
        </p>
      </Card>
    </AppShell>
  )
}
