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
7. Autorizar e implementar Eventos.
8. Autorizar e implementar Dashboard.
9. Ejecutar regresión integral.
10. Publicar en staging/preview.
11. Ejecutar corte productivo con reversión.

## Continuidad

- No modificar colecciones o campos durante la migración inicial.
- No mover o eliminar PDFs existentes.
- No cambiar IDs de Calendar.
- No cambiar roles.
- Mantener contratos de eventos salvo spec aprobada.
- Conservar Vue desplegable hasta aceptación final.

## Corrección de seguridad aprobada

Se permite agregar el bootstrap de autorización, claims mínimos y reglas basadas en claims conforme a ADR-001. Este cambio no modifica el modelo Firestore canónico.

## Entornos

- Local: emuladores y datos sintéticos.
- Staging: OAuth, claims, Calendar, SMTP y aceptación.
- Producción: solo después de pruebas y aprobación.

## Reversión

Conservar build y configuración Hosting de Vue. Si Angular presenta un fallo crítico, restaurar Vue sin revertir datos.

## Fuera de alcance

- Nuevas funciones de negocio.
- Migración de esquema.
- Nuevos roles.
- Rediseño del backend de eventos no especificado.
