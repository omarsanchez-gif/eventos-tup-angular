# Reglas de negocio

## Autenticación

- RN-001: Todo acceso privado requiere Firebase Authentication con Google.
- RN-002: El correo debe pertenecer al dominio institucional configurado.
- RN-003: El usuario debe existir previamente en `usuarios`.
- RN-004: Solo usuarios con `activo: true` pueden utilizar el sistema.
- RN-005: Si el usuario autorizado tiene `uid: null`, el sistema asociará su UID en el primer acceso.
- RN-006: El último acceso se registrará con fecha del servidor.
- RN-007: No existe registro público ni autenticación por contraseña.

## Roles

- RN-008: Los roles válidos son `admin` y `usuario`.
- RN-009: Solo `admin` puede gestionar usuarios.
- RN-010: `usuario` puede consultar y crear eventos, y modificar o eliminar únicamente los que creó.

## Usuarios

- RN-011: Crear un usuario genera un documento de autorización en Firestore, no una cuenta de Authentication.
- RN-012: El correo se normaliza a minúsculas y debe ser único.
- RN-013: Se permite crear, editar, activar, desactivar y eliminar usuarios.
- RN-014: Un usuario no puede eliminar su propio registro cuando su UID coincide con el autenticado.
- RN-035: El correo solo puede editarse mientras `uid` sea `null`; después de asociarlo queda inmutable desde Usuarios.
- RN-036: Un administrador no puede desactivarse ni cambiar su propio rol a `usuario`.
- RN-037: Ninguna operación puede dejar al sistema sin al menos un usuario activo con rol `admin`.
- RN-038: La migración inicial admite búsqueda local y paginación visual sobre un máximo de 500 usuarios; si se supera, no se devuelven resultados parciales y se requiere rediseñar la búsqueda mediante una spec aprobada.
- RN-039: Desactivar, eliminar o cambiar un rol de `admin` a `usuario` revoca refresh tokens cuando existe UID.
- RN-040: Una operación administrativa parcial no se comunica como éxito; conserva el estado más restrictivo y permite reintento idempotente.

## Eventos

- RN-015: Todo evento capturado se considera previamente autorizado.
- RN-016: Todo evento nuevo requiere un protocolo PDF.
- RN-017: Solo se admite un protocolo vigente por evento.
- RN-018: El PDF debe ser `application/pdf` y medir menos de 10 MiB.
- RN-019: La fecha y hora de término no pueden ser anteriores al inicio.
- RN-020: Responsable y correo del creador proceden de la sesión autorizada.
- RN-021: Los eventos nuevos usan `programado` por defecto.
- RN-022: `registrado` es un valor histórico equivalente visualmente a `programado`.
- RN-023: Solo el creador puede editar o eliminar un evento.
- RN-024: Un evento se guarda en Firestore antes de ejecutar Calendar y correo.
- RN-025: La creación debe intentar Calendar y correo mediante Cloud Functions.
- RN-026: La edición debe sincronizar Google Calendar.
- RN-027: La eliminación debe intentar retirar Calendar y PDF antes de eliminar Firestore.

## Consultas

- RN-028: Usuarios se buscan por nombre o correo.
- RN-029: Eventos se buscan por nombre o responsable.
- RN-030: Los listados son paginados visualmente.
- RN-031: El Dashboard muestra datos reales, no valores simulados.

## Restricciones de migración

- RN-032: No se cambiará el modelo de datos durante la migración inicial.
- RN-033: No se crearán funcionalidades ausentes sin una spec aprobada.
- RN-034: Las correcciones de seguridad pueden cambiar el mecanismo técnico, pero no los permisos funcionales aprobados.
