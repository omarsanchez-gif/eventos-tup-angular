# Contexto general

## Estado

Borrador inicial de especificaciones para el nuevo frontend Angular del Sistema Institucional de Eventos TUP.

## Propósito

Sustituir el frontend actual construido con Vue por una aplicación Angular de nuevo diseño, conservando como línea base el comportamiento real del producto en producción y manteniendo Firebase como infraestructura.

La migración es una sustitución tecnológica y visual. No autoriza por sí misma cambios de datos, reglas de negocio, integraciones o alcance funcional.

## Producto actual de referencia

El producto existente permite:

- Autenticación institucional mediante Google y Firebase Authentication.
- Validación de usuarios autorizados y activos en Firestore.
- Dashboard con datos reales de usuarios y eventos.
- Administración de usuarios autorizados.
- Registro, consulta, edición y eliminación de eventos.
- Carga de un protocolo PDF por evento.
- Sincronización con Google Calendar.
- Envío de correo de confirmación.
- Hospedaje como SPA en Firebase Hosting.

## Usuarios y roles

- `admin`: accede a Dashboard, Eventos y Usuarios.
- `usuario`: accede a Dashboard y Eventos.

Los roles proceden de Firestore. No se agregarán roles durante la migración.

## Módulos del nuevo producto

1. Autenticación.
2. Layout administrativo.
3. Usuarios.
4. Eventos.
5. Dashboard.

No se crearán módulos adicionales sin una especificación aprobada.

## Principios de migración

- El código Vue actual es la referencia de comportamiento.
- Estas nuevas especificaciones serán la fuente de verdad para Angular.
- El diseño visual se realizará desde cero con identidad institucional.
- Se conservarán los datos y archivos existentes.
- Se conservarán los contratos Firebase aprobados.
- Las fallas de seguridad detectadas no se copiarán deliberadamente.
- Toda corrección que cambie comportamiento deberá estar identificada y aprobada.
- La aplicación Vue permanecerá disponible hasta validar equivalencia y reversión.

## Infraestructura que permanece

- Firebase Authentication.
- Cloud Firestore.
- Firebase Storage.
- Cloud Functions Gen 2.
- Firebase Hosting.
- Google Calendar API.
- Servicio SMTP de correo.
- Zona horaria `America/Cancun`.

## Fuera de alcance inicial

- Nuevos roles.
- Nuevos proveedores de autenticación.
- Folios institucionales.
- Múltiples protocolos por evento.
- Flujos de aprobación.
- Reportes avanzados.
- Migración o renombrado de campos de Firestore.
- SSR.
- Sustitución de Firebase.

## Fuente documental

Orden de prioridad para el desarrollo futuro:

1. `reglas-negocio.md`.
2. `modelo-datos.md`.
3. `seguridad.md`.
4. `integraciones.md`.
5. `arquitectura.md`.
6. `spec.md` del módulo correspondiente.
7. Spec del sistema de diseño.

Si existe una contradicción o información faltante, se debe detener la implementación y actualizar primero estas especificaciones.
