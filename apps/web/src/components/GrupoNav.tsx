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
// simplemente arranca como diga `porDefecto`.
function leerGrupoAbierto(clave: string, porDefecto: boolean): boolean {
  try {
    const guardado = localStorage.getItem(clave)
    return guardado === null ? porDefecto : guardado === 'true'
  } catch {
    return porDefecto
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
  /** Sin ícono (subgrupos), el chevron ocupa su lugar a la izquierda. */
  Icono?: () => ReactNode
  /** Si el grupo contiene el ítem activo: se abre siempre, para que nunca
   * quede oculto, sin importar lo que diga la preferencia guardada. */
  contieneActivo?: boolean
  /** 'principal': un ítem más del nivel superior, mismo tamaño que el resto
   * y sin separador (p. ej. Actividades). 'seccion': grupo aparte, separado
   * por línea y en versalitas (p. ej. Administración, Proceso colaborativo).
   * 'subgrupo': encabezado discreto, sin línea ni versalitas, para agrupar
   * dentro del nivel de una actividad (p. ej. Proyecto colaborativo).
   * 'etapa': las etapas de una actividad (Creación, Desarrollo, Cierre), en
   * el color del texto y con su estado a la derecha. Todas las variantes
   * indentan a sus hijos por igual. */
  variante?: 'principal' | 'seccion' | 'subgrupo' | 'etapa'
  /** Junto a la etiqueta, a la derecha (el estado de una etapa). */
  marca?: ReactNode
  /** Siempre abierto y sin chevron: la etapa en curso no se pliega. */
  fijo?: boolean
  /** Cómo arranca la primera vez, antes de que la persona lo abra o lo
   * cierre: abierto, salvo que se pida lo contrario. */
  plegadoPorDefecto?: boolean
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
  plegadoPorDefecto = false,
  marca,
  fijo = false,
  children,
}: GrupoNavProps) {
  const idPanel = useId()
  const [abierto, setAbierto] = useState(
    () => contieneActivo || leerGrupoAbierto(claveAlmacenamiento, !plegadoPorDefecto),
  )
  // Si el ítem activo aparece después de montar (p. ej. en un grupo de una
  // actividad que terminó de cargar), el grupo se abre aunque la preferencia
  // guardada diga cerrado. Ajuste durante el render, no en un efecto.
  const [contieneActivoPrevio, setContieneActivoPrevio] = useState(contieneActivo)
  if (contieneActivo !== contieneActivoPrevio) {
    setContieneActivoPrevio(contieneActivo)
    if (contieneActivo) setAbierto(true)
  }

  function alternar() {
    const siguiente = !abierto
    setAbierto(siguiente)
    guardarGrupoAbierto(claveAlmacenamiento, siguiente)
  }

  const clasesPorVariante = {
    principal: [styles.grupoPrincipal, styles.grupoEncabezadoPrincipal],
    seccion: [styles.grupo, styles.grupoEncabezado],
    subgrupo: [styles.grupoPrincipal, styles.grupoEncabezadoSubgrupo],
    etapa: [styles.grupoPrincipal, styles.grupoEncabezadoEtapa],
  } as const
  const [claseGrupo, claseEncabezado] = clasesPorVariante[variante]
  const claseSangria = Icono
    ? null
    : variante === 'etapa'
      ? styles.grupoItemsEtapa
      : styles.grupoItemsSinIcono

  if (fijo) {
    return (
      <div className={claseGrupo}>
        <div className={[claseEncabezado, styles.grupoEncabezadoFijo].join(' ')}>
          <span className={styles.grupoEtiqueta}>{etiqueta}</span>
          {marca}
        </div>
        <div className={[styles.grupoItems, claseSangria].filter(Boolean).join(' ')}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={claseGrupo}>
      <button
        type="button"
        className={[claseEncabezado, contieneActivo ? styles.grupoEncabezadoActivo : null]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={alternar}
      >
        {/* Sin ícono, el chevron va delante: es lo único que dice que la
            etiqueta se pliega. Las etapas lo llevan al final, tras su estado. */}
        {Icono ? (
          <Icono />
        ) : variante === 'etapa' ? null : (
          <IconoChevron className={styles.grupoChevron} />
        )}
        <span className={styles.grupoEtiqueta}>{etiqueta}</span>
        {marca}
        {Icono || variante === 'etapa' ? <IconoChevron className={styles.grupoChevron} /> : null}
      </button>

      <div
        id={idPanel}
        className={[styles.grupoPanel, abierto ? styles.grupoPanelAbierto : null]
          .filter(Boolean)
          .join(' ')}
        inert={!abierto}
      >
        <div className={[styles.grupoItems, claseSangria].filter(Boolean).join(' ')}>
          {children}
        </div>
      </div>
    </div>
  )
}
