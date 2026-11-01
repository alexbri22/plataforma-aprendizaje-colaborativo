import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ETIQUETAS_AREA,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_RECURSO,
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
import { useRecursosAdmin } from '../formacion'
import { leerPagina } from './leerPagina'
import { varianteEstatus } from './varianteEstatus'
import { AvisoConfirmacion } from './AvisoConfirmacion'
import { esAvisoContenido, mensajeDeAviso, type AvisoContenido } from './avisoContenido'
import styles from './PantallaContenido.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

// Biblioteca de recursos formativos del panel (§12.3). Superficie densa tipo
// Linear, igual que Cuentas. La autorización real es del servidor.
export function PantallaContenido() {
  // La página vive en la URL (?pagina=2): sobrevive a recargar, se puede
  // compartir y el editor sabe a cuál volver.
  const [parametros, setParametros] = useSearchParams()
  const pagina = leerPagina(parametros.get('pagina'))
  const { data, isPending, isError, error, isPlaceholderData } = useRecursosAdmin({ pagina })
  const location = useLocation()
  const navigate = useNavigate()

  // El aviso llega en el estado de la navegación desde el editor. Se copia
  // aquí y se borra del historial, para que no reaparezca al recargar.
  const [aviso, setAviso] = useState<AvisoContenido | null>(() => {
    const estado = location.state as { avisoContenido?: unknown } | null
    return esAvisoContenido(estado?.avisoContenido) ? estado.avisoContenido : null
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

  const idResaltado = aviso && aviso.accion !== 'eliminado' ? aviso.idRecurso : null

  return (
    <AppShell
      seccionActiva="contenido"
      titulo="Contenido formativo"
      acciones={
        <Button size="sm" to="/admin/contenido/nuevo">
          Nuevo recurso
        </Button>
      }
    >
      <div className={styles.contenido}>
        <p className={styles.subtitulo}>
          Recursos de las secciones públicas. Solo lo publicado aparece en{' '}
          <Link to="/recursos">Recursos</Link>; el orden define cómo se listan.
        </p>

        {aviso ? (
          <AvisoConfirmacion
            {...mensajeDeAviso(aviso)}
            verEn={aviso.estatus === 'publicado' ? `/recursos/${aviso.idRecurso}` : undefined}
            seguirEditando={
              aviso.accion !== 'eliminado' ? `/admin/contenido/${aviso.idRecurso}` : undefined
            }
            onCerrar={() => setAviso(null)}
          />
        ) : null}

        {isPending ? (
          <p role="status" className={styles.estadoTexto}>
            Cargando recursos…
          </p>
        ) : isError ? (
          <AvisoError mensaje={error.message} />
        ) : data.paginacion.total === 0 ? (
          <p className={styles.estadoTexto}>
            Todavía no hay recursos. Crea el primero con «Nuevo recurso».
          </p>
        ) : data.recursos.length === 0 ? (
          // La página pedida ya no existe (p. ej. se eliminó el último recurso
          // de la última página): se va a la última que sí hay.
          <Navigate
            to={data.paginacion.totalPaginas > 1 ? `?pagina=${data.paginacion.totalPaginas}` : '.'}
            replace
          />
        ) : (
          <>
            <Table
              caption="Recursos formativos"
              className={isPlaceholderData ? styles.actualizando : undefined}
            >
              <thead>
                <TableRow>
                  <TableHeaderCell>Orden</TableHeaderCell>
                  <TableHeaderCell>Título</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Sección</TableHeaderCell>
                  <TableHeaderCell>Área</TableHeaderCell>
                  <TableHeaderCell>Estatus</TableHeaderCell>
                  <TableHeaderCell>Actualizado</TableHeaderCell>
                </TableRow>
              </thead>
              <tbody>
                {data.recursos.map((r) => (
                  <TableRow
                    key={r.idRecurso}
                    className={r.idRecurso === idResaltado ? styles.filaReciente : undefined}
                  >
                    <TableCell className={styles.orden}>{r.orden}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/contenido/${r.idRecurso}`}
                        state={{ volverA: location.search }}
                        className={styles.enlaceTitulo}
                      >
                        {r.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>{ETIQUETAS_TIPO_RECURSO[r.tipoRecurso]}</TableCell>
                    <TableCell>{ETIQUETAS_SECCION[r.seccion]}</TableCell>
                    <TableCell>{r.area ? ETIQUETAS_AREA[r.area] : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={varianteEstatus(r.estatus)}>
                        {ETIQUETAS_ESTATUS_RECURSO[r.estatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{FORMATO_FECHA.format(new Date(r.fechaActualizacion))}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
            <Paginacion
              etiqueta="Páginas de recursos"
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
