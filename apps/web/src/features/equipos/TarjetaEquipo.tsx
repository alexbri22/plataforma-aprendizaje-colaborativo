import {
  TAMANO_MINIMO_EQUIPO,
  type AccionActividad,
  type Equipo,
  type LimitesEquipo,
  type RolIntegrante,
} from '@plataforma/shared'
import { Badge, Button, Card } from '../../components/ui'
import styles from './TarjetaEquipo.module.css'

interface TarjetaEquipoProps {
  equipo: Equipo
  idMiMembresia: string
  miRol: RolIntegrante
  capacidades: readonly AccionActividad[]
  limites: LimitesEquipo
  ocupado: boolean
  onUnirme: (idEquipo: string) => void
  onSalir: (idEquipo: string) => void
  onEditar: (equipo: Equipo) => void
}

const ETIQUETA_ROL: Record<RolIntegrante, string | null> = {
  organizador: 'Organiza',
  'co-organizador': 'Co-organiza',
  participante: null,
}

// Un equipo con sus integrantes y las acciones que el actor tiene sobre él.
// Cada acción aparece solo si su nombre está en las capacidades que calculó el
// servidor (nucleo §4.3); que un participante edite únicamente su propio
// equipo depende de datos (a qué equipo pertenece) y también lo vuelve a
// verificar el servidor.
export function TarjetaEquipo({
  equipo,
  idMiMembresia,
  miRol,
  capacidades,
  limites,
  ocupado,
  onUnirme,
  onSalir,
  onEditar,
}: TarjetaEquipoProps) {
  const puede = (accion: AccionActividad) => capacidades.includes(accion)

  const soyIntegrante = equipo.integrantes.some((i) => i.idMembresia === idMiMembresia)
  const puedeMoverme = puede('elegir_equipo') || puede('asignar_integrantes')

  const cantidad = equipo.integrantes.length
  // El máximo lo impone el servidor a todos; aquí solo se explica por qué no se
  // puede unir nadie más. Un equipo que ya lo excede (se bajó el máximo después
  // de formarse) cuenta como lleno y no se desarma. Es una violación real del
  // límite (bloqueo: nadie más entra), no un aviso — por eso se distingue en
  // rojo y no en ámbar.
  const lleno = limites.maximo !== null && cantidad >= limites.maximo
  const excede = limites.maximo !== null && cantidad > limites.maximo
  // Por debajo de TAMANO_MINIMO_EQUIPO (P-27 resuelta), cerrar la formación
  // está bloqueado — mismo rojo que excede. El mínimo que fija quien organiza,
  // si pone uno más alto, solo advierte (ámbar): no impide cerrar.
  const bajoMinimoObligatorio = cantidad < TAMANO_MINIMO_EQUIPO
  const bajoMinimoConfigurado =
    !bajoMinimoObligatorio && limites.minimo !== null && cantidad < limites.minimo

  // Un participante siempre pertenece a un equipo: solo se mueve, no sale.
  const mostrarUnirme = !soyIntegrante && puedeMoverme
  const mostrarSalir = soyIntegrante && puedeMoverme && miRol !== 'participante'
  const mostrarEditar = puede('editar_equipo') && (miRol !== 'participante' || soyIntegrante)

  return (
    <Card className={styles.tarjeta}>
      <div className={styles.encabezado}>
        <h2 className={styles.nombre}>{equipo.nombre}</h2>
        <Badge variant="neutral">
          {cantidad === 0
            ? 'Sin integrantes'
            : limites.maximo !== null
              ? `${cantidad} de ${limites.maximo} integrantes`
              : `${cantidad} ${cantidad === 1 ? 'integrante' : 'integrantes'}`}
        </Badge>
      </div>

      {excede || bajoMinimoObligatorio || bajoMinimoConfigurado ? (
        <div className={styles.avisos}>
          {excede ? <Badge variant="danger">Por encima del máximo</Badge> : null}
          {bajoMinimoObligatorio ? (
            <Badge variant="danger">
              {cantidad === 1
                ? 'Un solo integrante'
                : `Menos de ${TAMANO_MINIMO_EQUIPO} integrantes`}
            </Badge>
          ) : null}
          {bajoMinimoConfigurado ? (
            <Badge variant="warning">Menos del mínimo de {limites.minimo}</Badge>
          ) : null}
        </div>
      ) : null}

      {equipo.descripcionActividad || equipo.formaDeTrabajo ? (
        <dl className={styles.textos}>
          {equipo.descripcionActividad ? (
            <div>
              <dt className={styles.etiqueta}>Qué va a hacer</dt>
              <dd className={styles.valor}>{equipo.descripcionActividad}</dd>
            </div>
          ) : null}
          {equipo.formaDeTrabajo ? (
            <div>
              <dt className={styles.etiqueta}>Cómo van a trabajar</dt>
              <dd className={styles.valor}>{equipo.formaDeTrabajo}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {equipo.integrantes.length > 0 ? (
        <ul className={styles.integrantes} aria-label={`Integrantes de ${equipo.nombre}`}>
          {equipo.integrantes.map((integrante) => (
            <li key={integrante.idMembresia} className={styles.integrante}>
              <span>
                {integrante.nombre}
                {integrante.idMembresia === idMiMembresia ? ' (tú)' : ''}
              </span>
              {ETIQUETA_ROL[integrante.rol] ? (
                <Badge variant="neutral">{ETIQUETA_ROL[integrante.rol]}</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {mostrarUnirme || mostrarSalir || mostrarEditar ? (
        <div className={styles.acciones}>
          {mostrarUnirme ? (
            <Button size="sm" disabled={ocupado || lleno} onClick={() => onUnirme(equipo.id)}>
              {lleno ? 'Equipo lleno' : 'Unirme'}
            </Button>
          ) : null}
          {mostrarSalir ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={ocupado}
              onClick={() => onSalir(equipo.id)}
            >
              Salir del equipo
            </Button>
          ) : null}
          {mostrarEditar ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={ocupado}
              onClick={() => onEditar(equipo)}
            >
              Editar
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
