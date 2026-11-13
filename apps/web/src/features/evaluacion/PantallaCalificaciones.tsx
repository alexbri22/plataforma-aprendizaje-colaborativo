import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  AvisoError,
  Card,
  IconoCargando,
  Paginacion,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  Tabs,
  rebanar,
} from '../../components/ui'
import { useActividad } from '../actividades'
import { formatearPuntaje } from './formatoPuntaje'
import { useCalificaciones, useProyectoPorEquipo } from './useCalificaciones'
import styles from './PantallaCalificaciones.module.css'

const POR_PAGINA = 20

// Lo que le falta calificar a quien organiza, por nombre: los primeros tres
// y cuántos más. Lo que el participante no ha respondido va aparte, porque
// no lo resuelve quien califica.
const VISIBLES_POR_CALIFICAR = 3

function PorCalificar({ nombres, porResponder }: { nombres: string[]; porResponder: number }) {
  const resto = nombres.length - VISIBLES_POR_CALIFICAR
  return (
    <div className={styles.pendientes}>
      {nombres.length === 0 ? (
        <span className={styles.apagado}>Nada</span>
      ) : (
        <span title={nombres.join(', ')}>
          {nombres.slice(0, VISIBLES_POR_CALIFICAR).join(', ')}
          {resto > 0 ? ` y ${resto} más` : ''}
        </span>
      )}
      {porResponder > 0 ? (
        <span className={styles.apagado}>
          {porResponder === 1 ? '1 cuestionario' : `${porResponder} cuestionarios`} por responder
        </span>
      ) : null}
    </div>
  )
}

function ListaParticipantes({ idActividad }: { idActividad: string }) {
  const [pagina, setPagina] = useState(0)
  const calificaciones = useCalificaciones(idActividad)
  if (calificaciones.isPending) return <IconoCargando size={20} />
  if (calificaciones.isError) return <AvisoError mensaje={calificaciones.error.message} />
  if (calificaciones.data.length === 0) {
    return <p className={styles.apagado}>Todavía no hay participantes.</p>
  }
  const { visibles, pagina: actual } = rebanar(calificaciones.data, pagina, POR_PAGINA)
  return (
    <>
      <Table caption="Calificaciones">
        <thead>
          <TableRow>
            <TableHeaderCell>Participante</TableHeaderCell>
            <TableHeaderCell>Equipo</TableHeaderCell>
            <TableHeaderCell className={styles.numero}>Calificación</TableHeaderCell>
            <TableHeaderCell>Por calificar</TableHeaderCell>
            <TableHeaderCell>
              <span className={styles.soloLector}>Desglose</span>
            </TableHeaderCell>
          </TableRow>
        </thead>
        <tbody>
          {visibles.map((c) => {
            const desglose = `/actividades/${idActividad}/calificaciones/${c.idMembresia}`
            return (
              <TableRow key={c.idMembresia}>
                <TableHeaderCell scope="row">
                  <Link to={desglose} className={styles.enlace}>
                    {c.nombre}
                  </Link>
                </TableHeaderCell>
                <TableCell>{c.equipo?.nombre ?? 'Sin equipo'}</TableCell>
                <TableCell className={styles.numero}>
                  {c.valor === null ? '—' : formatearPuntaje(c.valor)}
                  {c.provisional ? <span className={styles.apagado}> · provisional</span> : null}
                </TableCell>
                <TableCell>
                  <PorCalificar nombres={c.porCalificar} porResponder={c.porResponder} />
                </TableCell>
                <TableCell className={styles.accion}>
                  <Link
                    to={desglose}
                    className={styles.enlace}
                    aria-label={`${c.porCalificar.length > 0 ? 'Calificar' : 'Ver el desglose de'} ${c.nombre}`}
                  >
                    {c.porCalificar.length > 0 ? 'Calificar' : 'Ver desglose'} →
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </tbody>
      </Table>
      <Paginacion
        total={calificaciones.data.length}
        tamano={POR_PAGINA}
        pagina={actual}
        onCambiar={setPagina}
        etiqueta="Calificaciones"
      />
    </>
  )
}

// Resumen del proyecto por equipo (P-40): qué elementos ya tienen puntaje y
// cuáles faltan. Se califica dentro del equipo, viendo el trabajo; cada
// celda lleva ahí.
function ProyectoPorEquipo({ idActividad }: { idActividad: string }) {
  const proyecto = useProyectoPorEquipo(idActividad)
  if (proyecto.isPending) return <IconoCargando size={20} />
  if (proyecto.isError) return <AvisoError mensaje={proyecto.error.message} />
  if (proyecto.data.length === 0) return <p className={styles.apagado}>Todavía no hay equipos.</p>
  const elementos = proyecto.data[0].elementos
  return (
    <>
      <p className={styles.apagado}>
        Para calificar un elemento, ábrelo: lo calificas viendo lo que el equipo entregó.
      </p>
      <Table caption="Proyecto por equipo">
        <thead>
          <TableRow>
            <TableHeaderCell>Equipo</TableHeaderCell>
            {elementos.map((e) => (
              <TableHeaderCell key={e.idInstrumento}>{e.nombre}</TableHeaderCell>
            ))}
          </TableRow>
        </thead>
        <tbody>
          {proyecto.data.map((equipo) => (
            <TableRow key={equipo.idEquipo}>
              <TableHeaderCell scope="row">{equipo.nombre}</TableHeaderCell>
              {equipo.elementos.map((elemento) => (
                <TableCell key={elemento.idInstrumento}>
                  <Link
                    to={`/equipos/${equipo.idEquipo}/${elemento.clave}`}
                    className={
                      elemento.valor === null && !elemento.ajustado
                        ? styles.porCalificar
                        : styles.enlace
                    }
                  >
                    {elemento.ajustado
                      ? 'Ajustado'
                      : elemento.valor === null
                        ? 'Por calificar'
                        : formatearPuntaje(elemento.valor)}
                  </Link>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </tbody>
      </Table>
    </>
  )
}

// Calificaciones de quien organiza (nucleo §10.6): la lista paginada de
// participantes con lo que les falta, y la captura del proyecto por equipo.
export function PantallaCalificaciones() {
  const { id = '' } = useParams<{ id: string }>()
  const actividad = useActividad(id)
  const [pestana, setPestana] = useState('participantes')
  const contexto = { idActividad: id, seccion: 'calificaciones' } as const

  if (actividad.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Calificaciones" contexto={contexto}>
        <div className={styles.cargando}>
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }
  if (actividad.isError || !actividad.data || actividad.data.rol === 'participante') {
    return (
      <AppShell seccionActiva="actividades" titulo="Calificaciones" contexto={contexto}>
        <AvisoError mensaje="No encontramos esta actividad, o no la organizas." />
      </AppShell>
    )
  }

  if (actividad.data.fase !== 'cierre' && actividad.data.fase !== 'archivada') {
    return (
      <AppShell seccionActiva="actividades" titulo="Calificaciones" contexto={contexto}>
        <Card>
          <p className={styles.apagado}>Las calificaciones se ven en el cierre.</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell seccionActiva="actividades" titulo="Calificaciones" contexto={contexto}>
      <Card className={styles.tarjeta}>
        <Tabs
          label="Calificaciones"
          items={[
            { id: 'participantes', etiqueta: 'Participantes' },
            { id: 'proyecto', etiqueta: 'Proyecto por equipo' },
          ]}
          valor={pestana}
          onCambiar={setPestana}
        />
        <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
          {pestana === 'participantes' ? (
            <ListaParticipantes idActividad={id} />
          ) : (
            <ProyectoPorEquipo idActividad={id} />
          )}
        </div>
      </Card>
    </AppShell>
  )
}
