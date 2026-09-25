import type { Equipo, IntegranteEquipo, ParticipanteSinEquipo } from '@plataforma/shared'
import { Card, Select } from '../../components/ui'
import styles from './AsignacionManual.module.css'

interface AsignacionManualProps {
  equipos: Equipo[]
  sinEquipo: ParticipanteSinEquipo[]
  ocupado: boolean
  onAsignar: (idEquipo: string, idMembresia: string) => void
  onRetirar: (idEquipo: string, idMembresia: string) => void
}

interface Fila {
  idMembresia: string
  nombre: string
  idEquipoActual: string
  // Un participante siempre pertenece a un equipo: no se le ofrece "sin
  // equipo" una vez asignado. Quien organiza sí puede salir de uno.
  puedeQuedarSinEquipo: boolean
}

// Asignación manual: cada persona con un selector "Equipo de …". Se usa un
// Select y no arrastrar y soltar porque es accesible por teclado sin más
// (WCAG 2.1 AA, PRODUCT.md) y no exige un componente nuevo. Aparece solo
// cuando 'asignar_integrantes' está en las capacidades del actor.
export function AsignacionManual({
  equipos,
  sinEquipo,
  ocupado,
  onAsignar,
  onRetirar,
}: AsignacionManualProps) {
  const filas: Fila[] = [
    ...sinEquipo.map((p) => ({
      idMembresia: p.idMembresia,
      nombre: p.nombre,
      idEquipoActual: '',
      puedeQuedarSinEquipo: true,
    })),
    ...equipos.flatMap((equipo) =>
      equipo.integrantes.map((i: IntegranteEquipo) => ({
        idMembresia: i.idMembresia,
        nombre: i.nombre,
        idEquipoActual: equipo.id,
        puedeQuedarSinEquipo: i.rol !== 'participante',
      })),
    ),
  ]

  if (filas.length === 0) return null

  return (
    <Card className={styles.tarjeta}>
      <h2 className={styles.titulo}>Asignación de personas</h2>
      <ul className={styles.lista}>
        {filas.map((fila) => (
          <li key={fila.idMembresia} className={styles.fila}>
            <span className={styles.nombre}>{fila.nombre}</span>
            <Select
              className={styles.selector}
              label={`Equipo de ${fila.nombre}`}
              ocultarEtiqueta
              value={fila.idEquipoActual}
              disabled={ocupado}
              onChange={(e) => {
                const destino = e.target.value
                if (destino) onAsignar(destino, fila.idMembresia)
                else onRetirar(fila.idEquipoActual, fila.idMembresia)
              }}
            >
              <option value="" disabled={!fila.puedeQuedarSinEquipo}>
                Sin equipo
              </option>
              {equipos.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.nombre}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>
    </Card>
  )
}
