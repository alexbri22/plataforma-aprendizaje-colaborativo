import { useState } from 'react'
import { Encabezado } from '../../components/Encabezado'
import { Badge, Card } from '../../components/ui'
import {
  RitualReconocimiento,
  type IntegranteEquipo,
  type ReconocimientoBorrador,
} from './RitualReconocimiento'
import styles from './PantallaRitualReconocimiento.module.css'

/*
 * Pantalla de muestra, no de producto. El ritual ocurre dentro de una actividad
 * en periodo de cierre, y ni actividades ni equipos ni membresías existen
 * todavía (Fase A del núcleo): los datos de abajo son de ejemplo y el envío no
 * llega a ninguna API. Cuando el módulo de Actividades exista, el componente se
 * monta ahí con los integrantes reales y esta ruta se elimina.
 */

const EQUIPO_DE_EJEMPLO: IntegranteEquipo[] = [
  { id: 'm-2', nombre: 'Andrea Solís' },
  { id: 'm-3', nombre: 'Bruno Tapia' },
  { id: 'm-4', nombre: 'Camila Rentería' },
  { id: 'm-5', nombre: 'Diego Mendoza' },
  { id: 'm-6', nombre: 'Elena Vargas' },
]

export function PantallaRitualReconocimiento() {
  const [enviado, setEnviado] = useState(false)
  const [ultimo, setUltimo] = useState<readonly ReconocimientoBorrador[]>([])

  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <header className={styles.encabezado}>
          <Badge variant="accent">Periodo de cierre</Badge>
          <h1 className={styles.titulo}>Reconoce a tu equipo</h1>
          <p className={styles.lede}>
            La actividad terminó. Antes de cerrarla, reparte tus reconocimientos entre los
            compañeros de tu equipo. Toma dos o tres minutos y solo se hace una vez.
          </p>
        </header>

        <Card>
          <RitualReconocimiento
            companeros={EQUIPO_DE_EJEMPLO}
            enviado={enviado}
            onEnviar={(reconocimientos) => {
              setUltimo(reconocimientos)
              setEnviado(true)
            }}
          />
        </Card>

        {enviado ? (
          <section className={styles.seccion}>
            <h2 className={styles.seccionTitulo}>Lo que se enviaría a la API</h2>
            <p className={styles.lede}>
              Todavía no hay endpoint de otorgamiento, así que el envío termina aquí. Esto es lo que
              el componente entregó.
            </p>
            <pre className={styles.carga}>{JSON.stringify(ultimo, null, 2)}</pre>
          </section>
        ) : null}
      </main>
    </div>
  )
}
