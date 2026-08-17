# Decisiones y pendientes

## Decisiones resueltas

| Tema | Decisión | Referencia |
| --- | --- | --- |
| Autorización backend | Firestore canónico + Custom Claims sincronizados por Functions | `decisiones/ADR-001-autorizacion-firebase.md` |
| Integración Firebase | Firebase Web SDK modular, sin AngularFire inicialmente | `decisiones/ADR-002-sdk-firebase.md` |
| Estado Angular | Signals + RxJS, sin NgRx inicialmente | `decisiones/ADR-003-estado-angular.md` |
| UI | Angular Material/CDK + tema institucional propio | `decisiones/ADR-004-libreria-visual.md` |

## Pendientes antes de integración real

- Confirmar o crear el proyecto Firebase de staging.
- Definir dominio institucional de pruebas sin publicar su valor aquí.
- Definir cuentas de prueba para `admin`, `usuario`, inactivo y no autorizado.
- Confirmar calendario y buzón SMTP exclusivos de staging.
- Inventariar índices Firestore existentes.
- Confirmar límites y cuotas aplicables del proyecto Firebase.

## Pendientes antes de Usuarios

- Especificar las callables administrativas y sus contratos finales.
- Definir atomicidad, reintento o reconciliación cuando Firestore se actualice pero falle la escritura de claims.
- Implementar y probar revocación de refresh tokens al desactivar un usuario.
- Crear pruebas de Security Rules para operaciones administrativas por rol.

## Pendientes antes de Eventos

- Decidir la política de reintento de Calendar y correo.
- Decidir la limpieza del PDF anterior al reemplazarlo.
- Verificar comportamiento con eventos históricos incompletos.
- Revisar estrategia de paginación según volumen real.

## Pendientes no bloqueantes para Autenticación local

- Seleccionar archivos finales de logotipo e iconografía.
- Confirmar familia tipográfica institucional licenciada.
- Aprobar visualmente el Login y la vista temporal antes de desplegar a staging.

## Estado para iniciar

No existen decisiones documentales bloqueantes para crear la base Angular e implementar Autenticación con emuladores. Los valores y cuentas de staging serán obligatorios antes de validar integración real.
