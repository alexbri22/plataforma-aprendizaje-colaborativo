import { useState } from 'react'
import { ETIQUETAS_ESTATUS_RECURSO, ETIQUETAS_NIVEL_CURSO } from '@plataforma/shared'
import { AvisoError, Badge, Button, Modal, Paginacion } from '../../components/ui'
import { useCursosAdmin } from '../formacion'
import { varianteEstatus } from './varianteEstatus'
import styles from './ModalElegirRecurso.module.css'

export interface ModalElegirCursoProps {
  /** Los que ya están en la ruta: se muestran, pero no se pueden repetir. */
  idsEnRuta: string[]
  onElegir: (idCurso: string) => void
  onCerrar: () => void
}

// Elige un curso del catálogo para agregarlo a la ruta. Muestra también los
// borradores, con su estatus: una ruta en borrador puede armarse mientras sus
// cursos se terminan, pero para publicarla todos deben estar publicados.
export function ModalElegirCurso({ idsEnRuta, onElegir, onCerrar }: ModalElegirCursoProps) {
  const [pagina, setPagina] = useState(1)
  const { data, isPending, isError, error } = useCursosAdmin(pagina)

  return (
    <Modal
      abierto
      amplio
      onCerrar={onCerrar}
      titulo="Agregar curso a la ruta"
      descripcion="El curso se agrega al final. La ruta usa el curso tal como está: si después lo editas, la ruta muestra los cambios."
    >
      {isError ? <AvisoError mensaje={error.message} /> : null}
      {isPending ? (
        <p role="status" className={styles.estado}>
          Cargando cursos…
        </p>
      ) : null}
      {data && data.cursos.length === 0 ? (
        <p role="status" className={styles.estado}>
          Todavía no hay cursos.
        </p>
      ) : null}

      {data && data.cursos.length > 0 ? (
        <ul className={styles.lista}>
          {data.cursos.map((c) => {
            const yaEsta = idsEnRuta.includes(c.idCurso)
            return (
              <li key={c.idCurso}>
                <div className={styles.recurso}>
                  <span className={styles.titulo}>{c.titulo}</span>
                  <span className={styles.meta}>
                    {[
                      c.nivel ? ETIQUETAS_NIVEL_CURSO[c.nivel] : null,
                      c.duracionMin ? `${c.duracionMin} min` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}{' '}
                    <Badge variant={varianteEstatus(c.estatus)}>
                      {ETIQUETAS_ESTATUS_RECURSO[c.estatus]}
                    </Badge>
                  </span>
                </div>
                {yaEsta ? (
                  <span className={styles.yaEsta}>Ya está en la ruta</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Agregar ${c.titulo}`}
                    onClick={() => onElegir(c.idCurso)}
                  >
                    Agregar
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {data ? (
        <Paginacion
          etiqueta="Páginas de cursos"
          total={data.paginacion.total}
          tamano={data.paginacion.porPagina}
          pagina={data.paginacion.pagina - 1}
          onCambiar={(p) => setPagina(p + 1)}
        />
      ) : null}

      <div className={styles.acciones}>
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}
