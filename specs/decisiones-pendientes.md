# Decisiones y pendientes

**Publicación de EVT-121 — 28 de octubre de 2026:** corrección de cancelación de eventos finalizados desplegada con autorización expresa únicamente a staging: Hosting y cuatro Functions (`cancelEvent`, `getEventDetail`, `listEvents`, `listCalendarEvents`). Las cuatro están `ACTIVE`; los 20 archivos remotos coinciden con el build validado y las cuatro callables rechazan solicitudes anónimas. Se conserva la aceptación de las doce validaciones anteriores. Pendiente únicamente la aceptación funcional específica de EVT-121 con sesión iniciada; evidencia en la matriz de trazabilidad. Producción intacta.

**Seguimiento del 27 de octubre:** reparación SMTP completada: versión 4, ocho Functions ACTIVE, siete trabajos recuperados enviados y resumen `completas` en `VALIDACIÓN 02`. EVT-120 publicado en Hosting con regresión técnica aprobada; los doce escenarios anteriores fueron aceptados por el responsable el 28 de octubre; la aceptación visual específica de EVT-120 se conserva por separado. Detalles en `integraciones.md` y `matriz-trazabilidad.md`.

**Publicación previa en staging — 27 de octubre de 2026:** EVT-116 a EVT-119 (acceso previo, respuestas vigentes, cierre del detalle y reutilización de catálogos) desplegado con autorización expresa mediante syncUpdatedEventIntegrations y Hosting. Verificación técnica remota aprobada; 240 pruebas locales previas (92 Angular, 108 Functions y 40 Eventos con Firestore Emulator). Aceptación funcional de estas cuatro correcciones confirmada por el responsable el 28 de octubre de 2026. Producción no fue modificada.

**Estado al 27 de octubre de 2026:** las ocho correcciones de consistencia están implementadas, probadas localmente y desplegadas con autorización expresa únicamente en staging: Firestore Rules, 12 Functions y Hosting. La verificación técnica remota aprobó; la aceptación funcional de este incremento fue confirmada por el responsable el 28 de octubre de 2026. La aceptación administrativa anterior corresponde a la versión publicada previa. Evidencia y alcance en [matriz de trazabilidad](matriz-trazabilidad.md).

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

## Cierre de aceptación administrativa — 27 de octubre de 2026

El responsable confirmó satisfactoriamente en staging todos los recorridos administrativos acordados:

- Usuarios: volumen actual y esperado por debajo de 500; alta, edición, activación, suspensión y eliminación, conservando la continuidad administrativa.
- Coordinaciones: alta, edición, suspensión, activación y eliminación permitida o bloqueada por uso.
- Campus: alta, edición, horarios, suspensión, activación y eliminación condicionada.
- Equipos: alta fija y transferible, edición, destinos, cantidad, suspensión, activación y eliminación condicionada.

Este cierre corresponde a la aceptación administrativa del 27 de octubre y a los doce escenarios confirmados el 28 de octubre. EVT-121 ya está publicado y verificado técnicamente en staging; queda pendiente su aceptación funcional con sesión iniciada. La aceptación visual específica de EVT-120 se conserva por separado. El backfill histórico, cualquier migración y producción siguen fuera de alcance y solo se ejecutan con autorización separada.

## Controles operativos continuos — no son pendientes de aceptación

- Mantener activo el presupuesto informativo de `100 MXN` y observar cuotas, workers, limpieza y TTL mediante las métricas ya definidas.
- Ejecutar `npm audit --omit=dev` antes de publicar; no usar `npm audit fix --force` ni aceptar cambios mayores automáticos.
- Las cinco alertas moderadas residuales pertenecen exclusivamente al árbol de `firebase-tools`; no forman parte del runtime desplegado y se revisan cuando Firebase publique una ruta compatible.
- Producción permanece fuera de alcance hasta definir configuración, migración, reversión y autorización expresa.

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
- La estabilización del 27 de octubre de 2026 agregó pruebas técnicas de bootstrap, carrera de Coordinaciones y flujos de Usuarios. La regresión completa vigente aprobó 215 pruebas y quedó desglosada en `matriz-trazabilidad.md`.
- Build de producción y staging aplican el mismo presupuesto, las primitivas compartidas están centralizadas y `npm audit --omit=dev` reporta cero vulnerabilidades.
- La evidencia de cada estabilización queda registrada en el historial Git de `desarrollo`; no se usan identificadores anticipados de commits.
- Producción no fue utilizada ni modificada.

## Seguimiento del incremento de consistencia desplegado

- Las cinco correcciones autorizadas están implementadas y probadas; no quedan decisiones funcionales necesarias para este incremento.
- Despliegue autorizado y completado únicamente en staging el 27 de octubre de 2026. Pendiente la comprobación funcional autenticada de inventario/avisos, disponibilidad, demora, Calendar y estado de correo sobre esta versión.
- La lectura de 400 reservas activas y el presupuesto de 450 escrituras son límites técnicos defensivos para reducción de inventario. Un exceso falla completo y requiere revisión administrativa; nunca aplica resultados parciales.
- Las evidencias administrativas ya aceptadas se conservan como históricas. No se ejecuta migración ni reparación automática de reservas o duplicados Calendar anteriores.

## Cierre técnico del segundo incremento

Los tres hallazgos adicionales están corregidos y documentados junto con los cinco anteriores. La regresión del alcance afectado aprobó 222 pruebas. Las reglas temporales de recepción, la transición canónica de coordinaciones y el lease de Calendar quedan definidos en sus specs.

El conjunto de ocho correcciones ya está publicado y verificado técnicamente en staging. El responsable confirmó su aceptación funcional el 28 de octubre de 2026, incluidos recepción por etapa y avisos de retiro por transición. Un proceso Calendar interrumpido puede dejar el evento pendiente hasta vencer su lease y ejecutar una nueva reconciliación; no se anuncia éxito ni se ejecuta una reparación masiva de datos anteriores.

## Seguimiento de EVT-116 a EVT-119

Las cuatro correcciones ya están publicadas y verificadas técnicamente en staging. No queda pendiente autorización ni despliegue de este incremento. El responsable confirmó la aceptación funcional de estas cuatro correcciones el 28 de octubre de 2026; la evidencia es su validación humana, no el rechazo anónimo ni las pruebas locales. Producción requiere autorización independiente.
