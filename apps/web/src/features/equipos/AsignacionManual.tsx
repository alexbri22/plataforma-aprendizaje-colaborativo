import type { Equipo, IntegranteEquipo, ParticipanteSinEquipo } from '@plataforma/shared'
import { useState } from 'react'
import { Card, Paginacion, rebanar, Select } from '../../components/ui'
import styles from './AsignacionManual.module.css'

interface AsignacionManualProps {
  equipos: Equipo[]
  sinEquipo: ParticipanteSinEquipo[]
  /** Durante la formación un participante puede quedar sin equipo. */
  enFormacion: boolean
  ocupado: boolean
  onAsignar: (idEquipo: string, idMembresia: string) => void
  onRetirar: (idEquipo: string, idMembresia: string) => void
}

const TAMANO_PAGINA = 10

interface Fila {
  idMembresia: string
  nombre: string
  idEquipoActual: string
  // Ya en desarrollo un participante pertenece siempre a un equipo: no se le
  // ofrece "sin equipo". Durante la formación sí, y quien organiza siempre.
  puedeQuedarSinEquipo: boolean
}

// Asignación manual: cada persona con un selector "Equipo de …". Se usa un
// Select y no arrastrar y soltar porque es accesible por teclado sin más
// (WCAG 2.1 AA, PRODUCT.md) y no exige un componente nuevo. Aparece solo
// cuando 'asignar_integrantes' está en las capacidades del actor.
export function AsignacionManual({
  equipos,
  sinEquipo,
  enFormacion,
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
        puedeQuedarSinEquipo: enFormacion || i.rol !== 'participante',
      })),
    ),
  ]

  const [pagina, setPagina] = useState(0)
  if (filas.length === 0) return null
  const { visibles, pagina: paginaActual } = rebanar(filas, pagina, TAMANO_PAGINA)

  return (
    <Card className={styles.tarjeta}>
      <h2 className={styles.titulo}>Asignación de personas</h2>
      <ul className={styles.lista}>
        {visibles.map((fila) => (
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
      <Paginacion
        etiqueta="Personas"
        total={filas.length}
        tamano={TAMANO_PAGINA}
        pagina={paginaActual}
        onCambiar={setPagina}
      />
    </Card>
  )
}
