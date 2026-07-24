import { Button } from '../../components/ui'
import styles from './PantallaInicio.module.css'

function FlechaIcono() {
  return (
    <svg className={styles.seccionLinkIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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
    id: 'que-es-co3',
    titulo: 'Qué es Co3',
    texto:
      'Los fundamentos del aprendizaje colaborativo que dan forma a Co3, basados en los cinco aspectos de Johnson y Johnson (1999).',
  },
  {
    id: 'colaborar-para-aprender',
    titulo: 'Colaborar para aprender',
    texto:
      'Cómo se traducen esos fundamentos en comportamientos concretos dentro de una actividad: comunicación, responsabilidad compartida y manejo de desacuerdos.',
  },
]

export function PantallaInicio() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <header>
        <div className={styles.headerInner}>
          <span className={styles.brand}>Co3</span>

          <nav className={styles.nav} aria-label="Principal">
            <button type="button" className={styles.navLink}>
              Insignias
            </button>
            <button type="button" className={styles.navLink}>
              Recursos
            </button>
          </nav>
        </div>
      </header>

      <main id="contenido" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <div className={styles.heroCopy}>
                <h1>Aprender colaborando</h1>
                <p className={styles.heroLede}>
                  Co3 es el espacio para practicar colaboración real, no solo coordinar tareas:
                  equipos, seguimiento y evaluación configurables actividad por actividad, sin
                  modos de gestión fijos.
                </p>
              </div>
              <div className={styles.heroActions}>
                <Button>Registrarse</Button>
                <Button variant="secondary">Ingresar</Button>
              </div>
            </div>

            <img
              className={styles.heroImg}
              src="/hero-ilustracion-colaboracion.webp"
              alt="Personas colaborando para armar piezas de un rompecabezas"
              width="1200"
              height="923"
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
                  Ver recursos
                  <FlechaIcono />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerBrandName}>Co3</span>
            <p className={styles.footerCopyright}>
              © {new Date().getFullYear()} Co3. Aprender colaborando.
            </p>
          </div>

          {/* TODO: confirmar la redacción exacta que exige Magnific para su crédito (solo
              tenemos su indicación de ubicación, no el texto) — ver DESIGN.md §6. */}
          <p className={styles.footerCredit}>
            Ilustración de portada:{' '}
            <a href="https://www.magnific.com" target="_blank" rel="noopener noreferrer">
              Designed by pch.vector / Magnific
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
