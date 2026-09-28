import { useState, type FormEvent } from 'react'
import { AvisoError, Button, Input } from '../../components/ui'
import { useActualizarDatosPerfil } from './usePerfil'
import styles from './FormularioPerfil.module.css'
import { ErrorPerfil, type DatosPerfil, validarCampoRequerido } from '../cuentas'

type Errores = Partial<Record<keyof DatosPerfil, string>>

interface FormularioDatosPerfilProps {
  /** Valores con los que arranca. Quien lo monta le pasa una `key` ligada a
   * ellos, así que un cambio externo remonta el formulario en vez de
   * sincronizarlo por efecto. */
  inicial: DatosPerfil
}

/** Nombre y apellidos, lo único editable del perfil además de la contraseña
 * (docs/diseno-desarrollo-nucleo.md §6.3). */
export function FormularioDatosPerfil({ inicial }: FormularioDatosPerfilProps) {
  const mutacion = useActualizarDatosPerfil()
  const [valores, setValores] = useState<DatosPerfil>(inicial)
  const [errores, setErrores] = useState<Errores>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const sinCambios =
    valores.nombre === inicial.nombre &&
    valores.apellidoPaterno === inicial.apellidoPaterno &&
    valores.apellidoMaterno === inicial.apellidoMaterno

  function actualizar(campo: keyof DatosPerfil, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }))
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const campos = Object.keys(inicial) as (keyof DatosPerfil)[]
    const nuevos: Errores = {}
    for (const campo of campos) nuevos[campo] = validarCampoRequerido(valores[campo])
    setErrores(nuevos)

    const invalido = campos.find((campo) => nuevos[campo])
    if (invalido) {
      document.getElementById(`perfil-${invalido}`)?.focus()
      return
    }

    setErrorEnvio(null)
    try {
      await mutacion.mutateAsync({
        nombre: valores.nombre.trim(),
        apellidoPaterno: valores.apellidoPaterno.trim(),
        apellidoMaterno: valores.apellidoMaterno.trim(),
      })
    } catch (error) {
      if (error instanceof ErrorPerfil && error.detallePorCampo) {
        setErrores(error.detallePorCampo)
      }
      setErrorEnvio(error instanceof Error ? error.message : 'No pudimos guardar tus datos.')
    }
  }

  return (
    <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
      {errorEnvio ? <AvisoError mensaje={errorEnvio} /> : null}
      <Input
        id="perfil-nombre"
        label="Nombre"
        autoComplete="given-name"
        value={valores.nombre}
        onChange={(e) => actualizar('nombre', e.target.value)}
        error={errores.nombre}
        disabled={mutacion.isPending}
      />
      <div className={styles.filaDos}>
        <Input
          id="perfil-apellidoPaterno"
          label="Apellido paterno"
          autoComplete="family-name"
          value={valores.apellidoPaterno}
          onChange={(e) => actualizar('apellidoPaterno', e.target.value)}
          error={errores.apellidoPaterno}
          disabled={mutacion.isPending}
        />
        <Input
          id="perfil-apellidoMaterno"
          label="Apellido materno"
          value={valores.apellidoMaterno}
          onChange={(e) => actualizar('apellidoMaterno', e.target.value)}
          error={errores.apellidoMaterno}
          disabled={mutacion.isPending}
        />
      </div>
      <div className={styles.acciones}>
        <Button type="submit" disabled={mutacion.isPending || sinCambios}>
          {mutacion.isPending ? 'Guardando…' : 'Guardar datos'}
        </Button>
        {mutacion.isSuccess && sinCambios ? (
          <p className={styles.confirmacion} role="status">
            Datos guardados.
          </p>
        ) : null}
      </div>
    </form>
  )
}
