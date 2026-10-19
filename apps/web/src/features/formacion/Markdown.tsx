import { Fragment, type ReactNode } from 'react'
import { esUrlSegura } from '@plataforma/shared'
import { analizarBloques } from './analizarMarkdown'
import styles from './Markdown.module.css'

/*
 * Subconjunto de markdown para el contenido formativo: encabezados, párrafos,
 * listas, citas, tablas simples, negritas, cursivas, código en línea y
 * enlaces. Se construyen elementos de React y nunca HTML crudo, así que el
 * texto que escribe el administrador no puede inyectar marcado ni scripts;
 * los enlaces solo se activan si son https (§10.3 de
 * docs/diseno-desarrollo-formacion.md).
 *
 * Los encabezados bajan un nivel (## → h2 queda debajo del h1 de la página):
 * el contenido nunca compite con el título del recurso.
 */

// Orden de prueba de los patrones en línea: el primero que aparece antes en
// el texto gana; en empate, el de la lista.
const PATRONES_EN_LINEA: { re: RegExp; construir: (m: RegExpExecArray, k: string) => ReactNode }[] =
  [
    { re: /`([^`]+)`/, construir: (m, k) => <code key={k}>{m[1]}</code> },
    {
      re: /\[([^\]]+)\]\(([^)\s]+)\)/,
      construir: (m, k) =>
        esUrlSegura(m[2]) ? (
          <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">
            {enLinea(m[1], k)}
          </a>
        ) : (
          <Fragment key={k}>{enLinea(m[1], k)}</Fragment>
        ),
    },
    { re: /\*\*(.+?)\*\*/, construir: (m, k) => <strong key={k}>{enLinea(m[1], k)}</strong> },
    {
      re: /(?<![*\w])\*([^*\s][^*]*?)\*(?!\*)/,
      construir: (m, k) => <em key={k}>{enLinea(m[1], k)}</em>,
    },
  ]

function enLinea(texto: string, prefijo = 'l'): ReactNode[] {
  const nodos: ReactNode[] = []
  let resto = texto
  let n = 0

  while (resto) {
    let mejor: { m: RegExpExecArray; p: (typeof PATRONES_EN_LINEA)[number] } | null = null
    for (const p of PATRONES_EN_LINEA) {
      const m = p.re.exec(resto)
      if (m && (!mejor || m.index < mejor.m.index)) mejor = { m, p }
    }
    if (!mejor) {
      nodos.push(resto)
      break
    }
    if (mejor.m.index > 0) nodos.push(resto.slice(0, mejor.m.index))
    nodos.push(mejor.p.construir(mejor.m, `${prefijo}-${n++}`))
    resto = resto.slice(mejor.m.index + mejor.m[0].length)
  }

  return nodos
}

export interface MarkdownProps {
  fuente: string
  className?: string
}

export function Markdown({ fuente, className }: MarkdownProps) {
  const bloques = analizarBloques(fuente)

  return (
    <div className={[styles.markdown, className].filter(Boolean).join(' ')}>
      {bloques.map((b, i) => {
        const k = `b${i}`
        switch (b.tipo) {
          case 'encabezado': {
            const Etiqueta = `h${b.nivel}` as const
            return <Etiqueta key={k}>{enLinea(b.texto, k)}</Etiqueta>
          }
          case 'parrafo':
            return <p key={k}>{enLinea(b.texto, k)}</p>
          case 'cita':
            return <blockquote key={k}>{enLinea(b.texto, k)}</blockquote>
          case 'lista': {
            const Etiqueta = b.ordenada ? 'ol' : 'ul'
            return (
              <Etiqueta key={k}>
                {b.elementos.map((e, j) => (
                  <li key={j}>{enLinea(e, `${k}-${j}`)}</li>
                ))}
              </Etiqueta>
            )
          }
          case 'tabla':
            return (
              <div key={k} className={styles.tablaContenedor}>
                <table>
                  <thead>
                    <tr>
                      {b.encabezados.map((c, j) => (
                        <th key={j} scope="col">
                          {enLinea(c, `${k}-h${j}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.filas.map((fila, j) => (
                      <tr key={j}>
                        {fila.map((c, x) => (
                          <td key={x}>{enLinea(c, `${k}-${j}-${x}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </div>
  )
}
