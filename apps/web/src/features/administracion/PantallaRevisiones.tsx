import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  IconoCargando,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from '../../components/ui'
import { useColaRevision } from '../formacion'
import styles from './PantallaContenido.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

/*
 * Cola de revisión (docs/diseno-desarrollo-formacion.md §12.3, §12.5 y nota
 * del incremento 6): lo que los usuarios enviaron, lo más antiguo primero.
 * Cada propuesta se abre para revisarla y decidir. La autorización real la
 * aplica el servidor.
 */
export function PantallaRevisiones() {
  const consulta = useColaRevision()
  const location = useLocation()
  const navigate = useNavigate()
  const [aviso] = useState(() => {
    const estado = location.state as { avisoRevision?: unknown } | null
    return typeof estado?.avisoRevision === 'string' ? estado.avisoRevision : null
  })
  useEffect(() => {
    const estado = location.state as { avisoRevision?: unknown } | null
    if (estado?.avisoRevision === undefined) return
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  return (
    <AppShell seccionActiva="revisiones" titulo="Revisiones">
      <div className={styles.contenido}>
        <p className={styles.subtitulo}>
          Recursos y cursos que los usuarios propusieron. Revísalos contra los criterios de
          publicación y decide: aprobar, pedir cambios o rechazar, siempre con un motivo que su
          autor verá.
        </p>
        {aviso ? (
          <p role="status" className={styles.estadoTexto}>
            {aviso}
          </p>
        ) : null}
        {consulta.isPending ? (
          <div role="status" aria-label="Cargando la cola">
            <IconoCargando size={24} />
          </div>
        ) : consulta.isError ? (
          <AvisoError mensaje={consulta.error.message} />
        ) : consulta.data.length === 0 ? (
          <p className={styles.estadoTexto}>No hay propuestas esperando revisión.</p>
        ) : (
          <Table caption="Propuestas en revisión">
            <thead>
              <TableRow>
                <TableHeaderCell>Propuesta</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Autor</TableHeaderCell>
                <TableHeaderCell>Enviada</TableHeaderCell>
              </TableRow>
            </thead>
            <tbody>
              {consulta.data.map((p) => (
                <TableRow key={`${p.tipo}-${p.id}`}>
                  <TableCell>
                    <Link
                      to={`/admin/revisiones/${p.tipo === 'recurso' ? 'recursos' : 'cursos'}/${p.id}`}
                      className={styles.enlaceTitulo}
                    >
                      {p.titulo}
                    </Link>
                  </TableCell>
                  <TableCell>{p.tipo === 'recurso' ? 'Recurso' : 'Curso'}</TableCell>
                  <TableCell>{p.autor ?? 'Cuenta eliminada'}</TableCell>
                  <TableCell>{FORMATO_FECHA.format(new Date(p.fechaEnvio))}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </AppShell>
  )
}
