# Matriz de trazabilidad

## Equivalencia del producto actual

| Comportamiento actual          | Spec Angular                      | Prueba requerida                                                           | Estado                                                                                                                  |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Google Sign-In                 | `modulo-autenticacion/spec.md`    | AUTH-001                                                                   | Implementado; validación integral pendiente                                                                             |
| Rechazo de usuario inexistente | `modulo-autenticacion/spec.md`    | AUTH-002                                                                   | Implementado; prueba backend aprobada                                                                                   |
| Rechazo de usuario inactivo    | `modulo-autenticacion/spec.md`    | AUTH-003                                                                   | Implementado; prueba backend aprobada                                                                                   |
| Validación de dominio          | `modulo-autenticacion/spec.md`    | AUTH-004                                                                   | Implementado; prueba backend aprobada                                                                                   |
| Asociación y conflicto de UID  | `modulo-autenticacion/spec.md`    | AUTH-005 y AUTH-006                                                        | Implementado; prueba backend aprobada                                                                                   |
| Persistencia de sesión         | `modulo-autenticacion/spec.md`    | AUTH-008                                                                   | Implementado; validación integral pendiente                                                                             |
| Protección de rutas            | `modulo-autenticacion/spec.md`    | AUTH-009, AUTH-011 y AUTH-012                                              | Implementado; pruebas frontend aprobadas                                                                                |
| Roles `admin` / `usuario`      | `seguridad.md`                    | AUTH-013, AUTH-014, AUTH-017, AUTH-018 y AUTH-019                          | Implementado; 8 pruebas de Rules aprobadas y Firestore Rules publicadas en staging                                      |
| Destino post-login y perfil    | `modulo-autenticacion/spec.md`    | AUTH-029                                                                   | Integrado en el Dashboard funcional; nombre, correo y rol se conservan y logout permanece en el shell                   |
| Sidebar y topbar               | `modulo-layout/spec.md`           | LAYOUT-001 a LAYOUT-013                                                    | Implementado; 6 pruebas unitarias aprobadas; aceptación visual pendiente                                                |
| Gestión de usuarios            | `modulo-usuarios/spec.md`         | USR-001 a USR-069                                                          | Implementado y desplegado en staging; emuladores y Rules aprobados; aceptación visual/manual pendiente                  |
| Gestión de coordinaciones      | `modulo-coordinaciones/spec.md`   | COO-001 a COO-034                                                          | Implementado y desplegado en staging; automatización aprobada y revisión manual pendiente                               |
| Gestión de campus              | `modulo-campus/spec.md`           | CAM-001 a CAM-033                                                          | Implementado, normalizado y publicado con el Hosting vigente de staging; aceptación manual pendiente                    |
| Gestión de equipos             | `modulo-equipos/spec.md`          | EQP-001 a EQP-035                                                          | Incremento A implementado, normalizado y publicado con el Hosting vigente de staging; aceptación manual pendiente       |
| Reservación y logística        | `modulo-equipos/reservaciones.md` | RES-001 a RES-035                                                          | Creación, edición, cancelación, recepción y demora implementadas, probadas y desplegadas únicamente a staging           |
| Gestión de eventos             | `modulo-eventos/spec.md`          | EVT-001 a EVT-102                                                          | Implementado, probado y desplegado únicamente a staging; pruebas reales de integraciones y aceptación manual pendientes |
| Anticipación y multidiarios    | `modulo-eventos/spec.md`          | EVT-061 a EVT-071                                                          | Aprobado documentalmente; máximo seis fechas, un campus y cinco fechas naturales de anticipación                        |
| Estado temporal automático     | `modulo-eventos/spec.md`          | EVT-072 a EVT-080                                                          | Derivación, transición visible, cancelación persistida y compatibilidad histórica implementadas y desplegadas           |
| Calendario administrativo      | `modulo-eventos/spec.md`          | EVT-081 a EVT-086, EVT-106 y EVT-107                                       | FullCalendar, ocupación multidiaria y compatibilidad visual v7 publicados únicamente en Hosting de staging              |
| PDF en Storage                 | `modulo-eventos/spec.md`          | EVT-008, EVT-028, EVT-031, EVT-048 y EVT-100                               | Carga, reemplazo, cancelación y limpieza segura implementadas; prueba real y observación del mantenimiento pendientes   |
| Calendar y correo              | `integraciones.md`                | EVT-011 a EVT-020, EVT-028 a EVT-032, EVT-087 a EVT-090, EVT-109 y EVT-110 | Calendar institucional activo; correo HTML y autorización dinámica de Coordinaciones desplegados únicamente a staging   |
| Dashboard real                 | `modulo-dashboard/spec.md`        | DASH-001 a DASH-018                                                        | Implementado, validado y desplegado únicamente a staging el 3 de octubre de 2026; aceptación manual pendiente           |

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
- Shell administrativo compilado en configuración de staging; aceptación visual autenticada pendiente.
- Esta evidencia corresponde al primer incremento histórico; Hosting fue publicado en incrementos posteriores. La validación integral con perfiles sintéticos y la aceptación visual permanecen pendientes.

## Evidencia de Coordinaciones

- 10 pruebas Angular nuevas de facade y pantalla; la suite frontend completa suma 41 pruebas aprobadas.
- 12 pruebas unitarias de Functions para Coordinaciones; la suite backend completa suma 32 pruebas aprobadas.
- 8 pruebas transaccionales propias con Firestore Emulator, incluida unicidad concurrente y edición activa con correos obligatorios.
- 10 pruebas de Firestore y Storage Rules aprobadas; lectura completa exclusiva de admin y escrituras directas bloqueadas.
- Lint Angular/Functions y formato aprobados.
- Medición histórica previa a la estandarización visual: bundle inicial de staging de 463.12 kB y `coordinations-page` diferido de 36.00 kB.
- Las seis callables y Firestore Rules de Coordinaciones fueron desplegadas únicamente a staging el 19 de agosto de 2026.
- La lista remota confirmó las seis Functions en `us-central1`; `listCoordinations` respondió `401` ante una llamada sin autenticación.
- Hosting y producción no fueron utilizados ni modificados; la aceptación autenticada manual continúa pendiente.

## Evidencia transversal vigente — 19 de agosto de 2026

- Tipografía, colores, alturas, radios y estados de botones centralizados en `src/styles.scss` y documentados en `design-system/spec.md`.
- Usuarios y Coordinaciones dejaron de redefinir localmente las primitivas `.button` e `.icon-button`; sus hojas encapsuladas conservan solo distribución y estilos propios de la vista.
- Login y Dashboard usan la misma pila tipográfica sans-serif que el área administrativa.
- Suite Angular completa: 41 pruebas aprobadas.
- Lint de Angular y Functions aprobado; formato Prettier y `git diff --check` aprobados.
- Build vigente de staging aprobado: bundle inicial de 466.21 kB, `users-page` diferido de 37.62 kB y `coordinations-page` diferido de 34.75 kB.
- Este incremento visual no modificó contratos, modelo de datos, Functions, Rules ni recursos desplegados de Firebase.
- Revisión visual manual autenticada continúa pendiente; Hosting y producción no fueron modificados.

## Auditoría de normalización visual — 21 de agosto de 2026

- `src/styles.scss` continúa como fuente canónica de tokens, botones e icon-buttons.
- Usuarios y Coordinaciones consumen las primitivas globales para sus acciones compartidas.
- Campus y Equipos retiraron sus selectores compartidos locales, adoptaron controles globales de 44 px, radio de 8 px, tokens institucionales y foco común.
- `npm run lint:visual` quedó integrado en `npm run lint` y verifica todos los SCSS de `src/app` contra duplicados y colores institucionales obsoletos.
- Build de staging aprobado: bundle inicial de 468.25 kB, `campuses-page` diferido de 34.17 kB y `equipment-page` diferido de 34.77 kB.
- Suite Angular completa: 51 pruebas aprobadas. Lint Angular/Functions/visual aprobado.
- La aceptación visual permanece pendiente de comparación autenticada responsive y accesible entre los cuatro módulos.
- Esta evidencia registró el estado del 21 de agosto. El Hosting vigente de staging ya incorpora la normalización; la aceptación visual autenticada permanece pendiente y producción no fue utilizada.

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
- Persisten la captura manual de TUP/FCS, la revisión visual con sesión `admin` y la aceptación funcional.

## Evidencia de Equipos — 21 de agosto de 2026

- Catálogo, reservaciones futuras, 33 pruebas de catálogo, 20 pruebas logísticas y tareas documentadas.
- Modelo de dominio, ruta lazy `/equipos`, gateway, facade, pantalla administrativa y navegación exclusiva de `admin` implementados.
- Seis callables, repositorio transaccional y Firestore Rules implementados; las escrituras directas permanecen bloqueadas.
- 5 pruebas Angular específicas; la suite frontend completa suma 51 pruebas aprobadas.
- 10 pruebas unitarias de Functions específicas; la suite backend completa suma 51 pruebas aprobadas.
- 7 pruebas transaccionales propias con Firestore Emulator y 14 pruebas de Firestore/Storage Rules aprobadas.
- Suite completa `npm run test:all`, lint Angular/Functions, compilación TypeScript de Functions y build de staging aprobados.
- Bundle inicial de staging de 468.19 kB y `equipment-page` diferido de 33.71 kB.
- Esta evidencia corresponde al incremento A del 21 de agosto. El Hosting y backend vigentes de staging incorporan después el formulario de Eventos, la disponibilidad y las reservaciones transaccionales; la aceptación manual continúa pendiente.
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
- La auditoría completa y `npm audit --omit=dev` terminaron sin vulnerabilidades altas o críticas; ADR-011 documenta versiones y el override acotado.
- `SMTP_CONFIG` versión 3 contiene la allowlist exacta de Omar, Eventos, Víctor Yama y Lizett Méndez; sus ocho Functions consumidoras están `ACTIVE` y enlazadas a esa versión. `GOOGLE_CALENDAR_CONFIG` versión 3 usa OAuth `calendar.events` y el calendario institucional compartido; la estructura, el destino y la lectura aprobaron, y sus siete Functions están `ACTIVE`. La configuración logística, siete índices `READY` y TTL `ACTIVE` quedaron verificados sin exponer secretos.
- Firestore Rules, Storage Rules, las 16 Functions y Hosting fueron desplegados únicamente a staging. `PRUEBA 1` confirmó creación/reconciliación real de Calendar y entrega SMTP permitida sin duplicación; actualización, cancelación, rechazo fuera de lista y aceptación manual siguen pendientes. Producción no fue utilizada.
- La regresión EVT-093A aprobó pruebas Angular, Functions y Emulator; `checkEventAvailability` y Hosting se actualizaron por separado en staging el 1 de octubre para excluir la reserva propia durante la previsualización de edición. La aceptación autenticada en navegador sigue pendiente.
- EVT-093B aprobó su regresión Angular y se publicó únicamente en Hosting de staging el 1 de octubre: el modal refresca al recuperar foco/visibilidad y cada 30 segundos visibles, conserva cantidades y anuncia cambios. La aceptación manual en dos pestañas sigue pendiente.
- EVT-094 corrigió exclusivamente en staging el orden físico de los índices del calendario a `finAt, inicioAt` y `campusId, finAt, inicioAt`. Ambos quedaron `READY`; las consultas remotas general y por campus aprobaron sin `FAILED_PRECONDITION`, se retiraron los dos índices inversos y el inventario final conservó siete índices compuestos `READY`.
- EVT-103 y EVT-104 quedaron implementados, validados y publicados únicamente en Hosting de staging el 2 de octubre: el propietario dispone de editar/cancelar directamente en el listado, otros usuarios solo consultan y la columna Integración se renderiza únicamente para `admin`. La URL respondió HTTP 200 con el bundle esperado; Functions, Rules, índices y producción no fueron modificados.
- EVT-105 y EVT-106 quedaron publicadas únicamente en Hosting de staging el 2 de octubre. EVT-106 corrigió la ocupación continua de todas las fechas multidiarias y la presentación del calendario; aprobó 66 pruebas Angular, lint, guardia visual, formato y build. La URL respondió HTTP 200 con `main-6DTMESSF.js`; backend y producción no fueron modificados.
- EVT-107 corrigió la hoja `palette.css` omitida, la propiedad de evento incompatible `classNames` y los selectores internos v6. Aprobó las 66 pruebas Angular, lint completo, guardia visual, formato y build de staging. Una muestra local de FullCalendar 7 verificó franja de 280 px sobre cuatro celdas de 71 px, texto blanco sobre fondo institucional y popover de seis filas sin superposición, con 360 px de ancho, scroll y permanencia dentro del viewport. Después se publicó únicamente Hosting de staging; la URL respondió HTTP 200 y coincidió con `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`. No se modificaron backend ni producción.
- EVT-108 sustituyó únicamente en staging el calendario desechable por el calendario institucional compartido. La validación previa confirmó OAuth `calendar.events`, estructura del secreto, destino y lectura; `GOOGLE_CALENDAR_CONFIG` versión 3 quedó `ENABLED` y las siete Functions consumidoras quedaron `ACTIVE` en `us-central1`. No se migraron eventos de prueba ni se modificaron Hosting, Rules, índices, datos, SMTP o producción; falta crear un evento nuevo desde la aplicación.
- EVT-109 implementó el correo HTML institucional con alternativa de texto, fecha localizada, horario de Cancún, campus, responsable, coordinaciones, equipos, observaciones y cambios disponibles, sin recursos remotos ni datos técnicos. Aprobaron 75 pruebas unitarias de Functions, 14 de Eventos con Firestore Emulator, lint, formato y build; las ocho Functions consumidoras de SMTP se actualizaron únicamente en staging y Firebase confirmó el despliegue. Falta la aceptación visual de un correo generado después de la actualización; no se modificaron Hosting, Rules, índices, secretos, datos ni producción.
- EVT-110 implementó la autorización SMTP dinámica de contactos institucionales con procedencia protegida `coordinacion` o `sistemas`. Aprobaron 78 pruebas unitarias de Functions, 14 pruebas de Eventos con Firestore Emulator, lint, guardia visual, formato y build. Después se actualizaron únicamente las ocho Functions consumidoras de SMTP en staging y Firebase confirmó las ocho operaciones. La lista fija y `SMTP_CONFIG` versión 3 se conservaron; no se modificaron Hosting, Rules, índices, secretos, datos o producción. La aceptación real de la nueva vía continúa pendiente.

## Evidencia de Dashboard local y staging — 3 de octubre de 2026

- `getDashboardSummary` revalida claims y el documento canónico activo, rechaza entradas no vacías y devuelve el mismo contrato sanitizado para `admin` y `usuario`.
- Las métricas usan agregaciones de Firestore; las listas de próximos eventos y actividad reciente están limitadas a cinco elementos y no exponen documentos de `usuarios`.
- Angular sustituyó `TemporaryDashboard` por `DashboardPage` lazy con Signals, reintento, estados de carga, vacío, error total y error parcial, tabla de próximos eventos y alternativa móvil.
- El índice declarativo de próximos eventos quedó agregado a `firestore.indexes.json`; la consulta y los cálculos aprobaron una prueba específica con Firestore Emulator.
- La regresión completa aprobó 212 pruebas: 84 unitarias de Functions, 70 Angular, 42 de módulos con emuladores, una específica de Dashboard y 15 de Rules; también aprobaron compilación TypeScript de Functions, lint Angular/Functions/visual, formato y build de staging.
- El build local produjo un bundle inicial de 549.58 kB y `dashboard-page` diferido de 18.87 kB.
- El índice `eventos(estatus ASC, inicioAt ASC, __name__ ASC)` quedó `READY`; `getDashboardSummary` aparece como callable Gen 2 en `us-central1` y una solicitud sin autenticación fue rechazada correctamente con `401`.
- Hosting respondió HTTP 200 y sirvió `main-YA3LURUC.js`. La aceptación visual, accesible y funcional autenticada con ambos roles continúa pendiente; no se desplegaron Rules, secretos u otras Functions, no se modificaron datos y producción no fue utilizada.
