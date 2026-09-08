# ADR-006: Coordinaciones y notificaciones de Eventos

## Estado

Aprobada el 19 de agosto de 2026 y ampliada con la política operativa aprobada el mismo día. La fase de Coordinaciones fue autorizada, implementada, validada y desplegada únicamente a staging el 19 de agosto de 2026. La fase de Eventos, su outbox, workers, Calendar y correo permanece documentada y pendiente de autorización de implementación.

## Contexto

El producto Vue envía una confirmación únicamente a `creadoPorCorreo` después de crear Calendar. Si Calendar ya tiene ID, el flujo histórico puede terminar sin reintentar un correo fallido. El nuevo producto necesita seleccionar coordinaciones como Academia, Marketing o Deportes, notificar a varios correos institucionales, avisar cambios y cancelaciones y evitar duplicados o exposición de destinatarios.

Firebase no ofrece una transacción atómica entre Firestore, Google Calendar y SMTP. Guardar destinatarios dentro de `eventos` los expondría a todo usuario autorizado. Agregar contactos como asistentes Calendar introduciría invitaciones, RSVP y notificaciones de Google no solicitadas.

## Decisión

1. Crear un catálogo administrativo `coordinaciones` con varios correos institucionales y estado activo.
2. Exponer a Eventos solo un catálogo sanitizado con ID y nombre de coordinaciones activas.
3. Aceptar desde el cliente únicamente IDs; resolver nombres y correos en backend.
4. Guardar en `eventos` IDs y fotografía de nombres, nunca correos de Coordinaciones.
5. Mantener al creador como destinatario obligatorio y agregar contactos seleccionados con deduplicación global.
6. Enviar mensajes individuales para no revelar otros destinatarios.
7. Separar Calendar y correo. Los contactos no se agregan a `attendees`.
8. Representar cada envío en `notificacionesEventos` con clave idempotente y estado por destinatario.
9. Un worker backend envía y reintenta; un fallo SMTP no revierte Evento, PDF o Calendar.
10. Notificar creación; cambios de nombre, fecha, hora o coordinaciones; retiro de coordinación; y cancelación por eliminación.
11. Una coordinación utilizada conserva `utilizada: true` permanentemente y no puede eliminarse, solo suspenderse.
12. Cada coordinación admite como máximo 10 correos institucionales.
13. Un evento no impone un máximo funcional de coordinaciones seleccionadas.
14. Cada envío realiza un intento inmediato y hasta tres reintentos a los 5 minutos, 30 minutos y 2 horas; después queda en fallo permanente.
15. Los registros terminales de `notificacionesEventos` se conservan 90 días.
16. El reemplazo de PDF confirma primero la referencia nueva; los archivos huérfanos se purgan después de 24 horas.
17. Eventos utiliza paginación por cursor de 25 registros.
18. Calendar y SMTP se validan en staging con recursos sintéticos y destinatarios controlados.

## Consecuencias positivas

- Privacidad de contactos frente a usuarios normales.
- Reintentos sin duplicar destinatarios confirmados.
- Calendar no se duplica por fallos SMTP.
- Eventos históricos conservan nombres aunque cambie el catálogo.
- Suspender no rompe notificaciones o cancelaciones existentes.
- El creador siempre conserva su confirmación.

## Costos y riesgos

- Nueva colección protegida y worker backend.
- Más estados parciales y pruebas de concurrencia.
- Datos personales mínimos requieren política de retención.
- Actualizar contactos no notifica por sí solo eventos anteriores.
- El envío asíncrono puede completar después de mostrar el evento como guardado.

## Alternativas descartadas

### Guardar correos dentro de `eventos`

Descartado porque la lectura de Eventos es más amplia que la administración de contactos y expondría datos innecesarios.

### Enviar un solo correo con todos en `to` o `cc`

Descartado por privacidad y porque un fallo no puede aislarse por destinatario.

### Usar exclusivamente `bcc`

Reduce exposición, pero no ofrece estado ni reintento granular por destinatario.

### Agregar contactos como asistentes Calendar

Descartado en esta versión porque generaría invitaciones, RSVP, inserción en calendarios personales y posibles notificaciones dobles.

### Mantener Calendar y correo en una sola operación sin estado

Descartado porque el flujo histórico no puede recuperar de forma confiable un correo fallido después de crear Calendar.

## Pendientes bloqueantes

- Provisionar y verificar recursos, lista permitida y cuotas del worker, Calendar y SMTP en staging antes de implementar Eventos.
