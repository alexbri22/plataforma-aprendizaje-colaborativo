import { useId } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { AvisoError, Badge, Button, Card, IconoCargando, Switch } from '../../components/ui'
import type { ConstanciaPropia } from './formacion.api'
import { formatoFecha } from './formato'
import { IconoFlecha } from './iconos'
import { useCambiarVisibilidadConstancias, useMisConstancias } from './useProgreso'
import styles from './ListadoFormacion.module.css'

/*
 * Mis diplomas (/mis-diplomas, con sesión): las constancias de los cursos y
 * las rutas que la persona terminó (incremento 5). La página se llama como el
 * ítem de la barra lateral; el documento sigue diciendo "constancia" hasta
 * que se acuerde el nombre. El interruptor es el mismo del perfil.
 */
export function PantallaMisDiplomas() {
  return (
    <AppShell seccionActiva="mis-diplomas" titulo="Mis diplomas">
      <div className={[styles.centro, styles.centroEnApp].join(' ')}>
        <div className={styles.introduccion}>
          <p>
            Las constancias de los cursos y las rutas que terminaste. Cada una tiene un folio con el
            que cualquiera puede verificarla; no es una calificación.
          </p>
        </div>
        <Diplomas />
      </div>
    </AppShell>
  )
}

function Diplomas() {
  const consulta = useMisConstancias()
  const visibilidad = useCambiarVisibilidadConstancias()
  const idEstado = useId()

  if (consulta.isPending) {
    return (
      <div className={styles.estado} role="status" aria-label="Cargando tus constancias">
        <IconoCargando size={24} />
      </div>
    )
  }
  if (consulta.isError) {
    return (
      <div className={styles.estado}>
        <AvisoError mensaje={consulta.error.message} />
        <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const { constancias } = consulta.data
  // Mientras se guarda, el interruptor ya muestra lo que se pidió.
  const publicas = visibilidad.isPending
    ? (visibilidad.variables ?? consulta.data.publicas)
    : consulta.data.publicas

  return (
    <>
      {constancias.length > 0 ? (
        <ul className={styles.grid} aria-label="Mis constancias">
          {constancias.map((k) => (
            <li key={k.folio}>
              <TarjetaConstancia constancia={k} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.estado} role="status">
          <p>Todavía no tienes constancias. Las recibes al terminar un curso o una ruta.</p>
          <Button variant="secondary" size="sm" to="/recursos">
            Explorar recursos
          </Button>
        </div>
      )}

      <div className={styles.visibilidad}>
        <Switch
          label="Mostrar mis constancias en mi perfil"
          checked={publicas}
          disabled={visibilidad.isPending}
          onChange={(evento) => visibilidad.mutate(evento.target.checked)}
          aria-describedby={idEstado}
        />
        <p id={idEstado} className={styles.meta}>
          {publicas
            ? 'Otras personas con sesión las ven en tu perfil.'
            : 'Solo tú las ves. Están ocultas hasta que decidas mostrarlas.'}
        </p>
        {visibilidad.isError ? <AvisoError mensaje={visibilidad.error.message} /> : null}
      </div>
    </>
  )
}

function TarjetaConstancia({ constancia: k }: { constancia: ConstanciaPropia }) {
  const esRuta = k.tipo === 'ruta'
  return (
    <Card className={styles.tarjeta}>
      <div className={styles.tarjetaMeta}>
        <Badge variant={esRuta ? 'primary' : 'neutral'}>{esRuta ? 'Ruta' : 'Curso'}</Badge>
        <span className={styles.folio}>{k.folio}</span>
      </div>
      <h3 className={styles.tarjetaTitulo}>{k.titulo}</h3>
      <p className={styles.meta}>
        {[
          `Terminado el ${formatoFecha(k.fechaFinalizacion)}`,
          esRuta ? `${k.numCursos} ${k.numCursos === 1 ? 'curso' : 'cursos'}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className={styles.pie}>
        <span />
        <Link to={`/constancias/${k.folio}`} className={styles.enlaceAccion}>
          Ver constancia <IconoFlecha className={styles.flecha} />
          <span className={styles.srOnly}>: {k.titulo}</span>
        </Link>
      </div>
    </Card>
  )
}
