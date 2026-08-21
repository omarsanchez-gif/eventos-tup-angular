# Decisiones y pendientes

## Decisiones resueltas

| Tema                     | Decisión                                                         | Referencia                                                    |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| Autorización backend     | Firestore canónico + Custom Claims sincronizados por Functions   | `decisiones/ADR-001-autorizacion-firebase.md`                 |
| Integración Firebase     | Firebase Web SDK modular, sin AngularFire inicialmente           | `decisiones/ADR-002-sdk-firebase.md`                          |
| Estado Angular           | Signals + RxJS, sin NgRx inicialmente                            | `decisiones/ADR-003-estado-angular.md`                        |
| UI                       | Angular Material/CDK + tema institucional propio                 | `decisiones/ADR-004-libreria-visual.md`                       |
| Ambiente staging         | Proyecto aislado, sin copia productiva y aliases explícitos      | `decisiones/ADR-005-ambiente-staging.md`                      |
| Búsqueda de Usuarios     | Lista administrativa limitada a 500; búsqueda y paginación local | `modulo-usuarios/spec.md`, USR-D01                            |
| Identidad de usuario     | Correo inmutable después de asociar UID                          | `modulo-usuarios/spec.md`, USR-D02                            |
| Continuidad admin        | Sin auto-retiro y siempre al menos un admin activo               | `modulo-usuarios/spec.md`, USR-D03                            |
| Claims administrativos   | Estado objetivo idempotente, fallo cerrado y reconciliación      | `modulo-usuarios/spec.md`, USR-D04                            |
| Coordinaciones y correo  | Catálogo protegido, fotografía histórica y outbox idempotente    | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Calendar de contactos    | Los contactos reciben correo, pero no son asistentes Calendar    | `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md` |
| Correos por coordinación | Máximo de 10 correos institucionales                             | `modulo-coordinaciones/spec.md`, COO-D06                      |
| Selección en Eventos     | Sin límite funcional; pueden seleccionarse todas las activas     | `modulo-eventos/spec.md`, EVT-D11                             |
| Reintentos SMTP          | Intento inmediato y reintentos a 5 min, 30 min y 2 h             | `integraciones.md`                                            |
| Retención de envíos      | Purga 90 días después del estado terminal                        | `modelo-datos.md`, `integraciones.md`                         |
| Limpieza de PDFs         | Reemplazo seguro y purga de huérfanos después de 24 h            | `integraciones.md`                                            |
| Paginación de Eventos    | 25 registros por cursor de Firestore                             | `modulo-eventos/spec.md`, EVT-D15                             |
| Campus y logística       | Catálogo dinámico, horarios por sede y política futura           | `decisiones/ADR-007-campus-equipos-logistica.md`              |
| Inventario de Equipos    | Cantidad agregada por nombre y campus; fijo o transferible       | `modulo-equipos/spec.md`, EQP-D01 a EQP-D09                   |
| Destinos de traslado     | Destinos explícitos; un campus futuro no se habilita solo        | `modulo-equipos/spec.md`, EQP-D03 y EQP-D04                   |
| Reserva de equipos       | Todos o ninguno; disponibilidad calculada por intervalo          | `modulo-equipos/reservaciones.md`                             |
| Demora de regreso        | Nueva fecha/hora estimada y recepción anticipada opcional        | `modulo-equipos/reservaciones.md`                             |
| Cobertura de Sistemas    | No requerida, pendiente o confirmada; pendiente no bloquea stock | `modulo-equipos/reservaciones.md`                             |
| Eventos en domingo       | Se rechaza cualquier intervalo que toque domingo                 | `modulo-equipos/reservaciones.md`                             |

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

## Pendientes para aceptar Coordinaciones

- Completar la carrera entre uso y eliminación cuando Eventos implemente la transición a `utilizada: true`.
- Ejecutar revisión manual accesible y responsive con sesión `admin`.
- Ejecutar el recorrido funcional y visual autenticado en staging con datos sintéticos.

## Pendientes para aceptar Campus

- Capturar manualmente TUP y FCS con sus horarios aprobados; no existe semilla automática.
- Agregar las direcciones oficiales cuando estén disponibles y validar búsqueda por ubicación.
- Ejecutar el recorrido funcional con datos sintéticos como `admin`: alta, edición, suspensión, activación y eliminación condicionada.
- Revisar accesibilidad y responsive en 320 px, tableta y escritorio.
- Completar la aceptación funcional y visual en el Hosting de staging antes de considerar producción.

## Pendientes para aceptar el catálogo de Equipos

- Capturar y aceptar TUP y FCS en staging con horarios canónicos.
- Confirmar el inventario utilizable inicial por campus; no habrá semilla automática ni copia productiva.
- Ejecutar el recorrido manual como `admin`: alta fija y transferible, edición, suspensión, activación y eliminación condicionada.
- Revisar accesibilidad y responsive en 320 px, tableta y escritorio.
- Obtener aceptación funcional y visual antes de considerar producción o autorizar reservaciones.

## Pendientes antes de reservaciones de Equipos

- Decidir si Eventos permitirá intervalos de varios días y sus límites.
- Aprobar la estrategia transaccional y los índices Firestore para evitar sobreasignación concurrente.
- Seleccionar por ID la coordinación responsable de Sistemas y validar que tenga correos de staging.
- Implementar y aceptar primero el catálogo de Equipos.
- Autorizar reservaciones, logística, notificaciones e integración con Eventos por separado.

## Pendientes antes de Eventos

- Implementar y aceptar Coordinaciones primero.
- Implementar y aceptar Campus antes de Equipos y Eventos.
- Implementar y aceptar el catálogo de Equipos antes de integrar disponibilidad.
- Resolver eventos de varios días y aprobar reservaciones de Equipos.
- Verificar comportamiento con eventos históricos incompletos.
- Provisionar y verificar Calendar, buzón SMTP, lista permitida y cuotas del worker exclusivos de staging.

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

Coordinaciones está implementado con capacidad técnica de 500 registros: 41 pruebas Angular, 32 de Functions, 8 transaccionales propias y 10 de Rules están en verde; lint y build de staging también pasan. Sus seis callables y Firestore Rules fueron desplegadas únicamente a `eventos-tup-angular-stg` el 19 de agosto de 2026. La lista remota confirmó las seis Functions y una prueba de humo anónima recibió `401`, según lo esperado. Permanecen pendientes el recorrido autenticado con datos sintéticos y la aceptación funcional y visual. La ampliación de Eventos continúa solo como documentación: no existen workers, callables, colecciones de notificaciones ni despliegues autorizados para Eventos.

Campus fue implementado, validado y desplegado a staging el 21 de agosto de 2026 como prerrequisito de Equipos. La suite completa quedó en verde: 46 pruebas Angular, 41 de Functions, 6 transaccionales propias y 12 de Rules, además de lint, formato y build de staging. Las seis Functions, Firestore Rules y Hosting se publicaron únicamente en `eventos-tup-angular-stg`; la verificación remota obtuvo Hosting `200` y rechazo anónimo `401`. Su incremento no incluye inventario, reservaciones, rutas editables ni Eventos. Permanecen pendientes la captura manual de TUP/FCS, sus direcciones oficiales, el recorrido autenticado y la aceptación visual. Producción no fue utilizada ni modificada.

Equipos cuenta desde el 21 de agosto de 2026 con spec de catálogo, contrato separado de reservaciones, pruebas, tareas, wireframe y actualización transversal. El incremento A del catálogo fue autorizado para implementación local, sin despliegue. Las reservaciones permanecen bloqueadas por eventos de varios días y estrategia transaccional; Eventos no está autorizado.
