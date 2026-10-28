# Matriz de trazabilidad

## EVT-121 — Cancelación de finalizados y cierre de las doce validaciones, 28 de octubre de 2026

El responsable confirmó: «ya probé las doce validaciones y todo está bien». Se cierran las ocho correcciones de consistencia y las cuatro EVT-116 a EVT-119 mediante esa aceptación humana en staging. No se presenta como un recorrido de navegador ejecutado por el agente. La incidencia de cancelación de finalizados fue comunicada en el mismo mensaje y se trata por separado como EVT-121.

- Contrato: RN-023, SEC-EVT-004, ADR-010 y spec/pruebas/tareas de Eventos. Sin nuevos campos, colecciones, Functions, dependencias ni estilos.
- Backend: `events.ts` inyecta el reloj en la cancelación; `firestore-events.repository.ts` valida el fin dentro de cada intento transaccional y proyecta `canCancel: false`. Fechas históricas válidas se interpretan sin backfill. El error `event-finished` ocurre antes de escrituras o integraciones externas.
- Interfaz: acciones separadas para editar/cancelar; escritorio, móvil y detalle no ofrecen cancelar finalizados. El temporizador incluye detalles fuera de la página actual; confirmaciones abiertas pierden su acción al llegar el fin. La respuesta funcional del backend tiene mensaje propio.
- **257 pruebas aprobadas:** 102 Angular, 108 unitarias de Functions y 47 de Eventos con Firestore Emulator. Se añadieron seis casos Angular y siete casos de integración; también se amplió la prueba de idempotencia para repetir una cancelación después del fin. Incluyen propietarios con ambos roles, fin exacto, último día multidiario, históricos incompletos, reloj cliente adelantado y ausencia de efectos secundarios.
- Aprobaron lint Angular/Functions, `lint:visual`, `functions:build`, `build` y `build:staging`. Build staging local: `main-H4EJQ5IB.js`; build predeterminado posterior: `main-XRRR6CWY.js`. Estilos sin cambios: `styles-ENSU7VMN.css`.
- El puerto habitual del emulador estaba ocupado. La suite utilizó una instancia Firestore aislada del proyecto demo en puertos libres, con configuración temporal eliminada al terminar, sin detener el servicio existente.
- **Publicado posteriormente el mismo día:** Hosting y las cuatro Functions de cancelación y consulta quedaron desplegados con autorización expresa únicamente en staging. Evidencia en el apartado siguiente. No se modificaron datos de eventos, Rules, índices, secretos, Calendar, SMTP ni producción. La aceptación funcional autenticada de EVT-121 sigue pendiente.

## Publicación y verificación remota de EVT-121 — 28 de octubre de 2026

El responsable autorizó «sube al stanging y documenta los specs». Se reconstruyeron `build:staging` y `functions:build`, se verificó `git diff --check` y `npm audit --omit=dev` reportó cero vulnerabilidades. El bundle coincide con el candidato previamente probado (`main-H4EJQ5IB.js`). Las 257 pruebas previas conservan su alcance; no se volvieron a ejecutar durante esta publicación.

Despliegues separados completados:

1. `firebase deploy --only functions:cancelEvent,functions:getEventDetail,functions:listEvents,functions:listCalendarEvents --project staging --non-interactive`.
2. `firebase deploy --only hosting --project staging --non-interactive`.

Verificación de metadatos a las `2026-10-28T21:55:26.099Z` (16:55 de Cancún), comprobando el nombre completo de cada recurso. Las cuatro Functions están `ACTIVE`, en `us-central1` y runtime `nodejs22`:

| Function             | Revisión publicada             | Actualización UTC                |
| -------------------- | ------------------------------ | -------------------------------- |
| `cancelEvent`        | `cancelevent-00009-xak`        | `2026-10-28T21:54:41.989260772Z` |
| `getEventDetail`     | `geteventdetail-00003-kug`     | `2026-10-28T21:54:28.448564421Z` |
| `listEvents`         | `listevents-00002-tod`         | `2026-10-28T21:54:27.570724545Z` |
| `listCalendarEvents` | `listcalendarevents-00002-xol` | `2026-10-28T21:54:28.370316253Z` |

`cancelEvent` mantiene los enlaces `GOOGLE_CALENDAR_CONFIG` versión 3 y `SMTP_CONFIG` versión 4; las tres Functions de consulta no requieren secretos. No se accedió al contenido ni se crearon versiones de secretos.

Los **20/20 archivos** de `dist/eventos-tup-angular/browser` coinciden por SHA-256 con los publicados. `/login` respondió `200` con el mismo HTML local. Hashes verificados:

- `main-H4EJQ5IB.js`: `927374609ce00b443cf9531d2ad886feee6b073b757abf11cc5a8df5640aaa7a`.
- `styles-ENSU7VMN.css`: `31fb12ad781b27e4337039d5aadb2d4c1938f65b793fa6dbbd1624fc89bb7dd0`.

Solicitudes anónimas a las cuatro callables, con un ID sintético inexistente, devolvieron `401 / UNAUTHENTICATED`. No ejecutaron cancelaciones ni integraciones reales. Esta evidencia comprueba publicación, integridad y rechazo sin sesión; no sustituye el recorrido autenticado de un evento finalizado y de una confirmación abierta al alcanzar el fin. Queda pendiente esa aceptación específica. Las doce validaciones anteriores conservan la aceptación comunicada por el responsable.

No se desplegaron otras Functions, Rules o índices, no se modificaron datos de eventos ni se ejecutaron migraciones, reparaciones históricas o envíos de prueba. Producción permanece intacta.

## Incidencias de aceptación — 27 de octubre de 2026

- EVT-120: `events.facade.ts`, `events-error.mapper.ts`, `events-page.ts/html`; `spec.md`, `pruebas.md` y `tareas.md` de Eventos. Cuatro regresiones nuevas: error y recuperación, timeout/respuesta tardía, invalidación y error visible/reintento dentro del modal. 96 Angular aprobadas (40 específicas del módulo); Hosting publicado y verificado, aceptación visual autenticada pendiente.
- SMTP: `VALIDACIÓN 02`, revisión 1, siete trabajos terminales `smtp-permanent`, un intento cada uno y sin `fechaEnvio`. `createEvent` ACTIVE, enlazada a `SMTP_CONFIG` versión 3, creador permitido; prueba `verify()` sin envío rechazada con `EAUTH` / `535` / `5.7.8` en `AUTH PLAIN`. Diagnóstico real de autenticación, sin modificar datos ni servicios; no prueba entrega.
- Auxiliar manual `scripts/rotate-staging-smtp.ps1` y `.cjs`: sintaxis PowerShell y Node verificadas. No contiene credenciales; exige entrada oculta, valida formato y destino, silencia logs, verifica autenticación antes de escribir Secret Manager y no envía correo ni despliega. El responsable lo ejecutó y confirmó autenticación correcta y versión 4 creada.
- EVT-120: además aprobaron lint Angular/Functions, guardia visual, formato de archivos afectados, `git diff --check` y build de staging (`main-XJTQY4RO.js`, `styles-ENSU7VMN.css`). Se publicó Hosting por separado; los 20 archivos remotos coinciden por SHA-256 con el build local. Se compiló Functions para la rotación; el código backend no cambió.
- Rotación: el primer despliegue se detuvo en descubrimiento local (10 segundos), sin actualizar Functions; el reintento con `FUNCTIONS_DISCOVERY_TIMEOUT=60` exclusivamente durante el comando completó las ocho Functions, conservando límites de ejecución remotos. Todas se verificaron `ACTIVE` y enlazadas a versión 4.
- Recuperación: evento `JiSd5ZEFGboQLkdjjIqJ` (`VALIDACIÓN 02`), revisión 1. Transacción de siete trabajos confirmada a `2026-10-27T21:23:51.840313Z`; se preservaron IDs, destinatarios, revisión, fotografía e intento previo. Worker programado: HTTP 200, `processed: 7`. Los siete figuran `enviado`, con `intentos: 2`, sin error y fecha de envío entre `21:28:02.567Z` y `21:28:10.514Z` (16:28 de Cancún). Resumen `completas`; aceptación por SMTP comprobada, sin inspección de buzones. No se modificó producción ni se reabrieron otros trabajos.

| Function                     | Revisión verificada con SMTP_CONFIG 4  |
| ---------------------------- | -------------------------------------- |
| createEvent                  | createevent-00008-pak                  |
| updateEvent                  | updateevent-00008-rad                  |
| cancelEvent                  | cancelevent-00008-qur                  |
| reportEquipmentDelay         | reportequipmentdelay-00008-kem         |
| reconcileEventIntegrations   | reconcileeventintegrations-00008-sor   |
| processEventIntegrations     | processeventintegrations-00008-dup     |
| syncUpdatedEventIntegrations | syncupdatedeventintegrations-00009-leq |
| processEventNotifications    | processeventnotifications-00006-zub    |

## Equivalencia del producto actual

| Comportamiento actual          | Spec Angular                      | Prueba requerida                                                           | Estado                                                                                                                 |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Google Sign-In                 | `modulo-autenticacion/spec.md`    | AUTH-001                                                                   | Implementado y aceptado en staging con perfiles autorizados y negativos                                                |
| Rechazo de usuario inexistente | `modulo-autenticacion/spec.md`    | AUTH-002                                                                   | Implementado; prueba backend aprobada                                                                                  |
| Rechazo de usuario inactivo    | `modulo-autenticacion/spec.md`    | AUTH-003                                                                   | Implementado; prueba backend aprobada                                                                                  |
| Validación de dominio          | `modulo-autenticacion/spec.md`    | AUTH-004                                                                   | Implementado; prueba backend aprobada                                                                                  |
| Asociación y conflicto de UID  | `modulo-autenticacion/spec.md`    | AUTH-005 y AUTH-006                                                        | Implementado; prueba backend aprobada                                                                                  |
| Persistencia de sesión         | `modulo-autenticacion/spec.md`    | AUTH-008                                                                   | Implementado y aceptado en staging, incluida revocación                                                                |
| Protección de rutas            | `modulo-autenticacion/spec.md`    | AUTH-009, AUTH-011 y AUTH-012                                              | Implementado; pruebas frontend aprobadas                                                                               |
| Roles `admin` / `usuario`      | `seguridad.md`                    | AUTH-013, AUTH-014, AUTH-017, AUTH-018 y AUTH-019                          | Implementado; 8 pruebas de Rules aprobadas y Firestore Rules publicadas en staging                                     |
| Destino post-login y perfil    | `modulo-autenticacion/spec.md`    | AUTH-029                                                                   | Integrado en el Dashboard funcional; nombre, correo y rol se conservan y logout permanece en el shell                  |
| Sidebar y topbar               | `modulo-layout/spec.md`           | LAYOUT-001 a LAYOUT-013                                                    | Implementado; pruebas unitarias y aceptación visual/accesible aprobadas                                                |
| Gestión de usuarios            | `modulo-usuarios/spec.md`         | USR-001 a USR-069                                                          | Implementado, desplegado y aceptado administrativa, visual y funcionalmente en staging                                 |
| Gestión de coordinaciones      | `modulo-coordinaciones/spec.md`   | COO-001 a COO-034                                                          | Implementado, desplegado y aceptado administrativa, visual y funcionalmente en staging                                 |
| Gestión de campus              | `modulo-campus/spec.md`           | CAM-001 a CAM-033                                                          | Implementado, normalizado, publicado y aceptado administrativa, visual y funcionalmente en staging                     |
| Gestión de equipos             | `modulo-equipos/spec.md`          | EQP-001 a EQP-035                                                          | Catálogo implementado, publicado y aceptado administrativa, visual, funcional y logísticamente en staging              |
| Reservación y logística        | `modulo-equipos/reservaciones.md` | RES-001 a RES-035                                                          | Creación, edición, cancelación, recepción y demora implementadas, probadas y desplegadas únicamente a staging          |
| Gestión de eventos             | `modulo-eventos/spec.md`          | EVT-001 a EVT-110                                                          | Implementado y desplegado únicamente a staging; ciclo integral, roles, logística e integraciones aceptados manualmente |
| Anticipación y multidiarios    | `modulo-eventos/spec.md`          | EVT-061 a EVT-071                                                          | Aprobado documentalmente; máximo seis fechas, un campus y cinco fechas naturales de anticipación                       |
| Estado temporal automático     | `modulo-eventos/spec.md`          | EVT-072 a EVT-080                                                          | Derivación, transición visible, cancelación persistida y compatibilidad histórica implementadas y desplegadas          |
| Calendario administrativo      | `modulo-eventos/spec.md`          | EVT-081 a EVT-086, EVT-106 y EVT-107                                       | FullCalendar, ocupación multidiaria y compatibilidad visual v7 publicados únicamente en Hosting de staging             |
| PDF en Storage                 | `modulo-eventos/spec.md`          | EVT-008, EVT-028, EVT-031, EVT-048 y EVT-100                               | Carga, reemplazo, cancelación, Rules y limpieza segura implementadas y aceptadas en el cierre técnico                  |
| Calendar y correo              | `integraciones.md`                | EVT-011 a EVT-020, EVT-028 a EVT-032, EVT-087 a EVT-090, EVT-109 y EVT-110 | Calendar institucional activo; correo HTML y autorización dinámica de Coordinaciones desplegados únicamente a staging  |
| Dashboard real                 | `modulo-dashboard/spec.md`        | DASH-001 a DASH-018                                                        | Implementado, desplegado y aceptado manualmente con ambos roles el 3 de octubre de 2026                                |

## Correcciones deliberadas

| Riesgo actual                                       | Decisión objetivo                        | Referencia    |
| --------------------------------------------------- | ---------------------------------------- | ------------- |
| Guards como barrera principal de Usuarios           | Claims + Rules + Functions               | ADR-001       |
| Usuario inactivo aún autenticado                    | Claim `authorized`, refresh y revocación | ADR-001       |
| Dependencia potencial de AngularFire incompatible   | SDK modular directo                      | ADR-002       |
| Estado global sobredimensionado                     | Signals + RxJS                           | ADR-003       |
| Copia visual literal de Vue                         | Design system Angular propio             | ADR-004       |
| Formulario de búsqueda recarga la SPA               | Formulario reactivo y filtrado local     | USR-067       |
| Caracteres tipográficos ambiguos en acciones        | SVG coherentes y ayuda contextual        | USR-068       |
| Búsqueda dependiente del botón o de `Enter`         | Filtrado local mientras se escribe       | USR-069       |
| Botones, colores y tipografía distintos por módulo  | Tokens y primitivas visuales globales    | Design system |
| Correo histórico solo al creador                    | Creador + coordinaciones seleccionadas   | ADR-006       |
| Calendar y SMTP acoplados sin reintento granular    | Integraciones independientes + outbox    | ADR-006       |
| Correos de coordinación visibles en Eventos         | Catálogo sanitizado y backend canónico   | ADR-006       |
| Campus fijos y horarios codificados                 | Catálogo Campus y horarios administrados | ADR-007       |
| Equipos fijos dentro del documento de Evento        | Catálogo dinámico + fotografía histórica | ADR-007       |
| Disponibilidad guardada como contador mutable       | Cálculo transaccional por intervalos     | ADR-007       |
| Reservación parcial de equipos                      | Confirmación atómica de todo o nada      | ADR-007       |
| Estado de evento escrito por tareas periódicas      | Derivación desde instantes canónicos     | ADR-008       |
| Google Calendar como vista administrativa           | Firestore canónico + FullCalendar        | ADR-008       |
| Eliminación física sin historial de cancelación     | Cancelación histórica de solo lectura    | ADR-008       |
| Consulta vacía usada como único bloqueo concurrente | Documento de control por equipo          | ADR-009       |
| Reserva parcial por cada tipo de equipo             | Transacción única de hasta 20 tipos      | ADR-009       |
| Búsqueda, workers y logística sin contrato exacto   | Cierre operativo trazable                | ADR-010       |

## Regla

Ninguna fila puede pasar a “Implementado” sin evidencia de su prueba correspondiente. Las filas fuera de alcance no autorizan código.

## Evidencia del primer incremento

- Build Angular de producción aprobado.
- Lint frontend y Functions aprobado.
- 31 pruebas frontend aprobadas: 12 nuevas de Usuarios y 6 existentes de shell adaptadas a su navegación.
- 20 pruebas backend aprobadas: 9 de autorización y 11 de operaciones administrativas de Usuarios.
- Callable cargada correctamente en Functions Emulator.
- Java Temurin 21.0.12 instalado; 8 pruebas automatizadas de Firestore y Storage Rules aprobadas.
- 7 pruebas integrales de Usuarios aprobadas con Auth y Firestore Emulator, incluida concurrencia de correo único.
- Medición histórica del incremento de Usuarios: bundle inicial de staging de 460.80 kB y `users-page` diferido de 83.11 kB.
- Las cinco callables administrativas y Firestore Rules están desplegadas únicamente a staging; prueba de humo protegida aprobada.
- Shell administrativo compilado en configuración de staging; la aceptación visual autenticada se completó posteriormente el 3 de octubre de 2026.
- Esta evidencia corresponde al primer incremento histórico; Hosting fue publicado en incrementos posteriores y la validación integral por roles y la aceptación visual quedaron confirmadas el 3 de octubre.

## Evidencia de Coordinaciones

- 10 pruebas Angular nuevas de facade y pantalla; la suite frontend completa suma 41 pruebas aprobadas.
- 12 pruebas unitarias de Functions para Coordinaciones; la suite backend completa suma 32 pruebas aprobadas.
- 8 pruebas transaccionales propias con Firestore Emulator, incluida unicidad concurrente y edición activa con correos obligatorios.
- 10 pruebas de Firestore y Storage Rules aprobadas; lectura completa exclusiva de admin y escrituras directas bloqueadas.
- Lint Angular/Functions y formato aprobados.
- Medición histórica previa a la estandarización visual: bundle inicial de staging de 463.12 kB y `coordinations-page` diferido de 36.00 kB.
- Las seis callables y Firestore Rules de Coordinaciones fueron desplegadas únicamente a staging el 19 de agosto de 2026.
- La lista remota confirmó las seis Functions en `us-central1`; `listCoordinations` respondió `401` ante una llamada sin autenticación.
- Hosting y producción no fueron utilizados ni modificados en ese incremento; la aceptación visual autenticada quedó confirmada posteriormente el 3 de octubre.

## Evidencia transversal vigente — 19 de agosto de 2026

- Tipografía, colores, alturas, radios y estados de botones centralizados en `src/styles.scss` y documentados en `design-system/spec.md`.
- Usuarios y Coordinaciones dejaron de redefinir localmente las primitivas `.button` e `.icon-button`; sus hojas encapsuladas conservan solo distribución y estilos propios de la vista.
- Login y Dashboard usan la misma pila tipográfica sans-serif que el área administrativa.
- Suite Angular completa: 41 pruebas aprobadas.
- Lint de Angular y Functions aprobado; formato Prettier y `git diff --check` aprobados.
- Build vigente de staging aprobado: bundle inicial de 466.21 kB, `users-page` diferido de 37.62 kB y `coordinations-page` diferido de 34.75 kB.
- Este incremento visual no modificó contratos, modelo de datos, Functions, Rules ni recursos desplegados de Firebase.
- Hosting y producción no fueron modificados por ese incremento; la revisión visual manual autenticada quedó confirmada posteriormente el 3 de octubre.

## Auditoría de normalización visual — 21 de agosto de 2026

- `src/styles.scss` continúa como fuente canónica de tokens, botones e icon-buttons.
- Usuarios y Coordinaciones consumen las primitivas globales para sus acciones compartidas.
- Campus y Equipos retiraron sus selectores compartidos locales, adoptaron controles globales de 44 px, radio de 8 px, tokens institucionales y foco común.
- `npm run lint:visual` quedó integrado en `npm run lint` y verifica todos los SCSS de `src/app` contra duplicados y colores institucionales obsoletos.
- Build de staging aprobado: bundle inicial de 468.25 kB, `campuses-page` diferido de 34.17 kB y `equipment-page` diferido de 34.77 kB.
- Suite Angular completa: 51 pruebas aprobadas. Lint Angular/Functions/visual aprobado.
- La comparación autenticada responsive y accesible entre los módulos quedó confirmada el 3 de octubre de 2026.
- Esta evidencia registró el estado del 21 de agosto. El Hosting vigente de staging incorpora la normalización y la aceptación visual autenticada quedó confirmada el 3 de octubre; producción no fue utilizada.

## Evidencia de Campus — 21 de agosto de 2026

- 5 pruebas Angular específicas de pantalla y facade; la suite frontend completa suma 46 pruebas aprobadas.
- 9 pruebas unitarias de Functions específicas; la suite backend completa suma 41 pruebas aprobadas.
- 6 pruebas transaccionales con Firestore Emulator, incluida unicidad concurrente de nombre y clave, estado idempotente y protección de históricos.
- 12 pruebas de Firestore y Storage Rules aprobadas; lectura completa exclusiva de `admin` y escrituras directas bloqueadas.
- Suite completa `npm run test:all`, lint Angular/Functions, formato Prettier y build de staging aprobados.
- Bundle inicial de staging de 467.09 kB y `campuses-page` diferido de 33.06 kB.
- Las seis Functions de Campus, Firestore Rules y Hosting fueron desplegados únicamente a staging el 21 de agosto de 2026.
- La verificación remota confirmó las seis Functions, Hosting `200` y rechazo `401` de `listCampuses` sin autenticación.
- Producción no fue utilizada ni modificada.
- TUP/FCS, la revisión visual con sesión `admin` y la aceptación funcional administrativa quedaron confirmados; el cierre administrativo se registró el 27 de octubre de 2026.

## Evidencia de Equipos — 21 de agosto de 2026

- Catálogo, reservaciones futuras, 33 pruebas de catálogo, 20 pruebas logísticas y tareas documentadas.
- Modelo de dominio, ruta lazy `/equipos`, gateway, facade, pantalla administrativa y navegación exclusiva de `admin` implementados.
- Seis callables, repositorio transaccional y Firestore Rules implementados; las escrituras directas permanecen bloqueadas.
- 5 pruebas Angular específicas; la suite frontend completa suma 51 pruebas aprobadas.
- 10 pruebas unitarias de Functions específicas; la suite backend completa suma 51 pruebas aprobadas.
- 7 pruebas transaccionales propias con Firestore Emulator y 14 pruebas de Firestore/Storage Rules aprobadas.
- Suite completa `npm run test:all`, lint Angular/Functions, compilación TypeScript de Functions y build de staging aprobados.
- Bundle inicial de staging de 468.19 kB y `equipment-page` diferido de 33.71 kB.
- Esta evidencia corresponde al incremento A del 21 de agosto. El Hosting y backend vigentes incorporaron después Eventos, disponibilidad y reservaciones; la aceptación visual y logística quedó confirmada el 3 de octubre y el recorrido administrativo completo del catálogo fue aceptado el 27 de octubre de 2026.
- Las seis Functions de Equipos, Firestore Rules y Hosting fueron desplegados únicamente a staging el 21 de agosto de 2026.
- La verificación remota confirmó las seis Functions Gen 2 en `us-central1`, Hosting `200` con la aplicación Angular y rechazo `401` de `listEquipment` sin autenticación.
- Producción no fue utilizada ni modificada.

## Evidencia de Eventos local y staging — 30 de septiembre de 2026

- Dieciséis Functions de Eventos, desde disponibilidad y mutaciones hasta integraciones, worker y mantenimiento, implementadas con identidad canónica y desplegadas en `us-central1`.
- Evento, reservas deterministas, controles de concurrencia y marcas de uso se escriben en una sola transacción; Calendar, SMTP, PDF y estado de aplicación quedan fuera.
- Modelos, gateway, facade, rutas lazy, listado, alta, detalle y calendario FullCalendar implementados y publicados únicamente en staging; el PDF inicial se carga por Storage y se valida en backend.
- 66 pruebas Angular y 71 pruebas unitarias de Functions aprobadas; incluyen previsualización segura, actualización anunciada, acciones/visibilidad por rol, estados temporales y proyección multidiaria inclusiva del calendario.
- 14 pruebas específicas de Eventos con Firestore Emulator: contención, todos-o-ninguno, exclusión de reserva propia, rechazo de evento ajeno, versiones, mutaciones, paginación, intervalos e integración canónica.
- 15 pruebas de Firestore y Storage Rules aprobadas; colecciones protegidas y escritura directa de Eventos bloqueadas.
- Para este corte de Eventos, la evidencia automatizada sumó 191 pruebas aprobadas, compilación TypeScript de Functions, lint Angular/Functions/visual, formato y build de staging. La matriz del Dashboard registra después el total vigente de 212 pruebas.
- La evidencia histórica cerró sin vulnerabilidades altas o críticas. La estabilización del 27 de octubre dejó `npm audit --omit=dev` en cero y la auditoría completa sin altas/críticas; ADR-011 documenta versiones, overrides y el riesgo moderado exclusivo de Firebase CLI.
- `SMTP_CONFIG` versión 3 contiene la allowlist exacta de Omar, Eventos, Víctor Yama y Lizett Méndez; sus ocho Functions consumidoras están `ACTIVE` y enlazadas a esa versión. `GOOGLE_CALENDAR_CONFIG` versión 3 usa OAuth `calendar.events` y el calendario institucional compartido; la estructura, el destino y la lectura aprobaron, y sus siete Functions están `ACTIVE`. La configuración logística, siete índices `READY` y TTL `ACTIVE` quedaron verificados sin exponer secretos.
- Firestore Rules, Storage Rules, las 16 Functions y Hosting fueron desplegados únicamente a staging. `PRUEBA 1` confirmó creación/reconciliación inicial y el 3 de octubre se aceptaron actualización, cancelación, entrega dinámica, negativas e idempotencia. Producción no fue utilizada.
- La regresión EVT-093A aprobó pruebas Angular, Functions y Emulator; `checkEventAvailability` y Hosting se actualizaron en staging y la aceptación autenticada quedó confirmada el 3 de octubre.
- EVT-093B se publicó en Hosting de staging; el modal refresca al recuperar foco/visibilidad y cada 30 segundos visibles. La aceptación manual en dos pestañas quedó confirmada el 3 de octubre.
- EVT-094 corrigió exclusivamente en staging el orden físico de los índices del calendario a `finAt, inicioAt` y `campusId, finAt, inicioAt`. Ambos quedaron `READY`; las consultas remotas general y por campus aprobaron sin `FAILED_PRECONDITION`, se retiraron los dos índices inversos y el inventario final conservó siete índices compuestos `READY`.
- EVT-103 y EVT-104 quedaron implementados, validados y publicados únicamente en Hosting de staging el 2 de octubre: el propietario dispone de editar/cancelar directamente en el listado, otros usuarios solo consultan y la columna Integración se renderiza únicamente para `admin`. La URL respondió HTTP 200 con el bundle esperado; Functions, Rules, índices y producción no fueron modificados.
- EVT-105 y EVT-106 quedaron publicadas únicamente en Hosting de staging el 2 de octubre. EVT-106 corrigió la ocupación continua de todas las fechas multidiarias y la presentación del calendario; aprobó 66 pruebas Angular, lint, guardia visual, formato y build. La URL respondió HTTP 200 con `main-6DTMESSF.js`; backend y producción no fueron modificados.
- EVT-107 corrigió la hoja `palette.css` omitida, la propiedad de evento incompatible `classNames` y los selectores internos v6. Aprobó las 66 pruebas Angular, lint completo, guardia visual, formato y build de staging. Una muestra local de FullCalendar 7 verificó franja de 280 px sobre cuatro celdas de 71 px, texto blanco sobre fondo institucional y popover de seis filas sin superposición, con 360 px de ancho, scroll y permanencia dentro del viewport. Después se publicó únicamente Hosting de staging; la URL respondió HTTP 200 y coincidió con `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`. No se modificaron backend ni producción.
- EVT-108 sustituyó únicamente en staging el calendario desechable por el calendario institucional compartido. OAuth, secreto, destino y lectura aprobaron; el ciclo real de creación, actualización y cancelación quedó aceptado el 3 de octubre. No se migraron eventos de prueba ni se modificó producción.
- EVT-109 implementó el correo HTML institucional con alternativa de texto, fecha localizada, horario de Cancún, campus, responsable, coordinaciones, equipos, observaciones y cambios disponibles, sin recursos remotos ni datos técnicos. Aprobaron 75 pruebas unitarias de Functions, 14 de Eventos con Firestore Emulator, lint, formato y build; las ocho Functions consumidoras de SMTP se actualizaron únicamente en staging. La aceptación visual de un correo nuevo quedó confirmada el 3 de octubre; producción no fue modificada.
- EVT-110 implementó la autorización SMTP dinámica de contactos institucionales con procedencia protegida `coordinacion` o `sistemas`. Aprobaron 78 pruebas unitarias de Functions y 14 pruebas de Eventos con Firestore Emulator; la aceptación real positiva y las negativas controladas quedaron confirmadas el 3 de octubre. La lista fija y `SMTP_CONFIG` versión 3 se conservaron; producción no fue modificada.

## Evidencia de Dashboard local y staging — 3 de octubre de 2026

- `getDashboardSummary` revalida claims y el documento canónico activo, rechaza entradas no vacías y devuelve el mismo contrato sanitizado para `admin` y `usuario`.
- Las métricas usan agregaciones de Firestore; las listas de próximos eventos y actividad reciente están limitadas a cinco elementos y no exponen documentos de `usuarios`.
- Angular sustituyó `TemporaryDashboard` por `DashboardPage` lazy con Signals, reintento, estados de carga, vacío, error total y error parcial, tabla de próximos eventos y alternativa móvil.
- El índice declarativo de próximos eventos quedó agregado a `firestore.indexes.json`; la consulta y los cálculos aprobaron una prueba específica con Firestore Emulator.
- La regresión completa aprobó 212 pruebas: 84 unitarias de Functions, 70 Angular, 42 de módulos con emuladores, una específica de Dashboard y 15 de Rules; también aprobaron compilación TypeScript de Functions, lint Angular/Functions/visual, formato y build de staging.
- El build local produjo un bundle inicial de 549.58 kB y `dashboard-page` diferido de 18.87 kB.
- El índice `eventos(estatus ASC, inicioAt ASC, __name__ ASC)` quedó `READY`; `getDashboardSummary` aparece como callable Gen 2 en `us-central1` y una solicitud sin autenticación fue rechazada correctamente con `401`.
- Hosting respondió HTTP 200 y sirvió `main-YA3LURUC.js`. La aceptación visual, accesible y funcional autenticada con ambos roles quedó confirmada el 3 de octubre; no se desplegaron Rules, secretos u otras Functions, no se modificaron datos y producción no fue utilizada.

## Estabilización técnica local y staging — 27 de octubre de 2026

- La regresión completa aprobó 215 pruebas: 84 unitarias de Functions, 71 Angular, 8 de Usuarios con emuladores, 9 de Coordinaciones con emuladores, 6 de Campus con emuladores, 7 de Equipos con emuladores, 14 de Eventos con emuladores, una específica de Dashboard y 15 de Firestore/Storage Rules.
- Autenticación incorporó una prueba real del núcleo de `bootstrapAuthorization` contra Auth y Firestore Emulator, incluida vinculación de UID, actualización de último acceso y sincronización de claims.
- Coordinaciones incorporó la carrera transaccional entre primer uso y eliminación; la prueba demuestra que solo una operación puede prevalecer y que no queda una coordinación usada eliminada.
- Usuarios incorporó cobertura de pantalla para confirmaciones de edición, cambio de estado y eliminación.
- Los builds locales de producción y staging aplican los mismos presupuestos: advertencia inicial en 750 kB, error en 1 MB, advertencia por estilo de componente en 6 kB y error en 8 kB. El build de producción quedó limpio con 559.68 kB iniciales y sin excedentes.
- `npm audit --omit=dev` reportó cero vulnerabilidades. La auditoría completa no reportó vulnerabilidades altas o críticas; las cinco moderadas restantes pertenecen exclusivamente al árbol de Firebase CLI y se aceptan temporalmente bajo ADR-011, sin exposición en los artefactos de ejecución.
- Las primitivas de encabezados, paneles, formularios, tablas, badges, alertas, estados, diálogos, acciones, tooltips, paginación y vistas móviles quedaron centralizadas en `src/styles.scss`; la guardia visual impide reintroducir definiciones locales o colores semánticos duplicados.
- Después del cierre local y con autorización expresa, el commit `a3d31d2` desplegó por separado únicamente `bootstrapAuthorization` y Hosting a staging. La URL respondió `200` con `main-CAAEIP5O.js` y `styles-ENSU7VMN.css`; la callable quedó `ACTIVE` en Node 22, rechazó anónimos con `401` y el inventario remoto conservó correspondencia exacta entre 41 exports locales y 41 Functions activas. No se desplegaron otras Functions, Rules, índices o secretos, no se modificaron datos y producción permaneció intacta. Sobre esta versión el responsable confirmó satisfactoriamente los recorridos administrativos completos de Usuarios, Coordinaciones, Campus y Equipos; no quedan pendientes de aceptación en staging.

## Corrección local de cinco hallazgos — 27 de octubre de 2026

| Regla / caso                    | Implementación                                                   | Evidencia local                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-RES-002, RES-025, EVT-113    | reservation-capacity.ts y firestore-events.repository.ts         | 6 pruebas de capacidad (incluido oráculo de 100 distribuciones) y escenario integrado de reservas sucesivas con rechazo por pico real                                   |
| RN-RES-013/018/023, RES-026/027 | equipment-inventory.ts y firestore-admin-equipment.repository.ts | Reducción y avisos atómicos, idempotencia, revisión concurrente, reservas sucesivas/pasadas/canceladas, reversión sin Sistemas y límites de 400 reservas/450 escrituras |
| RN-RES-008/021/022, RES-028     | events.ts y firestore-events.repository.ts                       | Rechazo de reducción de ventana, ampliación y reintento idéntico aun después de su fecha                                                                                |
| EVT-111                         | event-integration-adapters.ts                                    | Creación concurrente, respuesta perdida, 409 ajeno, ID histórico, recreación y sucesor de cancelado con proveedor simulado                                              |
| EVT-112                         | event-integrations.ts                                            | Trabajo antiguo no altera pendiente/parciales vigente; dos finalizaciones actuales conservan completas                                                                  |

Validación ejecutada: 71 pruebas Angular, 95 unitarias de Functions, 25 de Eventos en Firestore Emulator y 7 del catálogo de Equipos: **198 pruebas aprobadas en este incremento**. No equivale a repetir la batería completa histórica de 215; las suites sin cambios de Usuarios, Coordinaciones, Campus, Dashboard y Rules conservan su evidencia anterior.

También aprobaron npm run lint (Angular, Functions y primitivas visuales), functions:build, build y build:staging. Calendar/SMTP se simularon; las pruebas Firestore usaron demo-eventos-tup. Durante esa validación local no se enviaron correos reales, no se accedió a datos de staging ni se desplegó. La publicación posterior se registra al final de este documento.

No se agregaron colecciones, campos, índices, dependencias ni cambios de Rules. Los avisos se guardan en la bandeja existente. Solo se añadió un mensaje funcional al mapper de Equipos, sin cambios visuales de distribución o estilos.

## Tres correcciones adicionales — evidencia local del 27 de octubre de 2026

| Caso                                     | Implementación                                                               | Evidencia                                                                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EVT-114 / RN-083                         | event-calendar-sync.ts, calendar-identity.ts y event-integration-adapters.ts | Dos servicios concurrentes, edición nueva tras respuesta/error antiguo, cancelación durante creación con respuesta perdida, lease ocupado/expirado/reemplazado, límite de cinco vueltas y margen temporal antes de llamar al proveedor                  |
| RES-029 / RN-RES-025                     | firestore-events.repository.ts, EventsPage y mapper de errores               | Rechazo previo/al transcurrir el evento o antes del regreso; aceptación en fronteras local/remota; cancelación no adelanta regreso; fechas incompletas cierran la operación; reintento no duplica control; botón habilitado/deshabilitado según backend |
| EVT-115 / RN-084                         | transacciones de Eventos y event-integrations.ts                             | Retirar, editar título, reagregar y retirar otra vez; una notificación por transición aun sin historial SMTP; revisión obsoleta no crea trabajos después de cancelación                                                                                 |
| Protección de controlIntegracionesEvento | firestore.rules                                                              | Lectura y mutaciones directas bloqueadas para clientes administrativos y usuarios; regresión de Firestore y Storage Rules                                                                                                                               |

Validación de este incremento: **222 pruebas aprobadas** = 73 Angular + 95 unitarias de Functions + 39 Eventos con Firestore Emulator + 15 Rules. Las suites ajenas a este alcance conservan su evidencia previa; no se afirma haber repetido toda la batería histórica. También aprobaron lint de Angular/Functions, guardia visual, compilación de Functions y builds frontend predeterminado y staging. Calendar/SMTP fueron simulados y Firestore/Storage usaron demo-eventos-tup.

El build local con configuración staging produjo main-YXUZKP35.js y styles-ENSU7VMN.css; posteriormente se publicaron con autorización expresa el 27 de octubre de 2026, según la evidencia al final de este documento. El incremento requiere una colección de control protegida y el campo canónico coordinacionIdsRetiradas, definidos primero en modelo-datos.md; no agrega dependencias ni índices. La colección se crea al reconciliar cada evento y no requiere migración masiva. La habilitación de recepción es una proyección, no un campo almacenado.

Despliegue completado y verificado técnicamente. Validación funcional de estas ocho correcciones aceptada por el responsable el 28 de octubre de 2026. Las pruebas anteriores aceptadas en staging siguen siendo evidencia de la versión anterior.

## Despliegue de las ocho correcciones — 27 de octubre de 2026

Autorización expresa del responsable: desplegar las ocho correcciones y actualizar documentación. Destino exclusivo: eventos-tup-angular-stg, alias staging. Se ejecutaron despliegues separados con --only y --project staging, en el orden Firestore Rules, Functions y Hosting; los tres terminaron correctamente.

- Firestore Rules: reglas publicadas coincidentes con el archivo local normalizado a LF. Ruleset b97522c7-4bfc-496d-ac02-965d6e50bdc6; SHA-256 f667cfaba853fa503efc75f8843fa4785225be5e8b368adba6b0f05c39683d36. Incluye denegación de acceso cliente a controlIntegracionesEvento.
- Doce Functions Gen 2 en us-central1 verificadas ACTIVE con revisiones actualizadas entre 17:25:30 y 17:25:36 UTC: updateEquipment, checkEventAvailability, createEvent, getEventDetail, updateEvent, cancelEvent, confirmEquipmentReception, reportEquipmentDelay, reconcileEventIntegrations, processEventIntegrations, syncUpdatedEventIntegrations y processEventNotifications.
- Hosting: los 20 archivos publicados coinciden byte por byte mediante SHA-256 con dist/eventos-tup-angular/browser. /login respondió HTTP 200 y referencia main-YXUZKP35.js. JavaScript SHA-256: 8cec0a271f7382778aca99c7e06a3530863bbc76d6fff0510186ec58686a0351. styles-ENSU7VMN.css SHA-256: 31fb12ad781b27e4337039d5aadb2d4c1938f65b793fa6dbbd1624fc89bb7dd0.
- Solicitudes anónimas a checkEventAvailability, getEventDetail, confirmEquipmentReception y updateEquipment rechazadas con 401 / UNAUTHENTICATED; no ejecutaron operaciones funcionales.
- Antes de publicar se repitieron satisfactoriamente build:staging, functions:build y diff --check. La evidencia de regresión previa del mismo código es de 222 pruebas: 73 Angular, 95 unitarias de Functions, 39 de Eventos con Firestore Emulator y 15 Rules, además de lint, guardia visual y formato. No se afirma haber repetido estas suites durante el despliegue.
- No se desplegaron índices ni Storage Rules, no se rotaron secretos y no se ejecutaron migraciones, reparación de datos históricos ni envíos de correo de prueba. Los workers publicados conservan su operación normal. La colección de control se materializa durante reconciliaciones; el campo de transición se calcula en las operaciones definidas por el modelo. Producción no fue modificada.

Aceptación funcional confirmada por el responsable el 28 de octubre de 2026 sobre esta versión: reducción de inventario y avisos atómicos; identidad Calendar sin duplicados; demoras que solo extienden; resumen SMTP de revisión vigente; capacidad por pico simultáneo; Calendar concurrente ordenado; recepción por etapa; retiros de coordinaciones por transición. La verificación técnica del despliegue y los dobles locales de Calendar/SMTP no sustituyen esos recorridos. La evidencia administrativa de la versión anterior conserva su alcance histórico.

## Cuatro correcciones posteriores — evidencia exclusivamente local del 27 de octubre de 2026

| Caso                  | Implementación                                                                                                 | Evidencia                                                                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EVT-116 / SEC-EVT-018 | syncUpdatedEventIntegrationsRecord en events.ts; handler delegado y lectura interna de revisión en repositorio | Anónimo, claims inválidos, perfil inactivo/inexistente o divergente no leen evento; usuario ajeno no lee revisión; propietario/admin válidos integran; entrada inválida y revisión antigua fallan. Prueba de integración con Firestore Emulator. |
| EVT-117               | EventsFacade con versiones independientes para listado, calendario y detalle                                   | Respuestas inversas, error obsoleto, loading vigente, invalidación durante debounce/un carácter, cierre y destrucción.                                                                                                                           |
| EVT-118               | Selección versionada del calendario compartida por clic y teclado                                              | Cierre/destrucción antes de respuesta, selección de otro evento y reapertura del mismo sin aceptar respuestas anteriores.                                                                                                                        |
| EVT-119               | loadRecords separado de loadCatalogs; caché en memoria por vista, petición compartida y refresco de formulario | Búsqueda, paginación y recarga mantienen una llamada inicial por catálogo; refresco consulta de nuevo; carga concurrente compartida; fallo conserva listado y permite reintento; abrir crear/editar actualiza sin perder selección.              |

Validación del código final: **240 pruebas aprobadas** (92 Angular, 108 unitarias de Functions y 40 Eventos con Firestore Emulator). Son 33 regresiones nuevas sobre estas suites; no se repitieron las suites de Rules u otros emuladores ajenos al cambio. También aprobaron lint Angular/Functions, lint:visual, functions:build, build y build:staging. Se comprobó formato y diff sin errores al cerrar la documentación.

El build de configuración staging generó main-3W3UNOGZ.js y styles-ENSU7VMN.css; el build predeterminado posterior generó main-OE2QS2OH.js. Durante esa validación eran artefactos locales: no se desplegaron servicios ni se ejecutaron Calendar/SMTP reales y staging conservaba main-YXUZKP35.js. La publicación posterior autorizada se registra a continuación; la aceptación funcional fue confirmada por el responsable el 28 de octubre de 2026.

## Publicación de EVT-116 a EVT-119 — 27 de octubre de 2026

Autorización expresa del responsable para desplegar las cuatro correcciones únicamente a staging y actualizar documentación. Se reconstruyeron build:staging y functions:build y se comprobó diff --check antes de publicar. El build frontend coincide con el candidato probado: main-3W3UNOGZ.js y styles-ENSU7VMN.css.

1. firebase deploy --only functions:syncUpdatedEventIntegrations --project staging --non-interactive: completado. Function Gen 2 / Node.js 22 en us-central1, estado ACTIVE, revisión syncupdatedeventintegrations-00008-web, actualizada 2026-10-27T17:47:41.137095567Z.
2. firebase deploy --only hosting --project staging --non-interactive: completado. Los 20 archivos remotos coinciden mediante SHA-256 con dist/eventos-tup-angular/browser; /login respondió 200 con el bundle esperado. SHA-256 main: 0eabd7fe9c04b6da7eb4b168333d81bd0837402c655570bb0a32dff25ffb061f. SHA-256 styles: 31fb12ad781b27e4337039d5aadb2d4c1938f65b793fa6dbbd1624fc89bb7dd0.
3. Solicitudes anónimas a syncUpdatedEventIntegrations con objeto vacío y con ID documental sintético/revisión: ambas devuelven 401 / UNAUTHENTICATED. No se consultaron eventos reales ni se ejecutaron integraciones.

No se desplegaron otras Functions, Rules, índices o secretos. No se realizaron migraciones, escrituras de datos ni envíos de prueba a Calendar/SMTP. Producción no fue modificada. Las 240 pruebas locales previas conservan su evidencia; este paso verifica publicación, integridad de archivos y rechazo anónimo, no aceptación funcional autenticada.

Cierre del 28 de octubre de 2026: el responsable confirmó satisfactorias las doce validaciones, incluidas las ocho correcciones anteriores y EVT-116 a EVT-119 (acceso, búsqueda/mes/campus, cierre del detalle y catálogos). Evidencia declarada por el responsable; no se atribuye a una sesión de navegador automatizada.
