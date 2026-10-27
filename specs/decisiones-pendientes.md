# Decisiones y pendientes

## Decisiones resueltas

| Tema                      | Decisión                                                                          | Referencia                                                    |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Autorización backend      | Firestore canónico + Custom Claims sincronizados por Functions                    | `decisiones/ADR-001-autorizacion-firebase.md`                 |
| Integración Firebase      | Firebase Web SDK modular, sin AngularFire inicialmente                            | `decisiones/ADR-002-sdk-firebase.md`                          |
| Estado Angular            | Signals + RxJS, sin NgRx inicialmente                                             | `decisiones/ADR-003-estado-angular.md`                        |
| UI                        | Angular Material/CDK + tema institucional propio                                  | `decisiones/ADR-004-libreria-visual.md`                       |
| Ambiente staging          | Proyecto aislado, sin copia productiva y aliases explícitos                       | `decisiones/ADR-005-ambiente-staging.md`                      |
| Búsqueda de Usuarios      | Lista administrativa limitada a 500; búsqueda y paginación local                  | `modulo-usuarios/spec.md`, USR-D01                            |
| Identidad de usuario      | Correo inmutable después de asociar UID                                           | `modulo-usuarios/spec.md`, USR-D02                            |
| Continuidad admin         | Sin auto-retiro y siempre al menos un admin activo                                | `modulo-usuarios/spec.md`, USR-D03                            |
| Claims administrativos    | Estado objetivo idempotente, fallo cerrado y reconciliación                       | `modulo-usuarios/spec.md`, USR-D04                            |
| Coordinaciones y correo   | Catálogo protegido, fotografía histórica y outbox idempotente                     | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Calendar de contactos     | Los contactos reciben correo, pero no son asistentes Calendar                     | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Correos por coordinación  | Máximo de 10 correos institucionales                                              | `modulo-coordinaciones/spec.md`, COO-D06                      |
| Selección en Eventos      | Sin límite funcional; pueden seleccionarse todas las activas                      | `modulo-eventos/spec.md`, EVT-D11                             |
| Reintentos SMTP           | Intento inmediato y reintentos a 5 min, 30 min y 2 h                              | `integraciones.md`                                            |
| Retención de envíos       | Purga 90 días después del estado terminal                                         | `modelo-datos.md`, `integraciones.md`                         |
| Limpieza de PDFs          | Reemplazo seguro y purga de huérfanos después de 24 h                             | `integraciones.md`                                            |
| Paginación de Eventos     | 25 registros por cursor de Firestore                                              | `modulo-eventos/spec.md`, EVT-D15                             |
| Campus y logística        | Catálogo dinámico, horarios por sede y política operativa                         | `decisiones/ADR-007-campus-equipos-logistica.md`              |
| Inventario de Equipos     | Cantidad agregada por nombre y campus; fijo o transferible                        | `modulo-equipos/spec.md`, EQP-D01 a EQP-D09                   |
| Destinos de traslado      | Destinos explícitos; un campus futuro no se habilita solo                         | `modulo-equipos/spec.md`, EQP-D03 y EQP-D04                   |
| Reserva de equipos        | Todos o ninguno; disponibilidad calculada por intervalo                           | `modulo-equipos/reservaciones.md`                             |
| Demora de regreso         | Nueva fecha/hora estimada y recepción anticipada opcional                         | `modulo-equipos/reservaciones.md`                             |
| Cobertura de Sistemas     | No requerida, pendiente o confirmada; pendiente no bloquea stock                  | `modulo-equipos/reservaciones.md`                             |
| Eventos en domingo        | Se rechaza cualquier intervalo que toque domingo                                  | `modulo-equipos/reservaciones.md`                             |
| Eventos multidiarios      | Máximo seis fechas operativas, intervalo continuo y un campus                     | `decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`     |
| Anticipación de Eventos   | Cinco fechas naturales, día límite completo y sin excepción                       | `modulo-eventos/spec.md`, EVT-D22                             |
| Estado temporal           | Derivado por hora backend; cancelado persistido                                   | `modulo-eventos/spec.md`, EVT-D24 y EVT-D25                   |
| Calendario administrativo | FullCalendar Standard lazy y Firestore por intervalo visible                      | `decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`     |
| Calendar de staging       | Calendario institucional compartido; pruebas anteriores no se migran              | `ambientes.md`, `integraciones.md`                            |
| SMTP de staging           | Gmail SSL 465 desde `eventos@tecplayacar.edu.mx`; contraseña creada               | `ambientes.md`, `integraciones.md`                            |
| Destinatario de staging   | Lista fija para creadores y contactos institucionales canónicos de Coordinaciones | `integraciones.md`, RN-082 y SEC-NOT-007                      |
| Secretos de integraciones | Local en `.secret.local`; staging mediante Secret Manager                         | `ambientes.md`, `arquitectura.md`, SEC-011 a SEC-013          |
| Presupuesto staging       | `100 MXN`; avisos al primer gasto, `50`, `80` y `100 MXN`                         | `ambientes.md`, `criterios-no-funcionales.md`                 |
| Concurrencia de reservas  | Control por equipo + transacción de todo o nada                                   | `decisiones/ADR-009-transacciones-indices-eventos.md`         |
| Índices de Eventos        | Disponibilidad, superposición, campus y listado declarativos                      | `decisiones/ADR-009-transacciones-indices-eventos.md`         |
| Límite por evento         | Máximo 20 tipos distintos de equipo                                               | `modulo-equipos/reservaciones.md`                             |
| Autorización de Eventos   | Eventos y reservaciones autorizados el 29 de septiembre de 2026                   | `AGENTS.md`, ADR-009                                          |
| Cierre operativo Eventos  | Búsqueda, mutaciones, logística, workers, limpieza e históricos                   | `decisiones/ADR-010-cierre-operativo-eventos.md`              |

## Pendientes transversales de aceptación

- Confirmar límites y cuotas aplicables del proyecto Firebase y conservar activo el presupuesto de `100 MXN` con sus alertas.
- Mantener la auditoría de dependencias sin vulnerabilidades altas o críticas; no usar `npm audit fix --force` ni aceptar cambios mayores automáticos.
- Dar seguimiento a las tres vulnerabilidades moderadas de ejecución reportadas por `npm audit --omit=dev` y resolverlas mediante una actualización compatible y nueva regresión.
- Producción permanece fuera de alcance hasta definir su configuración, migración, reversión y autorización expresa, aunque staging ya cuente con aceptación integral.

## Pendientes para aceptar Autenticación y Usuarios

- Confirmar que el volumen esperado de `usuarios` permanece por debajo de 500; si lo supera, actualizar la estrategia de búsqueda antes de producción.
- Conservar al menos dos administradores activos antes de probar operaciones que reduzcan privilegios.
- Completar, si aún no existe evidencia separada, el recorrido administrativo completo de alta, edición, activación, suspensión y eliminación de Usuarios.
- Seleccionar los archivos finales de logotipo e iconografía y confirmar la familia tipográfica institucional licenciada.

## Pendientes para aceptar Coordinaciones

- Completar la prueba de carrera entre el primer uso de una coordinación y un intento concurrente de eliminación.
- Ejecutar el recorrido funcional autenticado de alta, edición, suspensión, activación y eliminación condicionada.

## Pendientes para aceptar Campus y Equipos

- Agregar o confirmar las direcciones oficiales de TUP y FCS y validar la búsqueda por ubicación.
- Confirmar que el inventario de staging continúa representando únicamente unidades utilizables.
- Ejecutar los recorridos administrativos de alta, edición, suspensión, activación y eliminación condicionada para Campus y Equipos.

## Seguimiento de Eventos e integraciones

- Verificar manualmente eventos históricos incompletos y conservar el backfill como comando explícito; no ejecutarlo sin autorización separada.
- Observar worker SMTP, limpieza de protocolos y TTL sin bucles, duplicados o crecimiento inesperado.
- Confirmar cuotas reales de Gmail SMTP, Calendar API y Functions con una carga representativa.

## Dashboard aceptado en staging

- El 3 de octubre de 2026 se validaron carga, datos, vacíos, error parcial, tabla y tarjetas móviles.
- `admin` y `usuario` obtuvieron el mismo read model sanitizado sin ampliar permisos administrativos.
- Los cuatro KPI, próximos eventos y actividad reciente coincidieron con los datos canónicos esperados.

## Funcionalidad diferida

- Reportes avanzados, gráficas, tendencias y exportaciones del Dashboard.
- FullCalendar Premium/Scheduler, recurrencia y edición por arrastre.
- Calendario de festivos; en esta etapa únicamente domingo es inactivo.
- Fotografías, números de serie y mantenimiento de inventario.
- Rutas de traslado editables para campus futuros; la primera política permanece limitada a TUP–FCS.

## Estado vigente en staging

- Autenticación, shell, Usuarios, Coordinaciones, Campus, Equipos, Eventos y Dashboard están implementados y publicados únicamente en `eventos-tup-angular-stg` conforme a sus incrementos autorizados.
- El Hosting vigente incluye la normalización visual compartida, Eventos multidiarios, acciones por propiedad, Calendar administrativo y Dashboard real.
- El 3 de octubre de 2026 se aceptaron el ciclo integral de Eventos, reservaciones concurrentes, logística, Calendar institucional, SMTP HTML, autorización dinámica de contactos, negativas, roles, propiedad y revocación.
- La aceptación visual, accesible y responsive quedó confirmada en 320 px, tableta y escritorio para Login, shell, Dashboard, catálogos, listado y calendario.
- Dashboard tiene índice `READY`, callable Gen 2 activa en `us-central1`, Hosting verificado con HTTP 200 y aceptación autenticada con ambos roles.
- La regresión automatizada vigente aprobó 212 pruebas, además de compilación de Functions, lint Angular/Functions/visual, formato y build de staging.
- La línea base funcional aceptada quedó versionada y publicada en `desarrollo` mediante `0ad7bae`; esta reconciliación documental posterior deberá incluirse en el siguiente commit sin reabrir la aceptación funcional.
- Producción no fue utilizada ni modificada.
