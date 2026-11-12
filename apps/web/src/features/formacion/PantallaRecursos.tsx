import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AREAS_HABILIDAD,
  ETIQUETAS_AREA,
  ELEMENTOS_COLABORACION,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_NIVEL_CURSO,
  ETIQUETAS_SECCION,
  NIVELES_CURSO,
  SECCIONES_FORMATIVAS,
  TIPOS_LECTURA,
  TIPOS_RECURSO,
  type AreaHabilidad,
  type ElementoColaboracion,
  type NivelCurso,
  type SeccionFormativa,
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
import { useSesion } from '../cuentas'
import { BarraProgreso } from './BarraProgreso'
import type { MiCurso } from './formacion.api'
import { etiquetaTipo, formatoDuracion, textoProgreso } from './formato'
import { IconoFlecha, IconoLibro } from './iconos'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { SeccionRutas } from './SeccionRutas'
import { useCursosPublicos } from './useCursos'
import { useHayRutas } from './useRutas'
import { useMiFormacion } from './useProgreso'
import { useRecursosPublicos } from './useRecursos'
import { useValorDiferido } from './useValorDiferido'
import styles from './PantallaRecursos.module.css'

type FiltroArea = 'todas' | AreaHabilidad
type FiltroSeccion = 'todas' | SeccionFormativa

// Artículos y recursos breves se piden por separado y cada lista tiene su
// propia paginación.
const TIPOS_BREVES = TIPOS_RECURSO.filter((t) => !TIPOS_LECTURA.includes(t))
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
  const [seccion, setSeccion] = useState<FiltroSeccion>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState<'' | NivelCurso>('')
  const [elemento, setElemento] = useState<'' | ElementoColaboracion>('')

  const texto = useValorDiferido(busqueda.trim())
  const filtros = {
    area: area === 'todas' ? undefined : area,
    seccion: seccion === 'todas' ? undefined : seccion,
    texto: texto || undefined,
  }

  // Las páginas se recuerdan junto con los filtros con que se eligieron: si
  // los filtros cambian, las listas vuelven solas a su primera página.
  const claveFiltros = JSON.stringify({ ...filtros, nivel, elemento })
  const inicio = { cursos: 1, articulos: 1, breves: 1 }
  const [paginas, setPaginas] = useState({ clave: claveFiltros, ...inicio })
  const vigentes = paginas.clave === claveFiltros ? paginas : inicio
  const paginaCursos = vigentes.cursos
  const paginaArticulos = vigentes.articulos
  const paginaBreves = vigentes.breves

  const cursos = useCursosPublicos({
    area: filtros.area,
    texto: filtros.texto,
    nivel: nivel || undefined,
    elemento: elemento || undefined,
    pagina: paginaCursos,
    porPagina: POR_PAGINA_CURSOS,
  })

  const articulos = useRecursosPublicos({
    ...filtros,
    tipos: TIPOS_LECTURA,
    pagina: paginaArticulos,
    porPagina: POR_PAGINA_ARTICULOS,
  })
  const breves = useRecursosPublicos({
    ...filtros,
    tipos: TIPOS_BREVES,
    pagina: paginaBreves,
    porPagina: POR_PAGINA_BREVES,
  })
  // Si el catálogo se reduce mientras se ve una página que ya no existe (se
  // retiraron recursos y se volvió a pedir la lista), la API devuelve esa
  // página vacía y Paginacion se oculta cuando todo cabe en una: sin esto no
  // habría forma de volver a los resultados. Se lleva a la última página que
  // sí existe. Solo con una respuesta real (no la anterior que se sigue
  // mostrando mientras llega la nueva), para no saltar a destiempo. Es un
  // ajuste de estado durante el render, que React permite y repite antes de
  // pintar; se detiene en cuanto la página pedida ya es válida.
  const ajuste = { cursos: paginaCursos, articulos: paginaArticulos, breves: paginaBreves }
  for (const [lista, consulta] of [
    ['cursos', cursos],
    ['articulos', articulos],
    ['breves', breves],
  ] as const) {
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

  // "Empieza por aquí": el primer artículo de Qué es colaborar, sin filtros.
  // Con sesión y un curso a medias, en su lugar va "Continúa aprendiendo"
  // con el que se tocó más recientemente. Mientras se sabe, la tarjeta
  // espera, para no mostrar una y cambiarla por la otra.
  const destacado = useRecursosPublicos({
    seccion: 'que_es_colaborar',
    tipos: TIPOS_LECTURA,
    porPagina: 1,
  })
  const inicial = destacado.data?.recursos[0]
  const { usuario } = useSesion()
  const hayRutas = useHayRutas()
  const miFormacion = useMiFormacion()
  const enCurso = miFormacion.data?.enCurso.find((c) => c.siguiente !== null)
  const esperandoProgreso = usuario !== null && miFormacion.isPending

  // Los cursos no pertenecen a una sección: elegir una los oculta.
  const totalCursos = seccion === 'todas' ? (cursos.data?.paginacion.total ?? 0) : 0
  const hayFiltrosDeCurso = nivel !== '' || elemento !== ''
  const mostrarCursos = seccion === 'todas' && (totalCursos > 0 || hayFiltrosDeCurso)

  const totalArticulos = articulos.data?.paginacion.total ?? 0
  const totalBreves = breves.data?.paginacion.total ?? 0
  const cargando = cursos.isPending || articulos.isPending || breves.isPending
  const error = cursos.error ?? articulos.error ?? breves.error
  const hayFiltros = area !== 'todas' || seccion !== 'todas' || texto !== '' || hayFiltrosDeCurso
  const sinResultados =
    cursos.isSuccess &&
    articulos.isSuccess &&
    breves.isSuccess &&
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
    setSeccion('todas')
    setBusqueda('')
    setNivel('')
    setElemento('')
  }

  return (
    <div
      className={[styles.centro, dentroDeApp ? styles.centroEnApp : null].filter(Boolean).join(' ')}
    >
      <section className={styles.presentacion} aria-labelledby="titulo-centro-formacion">
        <div className={styles.presentacionTexto}>
          <p className={styles.eyebrow}>Recursos</p>
          <Titulo id="titulo-centro-formacion" className={styles.tituloPrincipal}>
            Mejora la forma en que colaboras
          </Titulo>
          <p className={styles.lede}>
            Cursos breves y recursos prácticos para comunicarte mejor, organizar el trabajo,
            documentar acuerdos, resolver decisiones y negociar con otras personas; entre otras
            habilidades vinculadas con la colaboración y el aprendizaje colaborativo.
          </p>
          <div className={styles.presentacionAcciones}>
            <Button onClick={() => irA('#catalogo')}>Explorar recursos</Button>
            {hayRutas ? (
              <Button variant="secondary" onClick={() => irA('#ruta-destacada')}>
                Ver rutas de aprendizaje
              </Button>
            ) : null}
          </div>
        </div>

        {enCurso ? (
          <TarjetaContinuar curso={enCurso} />
        ) : inicial && !esperandoProgreso ? (
          <Card className={styles.destacado}>
            <div className={styles.destacadoCabecera}>
              <span className={styles.iconoCurso}>
                <IconoLibro />
              </span>
              <div>
                <p className={styles.sobretituloTarjeta}>Empieza por aquí</p>
                <h2>{inicial.titulo}</h2>
              </div>
            </div>
            <p className={styles.destacadoDescripcion}>{inicial.resumen}</p>
            <div className={styles.destacadoPie}>
              <span>
                {[
                  etiquetaTipo(inicial.tipoRecurso),
                  formatoDuracion(inicial.duracionMin, inicial.tipoRecurso),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <Button size="sm" to={`/recursos/${inicial.idRecurso}`}>
                Leer ahora
              </Button>
            </div>
          </Card>
        ) : null}
      </section>

      <SeccionRutas />

      <section id="catalogo" className={styles.catalogo} aria-labelledby="titulo-catalogo">
        <div className={styles.catalogoCabecera}>
          <div>
            <p className={styles.eyebrow}>Catálogo</p>
            <h2 id="titulo-catalogo">Aprende a tu ritmo</h2>
            <p>Elige una habilidad y llévala a una situación real de colaboración.</p>
          </div>
          <div className={styles.controles}>
            <Select
              label="Sección"
              value={seccion}
              onChange={(e) => setSeccion(e.target.value as FiltroSeccion)}
            >
              <option value="todas">Todas</option>
              {SECCIONES_FORMATIVAS.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETAS_SECCION[s]}
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
                void cursos.refetch()
                void articulos.refetch()
                void breves.refetch()
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
      </section>

      {articulos.data && totalArticulos > 0 ? (
        <section className={styles.articulos} aria-labelledby="titulo-articulos">
          <div className={styles.articulosCabecera}>
            <p className={styles.eyebrow}>Lectura</p>
            <h2 id="titulo-articulos">Artículos</h2>
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
                  <h3>{a.titulo}</h3>
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

      {breves.data && totalBreves > 0 ? (
        <section className={styles.recursosBreves} aria-labelledby="titulo-recursos-breves">
          <div>
            <p className={styles.eyebrow}>Para usar en el momento</p>
            <h2 id="titulo-recursos-breves">Recursos breves</h2>
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
    </div>
  )
}

/** La tarjeta del hero con el curso a medias (diseño V1: con su barra). */
function TarjetaContinuar({ curso }: { curso: MiCurso }) {
  const siguiente = curso.siguiente
  if (!siguiente) return null
  return (
    <Card className={styles.destacado}>
      <div className={styles.destacadoCabecera}>
        <span className={styles.iconoCurso}>
          <IconoLibro />
        </span>
        <div>
          <p className={styles.sobretituloTarjeta}>Continúa aprendiendo</p>
          <h2>{curso.titulo}</h2>
        </div>
      </div>
      <div className={styles.continuarAvance}>
        <BarraProgreso porcentaje={curso.porcentaje} etiqueta={`Progreso en ${curso.titulo}`} />
        <p>{textoProgreso(curso)}</p>
      </div>
      <p className={styles.destacadoDescripcion}>Sigue con: {siguiente.titulo}</p>
      <div className={styles.destacadoPie}>
        <Link to="/mi-formacion" className={styles.enlaceTarjeta}>
          Ver mis cursos
        </Link>
        <Button size="sm" to={`/cursos/${curso.idCurso}/lecciones/${siguiente.idLeccion}`}>
          Seguir
        </Button>
      </div>
    </Card>
  )
}
