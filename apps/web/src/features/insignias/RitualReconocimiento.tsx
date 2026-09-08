import { useId, useState } from 'react'
import {
  CATALOGO_INSIGNIAS,
  FRASES_SUGERIDAS,
  type CategoriaInsignia,
  definicionCategoria,
  personasReconocibles,
} from '@plataforma/shared'
import { Button, Input, Select } from '../../components/ui'
import { IconoCategoria } from './IconoCategoria'
import styles from './RitualReconocimiento.module.css'

const FRASE_PROPIA = 'propia'

export interface IntegranteEquipo {
  readonly id: string
  readonly nombre: string
}

export interface ReconocimientoBorrador {
  readonly integranteId: string
  readonly categoria: CategoriaInsignia
  readonly frase: string
}

export interface RitualReconocimientoProps {
  /** Compañeros del propio equipo, sin incluir a quien reconoce: el ritual no
   * permite reconocerse a uno mismo ni cruzar equipos. */
  companeros: readonly IntegranteEquipo[]
  /** Cuándo se cierra la actividad y los reconocimientos dejan de ser
   * editables. Es obligatoria porque cambia lo que el botón promete: sin fecha,
   * "Guardar" no dice hasta cuándo se puede volver. */
  fechaLimite: Date
  onGuardar: (reconocimientos: readonly ReconocimientoBorrador[]) => void
  guardado?: boolean
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' })

function clave(r: ReconocimientoBorrador) {
  return `${r.integranteId}::${r.categoria}`
}

/**
 * El ritual de cierre: repartir los reconocimientos del presupuesto entre los
 * compañeros del propio equipo (concepto, sección 6).
 *
 * Lo que el presupuesto raciona es a cuánta gente se reconoce. A cada compañero
 * elegido se le pueden marcar varias insignias —hasta las seis— y cada una lleva
 * su propia frase: una frase compartida entre dos categorías distintas no
 * describiría ninguna de las dos.
 *
 * El presupuesto se deriva del número de compañeros y no se recibe por props,
 * por la misma razón que el nivel de una insignia se deriva de los puntos: dos
 * fuentes para un mismo hecho terminan contradiciéndose.
 */
export function RitualReconocimiento({
  companeros,
  fechaLimite,
  onGuardar,
  guardado = false,
}: RitualReconocimientoProps) {
  const [reconocimientos, setReconocimientos] = useState<ReconocimientoBorrador[]>([])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<CategoriaInsignia[]>([])
  const [elegidas, setElegidas] = useState<Partial<Record<CategoriaInsignia, string>>>({})
  const [propias, setPropias] = useState<Partial<Record<CategoriaInsignia, string>>>({})
  const idBase = useId()

  const presupuesto = personasReconocibles(companeros.length + 1)
  const reconocidos = new Set(reconocimientos.map((r) => r.integranteId))
  const restantes = presupuesto - reconocidos.size

  const yaOtorgada = (integranteId: string, cat: CategoriaInsignia) =>
    reconocimientos.some((r) => r.integranteId === integranteId && r.categoria === cat)

  const fraseDe = (cat: CategoriaInsignia) => {
    const elegida = elegidas[cat] ?? FRASES_SUGERIDAS[cat][0]
    return elegida === FRASE_PROPIA ? (propias[cat] ?? '').trim() : elegida
  }

  const completo = seleccion.length > 0 && seleccion.every((cat) => fraseDe(cat) !== '')

  function abrir(integranteId: string) {
    setAbierto(abierto === integranteId ? null : integranteId)
    setSeleccion([])
    setElegidas({})
    setPropias({})
  }

  function alternar(cat: CategoriaInsignia) {
    setSeleccion((previa) =>
      previa.includes(cat) ? previa.filter((c) => c !== cat) : [...previa, cat],
    )
  }

  function agregar(integranteId: string) {
    // En el orden del catálogo y no en el de marcado, para que la lista de una
    // persona se lea igual sin importar cómo se eligieron.
    const nuevos = CATALOGO_INSIGNIAS.filter((d) => seleccion.includes(d.id)).map((d) => ({
      integranteId,
      categoria: d.id,
      frase: fraseDe(d.id),
    }))
    setReconocimientos((previos) => [...previos, ...nuevos])
    setAbierto(null)
  }

  function quitar(r: ReconocimientoBorrador) {
    setReconocimientos((previos) => previos.filter((p) => clave(p) !== clave(r)))
  }

  const cierre = FORMATO_FECHA.format(fechaLimite)

  if (guardado) {
    return (
      <p className={styles.enviado} role="status">
        Guardado. Puedes volver a cambiarlos hasta el {cierre}; ese día la actividad cierra y tus
        compañeros reciben sus insignias, sin saber que vinieron de ti.
      </p>
    )
  }

  return (
    <div className={styles.ritual}>
      <p className={styles.presupuesto} aria-live="polite">
        {restantes > 0
          ? `Puedes reconocer a ${restantes} ${restantes === 1 ? 'compañero más' : 'compañeros más'}, de ${presupuesto}`
          : `Ya elegiste a tus ${presupuesto} ${presupuesto === 1 ? 'compañero' : 'compañeros'}`}
      </p>
      <p className={styles.nota}>
        No alcanza para todo el equipo, así que tendrás que elegir. A cada compañero que elijas
        puedes darle más de una insignia, si destacó en varias cosas.
      </p>
      <p className={styles.nota}>
        Es anónimo: quien reciba una insignia verá cuál es y por qué, pero no quién se la dio.
      </p>

      <ul className={styles.companeros}>
        {companeros.map((companero) => {
          const suyos = reconocimientos.filter((r) => r.integranteId === companero.id)
          const estaAbierto = abierto === companero.id
          const idPanel = `${idBase}-${companero.id}`

          return (
            <li key={companero.id} className={styles.companero}>
              <div className={styles.cabecera}>
                <span className={styles.nombre}>{companero.nombre}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => abrir(companero.id)}
                  disabled={restantes === 0 && !estaAbierto && !reconocidos.has(companero.id)}
                  aria-expanded={estaAbierto}
                  aria-controls={idPanel}
                >
                  {estaAbierto ? 'Cancelar' : 'Reconocer'}
                </Button>
              </div>

              {suyos.length > 0 ? (
                <ul className={styles.otorgados}>
                  {suyos.map((r) => (
                    <li key={clave(r)} className={styles.otorgado}>
                      <IconoCategoria categoria={r.categoria} className={styles.emblemaChico} />
                      <span className={styles.otorgadoTexto}>
                        <strong>{definicionCategoria(r.categoria).nombre}</strong>
                        <span className={styles.frase}>“{r.frase}”</span>
                      </span>
                      <Button variant="secondary" size="sm" type="button" onClick={() => quitar(r)}>
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {estaAbierto ? (
                <div className={styles.panel} id={idPanel}>
                  <fieldset className={styles.opciones}>
                    <legend className={styles.leyenda}>Qué reconoces — puedes marcar varias</legend>
                    {CATALOGO_INSIGNIAS.map((definicion) => {
                      const marcada = seleccion.includes(definicion.id)
                      // Lo único que bloquea una casilla es haberle dado ya esa
                      // insignia a esta persona: el presupuesto limita a cuánta
                      // gente reconoces, no cuánto le reconoces a cada quien.
                      const bloqueada = yaOtorgada(companero.id, definicion.id)

                      return (
                        <label
                          key={definicion.id}
                          className={[styles.opcion, bloqueada ? styles.opcionRepetida : null]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            disabled={bloqueada}
                            onChange={() => alternar(definicion.id)}
                          />
                          <IconoCategoria categoria={definicion.id} className={styles.emblema} />
                          <span className={styles.opcionNombre}>{definicion.nombre}</span>
                          <span className={styles.opcionQue}>{definicion.queReconoce}</span>
                        </label>
                      )
                    })}
                  </fieldset>

                  {CATALOGO_INSIGNIAS.filter((d) => seleccion.includes(d.id)).map((definicion) => {
                    const elegida = elegidas[definicion.id] ?? FRASES_SUGERIDAS[definicion.id][0]
                    return (
                      <div key={definicion.id} className={styles.frases}>
                        <Select
                          label={`Por qué — ${definicion.nombre}`}
                          value={elegida}
                          onChange={(evento) =>
                            setElegidas((previas) => ({
                              ...previas,
                              [definicion.id]: evento.target.value,
                            }))
                          }
                        >
                          {FRASES_SUGERIDAS[definicion.id].map((sugerencia) => (
                            <option key={sugerencia} value={sugerencia}>
                              {sugerencia}
                            </option>
                          ))}
                          <option value={FRASE_PROPIA}>Escribir la mía…</option>
                        </Select>

                        {elegida === FRASE_PROPIA ? (
                          <Input
                            label={`Tu frase — ${definicion.nombre}`}
                            value={propias[definicion.id] ?? ''}
                            maxLength={140}
                            onChange={(evento) =>
                              setPropias((previas) => ({
                                ...previas,
                                [definicion.id]: evento.target.value,
                              }))
                            }
                          />
                        ) : null}
                      </div>
                    )
                  })}

                  <Button type="button" onClick={() => agregar(companero.id)} disabled={!completo}>
                    {seleccion.length > 1
                      ? `Reconocer a ${companero.nombre} con ${seleccion.length} insignias`
                      : `Reconocer a ${companero.nombre}`}
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className={styles.cierre}>
        <Button
          type="button"
          onClick={() => onGuardar(reconocimientos)}
          disabled={reconocimientos.length === 0}
        >
          Guardar reconocimientos
        </Button>
        <p className={styles.nota}>
          Se aplican el {cierre}, cuando la actividad cierre. Hasta entonces puedes volver y
          cambiarlos.
        </p>
      </div>
    </div>
  )
}
