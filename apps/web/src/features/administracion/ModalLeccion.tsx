import { useState, type FormEvent } from 'react'
import { ETIQUETAS_TIPO_LECCION, LARGO_MAXIMO_LECCION, type TipoLeccion } from '@plataforma/shared'
import { AvisoError, Button, Checkbox, Input, Modal, Select, Textarea } from '../../components/ui'
import { ErrorFormacion, Markdown, type DatosLeccion, type LeccionAdmin } from '../formacion'
import styles from './ModalLeccion.module.css'

const TIPOS_PROPIOS: Exclude<TipoLeccion, 'recurso'>[] = ['lectura', 'practica', 'reflexion']

const ETIQUETA_CONTENIDO: Record<TipoLeccion, string> = {
  recurso: 'Introducción (opcional)',
  lectura: 'Contenido de la lectura',
  practica: 'Instrucciones de la práctica',
  reflexion: 'Pregunta para reflexionar',
}

export interface ModalLeccionProps {
  /** La lección a editar; null para escribir una nueva. */
  leccion: LeccionAdmin | null
  onGuardar: (datos: Partial<DatosLeccion>) => Promise<void>
  onCerrar: () => void
  /** Solo en lecciones de recurso: abre la biblioteca para elegir otro. */
  onCambiarRecurso?: () => void
}

// Los errores que tienen un control en este formulario. El resto (los
// mínimos de un curso publicado: `lecciones`, `lecciones.<id>`) no tiene dónde
// mostrarse junto a un campo y va en el aviso de arriba.
const CAMPOS_DEL_MODAL = ['tipo', 'titulo', 'contenido', 'duracionMin']

// Se monta solo cuando está abierto: cada apertura empieza con el formulario
// limpio o con los datos de la lección.
export function ModalLeccion({
  leccion,
  onGuardar,
  onCerrar,
  onCambiarRecurso,
}: ModalLeccionProps) {
  const esRecurso = leccion?.tipo === 'recurso'
  const [tipo, setTipo] = useState<TipoLeccion>(leccion?.tipo ?? 'lectura')
  const [titulo, setTitulo] = useState(leccion?.titulo ?? '')
  const [contenido, setContenido] = useState(leccion?.contenido ?? '')
  const [duracion, setDuracion] = useState(
    leccion?.duracionMin === null || leccion?.duracionMin === undefined
      ? ''
      : String(leccion.duracionMin),
  )
  const [obligatoria, setObligatoria] = useState(leccion?.obligatoria ?? true)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    setMensaje(null)
    setGuardando(true)
    try {
      await onGuardar({
        tipo,
        titulo,
        contenido,
        obligatoria,
        duracionMin: duracion.trim() === '' ? null : Number(duracion),
      })
    } catch (error) {
      if (error instanceof ErrorFormacion && error.detallePorCampo) {
        setErrores(error.detallePorCampo)
        const sinControl = Object.entries(error.detallePorCampo)
          .filter(([campo]) => !CAMPOS_DEL_MODAL.includes(campo))
          .map(([, texto]) => texto)
        if (sinControl.length > 0) setMensaje(sinControl.join(' '))
      } else {
        setMensaje(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
      }
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      amplio
      onCerrar={onCerrar}
      titulo={leccion ? 'Editar lección' : 'Escribir lección'}
      descripcion={
        esRecurso
          ? 'El título y la duración son opcionales: si los dejas vacíos, se usan los del recurso.'
          : 'Contenido propio de este curso. No aparece en la biblioteca de recursos.'
      }
    >
      <form className={styles.formulario} onSubmit={(e) => void alEnviar(e)} noValidate>
        {mensaje ? <AvisoError mensaje={mensaje} /> : null}

        {esRecurso ? (
          <div className={styles.recurso}>
            <div>
              <p className={styles.recursoTitulo}>{leccion?.recurso?.titulo}</p>
              {leccion?.recurso?.estatus !== 'publicado' ? (
                <p className={styles.recursoAviso}>
                  Este recurso ya no está publicado: elige otro para reparar la lección.
                </p>
              ) : null}
            </div>
            <Button variant="secondary" size="sm" onClick={onCambiarRecurso}>
              Cambiar recurso
            </Button>
          </div>
        ) : null}

        {esRecurso ? null : (
          <Select
            label="Tipo de lección"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoLeccion)}
            error={errores.tipo}
          >
            {TIPOS_PROPIOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_TIPO_LECCION[t]}
              </option>
            ))}
          </Select>
        )}

        <Input
          label={esRecurso ? 'Título (opcional)' : 'Título'}
          value={titulo}
          maxLength={LARGO_MAXIMO_LECCION.titulo}
          onChange={(e) => setTitulo(e.target.value)}
          error={errores.titulo}
          placeholder={esRecurso ? leccion?.recurso?.titulo : undefined}
        />

        <Textarea
          label={ETIQUETA_CONTENIDO[tipo]}
          value={contenido}
          maxLength={LARGO_MAXIMO_LECCION.contenido}
          onChange={(e) => setContenido(e.target.value)}
          error={errores.contenido}
          rows={esRecurso || tipo === 'reflexion' ? 3 : 10}
        />
        {contenido ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={vistaPrevia}
              onClick={() => setVistaPrevia((v) => !v)}
            >
              {vistaPrevia ? 'Ocultar vista previa' : 'Vista previa'}
            </Button>
            {vistaPrevia ? (
              <div className={styles.vistaPrevia}>
                <Markdown fuente={contenido} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.fila}>
          <Input
            label={esRecurso ? 'Duración en minutos (opcional)' : 'Duración en minutos'}
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            error={errores.duracionMin}
            placeholder={
              esRecurso && leccion?.recurso?.duracionMin
                ? String(leccion.recurso.duracionMin)
                : undefined
            }
          />
          <div className={styles.obligatoria}>
            <Checkbox
              label="Lección obligatoria"
              checked={obligatoria}
              onChange={(e) => setObligatoria(e.target.checked)}
            />
          </div>
        </div>

        <div className={styles.acciones}>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {leccion ? 'Guardar lección' : 'Agregar lección'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
