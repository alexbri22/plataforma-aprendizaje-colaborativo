import type { IntegranteEquipo } from '@plataforma/shared'
import { EnlacePerfil } from '../../components/EnlacePerfil'
import styles from './IntegrantesEquipo.module.css'

// Quiénes integran el equipo, arriba de su espacio de trabajo. Antes vivía
// en la barra lateral propia del equipo; con un solo shell, va junto al
// contenido que el equipo comparte.
export function IntegrantesEquipo({ integrantes }: { integrantes: IntegranteEquipo[] }) {
  if (integrantes.length === 0) return null
  return (
    <p className={styles.integrantes}>
      <span className={styles.etiqueta}>Integrantes</span>
      {integrantes.map((integrante, indice) => (
        <span key={integrante.idMembresia}>
          {indice > 0 ? <span aria-hidden="true"> · </span> : null}
          <EnlacePerfil idUsuario={integrante.idUsuario}>{integrante.nombre}</EnlacePerfil>
        </span>
      ))}
    </p>
  )
}
