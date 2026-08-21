# Matriz de trazabilidad

## Equivalencia del producto actual

| Comportamiento actual          | Spec Angular                    | Prueba requerida                                  | Estado                                                                                                 |
| ------------------------------ | ------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Google Sign-In                 | `modulo-autenticacion/spec.md`  | AUTH-001                                          | Implementado; validación integral pendiente                                                            |
| Rechazo de usuario inexistente | `modulo-autenticacion/spec.md`  | AUTH-002                                          | Implementado; prueba backend aprobada                                                                  |
| Rechazo de usuario inactivo    | `modulo-autenticacion/spec.md`  | AUTH-003                                          | Implementado; prueba backend aprobada                                                                  |
| Validación de dominio          | `modulo-autenticacion/spec.md`  | AUTH-004                                          | Implementado; prueba backend aprobada                                                                  |
| Asociación y conflicto de UID  | `modulo-autenticacion/spec.md`  | AUTH-005 y AUTH-006                               | Implementado; prueba backend aprobada                                                                  |
| Persistencia de sesión         | `modulo-autenticacion/spec.md`  | AUTH-008                                          | Implementado; validación integral pendiente                                                            |
| Protección de rutas            | `modulo-autenticacion/spec.md`  | AUTH-009, AUTH-011 y AUTH-012                     | Implementado; pruebas frontend aprobadas                                                               |
| Roles `admin` / `usuario`      | `seguridad.md`                  | AUTH-013, AUTH-014, AUTH-017, AUTH-018 y AUTH-019 | Implementado; 8 pruebas de Rules aprobadas y Firestore Rules publicadas en staging                     |
| Vista temporal autenticada     | `modulo-autenticacion/spec.md`  | AUTH-029                                          | Implementado; prueba frontend aprobada                                                                 |
| Sidebar y topbar               | `modulo-layout/spec.md`         | LAYOUT-001 a LAYOUT-013                           | Implementado; 6 pruebas unitarias aprobadas; aceptación visual pendiente                               |
| Gestión de usuarios            | `modulo-usuarios/spec.md`       | USR-001 a USR-069                                 | Implementado y desplegado en staging; emuladores y Rules aprobados; aceptación visual/manual pendiente |
| Gestión de coordinaciones      | `modulo-coordinaciones/spec.md` | COO-001 a COO-034                                 | Implementado y desplegado en staging; automatización aprobada y revisión manual pendiente              |
| Gestión de campus              | `modulo-campus/spec.md`         | CAM-001 a CAM-031                                 | Implementado, validado y desplegado en staging; prueba manual y aceptación pendientes                  |
| Gestión de eventos             | `modulo-eventos/spec.md`        | EVT-001 a EVT-050                                 | Redefinido documentalmente; depende de Coordinaciones y no autoriza código                             |
| PDF en Storage                 | `modulo-eventos/spec.md`        | EVT-008, EVT-028 y EVT-031                        | Documentado; implementación pendiente                                                                  |
| Calendar y correo              | `integraciones.md`              | EVT-011 a EVT-020 y EVT-028 a EVT-032             | Arquitectura idempotente documentada; implementación pendiente                                         |
| Dashboard real                 | `modulo-dashboard/spec.md`      | Pendiente                                         | Fuera del alcance actual                                                                               |

## Correcciones deliberadas

| Riesgo actual                                      | Decisión objetivo                        | Referencia    |
| -------------------------------------------------- | ---------------------------------------- | ------------- |
| Guards como barrera principal de Usuarios          | Claims + Rules + Functions               | ADR-001       |
| Usuario inactivo aún autenticado                   | Claim `authorized`, refresh y revocación | ADR-001       |
| Dependencia potencial de AngularFire incompatible  | SDK modular directo                      | ADR-002       |
| Estado global sobredimensionado                    | Signals + RxJS                           | ADR-003       |
| Copia visual literal de Vue                        | Design system Angular propio             | ADR-004       |
| Formulario de búsqueda recarga la SPA              | Formulario reactivo y filtrado local     | USR-067       |
| Caracteres tipográficos ambiguos en acciones       | SVG coherentes y ayuda contextual        | USR-068       |
| Búsqueda dependiente del botón o de `Enter`        | Filtrado local mientras se escribe       | USR-069       |
| Botones, colores y tipografía distintos por módulo | Tokens y primitivas visuales globales    | Design system |
| Correo histórico solo al creador                   | Creador + coordinaciones seleccionadas   | ADR-006       |
| Calendar y SMTP acoplados sin reintento granular   | Integraciones independientes + outbox    | ADR-006       |
| Correos de coordinación visibles en Eventos        | Catálogo sanitizado y backend canónico   | ADR-006       |
| Campus fijos y horarios codificados                | Catálogo Campus y horarios administrados | ADR-007       |

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
- Medición histórica del incremento de Usuarios: bundle inicial de staging de 460.80 kB y `users-page` diferido de 83.11 kB.
- Las cinco callables administrativas y Firestore Rules están desplegadas únicamente a staging; prueba de humo protegida aprobada.
- Shell administrativo compilado en configuración de staging; aceptación visual autenticada pendiente.
- Validación integral con cuentas de prueba y aceptación visual pendiente antes de publicar en Hosting.

## Evidencia de Coordinaciones

- 10 pruebas Angular nuevas de facade y pantalla; la suite frontend completa suma 41 pruebas aprobadas.
- 12 pruebas unitarias de Functions para Coordinaciones; la suite backend completa suma 32 pruebas aprobadas.
- 8 pruebas transaccionales propias con Firestore Emulator, incluida unicidad concurrente y edición activa con correos obligatorios.
- 10 pruebas de Firestore y Storage Rules aprobadas; lectura completa exclusiva de admin y escrituras directas bloqueadas.
- Lint Angular/Functions y formato aprobados.
- Medición histórica previa a la estandarización visual: bundle inicial de staging de 463.12 kB y `coordinations-page` diferido de 36.00 kB.
- Las seis callables y Firestore Rules de Coordinaciones fueron desplegadas únicamente a staging el 19 de agosto de 2026.
- La lista remota confirmó las seis Functions en `us-central1`; `listCoordinations` respondió `401` ante una llamada sin autenticación.
- Hosting y producción no fueron utilizados ni modificados; la aceptación autenticada manual continúa pendiente.

## Evidencia transversal vigente — 19 de agosto de 2026

- Tipografía, colores, alturas, radios y estados de botones centralizados en `src/styles.scss` y documentados en `design-system/spec.md`.
- Usuarios y Coordinaciones dejaron de redefinir localmente las primitivas `.button` e `.icon-button`; sus hojas encapsuladas conservan solo distribución y estilos propios de la vista.
- Login y Dashboard usan la misma pila tipográfica sans-serif que el área administrativa.
- Suite Angular completa: 41 pruebas aprobadas.
- Lint de Angular y Functions aprobado; formato Prettier y `git diff --check` aprobados.
- Build vigente de staging aprobado: bundle inicial de 466.21 kB, `users-page` diferido de 37.62 kB y `coordinations-page` diferido de 34.75 kB.
- Este incremento visual no modificó contratos, modelo de datos, Functions, Rules ni recursos desplegados de Firebase.
- Revisión visual manual autenticada continúa pendiente; Hosting y producción no fueron modificados.

## Evidencia de Campus — 21 de agosto de 2026

- 5 pruebas Angular específicas de pantalla y facade; la suite frontend completa suma 46 pruebas aprobadas.
- 9 pruebas unitarias de Functions específicas; la suite backend completa suma 41 pruebas aprobadas.
- 6 pruebas transaccionales con Firestore Emulator, incluida unicidad concurrente de nombre y clave, estado idempotente y protección de históricos.
- 12 pruebas de Firestore y Storage Rules aprobadas; lectura completa exclusiva de `admin` y escrituras directas bloqueadas.
- Suite completa `npm run test:all`, lint Angular/Functions, formato Prettier y build de staging aprobados.
- Bundle inicial de staging de 467.09 kB y `campuses-page` diferido de 33.06 kB.
- Las seis Functions de Campus, Firestore Rules y Hosting fueron desplegados únicamente a staging el 21 de agosto de 2026.
- La verificación remota confirmó las seis Functions, Hosting `200` y rechazo `401` de `listCampuses` sin autenticación.
- Producción no fue utilizada ni modificada.
- Persisten la captura manual de TUP/FCS, la revisión visual con sesión `admin` y la aceptación funcional.
