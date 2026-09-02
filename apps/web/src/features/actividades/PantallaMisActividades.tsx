import { Encabezado } from '../../components/Encabezado'
import { Card } from '../../components/ui'
import styles from './PantallaMisActividades.module.css'

// Placeholder: se convertirá en el dashboard real del módulo de Actividades
// (docs/diseno-desarrollo-nucleo.md §7.8). Por ahora solo confirma
// visualmente que iniciar sesión o registrarse funcionó.
export function PantallaMisActividades() {
  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <Card className={styles.card}>
          <h1>Mis actividades</h1>
          <p className={styles.texto}>
            Sesión iniciada correctamente. Aquí vivirán tus actividades cuando ese módulo esté
            construido.
          </p>
        </Card>
      </main>
    </div>
  )
}
