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
- Calendario: `CALENDARIO - STAGING` bajo `eventos@tecplayacar.edu.mx`.
- Google Calendar API: habilitada en el mismo proyecto de staging.
- Cliente OAuth, secreto, refresh token e ID de calendario: obtenidos y pendientes de carga segura antes del primer despliegue real de estas Functions.
- La Function consume `GOOGLE_CALENDAR_CONFIG` desde Secret Manager; nunca recibe estas credenciales desde Angular ni las registra en logs.

## Correo

- La creación se dirige individualmente al creador y a los correos institucionales vigentes de las coordinaciones seleccionadas.
- La actualización se genera cuando cambia nombre, fecha, horario o coordinaciones.
- Retirar una coordinación genera un aviso específico para ella.
- La cancelación genera aviso para creador, contactos vigentes y destinatarios previamente notificados aplicables.
- Se normalizan y deduplican destinatarios antes de crear trabajos.
- El contenido mínimo incluye tipo de aviso, nombre, fecha, horario y responsable.
- SMTP y secretos exclusivamente en backend.
- Los destinatarios proceden del perfil canónico y de `coordinaciones`; nunca del correo libre enviado por el cliente.
- Cada destinatario tiene un registro idempotente protegido en `notificacionesEventos`.

### Configuración aprobada de staging

- Host: `smtp.gmail.com`.
- Puerto: `465`.
- Transporte seguro: SSL/TLS desde el inicio (`secure: true`).
- Usuario y remitente: `eventos@tecplayacar.edu.mx`.
- Único destinatario permitido: `omar.sanchez@tecplayacar.edu.mx`.
- El envío manual del buzón al destinatario permitido fue comprobado y la contraseña de aplicación ya fue generada.
- La Function consume `SMTP_CONFIG` desde Secret Manager. Antes de llamar SMTP, el backend compara el destinatario normalizado contra `allowedRecipients`; una dirección no permitida se bloquea con un estado sanitizado y nunca se envía ni se redirige silenciosamente.

La lista permitida es una defensa exclusiva de staging. Para probar entregas de coordinaciones sin contactar personas reales se usan datos sintéticos cuyo correo sea el destinatario permitido. Producción tendrá su propia configuración y no heredará automáticamente esta lista.

## Gestión de configuración y secretos

- Desarrollo local usa dobles de Calendar/SMTP por defecto.
- Cuando una prueba local requiera credenciales reales, los emuladores leen secretos únicamente desde `functions/.secret.local`; valores no sensibles pueden ir en `functions/.env.local`.
- `.secret.local`, `.env.local` y cualquier variante local con valores reales permanecen ignorados por Git.
- Staging y producción usan secretos estructurados independientes en Secret Manager: `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG`.
- Cada Function declara y enlaza exclusivamente el secreto que utiliza; una Function sin ese vínculo no puede leerlo.
- No se utilizan archivos `.env` del frontend, `environment*.ts`, Remote Config, Firestore ni Storage para credenciales.
- Los secretos se cargan después de implementar y probar con dobles, pero antes del primer despliegue funcional de las integraciones a staging.

## Notificaciones logísticas de Equipos — implementación autorizada

- La coordinación responsable de Sistemas se selecciona desde el catálogo de Coordinaciones y se persiste únicamente por ID canónico en configuración protegida.
- El backend resuelve los correos institucionales vigentes al crear cada aviso; el cliente no envía destinatarios.
- Requieren aviso futuro: cobertura fuera de horario pendiente, reducción de inventario con reservas afectadas, cambio incompatible después de traslado, demora reportada y cancelación posterior a salida.
- Una coordinación suspendida o sin correos no revierte la reservación; registra notificación pendiente de reconciliación y una advertencia administrativa.
- Los avisos son individuales, deduplicados e idempotentes y deben adoptar la misma política de reintentos aprobada para SMTP antes de implementarse.
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

- Calendar usa exclusivamente `CALENDARIO - STAGING` configurado para `eventos-tup-angular-stg`.
- SMTP usa `eventos@tecplayacar.edu.mx` y solo permite entregar a `omar.sanchez@tecplayacar.edu.mx` para impedir correos accidentales a coordinaciones reales.
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

### `listCalendarEvents`

Entrada: inicio y fin exclusivos del intervalo visible. Valida autorización, zona, orden y duración máxima; consulta eventos superpuestos y devuelve `serverNow` y la proyección sanitizada con estado temporal calculado a hora de servidor. No acepta filtros que amplíen permisos ni obtiene datos desde Google Calendar.

`listCalendarEvents` ya está implementada y probada localmente. Los demás contratos permanecen pendientes de código. Ninguno autoriza por sí mismo un despliegue.

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

## Pendiente operativo durante la implementación

- Resolver y guardar el ID canónico de la Coordinación de Sistemas ya creada antes de activar notificaciones logísticas reales.

## Pendientes antes del primer despliegue de integraciones a staging

- Cargar `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` en Secret Manager sin exponer sus valores.
- Implementar y probar la lista permitida SMTP en backend.
- Confirmar las cuotas reales de Gmail SMTP, Calendar API y del worker con la carga esperada.
- Ejecutar creación, actualización y cancelación contra Calendar, además de envío, bloqueo fuera de lista, reintentos y deduplicación SMTP.
