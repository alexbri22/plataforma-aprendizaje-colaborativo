import { NIVELES } from '@plataforma/shared'
import { Encabezado } from '../../components/Encabezado'
import { Card } from '../../components/ui'
import { IconoCategoria } from './IconoCategoria'
import { InsigniaCategoria } from './InsigniaCategoria'
import { MarcoRango } from './MarcoRango'
import { VitrinaInsignias } from './VitrinaInsignias'
import styles from './PantallaMuestraInsignias.module.css'

/*
 * Pantalla de muestra, no de producto. Existe para poder revisar los componentes
 * en el navegador mientras el perfil de usuario no está construido: en cuanto
 * exista, la vitrina se monta ahí y esta ruta se elimina.
 */

// Un perfil de ejemplo con las seis categorías en momentos distintos de la
// escala, para ver de un vistazo los cinco marcos y el hueco sin rango.
const PUNTOS_DE_EJEMPLO = {
  liderazgo: 21,
  companerismo: 9,
  comunicacion: 4,
  compromiso: 62,
  ideas: 36,
  'buen-juicio': 1,
}

export function PantallaMuestraInsignias() {
  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <header>
          <h1 className={styles.titulo}>Sistema de recompensas</h1>
          <p className={styles.lede}>
            Muestra de los componentes de insignias. Cada categoría progresa por separado y su marco
            corresponde al nivel alcanzado en ella. Los puntos nunca se pierden y no existen niveles
            negativos: el sistema solo reconoce lo bueno.
          </p>
        </header>

        <section className={styles.seccion}>
          <h2 className={styles.seccionTitulo}>La escala</h2>
          <ul className={styles.escala}>
            {NIVELES.map((nivel) => (
              <li key={nivel.id} className={styles.escalaItem}>
                <MarcoRango nivel={nivel.id}>
                  <IconoCategoria categoria="liderazgo" className={styles.medallon} />
                </MarcoRango>
                <span className={styles.escalaNombre}>{nivel.nombre}</span>
                <span className={styles.escalaUmbral}>{nivel.puntosMinimos} pts</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.seccion}>
          <h2 className={styles.seccionTitulo}>Vitrina de un perfil</h2>
          <Card>
            <VitrinaInsignias puntos={PUNTOS_DE_EJEMPLO} />
          </Card>
        </section>

        <section className={styles.seccion}>
          <h2 className={styles.seccionTitulo}>Tamaños</h2>
          <div className={styles.fila}>
            <InsigniaCategoria categoria="ideas" puntos={36} tamano="sm" mostrarEtiqueta />
            <InsigniaCategoria categoria="ideas" puntos={36} tamano="md" mostrarEtiqueta />
            <InsigniaCategoria categoria="ideas" puntos={36} tamano="lg" mostrarEtiqueta />
          </div>
        </section>
      </main>
    </div>
  )
}
