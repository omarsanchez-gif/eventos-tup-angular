# Tareas: Equipos

## Estado

Incremento A del catálogo implementado, validado automáticamente y desplegado únicamente a staging el 21 de agosto de 2026. El 30 de septiembre se implementó localmente la creación de reservaciones desde Eventos; prueba manual, operaciones logísticas posteriores, despliegue de Eventos y producción continúan pendientes.

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

- [x] EQP-T09 Capturar TUP/FCS con horarios canónicos en staging; aceptación visual integral continúa en EQP-T23.
- [x] EQP-T10 Confirmar el inventario utilizable inicial: equipo transferible parte de TUP hacia FCS conforme a los registros aprobados.
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

## Reservaciones autorizadas

- [x] RES-T01 Resolver eventos de varios días: máximo seis fechas operativas, un campus y bloqueo nocturno continuo.
- [x] RES-T02 Aprobar estrategia transaccional e índices Firestore mediante ADR-009.
- [x] RES-T03 Aprobar configuración logística protegida; resolver el ID real de Sistemas antes de notificaciones de staging.
- [x] RES-T03A Documentar cinco fechas naturales de anticipación y restricciones posteriores al límite.
- [x] RES-T04 Implementar disponibilidad y reserva atómica para creación.
- [ ] RES-T05 Implementar cobertura, recepción, demora y revisión.
- [ ] RES-T05A Implementar `motivosRevision` y las tres callables administrativas de ADR-010 dentro del detalle de Eventos.
- [ ] RES-T06 Integrar Eventos y notificaciones a Sistemas.
- [ ] RES-T07 Validar concurrencia, horarios, anticipación, multidiarios y traslados en emuladores. Concurrencia inicial, todos-o-ninguno, controles, anticipación y cálculos unitarios ya tienen evidencia; falta la matriz completa.

## Despliegue

- [ ] EQP-T23 Obtener aceptación funcional y visual del catálogo.
- [x] EQP-T24 Autorizar y desplegar por separado Functions, Rules y Hosting de staging.
- [x] EQP-T25 Confirmar que producción no fue utilizada.

## Normalización visual pendiente

- [x] EQP-T26 Documentar la auditoría de divergencias respecto al sistema de diseño global.
- [x] EQP-T27 Retirar del SCSS de Equipos las redefiniciones de botones, icon-buttons, colores, tamaños, radios y estados compartidos.
- [ ] EQP-T28 Comparar Equipos con Usuarios, Coordinaciones y Campus en escritorio, tableta y 320 px, incluido teclado y foco visible.
- [ ] EQP-T29 Publicar la corrección en staging únicamente después de pruebas, aceptación y autorización expresa.
- [x] EQP-T30 Ejecutar lint visual, suite completa y build de staging después de normalizar.

## Evidencia de normalización

- `npm run lint:visual` aprobado sin selectores compartidos duplicados ni colores institucionales obsoletos.
- Suite completa aprobada: 51 pruebas Angular, 51 de Functions, 7 de Usuarios, 8 de Coordinaciones, 6 de Campus, 7 de Equipos y 14 de Rules.
- Build de staging aprobado con bundle inicial de 468.25 kB y `equipment-page` diferido de 34.77 kB.
- No se modificaron Eventos, reservaciones, Functions, Rules ni datos; la corrección visual aún no fue desplegada.
