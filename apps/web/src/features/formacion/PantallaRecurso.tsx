import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_AREA, ETIQUETAS_ELEMENTO, ETIQUETAS_SECCION } from '@plataforma/shared'
import { AvisoError, Badge, Button, IconoCargando } from '../../components/ui'
import { CuerpoRecurso } from './CuerpoRecurso'
import { etiquetaTipo, formatoDuracion } from './formato'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { ErrorFormacion } from './formacion.api'
import { useSesion } from '../cuentas'
import { useRecursoPublico } from './useRecursos'
import { useCambiarGuardado, useRecursoGuardado } from './useProgreso'
import styles from './PantallaRecurso.module.css'

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' })

export function PantallaRecurso() {
  return (
    <MarcoFormacion titulo="Recursos">
      <DetalleRecurso />
    </MarcoFormacion>
  )
}

/** Guardar para después (REC-02): solo con sesión. Es un marcador, no
 * inicia ningún curso ni mide nada. */
function GuardarRecurso({ idRecurso }: { idRecurso: string }) {
  const { usuario } = useSesion()
  const estado = useRecursoGuardado(idRecurso)
  const cambiar = useCambiarGuardado()

  if (!usuario || estado.data === undefined) return null
  const guardado = estado.data

  return (
    <div className={styles.guardar}>
      <Button
        variant="secondary"
        size="sm"
        disabled={cambiar.isPending}
        onClick={() => cambiar.mutate({ idRecurso, guardar: !guardado })}
      >
        {guardado ? 'Quitar de guardados' : 'Guardar para después'}
      </Button>
      <span role="status" className={styles.guardadoEstado}>
        {guardado ? (
          <>
            <span aria-hidden="true">✓ </span>Guardado en{' '}
            <Link to="/mi-formacion?vista=guardados">Mi formación</Link>
          </>
        ) : null}
      </span>
      {cambiar.isError ? <AvisoError mensaje={cambiar.error.message} /> : null}
    </div>
  )
}

function DetalleRecurso() {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const { id = '' } = useParams()
  const consulta = useRecursoPublico(id)
  // Tras un 404 la consulta conserva los datos de antes: el recurso ya no
  // existe para el público y no se debe seguir mostrando.
  const noExiste = consulta.error instanceof ErrorFormacion && consulta.error.status === 404

  return (
    <div className={styles.pagina}>
      <Link to="/recursos" className={styles.volver}>
        ← Todos los recursos
      </Link>

      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando recurso">
          <IconoCargando size={24} />
        </div>
      ) : null}

      {consulta.isError ? (
        <div className={styles.estado}>
          {noExiste ? (
            <>
              <Titulo className={styles.titulo}>No encontramos este recurso</Titulo>
              <p className={styles.resumen}>
                Puede que se haya retirado o que el enlace esté incompleto.
              </p>
              <Button variant="secondary" to="/recursos">
                Ver todos los recursos
              </Button>
            </>
          ) : (
            <>
              <AvisoError mensaje={consulta.error.message} />
              <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      ) : null}

      {consulta.data && !noExiste ? (
        <article className={styles.articulo}>
          <header className={styles.cabecera}>
            <p className={styles.eyebrow}>
              {[
                etiquetaTipo(consulta.data.tipoRecurso),
                consulta.data.area ? ETIQUETAS_AREA[consulta.data.area] : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Titulo className={styles.titulo}>{consulta.data.titulo}</Titulo>
            {consulta.data.resumen ? (
              <p className={styles.resumen}>{consulta.data.resumen}</p>
            ) : null}
            <div className={styles.meta}>
              {consulta.data.duracionMin ? (
                <span>{formatoDuracion(consulta.data.duracionMin, consulta.data.tipoRecurso)}</span>
              ) : null}
              <span>{ETIQUETAS_SECCION[consulta.data.seccion]}</span>
            </div>
            <GuardarRecurso idRecurso={consulta.data.idRecurso} />
            {consulta.data.elementos.length > 0 ? (
              <ul className={styles.elementos} aria-label="Elementos de colaboración">
                {consulta.data.elementos.map((e) => (
                  <li key={e}>
                    <Badge variant="neutral">{ETIQUETAS_ELEMENTO[e]}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <div className={styles.cuerpo}>
            <CuerpoRecurso recurso={consulta.data} />
          </div>

          <footer className={styles.pie}>
            {consulta.data.fuente ? <p>Fuente: {consulta.data.fuente}</p> : null}
            {consulta.data.licencia ? <p>Derechos de uso: {consulta.data.licencia}</p> : null}
            <p>
              Actualizado el{' '}
              <time dateTime={consulta.data.fechaActualizacion}>
                {FECHA.format(new Date(consulta.data.fechaActualizacion))}
              </time>
            </p>
          </footer>
        </article>
      ) : null}
    </div>
  )
}
