**Diseño de Desarrollo — Sistema de recompensas**

Plataforma de Aprendizaje Colaborativo

_Documento individual — Ui Chul Shin_

Este documento especifica cómo se construye el subsistema de recompensas: el módulo de Insignias y la parte del perfil que lo muestra. Es complemento del diseño de desarrollo general y no lo repite. El concepto (§6) fija qué es una insignia y por qué el sistema se comporta como se comporta; el general fija el contrato con los otros dos subsistemas; este documento fija cómo se ejecuta, y registra dónde lo implementado todavía no coincide con ese contrato y por qué.

**Preguntas abiertas.** Se conserva el mecanismo del documento general: cada hueco se registra con el formato P-nn, incluye una propuesta por defecto y se procede con ella si al llegar a su implementación no ha habido cambio de dirección. La numeración de este documento arranca en P-31 para no colisionar con el general (hasta P-20) ni con el del núcleo (P-21 a P-30).

_**Estructura.** El capítulo 1 sitúa el subsistema y declara sus desviaciones vigentes. Los capítulos 2 a 5 son el dominio: modelo, reglas del otorgamiento, visibilidad y acumulado. Los capítulos 6 a 8 son la API, el cliente y el perfil. Los capítulos 9 a 12 son de ejecución: pruebas, plan, preguntas abiertas y correcciones que este documento lleva al general._

# **1\. Contexto y alcance del subsistema**

El subsistema de recompensas es el único de los tres que no tiene datos propios fuera de una actividad: toda insignia nace de una membresía que reconoce a otra, durante el periodo de cierre. Esa posición determina dos cosas. La primera, que depende del núcleo y no al revés (1.1 del general): sin actividades ni membresías no hay nada que reconocer. La segunda, que su valor se mide por la confianza en el acumulado, de modo que casi todo lo que este documento decide son restricciones sobre cuándo, a quién y cuánto se puede reconocer.

## **1.1 Deslinde con el documento general**

El deslinde sigue la misma regla que el documento del núcleo: es de nivel y no de tema.

| Materia      | Documento general                                                     | Este documento                                                                |
| :----------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| Entidades    | Relación `insignias_otorgadas` y sus llaves (4.4, 5.4)                | Por qué el catálogo vive en código, qué se materializa y qué se calcula       |
| Reglas       | Otorgamiento en el periodo de cierre, misma actividad (4.5, 4.6, 6.1) | Presupuesto, unicidad por categoría, ventana de edición y revelación diferida |
| Autorización | Filas de Insignias de la matriz (7.3) y atribución (P-09)             | Qué devuelve cada endpoint a cada rol y qué oculta                            |
| Historial    | Evento de otorgamiento en categoría de evaluación (8.3)               | Cuándo se emite (pendiente, 1.4)                                              |
| Interfaz     | Organización por features y flujo unidireccional (3.5, 3.6)           | Componentes de la insignia, ritual, vitrina, rutas y claves de query          |

## **1.2 Qué pertenece al subsistema**

| Pieza                                    | Dónde vive                                                            | Dueño                                      |
| :--------------------------------------- | :-------------------------------------------------------------------- | :----------------------------------------- |
| Catálogo, escala, frases y presupuesto   | `packages/shared/src/insignias.ts`                                    | Insignias                                  |
| Otorgamiento, consulta y acumulado       | `apps/api/src/services/insignias/`, `routes/insignias.ts`             | Insignias                                  |
| Componentes de insignia, ritual, vitrina | `apps/web/src/features/insignias/`                                    | Insignias                                  |
| Perfil propio y perfil de otro usuario   | `apps/web/src/features/perfil/`, `services/cuentas/perfil.service.ts` | Cuentas (núcleo), construido por Insignias |

**El perfil.** El general asigna el perfil al módulo de Cuentas (3.4) y el núcleo lo especifica (§6.3 y §6.6 del núcleo). Se construyó desde este subsistema porque su contenido principal son las insignias, y el orden de trabajo lo permitía sin bloquear a nadie. La propiedad no cambia: los endpoints viven en la ruta de Cuentas, la foto es un atributo de la cuenta, y cualquier cambio a ese código requiere la revisión del responsable del núcleo (3.5 del general). Lo que Insignias aporta al perfil pasa por la frontera de servicio: `acumuladoDeUsuario` y `listarRecibidosEnPerfil`.

## **1.3 Dependencias con el núcleo**

La regla de frontera del general (3.4) se cumple por servicio: Insignias nunca lee `membresias` ni `actividades` directamente.

| Qué consume                                 | Servicio del núcleo                              | Para qué                                                                    |
| :------------------------------------------ | :----------------------------------------------- | :-------------------------------------------------------------------------- |
| Membresía activa del actor con su actividad | `obtenerMembresiaActiva(idUsuario, idActividad)` | Rol, fechas de la actividad, y el 404 cuando no es miembro (3.3 del núcleo) |
| Participantes activos de la actividad       | `listarParticipantes(idActividad)`               | Compañeros reconocibles y tamaño del equipo para el presupuesto             |
| Registro de eventos                         | `registrarEvento(tx, evento)`                    | Evento de otorgamiento (8.3 del general). Pendiente, ver 1.4                |

**La única dependencia en sentido inverso** es la que prevé 1.3 del núcleo: Cuentas consume el acumulado para mostrar rangos. Está implementada como una llamada a `acumuladoDeUsuario` desde `perfil.service.ts`, y no como una implementación vacía, porque Insignias llegó antes que el perfil.

## **1.4 Desviaciones vigentes respecto al contrato**

Cuatro partes del contrato dependen de piezas del núcleo que todavía no existen o no estaban listas cuando se construyó el otorgamiento. En lugar de esperar, se implementó una aproximación cuyo contrato de API no cambia al llegar la pieza real. Se declaran aquí para que ninguna se tome por definitiva.

| Contrato                                                                 | Hoy                                                                                        | Al llegar la pieza                                                           |
| :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| Se reconoce solo dentro del propio equipo (concepto §6, 4.6 del general) | Los compañeros son todos los participantes activos de la actividad                         | `listarCompaneros` se acota al equipo del actor; ni esquema ni API cambian   |
| El otorgamiento ocurre en el periodo de cierre (6.1)                     | La ventana se calcula con fechas: de `fecha_termino` a `fecha_termino + plazo_cierre_dias` | La verificación lee el estado `cierre`; el intervalo deja de calcularse aquí |
| El otorgamiento emite un evento de evaluación (8.3)                      | No se emite                                                                                | Se emite al aplicarse, no al guardar (3.6)                                   |
| Validación ligera del organizador (concepto §6)                          | El organizador ve todo con autoría, pero no hay alerta de reciprocidad ni descarte         | Incremento propio (10.2)                                                     |

# **2\. Modelo del dominio**

## **2.1 El catálogo y la escala viven en código**

Las seis categorías (`CATALOGO_INSIGNIAS`), los cinco niveles (`NIVELES`), el valor por fuente (`PUNTOS_POR_FUENTE`), las frases sugeridas (`FRASES_SUGERIDAS`) y la regla del presupuesto (`personasReconocibles`) están en `packages/shared`. La API valida contra ellos antes de escribir y la web los pinta; ninguno se duplica.

**Registro de decisión — constantes compartidas frente a tablas.** El modelo relacional original preveía `categorias_insignia` y `niveles_insignia`. Se descartaron por lo que decidió el concepto después: el catálogo es fijo y no se administra, porque crear o retirar categorías rompería la comparabilidad del acumulado entre actividades. Una tabla que nadie edita solo añade una consulta y la posibilidad de que su contenido diverja del que asume el código. Si el administrador llega a ajustar los umbrales de puntos (concepto §2.5), `niveles_insignia` se materializa entonces y `NIVELES` pasa a ser su semilla; mientras no, la escala es una constante (P-32).

**`categoria` es texto y no enumerado.** Los identificadores llevan guion (`buen-juicio`), que un enumerado de Prisma no admite, y el nombre visible y la frase de atestiguación son contenido: cambiarlos no debe ser una migración. La validación contra el catálogo ocurre en el servicio.

## **2.2 La relación de otorgamientos**

| Atributo               | Descripción                                                                                                               |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| id_otorgamiento        | Llave primaria                                                                                                            |
| categoria              | Identificador del catálogo de `packages/shared`                                                                           |
| id_membresia_otorgante | Membresía de quien reconoce. Nula en la fuente `sistema`, y queda nula si esa membresía se elimina (`ON DELETE SET NULL`) |
| id_membresia_receptor  | Membresía de quien recibe. Borrar la membresía borra lo recibido en ella (`ON DELETE CASCADE`)                            |
| fuente                 | `par`, `organizador` o `sistema`                                                                                          |
| puntos                 | Valor materializado al escribir (2.3)                                                                                     |
| frase                  | Justificación, de 1 a 140 caracteres                                                                                      |
| fecha                  | Momento en que se guardó                                                                                                  |

Índice único sobre `(categoria, id_membresia_otorgante, id_membresia_receptor)` e índice sobre el receptor, que es la columna por la que se consulta el acumulado.

**La unicidad deja pasar varias filas con otorgante nulo, a propósito.** PostgreSQL trata cada NULL como distinto, de modo que el índice no impide que existan varias filas de `sistema` en la misma categoría para el mismo receptor. Es lo que se quiere: la regla "una insignia por categoría y persona" es para personas, y cada señal automática aporta su propia fracción. Un índice `NULLS NOT DISTINCT` impediría precisamente eso. Si las señales necesitan deduplicarse, será por tipo de señal y no por esta restricción.

**No lleva `id_actividad`.** La actividad se deriva del receptor, y que otorgante y receptor sean de la misma actividad lo garantiza el servicio (4.6 del general). Es la misma decisión que "por qué la unicidad se expresa sobre membresías" del general.

## **2.3 Los puntos se materializan**

Un reconocimiento de un par vale 1 punto, uno de quien organiza vale 2 y las señales automáticas aportan fracciones (concepto §6). El acumulado deja de ser un conteo de filas y pasa a ser una suma, y `puntos` se guarda en cada fila en lugar de derivarse de `fuente` al consultar. Así una recalibración futura no reescribe el valor de reconocimientos ya emitidos, que es lo que un acumulado que "nunca se pierde" promete.

**Lo que no se almacena.** El acumulado por categoría y el nivel. Ambos se calculan: el acumulado sumando las filas aplicadas del receptor en todas sus membresías, y el nivel con `nivelParaPuntos`. Es la regla de 4.5 del general para el rango visible.

## **2.4 La foto de perfil**

La relación `fotos_de_perfil` (una fila por usuario, con los bytes, el tipo y la fecha) está documentada en 4.4 y 5.1 del general. Aquí solo las dos decisiones que la explican.

**Registro de decisión — en la base y no en disco ni en un servicio de archivos.** El API corre como función de Vercel, sin sistema de archivos persistente, y un servicio de almacenamiento externo añade una credencial, una dependencia y una operación que puede fallar a medias. La foto llega ya reducida a 256 px por el cliente, de modo que pesa decenas de KB y guardarla en la base es barato.

**En su propia tabla y no como columna de `usuarios`.** La cuenta se lee en cada petición para resolver la sesión; una columna binaria ahí viajaría en cada consulta salvo que todos recordaran omitirla. La sesión solo lee la fecha de la foto, que basta para armar su URL.

# **3\. Reglas del otorgamiento**

Todas viven en `guardarMisReconocimientos`, en la capa de servicios, porque ninguna es expresable como restricción del esquema: el presupuesto cuenta receptores distintos, la pertenencia a la actividad cruza dos membresías y la ventana depende de fechas.

## **3.1 El presupuesto cuenta personas, no insignias**

Cada participante puede reconocer al 33 % de su equipo sin contarse, redondeado hacia arriba, con piso de 1 y techo de 5, y nunca a más gente de la que hay (`personasReconocibles`).

| Tamaño del equipo | 2   | 3   | 4   | 5   | 7   | 8   | 10  | 11  | 14  | 20  |
| :---------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Personas          | 1   | 1   | 1   | 2   | 2   | 3   | 3   | 4   | 5   | 5   |

A cada persona elegida se le pueden dar de una a seis insignias, cada una con su frase. Seguir sumando insignias a alguien ya reconocido no gasta presupuesto.

**Registro de decisión — racionar personas frente a racionar insignias.** La primera implementación contaba insignias: con presupuesto 2 se repartían dos insignias en total. Se cambió porque la escasez que hace significativo el reconocimiento es tener que elegir a quién; cuántas cosas se destacan de alguien ya elegido no le quita nada a nadie más, y racionarlas obligaba a elegir entre decir que alguien lideró o que ayudó cuando hizo ambas cosas.

## **3.2 Quien organiza reconoce sin presupuesto**

Organizador y co-organizadores no tienen presupuesto (`presupuesto: null` en el contexto). El 33 % existe para que los pares tengan que elegir; quien organiza no compite por popularidad y su papel es justo compensar a quien los pares no vieron. Su reconocimiento se guarda con fuente `organizador` y vale 2 puntos. El co-organizador vale lo mismo que el organizador: su función es la misma.

## **3.3 Una insignia por categoría y persona**

El mismo otorgante no puede dar dos veces la misma categoría al mismo receptor en una actividad. Se valida en el servicio con un mensaje por campo y la garantiza además el índice único de 2.2. Aplica también a quien organiza.

## **3.4 La frase es guiada**

Cada reconocimiento es persona, insignia y una frase de 1 a 140 caracteres. `FRASES_SUGERIDAS` ofrece tres por categoría, en primera persona y en pasado, y siempre se puede escribir la propia. La primera de cada lista es la frase de atestiguación del catálogo.

**Por qué guiada y no libre.** Escribir desde cero hasta seis veces por persona produce frases de relleno, que valen menos para quien las recibe que una prellenada que sí describe lo que hizo, y saca al ritual de los dos o tres minutos que se le suponen. El catálogo de frases es contenido y se revisa sin tocar el modelo.

## **3.5 La ventana y la revelación diferida**

| Momento                                      | Guardar         | Quien recibe ve    | Quien organiza ve |
| :------------------------------------------- | :-------------- | :----------------- | :---------------- |
| Antes de `fecha_termino`                     | 409             | Nada               | Nada que ver      |
| De `fecha_termino` a `fecha_termino + plazo` | Permitido       | Nada               | Todo, con autoría |
| A partir del día siguiente al límite         | 409 (aplicados) | Lo suyo, sin autor | Todo, con autoría |

Las fechas de la actividad son de calendario; el término cuenta desde el inicio de su día y el límite hasta el final del suyo, para que "cierra el 14" incluya el 14.

**Por qué nadie ve nada hasta que cierra.** Revelar durante la ventana lo que otros dieron invita a responder en especie, que es exactamente lo que el anonimato y el presupuesto buscan evitar. Solo se aplica, y solo suma al acumulado, lo que existe cuando la ventana termina.

**Por qué quien organiza sí ve durante la ventana.** La validación ligera del concepto (descartar reciprocidad sospechosa o frases vacías) solo tiene sentido antes de que se aplique. Es una asimetría deliberada: quien organiza ve antes que quien recibe.

## **3.6 Guardar reemplaza la lista completa**

`PUT /actividades/{id}/reconocimientos` recibe todos los reconocimientos del actor en esa actividad y reemplaza los que había, en una transacción. Una lista vacía es válida y borra lo guardado.

**Registro de decisión — reemplazo frente a alta por reconocimiento.** El núcleo evita PUT porque sus recursos no se reemplazan íntegros (3.1 del núcleo). Este es la excepción: el borrador del ritual es una unidad que se edita hasta el cierre, y el presupuesto se valida sobre el conjunto, no sobre cada alta. Con altas y bajas individuales, un cambio de "reconozco a A" por "reconozco a B" pasaría por un estado intermedio inválido o por uno que excede el presupuesto. El cliente habilita "Guardar" cuando hay cambios respecto a lo guardado, no cuando la lista tiene elementos, para que quitar el último también se pueda guardar.

**Consecuencia para el historial.** Como lo guardado se puede rehacer hasta el cierre, el evento de otorgamiento de 8.3 del general no se emite al guardar sino al aplicarse: un evento por cada borrador intermedio llenaría el historial de reconocimientos que nunca existieron.

# **4\. Visibilidad**

Resuelve P-09 del general en el sentido de su propuesta por defecto: anónimo hacia quien recibe entre pares, atribuido hacia quien organiza.

| Quién                        | Qué ve                                                                                | Desde cuándo         |
| :--------------------------- | :------------------------------------------------------------------------------------ | :------------------- |
| Quien recibe                 | Categoría, frase, puntos y si vino de quien organiza. Nunca el autor par              | Cuando se aplica     |
| Quien reconoció              | Su propio borrador, editable                                                          | Durante la ventana   |
| Organizador y co-organizador | Lo recibido por cada participante, con el nombre de quien lo dio                      | En cualquier momento |
| Otro participante            | Nada de lo que recibió un compañero. Un intento directo responde 403                  | —                    |
| Cualquier usuario con sesión | Nombre, foto y nivel por categoría de otra persona. Ni frases, ni correo, ni progreso | Cuando se aplica     |

**Lo que recibió alguien de quien organiza sí lleva atribución**, aunque no su nombre: la fuente `organizador` se muestra como "de quien organiza". El concepto lo quiere así porque el doble peso solo se entiende si se sabe de dónde vino.

**El perfil ajeno nunca compara.** La vitrina muestra las seis insignias en el orden fijo del catálogo, también las que están en cero; no ordena por nivel ni destaca la más alta. Ordenar por logro convierte el perfil en una tabla de posiciones consigo mismo.

# **5\. Acumulado, nivel y progreso**

| Función                   | Qué hace                                                                                                         |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| `acumuladoDeUsuario`      | Suma los puntos por categoría de todas las membresías del usuario, solo de actividades cuya ventana ya se aplicó |
| `nivelParaPuntos`         | Nivel alcanzado o null si aún no llega a Bronce (3 puntos). Los puntos nunca bajan y el nivel tampoco            |
| `progresoDeNivel`         | Siguiente nivel, puntos restantes y avance dentro del tramo actual, de 0 a 1                                     |
| `listarRecibidosEnPerfil` | Frases aplicadas del usuario en todas sus actividades, con la actividad y la fecha, sin autor                    |

**El progreso compara contra uno mismo.** La barra de `DetalleInsignia` mide el avance dentro del tramo actual hacia el siguiente nivel; no existe ninguna función que compare a dos usuarios.

**Escala.** Bronce 3, Plata 8, Oro 18, Platino 35, Diamante 60. Resuelve la decisión de contenido "nombres del catálogo de niveles" del general (11); los umbrales quedan a calibrar tras el primer uso real (P-32).

# **6\. Contrato de la API**

Todas las rutas exigen sesión. Las anidadas bajo una actividad responden 404 a quien no es miembro, igual que el resto del núcleo (3.3 del núcleo).

| Método y ruta                                                         | Quién                        | Qué hace                                                                                          |
| :-------------------------------------------------------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------ |
| GET /api/actividades/{id}/reconocimientos                             | Miembro                      | Contexto del ritual (compañeros, presupuesto, fecha límite, abierto, aplicados) y borrador propio |
| PUT /api/actividades/{id}/reconocimientos                             | Miembro, durante la ventana  | Reemplaza el borrador propio (3.6)                                                                |
| GET /api/actividades/{id}/reconocimientos/recibidos                   | Miembro                      | Lo recibido en esa actividad, sin autor. Vacío hasta que se aplica                                |
| GET /api/actividades/{id}/participantes/{idMembresia}/reconocimientos | Organizador o co-organizador | Lo recibido por un participante, con autoría                                                      |
| GET /api/insignias/acumulado                                          | Usuario                      | Puntos del actor por categoría                                                                    |
| GET /api/insignias/recibidos                                          | Usuario                      | Frases aplicadas del actor con su actividad, para el perfil                                       |
| GET /api/usuarios/yo                                                  | Usuario                      | Perfil propio con acumulado (Cuentas)                                                             |
| PATCH /api/usuarios/yo                                                | Usuario                      | Nombre y apellidos, o contraseña; nunca ambos en la misma petición (Cuentas)                      |
| PUT y DELETE /api/usuarios/yo/foto                                    | Usuario                      | Sube la imagen como cuerpo crudo o la quita (Cuentas)                                             |
| GET /api/usuarios/{id}/foto                                           | Usuario                      | La imagen, cacheable sin plazo: la URL lleva la fecha de la foto (Cuentas)                        |
| GET /api/usuarios/{id}                                                | Usuario                      | Nombre, foto y acumulado de otra persona. Nunca el correo (Cuentas)                               |

**Errores.** 400 con detalle por campo cuando falla una validación del ritual, con la llave `reconocimientos[i].campo` para que el cliente marque la fila exacta, y `reconocimientos` para el presupuesto. 409 `fuera_de_plazo` fuera de la ventana. 403 `sin_permiso` cuando un participante pide lo de otro. Un receptor inválido produce un solo mensaje ("no es un compañero al que puedas reconocer") para tres casos distintos: no es de la actividad, no es participante o es el propio actor. Distinguirlos no ayuda a quien usa la interfaz y sí revela membresías ajenas.

**La foto se verifica en el servidor por su firma**, no por el `Content-Type` que declara el cliente: los primeros bytes son los que decide el navegador que la muestre. Tipos admitidos JPEG, PNG y WebP, con un máximo de 512 KB; los límites viven en `packages/shared` para que cliente y servidor digan lo mismo.

# **7\. Cliente**

## **7.1 La insignia como pieza reusable**

| Componente             | Qué es                                                                                                  |
| :--------------------- | :------------------------------------------------------------------------------------------------------ |
| `MarcoRango`           | El marco del nivel. Envuelve cualquier contenido y no sabe qué enmarca                                  |
| `IconoCategoria`       | Emblema vectorial de la categoría. Titular del estado sin nivel y suplente si falta un PNG              |
| `InsigniaCategoria`    | Marco más emblema. Recibe puntos y deriva el nivel; nunca recibe el nivel por props                     |
| `VitrinaInsignias`     | Las seis insignias en orden de catálogo. Con `onSeleccionar` cada una es un botón con estado presionado |
| `DetalleInsignia`      | Nivel, barra de avance contra uno mismo y frases con su actividad                                       |
| `RitualReconocimiento` | El reparto del cierre: presupuesto, casillas por categoría, frase por insignia y guardado               |

**El nivel se deriva, no se pasa.** Dos props para un mismo hecho es una invitación a que se contradigan, y el estado derivado se calcula al usarlo (3.6 del general). Lo mismo aplica al presupuesto del ritual: lo dicta el servidor y el componente solo lo muestra.

## **7.2 El arte**

Una insignia son dos capas: el marco del nivel (cinco PNG en `assets/marcos/`) y el emblema de la categoría en ese nivel (treinta PNG en `assets/insignias/<categoria>/`). El mapa se arma con `import.meta.glob` y no con imports estáticos: un import de un archivo que no existe rompe el build, y treinta imports escritos a mano se desincronizan del disco en cuanto alguien renombra uno. Una prueba fija que no falte ninguno.

**El encuadre se mide, no se ajusta a ojo.** Cada marco declara el centro y el diámetro de su abertura (`--marco-x`, `--marco-y`, `--marco-diametro`). El diámetro es el del mayor círculo inscrito en la zona transparente, con un 10 % de respiro; el centro es el punto que deja el mismo hueco arriba que abajo sobre el eje del emblema. Los emblemas se recortan a su contenido para no traer margen propio, que los haría ver más chicos que sus hermanos. Platino y Diamante llevan una escala adicional porque sus marcos tienen más ornamento y, al mismo tamaño, se veían más pequeños.

**El alfa se verifica antes de commitear.** Los marcos originales llegaron con el fondo de cuadros pintado como píxeles opacos y se les recuperó la transparencia por detección del patrón. El mismo riesgo aplica al arte nuevo.

## **7.3 Rutas y claves de query**

| Ruta                                          | Pantalla                                   | Clave de query                                                         |
| :-------------------------------------------- | :----------------------------------------- | :--------------------------------------------------------------------- |
| /actividades/{id}/reconocer                   | Ritual                                     | `['actividades', id, 'reconocimientos']`                               |
| /actividades/{id}/insignias                   | Lo recibido en la actividad y el acumulado | `[..., 'reconocimientos', 'recibidos']`, `['insignias', 'acumulado']`  |
| /actividades/{id}/participantes               | Participantes, con enlace al perfil        | `['actividades', id, 'participantes']`                                 |
| /actividades/{id}/participantes/{idMembresia} | Lo recibido por un participante (organiza) | `['actividades', id, 'participantes', idMembresia, 'reconocimientos']` |
| /perfil                                       | Mi perfil                                  | `['usuarios', 'yo']`, `['insignias', 'recibidos']`                     |
| /usuarios/{id}                                | Perfil de otra persona                     | `['usuarios', id]`                                                     |

**Invalidación.** Guardar el ritual invalida todo lo de la actividad (`['actividades', id]`) y todo lo global de insignias (`['insignias']`). Editar datos o foto actualiza la sesión, que es la que pinta el avatar del menú, e invalida `['usuarios']`.

**La interfaz oculta, el servidor decide.** El enlace a lo recibido por un participante solo aparece para quien organiza, pero la barrera es el 403 del servidor (7.4 del general).

# **8\. El perfil**

Es la pantalla de Mi perfil de 6.6 del núcleo, con las insignias como contenido central.

| Sección       | Contenido                                                                                        |
| :------------ | :----------------------------------------------------------------------------------------------- |
| Identidad     | Foto o iniciales, nombre completo, correo (solo lo ve su dueño), nivel de estudios e institución |
| Tus insignias | Vitrina interactiva; al elegir una, `DetalleInsignia` con nivel, avance y frases recibidas       |
| Tus datos     | Nombre y apellidos. El correo no es editable (6.3 del núcleo)                                    |
| Contraseña    | Actual, nueva y confirmación. Al cambiarla se cierran las demás sesiones (3.2 del núcleo)        |

El perfil de otra persona muestra nombre, foto y la vitrina de solo lectura, y se abre desde la lista de participantes. Abrir el propio identificador redirige a /perfil.

**La foto se prepara en el navegador.** `prepararFoto` recorta al centro en cuadrado, respeta la orientación EXIF, reduce a 256 px y codifica en WebP, o en JPEG donde el navegador no sepa producir WebP. Mientras se prepara y se sube, los controles de foto quedan deshabilitados para que una segunda elección o "Quitar foto" no compitan con la primera.

# **9\. Pruebas del subsistema**

La fila de 10.1 del general que corresponde a este subsistema es la del presupuesto y la restricción al periodo de cierre. Lo que se prueba, y por qué no se ve probando a mano:

| Qué se verifica                                                                                                       | Dónde                                                 | Por qué                                                            |
| :-------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------- |
| Presupuesto con piso, techo y redondeo; niveles y progreso en sus bordes                                              | `packages/shared` (16)                                | Un umbral corrido por uno no falla: da un nivel equivocado         |
| Ventana: antes, durante y después; revelación diferida; anonimato; 403 al participante; acumulado solo de lo aplicado | `routes/insignias.test.ts` (17)                       | Un dato visible antes de tiempo se devuelve con normalidad         |
| Presupuesto contado por personas; organizador sin presupuesto; duplicado por categoría; frase obligatoria y acotada   | `routes/insignias.test.ts`                            | Un presupuesto excedido se guarda sin protestar                    |
| Perfil, contraseña que cierra otras sesiones, foto por firma y tamaño, perfil ajeno sin correo                        | `routes/perfil.test.ts` (11), `validacion.test.ts`    | Un correo expuesto o una sesión que sobrevive no producen error    |
| Ritual: presupuesto, bloqueo al agotarlo, categoría repetida, guardar la lista vacía, foco y nombres accesibles       | `RitualReconocimiento.test.tsx` (17)                  | El botón deshabilitado equivocado deja filas viejas en el servidor |
| Arte completo, sin nombres inválidos ni duplicados; emblema correcto por nivel                                        | `arteInsignias.test.ts`, `InsigniaCategoria.test.tsx` | Un PNG ausente cae en silencio al emblema vectorial                |
| Perfil y formulario de contraseña                                                                                     | `features/perfil` (12)                                | Validación y vaciado tras el éxito                                 |

**Datos de prueba.** Las pruebas del API registran un grupo fijo de cuentas una sola vez, porque el registro tiene límite de intentos, y crean actividades y membresías directamente con Prisma contra PostgreSQL real, como pide 12.2 del núcleo. Una actividad se monta indicando hace cuántos días terminó, que es lo que decide si la ventana está antes, abierta o aplicada.

# **10\. Plan de implementación**

## **10.1 Lo construido**

| Incremento                          | PR  | Contenido                                                                                    |
| :---------------------------------- | :-- | :------------------------------------------------------------------------------------------- |
| Capa de presentación                | #4  | Catálogo y escala en shared, marco más emblema, arte de las 30 piezas, vitrina               |
| Ritual de reconocimiento            | #7  | Presupuesto por personas, varias insignias por persona, frase guiada                         |
| Accesibilidad y borrador del ritual | #8  | Nombres accesibles por fila, foco devuelto al disparador, borrador que sobrevive al recargar |
| Reconocimientos en la actividad     | #9  | Relación de otorgamientos, API, ritual contra la API, lo recibido, vista de quien organiza   |
| Perfil de usuario                   | #10 | Perfil propio y ajeno, foto, datos, contraseña, frases con su actividad                      |

## **10.2 Lo pendiente**

En el orden en que conviene hacerlo, que es el de lo que desbloquea:

1. **Acotar los compañeros al equipo**, en cuanto exista la relación `equipos`. Un cambio en el servicio y sus pruebas (1.4).
2. **Leer el estado `cierre`** en lugar de calcular la ventana, en cuanto la transición exista (1.4).
3. **Emitir el evento de otorgamiento** al aplicarse, con la envoltura de historial del núcleo (3.6).
4. **Requisitos mínimos de la actividad**: 4 participantes y 4 semanas entre creación y cierre, ajustables por el administrador (P-33).
5. **Validación ligera y vista de grupo de quien organiza**: alerta de reciprocidad, frases vacías, descarte, y quién no recibió nada (P-35).
6. **Señales automáticas de Compromiso**, con fuente `sistema` (P-34).
7. **Filtro por rango en la búsqueda al invitar**, que depende del incremento de invitaciones del núcleo.
8. **Retirar la muestra de arte** `/insignias`, que ya no está en la navegación.

## **10.3 Orden de recorte propio**

Complementa 9.6 del general, que ya pone primero el filtro por rango y después los niveles visibles.

1. Señales automáticas de Compromiso, conservando el reconocimiento entre pares y de quien organiza.
2. Vista de grupo de quien organiza, conservando la vista por participante.
3. Alerta de reciprocidad, conservando el descarte manual.

**Lo que no se recorta.** El presupuesto, la unicidad por categoría, la ventana con revelación diferida y el anonimato entre pares. Son lo que hace del acumulado una señal y no un conteo de popularidad.

# **11\. Preguntas abiertas**

**P-31 — Reconocimiento en equipos de dos**

**Afecta:** presupuesto (3.1), salvaguardas.

**Propuesta por defecto:** en un equipo de dos, cada integrante reconoce al otro; el piso de 1 lo exige.

**Qué necesitamos confirmar:** con dos personas la reciprocidad es inevitable y el anonimato no existe, porque solo hay un posible autor. ¿Se deshabilita el reconocimiento entre pares en equipos de dos, dejando solo el de quien organiza, o se acepta?

**P-32 — Umbrales de la escala: constante o ajustables por el administrador**

**Afecta:** modelo (2.1), panel de administración.

**Propuesta por defecto:** la escala queda como constante de `packages/shared` hasta después del primer uso real, y se recalibra con un cambio de código.

**Qué necesitamos confirmar:** el concepto (§2.5) da al administrador el ajuste de umbrales. Hacerlo desde el panel exige materializar `niveles_insignia` y decidir si un ajuste es retroactivo: bajar un umbral sube de nivel a personas que ya estaban ahí. ¿Se necesita el ajuste en el panel para esta fase?

**P-33 — Momento en que se evalúan los requisitos mínimos**

**Afecta:** reglas (3), ciclo de vida.

**Propuesta por defecto:** se evalúan al abrir el ritual; si la actividad no los cumple, el ritual no se abre y se explica por qué.

**Qué necesitamos confirmar:** si quien organiza debe saberlo desde la configuración, para no descubrirlo al final del semestre, y si participantes desactivados cuentan.

**P-34 — Qué es una señal automática de Compromiso**

**Afecta:** fuente `sistema`, dependencia con Seguimiento.

**Propuesta por defecto:** 0.25 puntos por periodo de reporte con bitácora o avance registrado a tiempo, con un máximo por actividad.

**Qué necesitamos confirmar:** qué conductas cuentan, cuánto vale cada una y su techo. Es la única dependencia de Insignias con Seguimiento y conviene fijar el contrato antes de que cualquiera de los dos lo implemente, por el mismo riesgo de acoplamiento que señala 11 del general.

**P-35 — Alcance de la validación ligera**

**Afecta:** visibilidad (4), vista de quien organiza.

**Propuesta por defecto:** se marca como sospechosa la reciprocidad total (A reconoce a B en las mismas categorías y B a A) y la frase idéntica a la de otro otorgante; quien organiza puede descartar un reconocimiento durante la ventana y el descarte no se revela al autor.

**Qué necesitamos confirmar:** si descartar es una acción que el autor debe conocer, y si el co-organizador puede descartar o solo el organizador.

# **12\. Correcciones que este documento lleva al general**

Por la regla de remisión (1.1 del núcleo), estas imprecisiones se resuelven aquí y se proponen para la siguiente revisión del general.

| Sección del general | Qué dice                                                       | Qué debería decir                                                                                                   |
| :------------------ | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| 0.2                 | Dev design — Ui Chul (pendiente)                               | Enlace a este documento                                                                                             |
| 4.4                 | "Por qué desaparece la restricción de unicidad por categoría"  | La unicidad por categoría y persona se conserva junto con el presupuesto (concepto §6, 2.2 y 3.3 de este documento) |
| 4.6                 | Otorgante y receptor pertenecen al mismo equipo                | Correcto como regla; hoy se aplica a la actividad hasta que existan equipos (1.4)                                   |
| 7.3, P-09           | "Ver quién otorgó una insignia" pendiente para el participante | Resuelta: el participante no ve al autor par; sí ve si vino de quien organiza (4)                                   |
| 8.3                 | El evento se emite al otorgar                                  | Se emite al aplicarse, porque lo guardado se puede rehacer hasta el cierre (3.6)                                    |
| 11                  | Nombres del catálogo de niveles pendientes                     | Resuelta: Bronce, Plata, Oro, Platino y Diamante (5)                                                                |
