# Formación

Centro de formación y biblioteca de recursos formativos
(`docs/diseno-desarrollo-formacion.md`). Público: se ve sin sesión, con el
`Encabezado`; con sesión, dentro del `AppShell` (`MarcoFormacion`).

**Estado:** incrementos 1 a 4: biblioteca de recursos, cursos (catálogo, ficha y visor), progreso del alumno y rutas de aprendizaje con recomendación.

- `PantallaRecursos` (`/recursos`) — diseño de la rama `plataforma-formativaV1`.
  Artículos (tipo texto) y recursos breves (el resto) vienen de
  `GET /api/recursos`; los filtros por habilidad, sección y búsqueda aplican a
  todo a la vez, en el cliente. Los cursos vienen de `GET /api/cursos`; la ruta
  la elige el recomendador (`SeccionRutas`).
- `PantallaRecurso` (`/recursos/:id`) — lectura del recurso según su tipo. PDF,
  videos y enlaces se abren aparte; el video siempre muestra su transcripción.
- `PantallaCurso` (`/cursos/:id`) — ficha previa a empezar (§5.3).
- `PantallaLeccion` (`/cursos/:id/lecciones/:idLeccion`) — visor con índice
  lateral, plegado en pantallas angostas. Reutiliza `CuerpoRecurso`.
- `PantallaRuta` (`/rutas/:id`) — ficha pública de una ruta, con el avance por
  curso si hay sesión.
- `SeccionRutas` — la "Ruta recomendada" de `/recursos`: la del recomendador con
  sus razones, o la destacada sin sesión, y las demás rutas.
- `useRutas.ts` — rutas públicas y de administración.
- `PantallaMiFormacion` (`/mi-formacion`, con sesión) — "¿Qué quieres
  fortalecer?" y, en dos pestañas, Mis cursos y recursos guardados
  (`?vista=guardados`).
- `BarraProgreso` — avance en un curso: Study Ink y Confirmed Green al
  terminar, siempre junto a su texto.
- `useProgreso.ts` — inscripción, marcas, reflexión, Mi formación,
  guardados, preferencias y rutas recomendadas. Todo cuelga de `['formacion', 'me']` y solo se pide con sesión.
- `Markdown` — subconjunto de markdown renderizado como elementos de React,
  nunca HTML crudo; solo enlaza direcciones https.
- `formacion.api.ts` y `useRecursos.ts` — cliente y hooks, públicos y de
  administración. El panel (`features/administracion`) los consume desde aquí.

Contenido inicial, desde `apps/api`: `npm run sembrar-recursos` (siete recursos),
luego `npm run sembrar-cursos` (tres cursos) y `npm run sembrar-rutas` (dos rutas). Solo insertan si la tabla está
vacía.

Convención de la carpeta: componentes, queries (TanStack Query) y estado de
esta feature viven aquí. Los componentes visuales consumen `components/ui/` y
los tokens de `DESIGN.md`.
