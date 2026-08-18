# Decisiones y pendientes

## Decisiones resueltas

| Tema                   | Decisión                                                         | Referencia                                    |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Autorización backend   | Firestore canónico + Custom Claims sincronizados por Functions   | `decisiones/ADR-001-autorizacion-firebase.md` |
| Integración Firebase   | Firebase Web SDK modular, sin AngularFire inicialmente           | `decisiones/ADR-002-sdk-firebase.md`          |
| Estado Angular         | Signals + RxJS, sin NgRx inicialmente                            | `decisiones/ADR-003-estado-angular.md`        |
| UI                     | Angular Material/CDK + tema institucional propio                 | `decisiones/ADR-004-libreria-visual.md`       |
| Ambiente staging       | Proyecto aislado, sin copia productiva y aliases explícitos      | `decisiones/ADR-005-ambiente-staging.md`      |
| Búsqueda de Usuarios   | Lista administrativa limitada a 500; búsqueda y paginación local | `modulo-usuarios/spec.md`, USR-D01            |
| Identidad de usuario   | Correo inmutable después de asociar UID                          | `modulo-usuarios/spec.md`, USR-D02            |
| Continuidad admin      | Sin auto-retiro y siempre al menos un admin activo               | `modulo-usuarios/spec.md`, USR-D03            |
| Claims administrativos | Estado objetivo idempotente, fallo cerrado y reconciliación      | `modulo-usuarios/spec.md`, USR-D04            |

## Pendientes antes de integración real

- Definir un importe para el presupuesto y las alertas de facturación de staging.
- Crear las cuentas de prueba restantes para `usuario`, inactivo y no autorizado; la cuenta `admin` inicial ya está autorizada.
- Confirmar calendario y buzón SMTP exclusivos de staging.
- Inventariar índices Firestore existentes.
- Confirmar límites y cuotas aplicables del proyecto Firebase.

## Pendientes antes de aceptar Usuarios

- Confirmar mediante un inventario que el volumen esperado de `usuarios` permanece por debajo de 500; si lo supera, actualizar specs antes de implementar búsqueda.
- Crear al menos un segundo administrador activo antes de validar operaciones que reduzcan privilegios en staging.
- Validar manualmente en staging la revocación de refresh tokens al desactivar, eliminar o degradar un administrador sintético.
- Completar revisión visual autenticada en 320 px, tableta y escritorio y el recorrido con teclado/lector de pantalla.
- Obtener aceptación funcional antes de habilitar Hosting; producción continúa fuera de alcance.

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

- Ejecutar el recorrido manual completo con una cuenta `admin` en staging.
- Revisar el shell con una sesión autorizada en 320 px, tableta y escritorio; el navegador automatizado confirma Login, pero no dispone de la sesión Google del usuario.
- Revisar antes de publicar las alertas moderadas transitivas reportadas por `npm audit` en el SDK Admin de Firebase; no aplicar el downgrade automático sugerido porque afectaría versiones soportadas.
- Crear cuentas sintéticas y validar el flujo con Google Sign-In y `bootstrapAuthorization`; ambos servicios ya están configurados en staging.

## Estado para iniciar

La base Angular, el shell y el módulo de Usuarios están operativos localmente contra staging. Java 21, pruebas unitarias, Auth/Firestore Emulator y Security Rules están aprobados. Las cinco callables y Firestore Rules están desplegadas únicamente a `eventos-tup-angular-stg`; `npm run start:staging` sirve la aplicación en `http://localhost:4200`. Permanecen pendientes la aceptación visual/manual y un segundo administrador antes de probar reducción de privilegios. Producción no fue utilizada ni modificada.
