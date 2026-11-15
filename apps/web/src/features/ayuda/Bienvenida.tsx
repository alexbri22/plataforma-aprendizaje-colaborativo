import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal } from '../../components/ui'
import { usePistas } from './usePistas'
import styles from './Bienvenida.module.css'

const PASOS = [
  {
    titulo: 'Te damos la bienvenida a Co3',
    texto:
      'Co3 organiza el trabajo en equipo: quien organiza arma la actividad y los participantes colaboran en equipos.',
  },
  { titulo: '¿Vas a organizar o a participar?', texto: '' },
  {
    titulo: 'Si tienes dudas',
    texto:
      'Busca el ? junto al título de cada pantalla: explica para qué sirve. Y en el Resumen de cada actividad verás qué se hace en la etapa en que va.',
  },
] as const

// Tres pasos la primera vez que alguien entra (las cuentas que ya usaban la
// plataforma la tienen marcada como vista desde la migración). Se puede
// saltar en cualquier paso; saltarla o terminarla cuenta como vista. Elegir
// organizar o participar no se salta el último paso: lleva ahí al terminar.
export function Bienvenida() {
  const pistas = usePistas()
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [cerrada, setCerrada] = useState(false)
  // Lo que eligió en el paso 2: se lleva ahí al terminar, no al elegir, para
  // que no se salte el paso 3.
  const [destino, setDestino] = useState<string | null>(null)
  const abierta = pistas.pendiente('bienvenida') && !cerrada

  const { marcar } = pistas
  // Estable: Modal reinicia el foco cada vez que cambia onCerrar.
  const cerrar = useCallback(() => {
    setCerrada(true)
    marcar('bienvenida')
  }, [marcar])

  function elegir(ruta: string) {
    setDestino(ruta)
    setPaso(2)
  }

  function terminar() {
    cerrar()
    if (destino) navigate(destino)
  }

  const actual = PASOS[paso]
  const ultimo = paso === PASOS.length - 1

  return (
    <Modal abierto={abierta} onCerrar={cerrar} titulo={actual.titulo}>
      <p className={styles.indicador}>
        Paso {paso + 1} de {PASOS.length}
      </p>

      {paso === 1 ? (
        <div className={styles.opciones}>
          <button
            type="button"
            className={styles.opcion}
            onClick={() => elegir('/actividades/nueva')}
          >
            <span className={styles.opcionTitulo}>Organizar</span>
            <span className={styles.opcionTexto}>Crea una actividad y comparte su clave.</span>
          </button>
          <button
            type="button"
            className={styles.opcion}
            onClick={() => elegir('/actividades/unirse')}
          >
            <span className={styles.opcionTitulo}>Participar</span>
            <span className={styles.opcionTexto}>Únete con la clave que te dieron.</span>
          </button>
        </div>
      ) : (
        <p className={styles.texto}>{actual.texto}</p>
      )}

      <div className={styles.pie}>
        <Button variant="ghost" size="sm" onClick={cerrar}>
          {ultimo ? 'Cerrar' : 'Saltar'}
        </Button>
        <Button size="sm" onClick={ultimo ? terminar : () => setPaso(paso + 1)}>
          {ultimo
            ? destino === '/actividades/nueva'
              ? 'Crear mi actividad'
              : destino
                ? 'Unirme con una clave'
                : 'Empezar'
            : paso === 1
              ? 'Decido después'
              : 'Siguiente'}
        </Button>
      </div>
    </Modal>
  )
}
