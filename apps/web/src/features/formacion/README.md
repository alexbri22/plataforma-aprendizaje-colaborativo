# Formación

Centro de formación y biblioteca de recursos formativos
(`docs/diseno-desarrollo-formacion.md`). Público: se ve sin sesión, con el
`Encabezado`; con sesión, dentro del `AppShell` (`MarcoFormacion`).

**Estado:** incremento 1 (biblioteca de recursos).

- `PantallaRecursos` (`/recursos`) — diseño de la rama `plataforma-formativaV1`.
  Artículos (tipo texto) y recursos breves (el resto) vienen de
  `GET /api/recursos`; los filtros por habilidad, sección y búsqueda aplican a
  todo a la vez, en el cliente. Cursos y ruta destacada son vista previa
  editorial (`cursos.fixtures.ts`) hasta que exista la API de cursos
  (incremento 2).
- `PantallaRecurso` (`/recursos/:id`) — lectura del recurso según su tipo. PDF,
  videos y enlaces se abren aparte; el video siempre muestra su transcripción.
- `Markdown` — subconjunto de markdown renderizado como elementos de React,
  nunca HTML crudo; solo enlaza direcciones https.
- `formacion.api.ts` y `useRecursos.ts` — cliente y hooks, públicos y de
  administración. El panel (`features/administracion`) los consume desde aquí.

Contenido inicial: `npm run sembrar-recursos` desde `apps/api` carga siete
recursos publicados si la tabla está vacía.

Convención de la carpeta: componentes, queries (TanStack Query) y estado de
esta feature viven aquí. Los componentes visuales consumen `components/ui/` y
los tokens de `DESIGN.md`.
