import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ETIQUETAS_ACCION_REVISION,
  ETIQUETAS_ESTATUS_RECURSO,
  MAX_PROPUESTAS_ABIERTAS,
  MAX_PROPUESTAS_EN_REVISION,
} from '@plataforma/shared'
import { AvisoError, Badge, Button, Card, IconoCargando } from '../../components/ui'
import { varianteEstatus } from './editor/varianteEstatus'
import type { PropuestaResumen } from './formacion.api'
import { formatoFecha } from './formato'
import { useMisPropuestas } from './usePropuestas'
import styles from './MisPropuestas.module.css'

/*
 * Mis propuestas (nota del incremento 6): los recursos y cursos que la
 * persona propone, con su estado y lo que decidió el administrador. Vive en
 * Mi formación porque es su espacio individual (§7.2). Desde aquí se empieza
 * una propuesta y se abre su editor.
 */

const ESTADOS_CON_MOTIVO = new Set(['cambios_solicitados', 'rechazado', 'retirado'])

export function MisPropuestas() {
  const consulta = useMisPropuestas()
  const location = useLocation()
  const navigate = useNavigate()
  // El aviso que deja el editor al volver (enviada, eliminada…): viaja en el
  // estado de la navegación y se quita del historial para no reaparecer.
  const [aviso] = useState(() => {
    const estado = location.state as { avisoPropuestas?: unknown } | null
    return typeof estado?.avisoPropuestas === 'string' ? estado.avisoPropuestas : null
  })
  useEffect(() => {
    const estado = location.state as { avisoPropuestas?: unknown } | null
    if (estado?.avisoPropuestas === undefined) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.state, location.pathname, location.search, navigate])

  return (
    <div className={styles.contenido}>
      {aviso ? (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      ) : null}
      <div className={styles.introduccion}>
        <p>
          Propón un recurso o un curso para el Centro de formación. Un administrador lo revisa antes
          de publicarlo y, si se publica, aparece con tu nombre.
        </p>
        <div className={styles.botones}>
          <Button size="sm" to="/propuestas/recursos/nuevo">
            Proponer un recurso
          </Button>
          <Button size="sm" variant="secondary" to="/propuestas/cursos/nuevo">
            Proponer un curso
          </Button>
        </div>
        <p className={styles.nota}>
          Puedes tener hasta {MAX_PROPUESTAS_ABIERTAS} propuestas en preparación y{' '}
          {MAX_PROPUESTAS_EN_REVISION} en revisión a la vez.
        </p>
      </div>

      {consulta.isPending ? (
        <div className={styles.cargando} role="status" aria-label="Cargando tus propuestas">
          <IconoCargando size={24} />
        </div>
      ) : consulta.isError ? (
        <AvisoError mensaje={consulta.error.message} />
      ) : consulta.data.propuestas.length === 0 ? (
        <p className={styles.vacio}>Todavía no propones nada.</p>
      ) : (
        <ul className={styles.lista}>
          {consulta.data.propuestas.map((p) => (
            <li key={`${p.tipo}-${p.id}`}>
              <TarjetaPropuesta propuesta={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TarjetaPropuesta({ propuesta: p }: { propuesta: PropuestaResumen }) {
  const ruta = `/propuestas/${p.tipo === 'recurso' ? 'recursos' : 'cursos'}/${p.id}`
  const decision = p.ultimaDecision
  return (
    <Card className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <h3 className={styles.titulo}>
          <Link to={ruta}>{p.titulo}</Link>
        </h3>
        <Badge variant={varianteEstatus(p.estatus)}>{ETIQUETAS_ESTATUS_RECURSO[p.estatus]}</Badge>
        {p.decisionSinVer ? <span className={styles.nueva}>Decisión nueva</span> : null}
      </div>
      <p className={styles.meta}>
        {[
          p.tipo === 'recurso' ? 'Recurso' : 'Curso',
          p.estatus === 'en_revision' && p.fechaEnvio
            ? `Enviada el ${formatoFecha(p.fechaEnvio)}`
            : `Actualizada el ${formatoFecha(p.fechaActualizacion)}`,
        ].join(' · ')}
      </p>
      {decision && ESTADOS_CON_MOTIVO.has(p.estatus) && decision.motivo ? (
        <p className={styles.motivo}>
          <span className={styles.motivoEtiqueta}>
            {ETIQUETAS_ACCION_REVISION[decision.accion]}:
          </span>{' '}
          {decision.motivo}
        </p>
      ) : null}
    </Card>
  )
}
