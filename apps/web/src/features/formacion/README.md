# Formación

Centro de formación y biblioteca de recursos formativos
(`docs/diseno-desarrollo-formacion.md`). Público: se ve sin sesión, con el
`Encabezado`; con sesión, dentro del `AppShell` (`MarcoFormacion`).

**Estado:** incrementos 1 y 2: biblioteca de recursos y cursos (catálogo, ficha y visor). Falta el progreso.

- `PantallaRecursos` (`/recursos`) — diseño de la rama `plataforma-formativaV1`.
  Artículos (tipo texto) y recursos breves (el resto) vienen de
  `GET /api/recursos`; los filtros por habilidad, sección y búsqueda aplican a
  todo a la vez, en el cliente. Los cursos vienen de `GET /api/cursos`; la ruta destacada aún es
  vista previa editorial (`ruta.fixtures.ts`).
- `PantallaRecurso` (`/recursos/:id`) — lectura del recurso según su tipo. PDF,
  videos y enlaces se abren aparte; el video siempre muestra su transcripción.
- `PantallaCurso` (`/cursos/:id`) — ficha previa a empezar (§5.3).
- `PantallaLeccion` (`/cursos/:id/lecciones/:idLeccion`) — visor con índice
  lateral, plegado en pantallas angostas. Reutiliza `CuerpoRecurso`.
- `Markdown` — subconjunto de markdown renderizado como elementos de React,
  nunca HTML crudo; solo enlaza direcciones https.
- `formacion.api.ts` y `useRecursos.ts` — cliente y hooks, públicos y de
  administración. El panel (`features/administracion`) los consume desde aquí.

Contenido inicial, desde `apps/api`: `npm run sembrar-recursos` (siete recursos)
y luego `npm run sembrar-cursos` (tres cursos). Solo insertan si la tabla está
vacía.

Convención de la carpeta: componentes, queries (TanStack Query) y estado de
esta feature viven aquí. Los componentes visuales consumen `components/ui/` y
los tokens de `DESIGN.md`.
