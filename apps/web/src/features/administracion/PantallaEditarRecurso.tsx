import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AREAS_HABILIDAD,
  ELEMENTOS_COLABORACION,
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
  Markdown,
  formatoTamano,
  urlArchivoAdmin,
  useActualizarRecurso,
  useCrearRecurso,
  useEliminarRecurso,
  useQuitarArchivoRecurso,
  useRecursoAdmin,
  useSubirArchivoRecurso,
  type DatosRecurso,
  type RecursoAdmin,
} from '../formacion'
import type { AccionRecurso, AvisoContenido } from './avisoContenido'
import styles from './PantallaEditarRecurso.module.css'

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

type Confirmacion = 'retirar' | 'eliminar' | null

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
  { campo: 'archivo', etiqueta: 'Archivo PDF' },
  { campo: 'area', etiqueta: 'Área de habilidad' },
  { campo: 'duracionMin', etiqueta: 'Duración' },
  { campo: 'elementos', etiqueta: 'Elementos de colaboración' },
  { campo: 'fuente', etiqueta: 'Fuente o autoría' },
  { campo: 'licencia', etiqueta: 'Licencia o derechos de uso' },
  { campo: 'orden', etiqueta: 'Orden en la lista' },
  { campo: 'estatus', etiqueta: 'Estatus' },
]

/** Lleva la vista y el foco a un campo del formulario. Si el campo no tiene
 * control propio (elementos, archivo sin recurso guardado) se enfoca su
 * primer control o su contenedor. Devuelve false si no está en pantalla. */
function irACampo(campo: string): boolean {
  const destino =
    document.getElementById(`campo-${campo}`) ??
    (campo === 'archivo' ? document.getElementById('seccion-archivo') : null)
  if (!destino) return false
  const enfocable =
    destino instanceof HTMLFieldSetElement
      ? (destino.querySelector<HTMLElement>('input, select, textarea') ?? destino)
      : destino
  destino.scrollIntoView({ behavior: 'smooth', block: 'center' })
  enfocable.focus({ preventScroll: true })
  return true
}

/** Lo que el aviso de la lista debe decir según el estatus antes y después. */
function accionDe(antes: EstatusRecurso | null, despues: EstatusRecurso): AccionRecurso {
  if (antes === null) return despues === 'publicado' ? 'publicado' : 'creado'
  if (antes === despues) return 'guardado'
  if (despues === 'retirado') return 'retirado'
  return antes === 'retirado' ? 'republicado' : 'publicado'
}

function sinCampo(errores: Record<string, string>, campo: string): Record<string, string> {
  const copia = { ...errores }
  delete copia[campo]
  return copia
}

// Alta y edición de un recurso formativo (§12.3 de
// docs/diseno-desarrollo-formacion.md). Los mínimos de publicación los valida
// el servidor; aquí solo se muestran sus errores junto a cada campo.
export function PantallaEditarRecurso() {
  const { id } = useParams()
  const consulta = useRecursoAdmin(id)

  if (id && consulta.isPending) {
    return (
      <AppShell seccionActiva="contenido" titulo="Editar recurso">
        <div role="status" aria-label="Cargando recurso">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (id && consulta.isError) {
    return (
      <AppShell seccionActiva="contenido" titulo="Editar recurso">
        <AvisoError mensaje={consulta.error.message} />
        <p>
          <Link to="/admin/contenido">Volver a la lista</Link>
        </p>
      </AppShell>
    )
  }

  // key: al cambiar de recurso el formulario remonta con los datos frescos.
  return <Editor key={consulta.data?.idRecurso ?? 'nuevo'} recurso={consulta.data ?? null} />
}

function Editor({ recurso }: { recurso: RecursoAdmin | null }) {
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

  const idRecurso = recurso?.idRecurso ?? ''
  const crear = useCrearRecurso()
  const actualizar = useActualizarRecurso(idRecurso)
  const subir = useSubirArchivoRecurso(idRecurso)
  const quitar = useQuitarArchivoRecurso(idRecurso)
  const eliminar = useEliminarRecurso()
  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    subir.isPending ||
    quitar.isPending ||
    eliminar.isPending

  const estatus: EstatusRecurso | null = recurso?.estatus ?? null
  const tipo = form.tipoRecurso
  const admiteArchivo = TIPOS_CON_ARCHIVO.includes(tipo)
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

  function manejarError(error: unknown, quiso?: EstatusRecurso) {
    if (error instanceof ErrorFormacion) {
      setErrores(error.detallePorCampo ?? {})
      setMensaje(
        error.detallePorCampo
          ? quiso === 'publicado'
            ? 'No se pudo publicar porque faltan datos. Para publicar, el recurso debe cumplir los criterios mínimos:'
            : 'No se pudo guardar. Revisa estos campos:'
          : error.message,
      )
    } else {
      setMensaje('Ocurrió un error inesperado.')
    }
    setIntentoFallido((n) => n + 1)
  }

  function volverALista(aviso: AvisoContenido) {
    navigate(`/admin/contenido${volverA}`, { state: { avisoContenido: aviso } })
  }

  async function guardar(nuevoEstatus?: EstatusRecurso) {
    setMensaje(null)
    setAviso(null)
    setErrores({})
    const datos = aDatos(form)
    if (nuevoEstatus) datos.estatus = nuevoEstatus
    try {
      const resultado = recurso
        ? await actualizar.mutateAsync(datos)
        : await crear.mutateAsync(datos)

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
    } catch (error) {
      manejarError(error, nuevoEstatus)
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
    if (archivo.type !== 'application/pdf') {
      setErrores((e) => ({ ...e, archivo: 'El archivo debe ser PDF.' }))
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
      seccionActiva="contenido"
      titulo={recurso ? 'Editar recurso' : 'Nuevo recurso'}
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
          <Link to={`/admin/contenido${volverA}`} className={styles.volver}>
            ← Contenido formativo
          </Link>
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
                <h3>Archivo PDF{tipo === 'plantilla' ? ' (opcional)' : ''}</h3>
                {!recurso ? (
                  <p className={styles.nota}>Guarda el borrador para poder adjuntar el archivo.</p>
                ) : (
                  <>
                    {archivo ? (
                      <p className={styles.archivoActual}>
                        {/* Descarga del panel: abre también el PDF de un borrador
                            o de un recurso retirado, para revisarlo. */}
                        <a
                          href={urlArchivoAdmin(idRecurso, archivo)}
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
                          accept="application/pdf"
                          disabled={ocupado}
                          aria-describedby={errores.archivo ? 'error-archivo' : undefined}
                          onChange={(e) => {
                            void alElegirArchivo(e.target.files?.[0])
                            e.target.value = ''
                          }}
                        />
                        {archivo ? 'Reemplazar PDF' : 'Subir PDF'}
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
                      Solo PDF, hasta {formatoTamano(MAX_BYTES_ARCHIVO_RECURSO)}.
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
          </Card>

          <div className={styles.acciones}>
            {estatus === null || estatus === 'borrador' ? (
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
            {recurso ? (
              <Button
                variant="danger"
                className={styles.accionDestructiva}
                onClick={() => setConfirmar('eliminar')}
                disabled={ocupado}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <Modal
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar === 'eliminar' ? '¿Eliminar este recurso?' : '¿Retirar este recurso?'}
        descripcion={
          confirmar === 'eliminar'
            ? estatus === 'borrador'
              ? `«${form.titulo}» se eliminará definitivamente. No se puede deshacer.`
              : `«${form.titulo}» se eliminará definitivamente, junto con su archivo, y dejará de aparecer en Recursos. No se puede deshacer. Si solo quieres ocultarlo por ahora, retíralo.`
            : `«${form.titulo}» dejará de aparecer en Recursos. Podrás volver a publicarlo después.`
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
            {confirmar === 'eliminar' ? 'Eliminar definitivamente' : 'Retirar'}
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
