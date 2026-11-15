import { Link } from 'react-router-dom'
import { ETIQUETAS_ELEMENTO, ETIQUETAS_NIVEL_CURSO } from '@plataforma/shared'
import { AvisoError, Badge, Button, Card, IconoCargando } from '../../components/ui'
import { useSesion } from '../cuentas'
import { BarraProgreso } from './BarraProgreso'
import type { ConstanciaPropia, MiFormacion, ResumenRutaPublica } from './formacion.api'
import { IconoFlecha } from './iconos'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { PreferenciasRutas } from './PreferenciasRutas'
import { useMiFormacion, useMisConstancias, useRecomendaciones } from './useProgreso'
import { useRutasPublicas } from './useRutas'
import styles from './ListadoFormacion.module.css'

/*
 * Rutas de aprendizaje (/rutas): todas las rutas publicadas, como la sección de
 * Recursos pero completa. Es pública, como el resto del contenido formativo.
 * Con sesión, la recomendada va primero y cada tarjeta dice cuánto lleva la
 * persona; el avance sale de Mi formación y de sus constancias, sin pedir nada
 * nuevo a la API.
 */
export function PantallaRutasAprendizaje() {
  return (
    <MarcoFormacion titulo="Rutas de aprendizaje" seccionActiva="rutas-aprendizaje">
      <ListaRutas />
    </MarcoFormacion>
  )
}

interface Avance {
  completados: number
  enCurso: number
  total: number
}

function avanceDe(ruta: ResumenRutaPublica, formacion: MiFormacion | undefined): Avance | null {
  if (!formacion) return null
  const terminados = new Set(formacion.completados.map((c) => c.idCurso))
  const empezados = new Set(formacion.enCurso.map((c) => c.idCurso))
  // Los cursos retirados de la ruta no cuentan, como en la ficha de la ruta.
  const disponibles = ruta.cursos.filter((c) => c.disponible)
  return {
    completados: disponibles.filter((c) => terminados.has(c.idCurso)).length,
    enCurso: disponibles.filter((c) => empezados.has(c.idCurso)).length,
    total: disponibles.length,
  }
}

function ListaRutas() {
  const dentroDeApp = useDentroDeApp()
  const { usuario } = useSesion()
  const rutas = useRutasPublicas()
  const recomendaciones = useRecomendaciones()
  const miFormacion = useMiFormacion()
  const misConstancias = useMisConstancias()

  const recomendada = usuario ? recomendaciones.data?.recomendaciones[0] : undefined
  const personalizada = recomendaciones.data?.modo === 'personalizado'
  const lista = rutas.data?.rutas ?? []
  // La recomendada primero; las demás, en el orden del catálogo.
  const ordenadas = recomendada
    ? [
        ...lista.filter((r) => r.idRuta === recomendada.idRuta),
        ...lista.filter((r) => r.idRuta !== recomendada.idRuta),
      ]
    : lista
  const constanciaDe = new Map<string, ConstanciaPropia>()
  for (const k of misConstancias.data?.constancias ?? []) {
    if (k.idRuta) constanciaDe.set(k.idRuta, k)
  }

  return (
    <div
      className={[styles.centro, dentroDeApp ? styles.centroEnApp : null].filter(Boolean).join(' ')}
    >
      <div className={styles.introduccion}>
        {/* Dentro de la app el título de la pantalla ya dice "Rutas de aprendizaje". */}
        {dentroDeApp ? null : <h1>Rutas de aprendizaje</h1>}
        <p>
          Son conjuntos de recursos ordenados de manera progresiva para tener un mejor dominio o
          entendimiento. Al completar los cursos que incluye una ruta, se obtiene una constancia.
        </p>
      </div>

      {usuario ? <PreferenciasRutas /> : null}

      {rutas.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando rutas">
          <IconoCargando size={24} />
        </div>
      ) : rutas.isError ? (
        <div className={styles.estado}>
          <AvisoError mensaje={rutas.error.message} />
          <Button variant="secondary" size="sm" onClick={() => void rutas.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : ordenadas.length === 0 ? (
        <div className={styles.estado} role="status">
          <p>Todavía no hay rutas publicadas.</p>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Rutas de aprendizaje">
          {ordenadas.map((ruta) => (
            <li key={ruta.idRuta}>
              <TarjetaRuta
                ruta={ruta}
                recomendada={
                  ruta.idRuta === recomendada?.idRuta
                    ? personalizada
                      ? 'Recomendada para ti'
                      : 'Recomendada'
                    : null
                }
                avance={usuario ? avanceDe(ruta, miFormacion.data) : null}
                constancia={constanciaDe.get(ruta.idRuta)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TarjetaRuta({
  ruta,
  recomendada,
  avance,
  constancia,
}: {
  ruta: ResumenRutaPublica
  recomendada: string | null
  avance: Avance | null
  constancia: ConstanciaPropia | undefined
}) {
  const { derivado } = ruta
  const terminada = avance !== null && avance.total > 0 && avance.completados === avance.total
  const empezada = avance !== null && (avance.completados > 0 || avance.enCurso > 0)
  const porcentaje =
    avance && avance.total > 0 ? Math.floor((avance.completados * 100) / avance.total) : 0

  return (
    <Card className={styles.tarjeta}>
      <div className={styles.tarjetaMeta}>
        <span className={styles.insignias}>
          {recomendada ? <Badge variant="primary">{recomendada}</Badge> : null}
          {terminada ? (
            <Badge variant="success">
              <span aria-hidden="true">✓ </span>Completada
            </Badge>
          ) : empezada ? (
            <Badge variant="neutral">En curso</Badge>
          ) : null}
        </span>
        <span>
          {[
            `${derivado.numCursos} ${derivado.numCursos === 1 ? 'curso' : 'cursos'}`,
            `${derivado.duracionMin} min`,
          ].join(' · ')}
        </span>
      </div>

      <h3 className={styles.tarjetaTitulo}>
        <Link to={`/rutas/${ruta.idRuta}`}>{ruta.titulo}</Link>
      </h3>
      <p className={styles.descripcion}>{ruta.finalidad}</p>

      {derivado.elementos.length > 0 || derivado.nivelInicial ? (
        <p className={styles.meta}>
          {[
            derivado.nivelInicial
              ? `Desde nivel ${ETIQUETAS_NIVEL_CURSO[derivado.nivelInicial].toLowerCase()}`
              : null,
            derivado.elementos.length > 0
              ? `Trabaja: ${derivado.elementos.map((e) => ETIQUETAS_ELEMENTO[e.elemento]).join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}

      {avance && empezada ? (
        <div className={styles.avance}>
          <BarraProgreso
            porcentaje={porcentaje}
            completo={terminada}
            etiqueta={`Avance en ${ruta.titulo}`}
          />
          <p className={styles.meta}>
            {avance.completados} de {avance.total} {avance.total === 1 ? 'curso' : 'cursos'}{' '}
            terminados
          </p>
        </div>
      ) : null}

      <div className={styles.pie}>
        {constancia ? (
          <Link
            to={`/constancias/${constancia.folio}`}
            className={styles.enlaceAccion}
            aria-label={`Ver la constancia de ${ruta.titulo}`}
          >
            Ver constancia
          </Link>
        ) : (
          <span />
        )}
        <Link to={`/rutas/${ruta.idRuta}`} className={styles.enlaceAccion}>
          Ver la ruta <IconoFlecha className={styles.flecha} />
          <span className={styles.srOnly}>: {ruta.titulo}</span>
        </Link>
      </div>
    </Card>
  )
}
