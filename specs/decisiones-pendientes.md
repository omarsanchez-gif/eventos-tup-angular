# Decisiones y pendientes

## Decisiones resueltas

| Tema                      | Decisión                                                            | Referencia                                                    |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Autorización backend      | Firestore canónico + Custom Claims sincronizados por Functions      | `decisiones/ADR-001-autorizacion-firebase.md`                 |
| Integración Firebase      | Firebase Web SDK modular, sin AngularFire inicialmente              | `decisiones/ADR-002-sdk-firebase.md`                          |
| Estado Angular            | Signals + RxJS, sin NgRx inicialmente                               | `decisiones/ADR-003-estado-angular.md`                        |
| UI                        | Angular Material/CDK + tema institucional propio                    | `decisiones/ADR-004-libreria-visual.md`                       |
| Ambiente staging          | Proyecto aislado, sin copia productiva y aliases explícitos         | `decisiones/ADR-005-ambiente-staging.md`                      |
| Búsqueda de Usuarios      | Lista administrativa limitada a 500; búsqueda y paginación local    | `modulo-usuarios/spec.md`, USR-D01                            |
| Identidad de usuario      | Correo inmutable después de asociar UID                             | `modulo-usuarios/spec.md`, USR-D02                            |
| Continuidad admin         | Sin auto-retiro y siempre al menos un admin activo                  | `modulo-usuarios/spec.md`, USR-D03                            |
| Claims administrativos    | Estado objetivo idempotente, fallo cerrado y reconciliación         | `modulo-usuarios/spec.md`, USR-D04                            |
| Coordinaciones y correo   | Catálogo protegido, fotografía histórica y outbox idempotente       | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Calendar de contactos     | Los contactos reciben correo, pero no son asistentes Calendar       | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Correos por coordinación  | Máximo de 10 correos institucionales                                | `modulo-coordinaciones/spec.md`, COO-D06                      |
| Selección en Eventos      | Sin límite funcional; pueden seleccionarse todas las activas        | `modulo-eventos/spec.md`, EVT-D11                             |
| Reintentos SMTP           | Intento inmediato y reintentos a 5 min, 30 min y 2 h                | `integraciones.md`                                            |
| Retención de envíos       | Purga 90 días después del estado terminal                           | `modelo-datos.md`, `integraciones.md`                         |
| Limpieza de PDFs          | Reemplazo seguro y purga de huérfanos después de 24 h               | `integraciones.md`                                            |
| Paginación de Eventos     | 25 registros por cursor de Firestore                                | `modulo-eventos/spec.md`, EVT-D15                             |
| Campus y logística        | Catálogo dinámico, horarios por sede y política futura              | `decisiones/ADR-007-campus-equipos-logistica.md`              |
| Inventario de Equipos     | Cantidad agregada por nombre y campus; fijo o transferible          | `modulo-equipos/spec.md`, EQP-D01 a EQP-D09                   |
| Destinos de traslado      | Destinos explícitos; un campus futuro no se habilita solo           | `modulo-equipos/spec.md`, EQP-D03 y EQP-D04                   |
| Reserva de equipos        | Todos o ninguno; disponibilidad calculada por intervalo             | `modulo-equipos/reservaciones.md`                             |
| Demora de regreso         | Nueva fecha/hora estimada y recepción anticipada opcional           | `modulo-equipos/reservaciones.md`                             |
| Cobertura de Sistemas     | No requerida, pendiente o confirmada; pendiente no bloquea stock    | `modulo-equipos/reservaciones.md`                             |
| Eventos en domingo        | Se rechaza cualquier intervalo que toque domingo                    | `modulo-equipos/reservaciones.md`                             |
| Eventos multidiarios      | Máximo seis fechas operativas, intervalo continuo y un campus       | `decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`     |
| Anticipación de Eventos   | Cinco fechas naturales, día límite completo y sin excepción         | `modulo-eventos/spec.md`, EVT-D22                             |
| Estado temporal           | Derivado por hora backend; cancelado persistido                     | `modulo-eventos/spec.md`, EVT-D24 y EVT-D25                   |
| Calendario administrativo | FullCalendar Standard lazy y Firestore por intervalo visible        | `decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`     |
| Calendar de staging       | `CALENDARIO - STAGING`; API y credenciales OAuth obtenidas          | `ambientes.md`, `integraciones.md`                            |
| SMTP de staging           | Gmail SSL 465 desde `eventos@tecplayacar.edu.mx`; contraseña creada | `ambientes.md`, `integraciones.md`                            |
| Destinatario de staging   | Solo `omar.sanchez@tecplayacar.edu.mx`                              | `integraciones.md`, SEC-NOT-007                               |
| Secretos de integraciones | Local en `.secret.local`; staging mediante Secret Manager           | `ambientes.md`, `arquitectura.md`, SEC-011 a SEC-013          |
| Presupuesto staging       | `100 MXN`; avisos al primer gasto, `50`, `80` y `100 MXN`           | `ambientes.md`, `criterios-no-funcionales.md`                 |
| Concurrencia de reservas  | Control por equipo + transacción de todo o nada                     | `decisiones/ADR-009-transacciones-indices-eventos.md`         |
| Índices de Eventos        | Disponibilidad, superposición, campus y listado declarativos        | `decisiones/ADR-009-transacciones-indices-eventos.md`         |
| Límite por evento         | Máximo 20 tipos distintos de equipo                                 | `modulo-equipos/reservaciones.md`                             |
| Autorización de Eventos   | Eventos y reservaciones autorizados el 29 de septiembre de 2026     | `AGENTS.md`, ADR-009                                          |
| Cierre operativo Eventos  | Búsqueda, mutaciones, logística, workers, limpieza e históricos     | `decisiones/ADR-010-cierre-operativo-eventos.md`              |

## Pendientes antes de integración real

- Crear las cuentas de prueba restantes para `usuario`, inactivo y no autorizado; la cuenta `admin` inicial ya está autorizada.
- Inventariar índices Firestore existentes.
- Confirmar límites y cuotas aplicables del proyecto Firebase.
- Cargar `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` en Secret Manager inmediatamente antes del primer despliegue funcional de estas integraciones.
- Implementar y probar en backend la lista permitida de SMTP.

## Pendientes antes de aceptar Usuarios

- Confirmar mediante un inventario que el volumen esperado de `usuarios` permanece por debajo de 500; si lo supera, actualizar specs antes de implementar búsqueda.
- Crear al menos un segundo administrador activo antes de validar operaciones que reduzcan privilegios en staging.
- Validar manualmente en staging la revocación de refresh tokens al desactivar, eliminar o degradar un administrador sintético.
- Completar revisión visual autenticada en 320 px, tableta y escritorio y el recorrido con teclado/lector de pantalla.
- Obtener aceptación funcional antes de habilitar Hosting; producción continúa fuera de alcance.

## Pendientes para aceptar Coordinaciones

- Completar la carrera entre uso y eliminación cuando Eventos implemente la transición a `utilizada: true`.
- Ejecutar revisión manual accesible y responsive con sesión `admin`.
- Ejecutar el recorrido funcional y visual autenticado en staging con datos sintéticos.

## Pendientes para aceptar Campus

- Capturar manualmente TUP y FCS con sus horarios aprobados; no existe semilla automática.
- Agregar las direcciones oficiales cuando estén disponibles y validar búsqueda por ubicación.
- Ejecutar el recorrido funcional con datos sintéticos como `admin`: alta, edición, suspensión, activación y eliminación condicionada.
- Revisar accesibilidad y responsive en 320 px, tableta y escritorio.
- Completar la aceptación funcional y visual en el Hosting de staging antes de considerar producción.
- Validar manualmente la versión normalizada de Campus contra el estándar global y autorizar su publicación posterior.

## Pendientes para aceptar el catálogo de Equipos

- Capturar y aceptar TUP y FCS en staging con horarios canónicos.
- Confirmar el inventario utilizable inicial por campus; no habrá semilla automática ni copia productiva.
- Ejecutar el recorrido manual como `admin`: alta fija y transferible, edición, suspensión, activación y eliminación condicionada.
- Revisar accesibilidad y responsive en 320 px, tableta y escritorio.
- Obtener aceptación funcional y visual antes de considerar producción o autorizar reservaciones.
- Validar manualmente la versión normalizada de Equipos contra el estándar global y autorizar su publicación posterior.

## Pendiente transversal de normalización visual

- La auditoría del 21 de agosto de 2026 confirma que `src/styles.scss` es la fuente canónica y que Usuarios y Coordinaciones consumen sus botones compartidos.
- Campus y Equipos ya retiraron localmente las copias encapsuladas, adoptaron tokens globales y conservan solo distribución propia.
- `npm run lint:visual`, integrado en el lint general, bloquea redefiniciones de botones/icon-buttons y la paleta institucional anterior en cualquier módulo.
- Falta comprobar las cuatro pantallas juntas en escritorio, tableta y 320 px con una sesión autenticada y autorizar el despliegue de la corrección visual a staging.

## Pendientes operativos de reservaciones de Equipos

- La decisión multidiaria está resuelta: máximo seis fechas operativas, un campus y bloqueo continuo, incluidas noches.
- Seleccionar por ID la coordinación responsable de Sistemas y validar que tenga correos de staging.
- Ejecutar las pruebas de concurrencia, intervalos, logística y edición definidas antes de staging.

## Pendientes durante la implementación de Eventos

- Verificar comportamiento con eventos históricos incompletos.
- Seleccionar por ID canónico la Coordinación de Sistemas y validar sus destinatarios controlados.
- Resolver la deuda de dependencias informada por `npm audit` mediante una actualización compatible y validada; no ejecutar `npm audit fix --force` ni aceptar cambios mayores automáticos sin revisar Angular, Firebase Admin, Functions, emuladores y build.

ADR-010 cerró las decisiones de búsqueda global, detalle, edición, cancelación, estados de integración, acciones logísticas, leases SMTP, limpieza y backfill. La siguiente sesión puede iniciar implementación siguiendo su secuencia sin volver a decidir estos contratos. Ejecutar el backfill o cualquier despliegue continúa requiriendo autorización del ambiente correspondiente.

## Clasificación para iniciar Eventos

### Bloqueos resueltos

- Eventos y reservaciones están autorizados expresamente.
- La estrategia transaccional, controles por equipo e índices están aprobados mediante ADR-009.
- Los contratos y wireframes vigentes están aceptados.
- La Coordinación de Sistemas existe en staging; su ID se resolverá como configuración antes de activar notificaciones logísticas reales y no bloquea dobles locales.

### No bloquea desarrollo local, pero bloquea integración real en staging

- Completar la aceptación funcional, accesible y visual de Coordinaciones, Campus y Equipos.
- Cargar los dos secretos estructurados en Secret Manager.
- Implementar y verificar la lista permitida SMTP.
- Confirmar cuotas y ejecutar pruebas reales Calendar/SMTP.
- Completar aceptación con perfiles sintéticos distintos de `admin`.

### Puede diferirse después del primer incremento

- Dashboard, KPIs y reportes.
- FullCalendar Premium/Scheduler, recurrencia y edición por arrastre.
- Calendario de festivos; en esta etapa únicamente domingo es inactivo.
- Fotografías, números de serie y mantenimiento de inventario.
- Rutas de traslado editables para campus futuros; la primera política permanece limitada a TUP–FCS.

## Pendientes no bloqueantes para Autenticación local

- Seleccionar archivos finales de logotipo e iconografía.
- Confirmar familia tipográfica institucional licenciada.
- Aprobar visualmente el Login, shell administrativo y vista temporal antes de publicar en Hosting de staging.

## Pendientes de verificación del primer incremento

- Ejecutar el recorrido manual completo con una cuenta `admin` en staging.
- Revisar el shell con una sesión autorizada en 320 px, tableta y escritorio; el navegador automatizado confirma Login, pero no dispone de la sesión Google del usuario.
- Revisar antes de publicar las alertas moderadas transitivas reportadas por `npm audit` en el SDK Admin de Firebase; no aplicar el downgrade automático sugerido porque afectaría versiones soportadas.
- Crear cuentas sintéticas y validar el flujo con Google Sign-In y `bootstrapAuthorization`; ambos servicios ya están configurados en staging.

## Estado para iniciar

La base Angular, el shell y el módulo de Usuarios están operativos localmente contra staging. Java 21, pruebas unitarias, Auth/Firestore Emulator y Security Rules están aprobados. Las cinco callables y Firestore Rules están desplegadas únicamente a `eventos-tup-angular-stg`; `npm run start:staging` sirve la aplicación en `http://localhost:4200`. Permanecen pendientes la aceptación visual/manual y un segundo administrador antes de probar reducción de privilegios. Producción no fue utilizada ni modificada.

Coordinaciones está implementado con capacidad técnica de 500 registros: 41 pruebas Angular, 32 de Functions, 8 transaccionales propias y 10 de Rules están en verde; lint y build de staging también pasan. Sus seis callables y Firestore Rules fueron desplegadas únicamente a `eventos-tup-angular-stg` el 19 de agosto de 2026. La lista remota confirmó las seis Functions y una prueba de humo anónima recibió `401`, según lo esperado. Permanecen pendientes el recorrido autenticado con datos sintéticos y la aceptación funcional y visual.

Campus fue implementado, validado y desplegado a staging el 21 de agosto de 2026 como prerrequisito de Equipos. La suite completa quedó en verde: 46 pruebas Angular, 41 de Functions, 6 transaccionales propias y 12 de Rules, además de lint, formato y build de staging. Las seis Functions, Firestore Rules y Hosting se publicaron únicamente en `eventos-tup-angular-stg`; la verificación remota obtuvo Hosting `200` y rechazo anónimo `401`. Su incremento no incluye inventario, reservaciones, rutas editables ni Eventos. Permanecen pendientes la captura manual de TUP/FCS, sus direcciones oficiales, el recorrido autenticado y la aceptación visual. Producción no fue utilizada ni modificada.

Equipos cuenta desde el 21 de agosto de 2026 con spec de catálogo, contrato separado de reservaciones, pruebas, tareas, wireframe y actualización transversal. El incremento A fue implementado y desplegado únicamente a staging; su corrección de normalización visual permanece local y pendiente de publicación. ADR-009 resolvió concurrencia, índices y autorización de reservaciones.

Eventos cuenta localmente con creación y disponibilidad transaccional, consultas paginada y por intervalo, carga inicial de PDF y rutas Angular de listado, alta, detalle y calendario. La facade actualiza el estado visible al cruzar inicio y fin con referencia de servidor. La suite integral aprobó 57 pruebas Angular, 66 de Functions, 33 de emuladores funcionales y 15 de Rules, además de lint, formato y build. Edición, cancelación, Calendar, SMTP, reemplazo o limpieza de PDF, búsqueda sobre el conjunto completo, aceptación manual y despliegue continúan pendientes. Producción no fue utilizada.
