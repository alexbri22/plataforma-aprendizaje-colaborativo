import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Button, Card, IconoCargando, Input } from '../../components/ui'
import { ErrorActividad } from './actividades.api'
import { validarCampoRequerido } from './validacion'
import { useUnirseConClaveMutation, useVistaPreviaClave } from './useActividades'
import styles from './PantallaUnirseConClave.module.css'

const MENSAJE_ERROR_UNION_GENERICO = 'No pudimos unirte a esta actividad. Intenta de nuevo.'

export function PantallaUnirseConClave() {
  const navigate = useNavigate()
  const [clave, setClave] = useState('')
  const [claveConsultada, setClaveConsultada] = useState<string | null>(null)
  const [errorClave, setErrorClave] = useState<string | undefined>()
  const [errorUnion, setErrorUnion] = useState<string | null>(null)

  const vistaPreviaQuery = useVistaPreviaClave(claveConsultada ?? '', claveConsultada !== null)
  const unirseMutacion = useUnirseConClaveMutation()

  function manejarCambioClave(evento: ChangeEvent<HTMLInputElement>) {
    setClave(evento.target.value.toUpperCase())
  }

  function manejarBuscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const requerido = validarCampoRequerido(clave)
    setErrorClave(requerido)
    if (requerido) return

    setErrorUnion(null)
    setClaveConsultada(clave.trim())
  }

  function manejarBuscarOtra() {
    setClaveConsultada(null)
    setErrorUnion(null)
  }

  async function manejarUnirse() {
    if (!claveConsultada) return

    setErrorUnion(null)
    try {
      const actividad = await unirseMutacion.mutateAsync(claveConsultada)
      navigate(`/actividades/${actividad.id}`)
    } catch (error) {
      setErrorUnion(error instanceof ErrorActividad ? error.message : MENSAJE_ERROR_UNION_GENERICO)
    }
  }

  return (
    <AppShell seccionActiva="actividades" titulo="Unirse con clave">
      <Card className={styles.card}>
        {claveConsultada === null || vistaPreviaQuery.isError ? (
          <form className={styles.formulario} onSubmit={manejarBuscar} noValidate>
            {vistaPreviaQuery.isError ? (
              <AvisoError
                mensaje={
                  vistaPreviaQuery.error instanceof ErrorActividad
                    ? vistaPreviaQuery.error.message
                    : 'Esta clave no corresponde a ninguna actividad.'
                }
              />
            ) : null}

            <Input
              id="clave"
              label="Clave de ingreso"
              placeholder="Por ejemplo, ECO4H7KP"
              value={clave}
              onChange={manejarCambioClave}
              error={errorClave}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />

            <Button type="submit" className={styles.enviar}>
              Buscar
            </Button>
          </form>
        ) : vistaPreviaQuery.isPending ? (
          <div className={styles.cargando} role="status" aria-label="Buscando la actividad">
            <IconoCargando size={24} />
          </div>
        ) : (
          <div className={styles.vistaPrevia}>
            {errorUnion ? <AvisoError mensaje={errorUnion} /> : null}

            <div>
              <h2 className={styles.nombre}>{vistaPreviaQuery.data.nombre}</h2>
              <p className={styles.organiza}>Organiza {vistaPreviaQuery.data.nombreOrganizador}</p>
            </div>

            <p className={styles.objetivo}>{vistaPreviaQuery.data.objetivo}</p>

            <div className={styles.acciones}>
              <Button onClick={manejarUnirse} disabled={unirseMutacion.isPending}>
                {unirseMutacion.isPending ? (
                  <>
                    <IconoCargando />
                    Uniéndote…
                  </>
                ) : (
                  'Unirme'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={manejarBuscarOtra}
                disabled={unirseMutacion.isPending}
              >
                Buscar otra clave
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  )
}
