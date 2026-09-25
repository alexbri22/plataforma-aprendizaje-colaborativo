import type { AccionActividad, Equipo, RolIntegrante } from '@plataforma/shared'
import { useState } from 'react'
import { Badge, Button, Card } from '../../components/ui'
import styles from './TarjetaEquipo.module.css'

interface TarjetaEquipoProps {
  equipo: Equipo
  idMiMembresia: string
  miRol: RolIntegrante
  capacidades: readonly AccionActividad[]
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

  // Un participante siempre pertenece a un equipo: solo se mueve, no sale.
  const mostrarUnirme = !soyIntegrante && puedeMoverme
  const mostrarSalir = soyIntegrante && puedeMoverme && miRol !== 'participante'
  const mostrarEditar = puede('editar_equipo') && (miRol !== 'participante' || soyIntegrante)
  const mostrarEliminar = puede('formar_equipos') && equipo.integrantes.length === 0

  return (
    <Card className={styles.tarjeta}>
      <div className={styles.encabezado}>
        <h2 className={styles.nombre}>{equipo.nombre}</h2>
        {equipo.integrantes.length === 1 ? (
          <Badge variant="warning">Un solo integrante</Badge>
        ) : (
          <Badge variant="neutral">
            {equipo.integrantes.length === 0
              ? 'Sin integrantes'
              : `${equipo.integrantes.length} integrantes`}
          </Badge>
        )}
      </div>

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
              <Button size="sm" disabled={ocupado} onClick={() => onUnirme(equipo.id)}>
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
