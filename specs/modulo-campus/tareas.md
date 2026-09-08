# Tareas: Campus

## Estado

Implementado, validado y desplegado únicamente a staging el 21 de agosto de 2026. La validación manual, normalización visual y aceptación permanecen pendientes; producción no está autorizada.

## Documentación

- [x] CAM-T01 Aprobar Campus como prerrequisito de Equipos y Eventos.
- [x] CAM-T02 Aprobar nombres y claves TUP/FCS.
- [x] CAM-T03 Aprobar dirección y referencia opcionales.
- [x] CAM-T04 Aprobar horarios semanales y domingo inactivo.
- [x] CAM-T05 Aprobar nombres y direcciones históricas para Eventos futuros.
- [x] CAM-T06 Crear spec, pruebas, tareas y ADR-007.
- [x] CAM-T07 Actualizar modelo, reglas, seguridad, arquitectura y trazabilidad.

## Backend

- [x] CAM-T08 Crear modelo y validadores estrictos.
- [x] CAM-T09 Implementar catálogo administrativo y sanitizado.
- [x] CAM-T10 Implementar altas concurrentes con nombre y clave únicos.
- [x] CAM-T11 Implementar edición y clave inmutable después del uso.
- [x] CAM-T12 Implementar estado idempotente y eliminación condicionada.
- [x] CAM-T13 Sanitizar errores y logs.

## Angular

- [x] CAM-T14 Crear modelos, gateway y facade.
- [x] CAM-T15 Crear ruta lazy `/campus` con guards.
- [x] CAM-T16 Agregar navegación solo para admin.
- [x] CAM-T17 Crear listado, búsqueda en tiempo real y paginación.
- [x] CAM-T18 Crear formulario de datos y horarios semanales.
- [x] CAM-T19 Crear edición, activación, suspensión y eliminación.
- [x] CAM-T20 Completar estados, accesibilidad y responsive.

## Seguridad y pruebas

- [x] CAM-T21 Actualizar y probar Firestore Rules.
- [x] CAM-T22 Ejecutar unitarias Angular y Functions.
- [x] CAM-T23 Ejecutar integración con Firestore Emulator.
- [x] CAM-T24 Ejecutar lint, formato y build de staging.
- [ ] CAM-T25 Validar manualmente con datos sintéticos.

## Cierre

- [ ] CAM-T26 Obtener aceptación funcional y visual.
- [x] CAM-T27 Autorizar y completar despliegue separado en staging.
- [x] CAM-T28 Confirmar que producción no fue utilizada.

## Normalización visual pendiente

- [x] CAM-T29 Documentar la auditoría de divergencias respecto al sistema de diseño global.
- [x] CAM-T30 Retirar del SCSS de Campus las redefiniciones de botones, icon-buttons, colores, tamaños, radios y estados compartidos.
- [ ] CAM-T31 Comparar Campus con Usuarios, Coordinaciones y Equipos en escritorio, tableta y 320 px, incluido teclado y foco visible.
- [x] CAM-T32 Ejecutar lint visual, suite completa y build de staging después de normalizar.

## Evidencia del incremento local

- Suite Angular: 46 pruebas aprobadas; incluye pantalla, búsqueda en vivo, navegación y facade de Campus.
- Suite de Functions: 41 pruebas aprobadas; incluye validación estricta y contratos de Campus.
- Integración Campus: 6 pruebas aprobadas con Firestore Emulator, incluida unicidad concurrente.
- Rules: 12 pruebas aprobadas; los clientes no escriben `campus` directamente y solo `admin` lee documentos completos.
- Suite completa `npm run test:all`: aprobada sin desplegar servicios.
- Lint Angular/Functions, Prettier y build de staging aprobados.
- Bundle medido: 467.09 kB iniciales y `campuses-page` diferido de 33.06 kB.
- Staging: seis Functions en `us-central1`, Firestore Rules y Hosting publicados el 21 de agosto de 2026.
- Verificación remota: Hosting `200`, seis Functions listadas y callable anónima rechazada con `401`.
- Guardia automática: `npm run lint:visual` aprobada sin selectores compartidos duplicados ni colores institucionales obsoletos.
- Verificación posterior: 51 pruebas Angular, 51 de Functions, 7 de Usuarios, 8 de Coordinaciones, 6 de Campus, 7 de Equipos y 14 de Rules aprobadas.
- Build de staging aprobado con `campuses-page` diferido de 34.17 kB.
- Pendientes reales: CAM-T25 validación manual autenticada, CAM-T26 aceptación funcional/visual y CAM-T31 verificación transversal.
