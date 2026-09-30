# Tareas: Eventos

## Estado

Plan actualizado el 30 de septiembre de 2026. La autorización de código ya fue recibida y el incremento local de creación, disponibilidad, consultas, carga inicial de PDF y experiencia Angular está implementado y verificado. Edición, cancelación, reconciliación de integraciones, reemplazo o limpieza de PDFs y aceptación manual continúan pendientes. No existe despliegue de Eventos a staging ni autorización de producción.

## Evidencia del incremento local — 30 de septiembre de 2026

- Callables locales `checkEventAvailability`, `createEvent`, `listEvents` y `listCalendarEvents` con identidad y perfil canónicos.
- Validación de cinco fechas naturales, máximo seis fechas, prohibición de domingo y zona `America/Cancun`.
- Creación transaccional de evento, reservaciones, controles monotónicos y marcas de uso.
- Disponibilidad calculada desde reservas superpuestas; máximo de 20 tipos y confirmación de todos o ninguno.
- Cálculo de montaje local, salida previa, regreso, margen de liberación y cobertura de Sistemas.
- `firestore.indexes.json` y Rules locales que bloquean escritura directa y colecciones protegidas.
- Rutas lazy `/eventos` y `/eventos/calendario`, facade, listado paginado, formulario de alta, detalle y calendario FullCalendar Standard `7.1.0` implementados localmente.
- El formulario carga el protocolo PDF en la ruta aprobada y la Function comprueba bucket, ruta, tipo y tamaño antes de confirmar el evento.
- 57 pruebas Angular, 66 pruebas unitarias de Functions, 48 pruebas de emuladores y Rules, lint, formato y build de staging aprobados localmente.

## Preparación del siguiente incremento

ADR-010 deja resueltos búsqueda global, detalle, edición, cancelación, estados de integración, logística administrativa, worker SMTP, limpieza y compatibilidad histórica. La siguiente sesión debe comenzar por implementación en el orden ADR-010. No requiere nuevas decisiones salvo que aparezca una contradicción con datos reales; despliegue, backfill productivo y producción siguen necesitando autorización independiente.

## Bloqueos previos

- [x] EVT-T01 Implementar y desplegar `modulo-coordinaciones` a staging.
- [x] EVT-T01A Capturar TUP/FCS con horarios canónicos en Campus.
- [x] EVT-T01B Implementar, desplegar y capturar el catálogo inicial de Equipos.
- [x] EVT-T01C Resolver eventos de varios días, anticipación y permanencia nocturna de equipos.
- [x] EVT-T01D Aprobar estrategia transaccional e índices Firestore de reservaciones y calendario mediante ADR-009.
- [ ] EVT-T01E Resolver el ID canónico de la Coordinación de Sistemas ya creada y validar destinatarios controlados de staging.
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
- [ ] EVT-T05D Cargar `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` en Secret Manager antes del primer despliegue funcional de integraciones.
- [ ] EVT-T05E Implementar y verificar la lista permitida de staging, limitada a `omar.sanchez@tecplayacar.edu.mx`.
- [ ] EVT-T05F Confirmar cuotas y ejecutar creación, actualización y cancelación reales de Calendar y las pruebas SMTP controladas.

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
- [ ] EVT-T15 Implementar revisión de notificaciones.
- [ ] EVT-T16 Implementar edición comparando estado previo y objetivo.
- [ ] EVT-T17 Implementar retiro de coordinaciones.
- [ ] EVT-T18 Implementar cancelación histórica idempotente y su fotografía.
- [ ] EVT-T19 Implementar compatibilidad con eventos históricos.
- [x] EVT-T19A Implementar campus y fotografía histórica al crear.
- [x] EVT-T19B Implementar reserva atómica y fotografías de equipos al crear.
- [ ] EVT-T19C Implementar edición, cancelación y logística de reservas.
- [x] EVT-T19D Calcular `inicioAt`, `finAt`, anticipación y máximo multidiario con hora backend en `America/Cancun`.
- [ ] EVT-T19E Derivar estado temporal sin cron y persistir cancelación histórica de solo lectura.
- [x] EVT-T19F Implementar consulta sanitizada por intervalo visible con límite de 42 fechas.
- [ ] EVT-T19G Implementar `getEventDetail`, estados públicos de integración y términos de búsqueda derivados.
- [ ] EVT-T19H Implementar backfill administrativo con modo seco y reanudación; no ejecutarlo en producción.

## Calendar futuro

- [ ] EVT-T20 Crear y reconciliar Calendar sin asistentes.
- [ ] EVT-T21 Actualizar Calendar al editar.
- [ ] EVT-T22 Retirar Calendar durante cancelación de forma idempotente.
- [ ] EVT-T23 Probar zona horaria y recreación ante 404/410.

## Notificaciones futuras

- [ ] EVT-T24 Implementar `notificacionesEventos` protegida.
- [ ] EVT-T25 Implementar claves idempotentes y deduplicación global.
- [ ] EVT-T26 Implementar trabajos de creación y actualización.
- [ ] EVT-T27 Implementar retiro y cancelación.
- [ ] EVT-T28 Implementar worker SMTP con reclamación exclusiva.
- [ ] EVT-T29 Implementar reintentos y agotamiento aprobados.
- [ ] EVT-T30 Implementar sanitización, privacidad y purga aprobada.
- [ ] EVT-T30A Implementar lease SMTP de 10 minutos, lote 50, worker cada 5 minutos y estados agregados del evento.
- [ ] EVT-T30B Configurar y verificar TTL de Firestore sobre `notificacionesEventos.fechaExpiracion`.

## Storage

- [x] EVT-T31 Validar y cargar el PDF inicial.
- [ ] EVT-T32 Reemplazar PDF conforme a política aprobada.
- [ ] EVT-T33 Eliminar PDF de forma idempotente.
- [ ] EVT-T33A Implementar limpieza diaria de huérfanos a las 04:00, lote máximo 1000 y reconciliación al excederlo.
- [x] EVT-T34 Probar Rules, bucket y rutas permitidas para la creación.

## Angular

- [x] EVT-T35 Crear modelos, gateways y facade.
- [x] EVT-T36 Habilitar rutas lazy `/eventos` y `/eventos/calendario` para autorizados.
- [ ] EVT-T37 Completar listado, búsqueda y paginación. El listado y los cursores están implementados; la búsqueda actual filtra solo la página visible y falta llevarla al conjunto consultable completo.
- [ ] EVT-T38 Completar formulario y propiedad de solo lectura. El alta está implementada; falta reutilizar el contrato en edición.
- [x] EVT-T39 Crear selector múltiple sanitizado y opcional.
- [x] EVT-T39A Crear selector dinámico de Equipos con disponibilidad por intervalo.
- [ ] EVT-T40 Crear carga y reemplazo de PDF.
- [x] EVT-T41 Crear detalle inicial con fotografías de coordinaciones, campus y equipos.
- [ ] EVT-T42 Crear edición y cancelación histórica por propietario.
- [ ] EVT-T43 Crear estados completos y parciales de integraciones.
- [ ] EVT-T44 Completar accesibilidad y responsive. Las validaciones automatizadas pasan; falta aceptación manual con teclado, lector y tamaños objetivo.
- [x] EVT-T44A Incorporar FullCalendar Standard `7.1.0`, licencia MIT y sin Premium.
- [x] EVT-T44B Crear vistas mes, semana, día y lista; priorizar lista en móvil.
- [x] EVT-T44C Implementar consulta por rango, filtros de campus/estado y apertura del detalle.
- [x] EVT-T44D Mantener calendario de solo lectura, sin selección para crear, arrastre o redimensionado.
- [ ] EVT-T44E Completar nombres accesibles. La actualización automática al cruzar inicio y fin usando `serverNow` ya está implementada y probada.
- [ ] EVT-T44F Crear sección logística en detalle y acciones exclusivas de `admin` con confirmaciones y anuncios accesibles.

## Pruebas y cierre futuro

- [ ] EVT-T45 Ejecutar EVT-001 a EVT-102.
- [x] EVT-T46 Ejecutar unitarias, integración, Rules y concurrencia del incremento implementado.
- [ ] EVT-T47 Ejecutar dobles de Calendar y SMTP.
- [x] EVT-T48 Ejecutar lint, formato, builds y comprobar el presupuesto ya configurado.
- [ ] EVT-T49 Validar en staging con cuentas, calendario y buzones sintéticos.
- [ ] EVT-T50 Obtener aceptación funcional y visual.
- [x] EVT-T51 Confirmar que producción no fue utilizada ni modificada en este incremento.

## Secuencia de secretos

- Durante desarrollo local, implementar contratos y pruebas con dobles; no se requieren credenciales reales.
- Si se necesita una prueba local real, usar `functions/.secret.local` ignorado por Git y `functions/.env.local` únicamente para valores no sensibles.
- Cargar secretos reales en Secret Manager solo después de que las Functions estén implementadas y probadas localmente, inmediatamente antes del primer despliegue funcional a staging.
- Nunca copiar secretos a Angular, documentación, tickets, consola o commits.
