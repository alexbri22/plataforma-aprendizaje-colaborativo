# Diseño de desarrollo - Carlos: formación y recursos para colaborar

Propuesta concisa para cursos, recursos y prácticas que desarrollan habilidades de comunicación, trabajo en equipo y colaboración

Estado: Propuesta depurada | Versión: 0.2 | Fecha: 30 de julio de 2026

## Resumen

Se diseño la capa formativa de la plataforma: un catálogo de microcursos y recursos para mejorar habilidades colaborativas, una forma controlada de crear y publicar contenido, y espacios grupal e individual donde ese aprendizaje se consulta y se aplica. La tesis se concentra en cómo estas herramientas apoyan los cinco elementos de Johnson y Johnson.

Enfoque recomendado: construir un Centro de formación parecido a la experiencia de cursos de Coursera, pero ligero: cursos breves de 20 a 45 minutos, organizados por habilidad, con una práctica aplicable al trabajo colaborativo. Esto es más realista y defendible que intentar construir un LMS completo.

### Tres componentes

| Componente                     | Qué resuelve                                                                 | Resultado para el usuario                                       |
| ------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Centro de formación            | Catálogo, rutas, visor y progreso de microcursos.                            | Aprende una habilidad concreta y sabe qué curso seguir después. |
| Biblioteca de recursos         | Textos, PDF, videos, enlaces, plantillas y ejercicios reutilizables.         | Encuentra materiales breves sin cursar un programa completo.    |
| Aplicación grupal e individual | Consulta, reflexión y práctica dentro de espacios ya creados por el sistema. | Conecta lo aprendido con una situación real de colaboración.    |

### Qué se eliminó de esta versión

- Creación, formación, membresía y administración de equipos.
- Permisos, identidad, registro y roles de cuenta.
- Estados y ciclo de vida de las actividades.
- Panel del docente y dashboard de desempeño del grupo.
- Insignias, reconocimientos, perfil, honoramiento y señales de medición.
- Calificaciones, métricas comparativas y recomendaciones calculadas por desempeño.

## 1. Frontera entre diferentes personas

El documento solo definemi parte, Carlos. Las referencias a A y C son contratos mínimos para que las partes puedan integrarse sin duplicar responsabilidades, correspondiente a Alejandro y a Ui Chul.

| Responsable | Propiedad principal                                                 | Relación con Carlos                                                                      |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Persona A   | Identidad, permisos, actividades, equipos, estados y panel docente. | Entrega el contexto existente; B muestra recursos o cursos sin administrar ese contexto. |
| Carlos      | Cursos, recursos, contenido formativo y experiencia de aplicación.  | Expone cursos publicados, recursos y progreso estrictamente formativo.                   |
| Persona C   | Insignias, honoramiento, perfil, señales y dashboard de desempeño.  | Puede consumir eventos formativos; B no calcula desempeño ni reconocimiento.             |

### 1.1 Regla práctica de decisión

- Si la pregunta es quién puede entrar, crear el equipo o cambiar la actividad, corresponde a Persona A.
- Si la pregunta es qué contenido ayuda a mejorar una habilidad y cómo se consume.
- Si la pregunta es cómo medir, reconocer o mostrar desempeño, corresponde a Persona C.

### 1.2 Integraciones permitidas

- A puede enlazar una versión publicada de un curso dentro de una actividad.
- B recibe identificadores de actividad, equipo o usuario ya autorizados; no decide membresía ni rol.
- B registra inicio, avance y finalización del curso, no una calificación.
- C puede recibir el evento curso.completado, pero decide si lo transforma en señal o reconocimiento.
- Ningún módulo accede directamente a las tablas de otro; se usan servicios del módulo dueño.

## 2. Propuesta de producto

### 2.1 Centro de formación

Es una sección global, separada de las actividades, donde cualquier usuario registrado puede descubrir formación sobre colaboración. Los cursos se organizan por habilidad y por los cinco elementos de Johnson y Johnson. Una actividad puede enlazarlos, pero el curso sigue siendo reutilizable e independiente.

### 2.2 Tres formatos de contenido

| Formato           | Duración orientativa | Estructura                                          | Uso                                                  |
| ----------------- | -------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Microcurso        | 20-45 min            | Objetivo, lecciones, práctica, reflexión y cierre.  | Desarrollar una habilidad completa.                  |
| Recurso breve     | 2-10 min             | Texto, PDF, video, enlace, plantilla o guía.        | Resolver una necesidad puntual.                      |
| Práctica aplicada | 10-30 min            | Instrucción, pasos, resultado esperado y reflexión. | Usar lo aprendido en el espacio grupal o individual. |

### 2.3 Experiencia esperada

- Explorar. La persona filtra por comunicación, coordinación, conflictos, responsabilidad o reflexión.
- Elegir. La ficha explica objetivo, duración, nivel, autor, estructura y práctica final.
- Aprender. El visor presenta contenido breve, ejemplos y recursos en un orden claro.
- Practicar. El curso propone un artefacto útil: acuerdo, guion, plantilla, protocolo o retrospectiva.
- Reflexionar. La persona registra qué aplicará; la reflexión no es una medición de desempeño.
- Reanudar o completar. El sistema guarda progreso por versión y muestra el siguiente contenido.

### 2.4 Definición de un curso del MVP

- Una habilidad principal y uno o dos elementos de Johnson y Johnson.
- Entre dos y cinco lecciones breves.
- Al menos un ejemplo situado en trabajo estudiantil.
- Una práctica aplicable y un recurso reutilizable.
- Una reflexión o comprobación no calificable.
- Criterio de finalización basado en contenido obligatorio completado.

## 3. Los cinco elementos de Johnson y Johnson

Mi tesis se vuelve demostrable cuando cada elemento tiene contenido, herramientas y una práctica concreta. No se pretende medir el desempeño: se diseña la experiencia que ayuda a aprender y aplicar el elemento.

| Elemento                                       | Contenido formativo                                     | Herramienta o práctica                                    | Resultado esperado                                            |
| ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Responsabilidades claras                       | Cómo definir compromisos y expectativas.                | Plantilla de responsabilidades y acuerdo de colaboración. | Cada persona comprende qué aporta y qué espera de los demás.  |
| Interdependencia positiva                      | Metas comunes, dependencias y éxito compartido.         | Mapa de dependencias y ejercicio de meta común.           | El equipo identifica por qué necesita coordinar aportes.      |
| Responsabilidad individual y grupal            | Cumplimiento, apoyo mutuo y seguimiento sin vigilancia. | Reflexión personal y revisión grupal no calificable.      | Se diferencia el aporte personal del resultado compartido.    |
| Interacción promotora                          | Escucha, comunicación, feedback y reuniones.            | Guion de feedback, escucha activa y agenda de reunión.    | La interacción produce comprensión, ayuda y decisiones.       |
| Procesamiento del grupo y habilidades sociales | Conflictos, decisiones, retrospectiva y mejora.         | Protocolo de desacuerdos y plantilla de retrospectiva.    | El grupo acuerda una mejora concreta para el siguiente ciclo. |

### 3.1 Principios pedagógicos

- Una habilidad por curso. Evita contenido general que no se traduce en una acción.
- Ejemplos reales. Los casos se sitúan en trabajos de estudiantes, no en empresas genéricas.
- Práctica antes de completar. El usuario produce o ensaya algo que puede utilizar.
- Reflexión sin calificación. El curso invita a pensar sin convertir la respuesta en una nota o ranking.
- Contenido accesible. Texto claro, transcripción, alternativa visual y navegación por teclado.

## 4. Catálogo inicial de microcursos

El catálogo inicial debe ser pequeño y coherente. Diez cursos bien diseñados son más útiles para el MVP que una biblioteca extensa sin estructura. Cada curso termina en un resultado aplicable.

| Curso propuesto                          | Área              | Elemento principal                  | Práctica final                                            |
| ---------------------------------------- | ----------------- | ----------------------------------- | --------------------------------------------------------- |
| Comunicación clara en equipos            | Comunicación      | Interacción promotora               | Convertir un mensaje ambiguo en una petición clara.       |
| Escucha activa y preguntas útiles        | Comunicación      | Interacción promotora               | Aplicar una guía de escucha en una conversación.          |
| Retroalimentación que ayuda a mejorar    | Comunicación      | Interacción y habilidades sociales  | Redactar feedback específico, respetuoso y accionable.    |
| Acuerdos y responsabilidades claras      | Organización      | Responsabilidades                   | Crear un acuerdo breve con compromisos observables.       |
| Metas compartidas e interdependencia     | Trabajo en equipo | Interdependencia positiva           | Diseñar una meta y un mapa de aportes conectados.         |
| Responsabilidad sin vigilancia           | Trabajo en equipo | Responsabilidad individual y grupal | Elegir una forma transparente de informar avances.        |
| Reuniones breves que producen decisiones | Coordinación      | Interacción promotora               | Preparar agenda, roles temporales y registro de acuerdos. |
| Resolver desacuerdos con respeto         | Conflictos        | Habilidades sociales                | Aplicar un protocolo a un caso de desacuerdo.             |
| Tomar decisiones en conjunto             | Coordinación      | Interdependencia positiva           | Comparar alternativas y documentar una decisión.          |
| Retrospectivas para mejorar              | Reflexión         | Procesamiento del grupo             | Realizar una retrospectiva y definir una mejora.          |

### 4.1 Rutas sugeridas

| Ruta                              | Cursos                                                         | Uso recomendado                                               |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Comunicación y confianza          | Comunicación clara + escucha activa + retroalimentación.       | Equipos con mensajes confusos o dificultad para dar feedback. |
| Organización y corresponsabilidad | Acuerdos + metas compartidas + responsabilidad sin vigilancia. | Equipos que necesitan coordinar mejor sus aportes.            |
| Decisiones y desacuerdos          | Reuniones + resolución de conflictos + decisiones conjuntas.   | Equipos estancados o con opiniones contrapuestas.             |
| Mejora continua                   | Retroalimentación + responsabilidad + retrospectivas.          | Equipos que quieren revisar y ajustar su forma de colaborar.  |

Frontera con Persona C: estas rutas son editoriales y pueden elegirse manualmente. Si en el futuro se recomienda una ruta a partir de señales de desempeño, Persona C calcula la señal y yo únicamente entrego el contenido etiquetado.

## 5. Estructura de cada microcurso

### 5.1 Plantilla recomendada

| Bloque             | Propósito                                   | Ejemplo                                              |
| ------------------ | ------------------------------------------- | ---------------------------------------------------- |
| 1. Situación       | Presentar un problema reconocible.          | Un mensaje provoca confusión sobre quién hará qué.   |
| 2. Concepto        | Explicar una idea en lenguaje breve.        | Una petición clara incluye contexto, acción y fecha. |
| 3. Ejemplo         | Contrastar una aplicación débil y una útil. | Antes/después de un mensaje de coordinación.         |
| 4. Práctica guiada | Aplicar la habilidad con pasos.             | Reescribir el mensaje usando una plantilla.          |
| 5. Recurso         | Dejar una herramienta reutilizable.         | Guía descargable de comunicación clara.              |
| 6. Reflexión       | Conectar la habilidad con la experiencia.   | ¿Qué cambiarás en tu siguiente conversación?         |
| 7. Cierre          | Resumir y sugerir aplicación.               | Tres ideas clave y enlace para usar la práctica.     |

### 5.2 Tipos de lección

- Lectura breve con ejemplos y puntos clave.
- Video externo o alojado con subtítulos y transcripción.
- Caso práctico con opciones y retroalimentación explicada.
- Plantilla descargable o editable.
- Ejercicio de aplicación grupal o individual.
- Reflexión privada no calificable.

### 5.3 Ficha visible antes de iniciar

- Título, resumen y habilidad que desarrolla.
- Objetivos observables y elementos de Johnson y Johnson.
- Duración estimada, nivel y número de lecciones.
- Autor o responsable del contenido y fecha de actualización.
- Recursos incluidos y requisitos de accesibilidad.
- Resultado práctico que la persona obtendrá.

## 6. Catálogo y administración de recursos

### 6.1 Diferencia entre curso y recurso

Un curso tiene secuencia y progreso; un recurso es una pieza independiente que puede usarse dentro de varios cursos o consultarse directamente. Separarlos evita duplicar archivos y permite mantener una biblioteca reutilizable.

### 6.2 Tipos de recurso

| Tipo      | Metadatos mínimos                               | Validación especial                             |
| --------- | ----------------------------------------------- | ----------------------------------------------- |
| Texto     | Título, resumen, contenido, autor y fuentes.    | Longitud y enlaces seguros.                     |
| PDF       | Título, descripción, archivo, autor y licencia. | Tipo/tamaño y alternativa accesible.            |
| Video     | Título, duración, URL/archivo y autor.          | Subtítulos o transcripción.                     |
| Enlace    | Título, descripción, destino y fuente.          | Protocolo permitido y disponibilidad.           |
| Plantilla | Propósito, instrucciones, archivo o formato.    | Editable y comprensible sin contexto adicional. |
| Práctica  | Objetivo, duración, pasos y resultado.          | No calificable dentro de B.                     |

### 6.3 Autoría y moderación

- Crear borrador. Cualquier usuario activo puede proponer un curso o recurso.
- Validar mínimos. El sistema revisa campos, estructura, fuentes y accesibilidad declarada.
- Enviar a revisión. El contenido se congela mientras se evalúa.
- Revisar. Administrador aprueba, solicita cambios o rechaza con una razón.
- Publicar. Solo una versión aprobada aparece en catálogo.
- Actualizar. Los cambios importantes crean una versión nueva.
- Retirar. Administrador detiene nuevas consultas cuando existe un problema de calidad, seguridad o derechos.

### 6.4 Criterios mínimos de publicación

- Propósito formativo claro y relacionado con colaboración.
- Fuentes, autoría y derechos de uso identificados.
- Contenido completo, coherente y sin enlaces rotos.
- Lenguaje respetuoso, comprensible y sin estereotipos.
- Alternativas accesibles para contenido visual o audiovisual.
- Una práctica o uso concreto; no solo información general.
- Sin datos personales, publicidad ni archivos ejecutables.

## 7. Espacio grupal e individual

yo no creo equipos ni decido quién pertenece a ellos. Diseño qué materiales y prácticas formativas aparecen dentro del espacio que Persona A ya habilitó.

### 7.1 Espacio grupal

- Recursos compartidos. Lista de guías, plantillas y materiales formativos asociados al trabajo del equipo.
- Práctica en equipo. Actividad breve tomada de un curso, como redactar un acuerdo o hacer una retrospectiva.
- Reflexión compartida. Registro cualitativo de lo aprendido y de una mejora que quieren probar.
- Curso relacionado. Acceso directo a una versión publicada recomendada o enlazada desde la actividad.

### 7.2 Espacio individual

- Mis cursos. Cursos iniciados, siguiente lección y cursos completados.
- Recursos guardados. Materiales que la persona quiere consultar después.
- Reflexión personal. Notas privadas sobre cómo aplicará una habilidad.
- Formación vinculada. Cursos enlazados desde una actividad, sin mostrar calificación, rango o desempeño.

### 7.3 Límites explícitos

- No asignar integrantes, roles internos, responsabilidades académicas o permisos.
- No mostrar dashboard, puntuaciones, comparación entre personas ni alertas de desempeño.
- No otorgar insignias ni modificar el perfil del estudiante.
- No convertir reflexiones o prácticas en calificaciones.
- No definir cuándo una actividad abre, cierra o se archiva.

## 8. Requisitos funcionales del MVP

| ID     | Requisito                                                                     | Aceptación resumida                                          |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| CAT-01 | Buscar y filtrar cursos publicados por habilidad, elemento, nivel y duración. | Nunca expone borradores o contenido retirado.                |
| CAT-02 | Consultar una ficha completa antes de iniciar.                                | Muestra objetivo, duración, autor, estructura y práctica.    |
| CUR-01 | Consumir módulos y lecciones en orden comprensible.                           | Permite navegar, reanudar y distinguir obligatorio/opcional. |
| CUR-02 | Guardar progreso por usuario y versión.                                       | La actualización es idempotente y completar fija fecha.      |
| CUR-03 | Guardar una reflexión no calificable.                                         | Solo la persona la consulta salvo decisión futura explícita. |
| REC-01 | Consultar recursos independientes y reutilizables.                            | El recurso conserva fuente, licencia, tipo y accesibilidad.  |
| REC-02 | Guardar un recurso en la biblioteca personal.                                 | Guardar no inicia un curso ni genera medición.               |
| AUT-01 | Crear y editar borradores de curso o recurso.                                 | Solo autor y revisión autorizada acceden al borrador.        |
| MOD-01 | Aprobar, pedir cambios, rechazar o retirar con motivo.                        | Cada decisión conserva actor, fecha y razón.                 |
| VER-01 | Mantener inmutable una versión publicada.                                     | Editar crea borrador de una versión posterior.               |
| ESP-01 | Mostrar recursos y prácticas en el espacio grupal autorizado.                 | B recibe el contexto autorizado; no administra el equipo.    |
| ESP-02 | Mostrar cursos, recursos y reflexión en el espacio individual.                | No incluye perfil, insignias ni desempeño.                   |
| INT-01 | Exponer un curso publicado para enlazarlo desde una actividad.                | La referencia identifica una versión concreta.               |

### 8.1 Flujos principales

| Actor                 | Flujo mínimo                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| Estudiante            | Explora -> abre ficha -> inicia -> aprende -> practica -> reflexiona -> completa.   |
| Autor                 | Crea borrador -> estructura -> previsualiza -> envía -> corrige si se solicita.     |
| Administrador         | Abre cola -> revisa criterios -> decide -> publica o retira.                        |
| Contexto de actividad | Busca versión publicada -> enlaza -> abre curso -> consulta finalización formativa. |

## 9. Modelo técnico acotado

### 9.1 Módulo Formación

Se propone un módulo nuevo llamado Formación. Es dueño de cursos, recursos, versiones, revisión y progreso formativo. Los espacios grupal e individual consumen este módulo; no duplican sus datos.

| Entidad            | Responsabilidad                                                   |
| ------------------ | ----------------------------------------------------------------- |
| AreaHabilidad      | Comunicación, organización, conflictos, coordinación o reflexión. |
| Curso              | Identidad estable, autor y versión publicada vigente.             |
| VersionCurso       | Título, objetivos, nivel, duración, elementos y estado editorial. |
| ModuloCurso        | Agrupa lecciones y define orden.                                  |
| LeccionCurso       | Contenido o práctica, orden y obligatoriedad.                     |
| RecursoFormativo   | Pieza reutilizable con tipo, fuente, licencia y accesibilidad.    |
| RutaFormativa      | Selección editorial ordenada de cursos.                           |
| RevisionContenido  | Decisión, motivo, checklist, revisor y fecha.                     |
| InscripcionCurso   | Usuario, versión, origen, inicio y finalización.                  |
| ProgresoLeccion    | Lección completada y fecha por inscripción.                       |
| ReflexionFormativa | Nota privada opcional vinculada a curso o práctica.               |

### 9.2 Estados editoriales

BORRADOR -> EN_REVISION -> PUBLICADO. Desde EN_REVISION también puede pasar a CAMBIOS_SOLICITADOS o RECHAZADO. Un contenido PUBLICADO puede pasar a RETIRADO. Editar una versión publicada crea una nueva versión en BORRADOR.

### 9.3 API principal propuesta

| Método | Ruta                                    | Propósito                        |
| ------ | --------------------------------------- | -------------------------------- |
| GET    | /cursos                                 | Catálogo publicado con filtros.  |
| GET    | /cursos/:id                             | Ficha y versión publicada.       |
| POST   | /cursos                                 | Crear borrador.                  |
| PATCH  | /versiones-curso/:id                    | Editar borrador propio.          |
| POST   | /versiones-curso/:id/enviar-revision    | Validar y congelar envío.        |
| POST   | /versiones-curso/:id/inscripciones      | Iniciar o recuperar inscripción. |
| PUT    | /inscripciones/:id/lecciones/:leccionId | Actualizar progreso.             |
| GET    | /recursos                               | Buscar recursos publicados.      |
| POST   | /recursos/:id/guardar                   | Guardar recurso propio.          |
| GET    | /me/formacion                           | Cursos y recursos del usuario.   |
| GET    | /admin/revisiones-contenido             | Cola de revisión.                |
| POST   | /admin/versiones-curso/:id/decision     | Registrar decisión editorial.    |

### 9.4 Ubicación en el monorepo

- apps/web/src/features/formacion/: catálogo, visor, progreso, autoría y biblioteca.
- apps/web/src/features/administracion/: cola y revisión de contenido.
- apps/web/src/features/seguimiento/: solo composición de recursos/prácticas en espacios existentes.
- apps/api/src/routes, services y data/: capas del módulo Formación.
- packages/shared/: tipos de curso, recurso, versión, elemento y progreso.

## 10. Interfaz, accesibilidad y seguridad

### 10.1 Dirección visual

- Lectura calmada, contenido primero y ancho cómodo.
- Catálogo basado en títulos, objetivos y filtros; no en tarjetas de métricas.
- Progreso sobrio con texto y porcentaje, sin rachas, puntos o confeti.
- Study Ink para acciones; Confirmed Green para finalización.
- Apothecary Amber no se usa al completar un curso: está reservado a insignias y cierre de actividad.

### 10.2 Accesibilidad WCAG 2.1 AA

- Navegación completa por teclado y foco visible.
- Encabezados semánticos y estado actual anunciado en el índice del curso.
- Subtítulos o transcripción para video y alternativa textual para imágenes.
- PDF accesible o alternativa HTML equivalente cuando sea posible.
- Contraste AA; el estado nunca depende solo de color.
- Errores de autoría asociados al campo y explicados con texto.

### 10.3 Seguridad y calidad

- Autorización en servidor para borradores, revisión y progreso propio.
- Tipos y tamaños de archivo permitidos; URLs con protocolos seguros.
- Fuentes y derechos de uso obligatorios.
- Versiones publicadas inmutables y retiro con motivo.
- Auditoría de envío, decisión, publicación y retiro sin copiar reflexiones privadas.

## 11. Pruebas y plan de implementación

### 11.1 Pruebas críticas

| Prueba        | Regla protegida                                                  |
| ------------- | ---------------------------------------------------------------- |
| Catálogo      | Solo devuelve contenido PUBLICADO y no retirado.                 |
| Autoría       | Un usuario no puede editar borradores ajenos.                    |
| Transiciones  | Solo actores y estados válidos cambian la publicación.           |
| Versiones     | Una publicada no se modifica directamente.                       |
| Progreso      | Inscripción y finalización son idempotentes.                     |
| Privacidad    | Reflexión y biblioteca personal no se exponen a otros.           |
| Integración A | B acepta solo contexto previamente autorizado.                   |
| Integración C | El evento de finalización no crea insignia ni señal dentro de B. |
| Accesibilidad | Catálogo, visor y editor son operables con teclado y lector.     |

### 11.2 Incrementos recomendados

| Incremento             | Entrega demostrable                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| B1. Contenido base     | Áreas, seis microcursos iniciales y recursos administrados.             |
| B2. Catálogo y visor   | Búsqueda, ficha, módulos, lecciones y accesibilidad.                    |
| B3. Progreso personal  | Inscripción, reanudación, finalización y Mis cursos.                    |
| B4. Autoría y revisión | Borradores, mínimos, cola, decisión y versiones.                        |
| B5. Aplicación         | Recursos y prácticas visibles en espacios grupal/individual.            |
| B6. Integración        | Referencia desde actividad y evento de finalización para otros módulos. |

### 11.3 No-metas

- Construir un LMS completo, pagos, certificados oficiales o clases en vivo.
- Crear o administrar actividades y equipos.
- Calificar prácticas o reflexiones.
- Medir desempeño grupal o comparar estudiantes.
- Otorgar insignias, actualizar perfiles o calcular señales.
- Recomendar automáticamente cursos a partir de desempeño en el MVP.

## 12. Administración de la plataforma

El administrador es el rol de soporte y calibración de la plataforma. No participa en el trabajo colaborativo ni lo supervisa: mantiene las cuentas en funcionamiento, publica y retira el contenido formativo y ajusta los parámetros del sistema de insignias. Su alcance es deliberadamente acotado a esas tres áreas, tal como lo fija el concepto de producto (sección 2.5) y la matriz de permisos del documento general (7.2), y este capítulo solo detalla cómo se diseñan.

Principio rector: el administrador cuida las condiciones de la plataforma, no lo que ocurre dentro de las actividades. No puede leer el espacio de un equipo, modificar una calificación, retirar una insignia ya otorgada ni intervenir contenido generado por usuarios. Cualquier corrección de ese tipo es responsabilidad del organizador de la actividad.

### 12.1 Alcance, límites y módulo dueño

Cada área del administrador es una superficie de la interfaz y no un módulo de datos propio. El panel es cliente de la capa de servicios del módulo dueño y nunca escribe directamente sobre sus tablas (documento general, 3.4).

| Área                  | Qué puede hacer                                                                                                  | Qué queda fuera                                                                               | Módulo dueño                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| Cuentas               | Ver la lista de usuarios, activar o desactivar una cuenta y restablecer una contraseña como respaldo de soporte. | Ver o editar el perfil, las actividades o las contribuciones de un usuario; eliminar cuentas. | Núcleo (Cuentas), a cargo de Persona A. |
| Contenido formativo   | Alta, edición y retiro de recursos y cursos; decidir sobre los borradores enviados a revisión.                   | Editar contenido generado en actividades; calificar reflexiones o prácticas.                  | Formación, mi módulo.                   |
| Umbrales de insignias | Ajustar los requisitos mínimos de otorgamiento y los puntos de cada nivel de la escala.                          | Crear, renombrar o retirar categorías de insignia; otorgar o retirar insignias.               | Insignias, a cargo de Persona C.        |

- Es además usuario. La cuenta de administrador conserva las capacidades de un usuario. Dentro de una actividad actúa solo con el rol que tenga en ella; ser administrador no le da ninguna capacidad adicional sobre esa actividad.
- El catálogo de seis insignias es fijo. Crear o retirar categorías rompería la comparabilidad del acumulado entre actividades, por lo que no forma parte de la administración.
- Sin intervención sobre contenido de usuarios. Retirar contenido formativo no equivale a moderar actividades: el contenido formativo es público y editorial, sin relación con equipos ni evaluaciones.

### 12.2 Gestión de cuentas

Es el área más simple y la primera que se entrega. Los tres casos de uso son operaciones sobre el estado de una cuenta, expuestas por el módulo de Cuentas del núcleo (nucleo, 6.5).

| Acción                 | Comportamiento                                                                                                                    | Regla protegida                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ver cuentas            | Lista con nombre, correo y estado (activa o desactivada), con búsqueda por nombre o correo y filtro por estado.                   | El correo se muestra solo aquí y nunca a otros usuarios.                                                   |
| Desactivar o activar   | Cambia el estado de la cuenta. Al desactivar se cierran las sesiones abiertas de la persona.                                      | Conserva todas sus contribuciones e insignias; no modifica sus membresías (independientes de la cuenta).   |
| Restablecer contraseña | El administrador fija una nueva contraseña (mínimo de 8 caracteres, igual que el registro) y se cierran las sesiones del usuario. | Es la vía de respaldo; el autoservicio por correo depende de P-24 y, cuando exista, será la vía principal. |

- Confirmación explícita. Desactivar una cuenta pide confirmación con el nombre de la persona afectada, porque le quita el acceso de inmediato.
- Sin autobloqueo. Un administrador no puede desactivar su propia cuenta ni la del último administrador activo; el servidor rechaza la operación (propuesta, por validar).
- Contraseña fuera de pantalla. La nueva contraseña no se muestra de nuevo tras guardarse ni se registra; se comunica a la persona por un canal externo, con la limitación de verificación de identidad ya descrita en el núcleo (6.1).
- Primer administrador. La cuenta inicial se crea fuera de la interfaz (semilla o script de despliegue); no existe pantalla para promover usuarios a administrador en el MVP.

### 12.3 Gestión de contenido formativo

Es la parte del panel que conecta con el Centro de formación de los capítulos anteriores. El administrador publica y retira contenido; nunca lo califica ni lo enlaza a una actividad.

| Función                | Descripción                                                                                                                                             | Vínculo con capítulos previos                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Biblioteca de recursos | Subir, editar, ordenar y retirar recursos (texto, PDF, video, enlace, plantilla, práctica) en las secciones públicas Qué es colaborar y Cómo colaborar. | Tipos y metadatos de 6.2; criterios mínimos de 6.4. Requisito REC-01. |
| Cursos                 | Crear y editar los microcursos del catálogo inicial, ordenar rutas y publicar una versión.                                                              | Estructura de 5.1 y catálogo de 4; versión inmutable (VER-01).        |
| Cola de revisión       | Listar los borradores enviados, ver el checklist de criterios y decidir: aprobar, solicitar cambios, rechazar o retirar, siempre con motivo.            | Flujo de 6.3 y estados de 9.2; requisito MOD-01.                      |

- Publicar es una decisión con registro. Cada decisión conserva actor, fecha, motivo y checklist en RevisionContenido; el retiro detiene nuevas consultas sin borrar el registro ni el progreso de quien ya cursó esa versión.
- Vista previa antes de publicar. El administrador ve el contenido exactamente como lo verá el usuario, con los mismos requisitos de accesibilidad (subtítulos, transcripción, alternativas textuales).
- Público sin sesión, autoría con sesión. Las secciones formativas introductorias se leen sin cuenta; toda acción del panel exige sesión de administrador verificada en el servidor.
- Archivos acotados. Solo se aceptan los tipos y tamaños definidos para el MVP (decisión abierta en 13.3); se rechazan ejecutables y enlaces con protocolos no seguros.

Dependencia de alcance: el documento general y el concepto de producto definen el alta de recursos por el administrador. La cola de revisión de borradores propuestos por usuarios (6.3) es una ampliación de esa base y solo se activa si el equipo aprueba la opción B de 13.1. El campo de estatus reservado en recursos_formativos evita migrar el esquema si se aprueba después.

### 12.4 Umbrales del sistema de insignias

El administrador calibra dos familias de parámetros. Ambas son decisiones de calibración y no de contenido: el significado de las insignias, su catálogo y su forma de otorgarse no cambian.

| Parámetro             | Valor actual                                       | Qué controla                                                                |
| --------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| Participantes mínimos | 4 (propuesto)                                      | Tamaño mínimo de una actividad para habilitar el otorgamiento de insignias. |
| Duración mínima       | 4 semanas (propuesto)                              | Tiempo mínimo entre la creación y el cierre de la actividad.                |
| Puntos por nivel      | Bronce 3, Plata 8, Oro 18, Platino 35, Diamante 60 | Puntos acumulados desde los que se alcanza cada uno de los cinco niveles.   |

- Validación de la escala. Los cinco umbrales son enteros positivos y estrictamente crecientes; el servidor rechaza cualquier combinación que no lo sea, y el formulario explica cuál umbral la rompe.
- Los requisitos se aplican hacia adelante. Un cambio en participantes o duración mínima solo afecta a actividades que aún no han abierto su ritual de reconocimiento; las ya cerradas conservan las insignias otorgadas.
- Los niveles se recalculan al leer. El nivel de una persona se deriva de sus puntos acumulados, por lo que cambiar un umbral cambia el nivel mostrado a todos sin modificar ningún otorgamiento. La pantalla advierte cuántas personas cambiarían de nivel antes de guardar.
- Almacenamiento. La escala vive hoy en el código compartido (NIVELES en packages/shared). Al habilitar este ajuste se materializa la relación niveles_insignia con esos valores como semilla, y los requisitos mínimos pasan a una fila de configuración de insignias; la API de Insignias los lee de ahí en lugar de constantes (documento general, 4.4).
- Restaurar valores por defecto. Una acción devuelve todos los parámetros a los valores de referencia, con confirmación.
- Trazabilidad. Cada cambio guarda quién lo hizo, cuándo, y el valor anterior y el nuevo. Es un registro administrativo distinto del historial de participación, que solo cubre lo ocurrido dentro de actividades (documento general, 8.4).

### 12.5 Pantallas y navegación

El panel es una superficie de trabajo densa y sobria, del mismo tipo que el resto de la interfaz de producto: tablas, estados con texto, formularios cortos. Sigue los tokens de DESIGN.md y no usa Apothecary Amber, reservado a insignias y cierre de actividad.

| Pantalla         | Ruta              | Contenido principal                                                                                                                                                 |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuentas          | /admin/cuentas    | Tabla de usuarios con estado, búsqueda y filtro; acciones de fila para activar/desactivar y restablecer contraseña. Ya implementada la lista y el restablecimiento. |
| Contenido        | /admin/contenido  | Biblioteca de recursos y cursos con estado editorial, orden y acciones de editar, previsualizar y retirar.                                                          |
| Cola de revisión | /admin/revisiones | Borradores enviados, checklist de criterios de publicación y decisión con motivo obligatorio.                                                                       |
| Umbrales         | /admin/insignias  | Formulario con los dos requisitos y la escala de cinco niveles, con vista previa del efecto y restauración.                                                         |

- Acceso solo por sesión de administrador. El enlace del panel aparece en el encabezado únicamente para administradores. Esto es solo una ayuda de interfaz: la autorización real la aplica el servidor en cada endpoint (documento general, 3.5).
- Acciones destructivas o de alto efecto siempre confirman. Desactivar, retirar contenido, rechazar, restaurar umbrales.
- Estados que no dependen del color. Activa/desactivada y los estados editoriales se muestran con texto e icono, no solo con color (WCAG 2.1 AA, 10.2).
- Estados de pantalla completos. Cada tabla contempla carga, vacío, error de red y permisos insuficientes con mensaje explicado.

### 12.6 API administrativa

Todos los endpoints exigen sesión de administrador, verificada en el servidor antes de ejecutar cualquier lógica. Los de cuentas y umbrales los expone el módulo dueño para que el panel no escriba sobre sus tablas.

| Método | Ruta                                | Propósito                                                     | Estado                  |
| ------ | ----------------------------------- | ------------------------------------------------------------- | ----------------------- |
| GET    | /admin/usuarios                     | Lista de cuentas con su estado.                               | Implementado            |
| POST   | /admin/usuarios/:id/contrasena      | Restablece la contraseña y cierra sesiones.                   | Implementado            |
| PATCH  | /admin/usuarios/:id                 | Activa o desactiva la cuenta; al desactivar elimina sesiones. | Especificado, pendiente |
| GET    | /admin/revisiones-contenido         | Cola de revisión.                                             | Especificado en 9.3     |
| POST   | /admin/versiones-curso/:id/decision | Registra la decisión editorial con motivo.                    | Especificado en 9.3     |
| POST   | /admin/recursos                     | Alta de recurso publicado por el administrador.               | Nuevo, propuesto        |
| PATCH  | /admin/recursos/:id                 | Editar, reordenar o retirar un recurso.                       | Nuevo, propuesto        |
| GET    | /admin/umbrales-insignias           | Lee requisitos y escala vigentes.                             | Nuevo, propuesto        |
| PUT    | /admin/umbrales-insignias           | Reemplaza los parámetros tras validar la escala.              | Nuevo, propuesto        |

### 12.7 Requisitos funcionales y pruebas

| ID     | Requisito                                                      | Aceptación resumida                                                                                      |
| ------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ADM-01 | Listar cuentas con nombre, correo y estado.                    | Solo un administrador la obtiene; el correo no aparece en otras vistas.                                  |
| ADM-02 | Activar o desactivar una cuenta.                               | Al desactivar se cierran sesiones y se conserva todo contenido; no se puede desactivar la propia cuenta. |
| ADM-03 | Restablecer la contraseña de una cuenta.                       | Aplica la regla de contraseña del registro y cierra las sesiones del usuario afectado.                   |
| ADM-04 | Gestionar recursos y cursos del catálogo formativo.            | Solo se publica contenido que cumple los criterios mínimos de 6.4.                                       |
| ADM-05 | Decidir sobre borradores en la cola de revisión.               | Cada decisión guarda actor, fecha y motivo; la versión publicada no se modifica directamente.            |
| ADM-06 | Ajustar los requisitos de otorgamiento y la escala de niveles. | Rechaza escalas no crecientes; se aplica hacia adelante y queda registrado quién y cuándo.               |
| ADM-07 | Limitar el alcance del rol.                                    | Ningún endpoint del panel lee o modifica actividades, equipos, evaluaciones ni insignias otorgadas.      |

Las pruebas críticas de esta área protegen las reglas que el cliente no puede garantizar:

- Autorización. Un usuario sin sesión o con cuenta de usuario recibe denegación en cada endpoint administrativo; se prueba cada ruta, no solo una.
- Alcance acotado. El administrador es rechazado al intentar leer un espacio de equipo, modificar una calificación o retirar una insignia (prueba de contrato del documento general, 10.1).
- Cuentas. Desactivar cierra sesiones y conserva contribuciones; el último administrador activo no puede desactivarse.
- Umbrales. Escalas duplicadas, decrecientes o no enteras se rechazan; un cambio no altera otorgamientos ya registrados.
- Contenido. Una versión publicada no se edita en sitio; retirar detiene consultas nuevas y conserva el progreso previo.

### 12.8 Incrementos y decisiones abiertas

| Incremento           | Entrega demostrable                                              | Dependencia                                    |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| ADM1. Cuentas        | Lista, restablecimiento de contraseña y activar/desactivar.      | Endpoints de Cuentas del núcleo.               |
| ADM2. Contenido base | Alta y retiro de recursos y publicación de los cursos iniciales. | Incrementos B1 y B2 de 11.2.                   |
| ADM3. Revisión       | Cola de revisión, decisión con motivo y versiones.               | Incremento B4; solo si se aprueba la opción B. |
| ADM4. Umbrales       | Formulario de requisitos y escala con vista previa y registro.   | Sistema de insignias de Persona C.             |

Decisiones que conviene validar con el equipo antes de construir:

- ¿Los umbrales de insignias y de nivel se aplican a actividades ya en curso o solo a las que se creen después del cambio?
- ¿Es suficiente un administrador único por despliegue, o se necesita al menos un segundo administrador como respaldo?
- ¿Se reduce el panel a gestión directa en base de datos si el tiempo obliga a recortar? El documento general permite sustituir el panel en el alcance mínimo, con excepción de cuentas, que sí requiere pantalla.
- ¿Debe existir un registro administrativo visible en el panel o basta con conservarlo en base de datos para consulta técnica?

## 13. Alternativas y recomendación

### 13.1 Tres alcances posibles

| Opción         | Incluye                                                                     | Ventaja                              | Costo/Riesgo                                         |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| A. Mínima      | Seis cursos creados por Administrador, catálogo, visor y recursos.          | Entrega rápida y muy clara.          | No demuestra autoría abierta ni moderación completa. |
| B. Equilibrada | Diez cursos, rutas, progreso, recursos, autoría y revisión.                 | Mejor evidencia de producto y tesis. | Requiere cuidar alcance del editor y versionado.     |
| C. Extendida   | Opción B + recomendaciones automáticas e integración profunda con medición. | Experiencia más personalizada.       | Invade Persona C y eleva demasiado la complejidad.   |

Recomendación: usar la opción B Equilibrada como diseño objetivo y entregar primero los incrementos B1 a B3. Así tu parte se ve suficientemente completa, mantiene una tesis clara y no invade las responsabilidades de A o C.

### 13.2 Sugerencias para fortalecer tu parte

- Presenta un curso completo de ejemplo. El de Comunicación clara funciona bien porque permite mostrar ficha, lección, práctica y recurso.
- Diseña por habilidades, no por materias. El catálogo debe responder a problemas como escuchar, coordinar, decidir o resolver conflictos.
- Usa resultados aplicables. Cada curso debe terminar en una plantilla, guion, protocolo o práctica que pueda reutilizarse.
- Mantén el progreso como navegación. Sirve para reanudar el curso, no para juzgar el desempeño de la persona.
- Etiqueta todo con los cinco elementos. Esto hace visible la relación entre la interfaz y la tesis.
- Evita decir que construirán Coursera completo. Descríbelo como un Centro de formación de microcursos inspirado en su estructura.

### 13.3 Decisiones que conviene validar con el equipo

- ¿Cualquier usuario puede proponer cursos o solo usuarios aprobados como autores?
- ¿Los cursos completos son públicos o requieren cuenta para iniciar y guardar progreso?
- ¿Administrador publica directamente o existe un segundo revisor académico?
- ¿Qué tipos y tamaños de archivo soportará el MVP?
- ¿Una actividad solo enlaza el curso o también define una fecha de finalización?
- ¿La reflexión personal es siempre privada?

### Fuentes del proyecto

- README.md.
- docs/concepto-producto.md.
- docs/diseno-desarrollo.md.
- CONVENTIONS.md.
- apps/web/PRODUCT.md y apps/web/DESIGN.md.
- Documento de diseño temprano revisado como antecedente, no como fuente de verdad.

---

## Nota de implementación: incremento 1 (29 de septiembre de 2026)

Decisiones tomadas con el equipo antes de construir la biblioteca de recursos. Sustituyen, en lo que toca, a las preguntas abiertas de 13.3.

- **Alcance:** solo el administrador crea y publica contenido (opción A de 13.1 para la autoría). No hay cola de revisión ni versiones mientras la autoría sea solo del administrador: un recurso publicado se edita en sitio y, si hay un problema, se retira.
- **Archivos:** PDF guardado en la base (`bytea`, tabla `archivos_recurso`), hasta 4 MB por el límite de cuerpo de Vercel. Los videos son solo enlaces externos con transcripción obligatoria.
- **Categorías:** las áreas de 9.1: comunicación, organización, conflictos, coordinación y reflexión, más **Otros** para el recurso cuyo tema no encaja en ninguna (`AREAS_HABILIDAD` en `packages/shared`). Otros aparece también como filtro del catálogo público.
- **Secciones del concepto:** _Qué es colaborar_ y _Cómo colaborar_ se conservan como dato del recurso para filtrar, no como división de la pantalla.
- **Acceso:** catálogo, ficha y lectura son públicos; guardar progreso (incremento 3) exigirá sesión. Quien entra sin sesión ve un aviso en Recursos: puede consultar y descargar todo, pero su progreso no se guarda hasta que inicie sesión. "Ingresar" lo regresa a la misma página. El aviso se puede cerrar y no reaparece durante esa visita.

### Modelo implementado

- `recursos_formativos`: sección, título, resumen, tipo (texto / pdf / video / enlace / plantilla), contenido (markdown o URL https según el tipo), transcripción, área, elementos de Johnson y Johnson, duración, fuente, licencia, orden, estatus (borrador / publicado / retirado), autor y fechas.
- `archivos_recurso`: PDF adjunto 1:1, fuera de la tabla principal para que no viaje al listar.
- Transiciones: borrador → publicado → retirado → publicado. Retirar es reversible; eliminar borra el recurso y su archivo en cualquier estatus, con confirmación, y no se puede deshacer.
- Búsqueda: la columna `texto_busqueda` guarda título, resumen, área y elementos en minúsculas y sin acentos, para que "reunion" encuentre "reunión" sin la extensión `unaccent`.
- Mínimos de publicación que valida el servidor (6.4): resumen, área, al menos un elemento, duración, fuente, licencia y el contenido propio del tipo (archivo en PDF; transcripción en video).

### API implementada

| Método             | Ruta                                               | Acceso                                             |
| ------------------ | -------------------------------------------------- | -------------------------------------------------- |
| GET                | /api/recursos?seccion&area&tipo&q&pagina&porPagina | Público (tipo admite varios: `tipo=pdf,plantilla`) |
| GET                | /api/recursos/:id                                  | Público (solo publicados)                          |
| GET                | /api/recursos/:id/archivo                          | Público (solo publicados)                          |
| GET, POST          | /api/admin/recursos?pagina&porPagina               | Administrador                                      |
| GET, PATCH, DELETE | /api/admin/recursos/:id                            | Administrador                                      |
| PUT, DELETE        | /api/admin/recursos/:id/archivo                    | Administrador                                      |

### Paginación

Los dos listados responden `{ recursos, paginacion: { pagina, porPagina, total, totalPaginas } }`. Por defecto 9 por página en el catálogo público y 20 en el panel; el máximo es 50. Una página posterior a la última devuelve la lista vacía con el total, no un error. El orden es estable (orden, fecha de creación e id) para que ningún recurso se repita ni se salte entre páginas.

## Nota de implementación: incremento 2, paso 1 (19 de octubre de 2026)

Modelo de cursos y API de administración, sin pantallas todavía.

### Decisiones

- **Lecciones mixtas:** una lección reutiliza un recurso de la biblioteca o es contenido propio del curso (lectura, práctica o reflexión). Así se aprovecha la biblioteca sin perder las partes que solo tienen sentido dentro de un curso.
- **Un recurso usado en un curso no se puede eliminar**, aunque el curso sea borrador: la API responde 409 y nombra los cursos. Sí se puede retirar; la lección se mostrará como no disponible.
- **Un recurso puede estar en varios cursos.**
- **Mínimos para publicar un curso:** ficha completa (resumen, objetivo, área, al menos un elemento, nivel y práctica final); entre 2 y 5 lecciones, con al menos una práctica y una reflexión; cada lección de recurso apunta a un recurso publicado; cada lección propia tiene título, contenido y duración. El máximo de 5 lecciones se aplica siempre; el mínimo, al publicar.
- **Un curso publicado debe seguir cumpliendo los mínimos** después de cualquier cambio en su ficha o sus lecciones; si un cambio los rompe, se rechaza completo.
- **Reflexión:** por ahora solo se muestra la pregunta. Guardar la respuesta llega con el progreso (incremento 3) y exigirá sesión.
- **Sin versiones ni módulos:** como solo el administrador crea contenido, el curso se edita en sitio. La duración del curso se calcula sumando la de sus lecciones.

### API implementada (administrador)

| Método             | Ruta                                       | Propósito                                               |
| ------------------ | ------------------------------------------ | ------------------------------------------------------- |
| GET, POST          | /api/admin/cursos?pagina&porPagina         | Listar (paginado) y crear la ficha                      |
| GET, PATCH, DELETE | /api/admin/cursos/:id                      | Ver con lecciones, editar, publicar o retirar, eliminar |
| POST               | /api/admin/cursos/:id/lecciones            | Agregar una lección al final                            |
| PATCH, DELETE      | /api/admin/cursos/:id/lecciones/:idLeccion | Editar o quitar una lección                             |
| PUT                | /api/admin/cursos/:id/lecciones/orden      | Reordenar con la lista completa de ids                  |

Además, `GET /api/admin/recursos` acepta `q`, `tipo` y `estatus` para buscar en la biblioteca, y `GET /api/admin/recursos/:id` incluye `usadoEn` con los cursos que usan el recurso.

## Nota de implementación: incremento 2, pasos 2 y 3 (30 de octubre de 2026)

Panel para armar cursos y parte pública: catálogo, ficha y visor.

### Decisiones

- **Recurso retirado en un curso publicado:** el curso sigue publicado y la lección se muestra como no disponible, sin exponer el título del recurso. Publicar (o volver a publicar) exige todos los recursos publicados; editar un curso ya publicado solo se lo exige a la lección que se está tocando. Así un recurso retirado no bloquea arreglar el curso ni editar el resto.
- **Concurrencia:** toda modificación de un curso bloquea su fila (`SELECT … FOR UPDATE`), igual que en recursos. El borrado de un recurso comprueba su uso dentro del bloqueo del recurso, y la llave RESTRICT cubre lo que quede.
- **Selector de la biblioteca:** el editor de cursos solo ofrece recursos publicados, y no los que ya están en el curso.
- **Un curso nuevo se queda en el editor** al crearse, porque lo siguiente es agregar lecciones. Las lecciones se guardan al momento; la ficha, con los botones. Al guardar la ficha se vuelve a la lista con confirmación, igual que en recursos.
- **Filtros del catálogo:** área y texto aplican a cursos y recursos; nivel y elemento solo a cursos. Elegir una sección oculta los cursos, que no pertenecen a ninguna. El filtro por duración de CAT-01 queda pendiente: la duración se calcula y no se puede filtrar en la consulta.
- **Reflexión:** solo muestra la pregunta; guardar la respuesta llega con el progreso.

- **Edición simultánea:** el editor de cursos espera una lectura fresca antes de llenar el formulario y guarda con `versionFicha`; si otro administrador guardó mientras tanto, el servidor responde 409 `curso_desactualizado` y el editor ofrece cargar la versión actual. Las lecciones no mueven la versión, porque se guardan una por una. El editor de recursos también espera la lectura fresca, pero todavía no tiene versión.
- **Búsqueda:** `texto_busqueda` guarda las etiquetas visibles de los elementos, no sus identificadores (`textoDeBusquedaCatalogo` en `packages/shared`).

### API pública implementada

| Método | Ruta                                               | Propósito                                             |
| ------ | -------------------------------------------------- | ----------------------------------------------------- |
| GET    | /api/cursos?area&nivel&elemento&q&pagina&porPagina | Catálogo publicado                                    |
| GET    | /api/cursos/:id                                    | Ficha e índice, sin el contenido de las lecciones     |
| GET    | /api/cursos/:id/lecciones/:idLeccion               | Contenido de la lección, con el recurso y sus vecinas |

Lo que no está publicado responde 404, igual que un id inexistente.

### Pantallas

- Público: cursos en `/recursos`, ficha en `/cursos/:id`, visor en `/cursos/:id/lecciones/:idLeccion`.
- Panel: `/admin/cursos`, `/admin/cursos/nuevo`, `/admin/cursos/:id`.
- `npm run sembrar-cursos` carga tres cursos de ejemplo (requiere `sembrar-recursos`).

### Siguientes incrementos

- **Incremento 2:** cursos, lecciones y rutas, con ficha y visor públicos. Hechos modelo, API, panel, catálogo, ficha y visor. Falta solo la ruta de aprendizaje, que sigue siendo una vista previa fija. Falta sustituir `ruta.fixtures.ts`.
- **Incremento 3:** inscripción, progreso, "Continúa aprendiendo", Mis cursos y recursos guardados. Hecho (ver la nota siguiente).

## Nota de implementación: incremento 3 (3 de noviembre de 2026)

Progreso del alumno: inscripción, lecciones completadas, reflexión privada, "Continúa aprendiendo", Mi formación y recursos guardados. Leer sigue siendo libre; todo lo de esta nota exige sesión.

### Decisiones

- **Progreso por lección, no por versión.** No hay versiones de curso (el administrador edita en sitio), así que CUR-02 se cumple por lección: el porcentaje se calcula al leer, con las lecciones actuales. Cuentan las obligatorias disponibles; si un curso no tiene ninguna, cuentan todas las disponibles, para que nadie lo termine sin hacer nada.
- **Cambios del administrador sobre un curso empezado.** Una lección nueva baja el porcentaje de quien no ha terminado; quien ya terminó conserva su finalización. Quitar una lección borra su progreso. Si quitarla, volverla opcional o retirar su recurso deja a alguien con todo hecho, el curso se le da por terminado en ese momento. Reordenar o cambiar el recurso de una lección conserva el progreso, porque la lección sigue siendo la misma.
- **Lección no disponible.** Una lección cuyo recurso se retiró no se puede marcar (409 `leccion_no_disponible`) y no cuenta para terminar.
- **La finalización se fija una vez** y no se borra: ni al desmarcar una lección ni si el curso cambia después.
- **Inscripción.** Se crea al empezar el curso desde su ficha, o al marcar una lección o escribir una reflexión; leer una lección no inscribe. Solo en cursos publicados.
- **Curso retirado.** Sigue en Mi formación para quien lo empezó, con la etiqueta "Retirado" y sin "Seguir", porque sus lecciones ya no se abren. "Continúa aprendiendo" lo ignora.
- **Un curso con inscripciones no se elimina** (409 `curso_con_inscripciones`); se retira. La llave RESTRICT de `inscripciones_curso` lo respalda.
- **Reflexión.** Privada y no calificable. Guardarla no marca la lección; guardarla vacía la borra. Si el administrador quita la lección, la reflexión se borra con ella.
- **Recursos guardados.** Solo se guardan recursos publicados. Uno retirado se oculta de la lista y vuelve si se publica de nuevo.
- **Navegación.** "Mi formación" (`/mi-formacion`) es un ítem de la barra lateral, junto a Recursos, con dos pestañas: Mis cursos y Guardados (`?vista=guardados`). No vive en el perfil, que es de Persona C, para no mezclar formación con insignias (ESP-02).
- **Insignias (Persona C).** Formación no emite `curso.completado` ni crea señales: el historial exige una actividad y un bus de eventos es parte de B6. Para cuando haga falta, `cursosCompletadosDe(idUsuario)` en `progreso.service.ts` es la lectura que Insignias puede consumir (documento general §3.4 y §4.5). Una prueba confirma que terminar un curso no crea otorgamientos.
- **Concurrencia.** Marcar bloquea el curso y los recursos de sus lecciones en modo compartido (`FOR SHARE`) y la inscripción en exclusivo (`FOR UPDATE`). El bloqueo de los recursos forma en fila al retiro de un recurso con la primera marca de una persona, cuya inscripción todavía no existe para el recálculo; el recálculo tras un cambio del administrador bloquea las inscripciones abiertas antes de leer el progreso. Cada bloqueo tiene una prueba que falla sin él.
- **Interfaz.** Progreso sobrio: texto ("2 de 4 lecciones · 50 %") con barra en Study Ink y Confirmed Green al terminar; lo completado se marca con "✓ Completada", nunca solo con color. Sin rachas, puntos ni confeti; nunca Apothecary Amber (DESIGN.md, "Course progress").

### Modelo implementado

`inscripciones_curso`, `progreso_leccion`, `reflexiones_formativas` y `recursos_guardados`. El detalle está en el documento general, §4.4 y §5.5.

### API implementada (con sesión)

| Método           | Ruta                                            | Propósito                                                          |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| POST             | /api/cursos/:id/inscripcion                     | Empezar el curso: 201 si se creó, 200 si ya existía                |
| PUT, DELETE      | /api/cursos/:id/lecciones/:idLeccion/completada | Marcar o desmarcar; dice si esa marca terminó el curso             |
| PUT              | /api/cursos/:id/lecciones/:idLeccion/reflexion  | Guardar la reflexión; un texto vacío la borra                      |
| GET              | /api/me/cursos/:id                              | Mi progreso y mis reflexiones en un curso; en cero si no lo empecé |
| GET              | /api/me/formacion                               | Mis cursos en curso y completados                                  |
| GET              | /api/me/recursos-guardados?pagina&porPagina     | Mis recursos guardados                                             |
| GET, PUT, DELETE | /api/me/recursos-guardados/:id                  | Saber si está guardado, guardarlo o quitarlo                       |

Ninguna ruta recibe el id de otra persona: todo se resuelve con la sesión.

### Pantallas

- Ficha del curso: "Empezar curso" inscribe; con el curso empezado muestra el avance y "Continuar"; terminado, la fecha y "Repasar el curso".
- Visor: "Marcar como completada", lecciones hechas en el índice, avance lateral, aviso al terminar el curso y respuesta a la reflexión.
- `/recursos`: "Continúa aprendiendo" en el hero cuando hay un curso a medias; si no, "Empieza por aquí".
- `/mi-formacion`: Mis cursos y Guardados.
- `/recursos/:id`: "Guardar para después".

### Pendiente

- Rutas de aprendizaje: la "Ruta recomendada" sigue fija en `ruta.fixtures.ts`; el progreso por curso ya permite sumarla después.
- Versión de ficha en recursos, filtro del catálogo por duración y vista previa de un curso en borrador. Las rutas de progreso solo aceptan cursos publicados, así que una vista previa nunca creará inscripciones.

## Nota de implementación: incremento 4 (4 de noviembre de 2026)

Rutas de aprendizaje con un recomendador explicable. Sustituye la vista previa fija de `ruta.fixtures.ts` y responde a la pregunta de §4.1 sobre cómo recomendar sin invadir a Persona C.

### Decisiones

- **Una ruta es editorial y se calcula de sus cursos.** El administrador escribe título, finalidad y descripción, y elige de 2 a 5 cursos en orden. Elementos, nivel inicial y duración no se capturan: se derivan de los cursos, para que la ruta nunca contradiga lo que contiene.
- **Publicar** exige finalidad y de 2 a 5 cursos, todos publicados. Al editar una ruta ya publicada solo se exige "publicado" a los cursos que se agregan. Un curso que se retira después no saca a la ruta del catálogo: se ve como "Curso no disponible", sin título, y no cuenta para terminarla.
- **Un curso que forma parte de una ruta no se elimina** (409 `curso_en_ruta`, con el nombre de las rutas); se quita de la ruta o se retira. Borrar una ruta no toca sus cursos ni el avance de nadie.
- **Ruta destacada:** a lo más una. Es la que ve quien entra sin sesión o sin datos para recomendar (arranque en frío). Marcar otra desmarca la anterior.
- **Progreso de la ruta calculado:** no hay inscripción a rutas. Una ruta está terminada cuando lo están sus cursos disponibles.
- **Lo que la persona quiere fortalecer:** elige hasta 2 de los 5 elementos en Mi formación. Es privado, opcional y no es una evaluación.
- **Concurrencia:** igual que cursos, toda modificación de una ruta bloquea su fila y usa `versionFicha` (409 `ruta_desactualizada`). Armar la lista de cursos los bloquea en modo compartido, para que no se eliminen ni cambien de estatus a la mitad, y marcar la destacada usa un candado consultivo. Cada bloqueo tiene una prueba que falla sin él. Desmarcar la destacada anterior sube su versión (un editor viejo de esa ruta recibe 409 en lugar de volver a marcarla), y guardar la ruta que ya es la destacada no pide el candado, para no invertir el orden de bloqueos con quien marca otra.

### Algoritmo de recomendación

**Tipo de recomendador.** Basado en contenido y explicable: a cada ruta le da un puntaje con una fórmula fija y dice por qué. Se descartó el filtrado colaborativo ("quienes tomaron X también tomaron Y") porque con pocos usuarios no hay de qué aprender (arranque en frío), es opaco y exigiría observar el comportamiento de otras personas. También se descartó usar calificaciones, insignias o actividades: medir desempeño es de Persona C (§1, §4.1 y §11.3). El recomendador solo lee datos formativos de la propia persona.

**Entradas.**

- Lo que la persona eligió fortalecer: hasta 2 elementos.
- Sus cursos empezados y terminados, con sus elementos y su nivel. Cuentan también los que se retiraron después: lo aprendido sigue valiendo.
- Las rutas publicadas, con sus cursos disponibles.

**Señales.** Cada una entre 0 y 1, calculadas sobre los cursos disponibles de la ruta. Sea `parte(e)` la fracción de esos cursos que trabaja el elemento `e`.

| Señal          | Peso | Definición                                                                                                                                                                                                                                                 | Por qué                                                                   |
| -------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Interés        | 0.40 | Promedio de `parte(e)` sobre los elementos que eligió. Si no eligió ninguno, se usan los de sus cursos en curso (interés implícito). Si tampoco hay, la señal no aplica y su peso se reparte entre las demás.                                              | Lo que la persona dice necesitar pesa más que cualquier inferencia.       |
| Brecha         | 0.25 | `Σ parte(e) · (1 − cobertura(e)) / Σ parte(e)`. `cobertura(e)` es 1 con 2 cursos terminados que trabajan `e`, 0.5 con uno y 0 con ninguno. Solo cuentan cursos terminados: un elemento que se está estudiando sin un curso completado sigue siendo brecha. | Los cinco elementos se necesitan juntos (§3): conviene llenar los huecos. |
| Continuidad    | 0.20 | `(cursos de la ruta terminados + 0.5 · empezados) / cursos disponibles`.                                                                                                                                                                                   | Seguir lo empezado es mejor que dispersarse.                              |
| Nivel adecuado | 0.15 | 1 si la ruta empieza en el nivel que le toca o más abajo, 0.5 si empieza uno arriba, 0 si empieza dos arriba. "Le toca" es el nivel siguiente al más alto que terminó; inicial si no ha terminado nada.                                                    | Evita frustrar con una ruta avanzada a quien empieza.                     |

**Puntaje.** `Σ peso · señal / Σ peso` sobre las señales que aplican, de 0 a 100.

- No se recomiendan las rutas que la persona ya terminó ni las que no tienen cursos disponibles.
- Empates: primero la destacada, luego el orden editorial.
- Arranque en frío: sin preferencias ni cursos, el modo es `editorial`, la destacada va primero y su razón lo dice.

**Explicación.** Cada recomendación trae hasta 3 razones, de la señal que más aportó a la que menos. Por ejemplo: "Trabaja Procesamiento del grupo, que elegiste fortalecer", "Cubre Interacción promotora, que aún no has trabajado en ningún curso completado", "Ya terminaste 1 de 2 cursos de esta ruta" o "Empieza en nivel inicial, adecuado para ti".

**Ejemplo con los datos de las semillas.** Una persona terminó _Acuerdos y responsabilidades claras_ (Responsabilidades e Interdependencia, inicial) y tiene en curso _Reuniones breves que producen decisiones_ (Interacción promotora y Responsabilidades, inicial). Las rutas son _Organización y corresponsabilidad_ (Acuerdos → Reuniones) y _Mejora continua del equipo_ (Reuniones → Retrospectivas, intermedio).

| Ruta                                                                           | Interés | Brecha | Continuidad | Nivel | Puntaje |
| ------------------------------------------------------------------------------ | ------- | ------ | ----------- | ----- | ------- |
| Sin elegir nada (interés implícito: Interacción promotora y Responsabilidades) |         |        |             |       |         |
| Organización y corresponsabilidad                                              | 0.75    | 0.63   | 0.75        | 1     | **76**  |
| Mejora continua del equipo                                                     | 0.50    | 0.83   | 0.25        | 1     | 61      |
| Después de elegir Procesamiento del grupo                                      |         |        |             |       |         |
| Organización y corresponsabilidad                                              | 0       | 0.63   | 0.75        | 1     | 46      |
| Mejora continua del equipo                                                     | 0.50    | 0.83   | 0.25        | 1     | **61**  |

Declarar un interés cambia la recomendación, y la razón principal pasa a ser la brecha y lo elegido. Esta tabla es también una prueba (`ejemplo documentado` en `recomendacion.test.ts`): si cambian los pesos o la fórmula, la prueba avisa que hay que actualizarla.

**Propiedades que protegen las pruebas.** `recomendacion.test.ts` tiene 20 pruebas con perfiles sintéticos: persona nueva, interés declarado e implícito, elemento ya cubierto, ruta a medias, ruta terminada, niveles y cursos retirados. Comprueban además que el resultado es determinista e independiente del orden de entrada. `recomendaciones.test.ts` comprueba con la base que solo se usan los datos de quien pregunta, que solo entran rutas publicadas y que pedir recomendaciones no crea nada.

**Límites y trabajo futuro.**

- Los pesos son una decisión de diseño justificada, no calibrada con datos. Viven como constantes con nombre (`PESOS_RECOMENDACION`) para poder ajustarlos.
- Una evaluación con usuarios (por ejemplo, un "¿Te sirvió?" opcional) se dejó fuera para no introducir medición en Formación. Si se agrega, debe evaluar al recomendador, no a la persona.
- Recomendar a partir de desempeño seguiría siendo de Persona C. Formación solo entregaría el contenido etiquetado (§4.1).

### Modelo implementado

`rutas_formativas`, `cursos_ruta` y `preferencias_formativas`. El detalle está en el documento general, §4.4, §4.6 y §5.5.

### API implementada

| Método             | Ruta                              | Acceso                                                   |
| ------------------ | --------------------------------- | -------------------------------------------------------- |
| GET                | /api/rutas?pagina&porPagina       | Público: rutas publicadas, la destacada primero          |
| GET                | /api/rutas/:id                    | Público: ficha con sus cursos en orden                   |
| GET, PUT           | /api/me/preferencias-formativas   | Con sesión: lo que quiere fortalecer                     |
| GET                | /api/me/rutas/recomendadas?limite | Con sesión: rutas con puntaje, señales, razones y avance |
| GET, POST          | /api/admin/rutas                  | Administrador                                            |
| GET, PATCH, DELETE | /api/admin/rutas/:id              | Administrador: ficha, estatus y destacada                |
| PUT                | /api/admin/rutas/:id/cursos       | Administrador: reemplaza la lista completa de cursos     |

### Pantallas

- `/recursos`: "Ruta recomendada para ti" con sus razones y las demás rutas; sin sesión, la destacada.
- `/rutas/:id`: ficha pública con el avance por curso y "Seguir con la ruta".
- `/mi-formacion`: "¿Qué quieres fortalecer?".
- Panel: `/admin/rutas`, con el editor de ficha y cursos, los requisitos en vivo y lo que se calcula de los cursos.
- `npm run sembrar-rutas` carga dos rutas de ejemplo (requiere `sembrar-cursos`).

### Pendiente

- Constancias de finalización de cursos y rutas para el perfil, con la frontera con Persona C por acordar.
- Autoría abierta con revisión del administrador (opción B de §13.1).
- Versión de ficha en recursos, filtro por duración y vista previa de borradores.
