# Spec de migración

## Objetivo

Reemplazar Vue por Angular sin perder funcionalidad, datos, archivos, integraciones o capacidad de reversión.

## Fases

1. Aprobar documentación y ADRs.
2. Crear base Angular y ambiente local.
3. Implementar bootstrap seguro y Autenticación.
4. Validar Auth con emuladores y staging.
5. Autorizar e implementar Layout.
6. Autorizar e implementar Usuarios.
7. Aprobar e implementar Coordinaciones.
8. Aprobar infraestructura protegida de notificaciones.
9. Autorizar e implementar Eventos.
10. Implementar Dashboard conforme a la autorización del 3 de octubre de 2026.
11. Ejecutar regresión integral.
12. Publicar en staging/preview.
13. Ejecutar corte productivo con reversión.

## Continuidad

- No modificar colecciones o campos salvo los cambios explícitos y aprobados de Coordinaciones, Eventos y `notificacionesEventos`.
- No mover o eliminar PDFs existentes.
- No cambiar IDs de Calendar.
- No cambiar roles.
- Mantener contratos de eventos salvo spec aprobada.
- Conservar Vue desplegable hasta aceptación final.

## Compatibilidad del cambio de Coordinaciones

- Eventos históricos sin `coordinacionIds`, `coordinacionesInvolucradas` o `revisionNotificacion` se leen como arrays vacíos y revisión cero.
- No se agregan coordinaciones retrospectivamente.
- Los correos históricos al creador no se recrean en la bandeja de salida.
- `utilizada` se establece únicamente a partir de eventos creados o editados por el nuevo contrato; cualquier backfill futuro requiere plan, prueba y autorización separados.
- Vue debe seguir leyendo eventos con campos adicionales sin perder los campos históricos antes de cualquier despliegue productivo.
- La paginación nueva consulta 25 eventos por cursor y debe conservar el orden determinista de los registros históricos.
- Los PDFs existentes no se consideran huérfanos; la limpieza de 24 horas solo actúa sobre cargas temporales o nuevas sin referencia canónica comprobada.

## Compatibilidad temporal y de calendario

- Eventos históricos con fecha y hora completas pueden derivar `inicioAt`, `finAt` y estado en lectura; no se realiza backfill implícito.
- Si un histórico tiene datos temporales incompletos, se conserva la presentación compatible de `estatus` y se marca para revisión.
- Los nuevos campos `inicioAt`, `finAt`, `fechaCancelacion` y `canceladoPorUid` son aditivos y deben comprobarse contra la lectura de Vue antes de cualquier despliegue productivo.
- El flujo Angular nuevo conserva eventos cancelados como históricos de solo lectura; la convivencia con Vue debe impedir que la aplicación anterior los reactive, edite o trate como eventos vigentes.
- FullCalendar consulta Firestore mediante el contrato Angular y no modifica IDs ni usa Google Calendar como fuente de migración.

## Corrección de seguridad aprobada

Se permite agregar el bootstrap de autorización, claims mínimos y reglas basadas en claims conforme a ADR-001. Este cambio no modifica el modelo Firestore canónico.

## Entornos

- Local: emuladores y datos sintéticos.
- Staging: OAuth, claims, Calendar, SMTP y aceptación.
- Producción: solo después de pruebas y aprobación.

## Reversión

Conservar build y configuración Hosting de Vue. Si Angular presenta un fallo crítico, restaurar Vue sin revertir datos.

## Fuera de alcance

- Nuevos roles.
- Backfill productivo implícito.
- Agregar contactos como asistentes de Calendar.
- Cualquier función de negocio distinta de Coordinaciones y notificaciones aprobadas en ADR-006.
