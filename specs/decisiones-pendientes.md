# Decisiones y pendientes

## Decisiones resueltas

| Tema                 | Decisión                                                       | Referencia                                    |
| -------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| Autorización backend | Firestore canónico + Custom Claims sincronizados por Functions | `decisiones/ADR-001-autorizacion-firebase.md` |
| Integración Firebase | Firebase Web SDK modular, sin AngularFire inicialmente         | `decisiones/ADR-002-sdk-firebase.md`          |
| Estado Angular       | Signals + RxJS, sin NgRx inicialmente                          | `decisiones/ADR-003-estado-angular.md`        |
| UI                   | Angular Material/CDK + tema institucional propio               | `decisiones/ADR-004-libreria-visual.md`       |
| Ambiente staging     | Proyecto aislado, Firestore vacío y aliases explícitos         | `decisiones/ADR-005-ambiente-staging.md`      |

## Pendientes antes de integración real

- Definir un importe para el presupuesto y las alertas de facturación de staging.
- Crear las cuentas de prueba restantes para `usuario`, inactivo y no autorizado; la cuenta `admin` inicial ya está autorizada.
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
- Aprobar visualmente el Login, shell administrativo y vista temporal antes de publicar en Hosting de staging.

## Pendientes de verificación del primer incremento

- Instalar Java 21 o posterior en el entorno local y ejecutar `npm run test:rules`.
- Ejecutar el flujo integral con cuentas sintéticas en Authentication, Firestore y Functions Emulator.
- Revisar el shell con una sesión autorizada en 320 px, tableta y escritorio; el navegador automatizado confirma Login, pero no dispone de la sesión Google del usuario.
- Revisar antes de publicar las alertas moderadas transitivas reportadas por `npm audit` en el SDK Admin de Firebase; no aplicar el downgrade automático sugerido porque afectaría versiones soportadas.
- Crear cuentas sintéticas y validar el flujo con Google Sign-In y `bootstrapAuthorization`; ambos servicios ya están configurados en staging.

## Estado para iniciar

La base Angular y el shell administrativo están disponibles en local conectados a staging; Google Sign-In, `bootstrapAuthorization`, Cloud Storage y una cuenta `admin` activa están disponibles en el proyecto de staging. La validación integral permanece pendiente hasta probar el primer acceso, completar los casos negativos con cuentas sintéticas, ejecutar las pruebas de Rules con Java 21 y realizar la aceptación visual autenticada.
