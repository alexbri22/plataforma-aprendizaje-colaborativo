import { corregibleHoy, bitacoraHabilitada, type ContenidoBitacora } from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import { AvisoError, Button, Card, IconoCargando, Paginacion, rebanar } from '../../components/ui'
import { useActividad } from '../actividades'
import { useEquipo } from '../equipos/useEquipos'
import { borradorSinTexto, borradorVacio, validarBorrador } from './borradorBitacora'
import { CamposEntradaBitacora } from './CamposBitacora'
import { TarjetaEntradaBitacora } from './TarjetaEntradaBitacora'
import {
  useBitacora,
  useCrearEntradaBitacoraMutation,
  useEditarEntradaBitacoraMutation,
} from './useBitacora'
import styles from './PantallaEspacioEquipo.module.css'

// Las tarjetas ahora empiezan colapsadas (TarjetaEntradaBitacora): una fila
// compacta cada una, así que una página más grande sigue cabiendo sin
// desplazamiento excesivo.
const ENTRADAS_POR_PAGINA = 20

function mensajeDe(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No pudimos completar la acción. Intenta de nuevo.'
}

// Entrada nueva en el formato de la función (nucleo §9.3): plegada tras un
// botón, porque guiada son diez preguntas y abiertas siempre empujarían las
// entradas fuera de la vista.
function FormularioNuevaEntrada({
  formato,
  onCrear,
}: {
  formato: 'guiada' | 'libre'
  onCrear: (contenido: ContenidoBitacora) => Promise<void>
}) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState<ContenidoBitacora>(() => borradorVacio(formato))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  function cerrar() {
    setAbierto(false)
    setBorrador(borradorVacio(formato))
    setError(null)
    setErrores({})
  }

  async function manejarEnviar(evento: FormEvent) {
    evento.preventDefault()
    const validacion = validarBorrador(borrador)
    if ('errores' in validacion) {
      setErrores(validacion.errores)
      setError(validacion.errores.respuestas ?? null)
      return
    }
    setGuardando(true)
    setError(null)
    setErrores({})
    try {
      await onCrear(validacion)
      cerrar()
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <div>
        <Button size="sm" onClick={() => setAbierto(true)}>
          Nueva entrada
        </Button>
      </div>
    )
  }

  return (
    <Card className={styles.formularioNuevo}>
      <form onSubmit={manejarEnviar} className={styles.formulario}>
        <CamposEntradaBitacora borrador={borrador} errores={errores} onCambiar={setBorrador} />
        {error ? <AvisoError mensaje={error} /> : null}
        <div className={styles.acciones}>
          <Button type="submit" size="sm" disabled={guardando || borradorSinTexto(borrador)}>
            {guardando ? <IconoCargando size={14} /> : 'Guardar entrada'}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={guardando} onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}

// Mi bitácora (nucleo §9.3, §9.5): registro personal de avances y
// dificultades, vinculado a la propia membresía y no al equipo. Sin límite
// de una por día. Solo el autor la ve y la escribe; quien organiza puede
// comentar cada entrada (nucleo §10.4), visible aquí de inmediato.
//
// Vive dentro de AppShellEquipo (decisión de producto): aunque la bitácora
// no es del equipo, se llega aquí desde el espacio de equipo y el camino de
// vuelta es el mismo shell, no una salida hacia /actividades. La ruta cuelga
// de /equipos/{id}, de donde se resuelve idActividad (useEquipo), igual que
// PantallaEspacioEquipo.
export function PantallaMiBitacora() {
  const { idEquipo = '' } = useParams<{ idEquipo: string }>()
  const [parametros] = useSearchParams()
  const idAAbrir = parametros.get('abrir')
  const [pagina, setPagina] = useState(0)
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({})
  const [idAAbrirProcesado, setIdAAbrirProcesado] = useState<string | null>(null)

  const equipoQuery = useEquipo(idEquipo)
  const idActividad = equipoQuery.data?.idActividad
  const actividadQuery = useActividad(idActividad ?? '', { enabled: Boolean(idActividad) })
  const entradasQuery = useBitacora(idActividad ?? '')
  const crear = useCrearEntradaBitacoraMutation(idActividad ?? '')
  const editar = useEditarEntradaBitacoraMutation(idActividad ?? '')

  // Al llegar desde un evento del historial (nucleo §5.5): salta a la
  // página donde está esa entrada, para que la tarjeta que se abre también
  // quede visible sin tener que buscarla entre las demás páginas. Ajuste
  // durante el render (no en un efecto): entradasQuery.data llega después
  // del primer render, así que no hay otro momento seguro.
  if (idAAbrir && idAAbrir !== idAAbrirProcesado && entradasQuery.data) {
    const indice = entradasQuery.data.findIndex((e) => e.id === idAAbrir)
    if (indice >= 0) setPagina(Math.floor(indice / ENTRADAS_POR_PAGINA))
    setIdAAbrirProcesado(idAAbrir)
  }

  if (equipoQuery.isPending || (idActividad && actividadQuery.isPending)) {
    return (
      <AppShellEquipo idEquipo={idEquipo} seccionActiva="bitacora" titulo="Mi bitácora">
        <div className={styles.cargando} role="status" aria-label="Cargando la bitácora">
          <IconoCargando size={24} />
        </div>
      </AppShellEquipo>
    )
  }

  if (equipoQuery.isError || !equipoQuery.data || actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShellEquipo idEquipo={idEquipo} seccionActiva="bitacora" titulo="Mi bitácora">
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShellEquipo>
    )
  }

  const actividad = actividadQuery.data
  const capacidades = actividad.capacidades ?? []
  // escribir_bitacora no mira el estado de la función (el servidor lo
  // comprueba aparte al guardar): sin esto, al entrar por URL con la
  // bitácora deshabilitada se mostraría un formulario que siempre da 409.
  const puedeEscribir =
    capacidades.includes('escribir_bitacora') &&
    bitacoraHabilitada(actividad.configuracion?.bitacora_individual)
  const puedeComentar = capacidades.includes('comentar')

  const alFallar = (idEntrada: string, error: unknown) =>
    setErrorPorId((previo) => ({ ...previo, [idEntrada]: mensajeDe(error) }))
  const limpiarError = (idEntrada: string) =>
    setErrorPorId((previo) =>
      Object.fromEntries(Object.entries(previo).filter(([id]) => id !== idEntrada)),
    )

  return (
    <AppShellEquipo
      idEquipo={idEquipo}
      seccionActiva="bitacora"
      titulo="Mi bitácora"
      ayuda="bitacora"
    >
      <div className={styles.contenido}>
        {puedeEscribir ? (
          <FormularioNuevaEntrada
            // Si la función cambia de formato, el formulario empieza de nuevo
            // en el formato vigente.
            key={actividad.configuracion?.bitacora_individual}
            formato={actividad.configuracion?.bitacora_individual === 'libre' ? 'libre' : 'guiada'}
            onCrear={async (contenido) => {
              await crear.mutateAsync(contenido)
            }}
          />
        ) : null}

        {entradasQuery.isPending ? (
          <div className={styles.cargando} role="status" aria-label="Cargando la bitácora">
            <IconoCargando size={20} />
          </div>
        ) : entradasQuery.isError ? (
          <AvisoError mensaje="No pudimos cargar la bitácora. Intenta de nuevo." />
        ) : entradasQuery.data.length === 0 ? (
          <p className={styles.ayuda}>
            {puedeEscribir
              ? 'Todavía no has escrito nada aquí. Usa Nueva entrada para agregar la primera.'
              : 'Todavía no hay entradas aquí.'}
          </p>
        ) : (
          (() => {
            const { visibles, pagina: paginaActual } = rebanar(
              entradasQuery.data,
              pagina,
              ENTRADAS_POR_PAGINA,
            )
            return (
              <>
                {visibles.map((entrada) => (
                  <TarjetaEntradaBitacora
                    key={entrada.id}
                    entrada={entrada}
                    // Solo se corrige el mismo día: la bitácora muestra cómo
                    // progresa quien la escribe.
                    puedeEditar={puedeEscribir && corregibleHoy(entrada.fechaCreacion)}
                    guardando={editar.isPending && editar.variables?.idEntrada === entrada.id}
                    error={errorPorId[entrada.id] ?? null}
                    idMiMembresia={actividad.idMiMembresia}
                    puedeComentar={puedeComentar}
                    expandidaInicial={entrada.id === idAAbrir}
                    onGuardar={async (contenido) => {
                      limpiarError(entrada.id)
                      try {
                        await editar.mutateAsync({ idEntrada: entrada.id, contenido })
                      } catch (e) {
                        alFallar(entrada.id, e)
                        throw e
                      }
                    }}
                  />
                ))}
                <Paginacion
                  total={entradasQuery.data.length}
                  tamano={ENTRADAS_POR_PAGINA}
                  pagina={paginaActual}
                  onCambiar={setPagina}
                  etiqueta="Mi bitácora"
                />
              </>
            )
          })()
        )}
      </div>
    </AppShellEquipo>
  )
}
