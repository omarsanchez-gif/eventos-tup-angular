# Tareas: Equipos

## Estado

Incremento A del catálogo implementado, validado automáticamente y desplegado únicamente a staging el 21 de agosto de 2026. La prueba manual y aceptación continúan pendientes; reservaciones, Eventos y producción no están autorizados.

## Documentación

- [x] EQP-T01 Separar catálogo de reservaciones y logística.
- [x] EQP-T02 Aprobar inventario agregado por nombre y campus.
- [x] EQP-T03 Aprobar clasificación fija/transferible y destinos explícitos.
- [x] EQP-T04 Incorporar corte, montaje, desmontaje, regreso y demora de ADR-007.
- [x] EQP-T05 Documentar cobertura y coordinación canónica de Sistemas.
- [x] EQP-T06 Documentar reducción operativa y `requiere_revision`.
- [x] EQP-T07 Crear spec, reservaciones, pruebas y tareas.
- [x] EQP-T08 Actualizar modelo, reglas, seguridad, arquitectura, diseño, Eventos y trazabilidad.

## Pendientes antes del código

- [ ] EQP-T09 Capturar y aceptar TUP/FCS en staging.
- [ ] EQP-T10 Confirmar inventario utilizable inicial por campus.
- [x] EQP-T11 Aprobar funcional y visualmente el wireframe.
- [x] EQP-T12 Autorizar expresamente el incremento A del catálogo.

## Implementación local del catálogo

- [x] EQP-T13 Crear modelo y validadores.
- [x] EQP-T14 Implementar repositorio transaccional y seis callables.
- [x] EQP-T15 Implementar Rules y pruebas de Rules.
- [x] EQP-T16 Crear gateway, facade y ruta lazy `/equipos`.
- [x] EQP-T17 Integrar navegación solo para `admin`.
- [x] EQP-T18 Crear listado, búsqueda, paginación y estados.
- [x] EQP-T19 Crear formulario y mutaciones administrativas.
- [x] EQP-T20 Ejecutar pruebas unitarias y Firestore Emulator.
- [x] EQP-T21 Ejecutar lint, formato y builds.
- [ ] EQP-T22 Validar manualmente en local con datos sintéticos.

## Reservaciones futuras — no autorizadas

- [ ] RES-T01 Resolver eventos de varios días.
- [ ] RES-T02 Aprobar estrategia transaccional e índices Firestore.
- [ ] RES-T03 Aprobar configuración logística protegida.
- [ ] RES-T04 Implementar disponibilidad y reserva atómica.
- [ ] RES-T05 Implementar cobertura, recepción, demora y revisión.
- [ ] RES-T06 Integrar Eventos y notificaciones a Sistemas.
- [ ] RES-T07 Validar concurrencia, horarios y traslados en emuladores.

## Despliegue

- [ ] EQP-T23 Obtener aceptación funcional y visual del catálogo.
- [x] EQP-T24 Autorizar y desplegar por separado Functions, Rules y Hosting de staging.
- [x] EQP-T25 Confirmar que producción no fue utilizada.
