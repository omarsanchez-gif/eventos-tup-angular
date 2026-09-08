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

## Correo

- La creación se dirige individualmente al creador y a los correos institucionales vigentes de las coordinaciones seleccionadas.
- La actualización se genera cuando cambia nombre, fecha, horario o coordinaciones.
- Retirar una coordinación genera un aviso específico para ella.
- La eliminación genera cancelación para creador, contactos vigentes y destinatarios previamente notificados aplicables.
- Se normalizan y deduplican destinatarios antes de crear trabajos.
- El contenido mínimo incluye tipo de aviso, nombre, fecha, horario y responsable.
- SMTP y secretos exclusivamente en backend.
- Los destinatarios proceden del perfil canónico y de `coordinaciones`; nunca del correo libre enviado por el cliente.
- Cada destinatario tiene un registro idempotente protegido en `notificacionesEventos`.

## Notificaciones logísticas de Equipos — objetivo no autorizado

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

## PDFs de Eventos

- Al reemplazar un protocolo se carga primero el PDF nuevo y se confirma la referencia nueva en Firestore antes de eliminar el anterior.
- Si la eliminación del PDF anterior falla, se registra para reintento; no se revierte la referencia nueva válida.
- Una creación que falle después de cargar el archivo intenta eliminarlo inmediatamente.
- Una limpieza programada elimina después de 24 horas los archivos temporales o cargados que no estén referenciados por un evento.
- La limpieza nunca elimina un archivo referenciado por el estado canónico del evento.

## Verificación de staging

- Calendar usa exclusivamente el calendario sintético configurado para `eventos-tup-angular-stg`.
- SMTP usa un buzón de prueba y una lista permitida de destinatarios para impedir correos accidentales a coordinaciones reales.
- Se prueban creación, actualización, eliminación, zona horaria, ausencia de asistentes, deduplicación, fallos parciales y reintentos.
- La verificación es obligatoria antes de autorizar producción y no implica desplegar este incremento.

## Contratos objetivo de Functions de Eventos

### `processEventIntegrations`

Entrada: `eventId`. Valida autorización y propiedad, crea Calendar si falta, persiste `calendarEventId` y genera trabajos idempotentes de creación. No envía a destinatarios proporcionados por el cliente.

### `syncUpdatedEventIntegrations`

Entrada: `eventId` y la revisión esperada. Valida propiedad, actualiza Calendar o lo recrea si ya no existe y genera trabajos de actualización o retiro calculados desde el estado canónico y la fotografía anterior.

### `deleteEvent`

Entrada: `eventId`. Valida propiedad, elimina Calendar y protocolo de forma idempotente y, en una transacción final, crea trabajos de cancelación con su fotografía y elimina el documento Firestore.

Los nombres representan contratos objetivo y no autorizan implementación ni despliegue hasta aprobar tareas y pruebas.

## Requisitos comunes

- Verificar `request.auth.token.authorized == true`.
- Validar rol o propiedad según la operación.
- No confiar en UID, correo, rol o propietario enviados por el cliente.
- Usar mensajes funcionales y logs backend sin secretos.
- Evitar duplicados mediante idempotencia.

## Pendientes antes de implementar Eventos

- Provisionar y comprobar el calendario, buzón SMTP y lista permitida exclusivos de staging.
- Confirmar las cuotas reales del proveedor SMTP y del worker con la carga esperada.
