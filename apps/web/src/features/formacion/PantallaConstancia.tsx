import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ETIQUETAS_ELEMENTO } from '@plataforma/shared'
import { AvisoError, Button, IconoCargando } from '../../components/ui'
import { ErrorFormacion, type ConstanciaVerificada } from './formacion.api'
import { formatoDuracion, formatoFecha } from './formato'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { useConstanciaVerificada } from './useConstancias'
import styles from './PantallaConstancia.module.css'

/*
 * Página pública de una constancia (nota del incremento 5): cualquiera con el
 * enlace la abre, con o sin sesión, y comprueba que la emitió Co3. Se imprime
 * o se guarda como PDF desde el navegador: no hay PDF del servidor.
 *
 * Es un documento sobrio, no un diploma: Confirmed Green para el sello, nunca
 * Apothecary Amber, y una leyenda que dice lo que hace constar y lo que no.
 */
export function PantallaConstancia() {
  return (
    <MarcoFormacion titulo="Constancia">
      <Verificacion />
    </MarcoFormacion>
  )
}

/** La persona decide con quién comparte el enlace: la página no se indexa. */
function useNoIndexar() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

function Verificacion() {
  const { folio = '' } = useParams()
  const consulta = useConstanciaVerificada(folio)
  useNoIndexar()
  const noExiste = consulta.error instanceof ErrorFormacion && consulta.error.status === 404

  return (
    <div className={styles.pagina}>
      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Verificando la constancia">
          <IconoCargando size={24} />
        </div>
      ) : noExiste ? (
        <NoEncontrada />
      ) : consulta.isError ? (
        <div className={styles.estado}>
          <AvisoError mensaje={consulta.error.message} />
          <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Documento constancia={consulta.data} />
      )}
    </div>
  )
}

function NoEncontrada() {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  return (
    <div className={styles.noEncontrada}>
      <Titulo className={styles.tituloNoEncontrada}>No encontramos esta constancia</Titulo>
      <p>
        Revisa que el folio esté completo y bien escrito: tiene la forma CO3-XXXX-XXXX. Si te
        compartieron el enlace, pídele a la persona que lo copie de nuevo.
      </p>
      <Link to="/recursos">Ir al Centro de formación</Link>
    </div>
  )
}

function Documento({ constancia: c }: { constancia: ConstanciaVerificada }) {
  const Titulo = useDentroDeApp() ? 'h2' : 'h1'
  const esRuta = c.tipo === 'ruta'
  const duracion = formatoDuracion(c.duracionMin)

  return (
    <>
      <article className={styles.documento} aria-labelledby="titulo-constancia">
        <p className={styles.emisor}>Co3 · Centro de formación</p>
        <Titulo id="titulo-constancia" className={styles.titulo}>
          Constancia de finalización
        </Titulo>

        <p className={styles.frase}>Hace constar que</p>
        <p className={styles.nombre}>{c.nombre}</p>
        <p className={styles.frase}>
          {esRuta
            ? 'terminó todos los cursos de la ruta de aprendizaje'
            : 'terminó todas las lecciones del curso'}
        </p>
        <p className={styles.obra}>{c.titulo}</p>
        <p className={styles.fecha}>
          el <time dateTime={c.fechaFinalizacion}>{formatoFecha(c.fechaFinalizacion)}</time>
          {duracion ? ` · ${duracion}` : null}
        </p>

        {esRuta && c.titulosCursos.length > 0 ? (
          <div className={styles.bloque}>
            <p className={styles.etiqueta}>Cursos de la ruta</p>
            <ol className={styles.cursos}>
              {c.titulosCursos.map((titulo, i) => (
                <li key={`${i}-${titulo}`}>{titulo}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {c.elementos.length > 0 ? (
          <p className={styles.elementos}>
            Trabaja: {c.elementos.map((e) => ETIQUETAS_ELEMENTO[e]).join(' · ')}
          </p>
        ) : null}

        <p className={styles.sello}>
          <span aria-hidden="true">✓ </span>Emitida por Co3 · Folio{' '}
          <span className={styles.folio}>{c.folio}</span>
        </p>

        {c.enCatalogo ? null : (
          <p className={styles.nota}>
            {esRuta ? 'Esta ruta' : 'Este curso'} ya no se ofrece en el catálogo. La constancia
            sigue siendo válida: se emitió cuando {esRuta ? 'la ruta' : 'el curso'} estaba
            disponible.
          </p>
        )}
        <p className={styles.leyenda}>
          Hace constar que se recorrió {esRuta ? 'la ruta' : 'el curso'} en la plataforma. No es un
          documento oficial ni una calificación.
        </p>
      </article>

      <Acciones constancia={c} />
    </>
  )
}

function Acciones({ constancia: c }: { constancia: ConstanciaVerificada }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiado('si')
    } catch {
      setCopiado('no')
    }
  }

  const destino = c.enCatalogo
    ? c.tipo === 'ruta'
      ? { to: `/rutas/${c.idRuta}`, texto: 'Ver la ruta' }
      : { to: `/cursos/${c.idCurso}`, texto: 'Ver el curso' }
    : null

  return (
    <div>
      <div className={styles.acciones}>
        <Button onClick={() => window.print()}>Imprimir o guardar como PDF</Button>
        <Button variant="secondary" onClick={() => void copiar()}>
          Copiar enlace
        </Button>
        {destino ? (
          <Link to={destino.to} className={styles.enlace}>
            {destino.texto}
          </Link>
        ) : null}
      </div>
      {/* Siempre presente, para que el lector de pantalla anuncie el cambio. */}
      <p className={styles.estadoCopia} role="status">
        {copiado === 'si'
          ? 'Enlace copiado.'
          : copiado === 'no'
            ? 'No pudimos copiar el enlace. Cópialo de la barra de direcciones.'
            : null}
      </p>
    </div>
  )
}
