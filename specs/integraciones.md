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

## Correo

- Confirmación dirigida al creador del evento.
- Contenido mínimo: nombre, fecha, hora y responsable.
- SMTP y secretos exclusivamente en backend.

## Functions de eventos existentes

### `processEventIntegrations`

Entrada: `eventId`. Crea Calendar, persiste `calendarEventId` y envía correo.

### `syncUpdatedEventCalendar`

Entrada: `eventId`. Valida propiedad, actualiza Calendar o lo recrea si ya no existe.

### `deleteEvent`

Entrada: `eventId`. Valida propiedad y elimina Calendar, protocolo vigente y documento Firestore.

## Requisitos comunes

- Verificar `request.auth.token.authorized == true`.
- Validar rol o propiedad según la operación.
- No confiar en UID, correo, rol o propietario enviados por el cliente.
- Usar mensajes funcionales y logs backend sin secretos.
- Evitar duplicados mediante idempotencia.

## Pendientes fuera del alcance Auth

- Reintento confiable de correo.
- Recuperación de integraciones parcialmente completadas.
- Limpieza del PDF anterior al reemplazarlo.
