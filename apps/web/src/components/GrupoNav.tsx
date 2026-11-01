import { useId, useState, type ReactNode } from 'react'
import styles from './GrupoNav.module.css'

function IconoChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="m8 5.5 4.5 4.5L8 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Preferencia de la persona (abierto/cerrado) por grupo plegable. Es una
// comodidad por navegador: si el almacenamiento no está disponible, el grupo
// simplemente arranca abierto.
function leerGrupoAbierto(clave: string): boolean {
  try {
    return localStorage.getItem(clave) !== 'false'
  } catch {
    return true
  }
}

function guardarGrupoAbierto(clave: string, abierto: boolean) {
  try {
    localStorage.setItem(clave, String(abierto))
  } catch {
    // Sin almacenamiento el grupo solo no recuerda su estado entre pantallas.
  }
}

export interface GrupoNavProps {
  claveAlmacenamiento: string
  etiqueta: string
  Icono: () => ReactNode
  /** Si el grupo contiene el ítem activo: se abre siempre, para que nunca
   * quede oculto, sin importar lo que diga la preferencia guardada. */
  contieneActivo?: boolean
  /** 'principal': un ítem más del nivel superior, mismo tamaño que el resto
   * y sin separador (p. ej. Actividades). 'seccion': grupo aparte, separado
   * por línea y en versalitas (p. ej. Administración, Proceso colaborativo).
   * Ambas variantes indentan a sus hijos por igual. */
  variante?: 'principal' | 'seccion'
  children: ReactNode
}

// Grupo plegable de navegación (DESIGN.md): un encabezado que alterna un
// panel con sus ítems, con los hijos indentados bajo la etiqueta del grupo.
// Compartido entre AppShell y AppShellEquipo para que ambos colapsen y
// recuerden su estado de la misma forma.
export function GrupoNav({
  claveAlmacenamiento,
  etiqueta,
  Icono,
  contieneActivo = false,
  variante = 'seccion',
  children,
}: GrupoNavProps) {
  const idPanel = useId()
  const [abierto, setAbierto] = useState(
    () => contieneActivo || leerGrupoAbierto(claveAlmacenamiento),
  )

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    guardarGrupoAbierto(claveAlmacenamiento, siguiente)
  }

  const esPrincipal = variante === 'principal'

  return (
    <div className={esPrincipal ? styles.grupoPrincipal : styles.grupo}>
      <button
        type="button"
        className={[
          esPrincipal ? styles.grupoEncabezadoPrincipal : styles.grupoEncabezado,
          contieneActivo ? styles.grupoEncabezadoActivo : null,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        <Icono />
        <span className={styles.grupoEtiqueta}>{etiqueta}</span>
        <IconoChevron className={styles.grupoChevron} />
      </button>

      <div
        id={idPanel}
        className={[styles.grupoPanel, abierto ? styles.grupoPanelAbierto : null]
          .filter(Boolean)
          .join(' ')}
        inert={!abierto}
      >
        <div className={styles.grupoItems}>{children}</div>
      </div>
    </div>
  )
}
