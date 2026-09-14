import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import styles from './PantallaAutenticacion.module.css'

interface PantallaAutenticacionProps {
  titulo: string
  subtitulo: string
  children: ReactNode
  pie: ReactNode
  anchoCard?: 'compacta' | 'amplia'
}

export function PantallaAutenticacion({
  titulo,
  subtitulo,
  children,
  pie,
  anchoCard = 'compacta',
}: PantallaAutenticacionProps) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <main id="contenido" className={styles.main}>
        <Card
          className={[styles.card, anchoCard === 'amplia' ? styles.cardAmplia : null]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.formLado}>
            <Link to="/" className={styles.marca}>
              <img src="/co3-marca.png" alt="Co3" className={styles.marcaImg} />
            </Link>

            <div className={styles.encabezado}>
              <h1>{titulo}</h1>
              <p className={styles.subtitulo}>{subtitulo}</p>
            </div>

            {children}

            <p className={styles.pie}>{pie}</p>
          </div>

          <aside className={styles.panel} aria-hidden="true">
            <div className={styles.panelVisual}>
              <img className={styles.panelImg} src="/portada-panel.png" alt="" />
            </div>
            <p className={styles.panelTexto}>
              Conecta, colabora y construye conocimiento junto con tu equipo.
            </p>
          </aside>
        </Card>
      </main>
    </div>
  )
}
