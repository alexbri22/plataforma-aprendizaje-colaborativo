import type { JSX, SVGProps } from 'react'
import type { CategoriaInsignia } from '@plataforma/shared'

/*
 * Medallones de las seis categorías. Son dibujo, no cromo de interfaz: se pintan
 * en `currentColor`, de modo que quien los coloca decide el color desde CSS y no
 * hay valores de color propios que mantener sincronizados con los tokens.
 *
 * Los blancos internos (las bandas del faro) son un realce del propio dibujo
 * sobre su relleno, no un color de superficie: no salen del sistema de tokens
 * porque no compiten con él, igual que no lo hacen los marcos PNG.
 */

/** Anillo común a los seis medallones. Mantenerlo aquí y no en cada dibujo es lo
 * que garantiza que las seis insignias se lean como una familia. */
function Anillo() {
  return (
    <>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2"
        opacity="0.6"
      />
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  )
}

function DibujoLiderazgo() {
  // Faro: dar dirección y que el equipo sepa hacia dónde va.
  return (
    <g fill="currentColor">
      <path d="M 28 74 L 72 74 C 73.5 74, 74 75, 73 76 C 72 77, 28 77, 27 76 C 26 75, 26.5 74, 28 74 Z" />
      <path d="M 32 70 L 68 70 L 70 74 L 30 74 Z" />
      <path d="M 35 70 L 39 42 L 61 42 L 65 70 Z" />
      <path d="M 38 60 L 62 60 L 63 65 L 37 65 Z" fill="#fff" opacity="0.3" />
      <path d="M 40 48 L 60 48 L 61 53 L 39 53 Z" fill="#fff" opacity="0.3" />
      <rect x="36" y="39" width="28" height="3" rx="1" />
      <rect x="41" y="29" width="18" height="10" />
      <path d="M 50 23 L 44 29 L 56 29 Z" />
      <path d="M 42 23 C 42 18, 58 18, 58 23 Z" />
      <path
        d="M 25 28 L 36 32 M 22 37 L 35 37 M 75 28 L 64 32 M 78 37 L 65 37"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  )
}

function DibujoCompanerismo() {
  // Apretón de manos: ayudar sin que sea obligación.
  return (
    <g fill="currentColor">
      <path d="M 22 52 L 32 42 C 34 40, 37 40, 39 42 L 44 47 L 40 51 L 36 47 L 24 59 Z" />
      <path d="M 78 52 L 68 42 C 66 40, 63 40, 61 42 L 56 47 L 60 51 L 64 47 L 76 59 Z" />
      <path d="M 41 45 C 43 43, 46 43, 48 45 L 53 50 C 55 52, 55 55, 53 57 C 51 59, 48 59, 46 57 L 41 52 C 39 50, 39 47, 41 45 Z" />
      <path
        d="M 45 49 C 47 47, 50 47, 52 49 L 57 54 C 59 56, 59 59, 57 61 C 55 63, 52 63, 50 61 L 45 56 C 43 54, 43 51, 45 49 Z"
        opacity="0.9"
      />
      <path d="M 20 48 L 25 43 L 28 46 L 23 51 Z" />
      <path d="M 80 48 L 75 43 L 72 46 L 77 51 Z" />
    </g>
  )
}

function DibujoComunicacion() {
  // Megáfono: explicar, escuchar, mantener informado al equipo.
  return (
    <g fill="currentColor">
      <path d="M 30 42 L 42 36 L 58 26 C 60 25, 63 26, 63 29 L 63 71 C 63 74, 60 75, 58 74 L 42 64 L 30 58 C 28 58, 27 56, 27 54 L 27 46 C 27 44, 28 42, 30 42 Z" />
      <path d="M 35 57 L 39 71 C 40 73, 42 74, 44 73 L 47 72 C 49 71, 49 68, 48 66 L 43 55 Z" />
      <ellipse cx="63" cy="50" rx="3.5" ry="22" />
      <path
        d="M 71 38 C 76 43, 76 57, 71 62"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 78 32 C 85 40, 85 60, 78 68"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </g>
  )
}

function DibujoCompromiso() {
  // Tabla con lo acordado y una marca de cumplido: la parte propia, lista y a
  // tiempo. Se dibuja en el mismo registro que los otros cinco medallones.
  return (
    <g fill="currentColor">
      <path d="M 32 26 L 68 26 C 70 26, 71 27, 71 29 L 71 77 C 71 79, 70 80, 68 80 L 32 80 C 30 80, 29 79, 29 77 L 29 29 C 29 27, 30 26, 32 26 Z" />
      <path d="M 34 31 L 66 31 L 66 75 L 34 75 Z" fill="#fff" opacity="0.28" />
      <path d="M 42 20 L 58 20 C 60 20, 61 21, 61 23 L 61 30 C 61 32, 60 33, 58 33 L 42 33 C 40 33, 39 32, 39 30 L 39 23 C 39 21, 40 20, 42 20 Z" />
      <circle cx="50" cy="26.5" r="3" fill="#fff" opacity="0.45" />
      <path
        d="M 39 44 L 47 52 L 62 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="39" y="60" width="22" height="3.5" rx="1.75" />
      <rect x="39" y="67" width="15" height="3.5" rx="1.75" />
    </g>
  )
}

function DibujoIdeas() {
  // Foco dentro de un engrane: proponer el camino cuando el equipo se atora.
  return (
    <g fill="currentColor">
      <path
        d="M 50 20 C 33.4 20 20 33.4 20 50 C 20 66.6 33.4 80 50 80 C 66.6 80 80 66.6 80 50 C 80 33.4 66.6 20 50 20 Z M 50 74 C 36.7 74 26 63.3 26 50 C 26 36.7 36.7 26 50 26 C 63.3 26 74 36.7 74 50 C 74 63.3 63.3 74 50 74 Z"
        opacity="0.3"
      />
      <path
        d="M 47 17 L 53 17 L 53 23 L 47 23 Z M 47 77 L 53 77 L 53 83 L 47 83 Z M 17 47 L 17 53 L 23 53 L 23 47 Z M 77 47 L 77 53 L 83 53 L 83 47 Z M 27 27 L 32 23 L 36 27 L 31 31 Z M 69 69 L 73 65 L 77 69 L 73 73 Z M 27 73 L 31 69 L 36 73 L 32 77 Z M 69 31 L 73 27 L 77 31 L 73 35 Z"
        opacity="0.4"
      />
      <path d="M 50 28 C 41.2 28 34 35.2 34 44 C 34 49.8 37.1 54.9 41.8 57.6 L 41.8 64 C 41.8 65.1 42.7 66 43.8 66 L 56.2 66 C 57.3 66 58.2 65.1 58.2 64 L 58.2 57.6 C 62.9 54.9 66 49.8 66 44 C 66 35.2 58.8 28 50 28 Z M 54 62 L 46 62 L 46 59 L 54 59 L 54 62 Z M 55 56 L 45 56 C 42.2 53.8 40 50.1 40 44 C 40 38.5 44.5 34 50 34 C 55.5 34 60 38.5 60 44 C 60 50.1 57.8 53.8 55 56 Z" />
      <path d="M 44 68 L 56 68 L 54 72 L 46 72 Z" />
      <path
        d="M 47 45 C 47 42, 53 42, 53 45 L 50 39 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </g>
  )
}

function DibujoBuenJuicio() {
  // Balanza: dar retroalimentación útil y saber recibirla.
  return (
    <g fill="currentColor">
      <rect x="48.5" y="26" width="3" height="46" rx="1.5" />
      <path d="M 38 72 L 62 72 L 65 76 L 35 76 Z" />
      <circle cx="50" cy="25" r="4" />
      <path d="M 24 33 C 35 30, 65 30, 76 33 L 76 36 L 24 36 Z" />
      <path d="M 25 36 L 17 56 M 25 36 L 33 56" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 14 56 C 14 63, 36 63, 36 56 Z" />
      <path d="M 75 36 L 67 56 M 75 36 L 83 56" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 64 56 C 64 63, 86 63, 86 56 Z" />
    </g>
  )
}

const DIBUJOS: Record<CategoriaInsignia, () => JSX.Element> = {
  liderazgo: DibujoLiderazgo,
  companerismo: DibujoCompanerismo,
  comunicacion: DibujoComunicacion,
  compromiso: DibujoCompromiso,
  ideas: DibujoIdeas,
  'buen-juicio': DibujoBuenJuicio,
}

export interface IconoCategoriaProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> {
  categoria: CategoriaInsignia
}

/**
 * Medallón de una categoría, sin marco de rango. Es decorativo por omisión: el
 * nombre accesible lo aporta quien lo coloca (ver `InsigniaCategoria`), porque
 * el ícono solo no dice qué nivel se alcanzó.
 */
export function IconoCategoria({ categoria, ...props }: IconoCategoriaProps) {
  const Dibujo = DIBUJOS[categoria]

  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false" {...props}>
      <Anillo />
      <Dibujo />
    </svg>
  )
}
