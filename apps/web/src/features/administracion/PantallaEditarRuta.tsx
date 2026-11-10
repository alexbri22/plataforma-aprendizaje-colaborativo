import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_NIVEL_CURSO,
  LARGO_MAXIMO_RUTA,
  MAX_CURSOS_RUTA,
  type EstatusRecurso,
} from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  Checkbox,
  IconoCargando,
  Input,
  Modal,
  Textarea,
} from '../../components/ui'
import {
  ErrorFormacion,
  useActualizarRuta,
  useCrearRuta,
  useEliminarRuta,
  useReemplazarCursosRuta,
  useRutaAdmin,
  type CursoDeRuta,
  type DatosRuta,
  type RutaAdmin,
} from '../formacion'
import { accionDe, type AvisoRuta } from './avisoContenido'
import { llevarA } from './llevarA'
import { ModalElegirCurso } from './ModalElegirCurso'
import { requisitosRuta } from './requisitosRuta'
import { varianteEstatus } from './varianteEstatus'
import styles from './PantallaEditarCurso.module.css'

interface Ficha {
  titulo: string
  finalidad: string
  descripcion: string
  destacada: boolean
}

const FICHA_VACIA: Ficha = { titulo: '', finalidad: '', descripcion: '', destacada: false }

function aFicha(r: RutaAdmin): Ficha {
  return {
    titulo: r.titulo,
    finalidad: r.finalidad,
    descripcion: r.descripcion,
    destacada: r.destacada,
  }
}

const CAMPOS: { campo: string; etiqueta: string }[] = [
  { campo: 'titulo', etiqueta: 'Título' },
  { campo: 'finalidad', etiqueta: 'Finalidad' },
  { campo: 'descripcion', etiqueta: 'Descripción' },
  { campo: 'cursos', etiqueta: 'Cursos' },
]

function irACampo(clave: string): boolean {
  const destino = document.getElementById(`campo-${clave}`)
  if (!destino) return false
  llevarA(destino)
  return true
}

type Confirmacion = { tipo: 'retirar' } | { tipo: 'eliminar' } | null

// Alta y edición de una ruta de aprendizaje (nota del incremento 4): la ficha
// y sus cursos a la izquierda; a la derecha lo que falta para publicar, lo que
// se calcula de los cursos y las acciones. Los cursos se guardan al momento;
// la ficha, con los botones. Las reglas las valida el servidor.
export function PantallaEditarRuta() {
  const { id } = useParams()
  const consulta = useRutaAdmin(id)
  const [recargas, setRecargas] = useState(0)

  if (id && !consulta.isFetchedAfterMount && !consulta.isError) {
    return (
      <AppShell seccionActiva="rutas" titulo="Editar ruta" volverA="/admin/rutas">
        <div role="status" aria-label="Cargando ruta">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (id && consulta.isError && !consulta.data) {
    return (
      <AppShell seccionActiva="rutas" titulo="Editar ruta" volverA="/admin/rutas">
        <AvisoError mensaje={consulta.error.message} />
      </AppShell>
    )
  }

  return (
    <Editor
      key={`${consulta.data?.idRuta ?? 'nueva'}-${recargas}`}
      ruta={consulta.data ?? null}
      onRecargar={async () => {
        await consulta.refetch()
        setRecargas((n) => n + 1)
      }}
    />
  )
}

function Editor({ ruta, onRecargar }: { ruta: RutaAdmin | null; onRecargar: () => Promise<void> }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ficha, setFicha] = useState<Ficha>(() => (ruta ? aFicha(ruta) : FICHA_VACIA))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(() => {
    const estado = location.state as { avisoEditor?: unknown } | null
    return typeof estado?.avisoEditor === 'string' ? estado.avisoEditor : null
  })
  const [volverA] = useState(() => {
    const estado = location.state as { volverA?: unknown } | null
    return typeof estado?.volverA === 'string' ? estado.volverA : ''
  })
  useEffect(() => {
    const estado = location.state as { avisoEditor?: unknown; volverA?: string } | null
    if (estado?.avisoEditor === undefined) return
    navigate(location.pathname, { replace: true, state: { volverA: estado.volverA } })
  }, [location.state, location.pathname, navigate])

  const [intentoFallido, setIntentoFallido] = useState(0)
  const [confirmar, setConfirmar] = useState<Confirmacion>(null)
  const [eligiendo, setEligiendo] = useState(false)
  const [desactualizado, setDesactualizado] = useState(false)
  // A diferencia de las lecciones, cambiar los cursos de una ruta sí mueve la
  // versión (reescribe la lista completa). Se lleva la versión de lo que este
  // editor guardó, para que sus propios cambios no parezcan de otro.
  const [version, setVersion] = useState(ruta?.versionFicha)
  const resumenRef = useRef<HTMLDivElement>(null)

  const idRuta = ruta?.idRuta ?? ''
  const crear = useCrearRuta()
  const actualizar = useActualizarRuta(idRuta)
  const ponerCursos = useReemplazarCursosRuta(idRuta)
  const eliminar = useEliminarRuta()
  const ocupado =
    crear.isPending || actualizar.isPending || ponerCursos.isPending || eliminar.isPending

  const estatus: EstatusRecurso | null = ruta?.estatus ?? null
  const cursos = ruta?.cursos ?? []
  const lleno = cursos.length >= MAX_CURSOS_RUTA
  const requisitos = requisitosRuta(ficha.finalidad, cursos)
  const clavesConError = CAMPOS.map((c) => c.campo).filter((clave) => clave in errores)

  useEffect(() => {
    if (intentoFallido === 0) return
    const primero = clavesConError[0]
    if (primero && irACampo(primero)) return
    resumenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    resumenRef.current?.focus({ preventScroll: true })
    // Solo tras un intento fallido, no con cada edición que limpia un error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentoFallido])

  function cambiar<K extends keyof Ficha>(campo: K, valor: Ficha[K]) {
    setFicha((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => {
      if (!(campo in e)) return e
      const copia = { ...e }
      delete copia[campo]
      return copia
    })
  }

  function limpiarMensajes() {
    setMensaje(null)
    setAviso(null)
    setErrores({})
  }

  function manejarError(error: unknown, quiso?: EstatusRecurso) {
    if (error instanceof ErrorFormacion && error.codigo === 'ruta_desactualizada') {
      setDesactualizado(true)
      window.scrollTo({ top: 0 })
      return
    }
    if (error instanceof ErrorFormacion) {
      setErrores(error.detallePorCampo ?? {})
      setMensaje(
        error.detallePorCampo
          ? quiso === 'publicado'
            ? 'No se pudo publicar porque faltan datos:'
            : 'No se pudo guardar. Revisa esto:'
          : error.message,
      )
    } else {
      setMensaje('Ocurrió un error inesperado.')
    }
    setIntentoFallido((n) => n + 1)
  }

  function volverALista(avisoRuta: AvisoRuta) {
    navigate(`/admin/rutas${volverA}`, { state: { avisoRuta } })
  }

  async function guardar(nuevoEstatus?: EstatusRecurso) {
    limpiarMensajes()
    const datos: Partial<DatosRuta> & { versionFicha?: number } = { ...ficha }
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    if (version !== undefined) datos.versionFicha = version
    try {
      if (!ruta) {
        // Se queda en el editor: lo siguiente es agregar los cursos.
        const creada = await crear.mutateAsync(datos)
        navigate(`/admin/rutas/${creada.idRuta}`, {
          replace: true,
          state: { avisoEditor: 'Ruta creada. Ahora agrega sus cursos.' },
        })
        return
      }
      const guardada = await actualizar.mutateAsync(datos)
      volverALista({
        idRuta: guardada.idRuta,
        titulo: guardada.titulo,
        accion: accionDe(ruta.estatus, guardada.estatus),
        estatus: guardada.estatus,
      })
    } catch (error) {
      manejarError(error, nuevoEstatus)
    }
  }

  async function guardarCursos(ids: string[], avisoExito: string, enfocar?: string) {
    limpiarMensajes()
    try {
      const guardada = await ponerCursos.mutateAsync({ cursos: ids, versionFicha: version })
      setVersion(guardada.versionFicha)
      setAviso(avisoExito)
      if (enfocar) {
        // Al reordenar se pierde el foco del botón; se devuelve para poder
        // seguir moviendo el mismo curso con el teclado.
        requestAnimationFrame(() => {
          const [delta, idCurso] = enfocar.split(':')
          const propio = document.getElementById(`mover-${delta}-${idCurso}`)
          const contrario = document.getElementById(`mover-${-Number(delta)}-${idCurso}`)
          const destino =
            propio instanceof HTMLButtonElement && !propio.disabled ? propio : contrario
          destino?.focus()
        })
      }
    } catch (error) {
      manejarError(error)
    }
  }

  function mover(curso: CursoDeRuta, delta: -1 | 1) {
    const ids = cursos.map((c) => c.idCurso)
    const i = ids.indexOf(curso.idCurso)
    ;[ids[i], ids[i + delta]] = [ids[i + delta], ids[i]]
    void guardarCursos(ids, 'Orden actualizado.', `${delta}:${curso.idCurso}`)
  }

  async function alConfirmar() {
    const accion = confirmar
    setConfirmar(null)
    if (accion?.tipo === 'retirar') {
      await guardar('retirado')
    } else if (accion?.tipo === 'eliminar' && ruta) {
      try {
        await eliminar.mutateAsync(ruta.idRuta)
        volverALista({
          idRuta: ruta.idRuta,
          titulo: ruta.titulo,
          accion: 'eliminado',
          estatus: null,
        })
      } catch (error) {
        manejarError(error)
      }
    }
  }

  return (
    <AppShell
      seccionActiva="rutas"
      titulo={ruta ? 'Editar ruta' : 'Nueva ruta'}
      volverA={`/admin/rutas${volverA}`}
    >
      <div className={styles.layout}>
        <div className={styles.principal}>
          {desactualizado ? (
            <div className={styles.resumenErrores} role="alert">
              <p className={styles.resumenErroresTitulo}>
                Otro administrador modificó esta ruta mientras la editabas.
              </p>
              <p className={styles.conflictoDetalle}>
                Tus cambios no se guardaron, para no borrar los suyos. Al cargar la versión actual
                se pierde lo que escribiste aquí.
              </p>
              <Button variant="secondary" size="sm" onClick={() => void onRecargar()}>
                Cargar la versión actual
              </Button>
            </div>
          ) : null}

          {mensaje ? (
            <div ref={resumenRef} tabIndex={-1} className={styles.resumenErrores} role="alert">
              <p className={styles.resumenErroresTitulo}>{mensaje}</p>
              {clavesConError.length > 0 ? (
                <ul>
                  {clavesConError.map((clave) => (
                    <li key={clave}>
                      <button type="button" onClick={() => irACampo(clave)}>
                        {CAMPOS.find((c) => c.campo === clave)?.etiqueta ?? clave}
                      </button>
                      : {errores[clave]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Card className={styles.seccion}>
            <h2>Ficha de la ruta</h2>
            <Input
              id="campo-titulo"
              label="Título"
              value={ficha.titulo}
              maxLength={LARGO_MAXIMO_RUTA.titulo}
              onChange={(e) => cambiar('titulo', e.target.value)}
              error={errores.titulo}
              required
            />
            <Textarea
              id="campo-finalidad"
              label="Finalidad: para qué sirve la ruta"
              value={ficha.finalidad}
              maxLength={LARGO_MAXIMO_RUTA.finalidad}
              onChange={(e) => cambiar('finalidad', e.target.value)}
              error={errores.finalidad}
              rows={2}
            />
            <Textarea
              id="campo-descripcion"
              label="Descripción (opcional)"
              value={ficha.descripcion}
              maxLength={LARGO_MAXIMO_RUTA.descripcion}
              onChange={(e) => cambiar('descripcion', e.target.value)}
              error={errores.descripcion}
              rows={4}
            />
            <Checkbox
              label="Ruta destacada: la que ve quien todavía no tiene recomendaciones. Marcarla desmarca la anterior."
              checked={ficha.destacada}
              onChange={(e) => cambiar('destacada', e.target.checked)}
            />
          </Card>

          {ruta ? (
            <Card className={styles.seccion}>
              <div className={styles.leccionesCabecera}>
                <div id="campo-cursos" tabIndex={-1}>
                  <h2>Cursos</h2>
                  <p className={styles.nota}>
                    {cursos.length} de {MAX_CURSOS_RUTA}. Se guardan al momento.
                  </p>
                </div>
                <div className={styles.leccionesAcciones}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={lleno || ocupado}
                    onClick={() => setEligiendo(true)}
                  >
                    Agregar curso
                  </Button>
                </div>
              </div>

              {aviso ? (
                <p className={styles.aviso} role="status">
                  {aviso}
                </p>
              ) : null}
              {errores.cursos ? <p className={styles.errorCampo}>{errores.cursos}</p> : null}

              {cursos.length === 0 ? (
                <div className={styles.sinLecciones}>
                  <p>Todavía no hay cursos.</p>
                  <p className={styles.nota}>
                    Elige de 2 a 5 cursos, del más básico al más avanzado.
                  </p>
                </div>
              ) : (
                <ol className={styles.lecciones}>
                  {cursos.map((c, i) => (
                    <li key={c.idCurso} className={styles.leccion}>
                      <span className={styles.numero}>{String(i + 1).padStart(2, '0')}</span>
                      <div className={styles.leccionTexto}>
                        <span className={styles.leccionTitulo}>{c.titulo}</span>
                        <span className={styles.nota}>
                          {[
                            c.nivel ? ETIQUETAS_NIVEL_CURSO[c.nivel] : null,
                            c.duracionMin ? `${c.duracionMin} min` : null,
                            c.elementos.map((e) => ETIQUETAS_ELEMENTO[e]).join(', ') || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {c.estatus !== 'publicado' ? (
                          <span className={styles.errorCampo}>
                            El curso está {ETIQUETAS_ESTATUS_RECURSO[c.estatus].toLowerCase()}
                            {c.estatus === 'retirado'
                              ? ': en la ruta se ve como no disponible.'
                              : ': publícalo antes de publicar la ruta.'}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.leccionBotones}>
                        <button
                          type="button"
                          id={`mover--1-${c.idCurso}`}
                          className={styles.botonIcono}
                          aria-label={`Subir curso ${i + 1}`}
                          disabled={i === 0 || ocupado}
                          onClick={() => mover(c, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          id={`mover-1-${c.idCurso}`}
                          className={styles.botonIcono}
                          aria-label={`Bajar curso ${i + 1}`}
                          disabled={i === cursos.length - 1 || ocupado}
                          onClick={() => mover(c, 1)}
                        >
                          ↓
                        </button>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Quitar curso ${i + 1}`}
                          disabled={ocupado}
                          onClick={() =>
                            void guardarCursos(
                              cursos.filter((x) => x.idCurso !== c.idCurso).map((x) => x.idCurso),
                              'Curso quitado de la ruta.',
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          ) : (
            <p className={styles.nota}>Crea la ruta para poder agregarle cursos.</p>
          )}
        </div>

        <aside className={styles.lateral} aria-label="Publicación de la ruta">
          <Card className={styles.seccion}>
            {estatus ? (
              <div className={styles.estatus}>
                <span>Estatus</span>
                <Badge variant={varianteEstatus(estatus)}>
                  {ETIQUETAS_ESTATUS_RECURSO[estatus]}
                </Badge>
              </div>
            ) : null}

            {ruta ? (
              <>
                <div>
                  <h2 className={styles.requisitosTitulo}>Para publicar</h2>
                  <ul className={styles.requisitos}>
                    {requisitos.map((r) => (
                      <li key={r.texto} className={r.cumplido ? styles.cumplido : undefined}>
                        <span aria-hidden="true">{r.cumplido ? '✓' : '○'}</span>
                        <span>
                          {r.texto}
                          <span className={styles.srOnly}>
                            {r.cumplido ? ': cumplido' : ': pendiente'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Lo que el recomendador ve de esta ruta: se calcula de sus cursos. */}
                <div>
                  <h2 className={styles.requisitosTitulo}>Calculado de los cursos</h2>
                  <p className={styles.nota}>
                    {[
                      ruta.derivado.nivelInicial
                        ? `Empieza en nivel ${ETIQUETAS_NIVEL_CURSO[ruta.derivado.nivelInicial].toLowerCase()}`
                        : null,
                      ruta.derivado.duracionMin ? `${ruta.derivado.duracionMin} min` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Agrega cursos publicados para calcularlo.'}
                  </p>
                  {ruta.derivado.elementos.length > 0 ? (
                    <ul className={styles.requisitos}>
                      {ruta.derivado.elementos.map((e) => (
                        <li key={e.elemento}>
                          <span>
                            {ETIQUETAS_ELEMENTO[e.elemento]}: {e.cursos}{' '}
                            {e.cursos === 1 ? 'curso' : 'cursos'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className={styles.acciones}>
              {estatus === null ? (
                <Button onClick={() => void guardar()} disabled={ocupado}>
                  Crear ruta
                </Button>
              ) : estatus === 'borrador' ? (
                <>
                  <Button onClick={() => void guardar('publicado')} disabled={ocupado}>
                    Publicar
                  </Button>
                  <Button variant="secondary" onClick={() => void guardar()} disabled={ocupado}>
                    Guardar borrador
                  </Button>
                </>
              ) : estatus === 'publicado' ? (
                <>
                  <Button onClick={() => void guardar()} disabled={ocupado}>
                    Guardar cambios
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmar({ tipo: 'retirar' })}
                    disabled={ocupado}
                  >
                    Retirar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => void guardar('publicado')} disabled={ocupado}>
                    Volver a publicar
                  </Button>
                  <Button variant="secondary" onClick={() => void guardar()} disabled={ocupado}>
                    Guardar cambios
                  </Button>
                </>
              )}
              {ruta ? (
                <Button
                  variant="danger"
                  onClick={() => setConfirmar({ tipo: 'eliminar' })}
                  disabled={ocupado}
                >
                  Eliminar
                </Button>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>

      {eligiendo ? (
        <ModalElegirCurso
          idsEnRuta={cursos.map((c) => c.idCurso)}
          onCerrar={() => setEligiendo(false)}
          onElegir={(idCurso) => {
            setEligiendo(false)
            void guardarCursos([...cursos.map((c) => c.idCurso), idCurso], 'Curso agregado.')
          }}
        />
      ) : null}

      <Modal
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar?.tipo === 'eliminar' ? '¿Eliminar esta ruta?' : '¿Retirar esta ruta?'}
        descripcion={
          confirmar?.tipo === 'eliminar'
            ? `«${ficha.titulo}» se eliminará definitivamente. Sus cursos y el avance de quien los tomó no se tocan. No se puede deshacer.`
            : `«${ficha.titulo}» dejará de recomendarse. Podrás volver a publicarla después.`
        }
      >
        <div className={styles.accionesModal}>
          <Button variant="secondary" onClick={() => setConfirmar(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmar?.tipo === 'retirar' ? 'primary' : 'danger'}
            onClick={() => void alConfirmar()}
          >
            {confirmar?.tipo === 'eliminar' ? 'Eliminar definitivamente' : 'Retirar'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
