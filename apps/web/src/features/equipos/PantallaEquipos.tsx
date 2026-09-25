import {
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  type AccionActividad,
  type Equipo,
  type LimitesEquipo,
  type RolIntegrante,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  IconoCargando,
  Input,
  Paginacion,
  rebanar,
} from '../../components/ui'
import { useActividad, type Actividad } from '../actividades'
import { AsignacionManual } from './AsignacionManual'
import { PanelAjustesFormacion } from './PanelAjustesFormacion'
import { PanelEditarEquipo } from './PanelEditarEquipo'
import { PanelIntercambio } from './PanelIntercambio'
import { ETIQUETA_FORMACION } from './etiquetas'
import { TarjetaEquipo } from './TarjetaEquipo'
import {
  useAsignarIntegranteMutation,
  useCerrarFormacionMutation,
  useCrearEquipoMutation,
  useEditarEquipoMutation,
  useEliminarEquipoMutation,
  useEquipos,
  useGenerarPropuestaMutation,
  useIntercambiarIntegrantesMutation,
  useRetirarIntegranteMutation,
} from './useEquipos'
import styles from './PantallaEquipos.module.css'

// Personas por página en las listas largas.
const TAMANO_PAGINA = 10

function mensajeDe(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No pudimos completar la acción. Intenta de nuevo.'
}

function rolIntegrante(rol: Actividad['rol']): RolIntegrante {
  return rol
}

// Quien puede cerrar la formación (acción 'cerrar_formacion'): avisa qué pasa
// con quienes no tienen equipo. Con la formación autogestionada la fase se
// cierra sola al completarse; esto cubre cerrarla antes.
// Cuántos equipos nuevos habrá que crear para que quepan quienes no tienen
// equipo, con el máximo de integrantes (P-27). Es el mismo cálculo que hace el
// servidor al cerrar, solo para avisarlo.
function equiposNuevosNecesarios(equipos: Equipo[], numSinEquipo: number, maximo: number | null) {
  if (maximo === null || numSinEquipo === 0) return 0
  const lugares = equipos.reduce(
    (total, e) => total + Math.max(0, maximo - e.integrantes.length),
    0,
  )
  return Math.ceil(Math.max(0, numSinEquipo - lugares) / maximo)
}

function AccionCerrarFormacion({
  idActividad,
  equipos,
  numSinEquipo,
  limites,
  onError,
}: {
  idActividad: string
  equipos: Equipo[]
  numSinEquipo: number
  limites: LimitesEquipo
  onError: (mensaje: string | null) => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const cerrar = useCerrarFormacionMutation(idActividad)
  const numEquipos = equipos.length
  const sinEquipos = numEquipos === 0
  const nuevos = equiposNuevosNecesarios(equipos, numSinEquipo, limites.maximo)
  const bajoMinimo =
    limites.minimo === null
      ? 0
      : equipos.filter((e) => e.integrantes.length < (limites.minimo as number)).length

  return (
    <Card className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>Cerrar la formación</h2>
      {/* Lo que pasaría al cerrar, en cifras y no en frases. */}
      <div className={styles.resumen}>
        {sinEquipos ? (
          <span className={styles.texto}>Crea un equipo para poder cerrar.</span>
        ) : numSinEquipo > 0 ? (
          <Badge variant="warning">{numSinEquipo} sin equipo</Badge>
        ) : (
          <Badge variant="success">Todos con equipo</Badge>
        )}
        {nuevos > 0 ? (
          <Badge variant="neutral">
            {nuevos === 1 ? '+1 equipo nuevo' : `+${nuevos} equipos nuevos`}
          </Badge>
        ) : null}
        {bajoMinimo > 0 ? (
          <Badge variant="warning">
            {bajoMinimo === 1 ? '1 equipo' : `${bajoMinimo} equipos`} bajo el mínimo
          </Badge>
        ) : null}
      </div>
      {confirmando ? (
        <div className={styles.botones}>
          <Button
            disabled={cerrar.isPending}
            onClick={() => {
              onError(null)
              cerrar.mutate(undefined, { onError: (e) => onError(mensajeDe(e)) })
            }}
          >
            {cerrar.isPending ? (
              <>
                <IconoCargando />
                Cerrando…
              </>
            ) : (
              'Confirmar cierre'
            )}
          </Button>
          <Button
            variant="secondary"
            disabled={cerrar.isPending}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          className={styles.botonAccion}
          disabled={sinEquipos}
          onClick={() => setConfirmando(true)}
        >
          Cerrar la formación
        </Button>
      )}
    </Card>
  )
}

// Propuesta del sistema (acción 'generar_propuesta_equipos', solo con la
// función en manual). Crea equipos normales en formación: se
// ajustan con la asignación y confirmar es cerrar la formación. Regenerar
// reemplaza los equipos actuales, así que pide confirmación.
function AccionPropuesta({
  idActividad,
  numEquipos,
  onError,
}: {
  idActividad: string
  numEquipos: number
  onError: (mensaje: string | null) => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [generados, setGenerados] = useState<number | null>(null)
  const generar = useGenerarPropuestaMutation(idActividad)
  const reemplaza = numEquipos > 0

  function ejecutar() {
    onError(null)
    generar.mutate(undefined, {
      onSuccess: (propuesta) => {
        setConfirmando(false)
        setGenerados(propuesta.numeroEquipos)
      },
      onError: (e) => {
        setConfirmando(false)
        onError(mensajeDe(e))
      },
    })
  }

  const cargando = (
    <>
      <IconoCargando />
      Generando…
    </>
  )

  return (
    <Card className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>Propuesta del sistema</h2>
      {generados !== null ? (
        <p className={styles.texto} role="status">
          Propuesta generada: {generados} {generados === 1 ? 'equipo' : 'equipos'}.
        </p>
      ) : null}
      {confirmando ? (
        <div className={styles.confirmacionPropuesta}>
          <p className={styles.texto}>
            Reemplaza {numEquipos === 1 ? 'el equipo actual' : `los ${numEquipos} equipos actuales`}
            .
          </p>
          <div className={styles.botones}>
            <Button disabled={generar.isPending} onClick={ejecutar}>
              {generar.isPending ? cargando : 'Reemplazar'}
            </Button>
            <Button
              variant="secondary"
              disabled={generar.isPending}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className={styles.botonAccion}
          variant={reemplaza ? 'secondary' : 'primary'}
          disabled={generar.isPending}
          onClick={reemplaza ? () => setConfirmando(true) : ejecutar}
        >
          {generar.isPending
            ? cargando
            : reemplaza
              ? 'Generar otra propuesta'
              : 'Generar propuesta'}
        </Button>
      )}
    </Card>
  )
}

function FormularioCrearEquipo({
  idActividad,
  seUne,
  onError,
}: {
  idActividad: string
  seUne: boolean
  onError: (mensaje: string | null) => void
}) {
  const [nombre, setNombre] = useState('')
  const crear = useCrearEquipoMutation(idActividad)

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (nombre.trim() === '') return
    onError(null)
    crear.mutate(nombre.trim(), {
      onSuccess: () => setNombre(''),
      onError: (e) => onError(mensajeDe(e)),
    })
  }

  return (
    <Card>
      <form className={styles.formularioCrear} onSubmit={enviar} noValidate>
        <Input
          label="Nombre del equipo"
          value={nombre}
          maxLength={LONGITUD_MAXIMA_NOMBRE_EQUIPO}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Button type="submit" disabled={crear.isPending || nombre.trim() === ''}>
          {seUne ? 'Crear equipo y unirme' : 'Crear equipo'}
        </Button>
      </form>
    </Card>
  )
}

function textoSinEquipos(actividad: Actividad): string {
  if (actividad.fase === 'configuracion' || actividad.fase === 'inscripcion') {
    return 'La formación empieza al cerrar la inscripción.'
  }
  return actividad.fase === 'formacion_equipos' ? 'Aún no hay equipos.' : 'Sin equipos.'
}

export function PantallaEquipos() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const equiposQuery = useEquipos(id)

  const [error, setError] = useState<string | null>(null)
  const [idEquipoEnEdicion, setIdEquipoEnEdicion] = useState<string | null>(null)
  const [errorPanel, setErrorPanel] = useState<string | null>(null)
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false)
  const [paginaSinEquipo, setPaginaSinEquipo] = useState(0)

  const asignar = useAsignarIntegranteMutation(id)
  const retirar = useRetirarIntegranteMutation(id)
  const editar = useEditarEquipoMutation(id)
  const eliminar = useEliminarEquipoMutation(id)
  const intercambiar = useIntercambiarIntegrantesMutation(id)
  const [intercambioAbierto, setIntercambioAbierto] = useState(false)
  const [errorIntercambio, setErrorIntercambio] = useState<string | null>(null)

  if (actividadQuery.isPending || equiposQuery.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Equipos">
        <div className={styles.cargando} role="status" aria-label="Cargando los equipos">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (actividadQuery.isError || !actividadQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Actividad no encontrada">
        <p className={styles.texto}>No encontramos esta actividad, o ya no formas parte de ella.</p>
      </AppShell>
    )
  }

  const actividad = actividadQuery.data
  const capacidades: readonly AccionActividad[] = actividad.capacidades ?? []
  const puede = (accion: AccionActividad) => capacidades.includes(accion)

  if (equiposQuery.isError || !equiposQuery.data) {
    return (
      <AppShell seccionActiva="actividades" titulo={`Equipos de ${actividad.nombre}`}>
        <AvisoError mensaje="No pudimos cargar los equipos." />
      </AppShell>
    )
  }

  const { equipos, sinEquipo, idMiMembresia, limites } = equiposQuery.data
  const puedeCrear = puede('formar_equipos') || puede('elegir_equipo')
  const sinEquipoPagina = rebanar(sinEquipo, paginaSinEquipo, TAMANO_PAGINA)
  const ocupado = asignar.isPending || retirar.isPending || editar.isPending || eliminar.isPending
  const equipoEnEdicion = equipos.find((e) => e.id === idEquipoEnEdicion) ?? null
  const enFormacion = actividad.fase === 'formacion_equipos'
  // Cómo se forman los equipos se configura desde aquí, antes del desarrollo.
  const fasePrevia =
    enFormacion || actividad.fase === 'inscripcion' || actividad.fase === 'configuracion'

  const alFallar = (e: unknown) => setError(mensajeDe(e))
  const unirme = (idEquipo: string) => {
    setError(null)
    asignar.mutate({ idEquipo, idMembresia: idMiMembresia }, { onError: alFallar })
  }
  const salir = (idEquipo: string) => {
    setError(null)
    retirar.mutate({ idEquipo, idMembresia: idMiMembresia }, { onError: alFallar })
  }
  // Las acciones del panel de edición muestran su error dentro del panel.
  const alFallarEnPanel = (e: unknown) => setErrorPanel(mensajeDe(e))
  const abrirPanel = (equipo: Equipo) => {
    setErrorPanel(null)
    setIdEquipoEnEdicion(equipo.id)
  }

  return (
    <AppShell
      seccionActiva="actividades"
      titulo={`Equipos de ${actividad.nombre}`}
      acciones={
        <Button variant="secondary" size="sm" to={`/actividades/${actividad.id}`}>
          Volver a la actividad
        </Button>
      }
    >
      <div className={styles.contenido}>
        {fasePrevia ? (
          <div className={styles.resumen}>
            {ETIQUETA_FORMACION[actividad.configuracion?.formacion_equipos ?? ''] ? (
              <Badge variant="primary">
                {ETIQUETA_FORMACION[actividad.configuracion?.formacion_equipos ?? '']}
              </Badge>
            ) : null}
            {limites.maximo !== null ? (
              <Badge variant="neutral">Máx. {limites.maximo}</Badge>
            ) : null}
            {limites.minimo !== null ? (
              <Badge variant="neutral">Mín. {limites.minimo}</Badge>
            ) : null}
            {puede('configurar_funciones') ? (
              <Button variant="secondary" size="sm" onClick={() => setAjustesAbiertos(true)}>
                Configurar
              </Button>
            ) : null}
          </div>
        ) : actividad.fase === 'archivada' ? (
          <p className={styles.texto}>Actividad archivada: solo lectura.</p>
        ) : actividad.fase === 'cierre' ? (
          <p className={styles.texto}>En cierre: los equipos ya no cambian.</p>
        ) : null}

        {error ? <AvisoError mensaje={error} /> : null}

        {puede('generar_propuesta_equipos') ? (
          <AccionPropuesta idActividad={id} numEquipos={equipos.length} onError={setError} />
        ) : null}

        {puede('cerrar_formacion') ? (
          <AccionCerrarFormacion
            idActividad={id}
            equipos={equipos}
            numSinEquipo={sinEquipo.length}
            limites={limites}
            onError={setError}
          />
        ) : null}

        {puedeCrear ? (
          <FormularioCrearEquipo
            idActividad={id}
            seUne={!puede('formar_equipos')}
            onError={setError}
          />
        ) : null}

        {equipos.length === 0 ? (
          <Card>
            <p className={styles.texto}>{textoSinEquipos(actividad)}</p>
          </Card>
        ) : (
          <div className={styles.rejilla}>
            {equipos.map((equipo) => (
              <TarjetaEquipo
                key={equipo.id}
                equipo={equipo}
                idMiMembresia={idMiMembresia}
                miRol={rolIntegrante(actividad.rol)}
                capacidades={capacidades}
                limites={limites}
                ocupado={ocupado}
                onUnirme={unirme}
                onSalir={salir}
                onEditar={abrirPanel}
              />
            ))}
          </div>
        )}

        {puede('asignar_integrantes') && equipos.length > 0 ? (
          <AsignacionManual
            equipos={equipos}
            sinEquipo={sinEquipo}
            enFormacion={enFormacion}
            ocupado={ocupado}
            onIntercambiar={() => {
              setErrorIntercambio(null)
              setIntercambioAbierto(true)
            }}
            onAsignar={(idEquipo, idMembresia) => {
              setError(null)
              asignar.mutate({ idEquipo, idMembresia }, { onError: alFallar })
            }}
            onRetirar={(idEquipo, idMembresia) => {
              setError(null)
              retirar.mutate({ idEquipo, idMembresia }, { onError: alFallar })
            }}
          />
        ) : sinEquipo.length > 0 ? (
          <Card className={styles.seccion}>
            <h2 className={styles.tituloSeccion}>Sin equipo ({sinEquipo.length})</h2>
            <ul className={styles.lista}>
              {sinEquipoPagina.visibles.map((persona) => (
                <li key={persona.idMembresia} className={styles.persona}>
                  {persona.nombre}
                  {persona.idMembresia === idMiMembresia ? ' (tú)' : ''}
                </li>
              ))}
            </ul>
            <Paginacion
              etiqueta="Personas sin equipo"
              total={sinEquipo.length}
              tamano={TAMANO_PAGINA}
              pagina={sinEquipoPagina.pagina}
              onCambiar={setPaginaSinEquipo}
            />
          </Card>
        ) : null}
      </div>

      <PanelEditarEquipo
        equipo={equipoEnEdicion}
        sinEquipo={sinEquipo}
        puedeEditar={puede('editar_equipo')}
        puedeAsignar={puede('asignar_integrantes')}
        puedeEliminar={puede('formar_equipos')}
        enFormacion={enFormacion}
        ocupado={ocupado}
        error={errorPanel}
        onCerrar={() => setIdEquipoEnEdicion(null)}
        onGuardar={async (idEquipo, cambios) => {
          setErrorPanel(null)
          await editar.mutateAsync({ idEquipo, cambios })
        }}
        onAsignar={(idEquipo, idMembresia) => {
          setErrorPanel(null)
          asignar.mutate({ idEquipo, idMembresia }, { onError: alFallarEnPanel })
        }}
        onRetirar={(idEquipo, idMembresia) => {
          setErrorPanel(null)
          retirar.mutate({ idEquipo, idMembresia }, { onError: alFallarEnPanel })
        }}
        onEliminar={(idEquipo) => {
          setErrorPanel(null)
          eliminar.mutate(idEquipo, {
            onSuccess: () => setIdEquipoEnEdicion(null),
            onError: alFallarEnPanel,
          })
        }}
      />

      <PanelIntercambio
        abierto={intercambioAbierto}
        equipos={equipos}
        ocupado={intercambiar.isPending}
        error={errorIntercambio}
        onCerrar={() => setIntercambioAbierto(false)}
        onIntercambiar={async (idMembresiaA, idMembresiaB) => {
          setErrorIntercambio(null)
          try {
            await intercambiar.mutateAsync({ idMembresiaA, idMembresiaB })
          } catch (e) {
            setErrorIntercambio(mensajeDe(e))
            throw e
          }
        }}
      />

      <PanelAjustesFormacion
        abierto={ajustesAbiertos}
        actividad={actividad}
        onCerrar={() => setAjustesAbiertos(false)}
      />
    </AppShell>
  )
}
