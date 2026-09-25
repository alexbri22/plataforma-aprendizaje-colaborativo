import {
  LONGITUD_MAXIMA_NOMBRE_EQUIPO,
  type AccionActividad,
  type Equipo,
  type RolIntegrante,
} from '@plataforma/shared'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Button, Card, IconoCargando, Input } from '../../components/ui'
import { useActividad, type Actividad } from '../actividades'
import { AsignacionManual } from './AsignacionManual'
import { PanelEditarEquipo } from './PanelEditarEquipo'
import { TarjetaEquipo } from './TarjetaEquipo'
import {
  useAsignarIntegranteMutation,
  useCerrarFormacionMutation,
  useCrearEquipoMutation,
  useEditarEquipoMutation,
  useEliminarEquipoMutation,
  useEquipos,
  useRetirarIntegranteMutation,
} from './useEquipos'
import styles from './PantallaEquipos.module.css'

// Cómo se forman los equipos según el estado de la función. Es la
// configuración hecha legible (PRODUCT.md: "make the current configuration
// state legible"), no un tipo de actividad: no existe tal cosa.
const DESCRIPCION_FORMACION: Record<string, string> = {
  autogestionado:
    'Cada participante crea un equipo o se une a uno. La formación se cierra sola cuando nadie queda sin equipo.',
  propuesta_sistema: 'Quien organiza genera una propuesta del sistema, la ajusta y la confirma.',
  manual: 'Quien organiza crea los equipos y asigna a cada persona.',
}

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
function AccionCerrarFormacion({
  idActividad,
  numEquipos,
  numSinEquipo,
  onError,
}: {
  idActividad: string
  numEquipos: number
  numSinEquipo: number
  onError: (mensaje: string | null) => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const cerrar = useCerrarFormacionMutation(idActividad)
  const sinEquipos = numEquipos === 0

  return (
    <Card className={styles.accion}>
      <div>
        <h2 className={styles.tituloSeccion}>Cerrar la formación de equipos</h2>
        <p className={styles.texto}>
          {sinEquipos
            ? 'Crea al menos un equipo para poder cerrar la formación.'
            : numSinEquipo > 0
              ? `${numSinEquipo} ${numSinEquipo === 1 ? 'persona sigue' : 'personas siguen'} sin equipo: al cerrar, el sistema las reparte entre los equipos de la forma más equilibrada. La actividad pasa a desarrollo.`
              : 'Todas las personas tienen equipo. La actividad pasa a desarrollo.'}
        </p>
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
              'Sí, cerrar la formación'
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

function textoSinEquipos(actividad: Actividad, puedeCrear: boolean): string {
  if (actividad.fase === 'configuracion' || actividad.fase === 'inscripcion') {
    return 'La formación de equipos empieza cuando se cierra la inscripción.'
  }
  if (actividad.fase === 'formacion_equipos') {
    return puedeCrear
      ? 'Todavía no hay equipos. Crea el primero para empezar.'
      : 'Todavía no hay equipos. Cuando los haya, aquí verás quién integra cada uno.'
  }
  return 'Esta actividad no tiene equipos.'
}

export function PantallaEquipos() {
  const { id = '' } = useParams<{ id: string }>()
  const actividadQuery = useActividad(id)
  const equiposQuery = useEquipos(id)

  const [error, setError] = useState<string | null>(null)
  const [equipoEnEdicion, setEquipoEnEdicion] = useState<Equipo | null>(null)

  const asignar = useAsignarIntegranteMutation(id)
  const retirar = useRetirarIntegranteMutation(id)
  const editar = useEditarEquipoMutation(id)
  const eliminar = useEliminarEquipoMutation(id)

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

  const { equipos, sinEquipo, idMiMembresia } = equiposQuery.data
  const puedeCrear = puede('formar_equipos') || puede('elegir_equipo')
  const ocupado = asignar.isPending || retirar.isPending || editar.isPending || eliminar.isPending

  const alFallar = (e: unknown) => setError(mensajeDe(e))
  const unirme = (idEquipo: string) => {
    setError(null)
    asignar.mutate({ idEquipo, idMembresia: idMiMembresia }, { onError: alFallar })
  }
  const salir = (idEquipo: string) => {
    setError(null)
    retirar.mutate({ idEquipo, idMembresia: idMiMembresia }, { onError: alFallar })
  }
  const eliminarEquipo = (idEquipo: string) => {
    setError(null)
    eliminar.mutate(idEquipo, { onError: alFallar })
  }

  const descripcionFormacion =
    actividad.fase === 'formacion_equipos'
      ? DESCRIPCION_FORMACION[actividad.configuracion?.formacion_equipos ?? '']
      : undefined

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
        {descripcionFormacion ? (
          <Card className={styles.seccion}>
            <Badge variant="primary" className={styles.insignia}>
              Formación de equipos
            </Badge>
            <p className={styles.texto}>{descripcionFormacion}</p>
          </Card>
        ) : null}

        {actividad.fase === 'archivada' ? (
          <Card className={styles.seccion}>
            <p className={styles.texto}>
              La actividad está archivada: los equipos se pueden consultar, pero ya no cambian.
            </p>
          </Card>
        ) : actividad.fase === 'cierre' ? (
          <Card className={styles.seccion}>
            <p className={styles.texto}>
              La actividad está en cierre: ya no cambia la composición de los equipos.
            </p>
          </Card>
        ) : null}

        {error ? <AvisoError mensaje={error} /> : null}

        {puede('cerrar_formacion') ? (
          <AccionCerrarFormacion
            idActividad={id}
            numEquipos={equipos.length}
            numSinEquipo={sinEquipo.length}
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
            <p className={styles.texto}>{textoSinEquipos(actividad, puedeCrear)}</p>
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
                ocupado={ocupado}
                onUnirme={unirme}
                onSalir={salir}
                onEditar={setEquipoEnEdicion}
                onEliminar={eliminarEquipo}
              />
            ))}
          </div>
        )}

        {puede('asignar_integrantes') && equipos.length > 0 ? (
          <AsignacionManual
            equipos={equipos}
            sinEquipo={sinEquipo}
            ocupado={ocupado}
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
              {sinEquipo.map((persona) => (
                <li key={persona.idMembresia} className={styles.persona}>
                  {persona.nombre}
                  {persona.idMembresia === idMiMembresia ? ' (tú)' : ''}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <PanelEditarEquipo
        equipo={equipoEnEdicion}
        onCerrar={() => setEquipoEnEdicion(null)}
        onGuardar={async (idEquipo, cambios) => {
          await editar.mutateAsync({ idEquipo, cambios })
        }}
      />
    </AppShell>
  )
}
