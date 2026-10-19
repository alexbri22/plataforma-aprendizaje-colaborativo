import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../../components/ui'
import styles from './AvisoSinCuenta.module.css'

// Se recuerda solo durante la visita (sessionStorage): quien lo cierra no lo
// vuelve a ver al pasar de un recurso a otro, pero sí la próxima vez que
// entre. Si el almacenamiento no está disponible, el aviso simplemente se
// muestra.
const CLAVE_CERRADO = 'co3.recursos.avisoSinCuenta.cerrado'

function leerCerrado(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_CERRADO) === 'true'
  } catch {
    return false
  }
}

function guardarCerrado() {
  try {
    sessionStorage.setItem(CLAVE_CERRADO, 'true')
  } catch {
    // Sin almacenamiento, el aviso solo no recuerda que se cerró.
  }
}

function IconoInfo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 9v4.5M10 6.5v.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/*
 * Aviso para quien consulta el contenido formativo sin sesión (concepto
 * §2.6: el contenido es público). Todo se puede leer; lo único que exige
 * cuenta es guardar el progreso, que llega con los cursos
 * (docs/diseno-desarrollo-formacion.md, incremento 3). "Ingresar" regresa a
 * la misma página después de iniciar sesión.
 */
export function AvisoSinCuenta() {
  const location = useLocation()
  const [cerrado, setCerrado] = useState(leerCerrado)

  if (cerrado) return null

  function cerrar() {
    guardarCerrado()
    setCerrado(true)
  }

  return (
    <aside className={styles.aviso} aria-labelledby="aviso-sin-cuenta-titulo">
      <div className={styles.interior}>
        <span className={styles.icono}>
          <IconoInfo />
        </span>
        <div className={styles.texto}>
          <p id="aviso-sin-cuenta-titulo" className={styles.titulo}>
            Estás explorando sin cuenta
          </p>
          <p>
            Puedes consultar y descargar todos los recursos libremente, pero no guardaremos tu
            progreso. Inicia sesión o crea una cuenta para que tu avance quede guardado.
          </p>
        </div>
        <div className={styles.acciones}>
          <Button size="sm" to="/ingresar" state={{ desde: location.pathname + location.search }}>
            Ingresar
          </Button>
          <Button size="sm" variant="secondary" to="/registrarse">
            Crear cuenta
          </Button>
        </div>
        <button type="button" className={styles.cerrar} onClick={cerrar}>
          <span aria-hidden="true">×</span>
          <span className={styles.srOnly}>Cerrar aviso</span>
        </button>
      </div>
    </aside>
  )
}
