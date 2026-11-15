import { Encabezado } from '../../components/Encabezado'
import { Button } from '../../components/ui'
import { useSesion } from '../cuentas'
import styles from './PantallaCaracteristicas.module.css'

// "Características de Co3 → Ver más" del inicio (observaciones del 4 de
// noviembre). Es pública, como el inicio: explica las dos formas de usar Co3.
// Con sesión, cada una lleva a su sección; sin sesión, se ofrece crear cuenta.
// La animación que sugiere el mock queda pendiente de diseño.
const FUNCIONES = [
  {
    id: 'organizo',
    titulo: 'Organizo',
    to: '/actividades/organizo',
    textos: [
      'Esta función permite organizar y dar seguimiento a las actividades de trabajo en equipo. Desde aquí se pueden definir los periodos de desarrollo y evaluación, seleccionar los instrumentos de evaluación y ofrecer retroalimentación a los equipos y sus integrantes.',
      'También permite consultar las actividades según su etapa (Inscripción, Formación de equipos, Desarrollo y Cierre), realizar las acciones correspondientes a cada una y archivar las actividades creadas.',
    ],
  },
  {
    id: 'participo',
    titulo: 'Participo',
    to: '/actividades/participo',
    textos: [
      'Esta función está dirigida a los integrantes del equipo que participan en una actividad. Desde aquí podrán acceder a los espacios Proyecto colaborativo y Proceso colaborativo, donde podrán registrar el desarrollo de la actividad, evaluar su experiencia y reflexionar sobre las habilidades colaborativas que pusieron en práctica.',
    ],
  },
]

export function PantallaCaracteristicas() {
  const { usuario } = useSesion()

  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <div className={styles.contenido}>
          <section className={styles.introduccion} aria-labelledby="titulo-caracteristicas">
            <h1 id="titulo-caracteristicas">Características de Co3</h1>
            <p>
              El aprendizaje colaborativo contempla tanto el diseño y la evaluación del aprendizaje
              como del propio proceso de colaboración. Para ello, Co3 integra dos espacios de
              trabajo: uno grupal, donde se reporta el desarrollo de una actividad colaborativa, y
              otro individual, destinado a evaluar las habilidades colaborativas puestas en
              práctica.
            </p>
          </section>

          <div className={styles.funciones}>
            {FUNCIONES.map((f) => (
              <section key={f.id} className={styles.funcion} aria-labelledby={`titulo-${f.id}`}>
                <h2 id={`titulo-${f.id}`}>{f.titulo}</h2>
                {f.textos.map((t) => (
                  <p key={t}>{t}</p>
                ))}
                {usuario ? (
                  <div className={styles.accion}>
                    <Button variant="secondary" size="sm" to={f.to}>
                      Ir a {f.titulo}
                    </Button>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          {usuario ? null : (
            <div className={styles.cierre}>
              <p>Crea una cuenta para organizar actividades o participar en ellas.</p>
              <div className={styles.cierreAcciones}>
                <Button to="/registrarse">Crear cuenta</Button>
                <Button variant="secondary" to="/ingresar">
                  Ingresar
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
