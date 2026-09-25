import type { AccionActividad, Equipo, LimitesEquipo, RolIntegrante } from '@plataforma/shared'
import { useState } from 'react'
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
  onEliminar: (idEquipo: string) => void
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
  onEliminar,
}: TarjetaEquipoProps) {
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const puede = (accion: AccionActividad) => capacidades.includes(accion)

  const soyIntegrante = equipo.integrantes.some((i) => i.idMembresia === idMiMembresia)
  const puedeMoverme = puede('elegir_equipo') || puede('asignar_integrantes')

  const cantidad = equipo.integrantes.length
  // El máximo lo impone el servidor a todos; aquí solo se explica por qué no se
  // puede unir nadie más. Un equipo que ya lo excede (se bajó el máximo después
  // de formarse) cuenta como lleno y no se desarma.
  const lleno = limites.maximo !== null && cantidad >= limites.maximo
  const excede = limites.maximo !== null && cantidad > limites.maximo
  // El mínimo solo avisa. Sin mínimo, se sigue avisando de un equipo de una sola
  // persona (P-27).
  const bajoMinimo = limites.minimo !== null ? cantidad < limites.minimo : cantidad === 1

  // Un participante siempre pertenece a un equipo: solo se mueve, no sale.
  const mostrarUnirme = !soyIntegrante && puedeMoverme
  const mostrarSalir = soyIntegrante && puedeMoverme && miRol !== 'participante'
  const mostrarEditar = puede('editar_equipo') && (miRol !== 'participante' || soyIntegrante)
  const mostrarEliminar = puede('formar_equipos') && equipo.integrantes.length === 0

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

      {excede || bajoMinimo ? (
        <div className={styles.avisos}>
          {excede ? <Badge variant="warning">Por encima del máximo</Badge> : null}
          {bajoMinimo ? (
            <Badge variant="warning">
              {limites.minimo !== null
                ? `Menos del mínimo de ${limites.minimo}`
                : 'Un solo integrante'}
            </Badge>
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
      ) : (
        <p className={styles.vacio}>Nadie ha entrado a este equipo todavía.</p>
      )}

      {mostrarUnirme && lleno ? (
        <p className={styles.vacio}>
          Equipo lleno: ya tiene el máximo de {limites.maximo}{' '}
          {limites.maximo === 1 ? 'integrante' : 'integrantes'}.
        </p>
      ) : null}

      {mostrarUnirme || mostrarSalir || mostrarEditar || mostrarEliminar ? (
        confirmandoEliminar ? (
          <div className={styles.confirmacion}>
            <p className={styles.vacio}>¿Eliminar «{equipo.nombre}»? Esta acción no se deshace.</p>
            <div className={styles.acciones}>
              <Button
                variant="danger"
                size="sm"
                disabled={ocupado}
                onClick={() => onEliminar(equipo.id)}
              >
                Sí, eliminar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={ocupado}
                onClick={() => setConfirmandoEliminar(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.acciones}>
            {mostrarUnirme ? (
              <Button size="sm" disabled={ocupado || lleno} onClick={() => onUnirme(equipo.id)}>
                {puede('asignar_integrantes') || miRol !== 'participante'
                  ? 'Unirme a este equipo'
                  : 'Unirme'}
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
            {mostrarEliminar ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={ocupado}
                onClick={() => setConfirmandoEliminar(true)}
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        )
      ) : null}
    </Card>
  )
}
