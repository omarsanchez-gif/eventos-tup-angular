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
- Vista temporal autenticada en `/dashboard`, limitada a nombre, correo, rol y cierre de sesión.
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
- `modulo-eventos` y reservaciones de Equipos, autorizados expresamente el 29 de septiembre de 2026, limitados a los contratos, reglas, tareas y pruebas vigentes de `/specs/modulo-eventos`, `/specs/modulo-equipos/reservaciones.md` y `ADR-009`.
- Rutas privadas `/eventos` y `/eventos/calendario`, máximo 20 tipos de equipo por evento, transacción de todo o nada, documentos protegidos de control por equipo, índices declarativos, cancelación histórica y FullCalendar Standard.
- Calendar y SMTP pueden implementarse con dobles y configuración segura, pero no desplegarse funcionalmente a staging hasta cargar Secret Manager, aplicar la lista permitida y aprobar las pruebas controladas. Producción continúa fuera de alcance.

Documentación autorizada, sin autorización de implementación:

- Ampliación de `modulo-eventos` para coordinaciones involucradas y notificaciones por creación, actualización, retiro y cancelación.
- Arquitectura de notificaciones idempotentes y separación entre correo y asistentes de Google Calendar conforme a `ADR-006`.
- La fase previa de documentación de reservaciones, ciclo temporal y calendario concluyó con la aprobación de `ADR-009`; cualquier ampliación posterior permanece sujeta a specs.

No implementar todavía:

- Dashboard funcional, KPIs, actividad o próximos eventos.
- Integraciones productivas o de staging real antes de configurar secretos, allowlist y aceptación correspondiente.
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
