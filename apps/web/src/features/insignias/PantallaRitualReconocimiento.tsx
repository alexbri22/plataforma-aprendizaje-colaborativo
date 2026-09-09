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

// Cuando exista el módulo de Actividades, esta fecha sale del cierre de la
// actividad. Aquí es fija para que la pantalla de muestra no cambie de un día
// para otro.
const CIERRE_DE_EJEMPLO = new Date(2026, 10, 14)

const EQUIPO_DE_EJEMPLO: IntegranteEquipo[] = [
  { id: 'm-2', nombre: 'Andrea Solís' },
  { id: 'm-3', nombre: 'Bruno Tapia' },
  { id: 'm-4', nombre: 'Camila Rentería' },
  { id: 'm-5', nombre: 'Diego Mendoza' },
  { id: 'm-6', nombre: 'Elena Vargas' },
]

export function PantallaRitualReconocimiento() {
  const [guardado, setGuardado] = useState(false)
  const [ultimo, setUltimo] = useState<readonly ReconocimientoBorrador[]>([])

  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <header className={styles.encabezado}>
          <Badge variant="accent">Periodo de cierre</Badge>
          <h1 className={styles.titulo}>Reconoce el trabajo de tu equipo</h1>
          <p className={styles.lede}>
            La actividad terminó. Antes de que cierre, reparte tus reconocimientos entre los
            compañeros de tu equipo. Toma dos o tres minutos.
          </p>
        </header>

        <Card>
          <RitualReconocimiento
            companeros={EQUIPO_DE_EJEMPLO}
            fechaLimite={CIERRE_DE_EJEMPLO}
            guardado={guardado}
            onGuardar={(reconocimientos) => {
              setUltimo(reconocimientos)
              setGuardado(true)
            }}
          />
        </Card>

        {guardado ? (
          <section className={styles.seccion}>
            <h2 className={styles.seccionTitulo}>Lo que se guardaría en la API</h2>
            <p className={styles.lede}>
              Todavía no hay endpoint de otorgamiento, así que el guardado termina aquí. Esto es lo
              que el componente entregó.
            </p>
            <pre className={styles.carga}>{JSON.stringify(ultimo, null, 2)}</pre>
          </section>
        ) : null}
      </main>
    </div>
  )
}
