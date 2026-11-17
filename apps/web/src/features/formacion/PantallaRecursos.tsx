import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AREAS_HABILIDAD,
  ETIQUETAS_AREA,
  ELEMENTOS_COLABORACION,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_NIVEL_CURSO,
  NIVELES_CURSO,
  TIPOS_LECTURA,
  TIPOS_RECURSO,
  type AreaHabilidad,
  type ElementoColaboracion,
  type NivelCurso,
  type TipoRecurso,
} from '@plataforma/shared'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  IconoCargando,
  Input,
  Paginacion,
  Select,
} from '../../components/ui'
import { etiquetaTipo, formatoDuracion } from './formato'
import { IconoFlecha } from './iconos'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { SeccionRutas } from './SeccionRutas'
import { useCursosPublicos } from './useCursos'
import { useRecursosPublicos } from './useRecursos'
import { useValorDiferido } from './useValorDiferido'
import styles from './PantallaRecursos.module.css'

type FiltroArea = 'todas' | AreaHabilidad

// Artículos y recursos breves se piden por separado y cada lista tiene su
// propia paginación.
const TIPOS_BREVES = TIPOS_RECURSO.filter((t) => !TIPOS_LECTURA.includes(t))

// Filtro "Tipo" (observaciones del 12 de noviembre: se busca por el tipo de
// recurso, no por sección). Cursos y Artículos son grupos enteros; los demás
// tipos filtran la lista de recursos breves.
type FiltroTipo = 'todos' | 'cursos' | 'articulos' | TipoRecurso
const OPCIONES_TIPO: readonly { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'cursos', etiqueta: 'Cursos' },
  { valor: 'articulos', etiqueta: 'Artículos' },
  { valor: 'plantilla', etiqueta: 'Plantillas' },
  { valor: 'pdf', etiqueta: 'PDF' },
  { valor: 'video', etiqueta: 'Videos' },
  { valor: 'enlace', etiqueta: 'Enlaces' },
]
const POR_PAGINA_ARTICULOS = 6
const POR_PAGINA_BREVES = 8
const POR_PAGINA_CURSOS = 6

function irA(selector: string) {
  document.querySelector(selector)?.scrollIntoView()
}

/*
 * Centro de formación (docs/diseno-desarrollo-formacion.md §2 y §10.1), con
 * el diseño de la rama plataforma-formativaV1. Cursos, artículos y recursos
 * breves vienen de la API, filtrados y paginados en el servidor; la ruta es la
 * que recomienda el recomendador (ver SeccionRutas). Los filtros de arriba
 * aplican a todo a la vez; nivel y elemento, solo a los cursos.
 */
export function PantallaRecursos() {
  return (
    <MarcoFormacion titulo="Recursos">
      <CentroFormacion />
    </MarcoFormacion>
  )
}

function CentroFormacion() {
  const dentroDeApp = useDentroDeApp()
  const Titulo = dentroDeApp ? 'h2' : 'h1'
  const [area, setArea] = useState<FiltroArea>('todas')
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState<'' | NivelCurso>('')
  const [elemento, setElemento] = useState<'' | ElementoColaboracion>('')

  const texto = useValorDiferido(busqueda.trim())
  const filtros = {
    area: area === 'todas' ? undefined : area,
    texto: texto || undefined,
  }
  const verCursos = tipo === 'todos' || tipo === 'cursos'
  const verArticulos = tipo === 'todos' || tipo === 'articulos'
  const verBreves = tipo !== 'cursos' && tipo !== 'articulos'
  const tiposBreves = tipo === 'todos' ? TIPOS_BREVES : TIPOS_BREVES.filter((t) => t === tipo)

  // Las páginas se recuerdan junto con los filtros con que se eligieron: si
  // los filtros cambian, las listas vuelven solas a su primera página.
  const claveFiltros = JSON.stringify({ ...filtros, tipo, nivel, elemento })
  const inicio = { cursos: 1, articulos: 1, breves: 1 }
  const [paginas, setPaginas] = useState({ clave: claveFiltros, ...inicio })
  const vigentes = paginas.clave === claveFiltros ? paginas : inicio
  const paginaCursos = vigentes.cursos
  const paginaArticulos = vigentes.articulos
  const paginaBreves = vigentes.breves

  const cursos = useCursosPublicos(
    {
      area: filtros.area,
      texto: filtros.texto,
      nivel: nivel || undefined,
      elemento: elemento || undefined,
      pagina: paginaCursos,
      porPagina: POR_PAGINA_CURSOS,
    },
    verCursos,
  )

  const articulos = useRecursosPublicos(
    {
      ...filtros,
      tipos: TIPOS_LECTURA,
      pagina: paginaArticulos,
      porPagina: POR_PAGINA_ARTICULOS,
    },
    verArticulos,
  )
  const breves = useRecursosPublicos(
    {
      ...filtros,
      tipos: tiposBreves,
      pagina: paginaBreves,
      porPagina: POR_PAGINA_BREVES,
    },
    verBreves,
  )
  // Una lista apagada por el filtro de tipo cuenta como lista vacía.
  const listas = [
    { lista: 'cursos', consulta: cursos, activa: verCursos },
    { lista: 'articulos', consulta: articulos, activa: verArticulos },
    { lista: 'breves', consulta: breves, activa: verBreves },
  ] as const
  const activas = listas.filter((l) => l.activa)
  // Si el catálogo se reduce mientras se ve una página que ya no existe (se
  // retiraron recursos y se volvió a pedir la lista), la API devuelve esa
  // página vacía y Paginacion se oculta cuando todo cabe en una: sin esto no
  // habría forma de volver a los resultados. Se lleva a la última página que
  // sí existe. Solo con una respuesta real (no la anterior que se sigue
  // mostrando mientras llega la nueva), para no saltar a destiempo. Es un
  // ajuste de estado durante el render, que React permite y repite antes de
  // pintar; se detiene en cuanto la página pedida ya es válida.
  const ajuste = { cursos: paginaCursos, articulos: paginaArticulos, breves: paginaBreves }
  for (const { lista, consulta } of activas) {
    if (consulta.isSuccess && !consulta.isPlaceholderData) {
      const ultima = Math.max(1, consulta.data.paginacion.totalPaginas)
      if (ajuste[lista] > ultima) ajuste[lista] = ultima
    }
  }
  if (
    ajuste.cursos !== paginaCursos ||
    ajuste.articulos !== paginaArticulos ||
    ajuste.breves !== paginaBreves
  ) {
    setPaginas({ clave: claveFiltros, ...ajuste })
  }

  const totalCursos = verCursos ? (cursos.data?.paginacion.total ?? 0) : 0
  const hayFiltrosDeCurso = nivel !== '' || elemento !== ''
  const mostrarCursos = verCursos && (totalCursos > 0 || hayFiltrosDeCurso)

  const totalArticulos = verArticulos ? (articulos.data?.paginacion.total ?? 0) : 0
  const totalBreves = verBreves ? (breves.data?.paginacion.total ?? 0) : 0
  const cargando = activas.some((l) => l.consulta.isPending)
  const error = activas.map((l) => l.consulta.error).find(Boolean) ?? null
  const hayFiltros = area !== 'todas' || tipo !== 'todos' || texto !== '' || hayFiltrosDeCurso
  const sinResultados =
    activas.every((l) => l.consulta.isSuccess) &&
    !mostrarCursos &&
    totalArticulos === 0 &&
    totalBreves === 0

  function cambiarPagina(lista: 'cursos' | 'articulos' | 'breves', pagina: number) {
    setPaginas({ clave: claveFiltros, ...vigentes, [lista]: pagina })
    irA(
      {
        cursos: '#titulo-cursos',
        articulos: '#titulo-articulos',
        breves: '#titulo-recursos-breves',
      }[lista],
    )
  }

  function limpiarFiltros() {
    setArea('todas')
    setTipo('todos')
    setBusqueda('')
    setNivel('')
    setElemento('')
  }

  return (
    <div
      className={[styles.centro, dentroDeApp ? styles.centroEnApp : null].filter(Boolean).join(' ')}
    >
      {/* Observaciones del 4 de noviembre: la página pública se presenta como
          "Aprender colaborando" y, debajo, Recursos (el catálogo) y Rutas
          recomendadas. Las del 12 de noviembre: con sesión no es igual que la
          externa, así que empieza directo en el catálogo. */}
      {dentroDeApp ? null : (
        <section
          className={[styles.presentacion, styles.presentacionSola].join(' ')}
          aria-labelledby="titulo-centro-formacion"
        >
          <div className={styles.presentacionTexto}>
            <Titulo id="titulo-centro-formacion" className={styles.tituloPrincipal}>
              Aprender colaborando
            </Titulo>
            <p className={styles.lede}>
              El aprendizaje colaborativo favorece tanto la adquisición de conocimientos
              disciplinares como el desarrollo de competencias, entre ellas, la resolución de
              problemas, la comunicación, la socialización y la corresponsabilidad.
            </p>
            <p className={styles.lede}>
              La sección ofrece Recursos de diverso formato para atender aspectos puntuales de
              manera concreta, o bien Rutas de aprendizaje recomendadas para obtener un conocimiento
              más profundo de algún tema o competencia.
            </p>
          </div>
        </section>
      )}

      <section
        id="catalogo"
        className={[styles.catalogo, dentroDeApp ? styles.catalogoEnApp : null]
          .filter(Boolean)
          .join(' ')}
        aria-labelledby="titulo-catalogo"
      >
        <div className={styles.catalogoCabecera}>
          {/* Dentro de la app el título de la pantalla ya dice "Recursos". */}
          <div>
            {dentroDeApp ? (
              <>
                <h2 id="titulo-catalogo">Aprende a tu ritmo</h2>
                <p>Elige una habilidad y llévala a una situación real de colaboración.</p>
              </>
            ) : (
              <>
                <h2 id="titulo-catalogo">Recursos</h2>
                <p>
                  Identifica cursos breves y materiales para mejorar la comunicación, organizar el
                  trabajo, documentar acuerdos, tomar decisiones y negociar con otras personas.
                  Estos recursos te ayudarán a desarrollar habilidades clave para el trabajo en
                  equipo y la colaboración.
                </p>
              </>
            )}
          </div>
          <div className={styles.controles}>
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as FiltroTipo)}
            >
              {OPCIONES_TIPO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Select>
            <Input
              label="Buscar en el catálogo"
              type="search"
              placeholder="Ej. comunicación o acuerdos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtros} role="group" aria-label="Filtrar por habilidad">
          {(['todas', ...AREAS_HABILIDAD] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              className={valor === area ? styles.filtroActivo : styles.filtro}
              aria-pressed={valor === area}
              onClick={() => setArea(valor)}
            >
              {valor === 'todas' ? 'Todos' : ETIQUETAS_AREA[valor]}
            </button>
          ))}
        </div>

        {error ? (
          <div className={styles.estado}>
            <AvisoError mensaje={error.message} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                for (const l of activas) void l.consulta.refetch()
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {cargando ? (
          <div className={styles.estado} role="status" aria-label="Cargando recursos">
            <IconoCargando size={24} />
          </div>
        ) : null}

        {sinResultados ? (
          <div className={styles.sinResultados} role="status">
            <h3>
              {hayFiltros
                ? 'No encontramos contenido con esos criterios'
                : 'Todavía no hay recursos publicados'}
            </h3>
            {hayFiltros ? (
              <>
                <p>Prueba con otra palabra o quita los filtros.</p>
                <Button variant="secondary" size="sm" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {mostrarCursos && cursos.data ? (
          <div className={styles.grupo}>
            <div className={styles.grupoCabecera}>
              <h3 id="titulo-cursos" className={styles.subtitulo}>
                Cursos
              </h3>
              <div className={styles.filtrosCurso}>
                <Select
                  label="Nivel"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value as '' | NivelCurso)}
                >
                  <option value="">Todos</option>
                  {NIVELES_CURSO.map((n) => (
                    <option key={n} value={n}>
                      {ETIQUETAS_NIVEL_CURSO[n]}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Elemento de colaboración"
                  value={elemento}
                  onChange={(e) => setElemento(e.target.value as '' | ElementoColaboracion)}
                >
                  <option value="">Todos</option>
                  {ELEMENTOS_COLABORACION.map((e) => (
                    <option key={e} value={e}>
                      {ETIQUETAS_ELEMENTO[e]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {totalCursos === 0 ? (
              <div className={styles.sinCursos} role="status">
                <p>Ningún curso coincide con ese nivel y elemento.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setNivel('')
                    setElemento('')
                  }}
                >
                  Ver todos los cursos
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={[styles.grid, cursos.isPlaceholderData ? styles.actualizando : null]
                    .filter(Boolean)
                    .join(' ')}
                  aria-live="polite"
                >
                  {cursos.data.cursos.map((curso) => (
                    <Card key={curso.idCurso} className={styles.tarjeta}>
                      <div className={styles.tarjetaMeta}>
                        {curso.area ? (
                          <Badge variant="neutral">{ETIQUETAS_AREA[curso.area]}</Badge>
                        ) : (
                          <span />
                        )}
                        <span>{curso.duracionMin} min</span>
                      </div>
                      <div className={styles.tarjetaContenido}>
                        <h4>{curso.titulo}</h4>
                        <p>{curso.resumen}</p>
                      </div>
                      <div className={styles.tarjetaDetalle}>
                        {curso.nivel ? <span>{ETIQUETAS_NIVEL_CURSO[curso.nivel]}</span> : null}
                        {curso.nivel ? <span aria-hidden="true">·</span> : null}
                        <span>
                          {curso.numLecciones} {curso.numLecciones === 1 ? 'lección' : 'lecciones'}
                        </span>
                      </div>
                      <Link to={`/cursos/${curso.idCurso}`} className={styles.enlaceTexto}>
                        Ver curso <IconoFlecha className={styles.flecha} />
                        <span className={styles.srOnly}>: {curso.titulo}</span>
                      </Link>
                    </Card>
                  ))}
                </div>
                {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
                <Paginacion
                  etiqueta="Páginas de cursos"
                  total={cursos.data.paginacion.total}
                  tamano={cursos.data.paginacion.porPagina}
                  pagina={cursos.data.paginacion.pagina - 1}
                  onCambiar={(p) => cambiarPagina('cursos', p + 1)}
                />
              </>
            )}
          </div>
        ) : null}

        {verArticulos && articulos.data && totalArticulos > 0 ? (
          <section className={styles.articulos} aria-labelledby="titulo-articulos">
            <div className={styles.articulosCabecera}>
              <h3 id="titulo-articulos" className={styles.subtitulo}>
                Artículos
              </h3>
              <p>Ideas breves para profundizar en la colaboración más allá de un curso.</p>
            </div>

            <div
              className={[styles.grid, articulos.isPlaceholderData ? styles.actualizando : null]
                .filter(Boolean)
                .join(' ')}
            >
              {articulos.data.recursos.map((a) => (
                <Card key={a.idRecurso} className={styles.tarjeta}>
                  <div className={styles.tarjetaMeta}>
                    {a.area ? <Badge variant="neutral">{ETIQUETAS_AREA[a.area]}</Badge> : <span />}
                    <span>{formatoDuracion(a.duracionMin, a.tipoRecurso)}</span>
                  </div>
                  <div className={styles.tarjetaContenido}>
                    <h4>{a.titulo}</h4>
                    <p>{a.resumen}</p>
                  </div>
                  <Link to={`/recursos/${a.idRecurso}`} className={styles.enlaceTexto}>
                    Leer artículo <IconoFlecha className={styles.flecha} />
                    <span className={styles.srOnly}>: {a.titulo}</span>
                  </Link>
                </Card>
              ))}
            </div>
            {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
            <Paginacion
              etiqueta="Páginas de artículos"
              total={articulos.data.paginacion.total}
              tamano={articulos.data.paginacion.porPagina}
              pagina={articulos.data.paginacion.pagina - 1}
              onCambiar={(p) => cambiarPagina('articulos', p + 1)}
            />
          </section>
        ) : null}

        {verBreves && breves.data && totalBreves > 0 ? (
          <section className={styles.recursosBreves} aria-labelledby="titulo-recursos-breves">
            <div>
              <h3 id="titulo-recursos-breves" className={styles.subtitulo}>
                Recursos breves
              </h3>
              <p>Guías reutilizables para llevar lo aprendido a una conversación real.</p>
            </div>
            <div>
              <ul
                className={[
                  styles.recursosEnlaces,
                  breves.isPlaceholderData ? styles.actualizando : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {breves.data.recursos.map((r) => (
                  <li key={r.idRecurso}>
                    <Link to={`/recursos/${r.idRecurso}`}>
                      <span className={styles.recursoBreveTexto}>
                        <span>{r.titulo}</span>
                        <span className={styles.recursoBreveMeta}>
                          {[etiquetaTipo(r.tipoRecurso), formatoDuracion(r.duracionMin)]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <IconoFlecha className={styles.flecha} />
                    </Link>
                  </li>
                ))}
              </ul>
              {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
              <Paginacion
                etiqueta="Páginas de recursos breves"
                total={breves.data.paginacion.total}
                tamano={breves.data.paginacion.porPagina}
                pagina={breves.data.paginacion.pagina - 1}
                onCambiar={(p) => cambiarPagina('breves', p + 1)}
              />
            </div>
          </section>
        ) : null}
      </section>

      <SeccionRutas />
    </div>
  )
}
