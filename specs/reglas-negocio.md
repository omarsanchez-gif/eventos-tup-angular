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
- RN-025: La creación debe procesar Calendar y correo mediante operaciones backend independientes e idempotentes.
- RN-026: La edición debe sincronizar Google Calendar y generar correo cuando cambien nombre, fecha, horario o coordinaciones.
- RN-027: La eliminación debe retirar Calendar y PDF antes de eliminar Firestore, y crear notificaciones de cancelación antes de perder la fotografía necesaria para enviarlas.

## Coordinaciones

- RN-041: Solo `admin` puede listar el catálogo completo, crear, editar, activar, suspender o eliminar coordinaciones.
- RN-042: El nombre de una coordinación se normaliza para validar unicidad sin distinguir mayúsculas, minúsculas ni espacios exteriores.
- RN-043: Una coordinación activa requiere entre 1 y 10 correos institucionales válidos; los correos se normalizan y no se repiten dentro de la misma coordinación. Una coordinación suspendida puede conservar de 0 a 10 correos.
- RN-044: Una coordinación suspendida no puede seleccionarse en eventos nuevos, pero conserva sus datos y referencias históricas.
- RN-045: Una coordinación marcada como utilizada por al menos un evento no puede eliminarse; únicamente puede suspenderse.
- RN-046: Los contactos de Coordinaciones reciben notificaciones, pero no adquieren acceso al sistema ni se convierten en asistentes de Google Calendar.

## Coordinaciones involucradas y notificaciones

- RN-047: Seleccionar coordinaciones en un evento es opcional; sin coordinaciones, el creador continúa siendo destinatario obligatorio.
- RN-048: El cliente envía solo IDs de coordinaciones. El backend valida que sean únicos, existentes y activos y guarda una fotografía con ID y nombre.
- RN-049: Al crear un evento se notifica individualmente al creador y a cada correo institucional de las coordinaciones seleccionadas, eliminando duplicados globales.
- RN-050: Cambiar nombre, fecha, horario o coordinaciones notifica al creador y a los contactos vigentes de las coordinaciones que continúan o se agregan.
- RN-051: Retirar una coordinación durante la edición genera un aviso específico para sus destinatarios previamente notificados y sus contactos vigentes, sin duplicados.
- RN-052: Eliminar un evento genera aviso de cancelación para el creador y para la unión de destinatarios previamente notificados y contactos vigentes de las coordinaciones involucradas.
- RN-053: Modificar únicamente estatus, observaciones, equipamiento o protocolo no genera correo, salvo que la misma operación cambie un dato definido en RN-050.
- RN-054: Los cambios en los correos de una coordinación no notifican retrospectivamente; se usan en la siguiente actualización o cancelación del evento.
- RN-055: Cada envío utiliza una clave idempotente por evento, revisión, tipo y destinatario; un reintento no duplica correos confirmados como enviados.
- RN-056: Un fallo de correo no revierte el evento ni Calendar. Se comunica integración parcial y el registro queda disponible para reintento.
- RN-057: Los correos de coordinaciones y el historial de entrega no se exponen en documentos de evento legibles por usuarios normales.
- RN-058: Si un mismo correo pertenece a una coordinación retirada y a otra que permanece, recibe la actualización correspondiente al estado final y no un aviso contradictorio de retiro.
- RN-059: No existe un máximo funcional de coordinaciones seleccionables por evento; se permiten todas las coordinaciones activas existentes y el backend continúa validando IDs únicos y canónicos.
- RN-060: Cada correo tiene un intento inicial inmediato y hasta tres reintentos después de 5 minutos, 30 minutos y 2 horas; al agotar el cuarto intento queda en fallo permanente.
- RN-061: Un error SMTP permanente no consume reintentos innecesarios y deja el envío en fallo permanente con un código sanitizado.
- RN-062: Los registros técnicos de notificación se purgan 90 días después de alcanzar `enviado` o fallo permanente; esta purga no elimina el evento ni su historial funcional.
- RN-063: Al reemplazar un PDF, primero se confirma la nueva referencia y después se elimina el archivo anterior. Un archivo cargado que no quede referenciado se considera huérfano y se purga después de 24 horas.
- RN-064: El listado de Eventos usa páginas de 25 registros y cursores de Firestore; no descarga la colección completa para simular páginas.
- RN-065: El catálogo administrativo admite como máximo 500 coordinaciones en esta versión. Las listas nunca devuelven resultados parciales; al excederlo se exige una nueva estrategia de consulta aprobada.

## Consultas

- RN-028: Usuarios se buscan por nombre o correo.
- RN-029: Eventos se buscan por nombre o responsable.
- RN-030: Los listados son paginados visualmente.
- RN-031: El Dashboard muestra datos reales, no valores simulados.

## Restricciones de migración

- RN-032: No se cambiará el modelo de datos durante la migración inicial.
- RN-033: No se crearán funcionalidades ausentes sin una spec aprobada.
- RN-034: Las correcciones de seguridad pueden cambiar el mecanismo técnico, pero no los permisos funcionales aprobados.
