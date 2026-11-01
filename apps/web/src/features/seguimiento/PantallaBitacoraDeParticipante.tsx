import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppShellEquipo } from '../../components/AppShellEquipo'
import { AvisoError, IconoCargando, Paginacion, rebanar } from '../../components/ui'
import { useActividad } from '../actividades'
import { useEquipo } from '../equipos/useEquipos'
import { TarjetaEntradaBitacora } from './TarjetaEntradaBitacora'
import { useBitacora } from './useBitacora'
import styles from './PantallaEspacioEquipo.module.css'

// Las tarjetas ahora empiezan colapsadas (TarjetaEntradaBitacora): una fila
// compacta cada una, así que una página más grande sigue cabiendo sin
// desplazamiento excesivo.
const ENTRADAS_POR_PAGINA = 20

// La bitácora de un participante, vista por quien organiza o co-organiza
// con `leer_bitacoras` (nucleo §9.3, P-06). Se llega aquí desde el sidebar
// del espacio de equipo (AppShellEquipo, bajo el nombre de cada integrante),
// no desde Participantes: esa lista es exclusivamente del ritual de
// reconocimiento. Es de solo lectura: aquí no se escriben entradas, solo
// comentarios sobre las que ya existen (nucleo §10.4). Vive dentro del
// mismo shell del equipo del que se vino (igual que PantallaMiBitacora):
// se llega aquí y se vuelve aquí sin salir a /actividades. Si el actor no
// tiene el permiso, el servidor rechaza la consulta y esta pantalla lo
// muestra como cualquier otro error — el enlace que lleva aquí se oculta
// por conveniencia, no como barrera (general §7.4).
export function PantallaBitacoraDeParticipante() {
  const { idEquipo = '', idMembresia = '' } = useParams<{ idEquipo: string; idMembresia: string }>()
  const [parametros] = useSearchParams()
  const idAAbrir = parametros.get('abrir')
  const [pagina, setPagina] = useState(0)
  const [idAAbrirProcesado, setIdAAbrirProcesado] = useState<string | null>(null)

  const equipoQuery = useEquipo(idEquipo)
  const idActividad = equipoQuery.data?.idActividad
  const actividadQuery = useActividad(idActividad ?? '', { enabled: Boolean(idActividad) })
  const entradasQuery = useBitacora(idActividad ?? '', idMembresia)

  // Ajuste durante el render (no en un efecto): entradasQuery.data llega
  // después del primer render, así que no hay otro momento seguro.
  if (idAAbrir && idAAbrir !== idAAbrirProcesado && entradasQuery.data) {
    const indice = entradasQuery.data.findIndex((e) => e.id === idAAbrir)
    if (indice >= 0) setPagina(Math.floor(indice / ENTRADAS_POR_PAGINA))
    setIdAAbrirProcesado(idAAbrir)
  }

  const participante = equipoQuery.data?.integrantes.find((i) => i.idMembresia === idMembresia)
  const titulo = participante ? `Bitácora de ${participante.nombre}` : 'Bitácora'

  if (equipoQuery.isPending || (idActividad && actividadQuery.isPending)) {
    return (
      <AppShellEquipo idEquipo={idEquipo} seccionActiva="bitacora" titulo={titulo}>
        <div className={styles.cargando} role="status" aria-label="Cargando la bitácora">
          <IconoCargando size={24} />
        </div>
      </AppShellEquipo>
    )
  }

  if (equipoQuery.isError || !equipoQuery.data || actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShellEquipo idEquipo={idEquipo} seccionActiva="bitacora" titulo={titulo}>
        <AvisoError mensaje="No encontramos esta actividad, o ya no formas parte de ella." />
      </AppShellEquipo>
    )
  }

  const actividad = actividadQuery.data
  const puedeComentar = (actividad.capacidades ?? []).includes('comentar')

  return (
    <AppShellEquipo idEquipo={idEquipo} seccionActiva="bitacora" titulo={titulo}>
      <div className={styles.contenido}>
        {entradasQuery.isPending ? (
          <div className={styles.cargando} role="status" aria-label="Cargando la bitácora">
            <IconoCargando size={20} />
          </div>
        ) : entradasQuery.isError ? (
          <AvisoError
            mensaje={
              entradasQuery.error instanceof Error
                ? entradasQuery.error.message
                : 'No pudimos cargar la bitácora.'
            }
          />
        ) : entradasQuery.data.length === 0 ? (
          <p className={styles.ayuda}>Todavía no hay entradas aquí.</p>
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
                    puedeEditar={false}
                    guardando={false}
                    error={null}
                    idMiMembresia={actividad.idMiMembresia}
                    puedeComentar={puedeComentar}
                    expandidaInicial={entrada.id === idAAbrir}
                    onGuardar={async () => {}}
                  />
                ))}
                <Paginacion
                  total={entradasQuery.data.length}
                  tamano={ENTRADAS_POR_PAGINA}
                  pagina={paginaActual}
                  onCambiar={setPagina}
                  etiqueta="Bitácora"
                />
              </>
            )
          })()
        )}
      </div>
    </AppShellEquipo>
  )
}
