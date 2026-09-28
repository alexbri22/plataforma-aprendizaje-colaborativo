import styles from './AvisoError.module.css'

interface AvisoErrorProps {
  mensaje: string
}

export function AvisoError({ mensaje }: AvisoErrorProps) {
  return (
    <p className={styles.aviso} role="alert">
      {mensaje}
    </p>
  )
}
