import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { AvisoError, Button, Card, IconoCargando, LineaEtapas } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { infoFase } from './fase'
import { formatearFecha } from './formato'
import { guiaEtapa } from './guiaEtapa'
import { useCerrarInscripcionMutation, useIniciarCierreMutation } from './useActividades'
import type { Actividad, FaseActividad } from './tipos'
import styles from './EtapasActividad.module.css'

// Las etapas por las que pasa toda actividad. Archivada no se lista: es el
// final, y solo aparece cuando ya se llegó ahí.
const ETAPAS: FaseActividad[] = ['inscripcion', 'formacion_equipos', 'desarrollo', 'cierre']

interface InfoAccionAdelantar {
  pregunta: string
  textoBoton: string
  textoConfirmacion: string
  textoBotonConfirmar: string
  textoBotonCargando: string
  mensajeErrorGenerico: string
  mutacion: UseMutationResult<Actividad, unknown, void>
}

// Adelantar la etapa a mano (cerrar la inscripción o iniciar el cierre antes
// de su fecha): dos pasos, explicación + botón y luego confirmación, porque
// ninguna de las dos tiene vuelta atrás. Secundario: lo normal es que la
// etapa avance sola en su fecha.
function AccionAdelantar({
  pregunta,
  textoBoton,
  textoConfirmacion,
  textoBotonConfirmar,
  textoBotonCargando,
  mensajeErrorGenerico,
  mutacion,
}: InfoAccionAdelantar) {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <div className={styles.adelantar}>
        <p className={styles.texto}>{pregunta}</p>
        <Button variant="secondary" size="sm" onClick={() => setConfirmando(true)}>
          {textoBoton}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.adelantar}>
      {mutacion.isError ? (
        <AvisoError
          mensaje={
            mutacion.error instanceof ErrorActividad ? mutacion.error.message : mensajeErrorGenerico
          }
        />
      ) : null}
      <p className={styles.texto}>{textoConfirmacion}</p>
      <div className={styles.botones}>
        <Button size="sm" onClick={() => mutacion.mutate()} disabled={mutacion.isPending}>
          {mutacion.isPending ? (
            <>
              <IconoCargando />
              {textoBotonCargando}
            </>
          ) : (
            textoBotonConfirmar
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConfirmando(false)
            mutacion.reset()
          }}
          disabled={mutacion.isPending}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// La transición manual disponible, si el actor la tiene en sus capacidades
// (nucleo §4.3: la pantalla no evalúa rol ni etapa por su cuenta). Cada una
// vive en una etapa distinta, así que a lo más aparece una.
function AdelantarEtapa({ actividad }: { actividad: Actividad }) {
  const cerrarInscripcion = useCerrarInscripcionMutation(actividad.id)
  const iniciarCierre = useIniciarCierreMutation(actividad.id)

  if (actividad.capacidades?.includes('cerrar_inscripcion')) {
    return (
      <AccionAdelantar
        pregunta="¿Ya se unieron todos? Puedes cerrar la inscripción antes de la fecha."
        textoBoton="Cerrar inscripción ahora"
        textoConfirmacion="La clave dejará de admitir nuevas uniones y no se reactiva. La actividad pasa a formación de equipos."
        textoBotonConfirmar="Sí, cerrar inscripción"
        textoBotonCargando="Cerrando…"
        mensajeErrorGenerico="No pudimos cerrar la inscripción. Intenta de nuevo."
        mutacion={cerrarInscripcion}
      />
    )
  }

  if (actividad.capacidades?.includes('iniciar_cierre')) {
    return (
      <AccionAdelantar
        // "Abre el reconocimiento" es cierto: ventana() en insignias.service.ts
        // abre con estado === 'cierre' o con la fecha de término, lo que
        // ocurra primero.
        pregunta={
          actividad.fechaTermino
            ? `¿Ya terminó el trabajo? Puedes iniciar el cierre antes del ${formatearFecha(actividad.fechaTermino)}.`
            : '¿Ya terminó el trabajo? Puedes iniciar el cierre ahora.'
        }
        textoBoton="Iniciar cierre ahora"
        textoConfirmacion="Los equipos ya no podrán agregar metas, avances ni materiales, y se abre el reconocimiento entre compañeros. No tiene vuelta atrás."
        textoBotonConfirmar="Sí, iniciar cierre"
        textoBotonCargando="Iniciando…"
        mensajeErrorGenerico="No pudimos iniciar el cierre. Intenta de nuevo."
        mutacion={iniciarCierre}
      />
    )
  }

  return null
}

// En qué etapa va la actividad y qué se hace en ella según el rol
// (guiaEtapa). Informativo, sin botones ni enlaces (decisión de producto):
// cada paso nombra la sección de la barra lateral donde se hace, para que la
// persona aprenda a moverse por la plataforma. Reemplaza a la etiqueta de
// etapa que iba junto al nombre.
export function EtapasActividad({ actividad }: { actividad: Actividad }) {
  const guia = guiaEtapa(actividad)
  const archivada = actividad.fase === 'archivada'
  const etapas = archivada ? [...ETAPAS, 'archivada' as const] : ETAPAS
  const actual = Math.max(0, etapas.indexOf(actividad.fase))

  return (
    <Card className={styles.tarjeta}>
      <LineaEtapas
        etapas={etapas.map((etapa) => infoFase(etapa).etiqueta)}
        actual={actual}
        etiqueta="Etapas de la actividad"
      />

      {guia ? (
        <div className={styles.guia}>
          <h2 className={styles.titulo}>Qué se hace en esta etapa</h2>
          <ul className={styles.pasos}>
            {[guia.principal, ...guia.tambien].map((paso, indice) => (
              <li key={paso.texto} className={indice === 0 ? styles.pasoPrincipal : styles.paso}>
                {paso.donde ? <span className={styles.donde}>{paso.donde}</span> : null}
                <span>{paso.texto}</span>
              </li>
            ))}
          </ul>
          {guia.nota ? <p className={styles.texto}>{guia.nota}</p> : null}
        </div>
      ) : null}

      <AdelantarEtapa actividad={actividad} />
    </Card>
  )
}
