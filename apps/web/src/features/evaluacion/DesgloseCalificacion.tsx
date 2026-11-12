import {
  NOMBRE_PLANTILLA,
  type DesgloseCalificacion as Desglose,
  type InstrumentoDelDesglose,
} from '@plataforma/shared'
import { Table, TableCell, TableHeaderCell, TableRow } from '../../components/ui'
import { formatearFecha } from '../actividades'
import { CampoPuntaje } from './CampoPuntaje'
import { formatearPuntaje, textoDePuntaje } from './formatoPuntaje'
import { useCapturarPuntajeMutation } from './useCalificaciones'
import styles from './DesgloseCalificacion.module.css'

function nombreDe(instrumento: InstrumentoDelDesglose): string {
  const base = instrumento.clavePlantilla
    ? NOMBRE_PLANTILLA[instrumento.clavePlantilla]
    : instrumento.nombre
  return instrumento.fechaPlanificada
    ? `${base} · ${formatearFecha(instrumento.fechaPlanificada)}`
    : base
}

interface DesgloseProps {
  idActividad: string
  desglose: Desglose
  /** Quien organiza captura aquí lo que no se puntúa solo. */
  puedeCapturar: boolean
  /** parcial: lo calificado hasta ahora, sin contar lo pendiente (lo que ve
   * quien participa durante el desarrollo, P-18). final: la calificación,
   * con lo pendiente en 0. */
  modo?: 'parcial' | 'final'
}

// La calificación de una persona con su desglose (nucleo §10.3): cada
// componente, sus aspectos y sus instrumentos, con lo que pesa cada uno ya
// redistribuido. Lo capturable se edita en su fila.
export function DesgloseCalificacion({
  idActividad,
  desglose,
  puedeCapturar,
  modo = 'final',
}: DesgloseProps) {
  const capturar = useCapturarPuntajeMutation(idActividad)
  const { parcial } = desglose
  const cubre = `cubre ${formatearPuntaje(parcial.cubre)} % de la calificación`
  const principal = modo === 'parcial' ? parcial.valor : desglose.valor
  const nota =
    modo === 'parcial'
      ? parcial.valor === null
        ? 'Todavía no hay nada calificado.'
        : `En lo calificado hasta ahora; ${cubre}. Lo pendiente aún no cuenta.`
      : desglose.valor === null
        ? 'Todavía no hay nada que calificar.'
        : desglose.provisional
          ? `Provisional: lo pendiente cuenta 0. En lo calificado lleva ${
              parcial.valor === null ? '—' : formatearPuntaje(parcial.valor)
            }, que ${cubre}.`
          : 'Calificación completa.'

  return (
    <div className={styles.desglose}>
      <div className={styles.resumen}>
        <span className={styles.calificacion}>
          {principal === null ? '—' : formatearPuntaje(principal)}
        </span>
        <span className={styles.nota}>{nota}</span>
      </div>

      {desglose.componentes.map((componente) => (
        <section key={componente.id} className={styles.componente}>
          <h2 className={styles.titulo}>
            {componente.nombre}
            <span className={styles.dato}>
              {componente.valor === null
                ? 'No aplica'
                : `${formatearPuntaje(componente.valor)} · pesa ${formatearPuntaje(componente.pesoEfectivo)} %`}
            </span>
          </h2>
          <Table caption={componente.nombre}>
            <thead>
              <TableRow>
                <TableHeaderCell>Aspecto e instrumento</TableHeaderCell>
                <TableHeaderCell className={styles.numero}>Pesa</TableHeaderCell>
                <TableHeaderCell className={styles.numero}>Puntaje</TableHeaderCell>
              </TableRow>
            </thead>
            <tbody>
              {componente.aspectos.map((aspecto) => [
                <TableRow key={aspecto.id}>
                  <TableHeaderCell scope="row" className={styles.aspecto}>
                    {aspecto.nombre}
                  </TableHeaderCell>
                  <TableCell className={styles.numero}>
                    {aspecto.valor === null ? '—' : `${formatearPuntaje(aspecto.pesoEfectivo)} %`}
                  </TableCell>
                  <TableCell className={`${styles.numero} ${styles.aspecto}`}>
                    {aspecto.valor === null
                      ? aspecto.instrumentos.length === 0
                        ? 'Sin instrumento'
                        : 'No aplica'
                      : formatearPuntaje(aspecto.valor)}
                  </TableCell>
                </TableRow>,
                ...aspecto.instrumentos.map((instrumento) => (
                  <TableRow key={instrumento.id}>
                    <TableCell className={styles.instrumento}>{nombreDe(instrumento)}</TableCell>
                    <TableCell className={`${styles.numero} ${styles.apagado}`}>
                      {instrumento.pesoEfectivo > 0
                        ? `${formatearPuntaje(instrumento.pesoEfectivo)} %`
                        : '—'}
                    </TableCell>
                    <TableCell className={styles.numero}>
                      {puedeCapturar &&
                      instrumento.capturable &&
                      instrumento.puntaje.estado !== 'no_aplica' ? (
                        <span className={styles.captura}>
                          <CampoPuntaje
                            etiqueta={`Puntaje de ${nombreDe(instrumento)}`}
                            valor={
                              instrumento.puntaje.estado === 'valor'
                                ? instrumento.puntaje.valor
                                : null
                            }
                            onGuardar={(valor) =>
                              capturar.mutateAsync({
                                idInstrumento: instrumento.id,
                                idMembresia: desglose.idMembresia,
                                valor,
                              })
                            }
                          />
                        </span>
                      ) : (
                        <span
                          className={
                            instrumento.puntaje.estado === 'valor' ? undefined : styles.apagado
                          }
                        >
                          {textoDePuntaje(instrumento.puntaje)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )),
              ])}
            </tbody>
          </Table>
        </section>
      ))}
    </div>
  )
}
