# Plataforma de Aprendizaje Colaborativo

Contexto obligado antes de cualquier tarea: lee `docs/concepto-producto.md`
(qué es el sistema, por qué), `docs/diseno-desarrollo-general.md` (contrato
compartido entre los tres subsistemas) y, si la tarea toca cuentas,
actividades, equipos, seguimiento, evaluación o historial,
`docs/diseno-desarrollo-nucleo.md` (cómo se construye ese subsistema).

## Stack

- Monorepo npm workspaces: apps/web (React 18+ TS, Vite), apps/api (Node + Express TS), packages/shared
- Estado: TanStack Query (servidor), Zustand (cliente, adopción diferida)
- Convenciones: español para entidades de dominio, inglés para infraestructura

## Reglas de arquitectura

- Ningún módulo accede a datos de otro directamente; todo pasa por la capa de
  servicios del módulo dueño (ver sección 3.4 de `docs/diseno-desarrollo-general.md`)
- El cliente nunca es la barrera de autorización; solo oculta acciones no
  disponibles (ver sección 3.5 de `docs/diseno-desarrollo-general.md`)
- Todo componente visual usa components/ui/ y los tokens de DESIGN.md; nada
  de valores crudos ni direcciones estéticas nuevas

## Antes de cada tarea

- Confirma en qué feature de apps/web/src/features/ o qué capa de apps/api
  cae la tarea
- Si toca una regla de negocio crítica (permisos, transiciones de estado,
  insignias), escribe la prueba junto con la implementación

## Contexto de diseño

- `apps/web/PRODUCT.md` — register (product), usuarios, propósito, personalidad
  de marca ("The Study Room": Linear + Notion, cálido solo en momentos de
  reconocimiento) y anti-referencias. Léelo antes de cualquier tarea de diseño.
- `apps/web/DESIGN.md` — sistema visual: paleta OKLCH (Study Ink primario,
  Apothecary Amber reservado a insignias/cierre de actividad), tipografía,
  elevación y componentes. Es la fuente de verdad citada en `tokens.css`.
- `apps/web/src/styles/tokens.css` implementa DESIGN.md; `components/ui/`
  consume esos tokens exclusivamente.
