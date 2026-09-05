import { useId, useState } from 'react'
import {
  CATALOGO_INSIGNIAS,
  FRASES_SUGERIDAS,
  type CategoriaInsignia,
  definicionCategoria,
  reconocimientosDisponibles,
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
  onEnviar: (reconocimientos: readonly ReconocimientoBorrador[]) => void
  enviado?: boolean
}

function clave(r: ReconocimientoBorrador) {
  return `${r.integranteId}::${r.categoria}`
}

/**
 * El ritual de cierre: repartir los reconocimientos del presupuesto entre los
 * compañeros del propio equipo (concepto, sección 6).
 *
 * El presupuesto se deriva del número de compañeros y no se recibe por props,
 * por la misma razón que el nivel de una insignia se deriva de los puntos: dos
 * fuentes para un mismo hecho terminan contradiciéndose.
 */
export function RitualReconocimiento({
  companeros,
  onEnviar,
  enviado = false,
}: RitualReconocimientoProps) {
  const [reconocimientos, setReconocimientos] = useState<ReconocimientoBorrador[]>([])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [categoria, setCategoria] = useState<CategoriaInsignia>(CATALOGO_INSIGNIAS[0].id)
  const [fraseElegida, setFraseElegida] = useState<string>(
    FRASES_SUGERIDAS[CATALOGO_INSIGNIAS[0].id][0],
  )
  const [frasePropia, setFrasePropia] = useState('')
  const idBase = useId()

  const presupuesto = reconocimientosDisponibles(companeros.length + 1)
  const restantes = presupuesto - reconocimientos.length

  const frase = fraseElegida === FRASE_PROPIA ? frasePropia.trim() : fraseElegida
  const yaOtorgada = (integranteId: string, cat: CategoriaInsignia) =>
    reconocimientos.some((r) => r.integranteId === integranteId && r.categoria === cat)

  function abrir(integranteId: string) {
    const siguiente = abierto === integranteId ? null : integranteId
    setAbierto(siguiente)
    if (siguiente) elegirCategoria(CATALOGO_INSIGNIAS[0].id)
  }

  function elegirCategoria(cat: CategoriaInsignia) {
    setCategoria(cat)
    // La frase acompaña a la insignia: al cambiar de categoría, la sugerencia
    // anterior deja de describir lo que se está reconociendo.
    setFraseElegida(FRASES_SUGERIDAS[cat][0])
    setFrasePropia('')
  }

  function agregar(integranteId: string) {
    setReconocimientos((previos) => [...previos, { integranteId, categoria, frase }])
    setAbierto(null)
  }

  function quitar(r: ReconocimientoBorrador) {
    setReconocimientos((previos) => previos.filter((p) => clave(p) !== clave(r)))
  }

  if (enviado) {
    return (
      <p className={styles.enviado} role="status">
        Listo. Tus reconocimientos quedaron registrados y tus compañeros los verán sin saber que
        vinieron de ti.
      </p>
    )
  }

  return (
    <div className={styles.ritual}>
      <p className={styles.presupuesto} aria-live="polite">
        {restantes > 0
          ? `Te quedan ${restantes} de ${presupuesto} reconocimientos`
          : `Repartiste los ${presupuesto} reconocimientos`}
      </p>
      <p className={styles.nota}>
        Nunca alcanzan para todo el equipo: hay que elegir. Quien lo reciba verá la insignia y la
        frase, no quién se la dio.
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
                  disabled={restantes === 0 && !estaAbierto}
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
                    <legend className={styles.leyenda}>Qué reconoces</legend>
                    {CATALOGO_INSIGNIAS.map((definicion) => {
                      const repetida = yaOtorgada(companero.id, definicion.id)
                      return (
                        <label
                          key={definicion.id}
                          className={[styles.opcion, repetida ? styles.opcionRepetida : null]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <input
                            type="radio"
                            name={`${idPanel}-categoria`}
                            value={definicion.id}
                            checked={categoria === definicion.id}
                            disabled={repetida}
                            onChange={() => elegirCategoria(definicion.id)}
                          />
                          <IconoCategoria categoria={definicion.id} className={styles.emblema} />
                          <span className={styles.opcionNombre}>{definicion.nombre}</span>
                          <span className={styles.opcionQue}>{definicion.queReconoce}</span>
                        </label>
                      )
                    })}
                  </fieldset>

                  <Select
                    label="Por qué"
                    value={fraseElegida}
                    onChange={(evento) => setFraseElegida(evento.target.value)}
                  >
                    {FRASES_SUGERIDAS[categoria].map((sugerencia) => (
                      <option key={sugerencia} value={sugerencia}>
                        {sugerencia}
                      </option>
                    ))}
                    <option value={FRASE_PROPIA}>Escribir la mía…</option>
                  </Select>

                  {fraseElegida === FRASE_PROPIA ? (
                    <Input
                      label="Tu frase"
                      value={frasePropia}
                      maxLength={140}
                      onChange={(evento) => setFrasePropia(evento.target.value)}
                    />
                  ) : null}

                  <Button type="button" onClick={() => agregar(companero.id)} disabled={!frase}>
                    Reconocer a {companero.nombre}
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
          onClick={() => onEnviar(reconocimientos)}
          disabled={restantes === presupuesto}
        >
          Enviar reconocimientos
        </Button>
        {restantes > 0 && restantes < presupuesto ? (
          <p className={styles.nota}>
            Puedes enviar con {restantes} sin repartir, pero no podrás volver a entrar.
          </p>
        ) : null}
      </div>
    </div>
  )
}
