import styles from './AvisoAdvertencia.module.css'

interface AvisoAdvertenciaProps {
  mensaje: string
}

// Como AvisoError, pero para lo que impide seguir sin ser un fallo: un
// reparto que todavía no suma 100. role="status" y no "alert": cambia
// mientras la persona escribe y no debe interrumpir al lector de pantalla.
export function AvisoAdvertencia({ mensaje }: AvisoAdvertenciaProps) {
  return (
    <p className={styles.aviso} role="status">
      {mensaje}
    </p>
  )
}
