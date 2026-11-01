import {
  LONGITUD_MAXIMA_CONTENIDO_ELEMENTO,
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
import { useEquipo } from '../equipos/useEquipos'
import { TarjetaElemento } from './TarjetaElemento'
import {
  useCrearElementoMutation,
  useEditarElementoMutation,
  useEliminarElementoMutation,
  useElementos,
} from './useElementos'
import styles from './PantallaEspacioEquipo.module.css'

const TITULOS: Record<ElementoEspacioEquipo, string> = {
  metas: 'Metas',
  avances: 'Avances',
  recursos: 'Recursos',
}

const AYUDA: Record<ElementoEspacioEquipo, string> = {
  metas: 'Qué se propone lograr el equipo.',
  avances: 'Qué ha avanzado el equipo y cuándo.',
  recursos: 'Enlaces o notas que el equipo necesita a la mano.',
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
}: {
  tipo: ElementoEspacioEquipo
  onCrear: (contenido: string) => Promise<void>
}) {
  const [contenido, setContenido] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function manejarEnviar(evento: FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onCrear(contenido)
      setContenido('')
    } catch (e) {
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
        />
        {error ? <AvisoError mensaje={error} /> : null}
        <Button type="submit" size="sm" disabled={guardando || contenido.trim() === ''}>
          {guardando ? <IconoCargando size={14} /> : 'Agregar'}
        </Button>
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
      titulo={`${TITULOS[tipo]} de ${equipo.nombre}`}
    >
      {estado === 'deshabilitado' ? (
        <p className={styles.ayuda}>{TITULOS[tipo]} no está habilitado en esta actividad.</p>
      ) : (
        <div className={styles.contenido}>
          {estado === 'obligatorio' && elementosQuery.data?.length === 0 ? (
            <Badge variant="warning">Obligatorio: todavía no hay nada aquí</Badge>
          ) : null}

          {puedeEscribir ? (
            <FormularioNuevoElemento
              tipo={tipo}
              onCrear={async (contenido) => {
                await crear.mutateAsync(contenido)
              }}
            />
          ) : null}

          {elementosQuery.isPending ? (
            <div className={styles.cargando} role="status" aria-label={`Cargando ${TITULOS[tipo]}`}>
              <IconoCargando size={20} />
            </div>
          ) : elementosQuery.isError ? (
            <AvisoError mensaje="No pudimos cargar esto. Intenta de nuevo." />
          ) : elementosQuery.data.length === 0 ? (
            <p className={styles.ayuda}>
              {puedeEscribir
                ? 'Todavía no hay nada aquí. Usa el formulario para agregar lo primero.'
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
                      puedeEscribir={puedeEscribir}
                      guardando={editar.isPending && editar.variables?.idElemento === elemento.id}
                      eliminando={eliminar.isPending && eliminar.variables === elemento.id}
                      error={errorPorId[elemento.id] ?? null}
                      idMiMembresia={equipo.idMiMembresia}
                      puedeComentar={puedeComentar}
                      expandidaInicial={elemento.id === idAAbrir}
                      onGuardar={async (contenido) => {
                        limpiarError(elemento.id)
                        try {
                          await editar.mutateAsync({ idElemento: elemento.id, contenido })
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
    </AppShellEquipo>
  )
}
