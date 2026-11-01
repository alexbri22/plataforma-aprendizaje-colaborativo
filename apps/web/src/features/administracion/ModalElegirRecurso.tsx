import { useState } from 'react'
import { ETIQUETAS_TIPO_RECURSO } from '@plataforma/shared'
import { AvisoError, Button, Input, Modal, Paginacion } from '../../components/ui'
import { useRecursosAdmin, useValorDiferido } from '../formacion'
import styles from './ModalElegirRecurso.module.css'

const POR_PAGINA = 6

export interface ModalElegirRecursoProps {
  /** Los que ya están en el curso: se muestran, pero no se pueden repetir. */
  idsEnCurso: string[]
  onElegir: (idRecurso: string) => void
  onCerrar: () => void
  /** Elige el recurso de una lección que ya existe, en vez de agregar una. */
  reemplazo?: boolean
}

// Busca en la biblioteca el recurso que será una lección. Solo ofrece los
// publicados: un curso publicado no puede usar otros, así que elegir un
// borrador solo aplazaría el problema.
export function ModalElegirRecurso({
  idsEnCurso,
  onElegir,
  onCerrar,
  reemplazo = false,
}: ModalElegirRecursoProps) {
  const [busqueda, setBusqueda] = useState('')
  const texto = useValorDiferido(busqueda.trim())
  const [paginaElegida, setPaginaElegida] = useState({ texto, pagina: 1 })
  const pagina = paginaElegida.texto === texto ? paginaElegida.pagina : 1

  const { data, isPending, isError, error } = useRecursosAdmin({
    texto: texto || undefined,
    estatus: 'publicado',
    pagina,
    porPagina: POR_PAGINA,
  })

  return (
    <Modal
      abierto
      amplio
      onCerrar={onCerrar}
      titulo={reemplazo ? 'Cambiar el recurso de la lección' : 'Agregar recurso de la biblioteca'}
      descripcion={
        reemplazo
          ? 'La lección conserva su lugar en el curso, su título y su introducción; solo cambia el recurso.'
          : 'La lección usará el recurso tal como está en la biblioteca. Si después lo editas, el curso muestra los cambios.'
      }
    >
      <Input
        label="Buscar en la biblioteca"
        type="search"
        placeholder="Ej. acuerdos o reunión"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {isError ? <AvisoError mensaje={error.message} /> : null}
      {isPending ? (
        <p role="status" className={styles.estado}>
          Cargando recursos…
        </p>
      ) : null}

      {data && data.recursos.length === 0 ? (
        <p role="status" className={styles.estado}>
          No hay recursos publicados con esa búsqueda.
        </p>
      ) : null}

      {data && data.recursos.length > 0 ? (
        <ul className={styles.lista}>
          {data.recursos.map((r) => {
            const yaEsta = idsEnCurso.includes(r.idRecurso)
            return (
              <li key={r.idRecurso}>
                <div className={styles.recurso}>
                  <span className={styles.titulo}>{r.titulo}</span>
                  <span className={styles.meta}>
                    {[
                      ETIQUETAS_TIPO_RECURSO[r.tipoRecurso],
                      r.duracionMin ? `${r.duracionMin} min` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {yaEsta ? (
                  <span className={styles.yaEsta}>Ya está en el curso</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`${reemplazo ? 'Usar' : 'Agregar'} ${r.titulo}`}
                    onClick={() => onElegir(r.idRecurso)}
                  >
                    {reemplazo ? 'Usar este' : 'Agregar'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {data ? (
        <Paginacion
          etiqueta="Páginas de la biblioteca"
          total={data.paginacion.total}
          tamano={data.paginacion.porPagina}
          pagina={data.paginacion.pagina - 1}
          onCambiar={(p) => setPaginaElegida({ texto, pagina: p + 1 })}
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
