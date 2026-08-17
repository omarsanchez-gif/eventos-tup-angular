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
- No copiar funcionalidades históricas no presentes en las nuevas specs.
- Ante una contradicción o ambigüedad, detener la implementación y actualizar specs.

## Alcance autorizado actual

Implementar únicamente cuando el usuario lo solicite explícitamente:

- Base técnica Angular.
- Sistema de diseño mínimo necesario para Login.
- `modulo-autenticacion`.
- Navegación mínima requerida para validar la sesión.
- Vista temporal autenticada en `/dashboard`, limitada a nombre, correo, rol y cierre de sesión.

No implementar todavía:

- Dashboard funcional, KPIs, actividad o próximos eventos.
- Eventos.
- Usuarios.
- Layout administrativo completo.
- Nuevas integraciones distintas del bootstrap de autorización especificado.
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
