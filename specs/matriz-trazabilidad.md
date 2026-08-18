# Matriz de trazabilidad

## Equivalencia del producto actual

| Comportamiento actual          | Spec Angular                   | Prueba requerida                                  | Estado                                                                                                 |
| ------------------------------ | ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Google Sign-In                 | `modulo-autenticacion/spec.md` | AUTH-001                                          | Implementado; validación integral pendiente                                                            |
| Rechazo de usuario inexistente | `modulo-autenticacion/spec.md` | AUTH-002                                          | Implementado; prueba backend aprobada                                                                  |
| Rechazo de usuario inactivo    | `modulo-autenticacion/spec.md` | AUTH-003                                          | Implementado; prueba backend aprobada                                                                  |
| Validación de dominio          | `modulo-autenticacion/spec.md` | AUTH-004                                          | Implementado; prueba backend aprobada                                                                  |
| Asociación y conflicto de UID  | `modulo-autenticacion/spec.md` | AUTH-005 y AUTH-006                               | Implementado; prueba backend aprobada                                                                  |
| Persistencia de sesión         | `modulo-autenticacion/spec.md` | AUTH-008                                          | Implementado; validación integral pendiente                                                            |
| Protección de rutas            | `modulo-autenticacion/spec.md` | AUTH-009, AUTH-011 y AUTH-012                     | Implementado; pruebas frontend aprobadas                                                               |
| Roles `admin` / `usuario`      | `seguridad.md`                 | AUTH-013, AUTH-014, AUTH-017, AUTH-018 y AUTH-019 | Implementado; 8 pruebas de Rules aprobadas y Firestore Rules publicadas en staging                     |
| Vista temporal autenticada     | `modulo-autenticacion/spec.md` | AUTH-029                                          | Implementado; prueba frontend aprobada                                                                 |
| Sidebar y topbar               | `modulo-layout/spec.md`        | LAYOUT-001 a LAYOUT-013                           | Implementado; 6 pruebas unitarias aprobadas; aceptación visual pendiente                               |
| Gestión de usuarios            | `modulo-usuarios/spec.md`      | USR-001 a USR-069                                 | Implementado y desplegado en staging; emuladores y Rules aprobados; aceptación visual/manual pendiente |
| Gestión de eventos             | `modulo-eventos/spec.md`       | Pendiente                                         | Fuera del alcance actual                                                                               |
| PDF en Storage                 | `modulo-eventos/spec.md`       | Pendiente                                         | Fuera del alcance actual                                                                               |
| Calendar y correo              | `integraciones.md`             | Pendiente                                         | Fuera del alcance actual                                                                               |
| Dashboard real                 | `modulo-dashboard/spec.md`     | Pendiente                                         | Fuera del alcance actual                                                                               |

## Correcciones deliberadas

| Riesgo actual                                     | Decisión objetivo                        | Referencia |
| ------------------------------------------------- | ---------------------------------------- | ---------- |
| Guards como barrera principal de Usuarios         | Claims + Rules + Functions               | ADR-001    |
| Usuario inactivo aún autenticado                  | Claim `authorized`, refresh y revocación | ADR-001    |
| Dependencia potencial de AngularFire incompatible | SDK modular directo                      | ADR-002    |
| Estado global sobredimensionado                   | Signals + RxJS                           | ADR-003    |
| Copia visual literal de Vue                       | Design system Angular propio             | ADR-004    |
| Formulario de búsqueda recarga la SPA             | Formulario reactivo y filtrado local     | USR-067    |
| Caracteres tipográficos ambiguos en acciones      | SVG coherentes y ayuda contextual        | USR-068    |
| Búsqueda dependiente del botón o de `Enter`       | Filtrado local mientras se escribe       | USR-069    |

## Regla

Ninguna fila puede pasar a “Implementado” sin evidencia de su prueba correspondiente. Las filas fuera de alcance no autorizan código.

## Evidencia del primer incremento

- Build Angular de producción aprobado.
- Lint frontend y Functions aprobado.
- 31 pruebas frontend aprobadas: 12 nuevas de Usuarios y 6 existentes de shell adaptadas a su navegación.
- 20 pruebas backend aprobadas: 9 de autorización y 11 de operaciones administrativas de Usuarios.
- Callable cargada correctamente en Functions Emulator.
- Java Temurin 21.0.12 instalado; 8 pruebas automatizadas de Firestore y Storage Rules aprobadas.
- 7 pruebas integrales de Usuarios aprobadas con Auth y Firestore Emulator, incluida concurrencia de correo único.
- Build de staging aprobado con bundle inicial de 460.80 kB y `users-page` diferido de 83.11 kB.
- Las cinco callables administrativas y Firestore Rules están desplegadas únicamente a staging; prueba de humo protegida aprobada.
- Shell administrativo compilado en configuración de staging; aceptación visual autenticada pendiente.
- Validación integral con cuentas de prueba y aceptación visual pendiente antes de publicar en Hosting.
