import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AREAS_HABILIDAD,
  ELEMENTOS_COLABORACION,
  ETIQUETAS_AREA,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_NIVEL_CURSO,
  LARGO_MAXIMO_CURSO,
  MAX_LECCIONES_CURSO,
  NIVELES_CURSO,
  type AreaHabilidad,
  type ElementoColaboracion,
  type EstatusCurso,
  type NivelCurso,
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
  Select,
  Textarea,
} from '../../components/ui'
import {
  ErrorFormacion,
  etiquetaLeccion,
  useActualizarCurso,
  useActualizarLeccion,
  useAgregarLeccion,
  useCrearCurso,
  useCursoAdmin,
  useEliminarCurso,
  useEliminarLeccion,
  useReordenarLecciones,
  type CursoAdmin,
  type DatosCurso,
  type DatosLeccion,
  type LeccionAdmin,
} from '../formacion'
import { accionDe, type AvisoCurso } from './avisoContenido'
import { llevarA } from './llevarA'
import { ModalElegirRecurso } from './ModalElegirRecurso'
import { ModalLeccion } from './ModalLeccion'
import { requisitosParaPublicar } from './requisitosCurso'
import { varianteEstatus } from './varianteEstatus'
import styles from './PantallaEditarCurso.module.css'

interface Ficha {
  titulo: string
  resumen: string
  objetivo: string
  practicaFinal: string
  area: AreaHabilidad | null
  nivel: NivelCurso | null
  elementos: ElementoColaboracion[]
}

const FICHA_VACIA: Ficha = {
  titulo: '',
  resumen: '',
  objetivo: '',
  practicaFinal: '',
  area: null,
  nivel: null,
  elementos: [],
}

function aFicha(c: CursoAdmin): Ficha {
  return {
    titulo: c.titulo,
    resumen: c.resumen,
    objetivo: c.objetivo,
    practicaFinal: c.practicaFinal,
    area: c.area,
    nivel: c.nivel,
    elementos: c.elementos,
  }
}

// En el orden del formulario: el primero con error es al que se lleva el foco.
const CAMPOS_FICHA: { campo: keyof Ficha; etiqueta: string }[] = [
  { campo: 'titulo', etiqueta: 'Título' },
  { campo: 'resumen', etiqueta: 'Resumen' },
  { campo: 'objetivo', etiqueta: 'Objetivo' },
  { campo: 'practicaFinal', etiqueta: 'Resultado práctico' },
  { campo: 'area', etiqueta: 'Área de habilidad' },
  { campo: 'nivel', etiqueta: 'Nivel' },
  { campo: 'elementos', etiqueta: 'Elementos de colaboración' },
]

const CLAVE_LECCION = 'lecciones.'

function idDeLeccion(clave: string): string | null {
  return clave.startsWith(CLAVE_LECCION) ? clave.slice(CLAVE_LECCION.length) : null
}

function irACampo(clave: string): boolean {
  const idLeccion = idDeLeccion(clave)
  const destino = document.getElementById(idLeccion ? `leccion-${idLeccion}` : `campo-${clave}`)
  if (!destino) return false
  llevarA(destino)
  return true
}

function nombreDeLeccion(l: LeccionAdmin): string {
  return l.titulo || l.recurso?.titulo || 'Sin título'
}

type Confirmacion =
  | { tipo: 'retirar' }
  | { tipo: 'eliminar' }
  | { tipo: 'quitarLeccion'; leccion: LeccionAdmin }
  | null

type ModalAbierto = { tipo: 'recurso' } | { tipo: 'leccion'; leccion: LeccionAdmin | null } | null

// Alta y edición de un curso (§2.4 y §12.3 de
// docs/diseno-desarrollo-formacion.md): la ficha a la izquierda con sus
// lecciones, y a la derecha lo que falta para publicar y las acciones, que
// siempre quedan a la vista. Las lecciones se guardan al momento; la ficha,
// con los botones. Las reglas las valida el servidor.
export function PantallaEditarCurso() {
  const { id } = useParams()
  const consulta = useCursoAdmin(id)

  if (id && consulta.isPending) {
    return (
      <AppShell seccionActiva="cursos" titulo="Editar curso" volverA="/admin/cursos">
        <div role="status" aria-label="Cargando curso">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (id && consulta.isError) {
    return (
      <AppShell seccionActiva="cursos" titulo="Editar curso" volverA="/admin/cursos">
        <AvisoError mensaje={consulta.error.message} />
      </AppShell>
    )
  }

  // key: al pasar de "nuevo" al curso ya creado, el editor remonta con él.
  return <Editor key={consulta.data?.idCurso ?? 'nuevo'} curso={consulta.data ?? null} />
}

function Editor({ curso }: { curso: CursoAdmin | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ficha, setFicha] = useState<Ficha>(() => (curso ? aFicha(curso) : FICHA_VACIA))
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
  // El aviso ya se copió: se quita del historial para que no reaparezca al
  // recargar, conservando a qué página de la lista volver.
  useEffect(() => {
    const estado = location.state as { avisoEditor?: unknown; volverA?: string } | null
    if (estado?.avisoEditor === undefined) return
    navigate(location.pathname, { replace: true, state: { volverA: estado.volverA } })
  }, [location.state, location.pathname, navigate])

  const [intentoFallido, setIntentoFallido] = useState(0)
  const [confirmar, setConfirmar] = useState<Confirmacion>(null)
  const [modal, setModal] = useState<ModalAbierto>(null)
  const resumenRef = useRef<HTMLDivElement>(null)

  const idCurso = curso?.idCurso ?? ''
  const crear = useCrearCurso()
  const actualizar = useActualizarCurso(idCurso)
  const eliminar = useEliminarCurso()
  const agregarLeccion = useAgregarLeccion(idCurso)
  const actualizarLeccion = useActualizarLeccion(idCurso)
  const eliminarLeccion = useEliminarLeccion(idCurso)
  const reordenar = useReordenarLecciones(idCurso)
  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    eliminar.isPending ||
    agregarLeccion.isPending ||
    actualizarLeccion.isPending ||
    eliminarLeccion.isPending ||
    reordenar.isPending

  const estatus: EstatusCurso | null = curso?.estatus ?? null
  const lecciones = curso?.lecciones ?? []
  const lleno = lecciones.length >= MAX_LECCIONES_CURSO
  const requisitos = requisitosParaPublicar(ficha, lecciones)

  // En el orden del formulario, no en el de la respuesta del servidor.
  const ordenDeClaves = [
    ...CAMPOS_FICHA.map((c) => c.campo as string),
    'lecciones',
    ...lecciones.map((l) => `${CLAVE_LECCION}${l.idLeccion}`),
  ]
  const clavesConError = ordenDeClaves.filter((clave) => clave in errores)

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

  function alternarElemento(elemento: ElementoColaboracion) {
    cambiar(
      'elementos',
      ficha.elementos.includes(elemento)
        ? ficha.elementos.filter((e) => e !== elemento)
        : ELEMENTOS_COLABORACION.filter((e) => e === elemento || ficha.elementos.includes(e)),
    )
  }

  function limpiarMensajes() {
    setMensaje(null)
    setAviso(null)
    setErrores({})
  }

  function manejarError(error: unknown, quiso?: EstatusCurso) {
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

  function volverALista(avisoCurso: AvisoCurso) {
    navigate(`/admin/cursos${volverA}`, { state: { avisoCurso } })
  }

  async function guardar(nuevoEstatus?: EstatusCurso) {
    limpiarMensajes()
    const datos: Partial<DatosCurso> = { ...ficha }
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    try {
      if (!curso) {
        // Se queda en el editor: lo siguiente es agregar las lecciones.
        const creado = await crear.mutateAsync(datos)
        navigate(`/admin/cursos/${creado.idCurso}`, {
          replace: true,
          state: { avisoEditor: 'Curso creado. Ahora agrega sus lecciones.' },
        })
        return
      }
      const guardado = await actualizar.mutateAsync(datos)
      volverALista({
        idCurso: guardado.idCurso,
        titulo: guardado.titulo,
        accion: accionDe(curso.estatus, guardado.estatus),
        estatus: guardado.estatus,
      })
    } catch (error) {
      manejarError(error, nuevoEstatus)
    }
  }

  async function operarLeccion(operacion: () => Promise<unknown>, avisoExito: string) {
    limpiarMensajes()
    try {
      await operacion()
      setAviso(avisoExito)
    } catch (error) {
      manejarError(error)
    }
  }

  async function alGuardarLeccion(datos: Partial<DatosLeccion>) {
    if (modal?.tipo !== 'leccion') return
    limpiarMensajes()
    // Los errores se muestran dentro del modal, junto a cada campo.
    if (modal.leccion) {
      await actualizarLeccion.mutateAsync({ idLeccion: modal.leccion.idLeccion, cambios: datos })
      setAviso('Lección guardada.')
    } else {
      await agregarLeccion.mutateAsync(datos)
      setAviso('Lección agregada.')
    }
    setModal(null)
  }

  async function alElegirRecurso(idRecurso: string) {
    setModal(null)
    await operarLeccion(
      () => agregarLeccion.mutateAsync({ tipo: 'recurso', idRecurso }),
      'Recurso agregado como lección.',
    )
  }

  async function mover(leccion: LeccionAdmin, delta: -1 | 1) {
    const ids = lecciones.map((l) => l.idLeccion)
    const i = ids.indexOf(leccion.idLeccion)
    ;[ids[i], ids[i + delta]] = [ids[i + delta], ids[i]]
    await operarLeccion(() => reordenar.mutateAsync(ids), 'Orden actualizado.')
    // Al reordenar, el navegador pierde el foco del botón; se devuelve para
    // poder seguir moviendo la misma lección con el teclado. Si llegó a un
    // extremo ese botón ya no aplica y se usa el contrario.
    requestAnimationFrame(() => {
      const propio = document.getElementById(`mover-${delta}-${leccion.idLeccion}`)
      const contrario = document.getElementById(`mover-${-delta}-${leccion.idLeccion}`)
      const destino = propio instanceof HTMLButtonElement && !propio.disabled ? propio : contrario
      destino?.focus()
    })
  }

  async function alConfirmar() {
    const accion = confirmar
    setConfirmar(null)
    if (accion?.tipo === 'retirar') {
      await guardar('retirado')
    } else if (accion?.tipo === 'quitarLeccion') {
      await operarLeccion(
        () => eliminarLeccion.mutateAsync(accion.leccion.idLeccion),
        'Lección quitada.',
      )
    } else if (accion?.tipo === 'eliminar' && curso) {
      try {
        await eliminar.mutateAsync(curso.idCurso)
        volverALista({
          idCurso: curso.idCurso,
          titulo: curso.titulo,
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
      seccionActiva="cursos"
      titulo={curso ? 'Editar curso' : 'Nuevo curso'}
      volverA={`/admin/cursos${volverA}`}
      acciones={
        estatus === 'publicado' && curso ? (
          <Button variant="secondary" size="sm" to={`/cursos/${curso.idCurso}`}>
            Ver publicado
          </Button>
        ) : undefined
      }
    >
      <div className={styles.layout}>
        <div className={styles.principal}>
          {mensaje ? (
            <div ref={resumenRef} tabIndex={-1} className={styles.resumenErrores} role="alert">
              <p className={styles.resumenErroresTitulo}>{mensaje}</p>
              {clavesConError.length > 0 ? (
                <ul>
                  {clavesConError.map((clave) => {
                    const idLeccion = idDeLeccion(clave)
                    const leccion = lecciones.find((l) => l.idLeccion === idLeccion)
                    const etiqueta = leccion
                      ? `Lección ${leccion.orden + 1}`
                      : clave === 'lecciones'
                        ? 'Lecciones'
                        : (CAMPOS_FICHA.find((c) => c.campo === clave)?.etiqueta ?? clave)
                    return (
                      <li key={clave}>
                        <button type="button" onClick={() => irACampo(clave)}>
                          {etiqueta}
                        </button>
                        : {errores[clave]}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
          <Card className={styles.seccion}>
            <h2>Ficha del curso</h2>
            <Input
              id="campo-titulo"
              label="Título"
              value={ficha.titulo}
              maxLength={LARGO_MAXIMO_CURSO.titulo}
              onChange={(e) => cambiar('titulo', e.target.value)}
              error={errores.titulo}
              required
            />
            <Textarea
              id="campo-resumen"
              label="Resumen"
              value={ficha.resumen}
              maxLength={LARGO_MAXIMO_CURSO.resumen}
              onChange={(e) => cambiar('resumen', e.target.value)}
              error={errores.resumen}
              rows={2}
            />
            <Textarea
              id="campo-objetivo"
              label="Objetivo: qué va a aprender la persona"
              value={ficha.objetivo}
              maxLength={LARGO_MAXIMO_CURSO.objetivo}
              onChange={(e) => cambiar('objetivo', e.target.value)}
              error={errores.objetivo}
              rows={2}
            />
            <Textarea
              id="campo-practicaFinal"
              label="Resultado práctico: qué se lleva al terminar"
              value={ficha.practicaFinal}
              maxLength={LARGO_MAXIMO_CURSO.practicaFinal}
              onChange={(e) => cambiar('practicaFinal', e.target.value)}
              error={errores.practicaFinal}
              rows={2}
            />
            <div className={styles.fila}>
              <Select
                id="campo-area"
                label="Área de habilidad"
                value={ficha.area ?? ''}
                onChange={(e) => cambiar('area', (e.target.value || null) as Ficha['area'])}
                error={errores.area}
              >
                <option value="">Sin área</option>
                {AREAS_HABILIDAD.map((a) => (
                  <option key={a} value={a}>
                    {ETIQUETAS_AREA[a]}
                  </option>
                ))}
              </Select>
              <Select
                id="campo-nivel"
                label="Nivel"
                value={ficha.nivel ?? ''}
                onChange={(e) => cambiar('nivel', (e.target.value || null) as Ficha['nivel'])}
                error={errores.nivel}
              >
                <option value="">Sin nivel</option>
                {NIVELES_CURSO.map((n) => (
                  <option key={n} value={n}>
                    {ETIQUETAS_NIVEL_CURSO[n]}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset id="campo-elementos" className={styles.elementos}>
              <legend>Elementos de colaboración</legend>
              {ELEMENTOS_COLABORACION.map((e) => (
                <Checkbox
                  key={e}
                  label={ETIQUETAS_ELEMENTO[e]}
                  checked={ficha.elementos.includes(e)}
                  onChange={() => alternarElemento(e)}
                />
              ))}
              {errores.elementos ? <p className={styles.errorCampo}>{errores.elementos}</p> : null}
            </fieldset>
          </Card>

          {curso ? (
            <Card className={styles.seccion}>
              <div className={styles.leccionesCabecera}>
                <div id="campo-lecciones" tabIndex={-1}>
                  <h2>Lecciones</h2>
                  <p className={styles.nota}>
                    {lecciones.length} de {MAX_LECCIONES_CURSO}
                    {curso.duracionMin ? ` · ${curso.duracionMin} min en total` : ''}. Se guardan al
                    momento.
                  </p>
                </div>
                <div className={styles.leccionesAcciones}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={lleno || ocupado}
                    onClick={() => setModal({ tipo: 'recurso' })}
                  >
                    Agregar recurso
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={lleno || ocupado}
                    onClick={() => setModal({ tipo: 'leccion', leccion: null })}
                  >
                    Escribir lección
                  </Button>
                </div>
              </div>

              {/* Aquí y no arriba: las lecciones están donde está la atención. */}
              {aviso ? (
                <p className={styles.aviso} role="status">
                  {aviso}
                </p>
              ) : null}
              {errores.lecciones ? <p className={styles.errorCampo}>{errores.lecciones}</p> : null}

              {lecciones.length === 0 ? (
                <div className={styles.sinLecciones}>
                  <p>Todavía no hay lecciones.</p>
                  <p className={styles.nota}>
                    Reutiliza recursos de la biblioteca y escribe la práctica y la reflexión del
                    curso.
                  </p>
                </div>
              ) : (
                <ol className={styles.lecciones}>
                  {lecciones.map((l, i) => {
                    const error = errores[`${CLAVE_LECCION}${l.idLeccion}`]
                    const recursoCaido = l.recurso && l.recurso.estatus !== 'publicado'
                    return (
                      <li
                        key={l.idLeccion}
                        id={`leccion-${l.idLeccion}`}
                        tabIndex={-1}
                        className={[styles.leccion, error ? styles.leccionConError : null]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className={styles.numero}>{String(i + 1).padStart(2, '0')}</span>
                        <div className={styles.leccionTexto}>
                          <span className={styles.leccionTitulo}>{nombreDeLeccion(l)}</span>
                          <span className={styles.nota}>
                            {[
                              etiquetaLeccion({
                                tipo: l.tipo,
                                tipoRecurso: l.recurso?.tipoRecurso,
                              }),
                              l.duracionEfectivaMin ? `${l.duracionEfectivaMin} min` : null,
                              l.obligatoria ? null : 'Opcional',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          {recursoCaido ? (
                            <span className={styles.errorCampo}>
                              El recurso está{' '}
                              {ETIQUETAS_ESTATUS_RECURSO[l.recurso!.estatus].toLowerCase()}: esta
                              lección se ve como no disponible.
                            </span>
                          ) : null}
                          {error ? <span className={styles.errorCampo}>{error}</span> : null}
                        </div>
                        <div className={styles.leccionBotones}>
                          <button
                            type="button"
                            id={`mover--1-${l.idLeccion}`}
                            className={styles.botonIcono}
                            aria-label={`Subir lección ${i + 1}`}
                            disabled={i === 0 || ocupado}
                            onClick={() => void mover(l, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            id={`mover-1-${l.idLeccion}`}
                            className={styles.botonIcono}
                            aria-label={`Bajar lección ${i + 1}`}
                            disabled={i === lecciones.length - 1 || ocupado}
                            onClick={() => void mover(l, 1)}
                          >
                            ↓
                          </button>
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label={`Editar lección ${i + 1}`}
                            disabled={ocupado}
                            onClick={() => setModal({ tipo: 'leccion', leccion: l })}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label={`Quitar lección ${i + 1}`}
                            disabled={ocupado}
                            onClick={() => setConfirmar({ tipo: 'quitarLeccion', leccion: l })}
                          >
                            Quitar
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </Card>
          ) : (
            <p className={styles.nota}>Crea el curso para poder agregarle lecciones.</p>
          )}
        </div>

        <aside className={styles.lateral} aria-label="Publicación del curso">
          <Card className={styles.seccion}>
            {estatus ? (
              <div className={styles.estatus}>
                <span>Estatus</span>
                <Badge variant={varianteEstatus(estatus)}>
                  {ETIQUETAS_ESTATUS_RECURSO[estatus]}
                </Badge>
              </div>
            ) : null}

            {curso ? (
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
            ) : null}

            <div className={styles.acciones}>
              {estatus === null ? (
                <Button onClick={() => void guardar()} disabled={ocupado}>
                  Crear curso
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
              {curso ? (
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

      {modal?.tipo === 'recurso' ? (
        <ModalElegirRecurso
          idsEnCurso={lecciones.flatMap((l) => (l.recurso ? [l.recurso.idRecurso] : []))}
          onElegir={(id) => void alElegirRecurso(id)}
          onCerrar={() => setModal(null)}
        />
      ) : null}

      {modal?.tipo === 'leccion' ? (
        <ModalLeccion
          leccion={modal.leccion}
          onGuardar={alGuardarLeccion}
          onCerrar={() => setModal(null)}
        />
      ) : null}

      <Modal
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={
          confirmar?.tipo === 'eliminar'
            ? '¿Eliminar este curso?'
            : confirmar?.tipo === 'retirar'
              ? '¿Retirar este curso?'
              : '¿Quitar esta lección?'
        }
        descripcion={
          confirmar?.tipo === 'eliminar'
            ? `«${ficha.titulo}» y sus lecciones se eliminarán definitivamente. Los recursos que usa siguen en la biblioteca. No se puede deshacer.`
            : confirmar?.tipo === 'retirar'
              ? `«${ficha.titulo}» dejará de aparecer en Recursos. Podrás volver a publicarlo después.`
              : confirmar?.tipo === 'quitarLeccion'
                ? confirmar.leccion.tipo === 'recurso'
                  ? `«${nombreDeLeccion(confirmar.leccion)}» sale del curso. El recurso sigue en la biblioteca.`
                  : `«${nombreDeLeccion(confirmar.leccion)}» se borrará, junto con lo que escribiste en ella.`
                : undefined
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
            {confirmar?.tipo === 'eliminar'
              ? 'Eliminar definitivamente'
              : confirmar?.tipo === 'retirar'
                ? 'Retirar'
                : 'Quitar'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
