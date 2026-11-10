import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_ELEMENTO, ETIQUETAS_NIVEL_CURSO } from '@plataforma/shared'
import { AvisoError, Badge, Button, Card, IconoCargando } from '../../components/ui'
import { useSesion } from '../cuentas'
import { BarraProgreso } from './BarraProgreso'
import { ErrorFormacion, type MiFormacion, type RutaPublica } from './formacion.api'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { useMiFormacion } from './useProgreso'
import { useRutaPublica } from './useRutas'
import styles from './PantallaCurso.module.css'
import propios from './PantallaRuta.module.css'

/*
 * Ficha de una ruta de aprendizaje (nota del incremento 4): para qué sirve,
 * sus cursos en orden y, con sesión, el avance en cada uno. Es pública, como
 * los cursos. El avance de la ruta no se guarda: se calcula de los cursos.
 */
export function PantallaRuta() {
  return (
    <MarcoFormacion titulo="Recursos">
      <FichaRuta />
    </MarcoFormacion>
  )
}

type EstadoCurso = 'pendiente' | 'en_curso' | 'completado'

function estadosDe(data: MiFormacion | undefined): Map<string, EstadoCurso> {
  if (!data) return new Map()
  return new Map([
    ...data.enCurso.map((c) => [c.idCurso, 'en_curso'] as const),
    ...data.completados.map((c) => [c.idCurso, 'completado'] as const),
  ])
}

function Contenido({ ruta }: { ruta: RutaPublica }) {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const { usuario } = useSesion()
  // Sin respuesta de Mi formación (cargando o con error) no se sabe el
  // avance: no se calcula ni se ofrece un destino personalizado, porque un
  // mapa vacío se leería como "no ha empezado nada".
  const miFormacion = useMiFormacion()
  const estados = estadosDe(miFormacion.data)
  const disponibles = ruta.cursos.filter((c) => c.disponible)
  const completados = disponibles.filter((c) => estados.get(c.idCurso) === 'completado').length
  const siguiente = disponibles.find((c) => estados.get(c.idCurso) !== 'completado')
  const terminada = disponibles.length > 0 && completados === disponibles.length
  const porcentaje =
    disponibles.length === 0 ? 0 : Math.floor((completados * 100) / disponibles.length)
  const empezo = disponibles.some((c) => estados.has(c.idCurso))

  return (
    <article className={styles.ficha}>
      <div className={styles.principal}>
        <header>
          <p className={styles.eyebrow}>
            {[
              'Ruta de aprendizaje',
              ruta.derivado.nivelInicial
                ? `Desde nivel ${ETIQUETAS_NIVEL_CURSO[ruta.derivado.nivelInicial].toLowerCase()}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Titulo className={styles.titulo}>{ruta.titulo}</Titulo>
          <p className={styles.resumen}>{ruta.finalidad}</p>
        </header>

        {ruta.descripcion ? (
          <section aria-labelledby="titulo-descripcion">
            <h2 id="titulo-descripcion">De qué trata</h2>
            <p className={propios.descripcion}>{ruta.descripcion}</p>
          </section>
        ) : null}

        <section aria-labelledby="titulo-cursos">
          <h2 id="titulo-cursos">Cursos de la ruta</h2>
          <ol className={styles.temario}>
            {ruta.cursos.map((c, i) => {
              const estado = estados.get(c.idCurso)
              return (
                <li key={c.idCurso}>
                  <span className={styles.numero}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.temarioTexto}>
                    {c.disponible ? (
                      <Link to={`/cursos/${c.idCurso}`}>{c.titulo}</Link>
                    ) : (
                      <span className={styles.noDisponible}>{c.titulo}</span>
                    )}
                    {estado === 'completado' ? (
                      <span className={styles.completada}>
                        <span aria-hidden="true">✓ </span>Completado
                      </span>
                    ) : estado === 'en_curso' ? (
                      <span className={propios.enCurso}>En curso</span>
                    ) : null}
                    {c.disponible ? (
                      <span className={styles.temarioMeta}>
                        {[
                          c.nivel ? ETIQUETAS_NIVEL_CURSO[c.nivel] : null,
                          c.duracionMin ? `${c.duracionMin} min` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className={styles.temarioMeta}>
                        Se retiró del catálogo; no cuenta para terminar la ruta.
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {ruta.derivado.elementos.length > 0 ? (
          <section aria-labelledby="titulo-elementos">
            <h2 id="titulo-elementos">Elementos de colaboración que trabaja</h2>
            <ul className={styles.elementos}>
              {ruta.derivado.elementos.map((e) => (
                <li key={e.elemento}>
                  <Badge variant="neutral">
                    {ETIQUETAS_ELEMENTO[e.elemento]} · {e.cursos}{' '}
                    {e.cursos === 1 ? 'curso' : 'cursos'}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className={styles.lateral} aria-label="Resumen de la ruta">
        <Card className={styles.tarjeta}>
          <dl className={styles.datos}>
            <div>
              <dt>Cursos</dt>
              <dd>{ruta.derivado.numCursos}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>{ruta.derivado.duracionMin} min</dd>
            </div>
          </dl>

          {usuario && !miFormacion.data ? (
            miFormacion.isError ? (
              <div className={styles.avance}>
                <AvisoError mensaje={miFormacion.error.message} />
                <Button variant="secondary" size="sm" onClick={() => void miFormacion.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <div
                className={styles.cargandoProgreso}
                role="status"
                aria-label="Cargando tu avance"
              >
                <IconoCargando size={16} />
              </div>
            )
          ) : usuario ? (
            <div className={styles.avance}>
              {terminada ? (
                <p className={styles.terminado}>
                  <span aria-hidden="true">✓ </span>Completaste esta ruta
                </p>
              ) : (
                <p className={styles.avanceTitulo}>Tu avance</p>
              )}
              <BarraProgreso
                porcentaje={porcentaje}
                completo={terminada}
                etiqueta={`Progreso en ${ruta.titulo}`}
              />
              <p className={styles.avanceTexto}>
                {completados} de {disponibles.length}{' '}
                {disponibles.length === 1 ? 'curso' : 'cursos'} · {porcentaje} %
              </p>
              {siguiente ? (
                <Button to={`/cursos/${siguiente.idCurso}`}>
                  {empezo ? 'Seguir con la ruta' : 'Empezar la ruta'}
                </Button>
              ) : null}
            </div>
          ) : siguiente ? (
            <Button to={`/cursos/${siguiente.idCurso}`}>Empezar la ruta</Button>
          ) : null}
        </Card>
      </aside>
    </article>
  )
}

function FichaRuta() {
  const { id = '' } = useParams()
  const consulta = useRutaPublica(id)
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const noExiste = consulta.error instanceof ErrorFormacion && consulta.error.status === 404

  return (
    <div className={styles.pagina}>
      <Link to="/recursos" className={styles.volver}>
        ← Todos los recursos
      </Link>

      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando ruta">
          <IconoCargando size={24} />
        </div>
      ) : null}

      {consulta.isError ? (
        <div className={styles.estado}>
          {noExiste ? (
            <>
              <Titulo className={styles.titulo}>No encontramos esta ruta</Titulo>
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

      {consulta.data && !noExiste ? <Contenido ruta={consulta.data} /> : null}
    </div>
  )
}
