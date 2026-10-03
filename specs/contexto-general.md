# Contexto general

## Estado

Base documental de la migración Angular. Autenticación, Layout, Dashboard, Usuarios, Coordinaciones, Campus, Equipos, Eventos y reservaciones cuentan con implementación y despliegues autorizados únicamente a staging; la aceptación manual transversal todavía está pendiente. Campus y Equipos fueron normalizados visualmente para consumir las primitivas globales. Eventos implementa creación, disponibilidad y reserva atómica, búsqueda paginada, detalle, edición, cancelación histórica, logística administrativa, PDF, calendario administrativo, estados temporales, Calendar, SMTP, limpieza y backfill. El 30 de septiembre de 2026 se desplegaron Rules, 16 Functions y Hosting de Eventos únicamente a staging, con secretos enlazados, lista fija, configuración logística, índices y TTL. El 1 de octubre se verificaron la creación/reconciliación real de Calendar y la entrega SMTP permitida, se amplió la lista fija autorizada, se publicó la actualización automática de disponibilidad del formulario abierto y se corrigieron los índices del calendario. El 2 de octubre se publicaron las acciones directas del creador, la visibilidad de Integración exclusiva para administradores, la normalización visual, la ocupación multidiaria y el correo HTML institucional. El 3 de octubre se desplegó en las ocho Functions consumidoras de SMTP la autorización dinámica para contactos institucionales con procedencia protegida de Coordinaciones, sin rotar `SMTP_CONFIG`. Ese mismo día se desplegó el Dashboard real y sanitizado; su índice está `READY`, la callable está activa en `us-central1` y Hosting respondió HTTP 200 con el bundle esperado. La prueba real de correo dinámico, actualización y cancelación externas, negativas controladas y aceptación manual continúan pendientes. Producción permanece fuera de alcance.

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

- `admin`: accede a Dashboard, Eventos, Usuarios, Coordinaciones, Campus y Equipos.
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
- Las reservaciones confirman todos los equipos solicitados o ninguno. Creación, edición, cancelación y acciones logísticas administrativas están implementadas, probadas y desplegadas únicamente a staging.
- Equipos locales usan márgenes de montaje de 60 minutos y desmontaje de 30; los transferidos permanecen bloqueados hasta regresar al campus base.
- No existen eventos en domingo. Se permiten eventos continuos de hasta seis fechas operativas consecutivas, en un solo campus; los equipos permanecen montados y bloqueados durante las noches.
- Todo evento nuevo exige cinco fechas naturales de anticipación en `America/Cancun`; el día límite completo es válido y no existe excepción administrativa.
- `Programado`, `En ejecución` y `Finalizado` se derivan de instantes canónicos y hora de servidor. `Cancelado` se persiste, prevalece y conserva un registro histórico de solo lectura.
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
- Eventos cuenta con una vista FullCalendar Standard dentro del mismo módulo, con mes, semana, día y lista, consulta Firestore por intervalo visible y sin edición por arrastre.
- El listado y el calendario de Eventos siguen la composición visual administrativa compartida; `Listado`/`Calendario` es una extensión funcional y no una variante de paneles, alertas, tablas, acciones o tipografía.
- EVT-106, publicada únicamente en Hosting de staging, muestra cada evento multidiario como una franja continua sobre todas sus fechas ocupadas y presenta estados, acumulación por día, controles y foco mediante el sistema visual compartido; no cambia fechas ni horas canónicas.
- EVT-107 reemplazó la personalización incompatible de EVT-106 por la integración pública de FullCalendar 7 y su paleta Classic. La muestra local validó una franja de cuatro celdas, contraste blanco sobre azul y un panel con seis filas separadas; después se publicó únicamente en Hosting de staging y la URL remota confirmó `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`.
- Google Calendar continúa como integración de salida y no alimenta el calendario administrativo.
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
