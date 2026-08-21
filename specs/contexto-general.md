# Contexto general

## Estado

Base documental de la migración Angular. Autenticación, Layout, Usuarios, Coordinaciones y Campus cuentan con implementación local parcial o completa. Coordinaciones fue implementada, validada con pruebas automatizadas y desplegada a staging el 19 de agosto de 2026; su aceptación funcional y visual manual continúa pendiente. Campus fue implementado, validado y desplegado a staging como catálogo administrativo y prerrequisito de Equipos el 21 de agosto de 2026. El incremento A del catálogo de Equipos fue implementado, validado automáticamente y desplegado únicamente a staging el 21 de agosto de 2026; su prueba manual y aceptación continúan pendientes. Reservaciones, logística y la ampliación de Eventos permanecen solo documentadas y sin código.

## Propósito

Sustituir el frontend actual construido con Vue por una aplicación Angular de nuevo diseño, conservando como línea base el comportamiento real del producto en producción y manteniendo Firebase como infraestructura.

La migración es una sustitución tecnológica y visual. No autoriza por sí misma cambios de datos, reglas de negocio, integraciones o alcance funcional.

## Producto actual de referencia

El producto existente permite:

- Autenticación institucional mediante Google y Firebase Authentication.
- Validación de usuarios autorizados y activos en Firestore.
- Dashboard con datos reales de usuarios y eventos.
- Administración de usuarios autorizados.
- Registro, consulta, edición y eliminación de eventos.
- Carga de un protocolo PDF por evento.
- Sincronización con Google Calendar.
- Envío de correo de confirmación.
- Hospedaje como SPA en Firebase Hosting.

## Usuarios y roles

- `admin`: accede a Dashboard, Eventos y Usuarios.
- `usuario`: accede a Dashboard y Eventos.

Los roles proceden de Firestore. No se agregarán roles durante la migración.

## Módulos del nuevo producto

1. Autenticación.
2. Layout administrativo.
3. Usuarios.
4. Coordinaciones.
5. Campus.
6. Equipos.
7. Eventos.
8. Dashboard.

No se crearán módulos adicionales sin una especificación aprobada.

## Principios de migración

- El código Vue actual es la referencia de comportamiento.
- Estas nuevas especificaciones serán la fuente de verdad para Angular.
- El diseño visual se realizará desde cero con identidad institucional.
- Se conservarán los datos y archivos existentes.
- Se conservarán los contratos Firebase aprobados.
- Las fallas de seguridad detectadas no se copiarán deliberadamente.
- Toda corrección que cambie comportamiento deberá estar identificada y aprobada.
- La aplicación Vue permanecerá disponible hasta validar equivalencia y reversión.

## Cambio funcional aprobado para Eventos

- El catálogo de Coordinaciones se administra antes de implementar Eventos.
- El catálogo de Campus se administra antes de Equipos y Eventos; TUP y FCS son registros capturables, no constantes del frontend.
- El catálogo de Equipos se administra por nombre, campus, cantidad operativa y clasificación antes de integrar reservaciones con Eventos.
- La disponibilidad se calcula por intervalo y nunca se guarda como contador mutable.
- Las reservaciones confirman todos los equipos solicitados o ninguno y permanecen como incremento separado sin autorización de código.
- Equipos locales usan márgenes de montaje de 60 minutos y desmontaje de 30; los transferidos permanecen bloqueados hasta regresar al campus base.
- No existen eventos en domingo. La posibilidad de eventos de varios días continúa pendiente y bloquea reservaciones, no el catálogo.
- Una coordinación contiene un nombre, varios correos institucionales y un estado activo o suspendido.
- Seleccionar coordinaciones en un evento es opcional.
- El creador siempre recibe correo; las coordinaciones seleccionadas se agregan como destinatarias sin reemplazarlo.
- Cambiar nombre, fecha, horario o coordinaciones genera avisos de actualización.
- Retirar una coordinación del evento y eliminar el evento generan sus avisos correspondientes.
- Las personas de las coordinaciones reciben correos del sistema, pero no se agregan como asistentes de Google Calendar.
- El correo y Calendar se procesan como integraciones independientes e idempotentes.
- Cada coordinación admite como máximo 10 correos institucionales.
- Un evento no tiene un límite funcional de coordinaciones seleccionadas y puede incluir todas las coordinaciones activas disponibles.
- El correo realiza un intento inicial y hasta tres reintentos a los 5 minutos, 30 minutos y 2 horas.
- El historial técnico de notificaciones se conserva 90 días después de llegar a un estado terminal.
- Los PDFs sustituidos se eliminan después de confirmar la nueva referencia; los archivos huérfanos se purgan después de 24 horas.
- Eventos se consulta en páginas de 25 registros mediante cursores de Firestore.
- Calendar y SMTP se verifican en staging con recursos sintéticos y una lista controlada de destinatarios.

## Infraestructura que permanece

- Firebase Authentication.
- Cloud Firestore.
- Firebase Storage.
- Cloud Functions Gen 2.
- Firebase Hosting.
- Google Calendar API.
- Servicio SMTP de correo.
- Zona horaria `America/Cancun`.

## Fuera de alcance inicial

- Nuevos roles.
- Nuevos proveedores de autenticación.
- Folios institucionales.
- Múltiples protocolos por evento.
- Flujos de aprobación.
- Reportes avanzados.
- Renombrado o eliminación de campos históricos y backfills productivos implícitos. Las colecciones y campos objetivo de Equipos, reservaciones, Eventos y notificaciones solo podrán implementarse conforme a ADR-006, ADR-007 y autorizaciones posteriores.
- SSR.
- Sustitución de Firebase.

## Fuente documental

Orden de prioridad para el desarrollo futuro:

1. `reglas-negocio.md`.
2. `modelo-datos.md`.
3. `seguridad.md`.
4. `integraciones.md`.
5. `arquitectura.md`.
6. `spec.md` del módulo correspondiente.
7. Spec del sistema de diseño.

Si existe una contradicción o información faltante, se debe detener la implementación y actualizar primero estas especificaciones.
