import {
  type CategoriaInsignia,
  definicionCategoria,
  definicionNivel,
  progresoDeNivel,
} from '@plataforma/shared'
import type { ReconocimientoEnPerfil } from './insignias.api'
import styles from './DetalleInsignia.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function puntosTexto(puntos: number): string {
  return `${puntos} ${puntos === 1 ? 'pt' : 'pts'}`
}

export interface DetalleInsigniaProps {
  categoria: CategoriaInsignia
  puntos: number
  /** Todo lo recibido; aquí se filtra por la categoría. */
  recibidos: readonly ReconocimientoEnPerfil[]
}

/**
 * Lo que se abre al elegir una insignia en el perfil propio (concepto §6, "El
 * perfil"): el nivel, cuánto falta para el siguiente y las frases recibidas
 * con la actividad de la que salieron. La comparación es siempre contra uno
 * mismo: aquí no aparece nadie más.
 */
export function DetalleInsignia({ categoria, puntos, recibidos }: DetalleInsigniaProps) {
  const definicion = definicionCategoria(categoria)
  const progreso = progresoDeNivel(puntos)
  const nombreNivel = progreso.nivel ? definicionNivel(progreso.nivel).nombre : 'Sin nivel'
  const frases = recibidos.filter((r) => r.categoria === categoria)

  const siguiente = progreso.siguiente
    ? `Faltan ${puntosTexto(progreso.puntosRestantes)} para ${progreso.siguiente.nombre}`
    : 'Nivel máximo alcanzado'

  return (
    <section className={styles.detalle} aria-labelledby={`detalle-${categoria}`}>
      <header className={styles.cabecera}>
        <div>
          <h3 id={`detalle-${categoria}`} className={styles.titulo}>
            {definicion.nombre}
          </h3>
          <p className={styles.queReconoce}>{definicion.queReconoce}</p>
        </div>
        <p className={styles.nivel}>
          <span className={styles.nivelNombre}>{nombreNivel}</span>
          <span className={styles.nivelPuntos}>{puntosTexto(puntos)}</span>
        </p>
      </header>

      <div className={styles.progreso}>
        <div
          className={styles.barra}
          role="progressbar"
          aria-label={`Avance hacia ${progreso.siguiente?.nombre ?? 'el nivel máximo'}`}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={progreso.fraccion}
          aria-valuetext={siguiente}
        >
          <span className={styles.relleno} style={{ width: `${progreso.fraccion * 100}%` }} />
        </div>
        <p className={styles.siguiente}>{siguiente}</p>
      </div>

      <h4 className={styles.subtitulo}>Lo que te dijeron</h4>
      {frases.length === 0 ? (
        <p className={styles.vacio}>
          Todavía no has recibido esta insignia. Se gana cuando tus compañeros o quien organiza
          reconocen en ti lo que describe.
        </p>
      ) : (
        <ul className={styles.frases}>
          {frases.map((r, i) => (
            <li key={i} className={styles.frase}>
              <p className={styles.texto}>“{r.frase}”</p>
              <p className={styles.origen}>
                {r.actividad.nombre} · {FORMATO_FECHA.format(new Date(r.fecha))}
                {r.fuente === 'organizador' ? ' · de quien organizó' : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
