# Tareas: Eventos

## Estado

Plan documental. No iniciar hasta aceptar Coordinaciones, Campus, catálogo de Equipos, reservaciones y decisiones pendientes.

## Bloqueos previos

- [ ] EVT-T01 Implementar y aceptar `modulo-coordinaciones`.
- [ ] EVT-T01A Aceptar Campus con TUP/FCS capturados.
- [ ] EVT-T01B Implementar y aceptar el catálogo de Equipos.
- [ ] EVT-T01C Resolver eventos de varios días y aprobar reservaciones de Equipos.
- [x] EVT-T02 Aprobar máximo de 10 correos por coordinación y selección sin límite funcional.
- [x] EVT-T03 Aprobar tres reintentos y retención de 90 días.
- [x] EVT-T04 Aprobar limpieza posterior del PDF reemplazado y purga de huérfanos después de 24 horas.
- [ ] EVT-T05 Provisionar y verificar Calendar, SMTP y lista permitida exclusivos de staging.
- [ ] EVT-T06 Autorizar expresamente código de Eventos.

## Documentación

- [x] EVT-T07 Actualizar reglas, modelo, seguridad, integraciones y arquitectura.
- [x] EVT-T08 Redefinir spec, pruebas y tareas de Eventos.
- [x] EVT-T09 Registrar ADR-006 y compatibilidad histórica.
- [ ] EVT-T10 Aceptar contratos y wireframes antes de implementar.

## Backend futuro

- [ ] EVT-T11 Implementar validadores y modelo canónico.
- [ ] EVT-T12 Implementar creación backend con identidad canónica.
- [ ] EVT-T13 Validar y fotografiar coordinaciones activas.
- [ ] EVT-T14 Marcar `utilizada` de forma transaccional.
- [ ] EVT-T15 Implementar revisión de notificaciones.
- [ ] EVT-T16 Implementar edición comparando estado previo y objetivo.
- [ ] EVT-T17 Implementar retiro de coordinaciones.
- [ ] EVT-T18 Implementar eliminación idempotente y fotografía de cancelación.
- [ ] EVT-T19 Implementar compatibilidad con eventos históricos.
- [ ] EVT-T19A Implementar campus y fotografía histórica.
- [ ] EVT-T19B Implementar reserva atómica y fotografías de equipos.
- [ ] EVT-T19C Implementar edición, cancelación y logística de reservas.

## Calendar futuro

- [ ] EVT-T20 Crear y reconciliar Calendar sin asistentes.
- [ ] EVT-T21 Actualizar Calendar al editar.
- [ ] EVT-T22 Eliminar Calendar de forma idempotente.
- [ ] EVT-T23 Probar zona horaria y recreación ante 404/410.

## Notificaciones futuras

- [ ] EVT-T24 Implementar `notificacionesEventos` protegida.
- [ ] EVT-T25 Implementar claves idempotentes y deduplicación global.
- [ ] EVT-T26 Implementar trabajos de creación y actualización.
- [ ] EVT-T27 Implementar retiro y cancelación.
- [ ] EVT-T28 Implementar worker SMTP con reclamación exclusiva.
- [ ] EVT-T29 Implementar reintentos y agotamiento aprobados.
- [ ] EVT-T30 Implementar sanitización, privacidad y purga aprobada.

## Storage futuro

- [ ] EVT-T31 Validar y cargar PDF.
- [ ] EVT-T32 Reemplazar PDF conforme a política aprobada.
- [ ] EVT-T33 Eliminar PDF de forma idempotente.
- [ ] EVT-T34 Probar Rules y rutas permitidas.

## Angular futuro

- [ ] EVT-T35 Crear modelos, gateways y facade.
- [ ] EVT-T36 Habilitar ruta lazy `/eventos` para autorizados.
- [ ] EVT-T37 Crear listado, búsqueda y paginación.
- [ ] EVT-T38 Crear formulario y propiedad de solo lectura.
- [ ] EVT-T39 Crear selector múltiple sanitizado y opcional.
- [ ] EVT-T39A Crear selector dinámico de Equipos con disponibilidad por intervalo.
- [ ] EVT-T40 Crear carga y reemplazo de PDF.
- [ ] EVT-T41 Crear detalle con fotografías de coordinaciones.
- [ ] EVT-T42 Crear edición y eliminación por propietario.
- [ ] EVT-T43 Crear estados completos y parciales de integraciones.
- [ ] EVT-T44 Completar accesibilidad y responsive.

## Pruebas y cierre futuro

- [ ] EVT-T45 Ejecutar EVT-001 a EVT-060.
- [ ] EVT-T46 Ejecutar unitarias, integración, Rules y concurrencia.
- [ ] EVT-T47 Ejecutar dobles de Calendar y SMTP.
- [ ] EVT-T48 Ejecutar lint, formato, builds y presupuesto.
- [ ] EVT-T49 Validar en staging con cuentas, calendario y buzones sintéticos.
- [ ] EVT-T50 Obtener aceptación funcional y visual.
- [ ] EVT-T51 Confirmar que producción no fue utilizada ni modificada.
