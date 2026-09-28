# Equipos

Formación (según el estado de la función `formacion_equipos`), asignación,
reasignación e integrantes (ver sección 3.4 de `docs/diseno-desarrollo-general.md`
y capítulo 8 de `docs/diseno-desarrollo-nucleo.md`).

**Pantalla:** `PantallaEquipos`, en `/actividades/:id/equipos`. Lista los equipos
con sus integrantes y quiénes quedan sin equipo. Cada acción aparece solo si su
nombre está en las `capacidades` que calcula el servidor: crear o unirse
(`formar_equipos`, `elegir_equipo`), asignar con un selector por persona
(`asignar_integrantes`), editar (`editar_equipo`) y cerrar la formación
(`cerrar_formacion`). Los estados vacíos nombran su causa.

Convención de la carpeta: componentes, queries (TanStack Query) y stores
(Zustand, adopción diferida — sección 2.1) de esta feature viven aquí. Los
componentes visuales consumen `components/ui/` y los tokens de `DESIGN.md`;
no se estiliza desde cero dentro de la feature.
