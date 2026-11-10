import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ETIQUETAS_ESTATUS_RECURSO } from '@plataforma/shared'
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
import { useRutasAdmin } from '../formacion'
import { AvisoConfirmacion } from './AvisoConfirmacion'
import { esAvisoRuta, mensajeDeAvisoRuta, type AvisoRuta } from './avisoContenido'
import { leerPagina } from './leerPagina'
import { varianteEstatus } from './varianteEstatus'
import styles from './PantallaContenido.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

// Rutas de aprendizaje en el panel (§4.1 y nota del incremento 4): selección
// editorial de 2 a 5 cursos. Misma superficie densa que Cursos; la
// autorización real es del servidor.
export function PantallaRutas() {
  const [parametros, setParametros] = useSearchParams()
  const pagina = leerPagina(parametros.get('pagina'))
  const { data, isPending, isError, error, isPlaceholderData } = useRutasAdmin(pagina)
  const location = useLocation()
  const navigate = useNavigate()

  // Igual que en Contenido: el aviso viaja en el estado de la navegación y se
  // borra del historial para que no reaparezca al recargar.
  const [aviso, setAviso] = useState<AvisoRuta | null>(() => {
    const estado = location.state as { avisoRuta?: unknown } | null
    return esAvisoRuta(estado?.avisoRuta) ? estado.avisoRuta : null
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

  const idResaltado = aviso && aviso.accion !== 'eliminado' ? aviso.idRuta : null

  return (
    <AppShell
      seccionActiva="rutas"
      titulo="Rutas"
      acciones={
        <Button size="sm" to="/admin/rutas/nuevo">
          Nueva ruta
        </Button>
      }
    >
      <div className={styles.contenido}>
        <p className={styles.subtitulo}>
          De 2 a 5 cursos con una misma finalidad. Solo las publicadas se recomiendan en{' '}
          <Link to="/recursos">Recursos</Link>; la destacada es la que ve quien todavía no tiene
          recomendaciones.
        </p>

        {aviso ? (
          <AvisoConfirmacion
            {...mensajeDeAvisoRuta(aviso)}
            seguirEditando={
              aviso.accion !== 'eliminado' ? `/admin/rutas/${aviso.idRuta}` : undefined
            }
            onCerrar={() => setAviso(null)}
          />
        ) : null}

        {isPending ? (
          <p role="status" className={styles.estadoTexto}>
            Cargando rutas…
          </p>
        ) : isError ? (
          <AvisoError mensaje={error.message} />
        ) : data.paginacion.total === 0 ? (
          <p className={styles.estadoTexto}>
            Todavía no hay rutas. Crea la primera con «Nueva ruta».
          </p>
        ) : data.rutas.length === 0 ? (
          <Navigate
            to={data.paginacion.totalPaginas > 1 ? `?pagina=${data.paginacion.totalPaginas}` : '.'}
            replace
          />
        ) : (
          <>
            <Table caption="Rutas" className={isPlaceholderData ? styles.actualizando : undefined}>
              <thead>
                <TableRow>
                  <TableHeaderCell>Título</TableHeaderCell>
                  <TableHeaderCell>Cursos</TableHeaderCell>
                  <TableHeaderCell>Estatus</TableHeaderCell>
                  <TableHeaderCell>Actualizada</TableHeaderCell>
                </TableRow>
              </thead>
              <tbody>
                {data.rutas.map((r) => (
                  <TableRow
                    key={r.idRuta}
                    className={r.idRuta === idResaltado ? styles.filaReciente : undefined}
                  >
                    <TableCell>
                      <Link
                        to={`/admin/rutas/${r.idRuta}`}
                        state={{ volverA: location.search }}
                        className={styles.enlaceTitulo}
                      >
                        {r.titulo}
                      </Link>
                      {r.destacada ? (
                        <>
                          {' '}
                          <Badge variant="neutral">Destacada</Badge>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.numCursos}</TableCell>
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
              etiqueta="Páginas de rutas"
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
