import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AvisoError, Button, Card, IconoCargando, Switch } from '../../components/ui'
import type { ConstanciaResumen } from './formacion.api'
import { formatoFecha } from './formato'
import { useConstanciasDeUsuario } from './useConstancias'
import { useCambiarVisibilidadConstancias, useMisConstancias } from './useProgreso'
import styles from './ConstanciasEnPerfil.module.css'

/*
 * Las constancias en el perfil (nota del incremento 5). El perfil es de
 * Cuentas; Formación le entrega este grupo ya armado, con sus datos y su
 * regla de privacidad, como Insignias le entrega la vitrina.
 *
 * A propósito no se parece a una insignia: es una lista de texto con una
 * palomita en Confirmed Green. Sin arte, sin Apothecary Amber, sin niveles,
 * puntos ni contadores, y en orden de fecha, nunca por "logro": el perfil no
 * compara a nadie (DESIGN.md, "Course progress").
 */

export type ConstanciasEnPerfilProps = { propio: true } | { idUsuario: string }

export function ConstanciasEnPerfil(props: ConstanciasEnPerfilProps) {
  return 'propio' in props ? <Propias /> : <DeOtraPersona idUsuario={props.idUsuario} />
}

function Grupo({ children }: { children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.grupo} aria-labelledby={id}>
      <h2 id={id} className={styles.tituloGrupo}>
        Formación completada
      </h2>
      <Card>{children}</Card>
    </section>
  )
}

function Propias() {
  const consulta = useMisConstancias()
  const visibilidad = useCambiarVisibilidadConstancias()
  const idEstado = useId()

  if (consulta.isPending) {
    return (
      <Grupo>
        <div className={styles.cargando} role="status" aria-label="Cargando tus constancias">
          <IconoCargando size={20} />
        </div>
      </Grupo>
    )
  }
  if (consulta.isError) {
    return (
      <Grupo>
        <AvisoError mensaje={consulta.error.message} />
      </Grupo>
    )
  }

  const { constancias } = consulta.data
  // Mientras se guarda, el interruptor ya muestra lo que se pidió.
  const publicas = visibilidad.isPending
    ? (visibilidad.variables ?? consulta.data.publicas)
    : consulta.data.publicas

  return (
    <Grupo>
      <p className={styles.texto}>
        Los cursos y las rutas que terminaste en el Centro de formación. Cada constancia hace
        constar que recorriste sus lecciones; no es una calificación.
      </p>
      {constancias.length > 0 ? (
        <ListaConstancias constancias={constancias} />
      ) : (
        <p className={styles.vacio}>
          Cuando termines un curso o una ruta, su constancia aparecerá aquí.{' '}
          <Link to="/recursos">Explorar cursos</Link>
        </p>
      )}
      <div className={styles.visibilidad}>
        <Switch
          label="Mostrar mis constancias en mi perfil"
          checked={publicas}
          disabled={visibilidad.isPending}
          onChange={(evento) => visibilidad.mutate(evento.target.checked)}
          aria-describedby={idEstado}
        />
        <p id={idEstado} className={styles.nota}>
          {publicas
            ? 'Otras personas con sesión las ven en tu perfil.'
            : 'Solo tú las ves. Están ocultas hasta que decidas mostrarlas.'}
        </p>
        {visibilidad.isError ? <AvisoError mensaje={visibilidad.error.message} /> : null}
      </div>
    </Grupo>
  )
}

/** En el perfil de otra persona el grupo solo aparece si ella mostró sus
 * constancias y tiene alguna: si no, no queda rastro de que exista. */
function DeOtraPersona({ idUsuario }: { idUsuario: string }) {
  const consulta = useConstanciasDeUsuario(idUsuario)
  if (consulta.isError) {
    return (
      <Grupo>
        <AvisoError mensaje={consulta.error.message} />
      </Grupo>
    )
  }
  if (!consulta.data || consulta.data.length === 0) return null
  return (
    <Grupo>
      <ListaConstancias constancias={consulta.data} />
    </Grupo>
  )
}

const LIMITE_INICIAL = 5

function metaDe(c: ConstanciaResumen): string {
  const fecha = formatoFecha(c.fechaFinalizacion)
  return c.tipo === 'ruta'
    ? `Ruta · ${c.numCursos} ${c.numCursos === 1 ? 'curso' : 'cursos'} · Terminada el ${fecha}`
    : `Curso · Terminado el ${fecha}`
}

export function ListaConstancias({ constancias }: { constancias: ConstanciaResumen[] }) {
  const [todas, setTodas] = useState(false)
  const visibles = todas ? constancias : constancias.slice(0, LIMITE_INICIAL)

  return (
    <>
      <ul className={styles.lista}>
        {visibles.map((c) => (
          <li key={c.folio} className={styles.fila}>
            <span className={styles.icono} aria-hidden="true">
              ✓
            </span>
            <div className={styles.datos}>
              <p className={styles.titulo}>{c.titulo}</p>
              <p className={styles.meta}>{metaDe(c)}</p>
            </div>
            <Link
              to={`/constancias/${c.folio}`}
              className={styles.enlace}
              aria-label={`Ver la constancia de ${c.titulo}`}
            >
              Ver constancia
            </Link>
          </li>
        ))}
      </ul>
      {constancias.length > LIMITE_INICIAL ? (
        <Button variant="ghost" size="sm" onClick={() => setTodas((actual) => !actual)}>
          {todas ? 'Ver menos' : `Ver las ${constancias.length}`}
        </Button>
      ) : null}
    </>
  )
}
