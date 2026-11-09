import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ELEMENTOS_COLABORACION,
  ETIQUETAS_ELEMENTO,
  MAX_ELEMENTOS_PREFERIDOS,
  type ElementoColaboracion,
} from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  Checkbox,
  IconoCargando,
  Paginacion,
  Tabs,
} from '../../components/ui'
import { BarraProgreso } from './BarraProgreso'
import type { MiCurso } from './formacion.api'
import { etiquetaTipo, formatoDuracion, formatoFecha, textoProgreso } from './formato'
import {
  useCambiarGuardado,
  useGuardarPreferencias,
  useMiFormacion,
  usePreferencias,
  useRecursosGuardados,
} from './useProgreso'
import styles from './PantallaMiFormacion.module.css'

/*
 * Espacio individual de formación (docs/diseno-desarrollo-formacion.md §7.2 y
 * ESP-02): mis cursos y mis recursos guardados. Es de la persona y de nadie
 * más; no muestra perfil, insignias ni comparación con otras personas. La
 * pestaña vive en la URL (?vista=guardados) para poder enlazarla.
 */

type Vista = 'cursos' | 'guardados'

const VISTAS = [
  { id: 'cursos', etiqueta: 'Mis cursos' },
  { id: 'guardados', etiqueta: 'Guardados' },
]

const POR_PAGINA_GUARDADOS = 10

export function PantallaMiFormacion() {
  const [parametros, setParametros] = useSearchParams()
  const vista: Vista = parametros.get('vista') === 'guardados' ? 'guardados' : 'cursos'

  return (
    <AppShell seccionActiva="mi-formacion" titulo="Mi formación">
      <div className={styles.contenido}>
        <Preferencias />
        <Tabs
          label="Mi formación"
          items={VISTAS}
          valor={vista}
          onCambiar={(id) => setParametros(id === 'guardados' ? { vista: 'guardados' } : {})}
        />
        <div role="tabpanel" id={`panel-${vista}`} aria-labelledby={`tab-${vista}`}>
          {vista === 'cursos' ? <MisCursos /> : <Guardados />}
        </div>
      </div>
    </AppShell>
  )
}

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <div className={styles.cargando} role="status" aria-label={etiqueta}>
      <IconoCargando size={24} />
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className={styles.vacio}>
      <p>{texto}</p>
      <Button variant="secondary" to="/recursos">
        Explorar recursos
      </Button>
    </div>
  )
}

function MisCursos() {
  const consulta = useMiFormacion()

  if (consulta.isPending) return <Cargando etiqueta="Cargando tus cursos" />
  if (consulta.isError) {
    return (
      <div className={styles.vacio}>
        <AvisoError mensaje={consulta.error.message} />
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const { enCurso, completados } = consulta.data
  if (enCurso.length === 0 && completados.length === 0) {
    return (
      <Vacio texto="Todavía no empiezas ningún curso. Cuando lo hagas, aquí verás tu avance." />
    )
  }

  return (
    <div className={styles.secciones}>
      {enCurso.length > 0 ? (
        <section aria-labelledby="titulo-en-curso">
          <h2 id="titulo-en-curso" className={styles.tituloSeccion}>
            En curso
          </h2>
          <ul className={styles.lista}>
            {enCurso.map((c) => (
              <li key={c.idCurso}>
                <TarjetaMiCurso curso={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {completados.length > 0 ? (
        <section aria-labelledby="titulo-completados">
          <h2 id="titulo-completados" className={styles.tituloSeccion}>
            Completados
          </h2>
          <ul className={styles.lista}>
            {completados.map((c) => (
              <li key={c.idCurso}>
                <TarjetaMiCurso curso={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function TarjetaMiCurso({ curso: c }: { curso: MiCurso }) {
  const retirado = c.estatus === 'retirado'
  const terminado = c.fechaFinalizacion !== null

  return (
    <Card className={styles.tarjeta}>
      <div className={styles.tarjetaCabecera}>
        <h3 className={styles.tarjetaTitulo}>
          {retirado ? c.titulo : <Link to={`/cursos/${c.idCurso}`}>{c.titulo}</Link>}
        </h3>
        {retirado ? <Badge variant="neutral">Retirado</Badge> : null}
        {terminado ? (
          <Badge variant="success">
            <span aria-hidden="true">✓ </span>Completado
          </Badge>
        ) : null}
      </div>

      <BarraProgreso
        porcentaje={c.porcentaje}
        completo={terminado}
        etiqueta={`Progreso en ${c.titulo}`}
      />
      <p className={styles.meta}>
        {[
          textoProgreso(c),
          terminado
            ? `Completado el ${formatoFecha(c.fechaFinalizacion as string)}`
            : `Empezado el ${formatoFecha(c.fechaInicio)}`,
        ].join(' · ')}
      </p>

      {retirado ? (
        <p className={styles.nota}>
          Este curso se retiró del catálogo. Tu avance se conserva, pero sus lecciones ya no se
          pueden abrir.
        </p>
      ) : c.siguiente ? (
        <div className={styles.acciones}>
          <span className={styles.siguiente}>Sigue con: {c.siguiente.titulo}</span>
          <Button
            size="sm"
            variant={terminado ? 'secondary' : 'primary'}
            to={`/cursos/${c.idCurso}/lecciones/${c.siguiente.idLeccion}`}
          >
            {terminado ? 'Ver lo nuevo' : 'Seguir'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function Guardados() {
  const [parametros, setParametros] = useSearchParams()
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const consulta = useRecursosGuardados(pagina, POR_PAGINA_GUARDADOS)
  const quitar = useCambiarGuardado()

  if (consulta.isPending) return <Cargando etiqueta="Cargando tus recursos guardados" />
  if (consulta.isError) {
    return (
      <div className={styles.vacio}>
        <AvisoError mensaje={consulta.error.message} />
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const { recursos, paginacion } = consulta.data
  if (paginacion.total === 0) {
    return (
      <Vacio texto="Aún no guardas recursos. Usa «Guardar para después» en cualquier recurso y aparecerá aquí." />
    )
  }

  return (
    <div className={styles.secciones}>
      {quitar.isError ? <AvisoError mensaje={quitar.error.message} /> : null}
      <ul className={styles.listaGuardados}>
        {recursos.map((r) => (
          <li key={r.idRecurso} className={styles.guardado}>
            <div className={styles.guardadoTexto}>
              <Link to={`/recursos/${r.idRecurso}`}>{r.titulo}</Link>
              <span className={styles.meta}>
                {[etiquetaTipo(r.tipoRecurso), formatoDuracion(r.duracionMin, r.tipoRecurso)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={quitar.isPending}
              aria-label={`Quitar «${r.titulo}» de guardados`}
              onClick={() => quitar.mutate({ idRecurso: r.idRecurso, guardar: false })}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      {/* Paginacion cuenta desde 0; la API, desde 1. */}
      <Paginacion
        total={paginacion.total}
        tamano={POR_PAGINA_GUARDADOS}
        pagina={pagina - 1}
        etiqueta="Recursos guardados"
        onCambiar={(p) =>
          setParametros(
            p === 0 ? { vista: 'guardados' } : { vista: 'guardados', pagina: String(p + 1) },
          )
        }
      />
    </div>
  )
}

/** "¿Qué quieres fortalecer?": hasta dos elementos de Johnson y Johnson. Es
 * una declaración propia y privada que el recomendador usa como interés; no
 * es una evaluación. Se monta con lo guardado para que el borrador empiece
 * desde ahí. */
function Preferencias() {
  const consulta = usePreferencias()
  if (!consulta.data) return null
  return <FormularioPreferencias guardadas={consulta.data} />
}

function FormularioPreferencias({ guardadas }: { guardadas: ElementoColaboracion[] }) {
  const [elegidos, setElegidos] = useState<ElementoColaboracion[]>(guardadas)
  const [guardadoAhora, setGuardadoAhora] = useState(false)
  const guardar = useGuardarPreferencias()
  const sinCambios =
    elegidos.length === guardadas.length && elegidos.every((e) => guardadas.includes(e))
  const lleno = elegidos.length >= MAX_ELEMENTOS_PREFERIDOS

  function alternar(e: ElementoColaboracion) {
    setGuardadoAhora(false)
    setElegidos((actual) =>
      actual.includes(e)
        ? actual.filter((x) => x !== e)
        : ELEMENTOS_COLABORACION.filter((x) => x === e || actual.includes(x)),
    )
  }

  return (
    <Card className={styles.preferencias}>
      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          guardar.mutate(elegidos, { onSuccess: () => setGuardadoAhora(true) })
        }}
      >
        <fieldset className={styles.preferenciasCampos}>
          <legend className={styles.preferenciasTitulo}>¿Qué quieres fortalecer?</legend>
          <p className={styles.nota}>
            Elige hasta {MAX_ELEMENTOS_PREFERIDOS}. Lo usamos solo para recomendarte rutas; nadie
            más lo ve y no es una evaluación.
          </p>
          {ELEMENTOS_COLABORACION.map((e) => (
            <Checkbox
              key={e}
              label={ETIQUETAS_ELEMENTO[e]}
              checked={elegidos.includes(e)}
              disabled={lleno && !elegidos.includes(e)}
              onChange={() => alternar(e)}
            />
          ))}
        </fieldset>
        {guardar.isError ? <AvisoError mensaje={guardar.error.message} /> : null}
        <div className={styles.acciones}>
          <span role="status" className={styles.nota}>
            {guardadoAhora && sinCambios
              ? 'Guardado. Tus recomendaciones ya lo toman en cuenta.'
              : ''}
          </span>
          <Button type="submit" size="sm" disabled={sinCambios || guardar.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Card>
  )
}
