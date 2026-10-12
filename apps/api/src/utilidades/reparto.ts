// Reparto equilibrado de participantes sin equipo (docs/diseno-desarrollo-nucleo.md
// §8.3) y su uso para la propuesta del sistema (§8.2). Funciones puras: no
// leen la base de datos ni el reloj, de modo que el resultado depende solo de
// los argumentos y la prueba es reproducible.

export interface EquipoParaReparto {
  id: string
  /** Integrantes que ya tiene: el reparto no los mueve, solo los cuenta. */
  integrantes: number
}

export interface AsignacionReparto {
  idMembresia: string
  idEquipo: string
}

// §8.3, pasos 2 y 3: para cada persona, en el orden dado, se elige el equipo
// con menos integrantes en ese momento (empates: el primero de la lista, que
// quien llama entrega en orden de creación) y se actualiza el conteo antes de
// pasar a la siguiente.
//
// Minimiza el equipo mayor: asignar siempre al más chico nunca sube el
// máximo por encima de lo que cualquier otro reparto tendría que subirlo, y
// no reequilibra a quienes ya tenían equipo. Es determinista: sin azar.
export function repartirEquilibrado(
  equipos: readonly EquipoParaReparto[],
  sinEquipo: readonly string[],
): AsignacionReparto[] {
  if (sinEquipo.length === 0) return []
  if (equipos.length === 0) {
    throw new Error('No hay equipos entre los cuales repartir.')
  }

  const conteos = equipos.map((equipo) => equipo.integrantes)
  return sinEquipo.map((idMembresia) => {
    let elegido = 0
    for (let i = 1; i < conteos.length; i += 1) {
      if (conteos[i] < conteos[elegido]) elegido = i
    }
    conteos[elegido] += 1
    return { idMembresia, idEquipo: equipos[elegido].id }
  })
}

export interface RepartoConMaximo {
  asignaciones: AsignacionReparto[]
  /** Equipos que hubo que crear porque los existentes ya estaban llenos, en
   * orden. Sus identificadores son provisionales: `nuevo-1`, `nuevo-2`… */
  equiposNuevos: string[]
}

// Igual que repartirEquilibrado, respetando un máximo de integrantes por
// equipo (P-27). Cuando el equipo más chico ya tiene el máximo, todos están
// llenos: se crea un equipo nuevo y se le asigna a la persona. Solo se crean
// equipos cuando no cabe nadie más, así que son los mínimos necesarios. Un
// equipo que ya excedía el máximo cuenta como lleno y no se toca. Con
// `maximo` nulo es exactamente repartirEquilibrado.
export function repartirConMaximo(
  equipos: readonly EquipoParaReparto[],
  sinEquipo: readonly string[],
  maximo: number | null,
): RepartoConMaximo {
  if (maximo === null)
    return { asignaciones: repartirEquilibrado(equipos, sinEquipo), equiposNuevos: [] }

  const lista = equipos.map((equipo) => ({ ...equipo }))
  const equiposNuevos: string[] = []
  const asignaciones = sinEquipo.map((idMembresia) => {
    let elegido = 0
    for (let i = 1; i < lista.length; i += 1) {
      if (lista[i].integrantes < lista[elegido].integrantes) elegido = i
    }
    if (lista.length === 0 || lista[elegido].integrantes >= maximo) {
      const id = `nuevo-${equiposNuevos.length + 1}`
      equiposNuevos.push(id)
      lista.push({ id, integrantes: 0 })
      elegido = lista.length - 1
    }
    lista[elegido].integrantes += 1
    return { idMembresia, idEquipo: lista[elegido].id }
  })
  return { asignaciones, equiposNuevos }
}

// PRNG de 32 bits (mulberry32): pequeño, sin dependencias y estable entre
// versiones de Node, que es lo que necesita una semilla guardada en el
// historial para poder reproducir la propuesta.
function generadorConSemilla(semilla: number): () => number {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates sobre una copia: no modifica la lista recibida.
export function barajarConSemilla<T>(elementos: readonly T[], semilla: number): T[] {
  const aleatorio = generadorConSemilla(semilla)
  const copia = [...elementos]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// La propuesta no crea equipos que no tendrían a nadie: con menos personas
// que equipos esperados, propone tantos equipos como personas. Y si hay un
// máximo de integrantes, crea los que hagan falta para que todos quepan.
export function numeroEquiposDePropuesta(
  esperado: number,
  participantes: number,
  maximo: number | null = null,
): number {
  if (participantes <= 0) return 0
  const base = Math.min(esperado, participantes)
  return maximo === null ? base : Math.max(base, Math.ceil(participantes / maximo))
}

// §8.2: reparte a todos los participantes entre `numeroEquipos` equipos
// vacíos, con el orden barajado por la semilla y después el mismo reparto
// equilibrado de §8.3. Devuelve, por posición de equipo (0-based), los
// identificadores de membresía que le tocaron, en el orden en que se
// asignaron.
export function proponerEquipos(
  idsMembresia: readonly string[],
  numeroEquipos: number,
  semilla: number,
): string[][] {
  const equipos: EquipoParaReparto[] = Array.from({ length: numeroEquipos }, (_, i) => ({
    id: String(i),
    integrantes: 0,
  }))
  const resultado: string[][] = equipos.map(() => [])
  const asignaciones = repartirEquilibrado(equipos, barajarConSemilla(idsMembresia, semilla))
  for (const { idMembresia, idEquipo } of asignaciones)
    resultado[Number(idEquipo)].push(idMembresia)
  return resultado
}
