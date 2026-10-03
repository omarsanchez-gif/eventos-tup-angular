# Tareas: Coordinaciones

## Estado

Implementación y despliegue exclusivo a staging autorizados el 19 de agosto de 2026. Las seis callables y Firestore Rules están desplegadas; Hosting y producción permanecen fuera de alcance.

## Decisiones previas

- [x] COO-T01 Aprobar administración exclusiva de admin.
- [x] COO-T02 Aprobar varios correos institucionales por coordinación.
- [x] COO-T03 Aprobar suspensión con conservación histórica.
- [x] COO-T04 Aprobar eliminación solo antes del primer uso.
- [x] COO-T05 Aprobar catálogo sanitizado para Eventos.
- [x] COO-T06 Aprobar máximo de 10 correos por coordinación y ausencia de límite funcional de selección por evento.
- [x] COO-T43 Aprobar capacidad técnica máxima del catálogo administrativo en 500 coordinaciones.

## Documentación

- [x] COO-T07 Actualizar contexto, reglas, modelo, seguridad, integraciones y arquitectura.
- [x] COO-T08 Crear spec, pruebas y tareas de Coordinaciones.
- [x] COO-T09 Redefinir Eventos y ADR-006 sin implementar código.
- [x] COO-T10 Revisar y aceptar documentalmente los contratos backend.

## Backend futuro

- [x] COO-T11 Implementar modelo y validadores estrictos.
- [x] COO-T12 Implementar unicidad concurrente de nombre normalizado.
- [x] COO-T13 Implementar `listCoordinations` para admin.
- [x] COO-T14 Implementar `listSelectableCoordinations` sanitizado.
- [x] COO-T15 Implementar alta idempotente y campos de servidor.
- [x] COO-T16 Implementar edición y correos canónicos.
- [x] COO-T17 Implementar activación/suspensión por estado objetivo.
- [x] COO-T18 Implementar eliminación condicionada a `utilizada`.
- [x] COO-T19 Implementar transición permanente a `utilizada: true` desde la creación de Eventos.
- [x] COO-T20 Sanitizar errores y logs.

## Seguridad futura

- [x] COO-T21 Actualizar Firestore Rules sin exponer correos.
- [x] COO-T22 Revalidar claims y perfil canónico admin en mutaciones.
- [x] COO-T23 Probar lectura completa, catálogo sanitizado y escrituras directas.
- [ ] COO-T24 Probar carrera entre uso y eliminación.

## Angular futuro

- [x] COO-T25 Crear modelos, gateway y facade desacoplados.
- [x] COO-T26 Crear ruta lazy `/coordinaciones` con guards.
- [x] COO-T27 Agregar navegación solo para admin.
- [x] COO-T28 Crear listado, búsqueda en tiempo real y paginación.
- [x] COO-T29 Crear formulario con lista dinámica de correos.
- [x] COO-T30 Crear edición, activación, suspensión y eliminación.
- [x] COO-T31 Implementar estados loading, vacío, error y éxito.
- [x] COO-T32 Implementar explicación de eliminación bloqueada.
- [x] COO-T33 Completar responsive y accesibilidad en código; revisión manual pendiente.

## Pruebas futuras

- [ ] COO-T34 Ejecutar COO-001 a COO-034.
- [x] COO-T35 Ejecutar unitarias Angular y Functions.
- [x] COO-T36 Ejecutar integración Firestore Emulator con perfiles canónicos sintéticos.
- [ ] COO-T37 Ejecutar Rules y pruebas de concurrencia.
- [x] COO-T38 Ejecutar lint, formato y build de staging dentro del presupuesto.
- [ ] COO-T39 Validar manualmente en staging con datos sintéticos.

## Cierre futuro

- [ ] COO-T40 Obtener aceptación funcional y visual.
- [x] COO-T41 Autorizar explícitamente el inicio de Eventos el 29 de septiembre de 2026.
- [x] COO-T42 Confirmar que producción no fue utilizada ni modificada.
- [x] COO-T44 Desplegar las seis callables de Coordinaciones únicamente a staging con alcance explícito.
- [x] COO-T45 Desplegar Firestore Rules a staging en una operación separada después de aprobar sus pruebas.
- [x] COO-T46 Verificar las Functions remotas y el rechazo de una llamada sin autenticación.
