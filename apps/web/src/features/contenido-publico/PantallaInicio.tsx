import { Link } from 'react-router-dom'
import { Encabezado } from '../../components/Encabezado'
import { Button } from '../../components/ui'
import { useSesion } from '../cuentas'
import styles from './PantallaInicio.module.css'

function FlechaIcono() {
  return (
    <svg
      className={styles.seccionLinkIcon}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 8h9.5M8 3.5 13 8l-5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const RECURSOS = [
  {
    id: 'caracteristicas-de-co3',
    titulo: 'Características de Co3',
    to: '/caracteristicas',
    texto:
      'Co3 permite definir actividades colaborativas y equipos de trabajo. Considera dos tipos de espacios para evaluar la actividad y, por otro lado, la participación de los miembros del equipo.',
  },
  {
    id: 'aprender-colaborando',
    titulo: 'Aprender colaborando',
    // Lleva a la página general de Recursos (observaciones del 4 de noviembre).
    to: '/recursos',
    texto:
      'El aprendizaje colaborativo es un enfoque de enseñanza fundado en el trabajo de Johnson y Johnson, quienes plantean que los estudiantes trabajen en equipos para lograr objetivos educativos en conjunto.',
  },
]

export function PantallaInicio() {
  const { usuario } = useSesion()

  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <div className={styles.heroCopy}>
                <h1>Conecta. Colabora. Construye.</h1>
                <p className={styles.heroLede}>
                  <strong>Co3</strong> es un sistema diseñado para apoyar a estudiantes y profesores
                  en el seguimiento de actividades basadas en el aprendizaje colaborativo.
                </p>
              </div>
              <div className={styles.heroActions}>
                {usuario ? (
                  <Button to="/actividades">Ir a mis actividades</Button>
                ) : (
                  <>
                    <Button to="/registrarse">Crear cuenta</Button>
                    <Button variant="secondary" to="/ingresar">
                      Ingresar
                    </Button>
                  </>
                )}
              </div>
            </div>

            <img
              className={styles.heroImg}
              src="/portada.png"
              alt="Manos colaborando: escribiendo, ensamblando ideas y construyendo conocimiento en conjunto"
              width="1600"
              height="901"
              fetchPriority="high"
            />
          </div>
        </section>

        <section className={styles.contenidoPublico} aria-label="Contenido formativo">
          <div className={styles.recursosLista}>
            {RECURSOS.map((r) => (
              <div key={r.id} id={r.id} className={styles.recursosFila}>
                <div className={styles.recursosFilaTexto}>
                  <h2>{r.titulo}</h2>
                  <p>{r.texto}</p>
                </div>
                {/* Sin restauración de scroll en el router, la página nueva
                    abriría a la altura en que se dio clic. */}
                <Link
                  to={r.to}
                  className={styles.seccionLink}
                  onClick={() => window.scrollTo({ top: 0 })}
                >
                  Ver más
                  <span className={styles.srOnly}>: {r.titulo}</span>
                  <FlechaIcono />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
