# Tareas: Eventos

## Estado

Implementación y primer despliegue funcional a staging cerrados el 30 de septiembre de 2026 conforme a ADR-006, ADR-009, ADR-010 y ADR-011. Incluye creación, disponibilidad, búsqueda, detalle, edición, cancelación histórica, reservaciones y logística, Calendar/SMTP con adaptadores seguros, mantenimiento de PDFs, backfill y experiencia Angular. Los secretos están enlazados, `SMTP_CONFIG` versión 3 conserva como lista fija a Omar, Eventos, Víctor Yama y Lizett Méndez, la configuración logística existe y Rules, índices, TTL, 16 Functions de Eventos y Hosting fueron desplegados únicamente a staging. EVT-110 añade autorización dinámica para contactos institucionales con procedencia protegida de Coordinaciones sin rotar el secreto; sus ocho Functions consumidoras quedaron actualizadas en staging el 3 de octubre. La creación real de Calendar, la entrega SMTP permitida y la reconciliación idempotente quedaron verificadas con `PRUEBA 1`; continúan pendientes la entrega de una revisión nueva a una coordinación fuera de la lista fija, actualización y cancelación reales, las negativas de seguridad y la aceptación manual. Producción no está autorizada.

## Evidencia del incremento local — 30 de septiembre de 2026

- Callables locales de disponibilidad, creación, listado, búsqueda, calendario, detalle, edición, cancelación, reconciliación y acciones logísticas con identidad y perfil canónicos.
- Validación de cinco fechas naturales, máximo seis fechas, prohibición de domingo y zona `America/Cancun`.
- Creación transaccional de evento, reservaciones, controles monotónicos y marcas de uso.
- Disponibilidad calculada desde reservas superpuestas; máximo de 20 tipos y confirmación de todos o ninguno.
- Cálculo de montaje local, salida previa, regreso, margen de liberación y cobertura de Sistemas.
- `firestore.indexes.json` y Rules locales que bloquean escritura directa y colecciones protegidas.
- Rutas lazy `/eventos` y `/eventos/calendario`, facade, listado paginado, formulario de alta, detalle y calendario FullCalendar Standard `7.1.0` implementados y publicados únicamente en staging.
- El formulario carga el protocolo PDF en la ruta aprobada y la Function comprueba bucket, ruta, tipo y tamaño antes de confirmar el evento.
- Calendar sin asistentes, bandeja SMTP idempotente, avisos logísticos, lease de 10 minutos, reintentos, limpieza y backfill implementados con dobles.
- En el corte inicial aprobaron 57 pruebas Angular, 70 pruebas unitarias de Functions, 13 pruebas transaccionales de Eventos y 15 pruebas de Rules, además de lint, formato y builds Angular/Functions; las regresiones posteriores se registran a continuación.
- El 1 de octubre de 2026 las regresiones de edición y actualización del modal elevaron la evidencia vigente a 59 pruebas Angular, 71 de Functions, 42 de emuladores funcionales y 15 de Rules: 187 pruebas aprobadas, además de lint y ambos builds.
- El 2 de octubre de 2026 EVT-103 y EVT-104 elevaron la evidencia vigente a 63 pruebas Angular y 191 totales; lint completo, guardia visual, formato y build de staging aprobaron. Después se publicó únicamente Hosting en staging y se verificó respuesta HTTP 200 con el bundle esperado.

## Preparación del siguiente incremento

El siguiente incremento es de verificación operativa, no de código funcional: ejecutar la aceptación controlada de Calendar, SMTP, interfaz y accesibilidad sobre el despliegue existente. El backfill productivo y producción siguen necesitando autorización separada.

## Bloqueos previos

- [x] EVT-T01 Implementar y desplegar `modulo-coordinaciones` a staging.
- [x] EVT-T01A Capturar TUP/FCS con horarios canónicos en Campus.
- [x] EVT-T01B Implementar, desplegar y capturar el catálogo inicial de Equipos.
- [x] EVT-T01C Resolver eventos de varios días, anticipación y permanencia nocturna de equipos.
- [x] EVT-T01D Aprobar estrategia transaccional e índices Firestore de reservaciones y calendario mediante ADR-009.
- [x] EVT-T01E Registrar en `configuracion/logisticaEquipos` el ID canónico `GoPowUg4NO8bbW5658Jx` de la Coordinación de Sistemas y los valores de ADR-010.
- [x] EVT-T02 Aprobar máximo de 10 correos por coordinación y selección sin límite funcional.
- [x] EVT-T03 Aprobar tres reintentos y retención de 90 días.
- [x] EVT-T04 Aprobar limpieza posterior del PDF reemplazado y purga de huérfanos después de 24 horas.
- [x] EVT-T05A Crear `CALENDARIO - STAGING`, habilitar Calendar API en staging y obtener los datos OAuth requeridos.
- [x] EVT-T05B Comprobar envío manual desde `eventos@tecplayacar.edu.mx` hacia Omar y generar contraseña de aplicación.
- [x] EVT-T05C Configurar presupuesto informativo de `100 MXN` con avisos al primer gasto y a `50`, `80` y `100 MXN`.
- [x] EVT-T06 Autorizar expresamente código de Eventos y reservaciones el 29 de septiembre de 2026.

## No bloquea desarrollo local; requerido antes de aceptar staging

- [ ] EVT-T01F Completar aceptación funcional, accesible y visual de Coordinaciones.
- [ ] EVT-T01G Completar aceptación funcional, accesible y visual de Campus.
- [ ] EVT-T01H Completar aceptación funcional, accesible y visual del catálogo de Equipos.
- [x] EVT-T05D Conservar `GOOGLE_CALENDAR_CONFIG` y crear `SMTP_CONFIG` versión 2 con la estructura completa y `allowedRecipients` limitado exactamente a Omar; los valores sensibles no se imprimieron ni documentaron.
- [ ] EVT-T05E Verificar en staging la lista permitida vigente con una entrega a la coordinación recién autorizada y un rechazo fuera de las cuatro cuentas; la entrega a Omar y el cierre seguro de la lista anterior ya tienen evidencia.
- [ ] EVT-T05F Confirmar cuotas y ejecutar creación, actualización y cancelación reales de Calendar y las pruebas SMTP controladas.
- [x] EVT-T05G Actualizar de forma compatible Angular, Firebase Web, Firebase Admin y dependencias transitivas afectadas. `npm audit --omit=dev` y la auditoría completa reportan cero vulnerabilidades altas o críticas; 183 pruebas, lint, formato y ambos builds aprobaron. No se usó `--force` ni una rebaja mayor automática.
- [x] EVT-T05H Desplegar por separado índices/TTL, Firestore Rules, Storage Rules, 16 Functions de Eventos y Hosting en `eventos-tup-angular-stg`; producción no fue utilizada.
- [x] EVT-T05I Normalizar `GOOGLE_CALENDAR_CONFIG` versión 2, validar OAuth y el endpoint de eventos, redesplegar solo las siete callables consumidoras y reconciliar `PRUEBA 1` sin duplicar correo. Firestore y Google Calendar confirmaron la entrada sincronizada; el correo permaneció completo sin una entrega duplicada.
- [x] EVT-T05J Crear `SMTP_CONFIG` versión 3 con las cuatro cuentas autorizadas y verificar que las ocho Functions consumidoras estén `ACTIVE` y enlazadas a esa versión, sin exponer credenciales ni modificar producción.
- [x] EVT-T05K Sustituir en staging el calendario desechable por el calendario institucional compartido: OAuth `calendar.events` autorizado, lectura validada, `GOOGLE_CALENDAR_CONFIG` versión 3 `ENABLED` y siete Functions consumidoras `ACTIVE`. No se migraron eventos de prueba ni se modificó producción.
- [ ] EVT-T05L Crear un evento sintético nuevo desde la aplicación y comprobar una sola entrada en el calendario institucional, sin reconciliar IDs pertenecientes al calendario anterior.

## Documentación

- [x] EVT-T07 Actualizar reglas, modelo, seguridad, integraciones y arquitectura.
- [x] EVT-T08 Redefinir spec, pruebas y tareas de Eventos.
- [x] EVT-T09 Registrar ADR-006 y compatibilidad histórica.
- [x] EVT-T09A Registrar ADR-008, reglas temporales, cancelación histórica y FullCalendar Standard.
- [x] EVT-T09B Actualizar reglas, modelo, seguridad, integraciones, arquitectura, reservaciones, pruebas y trazabilidad con las decisiones del 28 de septiembre.
- [x] EVT-T09C Documentar configuración segura local/staging, recursos provisionados, allowlist SMTP y presupuesto el 29 de septiembre.
- [x] EVT-T09D Registrar ADR-009, controles por equipo, máximo 20 e índices declarativos.
- [x] EVT-T09E Registrar ADR-010 y cerrar búsqueda, mutaciones, logística, workers, limpieza, históricos y secuencia de staging.
- [x] EVT-T10 Aceptar contratos y wireframes antes de implementar.

## Backend

- [x] EVT-T11 Implementar validadores y modelo canónico para creación.
- [x] EVT-T12 Implementar creación backend con identidad canónica.
- [x] EVT-T13 Validar y fotografiar coordinaciones activas al crear.
- [x] EVT-T14 Marcar `utilizada` de forma transaccional al crear.
- [x] EVT-T15 Implementar revisión de notificaciones.
- [x] EVT-T16 Implementar edición comparando estado previo y objetivo.
- [x] EVT-T17 Implementar retiro de coordinaciones.
- [x] EVT-T18 Implementar cancelación histórica idempotente y su fotografía.
- [x] EVT-T19 Implementar compatibilidad con eventos históricos.
- [x] EVT-T19A Implementar campus y fotografía histórica al crear.
- [x] EVT-T19B Implementar reserva atómica y fotografías de equipos al crear.
- [x] EVT-T19C Implementar edición, cancelación y logística de reservas.
- [x] EVT-T19D Calcular `inicioAt`, `finAt`, anticipación y máximo multidiario con hora backend en `America/Cancun`.
- [x] EVT-T19E Derivar estado temporal sin cron y persistir cancelación histórica de solo lectura.
- [x] EVT-T19F Implementar consulta sanitizada por intervalo visible con límite de 42 fechas.
- [x] EVT-T19G Implementar `getEventDetail`, estados públicos de integración y términos de búsqueda derivados.
- [x] EVT-T19H Implementar backfill administrativo con modo seco y reanudación; no ejecutarlo en producción.

## Calendar futuro

- [x] EVT-T20 Crear y reconciliar Calendar sin asistentes.
- [x] EVT-T21 Actualizar Calendar al editar.
- [x] EVT-T22 Retirar Calendar durante cancelación de forma idempotente.
- [x] EVT-T23 Probar zona horaria y recreación ante 404/410 con dobles locales.

## Notificaciones futuras

- [x] EVT-T24 Implementar `notificacionesEventos` protegida.
- [x] EVT-T25 Implementar claves idempotentes y deduplicación global.
- [x] EVT-T26 Implementar trabajos de creación y actualización.
- [x] EVT-T27 Implementar retiro y cancelación.
- [x] EVT-T28 Implementar worker SMTP con reclamación exclusiva.
- [x] EVT-T29 Implementar reintentos y agotamiento aprobados.
- [x] EVT-T30 Implementar sanitización, privacidad y purga aprobada.
- [x] EVT-T30A Implementar lease SMTP de 10 minutos, lote 50, worker cada 5 minutos y estados agregados del evento.
- [x] EVT-T30B Verificar en staging la política TTL de `notificacionesEventos.fechaExpiracion`; el 30 de septiembre de 2026 quedó en estado administrado `ACTIVE` y los siete índices compuestos quedaron `READY`.
- [x] EVT-T30D Corregir y verificar en staging el índice de disponibilidad con `bloqueoFin` antes de `bloqueoInicio`; quedó `READY`, la consulta remota aprobó y el índice anterior fue retirado el 1 de octubre de 2026.
- [x] EVT-T30E Corregir en staging los índices de calendario con `finAt` antes de `inicioAt`; ambos quedaron `READY`, las consultas remotas general y por campus aprobaron sin `FAILED_PRECONDITION` y se retiraron los dos índices anteriores. No se desplegaron Functions, Rules, Hosting ni producción.
- [x] EVT-T30C Implementar avisos logísticos idempotentes a la coordinación canónica de Sistemas sin alterar la revisión funcional del evento.
- [x] EVT-T30G Implementar y desplegar en staging el correo HTML institucional con texto alternativo, fotografía ampliada, resumen seguro de cambios, escape de contenido y pruebas EVT-109. El 2 de octubre de 2026 aprobaron 75 pruebas unitarias de Functions, 14 pruebas de Eventos con Firestore Emulator, lint, guardia visual, formato y build de Functions; se actualizaron exclusivamente las ocho Functions consumidoras de SMTP en staging. No se modificaron frontend, Hosting, Rules, índices, secretos, datos ni producción.
- [x] EVT-T30H Implementar la autorización SMTP dinámica para contactos institucionales cuya procedencia `coordinacion` o `sistemas` esté fotografiada en la bandeja protegida, conservando la lista fija para creadores y bloqueando correos libres, externos o sin ID canónico. El 3 de octubre de 2026 aprobaron EVT-110, 78 pruebas unitarias de Functions, 14 pruebas de Eventos con Firestore Emulator, lint, guardia visual, formato y build de Functions; después se actualizaron únicamente las ocho Functions consumidoras en staging y Firebase confirmó las ocho operaciones. No se modificaron Hosting, Rules, índices, secretos, datos ni producción. La aceptación real positiva y negativa continúa pendiente.

## Storage

- [x] EVT-T31 Validar y cargar el PDF inicial.
- [x] EVT-T32 Reemplazar PDF conforme a política aprobada.
- [x] EVT-T33 Eliminar PDF de forma idempotente.
- [x] EVT-T33A Implementar limpieza diaria de huérfanos a las 04:00, lote máximo 1000 y reconciliación al excederlo.
- [x] EVT-T34 Probar Rules, bucket y rutas permitidas para la creación.

## Angular

- [x] EVT-T35 Crear modelos, gateways y facade.
- [x] EVT-T36 Habilitar rutas lazy `/eventos` y `/eventos/calendario` para autorizados.
- [x] EVT-T37 Completar listado, búsqueda global y paginación ligada al término.
- [x] EVT-T38 Completar formulario reutilizable y propiedad de solo lectura.
- [x] EVT-T39 Crear selector múltiple sanitizado y opcional.
- [x] EVT-T39A Crear selector dinámico de Equipos con disponibilidad por intervalo.
- [x] EVT-T40 Crear carga y reemplazo de PDF.
- [x] EVT-T41 Crear detalle inicial con fotografías de coordinaciones, campus y equipos.
- [x] EVT-T42 Crear edición y cancelación histórica por propietario.
- [x] EVT-T43 Crear estados completos y parciales de integraciones.
- [ ] EVT-T44 Completar accesibilidad y responsive. Las validaciones automatizadas pasan; falta aceptación manual con teclado, lector y tamaños objetivo.
- [x] EVT-T44A Incorporar FullCalendar Standard `7.1.0`, licencia MIT y sin Premium.
- [x] EVT-T44B Crear vistas mes, semana, día y lista; priorizar lista en móvil.
- [x] EVT-T44C Implementar consulta por rango, filtros de campus/estado y apertura del detalle.
- [x] EVT-T44D Mantener calendario de solo lectura, sin selección para crear, arrastre o redimensionado.
- [ ] EVT-T44E Completar nombres accesibles. La actualización automática al cruzar inicio y fin usando `serverNow` ya está implementada y probada.
- [x] EVT-T44F Crear sección logística en detalle y acciones exclusivas de `admin` con confirmaciones y anuncios accesibles.
- [x] EVT-T44G Corregir la previsualización de disponibilidad al editar para excluir solo las reservas del evento propio, con validación backend de propiedad y regresión Angular/Functions/Emulator; `checkEventAvailability` y Hosting quedaron desplegados por separado únicamente a staging el 1 de octubre de 2026.
- [x] EVT-T44H Actualizar automáticamente la disponibilidad del formulario abierto al recuperar foco/visibilidad y cada 30 segundos visibles, preservando la captura, anunciando cambios y evitando consultas solapadas. Implementado, validado y publicado únicamente en Hosting de staging el 1 de octubre de 2026; aceptación manual pendiente.
- [x] EVT-T44I Llevar `Editar evento` y `Cancelar evento` a las acciones directas del listado para el propietario, conservar `Ver detalle` para todos y restringir la columna `Integración` al rol canónico `admin`, con equivalencia móvil, tooltips y pruebas de renderizado. Implementado, validado y publicado únicamente en Hosting de staging el 2 de octubre de 2026; aceptación autenticada por rol pendiente.
- [x] EVT-T44J Normalizar la composición visual del listado de Eventos con las primitivas, encabezado de listado, acciones móviles, alcance de columnas y tooltips compartidos, conservando como única extensión el selector `Listado`/`Calendario`. Implementado, validado y publicado únicamente en Hosting de staging el 2 de octubre de 2026; aceptación visual autenticada y responsive pendiente.
- [x] EVT-T44K Corregir la proyección multidiaria de FullCalendar para cubrir todas las fechas ocupadas y mejorar la presentación de cuadrícula, bloques, leyenda, controles, acumulación por día, foco y responsive conforme a EVT-106. Implementado, validado y publicado únicamente en Hosting de staging el 2 de octubre de 2026; aceptación visual autenticada pendiente.
- [x] EVT-T44L Corregir la integración visual de FullCalendar 7 mediante la paleta Classic y propiedades públicas, eliminar dependencias de selectores internos v6 y validar franjas, estados y panel de acumulación conforme a EVT-107. Implementado, validado y publicado únicamente en Hosting de staging el 2 de octubre de 2026; backend y producción no fueron modificados.

## Pruebas y cierre futuro

- [ ] EVT-T45 Ejecutar EVT-001 a EVT-106.
- [x] EVT-T46 Ejecutar unitarias, integración, Rules y concurrencia del incremento implementado.
- [x] EVT-T47 Ejecutar dobles de Calendar y SMTP.
- [x] EVT-T48 Ejecutar lint, formato, builds y comprobar el presupuesto ya configurado.
- [ ] EVT-T49 Validar en staging con cuentas, calendario y buzones sintéticos.
- [ ] EVT-T50 Obtener aceptación funcional y visual.
- [x] EVT-T51 Confirmar que producción no fue utilizada ni modificada en este incremento.

## Secuencia de secretos

- Durante desarrollo local, implementar contratos y pruebas con dobles; no se requieren credenciales reales.
- Si se necesita una prueba local real, usar `functions/.secret.local` ignorado por Git y `functions/.env.local` únicamente para valores no sensibles.
- Cargar secretos reales en Secret Manager solo después de que las Functions estén implementadas y probadas localmente, inmediatamente antes del primer despliegue funcional a staging.
- Nunca copiar secretos a Angular, documentación, tickets, consola o commits.
