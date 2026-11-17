import {
  ELEMENTOS_CON_HISTORIA,
  corregibleHoy,
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
  esUrlSegura,
  parsearEstadoEspacioEquipo,
  type AccionActividad,
  type ElementoEspacioEquipo,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  IconoCargando,
  Paginacion,
  Textarea,
  rebanar,
} from '../../components/ui'
import { useActividad } from '../actividades'
import { IntegrantesEquipo } from '../equipos/IntegrantesEquipo'
import { useEquipo } from '../equipos/useEquipos'
import { CamposAdjuntos } from './AdjuntosElemento'
import { TarjetaElemento } from './TarjetaElemento'
import {
  useCrearElementoMutation,
  useEditarElementoMutation,
  useEliminarElementoMutation,
  useElementos,
  ErrorArchivoSinSubir,
  type DatosElemento,
} from './useElementos'
import { PuntajeDelEquipo } from '../evaluacion/PuntajeDelEquipo'
import styles from './PantallaEspacioEquipo.module.css'

const TITULOS: Record<ElementoEspacioEquipo, string> = {
  metas: 'Metas',
  planeacion: 'Planeación',
  avances: 'Avances',
  recursos: 'Materiales',
  producto: 'Producto',
}

const AYUDA: Record<ElementoEspacioEquipo, string> = {
  metas: 'Qué se propone lograr el equipo.',
  planeacion: 'Cómo se organiza el equipo: tareas, responsables y fechas.',
  avances: 'Qué ha avanzado el equipo y cuándo.',
  recursos: 'Enlaces o notas que el equipo necesita a la mano.',
  producto: 'Lo que el equipo entrega como resultado final.',
}

// El botón que abre el formulario para agregar algo nuevo.
const AGREGAR: Record<ElementoEspacioEquipo, string> = {
  metas: 'Agregar meta',
  planeacion: 'Agregar a la planeación',
  avances: 'Agregar avance',
  recursos: 'Agregar material',
  producto: 'Agregar al producto',
}

// Las tarjetas ahora empiezan colapsadas (TarjetaElemento): una fila
// compacta cada una, así que una página más grande sigue cabiendo sin
// desplazamiento excesivo.
const TAMANO_PAGINA = 20

function mensajeDe(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No pudimos completar la acción. Intenta de nuevo.'
}

function FormularioNuevoElemento({
  tipo,
  onCrear,
  onCerrar,
}: {
  tipo: ElementoEspacioEquipo
  onCrear: (datos: DatosElemento) => Promise<void>
  onCerrar: () => void
}) {
  const [contenido, setContenido] = useState('')
  const [enlace, setEnlace] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorEnlace, setErrorEnlace] = useState<string | undefined>()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function manejarEnviar(evento: FormEvent) {
    evento.preventDefault()
    const enlaceLimpio = enlace.trim()
    if (enlaceLimpio && !esUrlSegura(enlaceLimpio)) {
      setErrorEnlace('Debe ser un enlace completo que empiece con https://')
      return
    }
    setErrorEnlace(undefined)
    setGuardando(true)
    setError(null)
    try {
      await onCrear({ contenido, enlace: enlaceLimpio || null, archivo: archivo ?? undefined })
      setContenido('')
      setEnlace('')
      setArchivo(null)
      onCerrar()
    } catch (e) {
      // El elemento ya existe: se limpia el formulario para que «Agregar» no
      // lo cree otra vez, y el aviso dice cómo adjuntar el archivo.
      if (e instanceof ErrorArchivoSinSubir) {
        setContenido('')
        setEnlace('')
        setArchivo(null)
      }
      setError(mensajeDe(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className={styles.formularioNuevo}>
      <form onSubmit={manejarEnviar} className={styles.formulario}>
        <Textarea
          label={`Agregar a ${TITULOS[tipo].toLowerCase()}`}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          maxLength={LONGITUD_MAXIMA_CONTENIDO_ELEMENTO}
          placeholder={AYUDA[tipo]}
          autoFocus
        />
        <CamposAdjuntos
          enlace={enlace}
          onEnlace={setEnlace}
          archivoNuevo={archivo}
          onArchivoNuevo={setArchivo}
          errorEnlace={errorEnlace}
          disabled={guardando}
        />
        {error ? <AvisoError mensaje={error} /> : null}
        <div className={styles.acciones}>
          <Button type="submit" size="sm" disabled={guardando || contenido.trim() === ''}>
            {guardando ? <IconoCargando size={14} /> : 'Agregar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={guardando}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}

export interface PantallaEspacioEquipoProps {
  tipo: ElementoEspacioEquipo
}

// Metas, Avances o Recursos del propio equipo, o del de otra persona si
// quien mira organiza o co-organiza (general §7.3). El estado de
// configuración (deshabilitado/opcional/obligatorio) ya existe en
// Configuración (SeccionProyectoColaborativo); esta pantalla lo reutiliza
// como gate de contenido y nunca lo decide por su cuenta (nucleo §9.1, §4.3).
export function PantallaEspacioEquipo({ tipo }: PantallaEspacioEquipoProps) {
  const { idEquipo } = useParams<{ idEquipo: string }>()
  const id = idEquipo as string
  const [parametros] = useSearchParams()
  const idAAbrir = parametros.get('abrir')
  const [pagina, setPagina] = useState(0)
  // El formulario para agregar no está abierto de entrada.
  const [agregando, setAgregando] = useState(false)
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({})
  // Qué idAAbrir ya saltó de página, para no repetir el salto en cada
  // render una vez la persona cambia de página a propósito.
  const [idAAbrirProcesado, setIdAAbrirProcesado] = useState<string | null>(null)

  const equipoQuery = useEquipo(id)
  const idActividad = equipoQuery.data?.idActividad
  const actividadQuery = useActividad(idActividad ?? '', { enabled: Boolean(idActividad) })
  const elementosQuery = useElementos(id, tipo)

  // Al llegar desde un evento del historial (nucleo §5.5): salta a la
  // página donde está ese elemento, para que la tarjeta que se abre
  // también quede visible sin tener que buscarla entre las demás páginas.
  // Ajuste durante el render (no en un efecto): elementosQuery.data llega
  // después del primer render, así que no hay otro momento seguro.
  if (idAAbrir && idAAbrir !== idAAbrirProcesado && elementosQuery.data) {
    const indice = elementosQuery.data.findIndex((e) => e.id === idAAbrir)
    if (indice >= 0) setPagina(Math.floor(indice / TAMANO_PAGINA))
    setIdAAbrirProcesado(idAAbrir)
  }

  const crear = useCrearElementoMutation(id, tipo)
  const editar = useEditarElementoMutation(id, tipo)
  const eliminar = useEliminarElementoMutation(id, tipo)

  if (equipoQuery.isPending || (idActividad && actividadQuery.isPending)) {
    return (
      <AppShellEquipo idEquipo={id} seccionActiva={tipo} titulo={TITULOS[tipo]}>
        <div className={styles.cargando} role="status" aria-label={`Cargando ${TITULOS[tipo]}`}>
          <IconoCargando size={24} />
        </div>
      </AppShellEquipo>
    )
  }

  if (equipoQuery.isError || !equipoQuery.data || actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShellEquipo idEquipo={id} seccionActiva={tipo} titulo={TITULOS[tipo]}>
        <AvisoError mensaje="No encontramos este equipo, o no formas parte de su actividad." />
      </AppShellEquipo>
    )
  }

  const equipo = equipoQuery.data
  const actividad = actividadQuery.data
  const capacidades: readonly AccionActividad[] = actividad.capacidades ?? []
  const soyIntegrante = equipo.integrantes.some((i) => i.idMembresia === equipo.idMiMembresia)
  const puedeEscribir = soyIntegrante && capacidades.includes('usar_espacio_equipo')
  const puedeComentar = capacidades.includes('comentar')

  const estadoEspacio = actividad.configuracion?.espacio_equipo
    ? parsearEstadoEspacioEquipo(actividad.configuracion.espacio_equipo)
    : null
  const estado = estadoEspacio?.[tipo] ?? 'opcional'

  const alFallar = (idElemento: string, error: unknown) =>
    setErrorPorId((previo) => ({ ...previo, [idElemento]: mensajeDe(error) }))
  const limpiarError = (idElemento: string) =>
    setErrorPorId((previo) =>
      Object.fromEntries(Object.entries(previo).filter(([id]) => id !== idElemento)),
    )

  return (
    <AppShellEquipo
      idEquipo={id}
      seccionActiva={tipo}
      titulo={TITULOS[tipo]}
      ayuda={tipo === 'recursos' ? 'materiales' : tipo}
    >
      <div className={styles.pagina}>
        <IntegrantesEquipo integrantes={equipo.integrantes} />
        {/* Quien organiza califica el elemento aquí, viendo el trabajo
          (nucleo §10.3, P-40). */}
        {actividad.rol !== 'participante' &&
        actividad.configuracion?.calificacion === 'habilitada' &&
        estado !== 'deshabilitado' ? (
          <PuntajeDelEquipo
            idActividad={actividad.id}
            idEquipo={id}
            elemento={tipo}
            puedeCapturar={capacidades.includes('capturar_puntaje')}
          />
        ) : null}
        {estado === 'deshabilitado' ? (
          <p className={styles.ayuda}>Esta sección no se usa en esta actividad.</p>
        ) : (
          <div className={styles.contenido}>
            {estado === 'obligatorio' && elementosQuery.data?.length === 0 ? (
              <Badge variant="warning">Obligatorio: falta agregar algo aquí</Badge>
            ) : null}

            {puedeEscribir && agregando ? (
              <FormularioNuevoElemento
                tipo={tipo}
                onCrear={async (datos) => {
                  await crear.mutateAsync(datos)
                }}
                onCerrar={() => setAgregando(false)}
              />
            ) : puedeEscribir ? (
              <div className={styles.barra}>
                <Button size="sm" onClick={() => setAgregando(true)}>
                  {AGREGAR[tipo]}
                </Button>
              </div>
            ) : null}

            {elementosQuery.isPending ? (
              <div
                className={styles.cargando}
                role="status"
                aria-label={`Cargando ${TITULOS[tipo]}`}
              >
                <IconoCargando size={20} />
              </div>
            ) : elementosQuery.isError ? (
              <AvisoError mensaje="No pudimos cargar esto. Intenta de nuevo." />
            ) : elementosQuery.data.length === 0 ? (
              <p className={styles.ayuda}>
                {puedeEscribir
                  ? 'Todavía no hay nada aquí.'
                  : 'El equipo todavía no ha agregado nada aquí.'}
              </p>
            ) : (
              (() => {
                // rebanar corrige la página si dejó de existir (p. ej. se
                // eliminó el único elemento de la última): pasar la que
                // devuelve, no el estado crudo, para que Paginacion no
                // muestre un rango imposible como "21-20 de 20".
                const { visibles, pagina: paginaActual } = rebanar(
                  elementosQuery.data,
                  pagina,
                  TAMANO_PAGINA,
                )
                return (
                  <>
                    {visibles.map((elemento) => (
                      <TarjetaElemento
                        key={elemento.id}
                        elemento={elemento}
                        // Los avances solo se corrigen el mismo día en que se
                        // publicaron (ELEMENTOS_CON_HISTORIA).
                        puedeEscribir={
                          puedeEscribir &&
                          (!ELEMENTOS_CON_HISTORIA.includes(tipo) ||
                            corregibleHoy(elemento.fechaCreacion))
                        }
                        guardando={editar.isPending && editar.variables?.idElemento === elemento.id}
                        eliminando={eliminar.isPending && eliminar.variables === elemento.id}
                        error={errorPorId[elemento.id] ?? null}
                        idMiMembresia={equipo.idMiMembresia}
                        puedeComentar={puedeComentar}
                        expandidaInicial={elemento.id === idAAbrir}
                        onGuardar={async (datos) => {
                          limpiarError(elemento.id)
                          try {
                            await editar.mutateAsync({ idElemento: elemento.id, ...datos })
                          } catch (e) {
                            alFallar(elemento.id, e)
                            throw e
                          }
                        }}
                        onEliminar={() => {
                          limpiarError(elemento.id)
                          eliminar.mutate(elemento.id, { onError: (e) => alFallar(elemento.id, e) })
                        }}
                      />
                    ))}
                    <Paginacion
                      total={elementosQuery.data.length}
                      tamano={TAMANO_PAGINA}
                      pagina={paginaActual}
                      onCambiar={setPagina}
                      etiqueta={TITULOS[tipo]}
                    />
                  </>
                )
              })()
            )}
          </div>
        )}
      </div>
    </AppShellEquipo>
  )
}
