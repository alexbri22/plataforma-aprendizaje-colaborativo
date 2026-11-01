import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ETIQUETAS_AREA,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_NIVEL_CURSO,
} from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Badge,
  Button,
  Paginacion,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from '../../components/ui'
import { useCursosAdmin } from '../formacion'
import { AvisoConfirmacion } from './AvisoConfirmacion'
import { esAvisoCurso, mensajeDeAvisoCurso, type AvisoCurso } from './avisoContenido'
import { leerPagina } from './leerPagina'
import { varianteEstatus } from './varianteEstatus'
import styles from './PantallaContenido.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

// Cursos del Centro de formación en el panel (§12.3). Misma superficie densa
// que Contenido; la autorización real es del servidor.
export function PantallaCursos() {
  const [parametros, setParametros] = useSearchParams()
  const pagina = leerPagina(parametros.get('pagina'))
  const { data, isPending, isError, error, isPlaceholderData } = useCursosAdmin(pagina)
  const location = useLocation()
  const navigate = useNavigate()

  // Igual que en Contenido: el aviso viaja en el estado de la navegación y se
  // borra del historial para que no reaparezca al recargar.
  const [aviso, setAviso] = useState<AvisoCurso | null>(() => {
    const estado = location.state as { avisoCurso?: unknown } | null
    return esAvisoCurso(estado?.avisoCurso) ? estado.avisoCurso : null
  })
  useEffect(() => {
    if (location.state) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

  function irAPagina(nueva: number) {
    setParametros(nueva === 1 ? {} : { pagina: String(nueva) })
    window.scrollTo({ top: 0 })
  }

  const idResaltado = aviso && aviso.accion !== 'eliminado' ? aviso.idCurso : null

  return (
    <AppShell
      seccionActiva="cursos"
      titulo="Cursos"
      acciones={
        <Button size="sm" to="/admin/cursos/nuevo">
          Nuevo curso
        </Button>
      }
    >
      <div className={styles.contenido}>
        <p className={styles.subtitulo}>
          Microcursos de 2 a 5 lecciones. Solo lo publicado aparece en{' '}
          <Link to="/recursos">Recursos</Link>.
        </p>

        {aviso ? (
          <AvisoConfirmacion
            {...mensajeDeAvisoCurso(aviso)}
            verEn={aviso.estatus === 'publicado' ? `/cursos/${aviso.idCurso}` : undefined}
            seguirEditando={
              aviso.accion !== 'eliminado' ? `/admin/cursos/${aviso.idCurso}` : undefined
            }
            onCerrar={() => setAviso(null)}
          />
        ) : null}

        {isPending ? (
          <p role="status" className={styles.estadoTexto}>
            Cargando cursos…
          </p>
        ) : isError ? (
          <AvisoError mensaje={error.message} />
        ) : data.paginacion.total === 0 ? (
          <p className={styles.estadoTexto}>
            Todavía no hay cursos. Crea el primero con «Nuevo curso».
          </p>
        ) : data.cursos.length === 0 ? (
          <Navigate
            to={data.paginacion.totalPaginas > 1 ? `?pagina=${data.paginacion.totalPaginas}` : '.'}
            replace
          />
        ) : (
          <>
            <Table caption="Cursos" className={isPlaceholderData ? styles.actualizando : undefined}>
              <thead>
                <TableRow>
                  <TableHeaderCell>Título</TableHeaderCell>
                  <TableHeaderCell>Nivel</TableHeaderCell>
                  <TableHeaderCell>Área</TableHeaderCell>
                  <TableHeaderCell>Lecciones</TableHeaderCell>
                  <TableHeaderCell>Duración</TableHeaderCell>
                  <TableHeaderCell>Estatus</TableHeaderCell>
                  <TableHeaderCell>Actualizado</TableHeaderCell>
                </TableRow>
              </thead>
              <tbody>
                {data.cursos.map((c) => (
                  <TableRow
                    key={c.idCurso}
                    className={c.idCurso === idResaltado ? styles.filaReciente : undefined}
                  >
                    <TableCell>
                      <Link
                        to={`/admin/cursos/${c.idCurso}`}
                        state={{ volverA: location.search }}
                        className={styles.enlaceTitulo}
                      >
                        {c.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>{c.nivel ? ETIQUETAS_NIVEL_CURSO[c.nivel] : '—'}</TableCell>
                    <TableCell>{c.area ? ETIQUETAS_AREA[c.area] : '—'}</TableCell>
                    <TableCell>{c.numLecciones}</TableCell>
                    <TableCell>{c.duracionMin ? `${c.duracionMin} min` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={varianteEstatus(c.estatus)}>
                        {ETIQUETAS_ESTATUS_RECURSO[c.estatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{FORMATO_FECHA.format(new Date(c.fechaActualizacion))}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
            <Paginacion
              etiqueta="Páginas de cursos"
              total={data.paginacion.total}
              tamano={data.paginacion.porPagina}
              pagina={data.paginacion.pagina - 1}
              onCambiar={(p) => irAPagina(p + 1)}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
