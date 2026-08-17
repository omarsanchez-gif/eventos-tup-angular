# Matriz de trazabilidad

## Equivalencia del producto actual

| Comportamiento actual          | Spec Angular                   | Prueba requerida              | Estado                                                                   |
| ------------------------------ | ------------------------------ | ----------------------------- | ------------------------------------------------------------------------ |
| Google Sign-In                 | `modulo-autenticacion/spec.md` | AUTH-001                      | Implementado; validación integral pendiente                              |
| Rechazo de usuario inexistente | `modulo-autenticacion/spec.md` | AUTH-002                      | Implementado; prueba backend aprobada                                    |
| Rechazo de usuario inactivo    | `modulo-autenticacion/spec.md` | AUTH-003                      | Implementado; prueba backend aprobada                                    |
| Validación de dominio          | `modulo-autenticacion/spec.md` | AUTH-004                      | Implementado; prueba backend aprobada                                    |
| Asociación y conflicto de UID  | `modulo-autenticacion/spec.md` | AUTH-005 y AUTH-006           | Implementado; prueba backend aprobada                                    |
| Persistencia de sesión         | `modulo-autenticacion/spec.md` | AUTH-008                      | Implementado; validación integral pendiente                              |
| Protección de rutas            | `modulo-autenticacion/spec.md` | AUTH-009, AUTH-011 y AUTH-012 | Implementado; pruebas frontend aprobadas                                 |
| Roles `admin                   | usuario`                       | `seguridad.md`                | AUTH-013, AUTH-014, AUTH-017, AUTH-018 y AUTH-019                        | Implementado; ejecución de Rules pendiente |
| Vista temporal autenticada     | `modulo-autenticacion/spec.md` | AUTH-029                      | Implementado; prueba frontend aprobada                                   |
| Sidebar y topbar               | `modulo-layout/spec.md`        | LAYOUT-001 a LAYOUT-013       | Implementado; 6 pruebas unitarias aprobadas; aceptación visual pendiente |
| Gestión de usuarios            | `modulo-usuarios/spec.md`      | Pendiente                     | Fuera del alcance actual                                                 |
| Gestión de eventos             | `modulo-eventos/spec.md`       | Pendiente                     | Fuera del alcance actual                                                 |
| PDF en Storage                 | `modulo-eventos/spec.md`       | Pendiente                     | Fuera del alcance actual                                                 |
| Calendar y correo              | `integraciones.md`             | Pendiente                     | Fuera del alcance actual                                                 |
| Dashboard real                 | `modulo-dashboard/spec.md`     | Pendiente                     | Fuera del alcance actual                                                 |

## Correcciones deliberadas

| Riesgo actual                                     | Decisión objetivo                        | Referencia |
| ------------------------------------------------- | ---------------------------------------- | ---------- |
| Guards como barrera principal de Usuarios         | Claims + Rules + Functions               | ADR-001    |
| Usuario inactivo aún autenticado                  | Claim `authorized`, refresh y revocación | ADR-001    |
| Dependencia potencial de AngularFire incompatible | SDK modular directo                      | ADR-002    |
| Estado global sobredimensionado                   | Signals + RxJS                           | ADR-003    |
| Copia visual literal de Vue                       | Design system Angular propio             | ADR-004    |

## Regla

Ninguna fila puede pasar a “Implementado” sin evidencia de su prueba correspondiente. Las filas fuera de alcance no autorizan código.

## Evidencia del primer incremento

- Build Angular de producción aprobado.
- Lint frontend y Functions aprobado.
- 19 pruebas frontend aprobadas.
- 9 pruebas de autorización backend aprobadas.
- Callable cargada correctamente en Functions Emulator.
- Pruebas automatizadas de Firestore y Storage Rules creadas; ejecución pendiente por falta de Java en el equipo local.
- Shell administrativo compilado en configuración de staging; aceptación visual autenticada pendiente.
- Validación integral con cuentas de prueba y aceptación visual pendiente antes de publicar en Hosting.
