import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
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
import { AppShell } from '../../../components/AppShell'
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
} from '../../../components/ui'
import {
  ErrorFormacion,
  type CursoAdmin,
  type DatosCurso,
  type DatosLeccion,
  type LeccionAdmin,
  type PropuestaCurso,
} from '../formacion.api'
import { etiquetaLeccion } from '../formato'
import {
  useActualizarCurso,
  useActualizarLeccion,
  useAgregarLeccion,
  useCrearCurso,
  useCursoAdmin,
  useEliminarCurso,
  useEliminarLeccion,
  useReordenarLecciones,
} from '../useCursos'
import {
  useActualizarLeccionPropuesta,
  useActualizarPropuestaCurso,
  useAgregarLeccionPropuesta,
  useCancelarEnvio,
  useCrearPropuestaCurso,
  useEliminarLeccionPropuesta,
  useEliminarPropuesta,
  useEnviarPropuesta,
  usePropuestaCurso,
  useReordenarLeccionesPropuesta,
} from '../usePropuestas'
import { accionDe, type AvisoCurso } from './avisoContenido'
import { AvisoRevision, NotaAutoria } from './AvisoRevision'
import { llevarA } from './llevarA'
import { ModalElegirRecurso } from './ModalElegirRecurso'
import { ModalLeccion } from './ModalLeccion'
import { esSoloLectura, type ModoEditor } from './modoEditor'
import { requisitosParaPublicar } from './requisitosCurso'
import { varianteEstatus } from './varianteEstatus'
import { VistaPreviaCurso } from './VistaPrevia'
import styles from './EditorCurso.module.css'

/** Lo que el editor necesita de una mutación: la misma forma en los dos modos. */
interface Mutacion<V, R> {
  mutateAsync: (variables: V) => Promise<R>
  isPending: boolean
}

type Curso = CursoAdmin | PropuestaCurso

/** Las llamadas del editor según su modo (ver EditorRecurso). */
interface HooksCurso {
  useCurso: (id: string | undefined) => UseQueryResult<Curso>
  useCrear: () => Mutacion<Partial<DatosCurso>, Curso>
  useActualizar: (id: string) => Mutacion<Partial<DatosCurso> & { versionFicha?: number }, Curso>
  useEliminar: () => Mutacion<string, void>
  useAgregarLeccion: (id: string) => Mutacion<Partial<DatosLeccion>, Curso>
  useActualizarLeccion: (
    id: string,
  ) => Mutacion<{ idLeccion: string; cambios: Partial<DatosLeccion> }, Curso>
  useEliminarLeccion: (id: string) => Mutacion<string, Curso>
  useReordenar: (id: string) => Mutacion<string[], Curso>
}

const HOOKS: Record<ModoEditor, HooksCurso> = {
  admin: {
    useCurso: useCursoAdmin,
    useCrear: useCrearCurso,
    useActualizar: useActualizarCurso,
    useEliminar: useEliminarCurso,
    useAgregarLeccion: useAgregarLeccion,
    useActualizarLeccion: useActualizarLeccion,
    useEliminarLeccion: useEliminarLeccion,
    useReordenar: useReordenarLecciones,
  },
  autor: {
    useCurso: usePropuestaCurso,
    useCrear: useCrearPropuestaCurso,
    useActualizar: useActualizarPropuestaCurso,
    useEliminar: function useEliminarCursoPropuesto() {
      const eliminar = useEliminarPropuesta()
      return {
        mutateAsync: (id: string) => eliminar.mutateAsync({ tipo: 'curso', id }),
        isPending: eliminar.isPending,
      }
    },
    useAgregarLeccion: useAgregarLeccionPropuesta,
    useActualizarLeccion: useActualizarLeccionPropuesta,
    useEliminarLeccion: useEliminarLeccionPropuesta,
    useReordenar: useReordenarLeccionesPropuesta,
  },
}

const LUGAR: Record<
  ModoEditor,
  {
    seccion: 'cursos' | 'mi-formacion'
    lista: string
    editor: string
    tituloNuevo: string
    tituloEditar: string
  }
> = {
  admin: {
    seccion: 'cursos',
    lista: '/admin/cursos',
    editor: '/admin/cursos',
    tituloNuevo: 'Nuevo curso',
    tituloEditar: 'Editar curso',
  },
  autor: {
    seccion: 'mi-formacion',
    lista: '/mi-formacion?vista=propuestas',
    editor: '/propuestas/cursos',
    tituloNuevo: 'Proponer un curso',
    tituloEditar: 'Tu propuesta de curso',
  },
}

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
  | { tipo: 'cancelarEnvio' }
  | { tipo: 'quitarLeccion'; leccion: LeccionAdmin }
  | null

type ModalAbierto =
  | { tipo: 'recurso'; reemplazar: LeccionAdmin | null }
  | { tipo: 'leccion'; leccion: LeccionAdmin | null }
  | null

/**
 * Alta y edición de un curso (§2.4 y §12.3 de
 * docs/diseno-desarrollo-formacion.md): la ficha a la izquierda con sus
 * lecciones, y a la derecha lo que falta para publicar y las acciones, que
 * siempre quedan a la vista. Las lecciones se guardan al momento; la ficha,
 * con los botones. Las reglas las valida el servidor.
 *
 * Como el de recursos, sirve al panel (`modo="admin"`) y a quien propone un
 * curso (`modo="autor"`, nota del incremento 6).
 */
export function EditorCurso({ modo }: { modo: ModoEditor }) {
  const { id } = useParams()
  const consulta = HOOKS[modo].useCurso(id)
  const lugar = LUGAR[modo]
  const [recargas, setRecargas] = useState(0)

  // El formulario se llena una sola vez, así que no debe nacer de la copia en
  // caché mientras llega la actual: se espera a la lectura de esta visita.
  if (id && !consulta.isFetchedAfterMount && !consulta.isError) {
    return (
      <AppShell seccionActiva={lugar.seccion} titulo={lugar.tituloEditar} volverA={lugar.lista}>
        <div role="status" aria-label="Cargando curso">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  // Con datos en pantalla, un fallo al refrescar en segundo plano no debe
  // tirar lo que se está editando.
  if (id && consulta.isError && !consulta.data) {
    return (
      <AppShell seccionActiva={lugar.seccion} titulo={lugar.tituloEditar} volverA={lugar.lista}>
        <AvisoError mensaje={consulta.error.message} />
      </AppShell>
    )
  }

  // key: al pasar de "nuevo" al curso ya creado, o al cargar la versión actual
  // tras un conflicto, el editor remonta con los datos frescos.
  return (
    <Editor
      key={`${consulta.data?.idCurso ?? 'nuevo'}-${recargas}`}
      modo={modo}
      curso={consulta.data ?? null}
      onRecargar={async () => {
        await consulta.refetch()
        setRecargas((n) => n + 1)
      }}
    />
  )
}

function Editor({
  modo,
  curso,
  onRecargar,
}: {
  modo: ModoEditor
  curso: Curso | null
  onRecargar: () => Promise<void>
}) {
  const hooks = HOOKS[modo]
  const lugar = LUGAR[modo]
  const esAutor = modo === 'autor'
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
  const [desactualizado, setDesactualizado] = useState(false)
  // La versión con la que se llenó el formulario, no la del curso en pantalla:
  // un refresco en segundo plano no debe hacer pasar por actual lo que el
  // formulario aún tiene viejo.
  // Tras guardar sin salir del editor (el autor), pasa a ser la que quedó: si
  // no, el siguiente guardado chocaría con el propio.
  const [versionLeida, setVersionLeida] = useState(curso?.versionFicha)
  const resumenRef = useRef<HTMLDivElement>(null)

  const [vistaPrevia, setVistaPrevia] = useState(false)

  const idCurso = curso?.idCurso ?? ''
  const crear = hooks.useCrear()
  const actualizar = hooks.useActualizar(idCurso)
  const eliminar = hooks.useEliminar()
  const agregarLeccion = hooks.useAgregarLeccion(idCurso)
  const actualizarLeccion = hooks.useActualizarLeccion(idCurso)
  const eliminarLeccion = hooks.useEliminarLeccion(idCurso)
  const reordenar = hooks.useReordenar(idCurso)
  const enviar = useEnviarPropuesta()
  const cancelarEnvio = useCancelarEnvio()
  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    eliminar.isPending ||
    agregarLeccion.isPending ||
    actualizarLeccion.isPending ||
    eliminarLeccion.isPending ||
    reordenar.isPending ||
    enviar.isPending ||
    cancelarEnvio.isPending

  const estatus: EstatusCurso | null = curso?.estatus ?? null
  const soloLectura = curso ? esSoloLectura(modo, curso) : false
  const propuestaEnElPanel = !esAutor && curso?.origen === 'propuesta'
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

  function manejarError(error: unknown, quiso?: EstatusCurso | 'enviar') {
    if (error instanceof ErrorFormacion && error.codigo === 'curso_desactualizado') {
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
            : quiso === 'enviar'
              ? 'No se pudo enviar porque faltan datos:'
              : 'No se pudo guardar. Revisa esto:'
          : error.message,
      )
    } else {
      setMensaje('Ocurrió un error inesperado.')
    }
    setIntentoFallido((n) => n + 1)
  }

  function volverALista(avisoCurso: AvisoCurso) {
    if (esAutor) {
      navigate(lugar.lista, {
        state: {
          avisoPropuestas:
            avisoCurso.accion === 'eliminado'
              ? `Se eliminó tu propuesta «${avisoCurso.titulo}».`
              : `Se guardaron los cambios de «${avisoCurso.titulo}».`,
        },
      })
      return
    }
    navigate(`/admin/cursos${volverA}`, { state: { avisoCurso } })
  }

  /** Guarda la ficha. Devuelve lo guardado, o null si falló (el error ya se
   * muestra). */
  async function guardarFicha(nuevoEstatus?: EstatusCurso): Promise<Curso | null> {
    limpiarMensajes()
    const datos: Partial<DatosCurso> & { versionFicha?: number } = { ...ficha }
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    if (versionLeida !== undefined) datos.versionFicha = versionLeida
    try {
      const guardado = await actualizar.mutateAsync(datos)
      setVersionLeida(guardado.versionFicha)
      return guardado
    } catch (error) {
      manejarError(error, nuevoEstatus)
      return null
    }
  }

  /** Guarda lo que haya en la ficha y envía la propuesta a revisión. */
  async function enviarARevision() {
    if (!curso) return
    const guardado = await guardarFicha()
    if (!guardado) return
    try {
      await enviar.mutateAsync({ tipo: 'curso', id: guardado.idCurso })
      navigate(lugar.lista, {
        state: {
          avisoPropuestas: `Enviaste «${guardado.titulo}» a revisión. Te avisaremos cuando se decida.`,
        },
      })
    } catch (error) {
      manejarError(error, 'enviar')
    }
  }

  async function alCancelarEnvio() {
    if (!curso) return
    limpiarMensajes()
    try {
      await cancelarEnvio.mutateAsync({ tipo: 'curso', id: curso.idCurso })
      await onRecargar()
    } catch (error) {
      manejarError(error)
    }
  }

  async function guardar(nuevoEstatus?: EstatusCurso) {
    limpiarMensajes()
    const datos: Partial<DatosCurso> & { versionFicha?: number } = { ...ficha }
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    if (versionLeida !== undefined) datos.versionFicha = versionLeida
    try {
      if (!curso) {
        // Se queda en el editor: lo siguiente es agregar las lecciones.
        const creado = await crear.mutateAsync(datos)
        navigate(`${lugar.editor}/${creado.idCurso}`, {
          replace: true,
          state: {
            avisoEditor: esAutor
              ? 'Propuesta creada. Ahora agrega sus lecciones.'
              : 'Curso creado. Ahora agrega sus lecciones.',
          },
        })
        return
      }
      const guardado = await actualizar.mutateAsync(datos)
      if (esAutor) {
        setVersionLeida(guardado.versionFicha)
        setAviso('Borrador guardado.')
        return
      }
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
    const reemplazar = modal?.tipo === 'recurso' ? modal.reemplazar : null
    setModal(null)
    if (reemplazar) {
      await operarLeccion(
        () =>
          actualizarLeccion.mutateAsync({
            idLeccion: reemplazar.idLeccion,
            cambios: { idRecurso },
          }),
        'Recurso de la lección actualizado.',
      )
      return
    }
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
    } else if (accion?.tipo === 'cancelarEnvio') {
      await alCancelarEnvio()
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
      seccionActiva={lugar.seccion}
      titulo={curso ? lugar.tituloEditar : lugar.tituloNuevo}
      volverA={esAutor ? lugar.lista : `/admin/cursos${volverA}`}
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
          {esAutor ? (
            curso && 'revision' in curso ? (
              <AvisoRevision tipo="curso" contenido={curso} />
            ) : (
              <NotaAutoria />
            )
          ) : null}
          {propuestaEnElPanel ? (
            <p className={styles.nota}>
              Propuesto por {curso?.autor?.nombre ?? 'un usuario'}.{' '}
              <Link to={`/admin/revisiones/cursos/${idCurso}`}>Ver su revisión</Link>
              {estatus === 'publicado' || estatus === 'retirado'
                ? ', donde también se retira o se vuelve a publicar con motivo.'
                : '.'}
            </p>
          ) : null}
          {desactualizado ? (
            <div className={styles.resumenErrores} role="alert">
              <p className={styles.resumenErroresTitulo}>
                {esAutor
                  ? 'Este curso se modificó en otra pestaña mientras lo editabas.'
                  : 'Otro administrador modificó este curso mientras lo editabas.'}
              </p>
              <p className={styles.conflictoDetalle}>
                Tus cambios en la ficha no se guardaron, para no borrar los suyos. Al cargar la
                versión actual se pierde lo que escribiste aquí.
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
          <fieldset className={styles.campos} disabled={soloLectura}>
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
                {errores.elementos ? (
                  <p className={styles.errorCampo}>{errores.elementos}</p>
                ) : null}
              </fieldset>
            </Card>
          </fieldset>

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
                {soloLectura ? null : (
                  <div className={styles.leccionesAcciones}>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={lleno || ocupado}
                      onClick={() => setModal({ tipo: 'recurso', reemplazar: null })}
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
                )}
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
                    const recursoCaido =
                      !soloLectura && l.recurso && l.recurso.estatus !== 'publicado'
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
                              lección se ve como no disponible.{' '}
                              <button
                                type="button"
                                className={styles.enlaceAccion}
                                disabled={ocupado}
                                onClick={() => setModal({ tipo: 'recurso', reemplazar: l })}
                              >
                                Cambiar recurso
                              </button>
                            </span>
                          ) : null}
                          {error ? <span className={styles.errorCampo}>{error}</span> : null}
                        </div>
                        {soloLectura ? null : (
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
                        )}
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

            {curso && !(esAutor && soloLectura) ? (
              <div>
                <h2 className={styles.requisitosTitulo}>
                  {esAutor ? 'Para enviar a revisión' : 'Para publicar'}
                </h2>
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

            {curso && (esAutor || propuestaEnElPanel) ? (
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={vistaPrevia}
                onClick={() => setVistaPrevia(true)}
              >
                Vista previa
              </Button>
            ) : null}

            {esAutor ? (
              <AccionesAutor
                estatus={estatus}
                ocupado={ocupado}
                onCrear={() => void guardar()}
                onGuardar={() => void guardar()}
                onEnviar={() => void enviarARevision()}
                onCancelarEnvio={() => setConfirmar({ tipo: 'cancelarEnvio' })}
                onEliminar={() => setConfirmar({ tipo: 'eliminar' })}
              />
            ) : soloLectura ? (
              <p className={styles.nota}>
                Esta propuesta está {estatus === 'en_revision' ? 'en revisión' : 'rechazada'}: no se
                edita desde aquí.{' '}
                <Link to={`/admin/revisiones/cursos/${idCurso}`}>Ir a su revisión</Link>
              </p>
            ) : propuestaEnElPanel ? (
              <div className={styles.acciones}>
                <Button onClick={() => void guardar()} disabled={ocupado}>
                  Guardar cambios
                </Button>
              </div>
            ) : (
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
            )}
          </Card>
        </aside>
      </div>

      {vistaPrevia && curso ? (
        <Modal abierto amplio onCerrar={() => setVistaPrevia(false)} titulo="Vista previa">
          <VistaPreviaCurso curso={curso} />
          <div className={styles.accionesModal}>
            <Button variant="secondary" onClick={() => setVistaPrevia(false)}>
              Cerrar
            </Button>
          </div>
        </Modal>
      ) : null}

      {modal?.tipo === 'recurso' ? (
        <ModalElegirRecurso
          modo={modo}
          idsEnCurso={lecciones.flatMap((l) => (l.recurso ? [l.recurso.idRecurso] : []))}
          reemplazo={modal.reemplazar !== null}
          onElegir={(id) => void alElegirRecurso(id)}
          onCerrar={() => setModal(null)}
        />
      ) : null}

      {modal?.tipo === 'leccion' ? (
        <ModalLeccion
          leccion={modal.leccion}
          onGuardar={alGuardarLeccion}
          onCerrar={() => setModal(null)}
          onCambiarRecurso={() => setModal({ tipo: 'recurso', reemplazar: modal.leccion })}
        />
      ) : null}

      <Modal
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={
          confirmar?.tipo === 'eliminar'
            ? esAutor
              ? '¿Eliminar tu propuesta?'
              : '¿Eliminar este curso?'
            : confirmar?.tipo === 'retirar'
              ? '¿Retirar este curso?'
              : confirmar?.tipo === 'cancelarEnvio'
                ? '¿Cancelar el envío?'
                : '¿Quitar esta lección?'
        }
        descripcion={
          confirmar?.tipo === 'cancelarEnvio'
            ? `«${ficha.titulo}» sale de la cola de revisión y vuelve a ser un borrador que puedes editar.`
            : confirmar?.tipo === 'eliminar'
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
            variant={
              confirmar?.tipo === 'retirar' || confirmar?.tipo === 'cancelarEnvio'
                ? 'primary'
                : 'danger'
            }
            onClick={() => void alConfirmar()}
          >
            {confirmar?.tipo === 'eliminar'
              ? 'Eliminar definitivamente'
              : confirmar?.tipo === 'retirar'
                ? 'Retirar'
                : confirmar?.tipo === 'cancelarEnvio'
                  ? 'Cancelar el envío'
                  : 'Quitar'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}

/** Lo que el autor puede hacer con su propuesta de curso en cada estado. */
function AccionesAutor({
  estatus,
  ocupado,
  onCrear,
  onGuardar,
  onEnviar,
  onCancelarEnvio,
  onEliminar,
}: {
  estatus: EstatusCurso | null
  ocupado: boolean
  onCrear: () => void
  onGuardar: () => void
  onEnviar: () => void
  onCancelarEnvio: () => void
  onEliminar: () => void
}) {
  const eliminable =
    estatus === 'borrador' || estatus === 'cambios_solicitados' || estatus === 'rechazado'
  return (
    <div className={styles.acciones}>
      {estatus === null ? (
        <Button onClick={onCrear} disabled={ocupado}>
          Crear propuesta
        </Button>
      ) : estatus === 'borrador' || estatus === 'cambios_solicitados' ? (
        <>
          <Button onClick={onEnviar} disabled={ocupado}>
            Enviar a revisión
          </Button>
          <Button variant="secondary" onClick={onGuardar} disabled={ocupado}>
            Guardar borrador
          </Button>
        </>
      ) : estatus === 'en_revision' ? (
        <Button variant="secondary" onClick={onCancelarEnvio} disabled={ocupado}>
          Cancelar el envío
        </Button>
      ) : null}
      {eliminable ? (
        <Button variant="danger" onClick={onEliminar} disabled={ocupado}>
          Eliminar
        </Button>
      ) : null}
    </div>
  )
}
