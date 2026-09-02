/*
 * Sistema de recompensas: catálogo de insignias, escala de niveles y las reglas
 * puras que se derivan de ambos. Vive en shared porque tanto la API (que valida
 * el otorgamiento) como la web (que pinta el rango en el perfil) necesitan las
 * mismas constantes; duplicarlas es la vía más corta a que un umbral cambie en
 * un lado y no en el otro.
 *
 * Fuente: docs/concepto-producto.md, sección 6.
 */

/** Las seis categorías del catálogo. Es una lista fija: un organizador no puede
 * crear categorías propias, para que el acumulado sea comparable entre
 * actividades distintas. */
export const CATEGORIAS_INSIGNIA = [
  'liderazgo',
  'companerismo',
  'comunicacion',
  'compromiso',
  'ideas',
  'buen-juicio',
] as const

export type CategoriaInsignia = (typeof CATEGORIAS_INSIGNIA)[number]

export interface DefinicionCategoria {
  readonly id: CategoriaInsignia
  readonly nombre: string
  /** Qué conducta reconoce la categoría. */
  readonly queReconoce: string
  /** Cómo se ve esa conducta desde fuera. El criterio de las seis categorías es
   * que un compañero pueda atestiguarlas, no inferirlas. */
  readonly comoSeAtestigua: string
}

export const CATALOGO_INSIGNIAS: readonly DefinicionCategoria[] = [
  {
    id: 'liderazgo',
    nombre: 'Liderazgo',
    queReconoce: 'Organizar, dar dirección, destrabar al equipo',
    comoSeAtestigua: 'Cuando nadie sabía qué seguía, lo aclaró',
  },
  {
    id: 'companerismo',
    nombre: 'Compañerismo',
    queReconoce: 'Ayudar a otros sin que sea su obligación',
    comoSeAtestigua: 'Me ayudó cuando estaba atorado',
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación',
    queReconoce: 'Explicar bien, escuchar, mantener informado al equipo',
    comoSeAtestigua: 'Siempre supimos en qué iba',
  },
  {
    id: 'compromiso',
    nombre: 'Compromiso',
    queReconoce: 'Cumplir lo acordado y a tiempo, ser constante',
    comoSeAtestigua: 'Su parte siempre estuvo lista',
  },
  {
    id: 'ideas',
    nombre: 'Ideas',
    queReconoce: 'Proponer soluciones ante problemas',
    comoSeAtestigua: 'Cuando nos atoramos, propuso el camino',
  },
  {
    id: 'buen-juicio',
    nombre: 'Buen juicio',
    queReconoce: 'Dar retroalimentación útil y saber recibirla',
    comoSeAtestigua: 'Sus comentarios mejoraron el trabajo',
  },
]

/** Niveles en orden ascendente. La escala es única y se aplica por igual a las
 * seis categorías, que progresan por separado. */
export const NIVELES_INSIGNIA = ['bronce', 'plata', 'oro', 'platino', 'diamante'] as const

export type NivelInsignia = (typeof NIVELES_INSIGNIA)[number]

export interface DefinicionNivel {
  readonly id: NivelInsignia
  readonly nombre: string
  /** Puntos acumulados a partir de los cuales se alcanza el nivel. */
  readonly puntosMinimos: number
  readonly significado: string
}

export const NIVELES: readonly DefinicionNivel[] = [
  {
    id: 'bronce',
    nombre: 'Bronce',
    puntosMinimos: 3,
    significado: 'Alcanzable en 2-3 actividades',
  },
  {
    id: 'plata',
    nombre: 'Plata',
    puntosMinimos: 8,
    significado: 'Constancia durante el semestre',
  },
  {
    id: 'oro',
    nombre: 'Oro',
    puntosMinimos: 18,
    significado: 'Reconocimiento sostenido',
  },
  {
    id: 'platino',
    nombre: 'Platino',
    puntosMinimos: 35,
    significado: 'Trayectoria de varios cursos',
  },
  {
    id: 'diamante',
    nombre: 'Diamante',
    puntosMinimos: 60,
    significado: 'Distinción máxima, de largo plazo',
  },
]

/** De dónde proviene un otorgamiento. El origen determina cuánto vale: el del
 * organizador pesa doble para que el acumulado no sea un concurso de
 * popularidad entre pares. */
export const FUENTES_OTORGAMIENTO = ['par', 'organizador', 'sistema'] as const

export type FuenteOtorgamiento = (typeof FUENTES_OTORGAMIENTO)[number]

/** Puntos de un otorgamiento según su origen. `sistema` no aparece aquí porque
 * las señales automáticas aportan fracciones variables y cada otorgamiento
 * carga su propio valor. */
export const PUNTOS_POR_FUENTE: Readonly<Record<'par' | 'organizador', number>> = {
  par: 1,
  organizador: 2,
}

/** Acumulado de un usuario en una categoría. `nivel` es null mientras no se
 * alcanza el primer umbral: no existen niveles negativos ni puntos que se
 * pierdan, solo un rango todavía sin abrir. */
export interface RangoCategoria {
  readonly categoria: CategoriaInsignia
  readonly puntos: number
  readonly nivel: NivelInsignia | null
}

export interface ProgresoNivel {
  readonly nivel: NivelInsignia | null
  readonly siguiente: DefinicionNivel | null
  /** Puntos que faltan para el siguiente nivel; 0 en el nivel máximo. */
  readonly puntosRestantes: number
  /** Avance dentro del tramo actual, de 0 a 1. Vale 1 en el nivel máximo. */
  readonly fraccion: number
}

export function definicionCategoria(categoria: CategoriaInsignia): DefinicionCategoria {
  const definicion = CATALOGO_INSIGNIAS.find((c) => c.id === categoria)
  if (!definicion) throw new Error(`Categoría de insignia desconocida: ${categoria}`)
  return definicion
}

export function definicionNivel(nivel: NivelInsignia): DefinicionNivel {
  const definicion = NIVELES.find((n) => n.id === nivel)
  if (!definicion) throw new Error(`Nivel de insignia desconocido: ${nivel}`)
  return definicion
}

/** Nivel que corresponde a un acumulado, o null si aún no llega al primer
 * umbral. Los puntos nunca bajan, de modo que el nivel tampoco. */
export function nivelParaPuntos(puntos: number): NivelInsignia | null {
  let alcanzado: NivelInsignia | null = null
  for (const nivel of NIVELES) {
    if (puntos >= nivel.puntosMinimos) alcanzado = nivel.id
  }
  return alcanzado
}

/** Progreso dentro de la escala, para la vista de "avance contra uno mismo" del
 * perfil. La comparación es siempre contra el propio historial, nunca contra
 * otros usuarios. */
export function progresoDeNivel(puntos: number): ProgresoNivel {
  const nivel = nivelParaPuntos(puntos)
  const siguiente = NIVELES.find((n) => puntos < n.puntosMinimos) ?? null

  if (!siguiente) return { nivel, siguiente: null, puntosRestantes: 0, fraccion: 1 }

  const piso = nivel ? definicionNivel(nivel).puntosMinimos : 0
  const tramo = siguiente.puntosMinimos - piso

  return {
    nivel,
    siguiente,
    puntosRestantes: siguiente.puntosMinimos - puntos,
    fraccion: tramo > 0 ? Math.min(1, Math.max(0, (puntos - piso) / tramo)) : 0,
  }
}

/** Proporción del equipo que cada participante puede reconocer en el ritual de
 * cierre, con su piso y su techo. */
export const PROPORCION_RECONOCIMIENTOS = 0.33
export const MINIMO_RECONOCIMIENTOS = 1
export const MAXIMO_RECONOCIMIENTOS = 5

/**
 * Cuántos reconocimientos puede repartir un integrante en un equipo de
 * `tamanoEquipo` personas. Se calcula sobre el equipo sin contarse a sí mismo y
 * se redondea hacia arriba, con piso 1 y techo 5.
 *
 * El límite es deliberado: siempre hay que elegir, nunca alcanza para todos. Un
 * reconocimiento que se le puede dar a todo el equipo no distingue nada, y sin
 * escasez el acumulado deja de ser una señal.
 */
export function reconocimientosDisponibles(tamanoEquipo: number): number {
  const companeros = Math.max(0, Math.trunc(tamanoEquipo) - 1)
  if (companeros === 0) return 0

  const proporcional = Math.ceil(companeros * PROPORCION_RECONOCIMIENTOS)
  const acotado = Math.min(MAXIMO_RECONOCIMIENTOS, Math.max(MINIMO_RECONOCIMIENTOS, proporcional))

  // Nunca se puede reconocer a más gente de la que hay.
  return Math.min(acotado, companeros)
}
