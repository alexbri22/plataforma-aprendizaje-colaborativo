import { componenteDeshabilitado, sumaDePesosActivos, type Ponderacion } from '@plataforma/shared'
import type { Actividad } from '../actividades/tipos'
import { AvisoSuma } from './AvisoSuma'
import { CampoPeso } from './CampoPeso'
import styles from './PesosComponentes.module.css'

// Los porcentajes de proyecto, proceso y aprendizaje (general §4.2), juntos en
// la fila de Calificación: son los que deben sumar 100 entre sí, y así la suma
// se ve de un vistazo. Lo que vale cada aspecto se ajusta en la tabla de su
// componente. Aprendizaje vale 0 mientras la bitácora esté deshabilitada.
export function PesosComponentes({
  actividad,
  ponderacion,
}: {
  actividad: Actividad
  ponderacion: Ponderacion
}) {
  const configuracion = actividad.configuracion ?? {}
  const puedeEditar = actividad.capacidades?.includes('configurar_calificacion') ?? false
  const partes = ponderacion.componentes.map((componente) => ({
    componente,
    apagado: componenteDeshabilitado(componente, configuracion),
  }))
  const pesos = partes.map((p) => ({ peso: p.componente.peso, apagado: p.apagado }))

  return (
    <div className={styles.pesos}>
      <ul className={styles.lista}>
        {partes.map(({ componente, apagado }) => (
          <li key={componente.id} className={styles.parte}>
            <span className={styles.nombre}>{componente.nombre}</span>
            <CampoPeso
              idActividad={actividad.id}
              parte="componente"
              id={componente.id}
              nombre={componente.nombre}
              peso={componente.peso}
              apagado={apagado}
              puedeEditar={puedeEditar}
            />
          </li>
        ))}
      </ul>
      {sumaDePesosActivos(pesos) !== 100 ? <AvisoSuma partes={pesos} /> : null}
    </div>
  )
}
