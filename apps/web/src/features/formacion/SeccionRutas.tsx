import { Link } from 'react-router-dom'
import { ETIQUETAS_NIVEL_CURSO, type NivelCurso } from '@plataforma/shared'
import { Button } from '../../components/ui'
import { useSesion } from '../cuentas'
import { IconoFlecha } from './iconos'
import { usePreferencias, useRecomendaciones } from './useProgreso'
import { useRutasPublicas } from './useRutas'
import styles from './PantallaRecursos.module.css'

/*
 * "Ruta recomendada" de /recursos (nota del incremento 4). Con sesión, la
 * primera que propone el recomendador, con sus razones; sin sesión, o si ya
 * terminó todas, la destacada del catálogo. Debajo, el resto de las rutas.
 * Reemplaza la vista previa fija de ruta.fixtures.ts.
 */

interface Paso {
  idCurso: string
  titulo: string
  nivel: NivelCurso | null
  duracionMin: number
  disponible: boolean
  estado?: 'pendiente' | 'en_curso' | 'completado'
}

interface Principal {
  idRuta: string
  titulo: string
  finalidad: string
  cursos: Paso[]
  /** Solo si viene del recomendador en modo personalizado. */
  razones: string[]
  sobretitulo: string
}

function detalleDe(p: Paso): string {
  if (!p.disponible) return 'No disponible'
  return [
    p.duracionMin ? `${p.duracionMin} min` : null,
    p.nivel ? ETIQUETAS_NIVEL_CURSO[p.nivel] : null,
    p.estado === 'completado' ? '✓ Completado' : p.estado === 'en_curso' ? 'En curso' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function SeccionRutas() {
  const { usuario } = useSesion()
  const publicas = useRutasPublicas()
  const recomendaciones = useRecomendaciones()
  const preferencias = usePreferencias()

  const rutas = publicas.data?.rutas ?? []
  if (rutas.length === 0) return null
  // Con sesión se espera a saber qué recomendar, para no mostrar la
  // destacada y cambiarla al llegar la recomendación.
  if (usuario && recomendaciones.isPending) return null

  const recomendada = usuario ? recomendaciones.data?.recomendaciones[0] : undefined
  const personalizada = recomendaciones.data?.modo === 'personalizado'
  const destacada = rutas[0]

  const principal: Principal = recomendada
    ? {
        idRuta: recomendada.ruta.idRuta,
        titulo: recomendada.ruta.titulo,
        finalidad: recomendada.ruta.finalidad,
        cursos: recomendada.ruta.cursos,
        razones: personalizada ? recomendada.razones : [],
        sobretitulo: personalizada ? 'Ruta recomendada para ti' : 'Ruta recomendada',
      }
    : {
        idRuta: destacada.idRuta,
        titulo: destacada.titulo,
        finalidad: destacada.finalidad,
        cursos: destacada.cursos,
        razones: [],
        sobretitulo: destacada.destacada ? 'Ruta destacada' : 'Ruta de aprendizaje',
      }
  const otras = rutas.filter((r) => r.idRuta !== principal.idRuta)
  const sinPreferencias = usuario !== null && preferencias.data?.length === 0

  return (
    <section id="ruta-destacada" className={styles.ruta} aria-labelledby="titulo-ruta">
      <div className={styles.rutaIntroduccion}>
        <p className={styles.eyebrow}>{principal.sobretitulo}</p>
        <h2 id="titulo-ruta">{principal.titulo}</h2>
        <p>{principal.finalidad}</p>

        {principal.razones.length > 0 ? (
          <div className={styles.rutaRazones}>
            <p className={styles.rutaRazonesTitulo}>Por qué te la recomendamos</p>
            <ul>
              {principal.razones.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.rutaAcciones}>
          <Button size="sm" to={`/rutas/${principal.idRuta}`}>
            Ver la ruta
          </Button>
          {sinPreferencias ? (
            <Link to="/mi-formacion" className={styles.enlaceTexto}>
              Elige qué quieres fortalecer <IconoFlecha className={styles.flecha} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.rutaLateral}>
        <ol className={styles.rutaPasos}>
          {principal.cursos.map((paso, i) => (
            <li key={paso.idCurso}>
              <span className={styles.numeroPaso}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <strong>{paso.titulo}</strong>
                <span>{detalleDe(paso)}</span>
              </div>
            </li>
          ))}
        </ol>

        {otras.length > 0 ? (
          <nav aria-labelledby="titulo-otras-rutas" className={styles.otrasRutas}>
            <p id="titulo-otras-rutas" className={styles.rutaRazonesTitulo}>
              Otras rutas
            </p>
            <ul>
              {otras.map((r) => (
                <li key={r.idRuta}>
                  <Link to={`/rutas/${r.idRuta}`}>{r.titulo}</Link>
                  <span>{r.finalidad}</span>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </section>
  )
}
