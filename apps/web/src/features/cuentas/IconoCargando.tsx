import styles from './IconoCargando.module.css'

export function IconoCargando() {
  return (
    <svg className={styles.spinner} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle
        cx="8"
        cy="8"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M14.25 8a6.25 6.25 0 0 0-6.25-6.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
