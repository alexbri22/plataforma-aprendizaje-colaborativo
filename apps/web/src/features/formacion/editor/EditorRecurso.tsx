import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  ARCHIVOS_POR_TIPO,
  AREAS_HABILIDAD,
  ELEMENTOS_COLABORACION,
  ETIQUETAS_ARCHIVO,
  EXTENSIONES_ARCHIVO,
  MIME_PDF,
  ETIQUETAS_AREA,
  ETIQUETAS_ELEMENTO,
  ETIQUETAS_ESTATUS_RECURSO,
  ETIQUETAS_SECCION,
  ETIQUETAS_TIPO_RECURSO,
  LARGO_MAXIMO_RECURSO,
  MAX_BYTES_ARCHIVO_RECURSO,
  SECCIONES_FORMATIVAS,
  TIPOS_CON_ARCHIVO,
  TIPOS_CON_URL,
  TIPOS_RECURSO,
  type EstatusRecurso,
  type TipoRecurso,
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
  urlArchivoAdmin,
  urlArchivoPropuesta,
  type DatosRecurso,
  type PropuestaRecurso,
  type RecursoAdmin,
  type RecursoAdminDetalle,
} from '../formacion.api'
import { formatoTamano, listaLegible } from '../formato'
import { BarraFormato } from './BarraFormato'
import { Markdown } from '../Markdown'
import {
  useActualizarPropuestaRecurso,
  useCancelarEnvio,
  useCrearPropuestaRecurso,
  useEliminarPropuesta,
  useEnviarPropuesta,
  usePropuestaRecurso,
  useQuitarArchivoPropuesta,
  useSubirArchivoPropuesta,
} from '../usePropuestas'
import {
  useActualizarRecurso,
  useCrearRecurso,
  useEliminarRecurso,
  useQuitarArchivoRecurso,
  useRecursoAdmin,
  useSubirArchivoRecurso,
} from '../useRecursos'
import { accionDe, type AvisoContenido } from './avisoContenido'
import { AvisoRevision, NotaAutoria } from './AvisoRevision'
import { llevarA } from './llevarA'
import { esSoloLectura, type ModoEditor } from './modoEditor'
import styles from './EditorRecurso.module.css'

/** Lo que el editor necesita de una mutación: la misma forma en los dos modos. */
interface Mutacion<V, R> {
  mutateAsync: (variables: V) => Promise<R>
  isPending: boolean
}

type Recurso = RecursoAdminDetalle | PropuestaRecurso

/** Las llamadas del editor según su modo: las del panel o las del autor, que
 * solo tocan su propuesta (nota del incremento 6). Son hooks: se elige el
 * juego una vez, por el modo, que no cambia mientras el editor vive. */
interface HooksRecurso {
  useRecurso: (id: string | undefined) => UseQueryResult<Recurso>
  useCrear: () => Mutacion<Partial<DatosRecurso>, Recurso>
  useActualizar: (
    id: string,
  ) => Mutacion<Partial<DatosRecurso> & { versionFicha?: number }, Recurso>
  useSubir: (id: string) => Mutacion<File, Recurso>
  useQuitar: (id: string) => Mutacion<void, Recurso>
  useEliminar: () => Mutacion<string, void>
  urlArchivo: (id: string, archivo: NonNullable<Recurso['archivo']>) => string
}

const HOOKS: Record<ModoEditor, HooksRecurso> = {
  admin: {
    useRecurso: useRecursoAdmin,
    useCrear: useCrearRecurso,
    useActualizar: useActualizarRecurso,
    useSubir: useSubirArchivoRecurso,
    useQuitar: useQuitarArchivoRecurso,
    useEliminar: useEliminarRecurso,
    urlArchivo: urlArchivoAdmin,
  },
  autor: {
    useRecurso: usePropuestaRecurso,
    useCrear: useCrearPropuestaRecurso,
    useActualizar: useActualizarPropuestaRecurso,
    useSubir: useSubirArchivoPropuesta,
    useQuitar: useQuitarArchivoPropuesta,
    useEliminar: function useEliminarRecursoPropuesto() {
      const eliminar = useEliminarPropuesta()
      return {
        mutateAsync: (id: string) => eliminar.mutateAsync({ tipo: 'recurso', id }),
        isPending: eliminar.isPending,
      }
    },
    urlArchivo: urlArchivoPropuesta,
  },
}

/** Dónde vive el editor y a dónde vuelve, según el modo. */
const LUGAR: Record<
  ModoEditor,
  {
    seccion: 'contenido' | 'mi-formacion'
    lista: string
    editor: string
    tituloNuevo: string
    tituloEditar: string
  }
> = {
  admin: {
    seccion: 'contenido',
    lista: '/admin/contenido',
    editor: '/admin/contenido',
    tituloNuevo: 'Nuevo recurso',
    tituloEditar: 'Editar recurso',
  },
  autor: {
    seccion: 'mi-formacion',
    lista: '/mi-formacion?vista=propuestas',
    editor: '/propuestas/recursos',
    tituloNuevo: 'Proponer un recurso',
    tituloEditar: 'Tu propuesta de recurso',
  },
}

type Formulario = Omit<DatosRecurso, 'duracionMin' | 'orden' | 'estatus'> & {
  duracionMin: string
  orden: string
}

const VACIO: Formulario = {
  seccion: 'como_colaborar',
  titulo: '',
  resumen: '',
  tipoRecurso: 'texto',
  contenido: '',
  transcripcion: '',
  area: null,
  elementos: [],
  duracionMin: '',
  fuente: '',
  licencia: '',
  orden: '',
}

function aFormulario(r: RecursoAdmin): Formulario {
  return {
    seccion: r.seccion,
    titulo: r.titulo,
    resumen: r.resumen,
    tipoRecurso: r.tipoRecurso,
    contenido: r.contenido,
    transcripcion: r.transcripcion,
    area: r.area,
    elementos: r.elementos,
    duracionMin: r.duracionMin === null ? '' : String(r.duracionMin),
    fuente: r.fuente,
    licencia: r.licencia,
    orden: String(r.orden),
  }
}

function aDatos(f: Formulario): Partial<DatosRecurso> {
  const { duracionMin, orden, ...resto } = f
  const datos: Partial<DatosRecurso> = {
    ...resto,
    duracionMin: duracionMin.trim() === '' ? null : Number(duracionMin),
  }
  // Sin orden en el alta: el servidor lo pone al final.
  if (orden.trim() !== '') datos.orden = Number(orden)
  return datos
}

const ETIQUETA_CONTENIDO: Record<TipoRecurso, string> = {
  texto: 'Contenido del artículo',
  plantilla: 'Instrucciones y plantilla',
  pdf: 'Descripción adicional (opcional)',
  video: 'Dirección del video',
  enlace: 'Dirección del enlace',
}

type Confirmacion = 'retirar' | 'eliminar' | 'cancelarEnvio' | null

// Nombre de cada campo en el resumen de errores, en el orden en que aparecen
// en el formulario: el primero de esta lista con error es al que se lleva el
// foco.
const CAMPOS: { campo: string; etiqueta: string }[] = [
  { campo: 'titulo', etiqueta: 'Título' },
  { campo: 'resumen', etiqueta: 'Resumen' },
  { campo: 'tipoRecurso', etiqueta: 'Tipo' },
  { campo: 'seccion', etiqueta: 'Sección' },
  { campo: 'contenido', etiqueta: 'Contenido' },
  { campo: 'transcripcion', etiqueta: 'Transcripción' },
  { campo: 'archivo', etiqueta: 'Archivo' },
  { campo: 'area', etiqueta: 'Área de habilidad' },
  { campo: 'duracionMin', etiqueta: 'Duración' },
  { campo: 'elementos', etiqueta: 'Elementos de colaboración' },
  { campo: 'fuente', etiqueta: 'Fuente o autoría' },
  { campo: 'licencia', etiqueta: 'Licencia o derechos de uso' },
  { campo: 'orden', etiqueta: 'Orden en la lista' },
  { campo: 'estatus', etiqueta: 'Estatus' },
]

/** Lleva la vista y el foco a un campo del formulario. Si no tiene control
 * propio (archivo sin recurso guardado) va a su contenedor. Devuelve false si
 * no está en pantalla. */
function irACampo(campo: string): boolean {
  const destino =
    document.getElementById(`campo-${campo}`) ??
    (campo === 'archivo' ? document.getElementById('seccion-archivo') : null)
  if (!destino) return false
  llevarA(destino)
  return true
}

function sinCampo(errores: Record<string, string>, campo: string): Record<string, string> {
  const copia = { ...errores }
  delete copia[campo]
  return copia
}

/**
 * Alta y edición de un recurso formativo (§12.3 de
 * docs/diseno-desarrollo-formacion.md). Los mínimos de publicación los valida
 * el servidor; aquí solo se muestran sus errores junto a cada campo.
 *
 * El mismo editor sirve al panel (`modo="admin"`) y a quien propone un recurso
 * (`modo="autor"`, nota del incremento 6). El autor no publica: guarda su
 * borrador y lo envía a revisión; en revisión, rechazado o ya publicado lo ve
 * sin poder editarlo.
 */
export function EditorRecurso({ modo }: { modo: ModoEditor }) {
  const { id } = useParams()
  const consulta = HOOKS[modo].useRecurso(id)
  const lugar = LUGAR[modo]
  const [recargas, setRecargas] = useState(0)

  // El formulario se llena una sola vez: no debe nacer de la copia en caché
  // mientras llega la actual, o se guardarían datos viejos.
  if (id && !consulta.isFetchedAfterMount && !consulta.isError) {
    return (
      <AppShell seccionActiva={lugar.seccion} titulo={lugar.tituloEditar}>
        <div role="status" aria-label="Cargando recurso">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (id && consulta.isError && !consulta.data) {
    return (
      <AppShell seccionActiva={lugar.seccion} titulo={lugar.tituloEditar}>
        <AvisoError mensaje={consulta.error.message} />
        <p>
          <Link to={lugar.lista}>Volver a la lista</Link>
        </p>
      </AppShell>
    )
  }

  // key: al cambiar de recurso, o al cargar la versión actual tras un
  // conflicto, el formulario remonta con los datos frescos.
  return (
    <Editor
      key={`${consulta.data?.idRecurso ?? 'nuevo'}-${recargas}`}
      modo={modo}
      recurso={consulta.data ?? null}
      onRecargar={async () => {
        await consulta.refetch()
        setRecargas((n) => n + 1)
      }}
    />
  )
}

function Editor({
  modo,
  recurso,
  onRecargar,
}: {
  modo: ModoEditor
  recurso: Recurso | null
  onRecargar: () => Promise<void>
}) {
  const hooks = HOOKS[modo]
  const lugar = LUGAR[modo]
  const esAutor = modo === 'autor'
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<Formulario>(() => (recurso ? aFormulario(recurso) : VACIO))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  // Aviso que deja el alta de un PDF al quedarse en el editor (ver guardar).
  const [aviso, setAviso] = useState<string | null>(() => {
    const estado = location.state as { avisoEditor?: unknown } | null
    return typeof estado?.avisoEditor === 'string' ? estado.avisoEditor : null
  })
  // El aviso ya se copió: se quita del historial para que no reaparezca al
  // recargar, conservando a qué página de la lista volver.
  useEffect(() => {
    const estado = location.state as { avisoEditor?: unknown; volverA?: string } | null
    if (estado?.avisoEditor === undefined) return
    navigate(location.pathname, { replace: true, state: { volverA: estado.volverA } })
  }, [location.state, location.pathname, navigate])

  // Cada intento fallido incrementa este contador; el efecto de abajo lleva
  // el foco al primer campo con error una vez que el DOM ya los muestra.
  const [intentoFallido, setIntentoFallido] = useState(0)
  // Página de la lista de la que se llegó (?pagina=N), para volver a ella.
  const [volverA] = useState(() => {
    const estado = location.state as { volverA?: unknown } | null
    return typeof estado?.volverA === 'string' ? estado.volverA : ''
  })
  const resumenErroresRef = useRef<HTMLDivElement>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [confirmar, setConfirmar] = useState<Confirmacion>(null)
  const [desactualizado, setDesactualizado] = useState(false)
  // La versión con la que se llenó el formulario: un refresco en segundo
  // plano no debe hacer pasar por actual lo que el formulario aún tiene viejo.
  // Tras guardar sin salir del editor (el autor), pasa a ser la que quedó: si
  // no, el siguiente guardado chocaría con el propio.
  const [versionLeida, setVersionLeida] = useState(recurso?.versionFicha)

  const idRecurso = recurso?.idRecurso ?? ''
  const crear = hooks.useCrear()
  const actualizar = hooks.useActualizar(idRecurso)
  const subir = hooks.useSubir(idRecurso)
  const quitar = hooks.useQuitar(idRecurso)
  const eliminar = hooks.useEliminar()
  const enviar = useEnviarPropuesta()
  const cancelarEnvio = useCancelarEnvio()
  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    subir.isPending ||
    quitar.isPending ||
    eliminar.isPending ||
    enviar.isPending ||
    cancelarEnvio.isPending

  const estatus: EstatusRecurso | null = recurso?.estatus ?? null
  const soloLectura = recurso ? esSoloLectura(modo, recurso) : false
  // Una propuesta ya publicada la cuida el administrador, pero retirarla o
  // volver a publicarla va por la revisión, con motivo.
  const propuestaEnElPanel = !esAutor && recurso?.origen === 'propuesta'
  const tipo = form.tipoRecurso
  const admiteArchivo = TIPOS_CON_ARCHIVO.includes(tipo)
  // Qué formatos acepta este tipo (observaciones del 12 de noviembre: el
  // artículo, un PDF opcional; la plantilla, también Word, Excel o PowerPoint).
  const formatos = ARCHIVOS_POR_TIPO[tipo]
  const nombresFormatos = listaLegible(formatos.map((f) => ETIQUETAS_ARCHIVO[f]))
  const soloPdf = formatos.length === 1 && formatos[0] === MIME_PDF
  const esDeUrl = TIPOS_CON_URL.includes(tipo)

  function cambiar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => (campo in e ? sinCampo(e, campo) : e))
  }

  function alternarElemento(elemento: (typeof ELEMENTOS_COLABORACION)[number]) {
    cambiar(
      'elementos',
      form.elementos.includes(elemento)
        ? form.elementos.filter((e) => e !== elemento)
        : ELEMENTOS_COLABORACION.filter((e) => e === elemento || form.elementos.includes(e)),
    )
  }

  useEffect(() => {
    if (intentoFallido === 0) return
    const primero = CAMPOS.find(({ campo }) => campo in errores)
    if (primero && irACampo(primero.campo)) return
    // Sin campo al que ir (error general o de un campo fuera de pantalla):
    // el resumen de arriba es el que explica qué pasó.
    resumenErroresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    resumenErroresRef.current?.focus({ preventScroll: true })
    // Solo debe correr tras un intento fallido, no con cada edición que
    // limpia un error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentoFallido])

  function manejarError(error: unknown, quiso?: EstatusRecurso | 'enviar') {
    if (error instanceof ErrorFormacion && error.codigo === 'recurso_desactualizado') {
      setDesactualizado(true)
      window.scrollTo({ top: 0 })
      return
    }
    if (error instanceof ErrorFormacion) {
      setErrores(error.detallePorCampo ?? {})
      setMensaje(
        error.detallePorCampo
          ? quiso === 'publicado'
            ? 'No se pudo publicar porque faltan datos. Para publicar, el recurso debe cumplir los criterios mínimos:'
            : quiso === 'enviar'
              ? 'No se pudo enviar porque faltan datos. Para enviarla, la propuesta debe cumplir los criterios mínimos:'
              : 'No se pudo guardar. Revisa estos campos:'
          : error.message,
      )
    } else {
      setMensaje('Ocurrió un error inesperado.')
    }
    setIntentoFallido((n) => n + 1)
  }

  function volverALista(aviso: AvisoContenido) {
    if (esAutor) {
      navigate(lugar.lista, { state: { avisoPropuestas: avisoAutor(aviso) } })
      return
    }
    navigate(`/admin/contenido${volverA}`, { state: { avisoContenido: aviso } })
  }

  /** Guarda la ficha. Devuelve lo guardado, o null si falló (el error ya se
   * muestra). */
  async function guardarFicha(nuevoEstatus?: EstatusRecurso): Promise<Recurso | null> {
    setMensaje(null)
    setAviso(null)
    setErrores({})
    const datos: Partial<DatosRecurso> & { versionFicha?: number } = aDatos(form)
    // El autor no decide el lugar en el catálogo: el campo ni se muestra.
    if (esAutor) delete datos.orden
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    if (recurso && versionLeida !== undefined) datos.versionFicha = versionLeida
    try {
      const guardado = recurso
        ? await actualizar.mutateAsync(datos)
        : await crear.mutateAsync(datos)
      setVersionLeida(guardado.versionFicha)
      return guardado
    } catch (error) {
      manejarError(error, nuevoEstatus)
      return null
    }
  }

  async function guardar(nuevoEstatus?: EstatusRecurso) {
    const resultado = await guardarFicha(nuevoEstatus)
    if (!resultado) return

    // El autor se queda en su editor: lo siguiente es seguir preparándola o
    // enviarla. Recién creada, pasa a su dirección propia.
    if (esAutor) {
      if (!recurso) {
        navigate(`${lugar.editor}/${resultado.idRecurso}`, {
          replace: true,
          state: {
            avisoEditor:
              resultado.tipoRecurso === 'pdf'
                ? 'Borrador guardado. Adjunta el PDF y envíalo a revisión cuando esté listo.'
                : 'Borrador guardado. Cuando esté listo, envíalo a revisión.',
          },
        })
        return
      }
      setAviso('Borrador guardado.')
      return
    }

    {
      // Un PDF recién creado no puede publicarse sin su archivo, y el archivo
      // solo se sube con el borrador ya guardado: aquí sí se queda en el
      // editor, para adjuntarlo sin buscarlo en la lista.
      if (!recurso && resultado.tipoRecurso === 'pdf') {
        navigate(`/admin/contenido/${resultado.idRecurso}`, {
          replace: true,
          state: { avisoEditor: 'Borrador guardado. Adjunta el PDF para poder publicarlo.' },
        })
        return
      }

      volverALista({
        idRecurso: resultado.idRecurso,
        titulo: resultado.titulo,
        accion: accionDe(recurso?.estatus ?? null, resultado.estatus),
        estatus: resultado.estatus,
      })
    }
  }

  /** Guarda lo que haya en el formulario y envía la propuesta a revisión. */
  async function enviarARevision() {
    if (!recurso) return
    const guardado = await guardarFicha()
    if (!guardado) return
    try {
      await enviar.mutateAsync({ tipo: 'recurso', id: guardado.idRecurso })
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
    if (!recurso) return
    setMensaje(null)
    try {
      await cancelarEnvio.mutateAsync({ tipo: 'recurso', id: recurso.idRecurso })
      await onRecargar()
    } catch (error) {
      manejarError(error)
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    void guardar()
  }

  async function alElegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    setMensaje(null)
    setAviso(null)
    if (!(formatos as readonly string[]).includes(archivo.type)) {
      setErrores((e) => ({ ...e, archivo: `El archivo debe ser ${nombresFormatos}.` }))
      return
    }
    if (archivo.size > MAX_BYTES_ARCHIVO_RECURSO) {
      setErrores((e) => ({
        ...e,
        archivo: `El archivo pesa ${formatoTamano(archivo.size)}; el máximo es ${formatoTamano(MAX_BYTES_ARCHIVO_RECURSO)}.`,
      }))
      return
    }
    try {
      await subir.mutateAsync(archivo)
      setErrores((e) => sinCampo(e, 'archivo'))
      setAviso('Archivo subido.')
    } catch (error) {
      if (error instanceof ErrorFormacion) setErrores((e) => ({ ...e, archivo: error.message }))
      else manejarError(error)
    }
  }

  async function alQuitarArchivo() {
    setMensaje(null)
    setAviso(null)
    try {
      await quitar.mutateAsync()
      setAviso('Archivo quitado.')
    } catch (error) {
      manejarError(error)
    }
  }

  async function alConfirmar() {
    const accion = confirmar
    setConfirmar(null)
    if (accion === 'retirar') {
      await guardar('retirado')
    } else if (accion === 'cancelarEnvio') {
      await alCancelarEnvio()
    } else if (accion === 'eliminar' && recurso) {
      try {
        await eliminar.mutateAsync(recurso.idRecurso)
        volverALista({
          idRecurso: recurso.idRecurso,
          titulo: recurso.titulo,
          accion: 'eliminado',
          estatus: null,
        })
      } catch (error) {
        manejarError(error)
      }
    }
  }

  const archivo = recurso?.archivo ?? null

  return (
    <AppShell
      seccionActiva={lugar.seccion}
      titulo={recurso ? lugar.tituloEditar : lugar.tituloNuevo}
      volverA={esAutor ? lugar.lista : `/admin/contenido${volverA}`}
      acciones={
        estatus === 'publicado' && recurso ? (
          <Button variant="secondary" size="sm" to={`/recursos/${recurso.idRecurso}`}>
            Ver publicado
          </Button>
        ) : undefined
      }
    >
      <div className={styles.pagina}>
        <div className={styles.barra}>
          {estatus ? (
            <Badge
              variant={
                estatus === 'publicado' ? 'success' : estatus === 'retirado' ? 'warning' : 'neutral'
              }
            >
              {ETIQUETAS_ESTATUS_RECURSO[estatus]}
            </Badge>
          ) : null}
        </div>

        {esAutor ? (
          recurso && 'revision' in recurso ? (
            <AvisoRevision tipo="recurso" contenido={recurso} />
          ) : (
            <NotaAutoria />
          )
        ) : null}
        {propuestaEnElPanel ? (
          <p className={styles.nota}>
            Propuesto por {recurso?.autor?.nombre ?? 'un usuario'}.{' '}
            <Link to={`/admin/revisiones/recursos/${idRecurso}`}>Ver su revisión</Link>
            {estatus === 'publicado' || estatus === 'retirado'
              ? ', donde también se retira o se vuelve a publicar con motivo.'
              : '.'}
          </p>
        ) : null}

        {desactualizado ? (
          <div className={styles.resumenErrores} role="alert">
            <p className={styles.resumenErroresTitulo}>
              Este recurso se modificó mientras lo editabas.
            </p>
            <p>
              Tus cambios no se guardaron, para no borrar los otros. Al cargar la versión actual se
              pierde lo que escribiste aquí.
            </p>
            <Button variant="secondary" size="sm" onClick={() => void onRecargar()}>
              Cargar la versión actual
            </Button>
          </div>
        ) : null}

        {!esAutor && recurso && recurso.usadoEn.length > 0 ? (
          <div className={styles.usadoEn}>
            <p>
              <strong>
                {recurso.usadoEn.length === 1
                  ? 'Se usa en 1 curso'
                  : `Se usa en ${recurso.usadoEn.length} cursos`}
                :
              </strong>{' '}
              {recurso.usadoEn.map((c, i) => (
                <span key={c.idCurso}>
                  {i > 0 ? ', ' : null}
                  <Link to={`/admin/cursos/${c.idCurso}`}>{c.titulo}</Link>
                </span>
              ))}
            </p>
            <p>
              Para eliminarlo, primero quítalo de esos cursos. Si lo retiras, la lección se verá
              como no disponible.
            </p>
          </div>
        ) : null}

        {mensaje ? (
          <div ref={resumenErroresRef} tabIndex={-1} className={styles.resumenErrores} role="alert">
            <p className={styles.resumenErroresTitulo}>{mensaje}</p>
            {Object.keys(errores).length > 0 ? (
              <ul>
                {CAMPOS.filter(({ campo }) => campo in errores).map(({ campo, etiqueta }) => (
                  <li key={campo}>
                    <button type="button" onClick={() => irACampo(campo)}>
                      {etiqueta}
                    </button>
                    : {errores[campo]}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {aviso ? (
          <p className={styles.aviso} role="status">
            {aviso}
          </p>
        ) : null}

        <form className={styles.formulario} onSubmit={alEnviar} noValidate>
          {/* Sin poder editar, el formulario se lee pero no se cambia. */}
          <fieldset className={styles.campos} disabled={soloLectura}>
            <Card className={styles.seccion}>
              <h2>Identificación</h2>
              <Input
                label="Título"
                value={form.titulo}
                maxLength={LARGO_MAXIMO_RECURSO.titulo}
                onChange={(e) => cambiar('titulo', e.target.value)}
                id="campo-titulo"
                error={errores.titulo}
                required
              />
              <Textarea
                label="Resumen"
                value={form.resumen}
                maxLength={LARGO_MAXIMO_RECURSO.resumen}
                onChange={(e) => cambiar('resumen', e.target.value)}
                id="campo-resumen"
                error={errores.resumen}
                rows={2}
              />
              <div className={styles.fila}>
                <Select
                  label="Tipo"
                  value={form.tipoRecurso}
                  onChange={(e) => cambiar('tipoRecurso', e.target.value as TipoRecurso)}
                  id="campo-tipoRecurso"
                  error={errores.tipoRecurso}
                >
                  {TIPOS_RECURSO.map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETAS_TIPO_RECURSO[t]}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Sección"
                  value={form.seccion}
                  onChange={(e) => cambiar('seccion', e.target.value as Formulario['seccion'])}
                  id="campo-seccion"
                  error={errores.seccion}
                >
                  {SECCIONES_FORMATIVAS.map((s) => (
                    <option key={s} value={s}>
                      {ETIQUETAS_SECCION[s]}
                    </option>
                  ))}
                </Select>
              </div>
              {recurso?.archivo && !admiteArchivo ? (
                <p className={styles.nota}>
                  Al guardar con este tipo se quitará el archivo adjunto ({recurso.archivo.nombre}).
                </p>
              ) : null}
            </Card>

            <Card className={styles.seccion}>
              <h2>Contenido</h2>
              {esDeUrl ? (
                <Input
                  label={ETIQUETA_CONTENIDO[tipo]}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={form.contenido}
                  onChange={(e) => cambiar('contenido', e.target.value)}
                  id="campo-contenido"
                  error={errores.contenido}
                />
              ) : (
                <>
                  <BarraFormato
                    idCampo="campo-contenido"
                    valor={form.contenido}
                    onCambiar={(v) => cambiar('contenido', v)}
                    maxLength={LARGO_MAXIMO_RECURSO.contenido}
                  />
                  <Textarea
                    label={ETIQUETA_CONTENIDO[tipo]}
                    value={form.contenido}
                    maxLength={LARGO_MAXIMO_RECURSO.contenido}
                    onChange={(e) => cambiar('contenido', e.target.value)}
                    id="campo-contenido"
                    error={errores.contenido}
                    rows={tipo === 'pdf' ? 3 : 14}
                    className={styles.monoespaciado}
                  />
                  <p className={styles.nota}>
                    Admite formato básico: <code>## Subtítulo</code>, <code>**negritas**</code>,
                    listas con <code>-</code> o <code>1.</code>, citas con <code>&gt;</code>, tablas
                    con <code>|</code> y enlaces <code>[texto](https://…)</code>.
                  </p>
                  {form.contenido ? (
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={vistaPrevia}
                        onClick={() => setVistaPrevia((v) => !v)}
                      >
                        {vistaPrevia ? 'Ocultar vista previa' : 'Vista previa'}
                      </Button>
                      {vistaPrevia ? (
                        <div className={styles.vistaPrevia}>
                          <Markdown fuente={form.contenido} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {tipo === 'video' ? (
                <Textarea
                  label="Transcripción"
                  value={form.transcripcion}
                  maxLength={LARGO_MAXIMO_RECURSO.transcripcion}
                  onChange={(e) => cambiar('transcripcion', e.target.value)}
                  id="campo-transcripcion"
                  error={errores.transcripcion}
                  rows={8}
                />
              ) : null}

              {admiteArchivo ? (
                <div className={styles.archivo} id="seccion-archivo" tabIndex={-1}>
                  <h3>
                    {soloPdf ? 'Archivo PDF' : 'Archivo'}
                    {tipo === 'pdf' ? '' : ' (opcional)'}
                  </h3>
                  {!recurso ? (
                    <p className={styles.nota}>
                      Guarda el borrador para poder adjuntar el archivo.
                    </p>
                  ) : (
                    <>
                      {archivo ? (
                        <p className={styles.archivoActual}>
                          {/* Descarga del panel: abre también el PDF de un borrador
                            o de un recurso retirado, para revisarlo. */}
                          <a
                            href={hooks.urlArchivo(idRecurso, archivo)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {archivo.nombre}
                          </a>{' '}
                          · {formatoTamano(archivo.tamano)}
                          {estatus !== 'publicado' ? (
                            <span className={styles.nota}> (el público lo verá al publicar)</span>
                          ) : null}
                        </p>
                      ) : (
                        <p className={styles.nota}>Sin archivo adjunto.</p>
                      )}
                      <div className={styles.archivoAcciones}>
                        <label className={styles.subirArchivo}>
                          <input
                            id="campo-archivo"
                            type="file"
                            accept={formatos.flatMap((f) => [f, EXTENSIONES_ARCHIVO[f]]).join(',')}
                            disabled={ocupado}
                            aria-describedby={errores.archivo ? 'error-archivo' : undefined}
                            onChange={(e) => {
                              void alElegirArchivo(e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                          {archivo
                            ? soloPdf
                              ? 'Reemplazar PDF'
                              : 'Reemplazar archivo'
                            : soloPdf
                              ? 'Subir PDF'
                              : 'Subir archivo'}
                        </label>
                        {archivo ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void alQuitarArchivo()}
                            disabled={ocupado}
                          >
                            Quitar archivo
                          </Button>
                        ) : null}
                      </div>
                      <p className={styles.nota}>
                        {soloPdf ? 'Solo PDF' : nombresFormatos}, hasta{' '}
                        {formatoTamano(MAX_BYTES_ARCHIVO_RECURSO)}.
                      </p>
                    </>
                  )}
                  {errores.archivo ? (
                    <p id="error-archivo" className={styles.errorCampo}>
                      {errores.archivo}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <Card className={styles.seccion}>
              <h2>Clasificación</h2>
              <div className={styles.fila}>
                <Select
                  label="Área de habilidad"
                  value={form.area ?? ''}
                  onChange={(e) => cambiar('area', (e.target.value || null) as Formulario['area'])}
                  id="campo-area"
                  error={errores.area}
                >
                  <option value="">Sin área</option>
                  {AREAS_HABILIDAD.map((a) => (
                    <option key={a} value={a}>
                      {ETIQUETAS_AREA[a]}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Duración (minutos)"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  value={form.duracionMin}
                  onChange={(e) => cambiar('duracionMin', e.target.value)}
                  id="campo-duracionMin"
                  error={errores.duracionMin}
                />
              </div>
              <fieldset
                id="campo-elementos"
                className={styles.elementos}
                aria-describedby={errores.elementos ? 'error-elementos' : undefined}
              >
                <legend>Elementos de colaboración</legend>
                {ELEMENTOS_COLABORACION.map((e) => (
                  <Checkbox
                    key={e}
                    label={ETIQUETAS_ELEMENTO[e]}
                    checked={form.elementos.includes(e)}
                    onChange={() => alternarElemento(e)}
                  />
                ))}
                {errores.elementos ? (
                  <p id="error-elementos" className={styles.errorCampo}>
                    {errores.elementos}
                  </p>
                ) : null}
              </fieldset>
            </Card>

            <Card className={styles.seccion}>
              <h2>Fuente y publicación</h2>
              <div className={styles.fila}>
                <Input
                  label="Fuente o autoría"
                  value={form.fuente}
                  maxLength={LARGO_MAXIMO_RECURSO.fuente}
                  onChange={(e) => cambiar('fuente', e.target.value)}
                  id="campo-fuente"
                  error={errores.fuente}
                />
                <Input
                  label="Licencia o derechos de uso"
                  value={form.licencia}
                  maxLength={LARGO_MAXIMO_RECURSO.licencia}
                  onChange={(e) => cambiar('licencia', e.target.value)}
                  id="campo-licencia"
                  error={errores.licencia}
                />
              </div>
              {esAutor ? null : (
                <div className={styles.filaCorta}>
                  <Input
                    label="Orden en la lista"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder={recurso ? undefined : 'Al final'}
                    value={form.orden}
                    onChange={(e) => cambiar('orden', e.target.value)}
                    id="campo-orden"
                    error={errores.orden}
                  />
                </div>
              )}
            </Card>
          </fieldset>

          {esAutor ? (
            <AccionesAutor
              estatus={estatus}
              ocupado={ocupado}
              onEnviar={() => void enviarARevision()}
              onCancelarEnvio={() => setConfirmar('cancelarEnvio')}
              onEliminar={() => setConfirmar('eliminar')}
            />
          ) : soloLectura ? (
            <p className={styles.nota}>
              Esta propuesta está {estatus === 'en_revision' ? 'en revisión' : 'rechazada'}: no se
              edita desde aquí.{' '}
              <Link to={`/admin/revisiones/recursos/${idRecurso}`}>Ir a su revisión</Link>
            </p>
          ) : (
            <div className={styles.acciones}>
              {propuestaEnElPanel ? (
                <Button type="submit" disabled={ocupado}>
                  Guardar cambios
                </Button>
              ) : estatus === null || estatus === 'borrador' ? (
                <>
                  <Button onClick={() => void guardar('publicado')} disabled={ocupado}>
                    Publicar
                  </Button>
                  <Button variant="secondary" type="submit" disabled={ocupado}>
                    Guardar borrador
                  </Button>
                </>
              ) : estatus === 'publicado' ? (
                <>
                  <Button type="submit" disabled={ocupado}>
                    Guardar cambios
                  </Button>
                  {/* Retirar es reversible: botón secundario, no de peligro. */}
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmar('retirar')}
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
                  <Button variant="secondary" type="submit" disabled={ocupado}>
                    Guardar cambios
                  </Button>
                </>
              )}
              {ocupado ? <IconoCargando size={20} /> : null}
              {recurso && !propuestaEnElPanel ? (
                <Button
                  variant="danger"
                  className={styles.accionDestructiva}
                  onClick={() => setConfirmar('eliminar')}
                  disabled={ocupado || recurso.usadoEn.length > 0}
                  title={
                    recurso.usadoEn.length > 0
                      ? 'Este recurso está en un curso; quítalo de ahí primero.'
                      : undefined
                  }
                >
                  Eliminar
                </Button>
              ) : null}
            </div>
          )}
        </form>
      </div>

      <Modal
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={
          confirmar === 'eliminar'
            ? esAutor
              ? '¿Eliminar tu propuesta?'
              : '¿Eliminar este recurso?'
            : confirmar === 'cancelarEnvio'
              ? '¿Cancelar el envío?'
              : '¿Retirar este recurso?'
        }
        descripcion={
          confirmar === 'cancelarEnvio'
            ? `«${form.titulo}» sale de la cola de revisión y vuelve a ser un borrador que puedes editar.`
            : confirmar === 'eliminar' && esAutor
              ? `«${form.titulo}» se eliminará definitivamente. No se puede deshacer.`
              : confirmar === 'eliminar'
                ? estatus === 'borrador'
                  ? `«${form.titulo}» se eliminará definitivamente. No se puede deshacer.`
                  : `«${form.titulo}» se eliminará definitivamente, junto con su archivo, y dejará de aparecer en Recursos. No se puede deshacer. Si solo quieres ocultarlo por ahora, retíralo.`
                : `«${form.titulo}» dejará de aparecer en Recursos${
                    recurso?.usadoEn.length
                      ? ' y sus lecciones en cursos se verán como no disponibles'
                      : ''
                  }. Podrás volver a publicarlo después.`
        }
      >
        <div className={styles.accionesModal}>
          <Button variant="secondary" onClick={() => setConfirmar(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmar === 'eliminar' ? 'danger' : 'primary'}
            onClick={() => void alConfirmar()}
          >
            {confirmar === 'eliminar'
              ? 'Sí, eliminar'
              : confirmar === 'cancelarEnvio'
                ? 'Cancelar el envío'
                : 'Sí, retirar'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}

/** El aviso que el editor del autor deja en Mis propuestas. */
function avisoAutor({ titulo, accion }: AvisoContenido): string {
  return accion === 'eliminado'
    ? `Se eliminó tu propuesta «${titulo}».`
    : `Se guardaron los cambios de «${titulo}».`
}

/** Lo que el autor puede hacer con su propuesta en cada estado. */
function AccionesAutor({
  estatus,
  ocupado,
  onEnviar,
  onCancelarEnvio,
  onEliminar,
}: {
  estatus: EstatusRecurso | null
  ocupado: boolean
  onEnviar: () => void
  onCancelarEnvio: () => void
  onEliminar: () => void
}) {
  const eliminable =
    estatus === 'borrador' || estatus === 'cambios_solicitados' || estatus === 'rechazado'
  return (
    <div className={styles.acciones}>
      {estatus === null ? (
        <Button type="submit" disabled={ocupado}>
          Guardar borrador
        </Button>
      ) : estatus === 'borrador' || estatus === 'cambios_solicitados' ? (
        <>
          <Button onClick={onEnviar} disabled={ocupado}>
            Enviar a revisión
          </Button>
          <Button variant="secondary" type="submit" disabled={ocupado}>
            Guardar borrador
          </Button>
        </>
      ) : estatus === 'en_revision' ? (
        <Button variant="secondary" onClick={onCancelarEnvio} disabled={ocupado}>
          Cancelar el envío
        </Button>
      ) : null}
      {ocupado ? <IconoCargando size={20} /> : null}
      {eliminable ? (
        <Button
          variant="danger"
          className={styles.accionDestructiva}
          onClick={onEliminar}
          disabled={ocupado}
        >
          Eliminar
        </Button>
      ) : null}
    </div>
  )
}
