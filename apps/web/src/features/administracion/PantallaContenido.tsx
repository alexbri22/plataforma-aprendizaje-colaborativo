import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ETIQUETAS_AREA,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_RECURSO,
  type EstatusRecurso,
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
import { esAvisoContenido, mensajeDeAviso, type AvisoContenido } from './avisoContenido'
import styles from './PantallaContenido.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

// El estatus siempre se lee como texto; el color solo acompaña (§12.5 de
// docs/diseno-desarrollo-formacion.md, WCAG: el estado no depende del color).
const VARIANTE_ESTATUS: Record<EstatusRecurso, 'success' | 'neutral' | 'warning'> = {
  publicado: 'success',
  borrador: 'neutral',
  retirado: 'warning',
}

function IconoListo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m6.75 10.25 2.25 2.25 4.25-4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Confirmación de lo que se acaba de hacer en el editor, con atajos a ver el
// resultado o a seguir editando.
function AvisoConfirmacion({ aviso, onCerrar }: { aviso: AvisoContenido; onCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { titulo, detalle } = mensajeDeAviso(aviso)

  // El foco viene del botón del editor, que ya no existe: se pasa al aviso
  // para que el lector de pantalla lo lea y el teclado siga desde aquí.
  // La página llega con el desplazamiento del editor: se vuelve arriba para
  // que el aviso y el título queden a la vista.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div ref={ref} tabIndex={-1} className={styles.confirmacion} role="status">
      <span className={styles.confirmacionIcono}>
        <IconoListo />
      </span>
      <div className={styles.confirmacionTexto}>
        <p className={styles.confirmacionTitulo}>{titulo}</p>
        <p>{detalle}</p>
        {aviso.accion !== 'eliminado' ? (
          <p className={styles.confirmacionEnlaces}>
            {aviso.estatus === 'publicado' ? (
              <Link to={`/recursos/${aviso.idRecurso}`}>Ver en Recursos</Link>
            ) : null}
            <Link to={`/admin/contenido/${aviso.idRecurso}`}>Seguir editando</Link>
          </p>
        ) : null}
      </div>
      <button type="button" className={styles.confirmacionCerrar} onClick={onCerrar}>
        <span aria-hidden="true">×</span>
        <span className={styles.srOnly}>Cerrar aviso</span>
      </button>
    </div>
  )
}

// Biblioteca de recursos formativos del panel (§12.3). Superficie densa tipo
// Linear, igual que Cuentas. La autorización real es del servidor.
function leerPagina(valor: string | null): number {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export function PantallaContenido() {
  // La página vive en la URL (?pagina=2): sobrevive a recargar, se puede
  // compartir y el editor sabe a cuál volver.
  const [parametros, setParametros] = useSearchParams()
  const pagina = leerPagina(parametros.get('pagina'))
  const { data, isPending, isError, error, isPlaceholderData, isFetching } =
    useRecursosAdmin(pagina)
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

        {aviso ? <AvisoConfirmacion aviso={aviso} onCerrar={() => setAviso(null)} /> : null}

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
            <p className={styles.estadoTexto}>
              Mostrando {(data.paginacion.pagina - 1) * data.paginacion.porPagina + 1}–
              {(data.paginacion.pagina - 1) * data.paginacion.porPagina + data.recursos.length} de{' '}
              {data.paginacion.total}
            </p>
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
                      <Badge variant={VARIANTE_ESTATUS[r.estatus]}>
                        {ETIQUETAS_ESTATUS_RECURSO[r.estatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{FORMATO_FECHA.format(new Date(r.fechaActualizacion))}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            <Paginacion
              etiqueta="Páginas de recursos"
              pagina={data.paginacion.pagina}
              totalPaginas={data.paginacion.totalPaginas}
              onCambiar={irAPagina}
              deshabilitada={isFetching}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
