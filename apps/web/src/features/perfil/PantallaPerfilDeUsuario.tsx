import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Avatar, AvisoError, Card, IconoCargando } from '../../components/ui'
import { VitrinaInsignias } from '../insignias'
import { usePerfilDeUsuario } from './usePerfil'
import { useSesion } from '../cuentas'
import styles from './PantallaPerfilDeUsuario.module.css'

/**
 * Perfil básico de otra persona (docs/diseno-desarrollo-nucleo.md §6.3): nombre
 * y rangos. Se abre desde la lista de participantes. Ni frases ni progreso:
 * eso es de quien lo recibió y de quien organizó su actividad.
 */
export function PantallaPerfilDeUsuario() {
  const { id = '' } = useParams<{ id: string }>()
  const { usuario: actor } = useSesion()
  const perfil = usePerfilDeUsuario(id)

  // El propio perfil tiene su pantalla, con todo lo que aquí no se enseña.
  if (actor && actor.idUsuario === id) return <Navigate to="/perfil" replace />

  if (perfil.isPending) {
    return (
      <AppShell seccionActiva="actividades" titulo="Perfil">
        <div className={styles.cargando} role="status" aria-label="Cargando perfil">
          <IconoCargando size={24} />
        </div>
      </AppShell>
    )
  }

  if (perfil.isError || !perfil.data) {
    return (
      <AppShell seccionActiva="actividades" titulo="Perfil">
        <AvisoError mensaje={perfil.error?.message ?? 'No encontramos a esta persona.'} />
      </AppShell>
    )
  }

  const usuario = perfil.data

  return (
    <AppShell seccionActiva="actividades" titulo="Perfil">
      <Card className={styles.cabecera}>
        <Avatar
          nombre={usuario.nombre}
          apellidoPaterno={usuario.apellidoPaterno}
          fotoUrl={usuario.fotoUrl}
          tamano="lg"
        />
        <h2 className={styles.nombre}>
          {usuario.nombre} {usuario.apellidoPaterno} {usuario.apellidoMaterno}
        </h2>
      </Card>

      <section className={styles.seccion} aria-labelledby="titulo-insignias">
        <h2 id="titulo-insignias" className={styles.tituloSeccion}>
          Insignias
        </h2>
        <Card>
          <VitrinaInsignias puntos={usuario.acumulado} />
          <p className={styles.nota}>
            Lo que le dijeron al reconocerla es privado: solo esta persona y quien organizó cada
            actividad lo ven.
          </p>
        </Card>
      </section>
    </AppShell>
  )
}
