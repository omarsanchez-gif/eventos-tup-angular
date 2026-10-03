# Proyecto

Sistema Institucional de Eventos TUP — migración Angular.

## Metodología

Desarrollo por especificaciones. El código deberá ser trazable a `/specs`.

## Fuente de verdad

Orden obligatorio:

1. `/specs/reglas-negocio.md`
2. `/specs/modelo-datos.md`
3. `/specs/seguridad.md`
4. `/specs/integraciones.md`
5. `/specs/arquitectura.md`
6. `/specs/[modulo]/spec.md`
7. `/specs/[modulo]/tareas.md`
8. `/specs/[modulo]/pruebas.md`
9. `/specs/design-system/spec.md`
10. ADRs en `/specs/decisiones`

## Reglas obligatorias

- No implementar funcionalidades fuera de specs.
- No modificar el modelo de datos sin actualizar y aprobar primero `modelo-datos.md`.
- No crear colecciones, campos, roles, rutas, módulos o Functions no definidos.
- No modificar Firestore Rules o Storage Rules sin actualizar `seguridad.md` y sus pruebas.
- No agregar dependencias externas sin una ADR o justificación documentada.
- No consultar Firebase directamente desde componentes.
- No usar guards del cliente como única autorización.
- No colocar secretos en el frontend, repositorio o archivos de environment públicos.
- No usar producción para desarrollo o pruebas manuales.
- Mantener `demo-eventos-tup` como proyecto predeterminado de Firebase CLI.
- Usar `staging` únicamente como alias explícito de `eventos-tup-angular-stg`.
- Usar `production` únicamente como alias explícito de `eventos-tup-bb903`; ningún despliegue productivo está autorizado sin solicitud expresa y evidencia aprobada de staging.
- El proyecto Firebase `eventos-tup`, visible en la cuenta, no forma parte de esta migración y no está autorizado.
- El plan Blaze está habilitado únicamente en staging; toda creación de recursos con costo debe limitarse al alcance solicitado y documentarse.
- El correo `omar.sanchez@tecplayacar.edu.mx` está autorizado como soporte OAuth únicamente para la marca de staging.
- Storage de staging utiliza exclusivamente `eventos-tup-angular-stg.firebasestorage.app` en `US-CENTRAL1`.
- No ejecutar `firebase deploy` sin `--only` y `--project staging`; cada servicio se valida y despliega por separado.
- No copiar funcionalidades históricas no presentes en las nuevas specs.
- Consumir botones, icon-buttons, campos, badges, alertas, tooltips y diálogos compartidos desde `src/styles.scss`; los SCSS encapsulados solo controlan distribución específica.
- No redefinir localmente color, tipografía, altura, radio, iconografía ni estados de una primitiva visual global. Toda nueva variante se documenta primero en `specs/design-system/spec.md`.
- Todo cambio de interfaz y todo módulo nuevo debe superar `npm run lint:visual`; no se permite omitir o desactivar esta guardia para aceptar estilos locales duplicados.
- Ante una contradicción o ambigüedad, detener la implementación y actualizar specs.

## Alcance autorizado actual

Implementar únicamente cuando el usuario lo solicite explícitamente:

- Base técnica Angular.
- Sistema de diseño institucional para Login y área privada.
- `modulo-autenticacion`.
- `modulo-layout` como shell administrativo compartido.
- Sidebar, topbar, identidad del usuario y navegación responsive.
- Ruta privada `/dashboard` para `admin` y `usuario`, con perfil autenticado, cuatro KPI reales, próximos eventos y actividad reciente mediante un único read model sanitizado.
- `modulo-usuarios`, autorizado expresamente el 18 de agosto de 2026, limitado a los contratos, reglas, pruebas y tareas de `/specs/modulo-usuarios`.
- Ruta privada `/usuarios`, guard de rol `admin`, cinco callables administrativas, sincronización de claims y revocación previstas en la spec de Usuarios.
- `modulo-coordinaciones`, autorizado expresamente el 19 de agosto de 2026, limitado a los contratos, reglas, pruebas y tareas de `/specs/modulo-coordinaciones`.
- Ruta privada `/coordinaciones`, guard de rol `admin`, seis callables, catálogo completo administrativo y catálogo sanitizado para Eventos.
- Las seis callables de Coordinaciones y Firestore Rules fueron desplegadas únicamente a `eventos-tup-angular-stg` el 19 de agosto de 2026. Hosting, Eventos y producción no formaron parte de ese despliegue.
- `modulo-campus`, autorizado expresamente el 21 de agosto de 2026, limitado a los contratos, reglas, pruebas y tareas de `/specs/modulo-campus`.
- Ruta privada `/campus`, guard de rol `admin`, seis callables, catálogo administrativo completo y catálogo sanitizado para consumidores futuros.
- Campus desplegado únicamente a staging el 21 de agosto de 2026: seis Functions, Firestore Rules y Hosting; producción no fue utilizada.
- `modulo-equipos`, incremento A autorizado expresamente el 21 de agosto de 2026, limitado al catálogo administrativo de `/specs/modulo-equipos/spec.md`.
- Ruta privada `/equipos`, guard `admin`, seis callables, catálogo completo administrativo y catálogo activo sanitizado sin disponibilidad.
- Equipos desplegado únicamente a staging el 21 de agosto de 2026: seis Functions, Firestore Rules y Hosting; producción no fue utilizada.
- `modulo-eventos` y reservaciones de Equipos, autorizados expresamente el 29 de septiembre de 2026, limitados a los contratos, reglas, tareas y pruebas vigentes de `/specs/modulo-eventos`, `/specs/modulo-equipos/reservaciones.md`, ADR-006, ADR-009 y ADR-010.
- `modulo-dashboard`, autorizado, implementado y desplegado únicamente a staging el 3 de octubre de 2026, limitado al read model, cálculos, interfaz, tareas y pruebas de `/specs/modulo-dashboard`; sustituyó `TemporaryDashboard` sin crear colecciones ni exponer documentos administrativos. El índice está `READY`, `getDashboardSummary` está activa en `us-central1` y Hosting sirve `main-YA3LURUC.js`; la aceptación autenticada con ambos roles continúa pendiente y producción no fue utilizada.
- Rutas privadas `/eventos` y `/eventos/calendario`, máximo 20 tipos de equipo por evento, transacción de todo o nada, documentos protegidos de control por equipo, índices declarativos, cancelación histórica y FullCalendar Standard.
- Calendar y SMTP están implementados y desplegados únicamente a staging con secretos enlazados, una lista fija para creadores y autorización dinámica protegida para contactos institucionales de Coordinaciones. La creación/reconciliación de Calendar y una entrega SMTP permitida tienen evidencia real; aún faltan actualización, cancelación, la nueva vía dinámica, negativas controladas y aceptación manual. Producción continúa fuera de alcance.
- El 2 de octubre de 2026 se sustituyó en staging el calendario desechable `CALENDARIO - STAGING` por un calendario institucional adicional compartido con `eventos@tecplayacar.edu.mx` con permiso para realizar cambios y administrar el uso compartido. Los eventos de prueba existentes no se migran. OAuth `calendar.events`, `GOOGLE_CALENDAR_CONFIG` versión 3 y el endpoint de eventos quedaron validados; las siete Functions consumidoras se redesplegaron y están `ACTIVE`. Falta comprobar una creación nueva desde la aplicación. No se autorizó producción ni eliminar el calendario anterior.

- El módulo de Eventos, reservaciones, logística administrativa, Calendar, bandeja SMTP, mantenimiento y compatibilidad histórica quedó implementado, probado y desplegado únicamente a staging desde el 30 de septiembre de 2026 conforme a ADR-006, ADR-009 y ADR-010.
- El 30 de septiembre se creó la configuración logística canónica, se cargó `SMTP_CONFIG` versión 2, se verificaron siete índices en `READY` y TTL en `ACTIVE`, y se desplegaron Rules, 16 Functions de Eventos y Hosting únicamente a staging. La auditoría quedó sin vulnerabilidades altas o críticas. Las pruebas reales restantes y la aceptación manual deben aprobarse antes de considerar completo Eventos en staging.
- El 1 de octubre `SMTP_CONFIG` versión 3 amplió la allowlist de staging a las cuatro cuentas institucionales autorizadas y sus ocho Functions consumidoras quedaron enlazadas; producción no fue utilizada.
- La actualización automática de disponibilidad del formulario abierto al recuperar foco/visibilidad y cada 30 segundos visibles está implementada, probada y publicada únicamente en Hosting de staging el 1 de octubre de 2026; su aceptación manual continúa pendiente.
- Los índices del calendario se corrigieron y desplegaron únicamente a staging el 1 de octubre de 2026 con `finAt` antes de `inicioAt`; las consultas general y por campus aprobaron sin `FAILED_PRECONDITION`, los índices anteriores se retiraron y producción no fue utilizada.
- Las acciones directas `Ver`, `Editar` y `Cancelar` del listado, limitadas por propiedad, y la columna `Integración` exclusiva para `admin` están implementadas, validadas y publicadas únicamente en Hosting de staging desde el 2 de octubre de 2026. Producción no fue utilizada.
- La composición visual normalizada de Eventos definida por EVT-105 está publicada únicamente en Hosting de staging desde el 2 de octubre de 2026. El despliegue sirvió el bundle `main-ACLYBD7D.js`; no incluyó Functions, Rules, índices, secretos ni producción.
- La corrección EVT-106 de ocupación multidiaria y presentación estética del calendario está implementada, validada y publicada únicamente en Hosting de staging desde el 2 de octubre de 2026. El despliegue sirvió `main-6DTMESSF.js`; no incluyó Functions, Rules, índices, secretos ni producción.
- EVT-107 corrigió la incompatibilidad visual detectada después de EVT-106 con FullCalendar 7: incorpora la paleta Classic requerida, usa `className`, `color` y `contrastColor` públicos y elimina selectores internos v6. Aprobó 66 pruebas Angular, lint, guardia visual, formato, build de staging y una validación visual local de franja multidiaria y panel de acumulación. Fue publicada únicamente en Hosting de staging el 2 de octubre de 2026 y sirve `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`; no incluyó Functions, Rules, índices, secretos, datos ni producción.
- EVT-109 incorporó correos HTML institucionales con alternativa de texto, fotografía ampliada, resumen seguro de cambios y escape de contenido. El 2 de octubre de 2026 aprobaron 75 pruebas unitarias de Functions, 14 pruebas de Eventos con Firestore Emulator, lint, guardia visual, formato y build; se desplegaron únicamente las ocho Functions consumidoras de SMTP en staging. Firebase confirmó las ocho actualizaciones; no se modificaron frontend, Hosting, Rules, índices, secretos, datos ni producción. Falta la aceptación visual de una notificación nueva.
- EVT-110 permite que los contactos institucionales con procedencia protegida `coordinacion` o `sistemas` reciban correo sin agregarlos manualmente a `SMTP_CONFIG`; los creadores fuera de la lista fija, correos externos y trabajos sin ID canónico permanecen bloqueados. El 3 de octubre de 2026 aprobaron 78 pruebas unitarias de Functions, 14 pruebas de Eventos con Firestore Emulator, lint, guardia visual, formato y build; después se actualizaron únicamente las ocho Functions consumidoras de SMTP en staging y Firebase confirmó las ocho operaciones. No se modificaron Hosting, Rules, índices, secretos, datos ni producción. La aceptación real positiva y negativa continúa pendiente.

No implementar todavía:

- Integraciones productivas; staging real queda limitado a las pruebas controladas ya documentadas y todavía no aceptadas.
- Migraciones de datos.

## Seguridad autorizada

La colección `usuarios` permanece como fuente canónica. Los Custom Claims solo reflejarán autorización y rol para Security Rules. Su sincronización deberá realizarse exclusivamente mediante Admin SDK en Cloud Functions, conforme a `/specs/decisiones/ADR-001-autorizacion-firebase.md`.

## Diseño

- Diseño institucional desde cero.
- Accesibilidad WCAG 2.2 AA.
- Responsive desde 320 px.
- Utilizar los tokens y wireframes de `/specs/design-system/spec.md`.
- No agregar menús, campos o acciones no especificados.

## Definición de terminado

Una tarea solo termina cuando:

- Cumple spec, reglas, modelo, seguridad y ADRs.
- Supera las pruebas documentadas.
- No introduce funcionalidad fuera de alcance.
- No expone secretos ni datos de producción.
- Cumple accesibilidad y estados de carga, error y vacío aplicables.
- Build, lint y pruebas están en verde.
- La documentación afectada está actualizada.
