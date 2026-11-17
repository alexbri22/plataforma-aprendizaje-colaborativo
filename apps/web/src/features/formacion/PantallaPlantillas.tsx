import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AREAS_HABILIDAD,
  ETIQUETAS_ARCHIVO,
  ETIQUETAS_AREA,
  type AreaHabilidad,
  type TipoArchivoRecurso,
  type TipoRecurso,
} from '@plataforma/shared'
import {
  AvisoError,
  Badge,
  Button,
  Card,
  IconoCargando,
  Input,
  Paginacion,
} from '../../components/ui'
import type { ResumenRecurso } from './formacion.api'
import { formatoDuracion } from './formato'
import { IconoFlecha } from './iconos'
import { MarcoFormacion } from './MarcoFormacion'
import { useDentroDeApp } from './marcoContexto'
import { useRecursosPublicos } from './useRecursos'
import { useValorDiferido } from './useValorDiferido'
import styles from './ListadoFormacion.module.css'

/*
 * Plantillas (/plantillas): los recursos publicados de tipo plantilla, con los
 * mismos filtros que el catálogo. Pública, como el resto del contenido
 * formativo. Si más adelante las plantillas se mudan dentro de Recursos (está
 * por acordarse el submenú), el catálogo ya tiene "Tipo → Plantillas".
 */
export function PantallaPlantillas() {
  return (
    <MarcoFormacion titulo="Plantillas" seccionActiva="plantillas">
      <ListaPlantillas />
    </MarcoFormacion>
  )
}

const TIPOS: readonly TipoRecurso[] = ['plantilla']
const POR_PAGINA = 9

type FiltroArea = 'todas' | AreaHabilidad

function ListaPlantillas() {
  const dentroDeApp = useDentroDeApp()
  const [area, setArea] = useState<FiltroArea>('todas')
  const [busqueda, setBusqueda] = useState('')
  const texto = useValorDiferido(busqueda.trim())
  // La página se recuerda junto con los filtros: si cambian, vuelve a la 1.
  const claveFiltros = `${area}|${texto}`
  const [pagina, setPagina] = useState({ clave: claveFiltros, numero: 1 })
  const numero = pagina.clave === claveFiltros ? pagina.numero : 1

  const consulta = useRecursosPublicos({
    tipos: TIPOS,
    area: area === 'todas' ? undefined : area,
    texto: texto || undefined,
    pagina: numero,
    porPagina: POR_PAGINA,
  })
  const hayFiltros = area !== 'todas' || texto !== ''

  return (
    <div
      className={[styles.centro, dentroDeApp ? styles.centroEnApp : null].filter(Boolean).join(' ')}
    >
      <div className={styles.introduccion}>
        {dentroDeApp ? null : <h1>Plantillas</h1>}
        <p>
          Formatos listos para usar en el trabajo en equipo: acuerdos, reuniones, retrospectivas y
          más. Descárgalos y adáptalos a tu actividad.
        </p>
      </div>

      <div className={styles.controles}>
        <div className={styles.buscador}>
          <Input
            label="Buscar plantillas"
            type="search"
            placeholder="Ej. acuerdos o retrospectiva"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className={styles.filtros} role="group" aria-label="Filtrar por habilidad">
          {(['todas', ...AREAS_HABILIDAD] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              className={valor === area ? styles.filtroActivo : styles.filtro}
              aria-pressed={valor === area}
              onClick={() => setArea(valor)}
            >
              {valor === 'todas' ? 'Todas' : ETIQUETAS_AREA[valor]}
            </button>
          ))}
        </div>
      </div>

      {consulta.isPending ? (
        <div className={styles.estado} role="status" aria-label="Cargando plantillas">
          <IconoCargando size={24} />
        </div>
      ) : consulta.isError ? (
        <div className={styles.estado}>
          <AvisoError mensaje={consulta.error.message} />
          <Button variant="secondary" size="sm" onClick={() => void consulta.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : consulta.data.recursos.length === 0 ? (
        <div className={styles.estado} role="status">
          <p>
            {hayFiltros
              ? 'No encontramos plantillas con esos criterios.'
              : 'Todavía no hay plantillas publicadas.'}
          </p>
          {hayFiltros ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setArea('todas')
                setBusqueda('')
              }}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul
            className={[styles.grid, consulta.isPlaceholderData ? styles.actualizando : null]
              .filter(Boolean)
              .join(' ')}
            aria-label="Plantillas"
          >
            {consulta.data.recursos.map((r) => (
              <li key={r.idRecurso}>
                <TarjetaPlantilla plantilla={r} />
              </li>
            ))}
          </ul>
          {/* Paginacion (DESIGN.md) cuenta páginas desde 0; la API desde 1. */}
          <Paginacion
            etiqueta="Páginas de plantillas"
            total={consulta.data.paginacion.total}
            tamano={consulta.data.paginacion.porPagina}
            pagina={consulta.data.paginacion.pagina - 1}
            onCambiar={(p) => setPagina({ clave: claveFiltros, numero: p + 1 })}
          />
        </>
      )}
    </div>
  )
}

function TarjetaPlantilla({ plantilla: r }: { plantilla: ResumenRecurso }) {
  // El formato del archivo, si lo tiene ("Word", "PDF"…); si no, es una
  // plantilla de solo texto.
  const formato = r.archivo
    ? (ETIQUETAS_ARCHIVO[r.archivo.tipo as TipoArchivoRecurso] ?? null)
    : null
  return (
    <Card className={styles.tarjeta}>
      <div className={styles.tarjetaMeta}>
        {r.area ? <Badge variant="neutral">{ETIQUETAS_AREA[r.area]}</Badge> : <span />}
        <span>{[formato, formatoDuracion(r.duracionMin)].filter(Boolean).join(' · ')}</span>
      </div>
      <h3 className={styles.tarjetaTitulo}>
        <Link to={`/recursos/${r.idRecurso}`}>{r.titulo}</Link>
      </h3>
      {r.resumen ? <p className={styles.descripcion}>{r.resumen}</p> : null}
      <div className={styles.pie}>
        <span />
        <Link to={`/recursos/${r.idRecurso}`} className={styles.enlaceAccion}>
          Ver plantilla <IconoFlecha className={styles.flecha} />
          <span className={styles.srOnly}>: {r.titulo}</span>
        </Link>
      </div>
    </Card>
  )
}
