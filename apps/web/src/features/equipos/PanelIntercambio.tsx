import type { Equipo } from '@plataforma/shared'
import { useState } from 'react'
import { AvisoError, Button, IconoCargando, PanelLateral, Select } from '../../components/ui'
import styles from './PanelIntercambio.module.css'

interface PanelIntercambioProps {
  abierto: boolean
  equipos: Equipo[]
  ocupado: boolean
  error: string | null
  onCerrar: () => void
  onIntercambiar: (idMembresiaA: string, idMembresiaB: string) => Promise<void>
}

interface Persona {
  idMembresia: string
  nombre: string
  idEquipo: string
  nombreEquipo: string
}

// Cambia de lugar a dos personas de equipos distintos. Es la salida cuando dos
// equipos están llenos (con un máximo, ninguna puede entrar al equipo de la
// otra) y cuando la actividad ya está en desarrollo (nadie puede quedar sin
// equipo). El tamaño de los dos equipos no cambia.
function Formulario({
  personas,
  ocupado,
  onCerrar,
  onIntercambiar,
}: {
  personas: Persona[]
  ocupado: boolean
  onCerrar: () => void
  onIntercambiar: PanelIntercambioProps['onIntercambiar']
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const personaA = personas.find((p) => p.idMembresia === a)
  // La segunda persona ha de estar en otro equipo.
  const candidatas = personas.filter((p) => personaA && p.idEquipo !== personaA.idEquipo)

  return (
    <div className={styles.formulario}>
      <Select
        label="Persona"
        value={a}
        onChange={(e) => {
          setA(e.target.value)
          setB('')
        }}
      >
        <option value="">Elegir…</option>
        {personas.map((p) => (
          <option key={p.idMembresia} value={p.idMembresia}>
            {p.nombre} · {p.nombreEquipo}
          </option>
        ))}
      </Select>
      <Select label="Con" value={b} disabled={!personaA} onChange={(e) => setB(e.target.value)}>
        <option value="">Elegir…</option>
        {candidatas.map((p) => (
          <option key={p.idMembresia} value={p.idMembresia}>
            {p.nombre} · {p.nombreEquipo}
          </option>
        ))}
      </Select>
      <div className={styles.botones}>
        <Button
          disabled={!a || !b || ocupado}
          onClick={async () => {
            try {
              await onIntercambiar(a, b)
              onCerrar()
            } catch {
              // El error ya se muestra en el panel; se queda abierto para corregir.
            }
          }}
        >
          {ocupado ? (
            <>
              <IconoCargando />
              Intercambiando…
            </>
          ) : (
            'Intercambiar'
          )}
        </Button>
        <Button variant="secondary" disabled={ocupado} onClick={onCerrar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function PanelIntercambio({
  abierto,
  equipos,
  ocupado,
  error,
  onCerrar,
  onIntercambiar,
}: PanelIntercambioProps) {
  const personas: Persona[] = equipos.flatMap((equipo) =>
    equipo.integrantes.map((i) => ({
      idMembresia: i.idMembresia,
      nombre: i.nombre,
      idEquipo: equipo.id,
      nombreEquipo: equipo.nombre,
    })),
  )

  return (
    <PanelLateral abierto={abierto} titulo="Intercambiar personas" onCerrar={onCerrar}>
      {error ? <AvisoError mensaje={error} /> : null}
      <Formulario
        personas={personas}
        ocupado={ocupado}
        onCerrar={onCerrar}
        onIntercambiar={onIntercambiar}
      />
    </PanelLateral>
  )
}
