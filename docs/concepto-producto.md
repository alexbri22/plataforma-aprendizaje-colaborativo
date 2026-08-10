**Concepto de Producto**

Plataforma de Aprendizaje Colaborativo

_Versión 2.0 — Para revisión final_

# **1\. Resumen**

Este documento describe el concepto de producto de la Plataforma de Aprendizaje Colaborativo, elaborado a partir del análisis de la propuesta inicial y refinado a lo largo de reuniones de seguimiento con el equipo.

La plataforma está diseñada para apoyar el desarrollo de habilidades de trabajo colaborativo en estudiantes, fundamentada en la teoría de Johnson y Johnson (1999) sobre aprendizaje colaborativo, cuyos cinco aspectos centrales son: definición de responsabilidades, interdependencia positiva, responsabilidad individual y grupal, interacción, y evaluación de grupo y habilidades sociales.

La unidad central de trabajo de la plataforma es la actividad colaborativa: una instancia autocontenida que define un objetivo, un periodo de tiempo y un conjunto de equipos formados por sus participantes. Esta decisión, la más estructural del sistema, se documenta junto con la alternativa evaluada en la sección 3\.

El sistema no define modos de gestión predefinidos. En su lugar, el organizador de una actividad tiene control directo sobre un catálogo de funciones de seguimiento (formación de equipos, reporte de trabajo, evaluación, entre otras), habilitando cada una en el estado que corresponda a la experiencia que busca. Esto permite recrear comportamientos equivalentes a una gestión autogestionada, semi-dirigida o completamente dirigida, sin que estas existan como categorías fijas del sistema.

Cualquier usuario registrado puede crear actividades y convertirse en su organizador, sin distinción de tipo de cuenta entre docentes y estudiantes. El sistema contempla además un rol de administrador deliberadamente acotado, un nivel de acceso público sin cuenta limitado al contenido educativo introductorio, y un sistema de recompensas basado en insignias que reconoce la participación colaborativa de los usuarios a lo largo de sus actividades.

Las decisiones de diseño descritas en este documento fueron revisadas con el equipo en reuniones de seguimiento y se consideran asentadas, con dos excepciones que se presentan como propuesta: el sistema de insignias (sección 6\) y las decisiones de alcance excluido (sección 8), pendientes de validación.

# **2\. Usuarios y roles**

El sistema reconoce dos tipos de cuentas: **Usuario** y **Administrador**. No existe distinción de rol (docente/estudiante) a nivel de cuenta: cualquier Usuario puede crear actividades o unirse a ellas, y el rol —organizador, co-organizador o participante— es una condición que existe únicamente en el contexto de una actividad específica.

## **2.1 Usuario (cuenta)**

Todo usuario registrado puede:

- Crear actividades colaborativas, convirtiéndose en organizador de las mismas.
- Unirse a actividades creadas por otros mediante clave de ingreso, participando en ellas.
- Consultar un historial de las actividades en las que ha participado u organizado.

## **2.2 Organizador**

Es quien crea una actividad. Tiene control total sobre su configuración: define objetivo, periodo, equipos, evaluación y funciones de seguimiento. Puede agregar co-organizadores a la actividad, quienes tienen permisos equivalentes a los suyos dentro de esa actividad (ver sección 2.3)

## **2.3 Co-organizador**

Usuario agregado por el organizador, con permisos de configuración y operación idénticos a los suyos dentro del contexto de esa actividad, con dos excepciones reservadas al organizador original: la gestión de co-organizadores (agregar o retirar) y el cierre y finalización de la actividad. No implica ningún cambio a nivel de cuenta.

## **2.4 Participante**

Todo usuario que se une a una actividad sin ser organizador ni co-organizador. Este rol existe solo dentro de esa actividad; el mismo usuario puede ser organizador en una actividad y participante en otra simultáneamente.

## **2.5 Administrador**

Su alcance está deliberadamente limitado a tres áreas aisladas, sin ninguna capacidad de intervención sobre actividades, equipos, evaluaciones ni contenido generado por usuarios:

**Gestión de cuentas:**

- Ver lista de usuarios registrados (nombre, correo, estado de la cuenta: activa/inactiva)

- Activar o desactivar una cuenta de usuario

- Restablecer contraseña en casos de soporte

**Gestión de contenido formativo:**

- Subir, editar y eliminar recursos (texto, PDF, video, enlace) en las secciones formativas públicas

**Gestión del catálogo de insignias:**

- Ajustar los umbrales de participantes mínimos y duración mínima requeridos para el otorgamiento de insignias (ver sección 6\)
- Ajustar los umbrales de puntos de la escala de niveles, que son una decisión de calibración (ver sección 6\)

El catálogo de las seis insignias es fijo y no se administra: crear o retirar categorías rompería la comparabilidad del acumulado entre actividades, que es la razón de que el catálogo sea único (ver sección 6).

##

## **2.6 Público (sin cuenta)**

Un visitante sin sesión iniciada puede ver la pantalla de inicio, consultar el contenido formativo público, y acceder a registro e inicio de sesión. No tiene acceso a ninguna actividad, equipo, evaluación ni función operativa de la plataforma.

_El sistema previo (Argumente) contemplaba un 'aula abierta' donde cierto contenido era visible públicamente. Este comportamiento no se replica en esta fase, ya que introduce decisiones adicionales (qué se comparte, quién decide, si se puede interactuar sin cuenta) que se consideran fuera del alcance base. Puede tratarse como extensión futura._

# **3\. Modelo de entidades**

## **3.1 Entidad central: Actividad**

La actividad es la entidad central y autocontenida del sistema. Una actividad:

- Es creada por un usuario (el "organizador"), quien puede agregar co-organizadores (ver sección 2.3).
- Define un objetivo, un periodo de tiempo, y una configuración de funciones de seguimiento habilitadas.
- Genera su propia clave de ingreso única, mediante la cual otros usuarios pueden unirse como participantes.
- Contiene dentro de sí los equipos de trabajo formados por sus participantes.

No existe en este modelo un contenedor superior tipo "grupo" o "clase" que agrupe múltiples actividades bajo una membresía persistente. Cada actividad es independiente en cuanto a su lista de participantes.

Las actividades están concebidas para trabajos colaborativos de mediana y larga duración, como proyectos de varias semanas, meses o un semestre completo, y no para tareas puntuales de corta duración. Varias decisiones del diseño asumen este patrón de uso: el ciclo de vida en fases, el cierre como evento formal de evaluación, y la independencia de participantes por actividad.

## **3.2 Registro de decisión: Actividad vs. Grupo como entidad central**

Esta fue la decisión más estructural del sistema, dado que define la base del modelo de datos y no puede revertirse sin costo significativo. Se evaluaron dos opciones durante la fase de análisis, y se confirmó la decisión durante una reunión de revisión.

**Opción adoptada — Actividad como entidad central:** Cada actividad es autocontenida: resuelve su propio universo de participantes mediante clave de ingreso o invitación, sin depender de una estructura superior. Esta opción se adoptó por dos razones: produce un modelo de datos más simple, y es la única compatible de forma natural con el requerimiento de que cualquier usuario pueda crear actividades sin necesitar que alguien más administre un contenedor previo.

**Alternativa evaluada — Grupo como entidad central:** Se consideró mantener el grupo como contenedor persistente de múltiples actividades. Sus ventajas son reconocidas: evitar la inscripción repetida cuando las mismas personas colaboran en varias actividades, y ofrecer continuidad histórica de una clase. Se descartó porque introduce una jerarquía adicional en el modelo de datos y genera fricción de permisos cuando un usuario necesita crear un "grupo" únicamente para sostener una sola actividad.

La reinscripción por actividad, identificada inicialmente como costo de esta opción, se concluyó que no representa un problema en la práctica: las actividades están pensadas para trabajos de larga duración, como proyectos de varios meses o de un semestre completo, comparables a un curso y no para tareas pequeñas y frecuentes. Bajo ese patrón de uso, unirse a una actividad es un evento poco frecuente, equivalente a inscribirse a una clase al inicio del periodo. Como conveniencia adicional se identificó un mecanismo de etiquetado opcional para agrupar actividades relacionadas, documentado como mejora futura en la sección 8\.

## **3.3 Equipos**

Un equipo agrupa a un subconjunto de los participantes de la actividad y es la unidad sobre la cual se reportan avances, se utiliza el espacio de aprendizaje compartido, y, según la configuración de la actividad, se aplica evaluación grupal.

# **4\. Flujo de vida de una actividad**

El ciclo de vida de una actividad se compone de cinco fases, comunes a todas las actividades. El nivel de control del organizador depende de cómo configure las funciones de seguimiento, pero la secuencia de fases es la misma en todos los casos.

## **Fase 1 — Configuración inicial**

El organizador crea la actividad definiendo, como mínimo: nombre y objetivo. Adicionalmente, puede definir información general del trabajo a desarrollar, fecha de inicio y fecha de término, fechas de revisión de avances, fechas de evaluación, plazo del periodo de cierre, número de equipos esperado, y el estado de cada función de seguimiento disponible para la actividad (ver sección 5.1). El nivel de detalle configurado en esta fase depende enteramente de las funciones que el organizador decida habilitar.

Al completar esta fase, el sistema genera automáticamente una clave de ingreso única asociada a la actividad.

## **Fase 2 — Inscripción de participantes**

El organizador comparte la clave de ingreso con los participantes deseados, o bien los invita directamente buscándolos entre los usuarios de la plataforma. La búsqueda puede hacerse por datos básicos (nombre, correo), o cuando el organizador no conoce de antemano a las personas que busca, mediante filtros derivados del sistema de recompensas (por ejemplo, "los participantes con mayor rango en la categoría de liderazgo"). Este segundo mecanismo depende de que existan rangos previamente acumulados: en actividades tempranas, con poco historial en la plataforma, su utilidad será limitada de forma natural.

Esta búsqueda implica que el perfil básico de todo usuario registrado (nombre y rangos de insignias) es visible para los demás usuarios registrados de la plataforma. La búsqueda por correo electrónico solo devuelve coincidencias exactas, de modo que no es posible enumerar el directorio de usuarios; el correo de un usuario nunca se muestra a otros, únicamente sirve como criterio de búsqueda para quien ya lo conoce.

Los usuarios se unen a la actividad de forma progresiva conforme reciben la clave o aceptan la invitación, sin necesidad de que todos estén presentes desde el inicio. El organizador determina cuándo cerrar esta fase, ya sea manualmente o mediante una fecha límite de inscripción definida en la configuración.

## **Fase 3 — Formación de equipos**

Una vez cerrada la inscripción, ocurre la asignación de participantes a equipos, según el estado configurado por el organizador para la función "Formación de equipos" (ver sección 5): puede quedar en manos de los propios participantes, requerir una propuesta del sistema que el organizador ajusta y confirma, o ser una asignación manual hecha directamente por el organizador.

_Una vez formados los equipos, el organizador conserva la capacidad de reasignar participantes entre equipos durante el desarrollo de la actividad, en caso de que las circunstancias lo requieran._

## **Fase 4 — Desarrollo de la actividad**

Durante esta fase los equipos y participantes individuales hacen uso de las funciones operativas del sistema: espacio de aprendizaje del equipo, reporte de trabajo, y bitácora individual. El organizador puede dar seguimiento al progreso mediante las funciones descritas en la sección 5\. Esta es la fase de mayor duración dentro del ciclo de vida de la actividad.

##

##

## **Fase 5 — Cierre**

Al llegar la fecha de término, o cuando el organizador lo determine, la actividad entra en periodo de cierre: dejan de aceptarse nuevos reportes de trabajo, entradas de bitácora y avances en el espacio de equipo, pero se habilitan las acciones propias del cierre, que son la calificación por parte del organizador, las evaluaciones configuradas (autoevaluación y evaluación por pares) y el otorgamiento de insignias según lo configurado para la actividad.

Cuando el organizador da la actividad por finalizada, o al vencer el plazo de cierre si este fue definido en la configuración, la actividad pasa a estado archivado: queda disponible en modo de solo lectura para todos sus miembros, sin posibilidad de nuevas acciones. Las insignias se otorgan únicamente durante el periodo de cierre, no durante el desarrollo de la actividad, para evitar reconocimientos motivados por la emoción del momento.

#

#

#

#

#

#

#

#

#

#

#

#

#

# **5\. Funciones de seguimiento**

A diferencia de un modelo de modos predefinidos, el organizador no elige entre configuraciones fijas: tiene control directo sobre un conjunto de funciones, habilitando cada una en el estado que corresponda a la experiencia que busca para la actividad. Esto permite recrear comportamientos equivalentes a los de un modo autogestionado, semi-dirigido o completamente dirigido, sin que estos existan como categorías del sistema — son resultado de cómo se configuran las funciones, no una selección explícita.

## **5.1 Catálogo de funciones y estados**

| Función                                          | Estados                                                                                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Formación de equipos**                         | Autogestionado por participantes / Propuesta del sistema editable por el organizador / Asignación manual por el organizador                                                                                           |
| **Reporte de trabajo**                           | Deshabilitado / Libre (sin fechas, formato abierto) / Fechas sugeridas, formato libre / Fechas obligatorias, campos estructurados                                                                                     |
| **Bitácora individual**                          | Deshabilitada / Habilitada                                                                                                                                                                                            |
| **Calificación**                                 | Deshabilitada / Habilitada — asignación directa por el organizador (sin rúbrica) / Habilitada — mediante rúbrica definida por el organizador.La calificación se asigna siempre de forma individual, por participante. |
| **Autoevaluación individual**                    | Deshabilitada / Habilitada                                                                                                                                                                                            |
| **Autoevaluación grupal**                        | Deshabilitada / Habilitada                                                                                                                                                                                            |
| **Evaluación por pares**                         | Deshabilitada / Habilitada opcional / Habilitada obligatoria                                                                                                                                                          |
| **Espacio de equipo (metas, avances, recursos)** | Por elemento: Opcional / Obligatorio                                                                                                                                                                                  |
| **Insignias**                                    | Deshabilitado / Habilitado — solo el organizador otorga / Habilitado — organizador y participantes otorgan entre sí                                                                                                   |

_En el estado "Habilitada obligatoria", el sistema no bloquea técnicamente el cierre de la actividad si algún participante no completó su evaluación por pares: la evaluación pendiente se marca como no realizada y el organizador puede consultar quiénes no la completaron. La obligatoriedad es una expectativa visible, no una restricción técnica._

## **5.2 Historial de cambios**

El sistema mantiene un registro de acciones relevantes dentro de una actividad — asignaciones y reasignaciones de equipo, calificaciones otorgadas, insignias otorgadas, cambios de configuración de funciones y comentarios — indicando quién realizó cada acción y cuándo. Este registro es de solo consulta: permite al organizador y a los participantes tener visibilidad completa de lo ocurrido en la actividad, pero no incluye reversión automática de cambios (ver sección 8, punto sobre alcance futuro).

## **5.3 Comentarios del organizador y evaluación**

Los comentarios del organizador no forman parte del catálogo de funciones configurables de la sección 5.1: son una capacidad siempre disponible para el organizador y los co-organizadores en toda actividad, independientemente de la configuración elegida.

El organizador puede escribir comentarios cualitativos en dos niveles, independientemente de si la actividad tiene habilitada la calificación numérica:

**Comentarios por equipo:** observaciones generales dirigidas al equipo como unidad, que pueden abordar tanto el proceso de colaboración como el producto o avance de la actividad.

**Comentarios individuales:** observaciones dirigidas a cada participante de forma privada, que pueden abordar tanto el aspecto cognitivo (comprensión y desarrollo del tema) como el aspecto colaborativo (contribución individual al trabajo del equipo).

Estos comentarios siempre son cualitativos: el sistema no los convierte en número por sí mismos. Su relación con la calificación numérica depende de cómo esté configurada esa función para la actividad:

- Si la calificación se realiza **mediante rúbrica**, los comentarios son complemento cualitativo a los criterios ya estructurados de la rúbrica.
- Si la calificación está habilitada **sin rúbrica**, el organizador asigna el número directamente, apoyándose en sus propios comentarios como respaldo — sin que el sistema le imponga una estructura de criterios.

La calificación es individual: cada participante recibe su propia calificación, incluso cuando el trabajo evaluado es producto del equipo. El sistema no contempla una calificación a nivel de equipo en esta fase; si el organizador desea asignar el mismo valor a todos los integrantes, lo hace capturándolo para cada participante.

Las calificaciones asignadas en una actividad son internas a la plataforma: no constituyen calificaciones institucionales ni se integran a ningún sistema académico oficial. Por ello, la capacidad de calificar no se restringe a un tipo de cuenta: cualquier organizador puede habilitarla en sus actividades. La validez académica que se le dé a una calificación queda bajo la responsabilidad de quien organiza la actividad, que en contextos escolares será típicamente un docente que decide usar el resultado como insumo para su evaluación oficial.

Autoevaluación, autoevaluación grupal y evaluación por pares mantienen carácter exclusivamente formativo en ambos casos: no se agregan de forma automática a la calificación numérica. El organizador puede consultarlas como contexto adicional, pero su ponderación, si la hay, queda a su criterio manual.

#

#

#

#

#

#

#

#

#

# **6\. Sistema de recompensas: Insignias**

Cada usuario tiene en su perfil seis insignias de nivel que crecen con el reconocimiento de sus compañeros y de quien organiza. Al cierre de cada actividad, los integrantes de cada equipo se reconocen entre sí. No hay tablas de posiciones ni comparaciones públicas: cada quien progresa contra sí mismo.

**Las seis insignias**

El catálogo es fijo para toda la plataforma: ni el organizador ni el administrador crean categorías nuevas, para que el acumulado sea comparable entre actividades distintas. Son pocas y observables, con el criterio de que un compañero deba poder atestiguarlas y no inferirlas, y cubren perfiles distintos para que no todo lo acaparen los mismos.

| Insignia     | Qué reconoce                                          | Cómo lo ve un compañero                    |
| ------------ | ----------------------------------------------------- | ------------------------------------------ |
| Liderazgo    | Organizar, dar dirección, destrabar al equipo         | "Cuando nadie sabía qué seguía, lo aclaró" |
| Compañerismo | Ayudar a otros sin que sea su obligación              | "Me ayudó cuando estaba atorado"           |
| Comunicación | Explicar bien, escuchar, mantener informado al equipo | "Siempre supimos en qué iba"               |
| Compromiso   | Cumplir lo acordado y a tiempo, ser constante         | "Su parte siempre estuvo lista"            |
| Ideas        | Proponer soluciones ante problemas                    | "Cuando nos atoramos, propuso el camino"   |
| Buen juicio  | Dar retroalimentación útil y saber recibirla          | "Sus comentarios mejoraron el trabajo"     |

**El ritual de reconocimiento**

Ocurre durante el periodo de cierre de la actividad (sección 4, Fase 5) y está pensado para tomar dos o tres minutos desde el celular.

Reconocimientos limitados: cada participante reparte el 33 % del tamaño de su equipo, sin contarse, redondeado hacia arriba, con un piso de 1 y un techo de 5, y solo entre compañeros de su propio equipo. Un equipo de 3 da 1 reconocimiento; uno de 10, 3; uno de 20, 5. Siempre hay que elegir: nunca alcanza para todos. Un reconocimiento que puede darse a todo el equipo no distingue nada, y sin escasez el acumulado deja de ser una señal.

Frase de justificación: cada reconocimiento es persona + insignia + una frase de por qué. **\[Pendiente decidir si la frase será obligatoria, opcional o guiada con frases prellenadas — decisión de contenido, no bloquea el modelo de datos\]**.

Anónimo entre pares: quien recibe ve el reconocimiento y la frase, no quién la escribió. El organizador conserva la atribución completa.

Validación ligera del organizador: el sistema señala reciprocidad sospechosa y frases vacías; el organizador descarta las que no procedan y puede otorgar las suyas.

**Puntos y niveles**

Un reconocimiento no vale siempre lo mismo: el origen determina su peso, de modo que el acumulado no se reduzca a un concurso de popularidad entre pares.

| Fuente                                    | Valor      | Nota                                |
| ----------------------------------------- | ---------- | ----------------------------------- |
| Reconocimiento de un compañero (validado) | 1 punto    | Fuente principal                    |
| Reconocimiento del organizador            | 2 puntos   | Vale doble; modera la popularidad   |
| Señales automáticas (solo Compromiso)     | Fracciones | Bitácora constante y metas a tiempo |

Las seis insignias progresan por separado, cada una contra la misma escala única de umbrales acumulados. Los puntos nunca se pierden y no existen niveles negativos: el sistema solo reconoce lo bueno.

| Nivel    | Puntos | Significado                                      |
| -------- | ------ | ------------------------------------------------ |
| Bronce   | 3      | Alcanzable en 2-3 actividades; enganche temprano |
| Plata    | 8      | Constancia durante el semestre                   |
| Oro      | 18     | Reconocimiento sostenido; pocos lo logran        |
| Platino  | 35     | Trayectoria de varios cursos                     |
| Diamante | 60     | Distinción máxima; excepcional y de largo plazo  |

Los umbrales quedan a calibrar tras el primer uso real. El nivel alcanzado en una categoría constituye el rango visible en esa categoría, mostrado en el perfil y utilizado también como criterio del filtro de búsqueda de participantes al invitar a una actividad (sección 4, Fase 2).

**El perfil**

Muestra las seis insignias con su nivel y, al abrirlas, las frases recibidas de forma anónima. El propio usuario y quien organiza lo ven completo; los demás participantes ven las insignias, nunca listas comparativas. La vista de progreso compara contra el propio historial y no contra otros. Quien organiza dispone además de una vista de grupo para detectar a quien no recibe reconocimientos e intervenir a tiempo.

**Salvaguardas**

Contra la popularidad: insignias variadas, doble peso del organizador, y voto únicamente dentro del propio equipo, que además rota entre actividades.

Contra los pactos: reconocimientos limitados por el 33 % con techo de 5, alerta de reciprocidad y anonimato entre pares.

Contra la desmotivación: sin comparación pública y con un primer nivel rápido de alcanzar.

Requisitos mínimos de la actividad: el otorgamiento solo se habilita en actividades que cumplan un mínimo de participantes y una duración mínima entre su creación y su cierre (valores propuestos: 4 participantes y 4 semanas, ajustables por el administrador). Esto encarece la vía de inflación consistente en crear actividades artificiales con pocos integrantes para intercambiar insignias, y es coherente con el patrón de uso previsto de actividades de mediana y larga duración.

Estas salvaguardas mitigan el abuso casual pero no lo impiden ante coordinación deliberada; mecanismos de detección más robustos se documentan como mejora futura en la sección 8\.

**Qué queda fuera de la primera versión**

Las señales automáticas de Compromiso y una insignia especial de "Crecimiento", otorgada por el organizador a quien más mejoró, se difieren a una iteración posterior. La escala de cinco niveles sí queda definida e implementada completa desde el inicio: el arte de los cinco rangos ya existe y escalonarlos habría costado más que sostenerlos.

#

# **7\. Contenido formativo público**

El sistema contempla una sección de contenido educativo, accesible públicamente sin necesidad de cuenta, cuyo propósito es que cualquier usuario —antes o sin necesidad de participar en una actividad— adquiera los conceptos generales y la terminología necesaria para comprender qué significa colaborar dentro de la plataforma.

**Qué es colaborar:**  
Contenido introductorio sobre los fundamentos del aprendizaje colaborativo, basado en los cinco aspectos de Johnson y Johnson (1999).

**Cómo colaborar:**  
Contenido complementario sobre la aplicación práctica de esos fundamentos: cómo se traduce la colaboración en comportamientos concretos dentro de una actividad (comunicación, responsabilidad compartida, manejo de desacuerdos, entre otros).

Ambas secciones se componen de recursos estáticos (texto, PDF, video, enlace), administrados por el rol de Administrador mediante un mecanismo simple de carga, sin relación estructural con el resto del sistema (actividades, equipos, evaluaciones).

# **8\. Decisiones de alcance excluido**

Los siguientes puntos fueron identificados durante el desarrollo de este documento como funcionalidad de valor potencial, pero se excluyen deliberadamente del alcance MVP dado el costo de definición o implementación frente al tiempo disponible. Se documentan aquí para no perder la discusión y como candidatos a futuras iteraciones.

Cada punto se clasifica por prioridad estimada: P1 para mejoras candidatas a la primera iteración posterior al MVP, P2 para mejoras cuya necesidad debe validarse con el uso real de la plataforma antes de invertir en ellas.

1. **Reversión de cambios (P1)**: se discutió la necesidad de poder deshacer acciones dentro de una actividad (por ejemplo, una reasignación de equipo o una calificación otorgada por error). Se excluye del MVP porque implementarla correctamente requiere definir semántica de reversión específica para cada tipo de entidad afectada (equipos, calificaciones, configuración), lo cual introduce una superficie de decisiones de producto no resuelta. El historial de cambios (sección 5.2) cubre la necesidad de trazabilidad; la corrección de errores queda como acción manual del organizador.
2. **Etiquetado de actividades (P1):** mecanismo opcional para que un organizador agrupe actividades relacionadas y obtenga una vista consolidada. Se excluye del MVP por ser una conveniencia de organización sin impacto en el funcionamiento de las actividades.
3. **Detección de abuso en el sistema de insignias (P2):** las restricciones del MVP (límite de una insignia por otorgante, categoría y actividad, y requisitos mínimos de participantes y duración) mitigan la inflación casual del acumulado, pero no impiden el abuso mediante coordinación deliberada entre usuarios. Mecanismos más robustos, como la detección de patrones de otorgamiento recíproco o la ponderación diferenciada de insignias según quién las otorga, se excluyen del MVP por su costo de diseño e implementación frente a un problema cuya magnitud real se desconoce hasta observar el uso de la plataforma.
