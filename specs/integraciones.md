# Integraciones

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

La reconciliación autenticada posterior completó `PRUEBA 1` sin repetir el correo: Firestore quedó con `calendarEstado: sincronizado`, `calendarEventId` presente y `notificacionesEstado: completas`. La bandeja protegida conservó exactamente un trabajo `creacion/enviado`, cuya actualización era anterior a la reconciliación. Una consulta de solo lectura a Google Calendar confirmó una única entrada activa con resumen `PRUEBA 1`, estado `confirmed` y horario del 6 de octubre de 2026 de 09:37 a 10:00 en la zona aprobada. No se regeneraron credenciales, no se modificó producción y las pruebas reales de actualización y cancelación siguen pendientes.

El 1 de octubre de 2026, `PRUEBA 2` revisión 3 confirmó el cierre seguro de la lista anterior: el aviso al creador se envió y el de coordinación terminó como `recipient-not-allowed`, por lo que el estado visible fue `parciales`. Después de la autorización expresa se creó `SMTP_CONFIG` versión 3 con las cuatro cuentas permitidas y se enlazó a las ocho Functions consumidoras. El trabajo fallido permanece terminal e idempotente; cambiar el secreto no lo reabre ni lo duplica y la entrega nueva requiere otra revisión funcional del evento.

La integración inicial utilizó `calendar.events.owned` para el calendario desechable propiedad de la cuenta. El calendario institucional compartido exige un refresh token nuevo de `eventos@tecplayacar.edu.mx` con alcance `calendar.events`; este alcance permite operar eventos en calendarios a los que la cuenta tenga acceso y no sustituye los permisos configurados en Calendar. Antes de activar la nueva versión del secreto se valida el endpoint `/events` del calendario objetivo. El token, el ID y las credenciales nunca se imprimen ni se documentan.

### Sustitución por calendario institucional — 2 de octubre de 2026

Se autorizó que staging deje de escribir en `CALENDARIO - STAGING` y use el calendario institucional adicional. Los eventos creados durante las pruebas son desechables y no se copian, recrean ni reconcilian en el nuevo calendario. El calendario anterior no se elimina mediante esta migración; simplemente deja de ser el destino configurado.

La activación se ejecutó en este orden: se verificó el permiso concedido a `eventos@tecplayacar.edu.mx`, se obtuvo consentimiento OAuth con `calendar.events`, se comprobó mediante lectura el endpoint de eventos del calendario institucional, se creó `GOOGLE_CALENDAR_CONFIG` versión 3 conservando la estructura aprobada y se redesplegaron exclusivamente las siete Functions consumidoras. Todas quedaron `ACTIVE` en `us-central1`. Permanece pendiente ejecutar una creación sintética nueva; no se reutilizan `calendarEventId` pertenecientes al calendario anterior.

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

Los contratos de Eventos, Calendar, SMTP, logística, mantenimiento y backfill están implementados y desplegados únicamente a staging. Calendar y SMTP cuentan con evidencia real de creación/reconciliación y entrega permitida en el calendario de prueba; la configuración del calendario institucional fue validada en lectura y permanece pendiente su creación sintética controlada, junto con actualización, cancelación y negativas. Ninguna evidencia autoriza producción.

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
- `GOOGLE_CALENDAR_CONFIG` versión 3 y `SMTP_CONFIG` versión 3 están enlazados a las Functions consumidoras correspondientes. Calendar usa el calendario institucional compartido y OAuth `calendar.events`; la comprobación de lectura aprobó sin exponer credenciales.
- La lista fija conserva Omar, Eventos, Víctor Yama y Lizett Méndez. Los contactos institucionales fotografiados como `coordinacion` o `sistemas` se autorizan dinámicamente sin rotar `SMTP_CONFIG`; cualquier otra dirección continúa bloqueada.
- El 2 de octubre de 2026 la plantilla institucional HTML y su alternativa de texto quedaron desplegadas en las ocho Functions consumidoras de SMTP de staging. El contenido usa únicamente datos fotografiados de la revisión, estilos inline, escape de valores y recursos locales al propio mensaje; Firebase confirmó las ocho actualizaciones sin modificar secretos, Hosting, Rules, índices, datos o producción.
- El 3 de octubre de 2026 se implementó y validó la autorización dinámica de contactos de Coordinaciones definida por RN-082. Con autorización separada se actualizaron únicamente las ocho Functions consumidoras de SMTP en staging y Firebase confirmó las ocho operaciones. `SMTP_CONFIG` versión 3 se conservó sin rotación; no se modificaron Hosting, Rules, índices, datos o producción. La prueba real de un contacto fuera de la lista fija continúa pendiente.

## Pendientes antes de aceptar las integraciones de staging

- Verificar una entrega a un contacto canónico de Coordinaciones fuera de la lista fija, un creador institucional fuera de esa lista rechazado y un correo externo rechazado antes de SMTP.
- Confirmar las cuotas reales de Gmail SMTP, Calendar API y del worker con la carga esperada.
- Ejecutar creación, actualización y cancelación contra Calendar, además de envío, bloqueo fuera de lista, reintentos y deduplicación SMTP.
- Validar visualmente en Gmail una notificación nueva o una actualización posterior al despliegue; los trabajos ya enviados conservan el cuerpo histórico y no se reenvían.

La prueba real sigue este orden: dependencias de ejecución sin vulnerabilidades altas o críticas; configuración logística canónica; Rules; Storage Rules; Functions enlazadas a los secretos; creación sintética; actualización; cancelación; bloqueo fuera de lista; revisión de jobs, logs y presupuesto. Un fallo detiene la secuencia y no se compensa borrando el evento canónico de Firestore.
