import { useMemo, useState } from 'react'
import { Badge, Button, Card, Input } from '../../components/ui'
import styles from './CentroFormacion.module.css'

type Categoria =
  | 'Todos'
  | 'Comunicación'
  | 'Organización'
  | 'Decisiones'
  | 'Mejora continua'

interface Curso {
  id: string
  titulo: string
  descripcion: string
  categoria: Exclude<Categoria, 'Todos'>
  duracion: string
  nivel: string
  elemento: string
}

const CATEGORIAS: Categoria[] = [
  'Todos',
  'Comunicación',
  'Organización',
  'Decisiones',
  'Mejora continua',
]

const CURSOS: Curso[] = [
  {
    id: 'comunicacion-clara',
    titulo: 'Comunicación clara en equipos',
    descripcion: 'Expresa ideas, necesidades y acuerdos de forma breve, directa y respetuosa.',
    categoria: 'Comunicación',
    duracion: '30 min',
    nivel: 'Inicial',
    elemento: 'Interacción promotora',
  },
  {
    id: 'escucha-activa',
    titulo: 'Escucha activa y preguntas útiles',
    descripcion: 'Comprende antes de responder y formula preguntas que ayudan al grupo a avanzar.',
    categoria: 'Comunicación',
    duracion: '25 min',
    nivel: 'Inicial',
    elemento: 'Habilidades sociales',
  },
  {
    id: 'acuerdos-responsabilidades',
    titulo: 'Acuerdos y responsabilidades claras',
    descripcion: 'Convierte una conversación en compromisos concretos, visibles y realizables.',
    categoria: 'Organización',
    duracion: '35 min',
    nivel: 'Intermedio',
    elemento: 'Responsabilidad individual',
  },
  {
    id: 'metas-compartidas',
    titulo: 'Metas compartidas e interdependencia',
    descripcion: 'Diseña objetivos en los que cada contribución sea necesaria para el resultado común.',
    categoria: 'Organización',
    duracion: '40 min',
    nivel: 'Intermedio',
    elemento: 'Interdependencia positiva',
  },
  {
    id: 'desacuerdos-respeto',
    titulo: 'Resolver desacuerdos con respeto',
    descripcion: 'Separa a las personas del problema y transforma tensiones en decisiones útiles.',
    categoria: 'Decisiones',
    duracion: '35 min',
    nivel: 'Intermedio',
    elemento: 'Habilidades sociales',
  },
  {
    id: 'retrospectivas',
    titulo: 'Retrospectivas para mejorar',
    descripcion: 'Revisa cómo colaboró el grupo y acuerda un cambio pequeño para la siguiente ocasión.',
    categoria: 'Mejora continua',
    duracion: '30 min',
    nivel: 'Inicial',
    elemento: 'Procesamiento grupal',
  },
]

function FlechaIcono() {
  return (
    <svg className={styles.flecha} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 8h9.5M8 3.5 13 8l-5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LibroIcono() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4.75h10.25A2.75 2.75 0 0 1 18 7.5v11.75H7.75A2.75 2.75 0 0 1 5 16.5V4.75Zm0 11.75a2.75 2.75 0 0 1 2.75-2.75H18M8.5 8h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CentroFormacion() {
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('Todos')
  const [busqueda, setBusqueda] = useState('')

  const cursosVisibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')

    return CURSOS.filter((curso) => {
      const coincideCategoria =
        categoriaActiva === 'Todos' || curso.categoria === categoriaActiva
      const coincideBusqueda =
        !termino ||
        `${curso.titulo} ${curso.descripcion} ${curso.elemento}`
          .toLocaleLowerCase('es')
          .includes(termino)

      return coincideCategoria && coincideBusqueda
    })
  }, [busqueda, categoriaActiva])

  return (
    <div className={styles.centro}>
      <section className={styles.presentacion} aria-labelledby="titulo-centro-formacion">
        <div className={styles.presentacionTexto}>
          <p className={styles.eyebrow}>Centro de formación</p>
          <h1 id="titulo-centro-formacion">Mejora la forma en que colaboras</h1>
          <p className={styles.lede}>
            Cursos breves y recursos prácticos para comunicarte mejor, organizar acuerdos y
            resolver decisiones con otras personas.
          </p>
          <div className={styles.presentacionAcciones}>
            <Button onClick={() => document.querySelector('#catalogo-cursos')?.scrollIntoView()}>
              Explorar cursos
            </Button>
            <Button
              variant="secondary"
              onClick={() => document.querySelector('#ruta-destacada')?.scrollIntoView()}
            >
              Ver rutas de aprendizaje
            </Button>
          </div>
        </div>

        <Card className={styles.continuar}>
          <div className={styles.continuarCabecera}>
            <span className={styles.iconoCurso}>
              <LibroIcono />
            </span>
            <div>
              <p className={styles.sobretituloTarjeta}>Continúa aprendiendo</p>
              <h2>Comunicación clara en equipos</h2>
            </div>
          </div>
          <p className={styles.continuarDescripcion}>
            Te falta la práctica guiada y una reflexión breve.
          </p>
          <div
            className={styles.progreso}
            role="progressbar"
            aria-label="Progreso del curso Comunicación clara en equipos"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={40}
          >
            <span className={styles.progresoBarra} />
          </div>
          <div className={styles.continuarPie}>
            <span>40 % completado</span>
            <Button size="sm">Continuar curso</Button>
          </div>
        </Card>
      </section>

      <section id="ruta-destacada" className={styles.ruta} aria-labelledby="titulo-ruta">
        <div className={styles.rutaIntroduccion}>
          <p className={styles.eyebrow}>Ruta recomendada</p>
          <h2 id="titulo-ruta">Comunicación y confianza</h2>
          <p>
            Tres pasos para expresar ideas con claridad, escuchar con atención y ofrecer
            retroalimentación útil.
          </p>
          <button type="button" className={styles.enlaceTexto}>
            Ver ruta completa <FlechaIcono />
          </button>
        </div>

        <ol className={styles.rutaPasos}>
          <li>
            <span className={styles.numeroPaso}>01</span>
            <div>
              <strong>Comunicación clara en equipos</strong>
              <span>30 min · Inicial</span>
            </div>
          </li>
          <li>
            <span className={styles.numeroPaso}>02</span>
            <div>
              <strong>Escucha activa y preguntas útiles</strong>
              <span>25 min · Inicial</span>
            </div>
          </li>
          <li>
            <span className={styles.numeroPaso}>03</span>
            <div>
              <strong>Retroalimentación que ayuda a mejorar</strong>
              <span>35 min · Intermedio</span>
            </div>
          </li>
        </ol>
      </section>

      <section id="catalogo-cursos" className={styles.catalogo} aria-labelledby="titulo-catalogo">
        <div className={styles.catalogoCabecera}>
          <div>
            <p className={styles.eyebrow}>Catálogo</p>
            <h2 id="titulo-catalogo">Aprende a tu ritmo</h2>
            <p>Elige una habilidad y llévala a una situación real de colaboración.</p>
          </div>
          <div className={styles.busqueda}>
            <Input
              label="Buscar en el catálogo"
              type="search"
              placeholder="Ej. comunicación o acuerdos"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtros} aria-label="Filtrar cursos por habilidad">
          {CATEGORIAS.map((categoria) => (
            <button
              key={categoria}
              type="button"
              className={categoria === categoriaActiva ? styles.filtroActivo : styles.filtro}
              aria-pressed={categoria === categoriaActiva}
              onClick={() => setCategoriaActiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>

        {cursosVisibles.length ? (
          <div className={styles.cursosGrid} aria-live="polite">
            {cursosVisibles.map((curso) => (
              <Card key={curso.id} className={styles.curso}>
                <div className={styles.cursoMeta}>
                  <Badge variant="neutral">{curso.categoria}</Badge>
                  <span>{curso.duracion}</span>
                </div>
                <div className={styles.cursoContenido}>
                  <h3>{curso.titulo}</h3>
                  <p>{curso.descripcion}</p>
                </div>
                <div className={styles.cursoDetalle}>
                  <span>{curso.nivel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{curso.elemento}</span>
                </div>
                <button type="button" className={styles.enlaceTexto}>
                  Ver curso <FlechaIcono />
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.sinResultados} role="status">
            <h3>No encontramos cursos con esos criterios</h3>
            <p>Prueba con otra palabra o selecciona “Todos”.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBusqueda('')
                setCategoriaActiva('Todos')
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </section>

      <section className={styles.recursosBreves} aria-labelledby="titulo-recursos-breves">
        <div>
          <p className={styles.eyebrow}>Para usar en el momento</p>
          <h2 id="titulo-recursos-breves">Recursos breves</h2>
          <p>Guías reutilizables para llevar lo aprendido a una conversación real.</p>
        </div>
        <div className={styles.recursosEnlaces}>
          <button type="button">
            Guía para una reunión breve <FlechaIcono />
          </button>
          <button type="button">
            Plantilla de acuerdos claros <FlechaIcono />
          </button>
          <button type="button">
            Preguntas para una retrospectiva <FlechaIcono />
          </button>
        </div>
      </section>
    </div>
  )
}
