# Plataforma de Aprendizaje Colaborativo

Plataforma web para la formación de estudiantes en habilidades de trabajo
colaborativo. Antes de tocar código, lee
[`docs/concepto-producto.md`](docs/concepto-producto.md) (qué es el sistema,
por qué), [`docs/diseno-desarrollo-general.md`](docs/diseno-desarrollo-general.md)
(contrato compartido entre los tres subsistemas),
[`docs/diseno-desarrollo-nucleo.md`](docs/diseno-desarrollo-nucleo.md) (cómo
se construye el núcleo: cuentas, actividades, equipos, seguimiento,
evaluación e historial) y [`CONVENTIONS.md`](CONVENTIONS.md) (convenciones y
reglas de arquitectura) — son la fuente de verdad del proyecto.

## Requisitos

- Node.js en la versión fijada en [`.nvmrc`](.nvmrc) (`nvm use`)
- npm (viene con Node)

## Arranque rápido

```bash
git clone <url-del-repo>
cd plataforma-aprendizaje-colaborativo
nvm use
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

Esto levanta `apps/web` (Vite, http://localhost:5173) y `apps/api`
(Express, http://localhost:3001) en paralelo.

## Scripts disponibles (desde la raíz)

| Script                 | Qué hace                                          |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Levanta `apps/web` y `apps/api` en paralelo       |
| `npm run build`        | Compila cada workspace que tenga script `build`   |
| `npm run test`         | Corre las pruebas de los tres workspaces (Vitest) |
| `npm run lint`         | ESLint en los tres workspaces                     |
| `npm run typecheck`    | `tsc` en modo estricto en los tres workspaces     |
| `npm run format`       | Formatea todo el repo con Prettier                |
| `npm run format:check` | Verifica formato sin escribir (lo que corre CI)   |

CI (`.github/workflows/ci.yml`) corre `format:check`, `lint`, `typecheck` y
`test` en cada push/PR contra `main`.

## Estructura del repositorio

Monorepo con workspaces de npm:

```
apps/web        SPA con Vite (React + TypeScript)
apps/api        API REST con Express + TypeScript
packages/shared Tipos del dominio, importados por ambas apps
```

Dentro de `apps/web/src`, organización por features (no por tipo — ver
sección 3.5 de `docs/diseno-desarrollo-general.md`):

```
src/
├── app/            router, layout, providers
├── components/ui/  design system (fuente de verdad: apps/web/DESIGN.md)
├── features/       una carpeta por módulo de dominio (actividades, equipos...)
└── lib/            cliente HTTP y utilidades transversales
```

Dentro de `apps/api/src`, arquitectura en capas (ver sección 2.2 de
`docs/diseno-desarrollo-general.md`):

```
src/
├── routes/      capa HTTP
├── middleware/  autenticación, autorización, auditoría
├── services/    lógica de dominio, un módulo no toca los datos de otro
└── data/        acceso a datos
```

Convenciones de nombres: español para entidades de dominio, inglés para
código de infraestructura (ver [`CONVENTIONS.md`](CONVENTIONS.md)).

## Estilos y design system

Todo componente visual usa `apps/web/src/components/ui/` y los tokens de
[`apps/web/DESIGN.md`](apps/web/DESIGN.md), que a su vez implementa
[`apps/web/PRODUCT.md`](apps/web/PRODUCT.md) (contexto estratégico: usuarios,
personalidad de marca, anti-referencias). Nada de valores crudos ni
direcciones estéticas nuevas sin actualizar primero esa fuente de verdad.
