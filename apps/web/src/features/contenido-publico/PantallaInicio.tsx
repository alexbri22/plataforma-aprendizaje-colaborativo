import { Encabezado } from '../../components/Encabezado'
import { Button } from '../../components/ui'
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
    texto:
      'Co3 permite definir actividades colaborativas y equipos de trabajo. Considera dos tipos de espacios para evaluar la actividad y, por otro lado, la participación de los miembros del equipo.',
  },
  {
    id: 'aprender-colaborando',
    titulo: 'Aprender colaborando',
    texto:
      'El aprendizaje colaborativo tiene sus fundamentos en el trabajo de Johnson y Johnson. Impulsa el desarrollo de cinco aspectos: definición de responsabilidades, interdependencia positiva, responsabilidad individual y grupal, interacción y habilidades sociales.',
  },
]

export function PantallaInicio() {
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
                <Button to="/registrarse">Registrarse</Button>
                <Button variant="secondary" to="/ingresar">
                  Ingresar
                </Button>
              </div>
            </div>

            <img
              className={styles.heroImg}
              src="/personas.png"
              alt="Personas colaborando para armar piezas de un rompecabezas"
              width="2000"
              height="1538"
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
                <button type="button" className={styles.seccionLink}>
                  Ver más
                  <FlechaIcono />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
