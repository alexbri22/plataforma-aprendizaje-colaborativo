import { useRef, useState, type ChangeEvent } from 'react'
import { ETIQUETAS_NIVEL_ESTUDIOS, type CategoriaInsignia } from '@plataforma/shared'
import { AppShell } from '../../components/AppShell'
import { Avatar, AvisoError, Button, Card, IconoCargando } from '../../components/ui'
import { DetalleInsignia, VitrinaInsignias, useRecibidosEnPerfil } from '../insignias'
import { FormularioContrasena } from './FormularioContrasena'
import { FormularioDatosPerfil } from './FormularioDatosPerfil'
import { ErrorFoto, TIPOS_ACEPTADOS, prepararFoto } from './foto'
import { useQuitarFoto, useSubirFoto, usePerfilPropio } from './usePerfil'
import styles from './PantallaPerfil.module.css'

/**
 * Mi perfil (docs/diseno-desarrollo-nucleo.md §6.6): foto, datos, las seis
 * insignias con lo que hay detrás de cada una, y la contraseña. Lo que se ve
 * aquí de las insignias —frases, progreso— es solo para uno mismo; a otra
 * persona se le enseña únicamente el rango (concepto §6, "El perfil").
 */
export function PantallaPerfil() {
  const perfil = usePerfilPropio()
  const recibidos = useRecibidosEnPerfil()
  const subir = useSubirFoto()
  const quitar = useQuitarFoto()
  const [categoriaAbierta, setCategoriaAbierta] = useState<CategoriaInsignia | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  // Recortar y comprimir ocurre antes de que exista la mutación, así que
  // `subir.isPending` no lo cubre; sin esto, "Quitar foto" y una segunda
  // elección seguirían habilitados durante ese tramo y competirían.
  const [preparando, setPreparando] = useState(false)
  const entradaFoto = useRef<HTMLInputElement>(null)

  async function manejarArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar.
    evento.target.value = ''
    if (!archivo || preparando) return

    setErrorFoto(null)
    setPreparando(true)
    try {
      await subir.mutateAsync(await prepararFoto(archivo))
    } catch (error) {
      setErrorFoto(
        error instanceof ErrorFoto || error instanceof Error
          ? error.message
          : 'No pudimos subir tu foto.',
      )
    } finally {
      setPreparando(false)
    }
  }

  async function manejarQuitar() {
    setErrorFoto(null)
    try {
      await quitar.mutateAsync()
    } catch (error) {
      setErrorFoto(error instanceof Error ? error.message : 'No pudimos quitar tu foto.')
    }
  }

  if (perfil.isPending) {
    return (
      <AppShell seccionActiva="perfil" titulo="Mi perfil">
        <div className={styles.cargando} role="status" aria-label="Cargando tu perfil">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (perfil.isError || !perfil.data) {
    return (
      <AppShell seccionActiva="perfil" titulo="Mi perfil">
        <AvisoError mensaje={perfil.error?.message ?? 'No pudimos cargar tu perfil.'} />
      </AppShell>
    )
  }

  const usuario = perfil.data
  const ocupado = preparando || subir.isPending || quitar.isPending

  return (
    <AppShell seccionActiva="perfil" titulo="Mi perfil">
      <Card className={styles.cabecera}>
        <Avatar
          nombre={usuario.nombre}
          apellidoPaterno={usuario.apellidoPaterno}
          fotoUrl={usuario.fotoUrl}
          tamano="lg"
        />
        <div className={styles.identidad}>
          <h2 className={styles.nombre}>
            {usuario.nombre} {usuario.apellidoPaterno} {usuario.apellidoMaterno}
          </h2>
          <p className={styles.correo}>{usuario.correo}</p>
          <p className={styles.estudios}>
            {ETIQUETAS_NIVEL_ESTUDIOS[usuario.nivelEstudios]} · {usuario.institucionEducativa}
          </p>
          <div className={styles.accionesFoto}>
            <input
              ref={entradaFoto}
              type="file"
              accept={TIPOS_ACEPTADOS}
              onChange={manejarArchivo}
              hidden
              aria-label="Elegir foto de perfil"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={ocupado}
              onClick={() => entradaFoto.current?.click()}
            >
              {preparando || subir.isPending
                ? 'Subiendo…'
                : usuario.fotoUrl
                  ? 'Cambiar foto'
                  : 'Subir foto'}
            </Button>
            {usuario.fotoUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={ocupado}
                onClick={manejarQuitar}
              >
                Quitar foto
              </Button>
            ) : null}
          </div>
          {errorFoto ? <AvisoError mensaje={errorFoto} /> : null}
        </div>
      </Card>

      <section className={styles.seccion} aria-labelledby="titulo-insignias">
        <h2 id="titulo-insignias" className={styles.tituloSeccion}>
          Tus insignias
        </h2>
        <Card>
          <p className={styles.texto}>
            Seis categorías que crecen con lo que tus compañeros y quien organiza reconocen en ti.
            Elige una para ver lo que te dijeron y cuánto falta para el siguiente nivel.
          </p>
          <VitrinaInsignias
            puntos={usuario.acumulado}
            seleccionada={categoriaAbierta}
            onSeleccionar={(categoria) =>
              setCategoriaAbierta((actual) => (actual === categoria ? null : categoria))
            }
            className={styles.vitrina}
          />
          {categoriaAbierta ? (
            recibidos.isError ? (
              <AvisoError mensaje={recibidos.error.message} />
            ) : (
              <DetalleInsignia
                categoria={categoriaAbierta}
                puntos={usuario.acumulado[categoriaAbierta] ?? 0}
                recibidos={recibidos.data ?? []}
              />
            )
          ) : null}
        </Card>
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-datos">
        <h2 id="titulo-datos" className={styles.tituloSeccion}>
          Tus datos
        </h2>
        <Card>
          {/* La key remonta el formulario cuando el servidor devuelve datos
              nuevos, en vez de sincronizar el estado con un efecto. */}
          <FormularioDatosPerfil
            key={`${usuario.nombre}|${usuario.apellidoPaterno}|${usuario.apellidoMaterno}`}
            inicial={{
              nombre: usuario.nombre,
              apellidoPaterno: usuario.apellidoPaterno,
              apellidoMaterno: usuario.apellidoMaterno,
            }}
          />
          <p className={styles.nota}>
            El correo no se puede cambiar: es con el que inicias sesión y con el que te encuentran
            para invitarte. Nunca se muestra a otras personas.
          </p>
        </Card>
      </section>

      <section className={styles.seccion} aria-labelledby="titulo-contrasena">
        <h2 id="titulo-contrasena" className={styles.tituloSeccion}>
          Contraseña
        </h2>
        <Card>
          <FormularioContrasena />
        </Card>
      </section>
    </AppShell>
  )
}
