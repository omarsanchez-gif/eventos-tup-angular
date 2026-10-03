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

- Disponer de perfiles de staging separados para `usuario`, inactivo y no autorizado; pueden ser cuentas institucionales reales aprobadas y no es obligatorio crear identidades ficticias. La cuenta `admin` de Omar no sustituye todos los casos de rechazo y permisos.
- Completar el recorrido accesible y responsive del Login, shell, Dashboard y módulos administrativos en 320 px, tableta y escritorio.
- Confirmar límites y cuotas aplicables del proyecto Firebase y conservar activo el presupuesto de `100 MXN` con sus alertas.
- Mantener la auditoría de dependencias sin vulnerabilidades altas o críticas; no usar `npm audit fix --force` ni aceptar cambios mayores automáticos.
- Producción permanece fuera de alcance hasta completar aceptación funcional, visual, accesible y operativa en staging.

## Pendientes para aceptar Autenticación y Usuarios

- Confirmar que el volumen esperado de `usuarios` permanece por debajo de 500; si lo supera, actualizar la estrategia de búsqueda antes de producción.
- Conservar al menos dos administradores activos antes de probar operaciones que reduzcan privilegios.
- Validar manualmente en staging la revocación de refresh tokens al desactivar, eliminar o degradar una cuenta de prueba autorizada que no sea la única administración activa.
- Ejecutar Google Sign-In y `bootstrapAuthorization` con los perfiles de staging definidos, además de la cuenta `admin` ya operativa.
- Seleccionar los archivos finales de logotipo e iconografía y confirmar la familia tipográfica institucional licenciada.

## Pendientes para aceptar Coordinaciones

- Completar la prueba de carrera entre el primer uso de una coordinación y un intento concurrente de eliminación.
- Ejecutar revisión manual accesible y responsive con sesión `admin`.
- Ejecutar el recorrido funcional autenticado de alta, edición, suspensión, activación y eliminación condicionada.

## Pendientes para aceptar Campus y Equipos

- Agregar o confirmar las direcciones oficiales de TUP y FCS y validar la búsqueda por ubicación.
- Confirmar que el inventario de staging continúa representando únicamente unidades utilizables.
- Ejecutar los recorridos administrativos de alta, edición, suspensión, activación y eliminación condicionada para Campus y Equipos.
- Validar manualmente el comportamiento responsive, teclado, foco y diálogos de ambas pantallas.
- Verificar escenarios operativos de reservaciones, logística, recepción anticipada y demora con datos sintéticos; las pruebas automatizadas de concurrencia y todos-o-ninguno ya están aprobadas.

## Pendientes para aceptar Eventos e integraciones

- Crear un evento sintético nuevo y confirmar una sola entrada en el calendario institucional vigente.
- Editar fecha u horario y comprobar actualización idempotente del mismo evento de Calendar y entrega del correo correspondiente.
- Cancelar el evento y comprobar retiro de Calendar, liberación de reservas y correo de cancelación.
- Comprobar una entrega real a un contacto institucional canónico de Coordinaciones y un rechazo controlado sin procedencia válida.
- Verificar manualmente eventos históricos incompletos y conservar el backfill como comando explícito; no ejecutarlo sin autorización separada.
- Observar worker SMTP, limpieza de protocolos y TTL sin bucles, duplicados o crecimiento inesperado.

## Pendientes para aceptar Dashboard

- Validar visualmente carga, datos, vacíos, error parcial, tabla y tarjetas móviles con sesión `admin`.
- Repetir el recorrido con un perfil `usuario` y comprobar el mismo read model sin acceso administrativo indirecto.
- Confirmar en staging que los cuatro KPI, próximos eventos y actividad reciente coinciden con los datos canónicos esperados.

## Funcionalidad diferida

- Reportes avanzados, gráficas, tendencias y exportaciones del Dashboard.
- FullCalendar Premium/Scheduler, recurrencia y edición por arrastre.
- Calendario de festivos; en esta etapa únicamente domingo es inactivo.
- Fotografías, números de serie y mantenimiento de inventario.
- Rutas de traslado editables para campus futuros; la primera política permanece limitada a TUP–FCS.

## Estado vigente en staging

- Autenticación, shell, Usuarios, Coordinaciones, Campus, Equipos, Eventos y Dashboard están implementados y publicados únicamente en `eventos-tup-angular-stg` conforme a sus incrementos autorizados.
- El Hosting vigente incluye la normalización visual compartida, Eventos multidiarios, acciones por propiedad, Calendar administrativo y Dashboard real.
- Eventos dispone de reservas transaccionales, logística, PDF, Calendar institucional, SMTP HTML y autorización dinámica de contactos de Coordinaciones. Las pruebas reales enumeradas arriba continúan pendientes de aceptación.
- Dashboard tiene índice `READY`, callable Gen 2 activa en `us-central1` y Hosting verificado con HTTP 200; faltan las pruebas autenticadas con ambos roles.
- La regresión automatizada vigente aprobó 212 pruebas, además de compilación de Functions, lint Angular/Functions/visual, formato y build de staging.
- El código y la documentación actuales se encuentran en la rama `desarrollo`; deben versionarse antes de considerar que GitHub representa exactamente el estado desplegado.
- Producción no fue utilizada ni modificada.
