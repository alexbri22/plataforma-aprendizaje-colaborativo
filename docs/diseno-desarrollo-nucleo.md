**Diseño de Desarrollo — Núcleo de la aplicación**

Plataforma de Aprendizaje Colaborativo

_Documento individual — Alejandro Briceño Espinoza_

Este documento especifica cómo se construye el núcleo de la aplicación: los módulos de Cuentas, Actividades, Equipos, Seguimiento, Evaluación e Historial. Es complemento del diseño de desarrollo general y no lo repite. El general fija el contrato que los tres subsistemas comparten y determina qué es válido en cada momento; este documento determina cómo se ejecuta, con el nivel de detalle necesario para que la implementación no vuelva a abrir decisiones ya tomadas.

**Preguntas abiertas.** Se conserva el mecanismo del documento general: cada hueco que el material de requerimientos no determina se registra con el formato P-nn, incluye una propuesta por defecto y se procede con ella si al llegar a su implementación no ha habido cambio de dirección. Una pregunta resuelta desaparece: su contenido pasa a texto declarativo en la sección que afecta. Los identificadores no se reutilizan ni se renumeran, de modo que un hueco en la serie indica una pregunta ya cerrada. La numeración de este documento arranca en P-21 para no colisionar con las del general.

_**Estructura.** Los capítulos 1 a 5 son transversales al subsistema y se implementan una sola vez. Los capítulos 6 a 10 corresponden a un módulo cada uno y siguen la misma estructura interna: reglas y algoritmos, endpoints, pantallas y preguntas abiertas propias. Los tipos de evento que cada módulo emite no se repiten en su capítulo porque el catálogo completo vive en 5.2. Los capítulos 11 a 13 son de ejecución._

# **1\. Contexto y alcance del subsistema**

El núcleo concentra seis de los nueve módulos del sistema y es la ruta crítica del proyecto: los subsistemas de recompensas y de contenido formativo dependen de él y en sentido inverso no existe dependencia. Esa posición condiciona el orden en que sus piezas se construyen, que se trata en 1.3, y explica por qué buena parte de lo que normalmente contendría un documento individual ya está fijado en el general.

## **1.1 Deslinde con el documento general**

El documento general define el contrato compartido y, en el caso del núcleo, ese contrato cubre casi todo lo que la estructura de un documento individual pediría: las entidades del núcleo están descritas atributo por atributo en su sección 5, el ciclo de vida en 6.1 y la matriz de permisos completa en 7\. Reproducir ese material aquí crearía dos versiones de la misma decisión y, por la regla de precedencia de 1.2 del general, la de este documento sería la no vinculante.

El deslinde que sigue este documento es de nivel y no de tema. Cada materia aparece en ambos documentos, pero en distinta capa de abstracción.

| Materia                  | Documento general                                                  | Este documento                                                        |
| :----------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------- |
| Entidades y persistencia | Modelo relacional, restricciones y diccionario de datos (4.4 y 5\) | Tipos del contrato de la API y modelos de vista del cliente           |
| Ciclo de vida            | Estados, transiciones válidas y reglas invariantes (6.1)           | Condición de disparo, efectos y casos límite de cada transición       |
| Autorización             | Matriz de permisos por plano y por rol (7)                         | Mecanismo que la evalúa y qué revela una respuesta denegada           |
| Historial                | Categorías, esquema y regla de emisión (8.1 y 8.2)                 | Catálogo de tipos, mecanismo de captura, agregación y consulta        |
| Interfaz                 | Organización por features y flujo unidireccional (3.5 y 3.6)       | Rutas, pantallas, claves de query y derivación desde la configuración |

**Regla de remisión.** Cuando este documento necesita una definición del general, la cita por número de sección y no la reproduce. Cuando encuentra en el general una ambigüedad o una imprecisión, la resuelve aquí de forma explícita y la lleva al general en su revisión siguiente: la regla de precedencia impide corregir el contrato desde un documento individual, pero no impide señalar dónde necesita corregirse.

## **1.2 Los seis módulos y sus dependencias internas**

El general establece las fronteras entre módulos y la regla de que ninguno accede a los datos de otro directamente (3.4). Dentro del núcleo esas fronteras forman un árbol, no una red: cada módulo depende de los que están sobre él y ninguno de los que están debajo.

| Módulo      | Depende de                  | Lo consumen                                                 |
| :---------- | :-------------------------- | :---------------------------------------------------------- |
| Cuentas     | —                           | Todos los demás, dentro y fuera del núcleo                  |
| Actividades | Cuentas                     | Equipos, Seguimiento, Evaluación, Insignias, Administración |
| Equipos     | Actividades                 | Seguimiento, Evaluación                                     |
| Seguimiento | Equipos                     | Ninguno                                                     |
| Evaluación  | Actividades, Equipos        | Ninguno                                                     |
| Historial   | Ninguno en tiempo de diseño | Ninguno: es observador, no observado                        |

**El historial es la excepción y no una más.** No consume a ningún módulo ni ningún módulo lo consume: su acoplamiento existe solo en tiempo de ejecución y en un único sentido, porque los servicios emiten eventos sin conocer al destinatario. Esa asimetría es lo que permite implementarlo primero, antes que las funcionalidades que va a observar, como exige 8.4 del general.

**Consecuencia para el orden de construcción.** Ninguna funcionalidad de Seguimiento ni de Evaluación puede probarse de extremo a extremo hasta que Actividades tenga su ciclo de vida en funcionamiento, porque toda acción de esos módulos está condicionada por la fase. Construirlos en paralelo con Actividades incompleto obliga a probarlos contra estados simulados, y a repetir la prueba cuando el ciclo real exista. El desglose de la fase A del capítulo 11 sigue este orden.

## **1.3 Superficie que el núcleo expone a los otros subsistemas**

Cinco piezas del núcleo son prerrequisito del trabajo de Carlos y de Ui Chul. Mientras no existan, sus subsistemas no pueden avanzar más allá de su interfaz, y el retraso no lo absorbe el núcleo sino ellos. Por eso se implementan y se publican como contrato tipado antes que cualquier pantalla del núcleo, aunque no sean lo que más valor visible aporta en ese momento.

| Consumidor     | Qué necesita                                                                      | Forma                                                |
| :------------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------- |
| Insignias      | Membresías de una actividad con su rol y su estado                                | Endpoint de participantes de la actividad            |
| Insignias      | Fase actual de la actividad, para restringir el otorgamiento al periodo de cierre | Campo de estado en el recurso de actividad           |
| Insignias      | Registro del otorgamiento en el historial                                         | Registrador de eventos de la capa de servicios (2.4) |
| Administración | Listado de cuentas, activación, desactivación y restablecimiento de contraseña    | Endpoints administrativos del módulo de Cuentas      |
| Administración | Que el panel no escriba sobre las tablas del núcleo                               | Los cuatro anteriores como única vía de acceso       |

**La única dependencia en sentido inverso.** El rango visible de un usuario se deriva del conteo de insignias otorgadas (4.5 del general), lo calcula el subsistema de recompensas y lo consume el módulo de Cuentas en la búsqueda de participantes al invitar. Es el único punto donde el núcleo depende de otro subsistema. Se acota de dos formas: Cuentas declara la interfaz que espera y trabaja contra una implementación vacía mientras Insignias no exista, y el filtro por rango es el primer elemento del orden de recorte de 9.6 del general. Si el subsistema de recompensas se retrasa, la invitación por nombre y por correo sigue funcionando y el núcleo no se detiene.

# **2\. Anatomía del servidor**

El general fija la arquitectura en capas del servidor y dónde vive cada responsabilidad (2.2). Este capítulo especifica la forma concreta de esas capas en el núcleo: qué hace cada eslabón de la cadena de middleware, cómo se evalúa la matriz de permisos, cuál es la forma común de un servicio de dominio y qué mecanismo garantiza que ninguna escritura quede sin su evento de historial.

## **2.1 La cadena de middleware y el punto donde se autoriza**

El general sitúa la matriz de permisos y la verificación de fase en la capa de servicios, y encarga al middleware el contexto transversal (2.2, 6.1 y 7.4). Lo que este capítulo fija es dónde queda la frontera entre ambos, porque la palabra autorización nombra dos operaciones que conviene separar.

Construir el contexto del actor no depende de la acción solicitada, es idéntico en todas las rutas de una actividad y conviene resolverlo una sola vez por petición. Decidir si una acción concreta procede depende de la acción, de la fase de la actividad y, en varios casos, de datos que solo el servicio ha leído. Lo primero es middleware; lo segundo, servicios.

| Paso                  | Responsabilidad                                                                                                                       | Rechaza con |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :---------- |
| Correlación           | Asigna un identificador a la petición para el registro técnico. No decide nada                                                        | —           |
| Sesión                | Resuelve la cookie a un usuario y verifica que la cuenta esté activa                                                                  | 401         |
| Contexto de actividad | En toda ruta anidada bajo una actividad, carga la actividad y la membresía del actor, con sus permisos concretos si es co-organizador | 404 (3.3)   |
| Servicio de dominio   | Verifica la fase y después el permiso, con la función de 2.2                                                                          | 409 / 403   |

El middleware no decide si la acción procede: deja sobre la petición un objeto de contexto con el usuario, su tipo de cuenta, la actividad y la membresía con su conjunto de permisos. Un actor sin membresía en una actividad no llega al servicio; la cadena se interrumpe antes, con la respuesta que 3.3 especifica.

**Registro de decisión — dónde se decide el permiso.** La alternativa era resolverlo en el middleware, declarando en la definición de cada ruta la acción que exige. Se descartó por dos motivos. El primero es que varias decisiones dependen de datos que el middleware no ha leído: si el elemento que se intenta editar pertenece al equipo del actor, o si el instrumento que se responde corresponde a la actividad de su membresía; resolverlas antes del servicio obliga a leer esos datos dos veces. El segundo es que la fase condiciona todo permiso (7.4), de modo que separar ambas verificaciones deja la primera sin la segunda a la vista, que es la forma habitual en que aparece un hueco de autorización. Del enfoque descartado se conserva lo que lo hacía atractivo: la decisión sigue siendo declarativa y verificable celda por celda, porque vive en una función única y no dispersa por los servicios.

## **2.2 La función de autorización**

Toda la matriz de permisos se resuelve en una sola función, que recibe el contexto del actor, la acción del catálogo y la actividad sobre la que se opera. Devuelve el permiso concedido, o el motivo del rechazo distinguiendo si lo impide la fase o el rol, porque cada caso produce una respuesta distinta de la API (3.3) y un mensaje distinto en la interfaz.

El orden de evaluación es el siguiente y no es arbitrario: va de la condición más general y más barata de verificar a la más específica.

1. La actividad está archivada. Rechazo por fase, sin consultar el rol. Es la regla transversal de 7.4 y ningún rol la sobrevive, incluido el organizador.

2. La membresía del actor está desactivada. Rechazo, con independencia del rol que tuviera.

3. La fase actual habilita la acción, conforme a la tabla de acción por estado derivada de 6.1.

4. El rol permite la acción. Para organizador y participante se resuelve por rol; para co-organizador, consultando sus permisos concretos, porque su conjunto es configurable por el organizador de la actividad (7.3).

Las dos tablas que la función consulta, acción por estado y acción por rol, son la transcripción directa de 6.1 y 7.3 del general y se declaran como datos, no como condicionales encadenados. Esto es lo que hace posible la prueba de contrato de 10.1, que debe recorrer cada celda de la matriz: recorrer una tabla es trivial, mientras que recorrer una cadena de condicionales exige reconstruir a mano los casos que la atraviesan.

**Catálogo de acciones.** Cada fila de la matriz del general tiene un nombre estable, declarado en los tipos compartidos (3.4). El mismo nombre lo usa el servidor para autorizar y el cliente para preguntar si debe mostrar un control (4.3), de modo que no existan dos vocabularios para la misma regla.

## **2.3 Forma de un servicio de dominio**

Un servicio recibe el contexto del actor y datos ya validados en su forma; nunca objetos de petición ni de respuesta. No conoce códigos de estado: señala sus fallos como errores de dominio tipados que la capa de rutas traduce a la respuesta correspondiente. Esa separación es la que permite probar la lógica sin levantar el servidor, que es donde 10.2 del general concentra la cobertura.

Toda operación de escritura del núcleo tiene la misma estructura de cinco pasos:

1. Cargar el estado que la operación necesita para decidir.

2. Autorizar con la función de 2.2.

3. Verificar las reglas de dominio que el esquema no expresa (4.6 del general).

4. Escribir.

5. Registrar el evento del historial.

Los pasos cuatro y cinco ocurren dentro de la misma transacción, por lo que se explica a continuación. El paso uno precede a la autorización porque varias decisiones de permiso necesitan datos: es la razón, señalada en 2.1, por la que la decisión no puede vivir en el middleware.

## **2.4 Transacción y emisión garantizada del evento**

El general exige una prueba de que ninguna acción registrable termina sin emitir su evento (10.1) y fija que la emisión ocurre en la capa de servicios (8.2), pero no establece cómo se consigue. Dejarlo a la disciplina de quien escribe cada servicio reproduce el fallo que esa prueba busca atrapar: una omisión no produce ningún error visible, solo un historial incompleto que nadie nota hasta que alguien lo consulta y falta lo que buscaba.

**Mecanismo.** Toda operación de escritura se ejecuta dentro de una envoltura que abre la transacción, entrega al servicio un registrador de eventos y, al terminar, comprueba que se haya registrado al menos uno. Si no lo hay, aborta la transacción y falla. La comprobación está activa en desarrollo y en las pruebas; en producción se degrada a un registro técnico de severidad alta, para no convertir un defecto de trazabilidad en la pérdida del trabajo de un usuario.

El mecanismo aporta dos propiedades. La primera es atomicidad: el evento se escribe en la misma transacción que el cambio, de modo que no puede existir un cambio sin evento ni un evento que describa un cambio revertido. La segunda es que la exigencia queda expresada en la firma de la operación, y un servicio de escritura que no recibe el registrador no compila; la omisión deja de ser un olvido posible y pasa a ser un error de tipos.

**Exenciones declaradas.** Algunas escrituras no registran evento por diseño, como la edición del perfil propio, que ocurre fuera de toda actividad y por tanto fuera del objeto del historial (8.4 del general). Se marcan explícitamente como exentas: la exención es una anotación en el servicio, no la ausencia de una llamada. El catálogo de operaciones exentas es finito, se enumera en 5.4 y se revisa cada vez que se agrega una operación de escritura al núcleo.

**Efectos externos.** Ninguna operación que salga del sistema ocurre dentro de la transacción. El envío de correo (6.1) se encola al confirmar y se ejecuta después: un tiempo de espera agotado del servidor de correo revertiría un cambio ya válido, y una operación de dominio no debe quedar sujeta a la disponibilidad de un servicio ajeno. El fallo del efecto externo se registra sin afectar a la operación que lo originó.

**Registro de decisión — envoltura en servicios frente a interceptor en rutas.** Un interceptor situado en la capa de rutas es más barato de escribir y no obliga a tocar cada servicio. Se descartó por lo que 8.2 del general ya anticipa: ve la petición y la respuesta, pero no el estado previo. El historial conserva el contenido de lo eliminado y el valor anterior de lo modificado, y esos datos solo los conoce el servicio en el instante anterior a sobrescribirlos. Un interceptor produciría eventos que documentan que algo cambió sin poder describir qué era antes, que es precisamente la parte útil del registro.

## **2.5 Acceso a datos**

El manejador es PostgreSQL y el acceso se resuelve con Prisma (2.2 del general). Los servicios reciben el cliente de Prisma, o el cliente de transacción cuando operan dentro de la envoltura de 2.4, y no construyen consultas fuera de su propio módulo: la frontera entre módulos de 3.4 del general se sostiene por disciplina de servicio y no por una interfaz de repositorio, que sobre un cliente ya tipado añadiría una capa sin criterio propio.

**Lo que Prisma no cubre y se escribe como migración con SQL.** Dos casos, ambos derivados de decisiones ya tomadas. La unicidad del correo sin distinguir mayúsculas (6.2) exige la extensión citext o un índice único sobre la forma en minúsculas, y ninguna se declara en el esquema. Las restricciones de verificación tampoco: de las ocho reglas de 4.6 del general, dos pueden reforzarse en la base de datos —que un comentario tenga exactamente un destino, y que solo las membresías de co-organizador tengan filas de permisos—, y hacerlo no sustituye a la prueba de contrato, que sigue siendo obligatoria, pero convierte un dato inconsistente en un error de escritura en lugar de en un dato que entra sin protestar.

**Registro de decisión — Prisma frente a consultas escritas a mano.** La alternativa era un cliente de Postgres sin mapeador, con las consultas en SQL. Habría conservado la dirección de la verdad sin necesidad de verificación de deriva, y evitado la clase de consulta que un mapeador genera de forma poco eficiente sin que quien la escribió lo advierta. Se descartó porque el contrato tipado de extremo a extremo (3.4) pierde su continuidad en la frontera con la base de datos: cada resultado tendría que tiparse a mano, y ese tipado escrito por una persona es exactamente la clase de duplicado que diverge en silencio. Del enfoque descartado se conserva la posibilidad de bajar a SQL donde la consulta lo pida, en particular en la consulta del historial con filtros combinados.

**Riesgo asumido.** Los tipos que Prisma genera describen filas y son internos a esta capa; su exportación al paquete compartido acoplaría el cliente al esquema y está prohibida por 3.4. Es fácil de violar sin querer, porque el tipo generado suele parecerse mucho al de la respuesta, y por eso la regla se verifica con una regla de ESLint que prohíbe importar el cliente fuera de la capa de acceso.

# **3\. Contrato de la API**

La API es la frontera entre las dos aplicaciones del monorepo y, por tanto, entre la lógica de dominio y la de presentación. El general fija que existe y que es REST (3.1); este capítulo fija su forma, cómo se autentica, y qué información revela una respuesta cuando la acción no procede.

## **3.1 Convenciones**

- **Prefijo y versión.** Todas las rutas cuelgan de /api. No se versiona en la ruta: existe un solo cliente y se despliega junto al servidor, de modo que el versionado sería infraestructura sin consumidor.

- **Nombres.** Recursos en plural y en español, consistente con la convención de 2.3 del general para entidades de dominio. El anidamiento no excede dos niveles: /actividades/{id}/equipos, y a partir de ahí el recurso se direcciona por su propio identificador, /equipos/{id}/elementos.

- **Verbos.** GET, POST, PATCH y DELETE. PATCH aplica actualizaciones parciales y PUT no se usa, porque ningún recurso del núcleo se reemplaza íntegro.

- **Las transiciones no son actualizaciones.** Avanzar de fase no se expresa como la escritura del campo de estado sino como una acción con nombre propio. Permitir escribir el estado por PATCH abriría una vía para saltarse la máquina de estados de 6.1, que es una de las reglas cubiertas por pruebas de contrato.

Códigos de respuesta y su significado en este sistema:

| Código | Cuándo                                                                                |
| :----- | :------------------------------------------------------------------------------------ |
| 200    | Lectura, o escritura que devuelve el recurso resultante                               |
| 201    | Creación, con la ubicación del recurso creado                                         |
| 204    | Escritura que no devuelve cuerpo                                                      |
| 400    | La petición está mal formada                                                          |
| 401    | No hay sesión, o venció                                                               |
| 403    | El actor es miembro de la actividad y su rol no permite la acción                     |
| 404    | El recurso no existe, o el actor no puede saber que existe (3.3)                      |
| 409    | La fase de la actividad no habilita la acción, o se viola una restricción de unicidad |
| 422    | La petición está bien formada pero incumple una regla de dominio                      |
| 429    | Se excedió el límite de intentos (3.3)                                                |

**Forma del error.** Un objeto único con un código estable legible por máquina, un mensaje en español dirigido a la persona y, cuando el fallo es de validación, el detalle por campo. El cliente decide qué mostrar a partir del código y nunca a partir del texto del mensaje, de modo que reescribir un mensaje no rompa el comportamiento de la interfaz.

**Fechas.** Se transmiten en formato ISO 8601 y en UTC; la conversión a hora local es responsabilidad del cliente. Las transiciones automáticas por vencimiento de fecha (6.1 del general) se evalúan contra el final del día en la zona horaria de la plataforma, fijada en América/Ciudad\_de\_México. Sin esa definición, la frase “al vencer la fecha” admite un margen de casi un día según dónde se evalúe.

**Paginación.** Los listados acotados, como los participantes o los equipos de una actividad, se paginan por desplazamiento y límite. El historial se pagina por cursor, porque es la única relación que crece sin cota dentro de una actividad y porque paginar por desplazamiento un registro al que se agregan filas mientras se recorre hace que se omitan eventos entre una página y la siguiente.

## **3.2 Autenticación y sesión**

**Registro de decisión — sesión en servidor frente a token firmado.** Se adopta una cookie de sesión con el identificador guardado en el servidor. La alternativa, un token firmado y autocontenido, se descartó por una razón que no es de preferencia sino de cumplimiento: 7.4 del general establece que una cuenta desactivada pierde todo acceso. Un token ya emitido no puede invalidarse, de modo que la persona desactivada seguiría operando hasta que venciera. Cumplir la regla con tokens obliga a consultar una lista de revocación en cada petición, que es una sesión en servidor con un paso adicional y ninguna ventaja. El mismo argumento aplica a la desactivación de una membresía (6.3), que debe retirar los permisos dentro de una actividad de forma inmediata. El costo asumido es que el servidor guarda estado de sesión, lo que excluye un escalado horizontal sin almacén compartido; no es una restricción relevante para el despliegue previsto.

El mecanismo concreto:

- La cookie es httpOnly, Secure y con política de mismo sitio. Al no ser accesible desde JavaScript, queda descartada la clase de robo de sesión por script inyectado.

- El identificador de sesión se rota al iniciar sesión, de modo que un identificador obtenido antes de la autenticación no quede asociado a la cuenta.

- La sesión tiene vencimiento por inactividad y vencimiento absoluto. Los valores concretos son P-22.

- Cerrar sesión elimina el registro en el servidor, no solo la cookie del navegador.

- Al desactivar una cuenta se eliminan además sus sesiones activas. Sin ese paso, la regla de 7.4 se cumpliría solo a partir del siguiente inicio de sesión, que es exactamente lo que la decisión anterior buscaba evitar.

- Cambiar la contraseña, sea desde el perfil o mediante un enlace de recuperación, elimina las demás sesiones activas del usuario. Es el mismo argumento de revocación que motivó la decisión anterior.

- El cliente y la API se sirven bajo el mismo origen en producción, mediante proxy inverso. Es lo que permite una política de mismo sitio estricta en la cookie y elimina la necesidad de peticiones entre orígenes con credenciales.

**Contraseñas.** Se almacena una derivación irreversible con función de costo configurable, no la contraseña ni una forma recuperable de ella, conforme al diccionario de 5.1 del general. El cifrado, que es reversible por definición, no sirve para este propósito: el sistema nunca necesita recuperar la contraseña, solo comprobar que coincide.

**Límite de intentos.** Se aplica al inicio de sesión, al registro y a la consulta por clave de ingreso (3.3). La respuesta a credenciales incorrectas no distingue entre correo inexistente y contraseña equivocada, para no convertir el formulario de acceso en un verificador de qué correos están registrados.

## **3.3 Qué revela una respuesta denegada**

El general establece que quien no es miembro de una actividad no tiene ningún acceso a ella, sea cual sea su rol en otras (7.3). La forma de la respuesta decide si esa regla se cumple de verdad: responder 403 a un no miembro confirma que la actividad existe, y con ello permite a cualquiera con una sesión recorrer identificadores y averiguar cuántas actividades hay en la plataforma y cuáles corresponden a qué identificador.

| Situación                                              | Respuesta | Motivo                                                                                                  |
| :----------------------------------------------------- | :-------- | :------------------------------------------------------------------------------------------------------ |
| El actor no es miembro de la actividad                 | 404       | No debe poder distinguir entre que no existe y que no es suya                                           |
| El actor es miembro y su rol no permite la acción      | 403       | Ya sabe que la actividad existe; ocultarlo no protege nada y empeora el mensaje                         |
| El actor es miembro y la fase no habilita la acción    | 409       | Es una condición temporal y no un problema de permisos; el mensaje puede decir en qué fase será posible |
| La clave de ingreso no corresponde a ninguna actividad | 404       | Con límite de intentos, para que la clave no sea adivinable por repetición                              |

**La excepción del flujo de unión.** Unirse por clave obliga a confirmar la existencia de una actividad ante alguien que todavía no es miembro. Ese endpoint se direcciona por la clave y no por el identificador, de modo que no ofrece un espacio enumerable: la clave es una cadena generada y no un consecutivo. Aun así es el único punto de la API en que un tercero obtiene información de una actividad ajena, por lo que devuelve únicamente lo mínimo para decidir si unirse, que es el nombre de la actividad, su objetivo y el nombre de quien la organiza, y está sujeto a límite de intentos por sesión y por origen.

## **3.4 Tipos compartidos**

El paquete de tipos compartidos es dependencia de compilación de los tres subsistemas, de modo que todo lo que entra en él es contrato y su modificación afecta a trabajo ajeno. Esa consecuencia determina el criterio de qué incluir.

**Vive en el paquete compartido:** las enumeraciones del dominio, que son los estados de la actividad, los roles, los estados de cada función de seguimiento y las categorías de evento; el catálogo de acciones de 2.2; la forma de petición y de respuesta de cada endpoint; y los esquemas de validación de los que se derivan tanto la verificación del servidor como la del formulario del cliente (4.4).

**No vive en él:** las formas de fila de la base de datos, que son internas a la capa de acceso a datos y cuya filtración al paquete compartido acoplaría el cliente al esquema; y los modelos de vista del cliente, que existen para la presentación y cambian con ella.

# **4\. Anatomía del cliente**

El general fija la organización por features, el flujo unidireccional de datos y la división del estado entre servidor y cliente (2.1, 3.5 y 3.6). Este capítulo fija lo que falta para construir: el árbol de rutas, la convención de claves de query con su regla de invalidación, y el mecanismo por el que la interfaz se deriva de la configuración de la actividad en lugar de reimplementar la matriz de permisos.

## **4.1 Rutas y guardas**

El árbol tiene tres zonas: la pública, accesible sin sesión; la privada general, que exige sesión; y el contexto de actividad, que además exige membresía.

| Zona                  | Rutas                                                                                               | Exige                     |
| :-------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------ |
| Pública               | Inicio, contenido formativo, ingreso y registro                                                     | Nada                      |
| Privada general       | Mis actividades, crear actividad, perfil                                                            | Sesión                    |
| Contexto de actividad | Resumen, configuración, participantes, equipos, espacio de equipo, bitácora, evaluación e historial | Sesión y membresía activa |

La ruta de contexto de actividad carga la actividad junto con el conjunto de capacidades del actor (4.3) y lo pone a disposición de todas sus rutas hijas. Ninguna pantalla vuelve a pedir esa información, y ninguna decide por su cuenta qué puede hacer el usuario.

**Manejo de las respuestas de la API.** Una respuesta 401 cierra la sesión local y redirige al ingreso conservando el destino, para retomarlo después de autenticarse. Una respuesta 403 muestra la acción como no disponible dentro del contexto, sin sacar al usuario de donde está. Una respuesta 404 en el contexto de actividad muestra una pantalla de actividad no encontrada, idéntica tanto si la actividad no existe como si el actor no es miembro: si la interfaz distinguiera ambos casos, filtraría por la vista lo que 3.3 se ocupa de ocultar en la API.

## **4.2 Claves de query e invalidación**

La clave de cada query reproduce la ruta del recurso, de modo que la jerarquía de claves y la de la API coincidan y la invalidación por prefijo tenga un significado predecible, como pide 3.5 del general.

| Dato                                | Clave                                       |
| :---------------------------------- | :------------------------------------------ |
| Actividades del usuario             | \['actividades'\]                           |
| Una actividad con sus capacidades   | \['actividades', id\]                       |
| Participantes de una actividad      | \['actividades', id, 'participantes'\]      |
| Equipos de una actividad            | \['actividades', id, 'equipos'\]            |
| Un equipo con su espacio de trabajo | \['equipos', idEquipo\]                     |
| Historial de una actividad          | \['actividades', id, 'historial', filtros\] |

**Regla de invalidación.** Toda mutación invalida el prefijo más corto que contenga el dato modificado. Los casos que no son evidentes:

| Mutación                                  | Invalida                                                                                                                     |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| Asignar o mover un participante de equipo | Los equipos y los participantes de la actividad, más el equipo de origen y el de destino                                     |
| Avanzar de fase                           | La actividad completa, porque el cambio de fase modifica el conjunto de capacidades y con él lo que la interfaz debe mostrar |
| Cambiar la configuración de una función   | La actividad completa, por la misma razón                                                                                    |
| Escribir en el espacio de un equipo       | Ese equipo                                                                                                                   |
| Cualquier mutación registrable            | Además, el historial de la actividad                                                                                         |

La última fila no implica una petición adicional por cada escritura: una query invalidada que no está montada queda marcada como obsoleta y se vuelve a pedir cuando la pantalla del historial se abre, no antes.

## **4.3 La interfaz se deriva de las capacidades, no las recalcula**

Lo que un usuario ve dentro de una actividad depende de tres cosas a la vez: su rol, la fase de la actividad y la configuración de funciones. La combinación de las tres es, exactamente, la matriz de permisos del general. Si el cliente la evalúa por su cuenta, la matriz existe dos veces y en dos lenguajes, y diverge en la primera corrección que se aplique a una sola de las copias.

**Decisión.** El recurso de actividad incluye, calculado por el servidor con la función de 2.2, el conjunto de acciones que el actor puede ejecutar en ella en ese momento. El cliente pregunta si una acción pertenece a ese conjunto y decide qué mostrar; no consulta el rol ni la fase para tomar esa decisión.

Tres consecuencias hacen que la decisión valga el campo adicional en la respuesta. Corregir la matriz pasa a ser un cambio en un solo lugar. Un cambio de fase actualiza la interfaz sin lógica adicional, porque las capacidades se invalidan junto con la actividad (4.2). Y el principio de que el cliente no autoriza (7.4 del general) se conserva intacto: mostrar un control de más no concede nada, porque el servidor vuelve a evaluar la misma función al recibir la petición.

**Alternativa descartada.** Replicar la matriz en el cliente. Su única ventaja es ahorrar un campo en la respuesta; su costo es mantener una segunda fuente de verdad de la regla más crítica del sistema, en un lenguaje distinto y sin las pruebas de contrato que cubren la primera.

**Derivación desde la configuración de funciones.** Una función deshabilitada no se muestra atenuada: para el participante no existe en la interfaz, y para quien organiza aparece únicamente en la pantalla de configuración, que es donde la decisión sobre ella tiene sentido. La pantalla de una actividad se compone de las secciones que su configuración habilita, de modo que dos actividades con configuraciones distintas no son la misma pantalla con partes apagadas sino dos composiciones diferentes.

## **4.4 Formularios y validación**

Un mismo esquema, declarado en el paquete compartido, valida en el cliente mientras se escribe y en el servidor al recibir. Evita el desajuste habitual en el que el cliente acepta un valor que el servidor rechaza, y hace que agregar una restricción sea un cambio en un solo archivo. La validación del cliente es de conveniencia, porque adelanta el error a la persona; la del servidor es la que decide.

**El caso de los instrumentos.** Los campos de una rúbrica, de una autoevaluación o de un reporte estructurado son datos y no esquema, por la decisión de instrumentos genéricos de 4.2 del general. Su formulario se construye en tiempo de ejecución a partir de la definición del instrumento, y su validación se deriva del tipo de cada campo. Es la contrapartida prevista de aquella decisión: la validación deja de ser estática y pasa a ser una función de los datos, en el cliente y en el servidor por igual. Lo que la hace sostenible es que la función es la misma en ambos lados y vive en el paquete compartido.

## **4.5 Estados de pantalla**

Toda pantalla que lee del servidor define cuatro estados además del normal: carga, vacío, error y sin acceso. Se resuelven con componentes del sistema de diseño y no se reescriben pantalla por pantalla, que es la vía habitual por la que la interfaz pierde consistencia.

**El modo de solo lectura no se implementa.** Una actividad archivada es de solo lectura para todos, incluido el organizador (7.4 del general). No hace falta código para ello: el conjunto de capacidades de una actividad archivada llega sin ninguna acción de escritura, de modo que el mecanismo de 4.3 produce el modo de lectura por sí solo. Lo único propio es un aviso persistente que explique por qué no hay acciones disponibles, porque una interfaz sin controles y sin explicación se lee como un error.

**El estado vacío indica la causa.** No es lo mismo que no haya equipos porque la formación aún no ha ocurrido que porque nadie se ha unido todavía. El estado vacío nombra la causa y, cuando el actor tiene el permiso para resolverla, ofrece la acción que corresponde.

# **5\. Historial: captura, catálogo y consulta**

El general fija el propósito del historial, sus tres categorías, el esquema de la relación y la regla de que la emisión ocurre en la capa de servicios (8). Este capítulo especifica lo que difirió: el catálogo completo de tipos de evento, qué conserva cada uno, la regla de agregación de ediciones repetidas, lo que queda fuera del registro y cómo se consulta.

## **5.1 Qué conserva cada evento**

El mecanismo de captura es el descrito en 2.4 y no se repite aquí. Lo que corresponde fijar es el contenido del campo de datos, que según 5.5 del general debe bastar para entender el evento sin consultar la entidad afectada, requisito que existe porque la entidad puede haber desaparecido.

| Tipo de operación       | Qué conserva el campo de datos                                                              |
| :---------------------- | :------------------------------------------------------------------------------------------ |
| Creación                | Identificación legible de lo creado: nombre del equipo, tipo y primeras líneas del elemento |
| Modificación            | Valor anterior y valor nuevo del campo modificado, no el registro completo                  |
| Eliminación             | Contenido íntegro de lo eliminado, que es el único lugar donde sobrevive                    |
| Transición de fase      | Fase de origen, fase de destino y si la disparó una persona o el vencimiento de una fecha   |
| Cambio de configuración | Función afectada, estado anterior y estado nuevo                                            |

## **5.2 Catálogo de tipos de evento**

La categoría, y no el tipo, determina la visibilidad del evento (8.1 del general). Por eso el catálogo se declara con ambas columnas juntas: un tipo nuevo sin categoría asignada sería invisible para todos o visible de más, y ninguna de las dos cosas se detecta al probar la aplicación a mano.

| Categoría  | Tipos de evento                                                                                 | Módulo      |
| :--------- | :---------------------------------------------------------------------------------------------- | :---------- |
| Aportación | Elemento del espacio de equipo creado, modificado o eliminado                                   | Seguimiento |
| Aportación | Reporte de trabajo creado, modificado o eliminado                                               | Seguimiento |
| Aportación | Entrada de bitácora creada, modificada o eliminada                                              | Seguimiento |
| Aportación | Instrumento respondido: autoevaluación individual, autoevaluación grupal o evaluación por pares | Evaluación  |
| Estructura | Actividad creada                                                                                | Actividades |
| Estructura | Fase avanzada, con actor de tipo persona o de tipo sistema                                      | Actividades |
| Estructura | Configuración de una función modificada                                                         | Actividades |
| Estructura | Invitación enviada, aceptada o rechazada                                                        | Actividades |
| Estructura | Participante incorporado por clave de ingreso                                                   | Actividades |
| Estructura | Participante desactivado de la actividad                                                        | Actividades |
| Estructura | Co-organizador agregado, retirado, o sus permisos modificados                                   | Actividades |
| Estructura | Equipo creado o renombrado                                                                      | Equipos     |
| Estructura | Participante asignado a un equipo o reasignado entre equipos                                    | Equipos     |
| Estructura | Reparto automático de participantes sin equipo ejecutado, con actor de tipo sistema             | Equipos     |
| Evaluación | Calificación asignada o modificada                                                              | Evaluación  |
| Evaluación | Comentario dirigido a un equipo escrito                                                         | Evaluación  |
| Evaluación | Comentario individual escrito                                                                   | Evaluación  |
| Evaluación | Insignia otorgada                                                                               | Insignias   |

**Los cambios de configuración se registran todos.** No solo los que retiran a los participantes algo que ya estaban usando, conforme a la categoría de estructura de 8.1 del general. Registrar también las habilitaciones cuesta lo mismo y hace legible cómo evolucionó la actividad. Al quedar en la categoría de estructura, el cambio es visible para los participantes y no solo para quien organiza, lo que es coherente con que la configuración determina lo que cada uno puede hacer.

**Regla de extensión.** Agregar un tipo de evento es agregar una fila a este catálogo con su categoría, y no un cambio de esquema. Ningún subsistema puede escribir un tipo que no esté en él. El otorgamiento de insignia es el único tipo aportado por un subsistema ajeno al núcleo (8.7 del general) y aparece aquí porque la categoría la fija este catálogo, no quien emite el evento.

## **5.3 Agregación de ediciones consecutivas**

Editar un elemento del espacio de equipo diez veces en cinco minutos, que es el comportamiento normal de quien redacta, produce diez eventos y vuelve ilegible la consulta que el historial existe para servir. El general encarga resolverlo a este documento (8.4).

**Decisión.** La agregación ocurre al consultar y no al escribir. Se agrupan los eventos que comparten actor, entidad y tipo, y cuya separación no excede una ventana de tiempo. El grupo se presenta como una sola entrada con el número de ediciones y el intervalo que abarcan, y puede desplegarse para ver los eventos individuales.

**Registro de decisión — agregar al leer frente a agregar al escribir.** Fusionar el evento nuevo con el anterior en el momento de escribirlo ahorra almacenamiento y produce el mismo resultado en la lectura habitual. Se descartó porque destruye los valores intermedios: si alguien modifica un texto tres veces, la fusión conserva el primer valor anterior y el último valor nuevo, y pierde el recorrido. El historial es un registro, y una agregación irreversible lo convierte en un resumen del que ya no se puede volver atrás. Agregar al leer conserva ambas lecturas y deja la ventana como un parámetro ajustable en lugar de una decisión grabada en los datos.

El valor de la ventana es P-23.

## **5.4 Lo que no se registra**

La enumeración es exhaustiva y coincide con el catálogo de operaciones exentas de 2.4, que es lo que permite que la comprobación de aquella sección sea una regla y no una excepción negociable caso por caso.

- Lecturas de cualquier tipo, conforme a 8.1 del general. Nadie queda registrado por consultar.

- Navegación, filtros y ordenamientos aplicados a una consulta.

- Intentos fallidos por falta de permiso o por fase. No constituyen aportación ni cambio, y su lugar es el registro técnico del servidor.

- Inicio y cierre de sesión, y registro de cuenta: ocurren fuera de toda actividad y el objeto del historial es la participación dentro de una.

- Edición del perfil propio, por la misma razón.

- Las acciones del administrador sobre cuentas, recursos formativos y catálogo de insignias, que 8.4 del general excluye expresamente.

La lista se revisa cada vez que se agrega una operación de escritura al núcleo, y crecer no es su comportamiento esperado: la mayoría de las operaciones nuevas registran.

## **5.5 Consulta**

Hay dos entradas a la consulta. La de quien organiza recorre la actividad completa. La del participante está acotada por 7.3 del general y por el alcance que resuelva P-10, y su implementación no cambia según cuál sea la respuesta, porque el recorte se aplica como filtro y no como una consulta distinta.

**El filtro de visibilidad se aplica en el servidor.** No es un parámetro que el cliente envíe. Un filtro que el cliente puede enviar es un filtro que el cliente puede omitir, y la categoría del evento existe precisamente para que esta decisión se resuelva con una condición y no con una regla replicada en cada pantalla (4.2 del general).

**Filtros disponibles.** Por participante, por equipo, por categoría y por intervalo de fechas, combinables entre sí. El orden por defecto es cronológico inverso. La vista por participante es la que responde la pregunta que motiva el historial, que es cómo contribuye cada quien a lo largo del trabajo, y por eso está a un clic desde la lista de participantes y no solo desde la pantalla de historial.

## **5.6 Preguntas abiertas derivadas de estos capítulos**

**P-22 — Vencimiento de la sesión**

**Afecta:** autenticación (3.2), módulo de Cuentas.

**Propuesta por defecto:** cierre por inactividad a las ocho horas y vencimiento absoluto a los treinta días.

**Qué necesitamos confirmar:** si el uso previsto incluye equipos compartidos, como los de un laboratorio de cómputo, un plazo de inactividad más corto reduce el riesgo de que alguien encuentre una sesión abierta. La contrapartida es pedir la contraseña con más frecuencia durante una jornada de trabajo.

**P-23 — Ventana de agregación de ediciones consecutivas**

**Afecta:** consulta del historial (5.3).

**Propuesta por defecto:** quince minutos. Las ediciones del mismo actor sobre la misma entidad separadas por menos de ese intervalo se presentan agrupadas.

**Qué necesitamos confirmar:** si quince minutos corresponde al ritmo de trabajo esperado, o si conviene una ventana mayor para que una sesión de redacción completa aparezca como una sola entrada. La decisión es reversible sin migración, por lo dicho en 5.3.

# **6\. Cuentas y sesión**

El módulo cubre el registro, la autenticación, el perfil, la búsqueda de usuarios y los endpoints administrativos que consume el panel de administración. Es el único módulo del que dependen todos los demás, dentro y fuera del núcleo, y por eso se construye primero.

## **6.1 Correo electrónico**

Ni el documento de concepto ni el general contemplan envío de correo: las invitaciones son una relación que el destinatario consulta dentro de la plataforma, y el restablecimiento de contraseña figura como acción de soporte del administrador (7.2 del general). Este documento introduce el envío, porque el segundo de esos mecanismos arrastra una limitación que se identificó durante la operación de Argumente y que conviene no heredar.

El restablecimiento mediado por el administrador no puede verificar quién solicita el cambio. La persona pide la contraseña por un canal ajeno al sistema, sea un mensaje o una conversación, y el administrador la restablece confiando en que quien escribe es el titular, porque no dispone de ninguna forma de comprobarlo. Un enlace enviado a la dirección registrada sí lo comprueba: solo llega a quien controla esa cuenta de correo. La verificación de identidad deja de depender del criterio de una persona y pasa a depender de un mecanismo.

A eso se añade el costo de operación. Cada olvido se convierte en una solicitud que exige a alguien con privilegios de administrador estar disponible, y en un contexto escolar los momentos de mayor demanda son el inicio del curso y el cierre del periodo, que son precisamente los de menor disponibilidad. El mecanismo no falla por descuido de quien lo atiende: deja de sostenerse en cuanto crece el número de cuentas. Incorporar el autoservicio ahora cuesta una entidad y una decisión de infraestructura; incorporarlo cuando el problema se manifieste, en la fase C o después, cuesta bastante más.

**Alcance cerrado.** El sistema envía correo para tres cosas y ninguna más: verificar la dirección al registrarse, restablecer la contraseña y avisar de una invitación a una actividad. Quedan fuera los avisos de cambio de fase, los recordatorios de fecha, el aviso de calificación asignada y el de insignia recibida. Ninguno se ha pedido, todos son plausibles, y son la clase de funcionalidad que crece sin límite una vez que el mecanismo existe. La lista cerrada es lo que impide que el correo se convierta en un módulo que compita por el calendario con el resto del núcleo.

**El envío no participa de la transacción.** Se aplica la regla de efectos externos de 2.4: el mensaje se encola al confirmar y se entrega después. La consecuencia para la interfaz es que ninguna pantalla afirma que el correo llegó, sino que se envió, y ofrece reenviarlo.

**Modo de desarrollo.** El envío escribe el mensaje en disco en lugar de entregarlo cuando la configuración así lo indica, de modo que levantar el proyecto no exija credenciales de un servidor de correo. Es requisito del entorno reproducible de 2.6 del general.

**El administrador conserva el restablecimiento.** 7.2 del general se lo atribuye y se mantiene, pero deja de ser el mecanismo único y pasa a ser el respaldo para cuando la entrega falla. Es la diferencia entre una vía alternativa y una dependencia.

**La entidad que sostiene ambos flujos.** La verificación y la recuperación necesitan lo mismo: un valor de un solo uso, con vencimiento, asociado a una persona. Se modelan como una sola relación con un atributo de tipo, en lugar de dos relaciones paralelas, siguiendo el mismo criterio que el general aplica a la configuración de funciones y a los instrumentos de evaluación (4.2). Dos relaciones duplicarían la lógica de vencimiento y de uso único sin aportar ninguna diferencia semántica.

| Atributo           | Descripción                                                                                                                                                                       |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id\_token          | Llave primaria                                                                                                                                                                    |
| id\_usuario        | Llave foránea a la persona a la que pertenece                                                                                                                                     |
| tipo               | Verificación o recuperación                                                                                                                                                       |
| hash\_token        | Derivación irreversible del valor enviado. No se guarda el valor: quien lea la base de datos no debe poder usar un enlace ajeno, por la misma razón que con las contraseñas (3.2) |
| fecha\_vencimiento | Veinticuatro horas para la verificación, una hora para la recuperación                                                                                                            |
| fecha\_uso         | Nula mientras no se haya usado. Un token usado no vuelve a servir                                                                                                                 |

La relación está definida en 4.4 del general y descrita atributo por atributo en su sección 5; la tabla anterior la reproduce por comodidad de lectura, no como definición. Existe a lo más un token vigente por persona y tipo: emitir uno nuevo invalida el anterior. Usar un token de recuperación cierra además todas las sesiones activas de esa cuenta, por el argumento de revocación de 3.2.

## **6.2 Registro y credenciales**

El registro pide nombre, apellido paterno, apellido materno, correo y contraseña, conforme al diccionario de 5.1 del general. El correo es único y se compara sin distinguir mayúsculas, para que dos registros que difieren solo en eso no produzcan dos cuentas de la misma persona.

**Verificación de la dirección.** Al registrarse se envía un enlace de verificación. La cuenta queda utilizable de inmediato, pero una dirección sin verificar no aparece en la búsqueda de candidatos al invitar (6.4) ni puede recibir invitaciones. La restricción se aplica exactamente donde el correo importa: es la llave con la que quien organiza busca a alguien, y admitir direcciones sin confirmar permitiría registrarse con el correo de otra persona para recibir sus invitaciones. Bloquear el acceso completo hasta verificar sería más simple de implementar, pero convierte cualquier fallo de entrega en una cuenta inservible que solo el administrador puede rescatar, que es precisamente la dependencia que este capítulo elimina. La decisión queda registrada en P-30.

**Colisión de correo.** Un correo ya registrado produce un rechazo explícito. Ocultarlo obligaría a aceptar el registro sin crear nada y avisar por correo al titular, que deja sin cuenta y sin explicación a quien se registró de buena fe. Se asume por tanto que el formulario de registro revela si una dirección tiene cuenta, acotado por el límite de intentos de 3.2. Conviene ser consciente de la consecuencia: como el registro lo revela, que el formulario de recuperación responda igual exista o no la dirección no oculta nada que no esté ya expuesto. Se mantiene esa respuesta indistinta porque no cuesta nada, no porque cierre el hueco.

**Contraseña.** Longitud mínima de ocho caracteres, sin reglas de composición que obliguen a mezclar tipos de carácter. La longitud aporta más resistencia que la composición y las reglas de composición empujan a patrones predecibles. Se almacena la derivación irreversible descrita en 3.2.

## **6.3 Perfil y visibilidad entre usuarios**

El perfil propio permite editar nombre y apellidos, y cambiar la contraseña exigiendo la anterior. El correo no es editable en el alcance actual: es el identificador de acceso y la llave con la que se busca a alguien para invitarlo, y cambiarlo sin verificación permitiría apropiarse de una dirección ajena.

De otro usuario solo se ven el nombre y sus rangos de insignia (7.2 del general). El correo nunca se muestra; sirve como criterio de búsqueda para quien ya lo conoce, no como dato consultable. Mientras el subsistema de recompensas no exista, los rangos se resuelven contra la implementación vacía descrita en 1.3 y el perfil se muestra sin ellos.

## **6.4 Búsqueda de usuarios**

La propuesta por defecto de P-11 limita la búsqueda al flujo de invitación y a quien organiza. Eso determina dónde vive el endpoint.

**Registro de decisión — la búsqueda cuelga de la actividad.** En lugar de un endpoint general de usuarios con una comprobación especial de quién puede llamarlo, la búsqueda de candidatos es un recurso de la actividad. Así la autorización es consecuencia de la ruta y no una excepción: solo quien tiene permiso de invitar en esa actividad puede consultarla, y esa comprobación es la misma que la de cualquier otra ruta anidada (2.1). Si P-11 se resuelve en sentido contrario y se decide que cualquier usuario pueda buscar a otros, se agrega un endpoint general sin retirar este.

**Forma de la búsqueda.** Por correo, únicamente coincidencia exacta, de modo que no sea posible recorrer el directorio probando fragmentos. Por nombre, coincidencia parcial con un mínimo de tres caracteres, número acotado de resultados y límite de intentos. El filtro por rango de insignia depende del subsistema de recompensas y es el primer elemento del orden de recorte de 9.6 del general.

## **6.5 Endpoints**

| Método y ruta                            | Quién         | Qué hace                                                         |
| :--------------------------------------- | :------------ | :--------------------------------------------------------------- |
| POST /api/usuarios                       | Público       | Registra una cuenta                                              |
| POST /api/sesion                         | Público       | Inicia sesión y emite la cookie                                  |
| DELETE /api/sesion                       | Usuario       | Cierra la sesión y elimina el registro en servidor               |
| GET /api/sesion                          | Usuario       | Devuelve el actor actual y su tipo de cuenta                     |
| GET /api/usuarios/yo                     | Usuario       | Perfil propio completo                                           |
| PATCH /api/usuarios/yo                   | Usuario       | Edita nombre y apellidos, o cambia la contraseña                 |
| GET /api/usuarios/{id}                   | Usuario       | Perfil básico de otro: nombre y rangos                           |
| GET /api/actividades/{id}/candidatos     | Organizador   | Busca usuarios para invitar (6.4)                                |
| POST /api/verificaciones/{token}         | Público       | Confirma la dirección de correo                                  |
| POST /api/verificaciones                 | Usuario       | Reenvía el enlace de verificación                                |
| POST /api/recuperaciones                 | Público       | Solicita restablecer la contraseña. Respuesta indistinta         |
| POST /api/recuperaciones/{token}         | Público       | Fija la nueva contraseña y cierra las sesiones                   |
| GET /api/admin/usuarios                  | Administrador | Lista de cuentas con su estado                                   |
| PATCH /api/admin/usuarios/{id}           | Administrador | Activa o desactiva la cuenta; al desactivar elimina sus sesiones |
| POST /api/admin/usuarios/{id}/contrasena | Administrador | Restablece la contraseña                                         |

Los tres últimos son la superficie que consume el panel de administración (1.3). Los expone este módulo porque el estado de la cuenta es dominio del núcleo y el panel no escribe sobre sus tablas (3.4 del general).

## **6.6 Pantallas**

| Pantalla               | Contenido                                                                                                                   |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| Registro               | Formulario con validación compartida (4.4). Al completarse, sesión iniciada y destino en mis actividades                    |
| Ingreso                | Correo y contraseña. Un solo mensaje de error para credenciales incorrectas (3.2)                                           |
| Mi perfil              | Datos editables, cambio de contraseña y rangos propios. Si la dirección no está verificada, aviso con la acción de reenviar |
| Verificar correo       | Destino del enlace. Confirma, o explica que el token venció y ofrece reenviarlo                                             |
| Recuperar contraseña   | Campo de correo y confirmación de que el mensaje se envió, sin decir si la dirección existe                                 |
| Nueva contraseña       | Destino del enlace de recuperación. Al completarse, sesión iniciada y el resto cerradas                                     |
| Perfil de otro usuario | Se abre desde la lista de participantes o desde la búsqueda al invitar. Nombre y rangos                                     |

## **6.7 Pregunta abierta de este módulo**

**P-24 — Servidor de correo del despliegue**

**Afecta:** todo el capítulo 6, invitaciones (7.3), entorno de despliegue.

**Propuesta por defecto:** el sistema entrega el correo a través de un servidor SMTP configurado por variable de entorno, y el despliegue provee uno.

**Qué necesitamos confirmar:** es la única pieza de este documento que depende de infraestructura ajena al equipo, y por eso conviene resolverla pronto. Si el sistema se despliega en servidores de la Universidad, hace falta saber si permiten salida de correo o exigen un relevo institucional, y quién administra esa cuenta. Si no hubiera servidor disponible, la recuperación automática de contraseña no puede existir y el módulo vuelve a depender del administrador, que es lo que esta decisión elimina. Condiciona el incremento de Cuentas de la fase A.

**P-30 — Alcance de la cuenta sin verificar**

**Afecta:** registro (6.2), búsqueda de candidatos (6.4).

**Propuesta por defecto:** la cuenta es utilizable desde el registro; lo único que la verificación habilita es aparecer en la búsqueda al invitar y poder recibir invitaciones.

**Qué necesitamos confirmar:** la alternativa es impedir el acceso hasta verificar, que es más estricta y más simple, pero deja fuera a quien no reciba el mensaje. ¿Se prefiere la restricción acotada o el bloqueo completo?

# **7\. Actividades**

Es el módulo más denso del núcleo y el que marca el ritmo de todo lo demás: ninguna funcionalidad de Equipos, Seguimiento o Evaluación puede probarse hasta que el ciclo de vida funcione. Cubre la creación y configuración, la clave de ingreso, las invitaciones, los co-organizadores y la ejecución de las transiciones que 6.1 del general define en abstracto.

## **7.1 Creación y configuración**

Crear una actividad exige nombre y objetivo, y nada más. Todo lo demás, incluidas las fechas, es opcional y editable mientras la actividad no salga de la fase de configuración, conforme a 6.1 del general.

**Configuración inicial de las funciones.** Al crearse la actividad se insertan las filas de configuración de las nueve funciones del catálogo de 6.2 del general. Una actividad con todas las funciones deshabilitadas es inutilizable, y obligar a configurar nueve funciones antes de empezar es una barrera desproporcionada para quien solo quiere organizar un trabajo en equipo. Se aplica por tanto una configuración por defecto: formación de equipos autogestionada, espacio de equipo con sus tres elementos como opcionales, y el resto deshabilitado. El conjunto concreto es P-25.

## **7.2 Clave de ingreso**

La clave se genera al abrir la inscripción y no antes, consistente con el diccionario de 5.1 del general, que la declara nula hasta ese momento.

**Forma.** Ocho caracteres de un alfabeto de treinta y dos, en mayúsculas y sin glifos que se confundan al dictarse o copiarse a mano, es decir sin cero ni O, y sin uno, ele ni i mayúscula. Se genera con un generador criptográficamente seguro y su unicidad se comprueba al insertar, reintentando si colisiona. El espacio resultante supera el billón de combinaciones, que con el límite de intentos de 3.2 hace inviable descubrir una clave por repetición.

**La clave no se borra al cerrarse la inscripción.** Deja de admitir uniones y no se reactiva (6.1 del general), pero se conserva porque la comprobación se hace sobre la fase de la actividad y no sobre la existencia de la clave. Borrarla obligaría a una segunda regla que dice lo mismo y dejaría el historial sin la referencia.

## **7.3 Invitaciones**

El general encarga a este documento la máquina de estados de la invitación (6.4). Los cuatro estados son los que ahí se enumeran.

| Transición          | Disparador                                                   | Efecto                                                            |
| :------------------ | :----------------------------------------------------------- | :---------------------------------------------------------------- |
| Enviada             | Quien organiza selecciona a un usuario de la búsqueda de 6.4 | Se crea la invitación y se avisa por correo al destinatario (6.1) |
| Enviada → aceptada  | Acción del destinatario                                      | Crea la membresía como participante, en la misma transacción      |
| Enviada → rechazada | Acción del destinatario                                      | La invitación se cierra. Puede emitirse otra después              |
| Enviada → caducada  | La actividad entra en periodo de cierre                      | Deja de poder aceptarse                                           |

**Por qué caduca en el cierre y no antes.** Cerrar la inscripción no invalida las invitaciones pendientes, porque 6.1 del general admite la incorporación tardía por invitación individual durante el desarrollo. Es precisamente el mecanismo previsto para quien llegó tarde, y anular las invitaciones al cerrar la inscripción lo desactivaría. El límite natural es el inicio del cierre, cuando la actividad deja de admitir trabajo nuevo.

**El correo avisa, la plataforma resuelve.** El mensaje informa de la invitación y enlaza a la plataforma; aceptarla o rechazarla ocurre dentro de la sesión y nunca desde el propio correo. Así la invitación no depende de la entrega para existir, y quien no reciba el aviso la encuentra igualmente en su pantalla de actividades.

**Unicidad.** Existe a lo más una invitación en estado enviada por pareja de actividad y usuario. Impide acumular invitaciones repetidas al mismo destinatario sin impedir volver a invitar a quien rechazó.

## **7.4 Condiciones y efectos de cada transición del ciclo de vida**

El general fija la secuencia de fases y las reglas que ningún subsistema puede romper, y remite aquí las condiciones concretas y los casos límite (6.1). Cada transición se dispara por acción de quien tiene el permiso o por vencimiento de una fecha, cuando la configuración la define.

| Transición                  | Disparador                                                                                     | Precondición                | Efecto                                                                                                    |
| :-------------------------- | :--------------------------------------------------------------------------------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Configuración → Inscripción | Acción de quien organiza                                                                       | Nombre y objetivo definidos | Genera la clave de ingreso                                                                                |
| Inscripción → Formación     | Acción, o vencimiento de la fecha límite de inscripción                                        | Al menos un participante    | La clave deja de admitir uniones                                                                          |
| Formación → Desarrollo      | Automática en modo autogestionado cuando nadie queda sin equipo; acción en los otros dos modos | Al menos un equipo          | Reparto automático de quienes quedaron sin equipo (8.3), como evento del sistema                          |
| Desarrollo → Cierre         | Acción, o llegada de la fecha de término                                                       | Ninguna                     | Cierra las aportaciones; abre calificación, evaluaciones e insignias; caducan las invitaciones pendientes |
| Cierre → Archivada          | Acción, o vencimiento del plazo de cierre                                                      | Ninguna                     | Solo lectura para todos, sin excepción de rol                                                             |

Los casos límite son los que deciden si la máquina de estados se comporta de forma previsible cuando la configuración y el uso no coinciden. Ninguno de los siguientes está resuelto por el general y todos ocurren con facilidad.

| Situación                                                                         | Comportamiento                                                                                                                                                              |
| :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La fecha límite de inscripción vence sin ningún participante                      | La transición no ocurre: la actividad permanece en inscripción y se avisa a quien organiza. Avanzar produciría una actividad sin nadie y sin vuelta atrás                   |
| La fecha límite de inscripción vence mientras la actividad sigue en configuración | No dispara nada. Una transición automática solo se evalúa desde su fase de origen                                                                                           |
| Quien organiza avanza de fase antes de que llegue la fecha                        | La fecha queda sin efecto. Las fases no retroceden y una transición no se ejecuta dos veces                                                                                 |
| Se cierra la formación sin ningún equipo creado, en modo manual                   | Se impide la transición y se explica. Sin equipos, el reparto automático no tiene destino                                                                                   |
| La actividad tiene un solo participante                                           | Se permite. Forma un equipo de una persona; la evaluación por pares queda sin destinatarios y se marca como no aplicable en lugar de como pendiente                         |
| Edición de fechas en fases posteriores                                            | La fecha de término es editable durante el desarrollo. La fecha límite de inscripción deja de ser editable una vez cerrada la inscripción, porque ya no puede disparar nada |

## **7.5 Ejecución de las transiciones automáticas**

**Registro de decisión — tarea programada frente a evaluación perezosa.** Evaluar la fecha al leer la actividad es más simple y no requiere proceso alguno, pero una actividad que nadie abre nunca transita: su ventana de otorgamiento de insignias permanece abierta indefinidamente y el evento del historial acaba fechado cuando alguien pasó por ahí, no cuando venció el plazo. Se adopta por eso una tarea programada que recorre las actividades con transición vencida y las hace avanzar, con el sistema como actor del evento. Se conserva además la evaluación al leer, no como mecanismo sino como salvaguarda: la capa de servicios comprueba la fecha antes de autorizar, de modo que un retraso de la tarea nunca autorice una acción que la fase ya no permite.

La comparación se hace contra el final del día en la zona horaria de la plataforma (3.1).

## **7.6 Co-organizadores**

Agregar un co-organizador es crear o transformar una membresía. Si la persona no es miembro, se crea con el rol correspondiente y el conjunto de permisos por defecto de 7.3 del general. Si ya es participante, su membresía cambia de rol.

**Consecuencia de promover a un participante.** Organizar y participar son condiciones excluyentes dentro de una misma actividad (7.3 del general), de modo que al pasar a co-organizador la persona deja su equipo y su lugar queda libre. Sus aportaciones previas permanecen en el espacio de ese equipo con su autoría, porque pertenecen al equipo y no a quien las escribió.

**Retirar el rol obliga a elegir destino.** Quitar el rol sin más dejaría una membresía de participante sin equipo, lo que rompe la regla de que todo participante de una actividad en desarrollo pertenece a exactamente un equipo (4.6 del general), que es una de las cubiertas por pruebas de contrato. La operación exige por tanto que quien organiza elija en el mismo paso entre asignarlo a un equipo como participante o desactivar su membresía. El sistema no ofrece un tercer camino porque el tercero es el estado inconsistente.

La modificación del conjunto de permisos de un co-organizador se registra en el historial, conforme a 7.3 del general.

## **7.7 Endpoints**

| Método y ruta                                            | Quién        | Qué hace                                                  |
| :------------------------------------------------------- | :----------- | :-------------------------------------------------------- |
| POST /api/actividades                                    | Usuario      | Crea la actividad y su membresía de organizador           |
| GET /api/actividades                                     | Usuario      | Actividades donde tiene membresía, con su rol en cada una |
| GET /api/actividades/{id}                                | Miembro      | Actividad, configuración y capacidades del actor (4.3)    |
| PATCH /api/actividades/{id}                              | Organizador  | Edita objetivo, fechas y demás datos                      |
| PUT /api/actividades/{id}/configuracion/{funcion}        | Organizador  | Fija el estado de una función                             |
| POST /api/actividades/{id}/inscripcion                   | Organizador  | Abre la inscripción y genera la clave                     |
| POST /api/actividades/{id}/inscripcion/cierre            | Organizador  | Cierra la inscripción y pasa a formación                  |
| POST /api/actividades/{id}/formacion/cierre              | Organizador  | Cierra la formación, con reparto automático               |
| POST /api/actividades/{id}/cierre                        | Organizador  | Inicia el periodo de cierre                               |
| POST /api/actividades/{id}/archivo                       | Organizador  | Da la actividad por finalizada                            |
| GET /api/claves/{clave}                                  | Usuario      | Vista previa mínima de la actividad (3.3)                 |
| POST /api/claves/{clave}/union                           | Usuario      | Se une como participante                                  |
| GET /api/actividades/{id}/participantes                  | Miembro      | Membresías con rol y estado                               |
| POST /api/actividades/{id}/invitaciones                  | Organizador  | Emite una invitación                                      |
| GET /api/invitaciones                                    | Usuario      | Invitaciones pendientes dirigidas al actor                |
| POST /api/invitaciones/{id}/respuesta                    | Destinatario | Acepta o rechaza                                          |
| PUT /api/actividades/{id}/coorganizadores/{idUsuario}    | Organizador  | Agrega o promueve, con sus permisos                       |
| DELETE /api/actividades/{id}/coorganizadores/{idUsuario} | Organizador  | Retira el rol, con el destino elegido (7.6)               |
| PATCH /api/actividades/{id}/participantes/{idMembresia}  | Organizador  | Desactiva o reactiva la membresía                         |

La única excepción a la regla de anidamiento de 3.1 son las dos rutas de clave, que no cuelgan de la actividad porque quien las llama todavía no es miembro y no debe poder direccionarla por identificador (3.3).

## **7.8 Pantallas**

| Pantalla                | Contenido                                                                                                              |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Mis actividades         | Actividades del usuario agrupadas por rol y por fase, con las invitaciones pendientes arriba                           |
| Crear actividad         | Nombre y objetivo, y el resto plegado como opcional                                                                    |
| Resumen de la actividad | Objetivo, fase actual con la acción que la hace avanzar, y accesos a las secciones que la configuración habilita (4.3) |
| Configuración           | Las nueve funciones con su estado. Las que ya tienen datos se muestran bloqueadas con el motivo (P-17)                 |
| Inscripción             | Clave de ingreso para compartir, búsqueda para invitar e invitaciones emitidas con su estado                           |
| Participantes           | Lista con rol, estado y equipo. Punto de entrada al historial por persona (5.5)                                        |
| Unirse con clave        | Campo de clave, vista previa mínima y confirmación                                                                     |

## **7.9 Preguntas abiertas de este módulo**

**P-25 — Configuración por defecto de una actividad nueva**

**Afecta:** creación (7.1), estados de las funciones (6.2 del general).

**Propuesta por defecto:** formación de equipos autogestionada, espacio de equipo con metas, avances y recursos como opcionales, y las demás funciones deshabilitadas. Quien organiza habilita lo que necesite.

**Qué necesitamos confirmar:** la propuesta favorece la autonomía del equipo, que es coherente con la interdependencia positiva de Johnson y Johnson, pero deja fuera por defecto la evaluación y el reporte de trabajo. ¿Es el punto de partida adecuado, o conviene que una actividad recién creada llegue con el seguimiento habilitado?

**P-26 — Transferencia de la organización de una actividad**

**Afecta:** modelo de membresías (4.2 del general), ciclo de vida (7.4).

**Propuesta por defecto:** no existe transferencia. Cada actividad tiene exactamente una membresía de organizador y no cambia de titular.

**Qué necesitamos confirmar:** la propuesta deja un hueco identificado al escribir este capítulo. Si la cuenta de quien organiza se desactiva, nadie puede iniciar el cierre ni dar la actividad por finalizada, porque ambas capacidades están reservadas al organizador y no son delegables por defecto. La actividad solo se archiva al vencer el plazo. Hay dos salidas: permitir la transferencia, o hacer que los dos permisos reservados puedan otorgarse a un co-organizador de forma permanente. La segunda ya existe en la matriz como permiso otorgable y no requiere nada nuevo.

# **8\. Equipos**

El módulo cubre los tres modos de formación, el reparto automático de quienes quedan sin equipo, la reasignación durante el desarrollo y el ciclo de vida de un equipo. Su regla invariante es la de 4.6 del general: todo participante de una actividad en desarrollo pertenece a exactamente un equipo.

## **8.1 Los tres modos de formación**

| Modo                             | Quién actúa                                                         | Cómo cierra                                                                                          |
| :------------------------------- | :------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------- |
| Autogestionado por participantes | Cada participante crea un equipo o se une a uno existente           | Automáticamente cuando nadie queda sin equipo, o por acción de quien organiza con reparto automático |
| Propuesta del sistema            | El sistema genera una propuesta que quien organiza edita y confirma | Siempre por acción explícita                                                                         |
| Asignación manual                | Quien organiza crea los equipos y asigna a cada persona             | Siempre por acción explícita                                                                         |

En el modo autogestionado, el número de equipos esperado que quien organiza definió se muestra como referencia y no como límite, conforme al diccionario de 5.1 del general, que lo declara explícitamente como no restrictivo.

## **8.2 La propuesta del sistema**

La propuesta reparte a los participantes de forma equilibrada en el número de equipos esperado, en orden aleatorio, y quien organiza la ajusta antes de confirmarla.

**Registro de decisión — por qué el reparto es aleatorio y no ponderado.** Se evaluó equilibrar los equipos por rango de insignia, mezclando rangos altos y bajos para que ninguno quedara concentrado. Se descartó por tres razones. Introduce una dependencia con el subsistema de recompensas en la ruta crítica del proyecto, cuando 1.3 se ocupa precisamente de que el núcleo no dependa de él. El rango mide participación acumulada en la plataforma y no habilidad ni desempeño, de modo que usarlo como criterio de reparto le atribuye un significado que no tiene. Y en actividades tempranas casi todos los participantes tendrían rango cero, con lo que el criterio no distinguiría nada. Declarar el reparto como aleatorio es preferible a aparentar un criterio que el sistema no está en condiciones de aplicar.

## **8.3 Reparto de quienes quedan sin equipo**

Se ejecuta al cerrar la formación de equipos, conforme a 6.1 del general, que lo describe como el reparto más equilibrado posible. El procedimiento concreto:

1. Se toman los participantes activos sin equipo, en orden de incorporación a la actividad.

2. Para cada uno se elige el equipo con menos integrantes en ese momento, resolviendo los empates por orden de creación del equipo.

3. Se asigna y se actualiza el conteo antes de pasar al siguiente.

**Dos propiedades.** La primera es que el procedimiento minimiza el tamaño del equipo mayor resultante, que es lo que la palabra equilibrado significa aquí; no reequilibra a quienes ya tenían equipo, porque mover a alguien que eligió contradiría el modo autogestionado que lo permitió elegir. La segunda es que es determinista: no interviene el azar, de modo que la prueba es reproducible y el resultado puede explicarse a quien organiza si pregunta por qué alguien acabó donde acabó.

El reparto completo emite un solo evento del historial, con el sistema como actor y la lista de asignaciones en su campo de datos (5.2). Emitir uno por persona haría ilegible la consulta justo en el momento de mayor actividad.

## **8.4 Reasignación durante el desarrollo**

Quien organiza puede mover a un participante de un equipo a otro mientras la actividad está en desarrollo (7.3 del general). Lo que la operación arrastra y lo que deja atrás no es evidente y conviene fijarlo:

- Las aportaciones que hizo en el espacio del equipo anterior permanecen ahí. Pertenecen al equipo, que es su contenedor, y retirarlas dejaría al equipo sin parte de su trabajo por una decisión ajena a él.

- Su bitácora individual lo acompaña, porque está vinculada a su membresía y no al equipo (5.2 del general).

- Las respuestas de evaluación por pares que ya haya emitido se conservan referidas a las personas evaluadas, no al equipo, de modo que la reasignación no las invalida.

- Un equipo que queda vacío se conserva con su contenido. No se elimina solo: contiene trabajo y su desaparición automática sería una pérdida silenciosa.

## **8.5 Ciclo de vida del equipo**

Un equipo se crea durante la fase de formación, por quien organiza o por un participante según el modo. Puede renombrarse mientras la actividad no esté archivada. Solo puede eliminarse si está vacío y no tiene contenido en su espacio; si lo tiene, la operación se impide y se explica, por la misma razón por la que un equipo vacío no desaparece solo.

El nombre es único dentro de la actividad (4.4 del general). La descripción de la actividad del equipo y su forma de trabajo son campos que el propio equipo llena, y son la primera manifestación de la definición de responsabilidades de Johnson y Johnson dentro del sistema.

## **8.6 Endpoints**

| Método y ruta                                   | Quién                                | Qué hace                                                                               |
| :---------------------------------------------- | :----------------------------------- | :------------------------------------------------------------------------------------- |
| GET /api/actividades/{id}/equipos               | Miembro                              | Equipos con sus integrantes (P-04)                                                     |
| POST /api/actividades/{id}/equipos              | Organizador o participante           | Crea un equipo. El participante solo en modo autogestionado                            |
| GET /api/actividades/{id}/equipos/propuesta     | Organizador                          | Genera la propuesta del sistema sin persistirla                                        |
| POST /api/actividades/{id}/equipos/propuesta    | Organizador                          | Confirma la propuesta, con los ajustes aplicados                                       |
| PATCH /api/equipos/{id}                         | Integrante u organizador             | Nombre, descripción y forma de trabajo                                                 |
| DELETE /api/equipos/{id}                        | Organizador                          | Elimina el equipo si está vacío y sin contenido                                        |
| PUT /api/equipos/{id}/integrantes/{idMembresia} | Organizador o el propio participante | Asigna o mueve. El participante solo se mueve a sí mismo y solo en modo autogestionado |

## **8.7 Pantallas**

| Pantalla                | Contenido                                                                                                                                                                            |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipos de la actividad | Los equipos con sus integrantes y quiénes quedan sin equipo. Para quien organiza, con arrastre para asignar; para el participante, con la acción de unirse cuando el modo lo permite |
| Propuesta de equipos    | La propuesta generada, editable antes de confirmar, con el aviso de que no se ha guardado                                                                                            |
| Espacio del equipo      | Descripción, forma de trabajo y las secciones de metas, avances y recursos que la configuración habilite (capítulo 9\)                                                               |

## **8.8 Pregunta abierta de este módulo**

**P-27 — Tamaño mínimo y máximo de un equipo**

**Afecta:** formación (8.1), reparto automático (8.3), evaluación por pares (10.3).

**Propuesta por defecto:** no se imponen límites. El número de equipos esperado es una referencia y un equipo puede tener un solo integrante.

**Qué necesitamos confirmar:** un equipo de una persona contradice el objeto de la plataforma y deja sin destinatarios la evaluación por pares (7.4). La pregunta es si el sistema debe impedirlo, advertirlo sin impedirlo, o permitirlo sin más porque el caso lo resuelve quien organiza.

# **9\. Seguimiento**

Reúne las tres funciones con las que los participantes registran su trabajo: el espacio de equipo, el reporte de trabajo y la bitácora individual. Es el módulo que más eventos aporta al historial y aquel cuyo contenido el historial conserva al eliminarse.

## **9.1 Espacio de equipo**

Metas, avances y recursos comparten una sola relación con un atributo de tipo (4.4 del general). Cada uno de los tres tiene estado propio de configuración, opcional u obligatorio (6.2 del general).

**Qué significa obligatorio.** No bloquea nada. Consistente con la regla de obligatoriedad sin bloqueo de 6.2 del general, un elemento obligatorio que falta se señala al equipo en su espacio y aparece como ausencia en la vista de seguimiento de quien organiza, pero no impide avanzar de fase ni cerrar la actividad. La alternativa, impedir el avance, pondría el calendario de la actividad en manos del equipo más retrasado.

**Autoría dentro del equipo.** Cualquier integrante puede crear, editar y eliminar cualquier elemento del espacio de su equipo. Es un espacio compartido y no una suma de espacios individuales, y el historial registra quién hizo cada cosa, que es donde la responsabilidad individual queda establecida sin necesidad de restringir la edición. Es la misma decisión que la propuesta por defecto de P-05 para el reporte.

**Eliminación.** El evento conserva el contenido íntegro de lo eliminado (5.1). Es el caso que el documento general cita como motivo del historial: que quien organiza pueda ver que alguien borró el trabajo del equipo y qué era lo borrado.

## **9.2 Reportes de trabajo y sus cuatro modos**

La función tiene cuatro estados en 6.2 del general: deshabilitado, libre sin fechas, con fechas sugeridas y formato libre, y con fechas obligatorias y campos estructurados. Los tres modos activos se distinguen en dos dimensiones independientes, el calendario y el formato.

| Modo                | Calendario                                                                   | Formato                                               |
| :------------------ | :--------------------------------------------------------------------------- | :---------------------------------------------------- |
| Libre               | El equipo declara el periodo que cubre cada reporte                          | Texto libre                                           |
| Fechas sugeridas    | El sistema propone el periodo en curso; el equipo puede reportar fuera de él | Texto libre                                           |
| Fechas obligatorias | Un reporte por periodo definido, y no se admite fuera de ellos               | Campos del instrumento de reporte estructurado (10.1) |

**Dónde viven los periodos.** Los dos modos con calendario necesitan saber cuáles son los periodos, y la relación de actividades no tiene dónde guardarlos: solo contiene la fecha de inicio, la de término, la fecha límite de inscripción y el plazo de cierre. Para eso existe la relación de periodos de reporte de 4.4 del general, con la actividad a la que pertenece, un orden, una fecha de inicio y una fecha de fin. Su propiedad es de este módulo, que es el único que la referencia, y el reporte la apunta mediante una llave foránea anulable: nula en el modo libre, obligatoria en el de fechas.

**Registro de decisión — periodos explícitos frente a periodicidad.** La alternativa era guardar una periodicidad, semanal o quincenal, y derivar los periodos a partir de la fecha de inicio. Es un solo campo en lugar de una relación, pero obliga a suponer un calendario regular y no permite ajustar un periodo concreto, que es justo lo que ocurre cuando cae en un periodo vacacional o cuando la actividad se retrasa. Los periodos explícitos permiten generarlos a partir de una periodicidad al configurar y editarlos después uno a uno.

## **9.3 Bitácora individual**

La bitácora está vinculada a la membresía y no al equipo (5.2 del general), de modo que acompaña a la persona si se la reasigna (8.4). Se compone de entradas con fecha y contenido libre, sin límite de una por día: es un registro personal de avances y dificultades y no un parte diario.

Su visibilidad es la de la propuesta por defecto de P-06: el autor, quien organiza y los co-organizadores con el permiso correspondiente. La respuesta a esa pregunta cambia lo que los estudiantes escriben en ella, y por eso conviene resolverla antes de implementar la pantalla y no después.

## **9.4 Endpoints**

| Método y ruta                       | Quién                    | Qué hace                                           |
| :---------------------------------- | :----------------------- | :------------------------------------------------- |
| GET /api/equipos/{id}/elementos     | Integrante u organizador | Espacio del equipo, filtrable por tipo             |
| POST /api/equipos/{id}/elementos    | Integrante               | Crea una meta, un avance o un recurso              |
| PATCH /api/elementos/{id}           | Integrante               | Edita el contenido                                 |
| DELETE /api/elementos/{id}          | Integrante               | Elimina; el evento conserva el contenido           |
| GET /api/equipos/{id}/reportes      | Integrante u organizador | Reportes del equipo con su periodo                 |
| POST /api/equipos/{id}/reportes     | Integrante               | Crea el reporte del periodo                        |
| PATCH /api/reportes/{id}            | Integrante               | Edita el reporte mientras la actividad lo admita   |
| GET /api/actividades/{id}/periodos  | Miembro                  | Periodos de reporte configurados                   |
| PUT /api/actividades/{id}/periodos  | Organizador              | Define o ajusta los periodos                       |
| GET /api/actividades/{id}/bitacora  | Autor u organizador      | Entradas de bitácora, propias o de un participante |
| POST /api/actividades/{id}/bitacora | Participante             | Crea una entrada                                   |
| PATCH /api/bitacora/{id}            | Autor                    | Edita una entrada propia                           |

## **9.5 Pantallas**

| Pantalla                    | Contenido                                                                                                                                                   |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Espacio del equipo          | Metas, avances y recursos en secciones separadas, cada una presente solo si la configuración la habilita. Los obligatorios ausentes se señalan sin bloquear |
| Reportes del equipo         | Los reportes por periodo. En modo con fechas, los periodos sin reporte aparecen como pendientes                                                             |
| Mi bitácora                 | Entradas propias en orden cronológico inverso, con la indicación de quién más puede leerlas                                                                 |
| Seguimiento del organizador | Vista por equipo con el estado de cada función: qué reportó, qué falta y cuándo fue la última aportación                                                    |

## **9.6 Pregunta abierta de este módulo**

**P-28 — Definición de los periodos de reporte**

**Afecta:** reportes de trabajo (9.2), modelo de datos.

**Propuesta por defecto:** quien organiza indica una periodicidad al habilitar la función, el sistema genera los periodos entre la fecha de inicio y la de término, y después puede editarlos uno a uno.

**Qué necesitamos confirmar:** si las fechas de revisión de avances que menciona el documento de concepto se conciben como un calendario regular o como fechas sueltas que quien organiza fija según el trabajo.

# **10\. Evaluación**

Cubre el motor de instrumentos del que cuelgan la rúbrica, las autoevaluaciones, la evaluación por pares y el reporte estructurado; la calificación en sus dos modos; y los comentarios. Es el módulo con más incertidumbre de requisitos, porque los campos concretos de cada instrumento no están confirmados, y es también aquel cuyo diseño absorbe esa incertidumbre sin quedar bloqueado por ella.

## **10.1 El motor de instrumentos**

Los cinco instrumentos comparten la estructura de instrumento, campo y respuesta que fija 4.2 del general. La consecuencia allí señalada es que la validación deja de ser responsabilidad del esquema relacional y pasa a la capa de servicios; esta sección la asume.

| Tipo de campo       | Validación                                        | Dónde se usa                                    |
| :------------------ | :------------------------------------------------ | :---------------------------------------------- |
| Escala numérica     | Entero dentro del intervalo declarado en el campo | Rúbrica, evaluación por pares, autoevaluaciones |
| Opción de una lista | El valor pertenece a las opciones del campo       | Autoevaluaciones, evaluación por pares          |
| Texto libre         | Longitud máxima                                   | Todos                                           |
| Sí o no             | Uno de los dos valores                            | Autoevaluaciones                                |

**Registro de decisión — instrumentos por defecto copiados, no referenciados.** Los campos definitivos de cada instrumento no están confirmados, pero una actividad que habilita la autoevaluación y encuentra un instrumento vacío es inutilizable. El sistema trae por tanto un conjunto de instrumentos por defecto que se copian a la actividad en el momento de habilitar la función, y que quien organiza edita. Se copian y no se referencian: si la actividad apuntara a la plantilla del sistema, editarla alteraría actividades en curso y cambiaría el significado de respuestas ya emitidas. Cuando los campos queden confirmados, se actualizan las plantillas y el cambio afecta solo a las actividades creadas después, que es el comportamiento correcto.

**Cuándo puede editarse un instrumento.** Mientras no tenga respuestas. Es la misma regla que la propuesta por defecto de P-17 para la configuración de funciones, y por el mismo motivo: alterar los campos de un instrumento ya respondido deja las respuestas referidas a campos que cambiaron de significado.

## **10.2 Calificación**

La calificación es siempre individual por participante y única por actividad (4.4 del general). Sus dos modos activos son la asignación directa y la rúbrica.

**Modo directo.** Quien organiza captura el valor. Al configurar la función define el valor máximo, y el sistema valida contra él.

**Modo rúbrica.** El valor es la suma de los puntajes asignados a los criterios y no se captura: 4.6 del general establece que el sistema no admite un valor que contradiga sus criterios, de modo que el campo es de solo lectura y se recalcula cada vez que un criterio cambia. El valor máximo es la suma de los puntajes máximos de los criterios.

**Modificación posterior.** Una calificación puede corregirse mientras la actividad esté en el periodo de cierre. El evento del historial conserva el valor anterior y el nuevo (5.1), de modo que la corrección queda trazada sin necesidad de una reversión, que está fuera del alcance del sistema.

El momento en que la calificación se hace visible a su destinatario es P-18 del general, cuya propuesta por defecto es que lo sea en cuanto se asigna.

## **10.3 Autoevaluaciones y evaluación por pares**

Los tres instrumentos se responden durante el periodo de cierre (6.1 del general) y se distinguen por qué llena cada uno los campos de sujeto y equipo de la respuesta.

| Instrumento               | Quién responde                                                    | Sujeto de la respuesta                  |
| :------------------------ | :---------------------------------------------------------------- | :-------------------------------------- |
| Autoevaluación individual | Cada participante, una vez                                        | Ninguno: la respuesta es sobre sí mismo |
| Autoevaluación grupal     | Cada integrante por separado (P-07)                               | Su equipo                               |
| Evaluación por pares      | Cada participante, una vez por cada compañero de su equipo (P-08) | La membresía evaluada                   |

**Obligatoriedad sin bloqueo.** Cuando la evaluación por pares está en su estado obligatorio, no completarla no impide cerrar la actividad (6.2 del general): la evaluación pendiente se marca como no realizada y queda consultable por quien organiza. Un equipo de una sola persona es un caso distinto y no una omisión: se marca como no aplicable, porque no hay a quién evaluar (7.4).

## **10.4 Comentarios**

Un comentario se dirige a un equipo o a un participante, y exactamente uno de los dos destinos está presente (4.6 del general). Los individuales son privados entre quien organiza y su destinatario, conforme al documento de concepto, y esa privacidad es la que recorta el alcance del historial visible para los demás participantes (7.3 del general).

Son editables mientras la actividad no esté archivada, y la edición conserva el valor anterior en el historial, por la misma razón que la calificación.

## **10.5 Endpoints**

| Método y ruta                                          | Quién                | Qué hace                                          |
| :----------------------------------------------------- | :------------------- | :------------------------------------------------ |
| GET /api/actividades/{id}/instrumentos                 | Miembro              | Instrumentos de la actividad con sus campos       |
| POST /api/actividades/{id}/instrumentos                | Organizador          | Crea un instrumento a partir de la plantilla      |
| PUT /api/instrumentos/{id}/campos                      | Organizador          | Define los campos, si no hay respuestas           |
| POST /api/instrumentos/{id}/respuestas                 | Participante         | Responde el instrumento                           |
| GET /api/instrumentos/{id}/respuestas                  | Organizador o sujeto | Respuestas, con el alcance de P-08                |
| PUT /api/actividades/{id}/calificaciones/{idMembresia} | Organizador          | Asigna o corrige la calificación                  |
| GET /api/actividades/{id}/calificaciones               | Organizador          | Todas las calificaciones de la actividad          |
| POST /api/actividades/{id}/comentarios                 | Organizador          | Escribe un comentario a un equipo o a una persona |
| GET /api/actividades/{id}/comentarios                  | Miembro              | Comentarios visibles para el actor                |
| PATCH /api/comentarios/{id}                            | Autor                | Edita el comentario                               |

## **10.6 Pantallas**

| Pantalla              | Contenido                                                                                                                   |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| Rúbrica               | Definición de criterios y puntajes. Bloqueada con el motivo si ya hay calificaciones                                        |
| Calificar             | Lista de participantes con su calificación y su avance. En modo rúbrica, los criterios con el total calculado               |
| Responder instrumento | Formulario construido a partir de la definición del instrumento (4.4). En evaluación por pares, un formulario por compañero |
| Mis resultados        | Calificación propia, comentarios recibidos y lo que la evaluación por pares devuelva según P-08                             |
| Comentarios           | Los emitidos por quien organiza, separados por destino                                                                      |

## **10.7 Pregunta abierta de este módulo**

**P-29 — Escala de la calificación**

**Afecta:** calificación (10.2), rúbrica.

**Propuesta por defecto:** el sistema no impone una escala. En modo directo, quien organiza define el valor máximo al configurar la función; en modo rúbrica, el máximo es la suma de los puntajes de los criterios.

**Qué necesitamos confirmar:** si se espera que la plataforma trabaje en la escala de cero a diez por su contexto institucional, la libertad actual permite construir rúbricas cuyo total no la respete. Imponerla obligaría a que los puntajes de los criterios sumaran exactamente diez, que es una restricción incómoda al definir la rúbrica.

# **11\. Plan de implementación del núcleo**

Desglosa las fases A y B del plan general (9.2 y 9.3) en incrementos del núcleo. Las fechas son las de aquel documento y no se modifican aquí; lo que se fija es el orden interno y el criterio por el que un incremento se considera terminado.

## **11.1 Criterio de terminado**

Cada incremento es vertical y se considera terminado cuando tiene sus cuatro piezas: el endpoint con su autorización, la pantalla que lo consume, la prueba de las reglas que toca y el evento del historial emitido. Si falta cualquiera de las cuatro, el incremento no está terminado, aunque la funcionalidad se vea funcionar. El historial en particular es el que más fácilmente se aplaza y el que más caro sale agregar después, por lo dicho en 8.4 del general.

## **11.2 Fase A — del 3 de agosto al 4 de septiembre**

| Incremento                         | Contenido                                                                                                                                                                       |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desbloqueo                         | Mecanismo de captura del historial (2.4), endpoints administrativos de Cuentas y listado de participantes. Es la superficie de 1.3 y va primero aunque no produzca nada visible |
| Cuentas y autorización             | Registro, sesión, perfil, verificación de correo y recuperación de contraseña, cadena de middleware y función de autorización con la matriz declarada como datos                |
| Actividades I                      | Creación, configuración de funciones, clave de ingreso, inscripción, invitaciones y transiciones manuales                                                                       |
| Actividades II                     | Transiciones automáticas con su tarea programada, co-organizadores y sus permisos configurables                                                                                 |
| Equipos                            | Los tres modos de formación, la propuesta del sistema y el reparto equilibrado                                                                                                  |
| Espacio de equipo y cierre de fase | Metas, avances y recursos; consulta cronológica del historial; recorrido manual completo de extremo a extremo                                                                   |

## **11.3 Fase B — del 7 de septiembre al 2 de octubre**

| Incremento            | Contenido                                                                     |
| :-------------------- | :---------------------------------------------------------------------------- |
| Seguimiento           | Reportes en sus tres modos activos, periodos de reporte y bitácora individual |
| Motor de instrumentos | Instrumentos, campos y respuestas, con las plantillas por defecto             |
| Calificación          | Modo directo y modo rúbrica, con el recálculo y la visibilidad de P-18        |
| Evaluación            | Autoevaluaciones, evaluación por pares y comentarios                          |
| Cierre y consulta     | Periodo de cierre y archivado, historial con filtros y agregación             |

## **11.4 Riesgos propios del núcleo**

| Riesgo                                                                | Mitigación                                                                                                            |
| :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| El núcleo es la ruta crítica y su retraso desplaza todo el calendario | La superficie que consumen los otros dos subsistemas se entrega en el primer incremento, antes que cualquier pantalla |
| El ciclo de vida es prerrequisito de los cuatro módulos restantes     | Se implementa completo en la primera mitad de la fase A, incluidos los casos límite de 7.4                            |
| Los campos de los instrumentos no están confirmados                   | El motor es genérico y los campos son datos; la confirmación tardía no obliga a reescribir nada (10.1)                |
| La búsqueda por rango depende del subsistema de recompensas           | Interfaz declarada e implementación vacía; el filtro es lo primero del orden de recorte (1.3)                         |
| El historial se aplaza por no ser visible                             | Su mecanismo va en el primer incremento y forma parte del criterio de terminado (11.1)                                |

## **11.5 Orden de recorte propio**

Complementa el de 9.6 del general con lo que corresponde al núcleo, y sigue el mismo principio: se decide de antemano para no decidirlo bajo presión.

1. Filtros del historial, conservando la consulta cronológica y la agrupación por participante.

2. Modo de campos estructurados del reporte, conservando el libre y el de fechas sugeridas.

3. Propuesta de equipos del sistema, conservando el modo autogestionado y el manual.

**Lo que no se recorta.** El ciclo de vida con sus casos límite, la función de autorización, el mecanismo de captura del historial y el reparto equilibrado. Los cuatro son prerrequisito de otras partes o están cubiertos por pruebas de contrato.

# **12\. Pruebas del subsistema**

El general fija seis pruebas de contrato de cobertura obligatoria (10.1) y cinco de ellas corresponden al núcleo: las reglas de integridad no expresables en el esquema, las transiciones del ciclo de vida, cada celda de la matriz de permisos, la emisión de eventos y el alcance acotado del administrador. Este capítulo añade lo específico del subsistema.

## **12.1 Lo que se prueba y por qué no se ve al probar a mano**

| Qué se verifica                                                                  | Por qué                                                                                                 |
| :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| La función de autorización, recorrida celda por celda contra sus tablas de datos | Un permiso concedido de más devuelve datos con normalidad y no produce ningún error                     |
| Cada transición del ciclo de vida, incluidas las que deben rechazarse            | Probar a mano recorre el camino feliz; los rechazos son los que nadie intenta                           |
| Los seis casos límite de 7.4                                                     | Todos dependen de fechas o de configuraciones poco frecuentes, y ninguno aparece en un recorrido normal |
| El reparto equilibrado: determinismo y minimización del equipo mayor             | Un reparto desequilibrado parece correcto salvo que se cuente                                           |
| La envoltura de 2.4: un servicio de escritura que no registra evento falla       | Es la prueba que hace de la regla un mecanismo y no una recomendación                                   |
| La agregación del historial agrupa sin perder eventos                            | Una agrupación que descarta se ve idéntica a una que agrupa bien                                        |
| Un token de verificación o de recuperación sirve una sola vez y vence            | Un token reutilizable no falla: simplemente funciona dos veces, y nadie lo nota                         |

## **12.2 Datos de prueba**

Casi todas las pruebas anteriores necesitan una actividad en una fase concreta, con participantes y equipos. Construir ese estado recorriendo la aplicación en cada prueba la haría lenta y frágil, y acoplaría la prueba de un módulo a los defectos de otro. Se escribe por tanto un generador que produce una actividad en cualquier fase, con el número de participantes y equipos que se le indique, escribiendo directamente con el cliente de Prisma. Las pruebas corren contra un PostgreSQL en contenedor y no contra una base simulada, porque varias reglas que importan —unicidad, llaves foráneas, comportamiento de nulos en índices compuestos— solo se manifiestan contra el manejador real. Cada prueba se ejecuta dentro de una transacción que se revierte al terminar, de modo que no dependa del orden. Es la primera pieza del incremento de desbloqueo de 11.2.

## **12.3 Verificación manual**

Al terminar cada fase se ejecuta el recorrido completo: crear una actividad, abrir la inscripción, unir participantes por clave y por invitación, formar equipos en los tres modos, trabajar, cerrar y archivar. Es el criterio de cierre de fase de 10.3 del general y el único que verifica la coherencia de la interfaz contra el sistema de diseño.

# **13\. Registro de preguntas abiertas**

Consolida las preguntas propias de este documento y señala cuáles del general condicionan al núcleo. El orden en que conviene plantearlas no es el numérico sino el del momento en que bloquean: primero las que afectan al modelo de datos y a la estructura de la interfaz, por ser las de rediseño más costoso.

## **13.1 Preguntas propias**

| Pregunta | Asunto                                            | Debe resolverse antes de                                        |
| :------- | :------------------------------------------------ | :-------------------------------------------------------------- |
| P-24     | Servidor de correo del despliegue                 | El incremento de Cuentas: sin él no hay recuperación automática |
| P-30     | Alcance de la cuenta sin verificar                | El incremento de Cuentas                                        |
| P-25     | Configuración por defecto de una actividad nueva  | El incremento de Actividades I                                  |
| P-26     | Transferencia de la organización de una actividad | El incremento de Actividades II                                 |
| P-27     | Tamaño mínimo y máximo de un equipo               | El incremento de Equipos                                        |
| P-28     | Definición de los periodos de reporte             | El incremento de Seguimiento                                    |
| P-29     | Escala de la calificación                         | El incremento de Calificación                                   |
| P-22     | Vencimiento de la sesión                          | El incremento de Cuentas                                        |
| P-23     | Ventana de agregación del historial               | El cierre de la fase B                                          |

## **13.2 Preguntas del documento general que condicionan al núcleo**

Doce de las diecinueve preguntas abiertas del general afectan a módulos de este subsistema. Las cuatro primeras son las urgentes: condicionan el modelo de datos o la estructura de una pantalla, y su respuesta tardía obliga a rehacer.

| Pregunta   | Asunto                                                | Debe resolverse antes de                                       |
| :--------- | :---------------------------------------------------- | :------------------------------------------------------------- |
| P-04       | Visibilidad entre equipos                             | El incremento de Equipos: decide qué devuelve el listado       |
| P-08       | Alcance de la evaluación por pares                    | El motor de instrumentos: decide la forma de la respuesta      |
| P-10       | Alcance del historial visible al participante         | La consulta del historial                                      |
| P-20       | Carga de archivos en el espacio de equipo             | El espacio de equipo: decide si hay almacenamiento de archivos |
| P-03, P-11 | Baja de participante, búsqueda de usuarios            | Actividades I                                                  |
| P-05, P-06 | Autoría del reporte, visibilidad de la bitácora       | Seguimiento                                                    |
| P-07, P-18 | Autoevaluación grupal, visibilidad de la calificación | Evaluación                                                     |
| P-16, P-17 | Plazo de cierre, cambio de configuración con datos    | Actividades II                                                 |
