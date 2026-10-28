# Integraciones

## Incidencia SMTP de staging — 27 de octubre de 2026

La consulta de solo lectura de `VALIDACIÓN 02` confirmó Calendar sincronizado y siete trabajos fallidos en el primer intento: cuatro de creación (creador y tres contactos de Coordinación) y tres logísticos. El código conservado es `smtp-permanent`; no es `recipient-not-allowed`. Una verificación SMTP sin enviar mensajes confirmó `EAUTH`, respuesta `535 / 5.7.8` en autenticación, usando `SMTP_CONFIG` versión 3 enlazada a `createEvent`. El creador sí pertenece a la lista permitida. No se conoce si la contraseña fue revocada o sustituida; no atribuirlo a permisos de Coordinación.

Recuperación operativa:

1. El responsable genera una contraseña de aplicación válida de `eventos@tecplayacar.edu.mx`; nunca se copia al chat ni a archivos versionados.
2. Ejecuta `scripts/rotate-staging-smtp.ps1` en una terminal local. La entrada es oculta y se transmite al proceso Node por stdin, sin argumento de línea de comandos ni archivo temporal. El auxiliar `.cjs` usa la sesión existente de Firebase CLI, limita el destino a staging, conserva el JSON actualmente enlazado y reemplaza solo `password`. Silencia logs de Firebase y comprueba la autenticación de Gmail antes de crear la versión. No envía mensajes ni despliega servicios.
3. Verificar la versión creada y enlazarla mediante despliegue selectivo de las ocho Functions consumidoras SMTP, con autorización de staging; comprobar su estado y bindings.
4. Las entregas terminales no se reabren automáticamente al rotar el secreto ni mediante reconciliación. Recuperar los trabajos de esta incidencia requiere una operación separada, acotada a los fallidos por autenticación, autorizada y documentada; conservar IDs e historial, no repetir trabajos enviados ni aumentar la revisión del evento artificialmente.
5. Verificar entrega real al creador y coordinación y el resumen de la revisión vigente antes de cerrar la incidencia. La aceptación de octubre anterior no prueba la vigencia actual de la credencial.

El responsable ejecutó el auxiliar y confirmó autenticación Gmail correcta y creación de `SMTP_CONFIG` versión 4. La continuación de la reparación se limita a las ocho Functions consumidoras SMTP de staging; el diagnóstico previo no modificó servicios ni datos.

Recuperación excepcional acotada de `VALIDACIÓN 02`: después de verificar la versión nueva, seleccionar exactamente los siete trabajos identificados por el diagnóstico, del mismo evento y revisión/causa logística registrada. Exigir en una transacción que continúen `fallido`, con `ultimoErrorCodigo: smtp-permanent`, un intento, `fechaEnvio: null`, `proximoIntento: null` y sin lease. Conservar IDs, destinatarios, fotografía, revisión e intentos; reabrir con `estado: pendiente`, próximo intento actual y limpiar finalización/expiración terminales. Cambiar el resumen funcional a pendiente solo si la revisión canónica sigue siendo 1 y el evento no está cancelado. Si alguna precondición difiere, detener sin escrituras. El worker existente realizará el siguiente intento; no ejecutar un envío paralelo ni reabrir otros fallos. Registrar esta excepción y sus resultados aquí, sin agregar campos ni colecciones. La rotación ordinaria sigue sin reabrir trabajos automáticamente.

Resultado verificado: las ocho Functions quedaron `ACTIVE` y enlazadas a `SMTP_CONFIG` versión 4. La transacción de recuperación confirmó las precondiciones y reabrió exactamente siete trabajos a las 16:23:51 de Cancún (21:23:51 UTC), conservando IDs e intento anterior. El worker programado respondió 200, procesó siete trabajos y registró los siete como `enviado` en el segundo intento entre 16:28:02 y 16:28:10 de Cancún; `ultimoErrorCodigo` quedó en null y `VALIDACIÓN 02` revisión 1 quedó `notificacionesEstado: completas`. Esto confirma aceptación por SMTP; no se inspeccionaron buzones ni se afirma lectura del destinatario. No se crearon trabajos duplicados ni se reabrieron fallos ajenos.

Se publicó por separado Hosting con EVT-120 después de aprobar 96 pruebas Angular, lint y build; los 20 archivos remotos coinciden con el build local. No se modificaron Calendar, Rules, índices, datos de otros eventos ni producción. La aceptación funcional general de los doce casos anteriores sigue pendiente.

## Firebase Authentication

- Proveedor exclusivo: Google.
- Sesión observada mediante Firebase Authentication.
- Autorización resuelta por callable `bootstrapAuthorization`.
- Claims sincronizados mediante Admin SDK.
- Revocación de refresh tokens al desactivar usuarios.

## `bootstrapAuthorization`

Responsabilidades:

- Validar `request.auth`, correo verificado y dominio.
- Buscar el usuario por correo normalizado.
- Validar estado, rol y UID.
- Asociar UID si está vacío.
- Actualizar `ultimoAcceso`.
- Establecer claims `authorized` y `role`.
- Retornar el perfil autorizado.

Debe ser idempotente y no crear documentos de usuario.

## Google Calendar

- Calendario existente configurado mediante secreto o variable backend.
- No crear calendarios nuevos.
- Zona horaria: `America/Cancun`.
- Enviar fecha y hora local sin conversión previa con `toISOString()`.
- Integración exclusiva mediante Cloud Functions.
- Los contactos de Coordinaciones no se agregan a `attendees`.
- Calendar se procesa independientemente del correo; un fallo SMTP no recrea, elimina ni revierte el evento de Calendar.
- Un evento de varios días se representa como una sola entrada temporal continua desde el primer inicio hasta el último fin.
- FullCalendar no lee este calendario. La vista administrativa consume el estado canónico de Firestore por intervalo visible.

### Configuración aprobada de staging

- Proyecto: `eventos-tup-angular-stg`.
- Calendario: calendario institucional adicional compartido con `eventos@tecplayacar.edu.mx` con permiso para realizar cambios y administrar el uso compartido. El ID exacto se conserva únicamente en el secreto backend.
- Google Calendar API: habilitada en el mismo proyecto de staging.
- Cliente OAuth, secreto, refresh token e ID de calendario: cargados en `GOOGLE_CALENDAR_CONFIG` de Secret Manager y enlazados a las Functions consumidoras de staging; sus valores no se documentan ni se imprimen.
- La Function consume `GOOGLE_CALENDAR_CONFIG` desde Secret Manager; nunca recibe estas credenciales desde Angular ni las registra en logs.

## Correo

- La creación se dirige individualmente al creador y a los correos institucionales vigentes de las coordinaciones seleccionadas.
- La actualización se genera cuando cambia nombre, fecha, horario o coordinaciones.
- Retirar una coordinación genera un aviso específico para ella.
- La cancelación genera aviso para creador, contactos vigentes y destinatarios previamente notificados aplicables.
- Se normalizan y deduplican destinatarios antes de crear trabajos.
- El contenido mínimo incluye tipo de aviso, nombre, fecha, horario y responsable.
- Cada entrega contiene una versión HTML responsive y una alternativa de texto plano semánticamente equivalente. El HTML no depende de imágenes, fuentes, hojas de estilo o rastreadores externos.
- La plantilla usa la identidad visual institucional, un estado textual visible y una tarjeta legible en escritorio y móvil. Presenta fecha en español, horario de `America/Cancun`, campus y dirección, responsable, nombres de coordinaciones, equipos con cantidades, observaciones y cambios aplicables.
- `actualizacion` y `retiro_coordinacion` muestran un resumen de campos modificados calculado desde fotografías protegidas. `cancelacion` y `logistica` usan avisos visuales propios sin depender solo del color.
- Los campos canónicos se escapan antes de incorporarse al HTML y el asunto se normaliza como una sola línea. No se incluyen IDs, estados técnicos, correos de otros destinatarios, capacidad total del inventario, secretos, enlaces públicos ni el protocolo como adjunto.
- SMTP y secretos exclusivamente en backend.
- Los destinatarios proceden del perfil canónico y de `coordinaciones`; nunca del correo libre enviado por el cliente.
- Cada destinatario tiene un registro idempotente protegido en `notificacionesEventos`.

### Configuración aprobada de staging

- Host: `smtp.gmail.com`.
- Puerto: `465`.
- Transporte seguro: SSL/TLS desde el inicio (`secure: true`).
- Usuario y remitente: `eventos@tecplayacar.edu.mx`.
- El envío manual del buzón a `omar.sanchez@tecplayacar.edu.mx` fue comprobado y la contraseña de aplicación ya fue generada.
- La Function consume `SMTP_CONFIG` desde Secret Manager. Antes de llamar SMTP, el backend autoriza el destinatario normalizado por una de dos vías: pertenencia a `allowedRecipients`, o trabajo protegido `coordinacion`/`sistemas` con `coordinacionId` canónico y dominio institucional exacto. Una dirección que no cumpla ninguna se bloquea con un estado sanitizado y nunca se envía ni se redirige silenciosamente.

La lista fija es una defensa de staging para creadores y cuentas operativas. Los contactos de Coordinaciones dejan de requerir una edición manual del secreto: su autorización procede del documento de notificación protegido que backend creó a partir del catálogo canónico. Esta procedencia permanece estable durante reintentos y para coordinaciones suspendidas o contactos históricos aplicables; no permite que un cliente proponga direcciones. Producción tendrá su propia configuración y no heredará automáticamente la lista fija de staging.

`allowedRecipients` continúa obligatorio y en staging conserva `omar.sanchez@tecplayacar.edu.mx`, `eventos@tecplayacar.edu.mx`, `victor.yama@tecplayacar.edu.mx` y `lizett.mendez@tecplayacar.edu.mx`. Si falta, está vacío o tiene un tipo inválido, la configuración se considera inválida. No es necesario rotar el secreto al agregar o editar contactos en Coordinaciones. La versión segura vigente se enlaza únicamente a las Functions consumidoras y sus contraseñas nunca se leen en logs o documentación.

## Gestión de configuración y secretos

- Desarrollo local usa dobles de Calendar/SMTP por defecto.
- Cuando una prueba local requiera credenciales reales, los emuladores leen secretos únicamente desde `functions/.secret.local`; valores no sensibles pueden ir en `functions/.env.local`.
- `.secret.local`, `.env.local` y cualquier variante local con valores reales permanecen ignorados por Git.
- Staging y producción usan secretos estructurados independientes en Secret Manager: `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG`.
- Cada Function declara y enlaza exclusivamente el secreto que utiliza; una Function sin ese vínculo no puede leerlo.
- No se utilizan archivos `.env` del frontend, `environment*.ts`, Remote Config, Firestore ni Storage para credenciales.
- Los secretos se cargan después de implementar y probar con dobles, pero antes del primer despliegue funcional de las integraciones a staging.
- Cada secreto estructurado contiene exactamente un objeto JSON. Dos objetos concatenados, texto adicional o campos repetidos fuera del objeto se consideran configuración inválida y fallan de forma cerrada antes de solicitar tokens o llamar servicios externos.
- Corregir un secreto crea una versión nueva; la anterior se conserva temporalmente para reversión. Después de validar la estructura y el acceso en modo lectura se redespliegan únicamente las Functions consumidoras para fijar la versión vigente.

### Recuperación de Calendar en staging — 1 de octubre de 2026

La primera creación real confirmó Firestore y SMTP, pero dejó `calendarEstado: error`. La inspección segura de `GOOGLE_CALENDAR_CONFIG` versión 1 detectó dos objetos JSON completos, idénticos y concatenados. Se creó la versión 2 con una sola copia, se validaron el refresh token y el endpoint de eventos de `CALENDARIO - STAGING`, y las siete callables enlazadas quedaron `ACTIVE` consumiendo explícitamente la versión 2.

La reconciliación autenticada posterior completó `PRUEBA 1` sin repetir el correo: Firestore quedó con `calendarEstado: sincronizado`, `calendarEventId` presente y `notificacionesEstado: completas`. La bandeja protegida conservó exactamente un trabajo `creacion/enviado`, cuya actualización era anterior a la reconciliación. Una consulta de solo lectura a Google Calendar confirmó una única entrada activa con resumen `PRUEBA 1`, estado `confirmed` y horario del 6 de octubre de 2026 de 09:37 a 10:00 en la zona aprobada. El 3 de octubre se aceptaron también actualización y cancelación reales; no se regeneraron credenciales ni se modificó producción.

El 1 de octubre de 2026, `PRUEBA 2` revisión 3 confirmó el cierre seguro de la lista anterior: el aviso al creador se envió y el de coordinación terminó como `recipient-not-allowed`, por lo que el estado visible fue `parciales`. Después de la autorización expresa se creó `SMTP_CONFIG` versión 3 con las cuatro cuentas permitidas y se enlazó a las ocho Functions consumidoras. El trabajo fallido permanece terminal e idempotente; cambiar el secreto no lo reabre ni lo duplica y la entrega nueva requiere otra revisión funcional del evento.

La integración inicial utilizó `calendar.events.owned` para el calendario desechable propiedad de la cuenta. El calendario institucional compartido exige un refresh token nuevo de `eventos@tecplayacar.edu.mx` con alcance `calendar.events`; este alcance permite operar eventos en calendarios a los que la cuenta tenga acceso y no sustituye los permisos configurados en Calendar. Antes de activar la nueva versión del secreto se valida el endpoint `/events` del calendario objetivo. El token, el ID y las credenciales nunca se imprimen ni se documentan.

### Sustitución por calendario institucional — 2 de octubre de 2026

Se autorizó que staging deje de escribir en `CALENDARIO - STAGING` y use el calendario institucional adicional. Los eventos creados durante las pruebas son desechables y no se copian, recrean ni reconcilian en el nuevo calendario. El calendario anterior no se elimina mediante esta migración; simplemente deja de ser el destino configurado.

La activación se ejecutó en este orden: se verificó el permiso concedido a `eventos@tecplayacar.edu.mx`, se obtuvo consentimiento OAuth con `calendar.events`, se comprobó mediante lectura el endpoint de eventos del calendario institucional, se creó `GOOGLE_CALENDAR_CONFIG` versión 3 conservando la estructura aprobada y se redesplegaron exclusivamente las siete Functions consumidoras. Todas quedaron `ACTIVE` en `us-central1`. La creación sintética nueva y su ciclo posterior quedaron aceptados el 3 de octubre; no se reutilizan `calendarEventId` pertenecientes al calendario anterior.

## Notificaciones logísticas de Equipos — implementación autorizada

- La coordinación responsable de Sistemas se selecciona desde el catálogo de Coordinaciones y se persiste únicamente por ID canónico en configuración protegida.
- El backend resuelve los correos institucionales vigentes al crear cada aviso; el cliente no envía destinatarios.
- Requieren aviso futuro: cobertura fuera de horario pendiente, reducción de inventario con reservas afectadas, cambio incompatible después de traslado, demora reportada y cancelación posterior a salida.
- Una coordinación suspendida o sin correos no revierte la reservación; registra una advertencia sanitizada y permanece reconciliable cuando vuelva a existir un destinatario canónico.
- Los avisos son individuales, deduplicados e idempotentes y usan la misma política de reintentos aprobada para SMTP.
- Las notificaciones logísticas no convierten contactos en usuarios ni asistentes de Google Calendar.
- Calendar permanece separado de la disponibilidad y los movimientos de equipo.

## Bandeja de salida y reintentos

1. La operación autorizada de Eventos calcula una revisión y el conjunto canónico de destinatarios.
2. Una transacción crea como máximo un registro por `claveIdempotencia`.
3. Un worker backend reclama el registro `pendiente` sin permitir dos procesadores simultáneos.
4. Al confirmar SMTP, registra `enviado` y `fechaEnvio`.
5. Ante fallo sanitizado, aumenta `intentos`, registra `fallido` y permite reintento conforme a la política operativa.
6. Reintentar una revisión no vuelve a enviar registros ya confirmados como `enviado`.

Política aprobada por destinatario:

- Intento 1: inmediatamente.
- Reintento 1: 5 minutos después.
- Reintento 2: 30 minutos después del fallo anterior.
- Reintento 3: 2 horas después del fallo anterior.
- Después del cuarto intento fallido se marca fallo permanente y no se programa otro intento.
- Un rechazo SMTP identificado como permanente finaliza inmediatamente, sin consumir reintentos innecesarios.
- Los registros `enviado` o con fallo permanente se purgan 90 días después de `fechaFinalizacion`.

El evento y Calendar no se revierten por un fallo de correo. La UI muestra “evento guardado con notificaciones pendientes” cuando corresponda.

### Ejecución y reclamación aprobadas

- La operación intenta procesar inmediatamente los trabajos recién creados, siempre después de confirmar la transacción Firestore.
- Un worker programado cada 5 minutos recupera hasta 50 trabajos vencidos.
- Cada trabajo se reclama transaccionalmente mediante `procesadorId` y `bloqueoHasta`; el lease dura 10 minutos.
- El worker verifica que conserva el lease antes de SMTP. Un lease vencido puede recuperarse y no se interpreta como envío confirmado.
- `notificacionesEstado` queda `pendiente` mientras exista trabajo recuperable, `completas` cuando todos los trabajos de la revisión vigente estén enviados y `parciales` cuando exista fallo permanente.
- Firestore TTL usa `fechaExpiracion` para retirar notificaciones terminales después de 90 días. La eliminación es asíncrona y la aplicación no depende de su instante exacto.

## PDFs de Eventos

- Al reemplazar un protocolo se carga primero el PDF nuevo y se confirma la referencia nueva en Firestore antes de eliminar el anterior.
- Si la eliminación del PDF anterior falla, se registra para reintento; no se revierte la referencia nueva válida.
- Una creación que falle después de cargar el archivo intenta eliminarlo inmediatamente.
- Una limpieza programada elimina después de 24 horas los archivos temporales o cargados que no estén referenciados por un evento.
- La limpieza nunca elimina un archivo referenciado por el estado canónico del evento.
- El backend persiste `protocoloRuta` derivada del objeto validado y la usa como autoridad de reemplazo y eliminación; el cliente no decide la ruta canónica.
- `cleanupEventProtocols` se ejecuta diariamente a las 04:00 en `America/Cancun`, revisa exclusivamente `eventos/`, ignora objetos menores de 24 horas y procesa como máximo 1000 por ejecución.
- Superar el lote o fallar parcialmente registra `reconciliation-required`; la ejecución no comunica una limpieza completa falsa.

## Verificación de staging

- Calendar usa exclusivamente el calendario institucional adicional configurado en `GOOGLE_CALENDAR_CONFIG` para `eventos-tup-angular-stg`; el calendario desechable anterior y sus eventos de prueba quedan fuera de la reconciliación.
- SMTP usa `eventos@tecplayacar.edu.mx`; permite la lista fija de staging y contactos institucionales con procedencia canónica de Coordinaciones. Creadores no incluidos en la lista fija y destinatarios sin procedencia continúan bloqueados.
- Se prueban creación, actualización, cancelación histórica, zona horaria, ausencia de asistentes, deduplicación, fallos parciales y reintentos.
- La verificación es obligatoria antes de autorizar producción y no implica desplegar este incremento.

## Consulta objetivo del calendario administrativo

- La vista FullCalendar solicita a la capa de Eventos únicamente el intervalo visible, con zona `America/Cancun`.
- El rango mensual máximo inicial es de 42 fechas; semana y día solicitan intervalos menores. Un rango inválido o superior se rechaza.
- El contrato incluye eventos cuyo intervalo se superpone a la vista, aunque hayan comenzado antes del primer día visible.
- La respuesta contiene `serverNow`, ID, nombre, inicio, fin, campus, responsable, estado derivado y propiedad necesaria para habilitar acciones; no contiene correos, trabajos SMTP, configuración logística ni datos administrativos de inventario.
- Firestore es la fuente canónica. La consulta no usa Google Calendar, iCalendar ni feeds públicos.
- La estrategia exacta de consulta e índices se aprueba antes de código y debe aprovechar que ningún evento supera seis fechas operativas consecutivas, sin descargar el historial completo.

## Contratos objetivo de Functions de Eventos

### `getEventDetail`

Entrada: `eventId`. Devuelve datos editables, fotografías y proyección logística sanitizada. No devuelve correos, secretos, controles de concurrencia, leases ni documentos de notificación.

### `updateEvent`

Entrada: `eventId` y estado objetivo completo. Valida propiedad, compara con el estado previo, aplica restricciones temporales y sustituye reservaciones en una transacción. Si el estado nuevo no puede confirmarse, conserva el anterior sin cambios parciales.

### `reconcileEventIntegrations`

Entrada: `eventId`. Propietario o `admin`. Reintenta Calendar y trabajos pendientes desde estado canónico sin duplicar recursos ya confirmados.

### `processEventIntegrations`

Entrada: `eventId`. Valida autorización y propiedad, crea Calendar si falta, persiste `calendarEventId` y genera trabajos idempotentes de creación. No envía a destinatarios proporcionados por el cliente.

### `syncUpdatedEventIntegrations`

Entrada: `eventId` y la revisión esperada. Valida propiedad, actualiza Calendar o lo recrea si ya no existe y genera trabajos de actualización o retiro calculados desde el estado canónico y la fotografía anterior.

### `cancelEvent`

Entrada: `eventId`. Valida propiedad, retira Calendar y protocolo de forma idempotente, resuelve reservas según su etapa y, en una transacción final, crea trabajos de cancelación con su fotografía y conserva el documento Firestore con `estatus: cancelado`, `fechaCancelacion` y `canceladoPorUid`. El evento queda de solo lectura y visible como cancelado en consultas históricas.

### Operaciones administrativas de logística

- `confirmReservationCoverage(eventId, equipmentId)` retira únicamente el motivo `cobertura_sistemas` y confirma si no queda otra revisión.
- `confirmEquipmentReception(eventId, equipmentId)` registra recepción con hora de servidor, finaliza la reserva y libera capacidad anticipadamente.
- `reportEquipmentDelay(eventId, equipmentId, nuevaLiberacion)` exige un instante futuro válido y extiende bloqueo y liberación.
- Las tres exigen `admin`, actualizan el control del equipo en la misma transacción y escriben auditoría estructurada sin datos sensibles.

### Avisos logísticos a Sistemas

La reconciliación backend inspecciona las reservaciones y crea trabajos `tipo: logistica` cuando exista cobertura pendiente, inventario reducido, un cambio incompatible después de iniciar el traslado, una demora o una cancelación posterior a la salida. Los destinatarios se resuelven exclusivamente desde `configuracion/logisticaEquipos.coordinacionSistemasId` y los correos actuales de esa coordinación; el cliente no envía IDs alternos ni direcciones.

La clave idempotente incluye evento, equipo, motivo, versión de origen de esa causa y destinatario. Cada reservación guarda esas versiones por separado en `versionesAvisoLogistico`; una demora no vuelve a emitir cobertura pendiente, por ejemplo. La versión ocupa `revision` en estos trabajos y no incrementa `revisionNotificacion`, por lo que un aviso logístico no provoca correos funcionales de actualización al creador o a otras coordinaciones. Los trabajos comparten worker, lease, reintentos, autorización SMTP y retención con las demás notificaciones, pero no forman parte del resumen funcional `notificacionesEstado` de la revisión del evento.

### `listCalendarEvents`

Entrada: inicio y fin exclusivos del intervalo visible. Valida autorización, zona, orden y duración máxima; consulta eventos superpuestos y devuelve `serverNow` y la proyección sanitizada con estado temporal calculado a hora de servidor. No acepta filtros que amplíen permisos ni obtiene datos desde Google Calendar.

Los contratos de Eventos, Calendar, SMTP, logística, mantenimiento y backfill están implementados y desplegados únicamente a staging. El 3 de octubre de 2026 se aceptaron la creación, actualización y cancelación sobre una sola entrada del calendario institucional, la entrega permitida a contactos canónicos de Coordinaciones, las negativas controladas, la deduplicación y la presentación HTML. Ninguna evidencia autoriza producción.

## Búsqueda y compatibilidad histórica

- `listEvents` acepta `busqueda` de 2 a 80 caracteres y un cursor ligado al mismo término.
- Backend normaliza la entrada y consulta `terminosBusqueda` con páginas de 25 y creación descendente.
- Se autoriza implementar un comando de backfill con modo seco, reanudación y reporte para calcular `inicioAt`, `finAt` y `terminosBusqueda` de históricos válidos.
- El comando no crea reservas, Calendar o correos y no puede ejecutarse contra producción sin autorización separada.

## Requisitos comunes

- Verificar `request.auth.token.authorized == true`.
- Validar rol o propiedad según la operación.
- No confiar en UID, correo, rol o propietario enviados por el cliente.
- Usar mensajes funcionales y logs backend sin secretos.
- Evitar duplicados mediante idempotencia.

## Configuración operativa resuelta en staging

- `configuracion/logisticaEquipos` guarda el ID canónico `GoPowUg4NO8bbW5658Jx` de la Coordinación de Sistemas y los valores de ADR-010.
- `GOOGLE_CALENDAR_CONFIG` versión 3 y `SMTP_CONFIG` versión 4 están enlazados a las Functions consumidoras correspondientes. Calendar usa el calendario institucional compartido y OAuth `calendar.events`; la comprobación de lectura aprobó sin exponer credenciales.
- La lista fija conserva Omar, Eventos, Víctor Yama y Lizett Méndez. Los contactos institucionales fotografiados como `coordinacion` o `sistemas` se autorizan dinámicamente sin rotar `SMTP_CONFIG`; cualquier otra dirección continúa bloqueada.
- El 2 de octubre de 2026 la plantilla institucional HTML y su alternativa de texto quedaron desplegadas en las ocho Functions consumidoras de SMTP de staging. El contenido usa únicamente datos fotografiados de la revisión, estilos inline, escape de valores y recursos locales al propio mensaje; Firebase confirmó las ocho actualizaciones sin modificar secretos, Hosting, Rules, índices, datos o producción.
- El 3 de octubre de 2026 se implementó y validó la autorización dinámica de contactos de Coordinaciones definida por RN-082. Con autorización separada se actualizaron únicamente las ocho Functions consumidoras de SMTP en staging y Firebase confirmó las ocho operaciones. `SMTP_CONFIG` versión 3 se conservó sin rotación; la prueba real positiva fuera de la lista fija y las negativas controladas quedaron aceptadas ese mismo día. No se modificaron Hosting, Rules, índices, datos o producción.

## Seguimiento operativo después de aceptar staging

- Confirmar las cuotas reales de Gmail SMTP, Calendar API y del worker con la carga esperada.
- Observar durante un periodo representativo los reintentos, jobs, logs sanitizados, presupuesto, limpieza y TTL para detectar crecimiento o bucles inesperados.
- Resolver mediante actualización compatible las vulnerabilidades moderadas de ejecución; no usar `npm audit fix --force`.

La aceptación manual del 3 de octubre siguió el orden aprobado: configuración canónica, Rules, Functions enlazadas, creación, actualización, cancelación, entrega dinámica, negativas, deduplicación y revisión visual. Un fallo futuro detiene la secuencia y no se compensa borrando el evento canónico de Firestore.

## Corrección de reintentos y revisión vigente — 27 de octubre de 2026

- Calendar asigna al crear un ID determinista hexadecimal derivado del ID canónico del evento. Reintentos, respuestas perdidas y llamadas concurrentes usan el mismo ID; no crean IDs aleatorios. Conserva IDs ya enlazados. Ante 409, recupera y valida eventosTupId antes de actualizar el recurso existente; nunca sobreescribe un recurso ajeno.
- Si un ID enlazado desaparece (404/410), su sustituto se deriva del evento y del ID anterior, por lo que los reintentos de la sustitución también convergen. Un recurso cancelado conserva una identidad retirada; se deriva un sucesor determinista con un máximo de tres intentos por llamada. Errores de permisos, transporte o límites permanecen recuperables sin crear identidades alternativas al azar. No se migran entradas existentes ni se eliminan duplicados históricos automáticamente.
- Fundamento: [IDs de Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) y [tratamiento de 409](https://developers.google.com/workspace/calendar/api/guides/errors).
- El resumen notificacionesEstado se recalcula en una transacción que lee la revisión canónica y los trabajos funcionales de esa misma revisión. Un trabajo antiguo puede completar su historial, pero nunca cambia el resumen de una revisión posterior. Cambios concurrentes de evento o de trabajos obligan a reintentar la lectura.
- Reducción de inventario crea avisos logísticos en la propia transacción de Equipos, con la misma clave evento/equipo/motivo/versión/destinatario que la reconciliación. El worker existente los procesa sin requerir otra edición o sincronización del evento.
- Correcciones desplegadas con autorización expresa únicamente a staging el 27 de octubre de 2026. La regresión local utilizó Calendar/SMTP simulados; durante la verificación del despliegue no se ejecutó un ciclo real ni se enviaron correos de prueba. Su aceptación funcional autenticada queda pendiente.

## Orden de Calendar y transición de coordinaciones — publicado en staging

- Adquirir un lease protegido por evento antes de leer la versión a enviar a Calendar. Una llamada concurrente devuelve pendiente, sin iniciar otra escritura externa.
- Calendar y OAuth tienen timeout HTTP de 15 segundos por solicitud. No se hacen peticiones externas dentro de transacciones Firestore.
- Tras cada operación externa, releer evento y lease en una transacción. Comparar la fotografía de todos los campos enviados y la revisión/cancelación: una respuesta antigua no puede declarar sincronizada la versión nueva. Conservar el ID obtenido para poder retirar una creación que coincidió con cancelación.
- Si cambió el evento, mantener pendiente y procesar su versión más reciente bajo el mismo lease, hasta cinco vueltas. Si continúa cambiando, liberar dejando pendiente para una reconciliación posterior. Publicar éxito y liberar se hacen atómicamente; errores nunca sobreescriben el estado publicado por otro propietario del lease.
- Una cancelación sin ID guardado también intenta retirar la identidad determinista inicial, para recuperar una creación cuya respuesta se perdió. Los timeouts externos no garantizan una transacción distribuida; se conserva reconciliación e idempotencia, sin prometer exactly-once del proveedor.
- Un proceso terminado abruptamente deja el lease hasta su vencimiento (máximo diez minutos). El próximo intento reanuda desde Firestore. No se elimina un lease ajeno ni se atribuye éxito a una operación incompleta.
- Los retiros se calculan desde coordinacionIdsRetiradas de la revisión vigente. Se deduplican por evento/revisión/tipo/correo y no se repiten al editar posteriormente nombre, fecha u horario sin retirar esa coordinación otra vez. Reagregar y volver a retirar genera una nueva transición legítima.
- Solo se aprovechan contactos históricos de la revisión inmediatamente anterior para esos IDs retirados; se agregan sus contactos canónicos sin avisar dos veces a quien ya recibe la actualización actual. La falta de historial no inventa retiros; la transición canónica funciona aunque los correos anteriores hayan expirado por TTL.
- Antes de crear cada trabajo se revalida la revisión canónica: una preparación obsoleta no crea trabajos nuevos de una edición superada. Los trabajos ya confirmados conservan su política histórica de reintentos.

- Antes de iniciar una operación Calendar se exigen al menos tres minutos restantes de lease para cubrir sus solicitudes HTTP acotadas. Si no queda ese margen, se libera el control y se devuelve pendiente; no se inicia trabajo remoto al borde del vencimiento.

## Sincronización con revisión esperada — EVT-116 en staging

syncUpdatedEventIntegrations conserva eventId y revisionEsperada. El caso de uso comprueba identidad, claims y perfil canónico antes de leer el evento, valida el ID y autoriza propietario o admin antes de leer/comparar la revisión. Revisión distinta devuelve failed-precondition sin reconciliar; no se devuelve ese dato a usuarios sin permiso. El sincronizador de Calendar sigue reconciliando la versión canónica vigente conforme a RN-083; la comprobación de revisionEsperada no es una transacción distribuida. Esta corrección fue validada localmente y desplegada únicamente a staging el 27 de octubre de 2026; la callable quedó ACTIVE y rechazó solicitudes anónimas con UNAUTHENTICATED. No se ejecutaron operaciones Calendar/SMTP reales durante la comprobación del despliegue.
