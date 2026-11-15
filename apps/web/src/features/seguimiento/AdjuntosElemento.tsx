import {
  EXTENSIONES_ARCHIVO_ELEMENTO,
  LONGITUD_MAXIMA_ENLACE_ELEMENTO,
  type ArchivoDeElemento,
} from '@plataforma/shared'
import { useId, useRef, useState } from 'react'
import { Button, Input } from '../../components/ui'
import { problemaConArchivo, urlArchivoElemento } from './elementos.api'
import styles from './AdjuntosElemento.module.css'

const ACEPTA = Object.keys(EXTENSIONES_ARCHIVO_ELEMENTO)
  .map((extension) => `.${extension}`)
  .join(',')

const FORMATO_TAMANO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${FORMATO_TAMANO.format(Math.max(1, bytes / 1024))} KB`
  return `${FORMATO_TAMANO.format(bytes / (1024 * 1024))} MB`
}

function IconoClip() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className={styles.icono}>
      <path
        d="M14.5 9.5 9.6 14.4a3.2 3.2 0 0 1-4.5-4.5l5.6-5.6a2.1 2.1 0 0 1 3 3l-5.5 5.5a1 1 0 0 1-1.5-1.4l4.9-4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Indicador en la fila colapsada: el elemento lleva enlace o archivo. */
export function MarcaAdjunto() {
  return (
    <span className={styles.marca} title="Tiene adjuntos">
      <IconoClip />
      <span className={styles.oculto}>Tiene adjuntos</span>
    </span>
  )
}

/** El enlace y el archivo de un elemento, para leerlos o descargarlos. */
export function AdjuntosElemento({
  idElemento,
  enlace,
  archivo,
}: {
  idElemento: string
  enlace: string | null
  archivo: ArchivoDeElemento | null
}) {
  if (!enlace && !archivo) return null
  return (
    <ul className={styles.lista}>
      {enlace ? (
        <li>
          <span className={styles.etiqueta}>Enlace</span>
          <a href={enlace} target="_blank" rel="noopener noreferrer" className={styles.enlace}>
            {enlace}
          </a>
        </li>
      ) : null}
      {archivo ? (
        <li>
          <span className={styles.etiqueta}>Archivo</span>
          <a
            href={urlArchivoElemento(idElemento)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.enlace}
          >
            {archivo.nombre}
          </a>
          <span className={styles.tamano}>{formatearTamano(archivo.tamano)}</span>
        </li>
      ) : null}
    </ul>
  )
}

export interface CamposAdjuntosProps {
  enlace: string
  onEnlace: (enlace: string) => void
  /** El archivo elegido para subir, si se eligió uno. */
  archivoNuevo: File | null
  onArchivoNuevo: (archivo: File | null) => void
  /** El que ya tiene el elemento (al editar). */
  archivoActual?: ArchivoDeElemento | null
  quitarActual?: boolean
  onQuitarActual?: (quitar: boolean) => void
  errorEnlace?: string
  disabled?: boolean
}

// Enlace y archivo, opcionales y uno de cada uno. La ayuda dice el límite y
// qué hacer si el archivo es más grande (Drive y enlace), antes de que la
// persona lo intente.
export function CamposAdjuntos({
  enlace,
  onEnlace,
  archivoNuevo,
  onArchivoNuevo,
  archivoActual = null,
  quitarActual = false,
  onQuitarActual,
  errorEnlace,
  disabled = false,
}: CamposAdjuntosProps) {
  const entradaRef = useRef<HTMLInputElement>(null)
  const idAyuda = useId()
  const [problema, setProblema] = useState<string | null>(null)

  function elegir(archivo: File | undefined) {
    if (!archivo) return
    const motivo = problemaConArchivo(archivo)
    setProblema(motivo)
    if (!motivo) onArchivoNuevo(archivo)
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (entradaRef.current) entradaRef.current.value = ''
  }

  const conservaActual = archivoActual !== null && !quitarActual && archivoNuevo === null

  return (
    <div className={styles.campos}>
      <Input
        label="Enlace (opcional)"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={enlace}
        maxLength={LONGITUD_MAXIMA_ENLACE_ELEMENTO}
        onChange={(e) => onEnlace(e.target.value)}
        error={errorEnlace}
        disabled={disabled}
      />

      <div className={styles.archivo}>
        <span className={styles.etiquetaCampo}>Archivo (opcional)</span>
        <span id={idAyuda} className={styles.ayuda}>
          PDF, imagen o documento de Office, de hasta 4 MB. Si pesa más, súbelo a Drive y pega el
          enlace.
        </span>
        <input
          ref={entradaRef}
          type="file"
          accept={ACEPTA}
          className={styles.oculto}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
        <div className={styles.seleccion}>
          {archivoNuevo ? (
            <>
              <span className={styles.nombreArchivo}>
                <IconoClip />
                {archivoNuevo.name}
                <span className={styles.tamano}>{formatearTamano(archivoNuevo.size)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onArchivoNuevo(null)}
              >
                Quitar
              </Button>
            </>
          ) : conservaActual && archivoActual ? (
            <>
              <span className={styles.nombreArchivo}>
                <IconoClip />
                {archivoActual.nombre}
                <span className={styles.tamano}>{formatearTamano(archivoActual.tamano)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-describedby={idAyuda}
                onClick={() => entradaRef.current?.click()}
              >
                Reemplazar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onQuitarActual?.(true)}
              >
                Quitar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                aria-describedby={idAyuda}
                onClick={() => entradaRef.current?.click()}
              >
                Adjuntar archivo
              </Button>
              {archivoActual && quitarActual ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onQuitarActual?.(false)}
                >
                  Conservar {archivoActual.nombre}
                </Button>
              ) : null}
            </>
          )}
        </div>
        {problema ? (
          <span className={styles.problema} role="alert">
            {problema}
          </span>
        ) : null}
      </div>
    </div>
  )
}
