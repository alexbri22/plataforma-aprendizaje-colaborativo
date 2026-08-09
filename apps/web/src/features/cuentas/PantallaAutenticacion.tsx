import type { ReactNode } from 'react'
import { Encabezado } from '../../components/Encabezado'
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
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <Card
          className={[styles.card, anchoCard === 'amplia' ? styles.cardAmplia : null]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.encabezado}>
            <h1>{titulo}</h1>
            <p className={styles.subtitulo}>{subtitulo}</p>
          </div>
          {children}
        </Card>
        <p className={styles.pie}>{pie}</p>
      </main>
    </div>
  )
}
