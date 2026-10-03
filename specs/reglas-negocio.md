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
- RN-010: `usuario` puede consultar y crear eventos, y modificar o cancelar únicamente los que creó.

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
- RN-021: Los eventos nuevos usan `programado` como valor persistido inicial; su estado temporal visible se deriva de los instantes canónicos de inicio y fin.
- RN-022: `registrado` es un valor histórico equivalente visualmente a `programado`; `en_proceso` y `finalizado` históricos no obligan a realizar escrituras programadas y se recalculan cuando existan fechas válidas.
- RN-023: Solo el creador puede editar o cancelar un evento.
- RN-024: Un evento se guarda en Firestore antes de ejecutar Calendar y correo.
- RN-025: La creación debe procesar Calendar y correo mediante operaciones backend independientes e idempotentes.
- RN-026: La edición debe sincronizar Google Calendar y generar correo cuando cambien nombre, fecha, horario o coordinaciones.
- RN-027: La cancelación debe retirar Calendar y PDF de forma idempotente, cancelar o conservar la logística de reservas según su etapa, crear las notificaciones correspondientes y preservar en Firestore un registro histórico de solo lectura con `estatus: cancelado`.

## Coordinaciones

- RN-041: Solo `admin` puede listar el catálogo completo, crear, editar, activar, suspender o eliminar coordinaciones.
- RN-042: El nombre de una coordinación se normaliza para validar unicidad sin distinguir mayúsculas, minúsculas ni espacios exteriores.
- RN-043: Una coordinación activa requiere entre 1 y 10 correos institucionales válidos; los correos se normalizan y no se repiten dentro de la misma coordinación. Una coordinación suspendida puede conservar de 0 a 10 correos.
- RN-044: Una coordinación suspendida no puede seleccionarse en eventos nuevos, pero conserva sus datos y referencias históricas.
- RN-045: Una coordinación marcada como utilizada por al menos un evento no puede eliminarse; únicamente puede suspenderse.
- RN-046: Los contactos de Coordinaciones reciben notificaciones, pero no adquieren acceso al sistema ni se convierten en asistentes de Google Calendar.

## Campus

- RN-CAM-001: Solo `admin` administra el catálogo completo de campus.
- RN-CAM-002: Nombre y clave son obligatorios y únicos; la clave se normaliza a mayúsculas.
- RN-CAM-003: Dirección y referencia son opcionales y pueden completarse después.
- RN-CAM-004: Domingo es inactivo. Un día operativo exige inicio y fin válidos con fin posterior.
- RN-CAM-005: Un campus activo requiere al menos un día operativo entre lunes y sábado.
- RN-CAM-006: Un campus utilizado no puede eliminarse; solo suspenderse.
- RN-CAM-007: Suspender no modifica referencias históricas ni consumidores existentes.
- RN-CAM-008: Los usuarios autorizados reciben únicamente el catálogo activo sanitizado.
- RN-CAM-009: La clave de un campus utilizado queda inmutable.
- RN-CAM-010: El catálogo admite como máximo técnico 100 campus en esta versión y nunca devuelve resultados parciales.

## Coordinaciones involucradas y notificaciones

- RN-047: Seleccionar coordinaciones en un evento es opcional; sin coordinaciones, el creador continúa siendo destinatario obligatorio.
- RN-048: El cliente envía solo IDs de coordinaciones. El backend valida que sean únicos, existentes y activos y guarda una fotografía con ID y nombre.
- RN-049: Al crear un evento se notifica individualmente al creador y a cada correo institucional de las coordinaciones seleccionadas, eliminando duplicados globales.
- RN-050: Cambiar nombre, fecha, horario o coordinaciones notifica al creador y a los contactos vigentes de las coordinaciones que continúan o se agregan.
- RN-051: Retirar una coordinación durante la edición genera un aviso específico para sus destinatarios previamente notificados y sus contactos vigentes, sin duplicados.
- RN-052: Cancelar un evento genera aviso para el creador y para la unión de destinatarios previamente notificados y contactos vigentes de las coordinaciones involucradas.
- RN-053: Modificar únicamente observaciones, equipamiento permitido o protocolo no genera correo, salvo que la misma operación cambie un dato definido en RN-050. El estado temporal no es editable.
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
- RN-082: Antes de abrir SMTP, un destinatario debe estar en `allowedRecipients` del ambiente o proceder de un trabajo protegido cuyo `destinatarioTipo` sea `coordinacion` o `sistemas`, tenga `coordinacionId` canónico y use exactamente el dominio institucional. La segunda vía conserva la autorización fotografiada al crear el trabajo, incluso si la coordinación se suspende o sus contactos cambian antes de un reintento; nunca autoriza correos libres, externos o proporcionados por el cliente.
- RN-066: Un evento nuevo debe registrarse a más tardar cinco fechas naturales antes de su fecha local de inicio en `America/Cancun`; el día límite se acepta completo hasta las 23:59:59 y no existe excepción administrativa en esta versión.
- RN-067: Un evento puede durar como máximo seis fechas operativas consecutivas, pertenece a un solo campus y se representa como un intervalo continuo; no puede iniciar, terminar ni transcurrir en domingo.
- RN-068: En un evento de varios días los equipos permanecen montados, reservados y no reutilizables durante las noches; montaje se calcula antes del primer inicio y desmontaje y regreso después del último fin.
- RN-069: El estado temporal visible se deriva en `America/Cancun`: antes del inicio es `programado`, desde el inicio y antes del fin es `en_ejecucion`, y desde el fin es `finalizado`; `cancelado` es persistido y prevalece sobre el cálculo temporal.
- RN-070: El estado temporal no puede editarse manualmente ni requiere una escritura al cruzar sus límites. Backend usa hora de servidor; las respuestas de consulta entregan una referencia `serverNow` y la interfaz vuelve a calcular desde esa referencia al cargar, navegar y alcanzar la siguiente transición.
- RN-071: Después del día límite de cinco días se permiten correcciones de nombre u observaciones, cambios de coordinaciones, retirar equipos, reducir cantidades y cancelar; se prohíbe agregar equipos, aumentar cantidades, cambiar campus o adelantar el inicio a una fecha que incumpla la anticipación.
- RN-072: Posponer un evento después del día límite solo es válido cuando la nueva fecha de inicio vuelve a cumplir cinco días naturales desde la fecha de servidor en `America/Cancun`.
- RN-073: La vista calendario de Eventos usa Firestore como fuente canónica mediante un contrato autorizado por intervalo visible; Google Calendar no es su fuente de lectura.
- RN-074: La primera versión del calendario es de solo lectura para fechas y duración: no permite crear por selección, arrastrar, redimensionar ni cambiar campus. Seleccionar un evento abre el detalle y conserva las reglas de propiedad para editar o cancelar.
- RN-075: El calendario ofrece mes, semana, día y lista, consulta únicamente el rango visible, representa eventos que atraviesan el rango y proporciona texto accesible de fecha, horario, campus y estado sin depender solo del color.
- RN-076: La búsqueda global de Eventos consulta Firestore en páginas de 25 mediante `terminosBusqueda` calculados por backend; admite prefijos normalizados de evento o responsable y nunca descarga el historial completo.
- RN-077: El detalle editable procede de una proyección backend sanitizada. Solo el propietario ve y ejecuta edición o cancelación; un evento cancelado permanece de solo lectura.
- RN-078: `calendarEstado` y `notificacionesEstado` comunican únicamente estados funcionales. No exponen errores técnicos, secretos, contactos ni claves idempotentes.
- RN-079: Eventos históricos solo reciben `inicioAt`, `finAt` y `terminosBusqueda` mediante un backfill explícito, reanudable y probado primero en modo seco; no se crean reservas, Calendar o correos durante ese proceso.
- RN-080: La limpieza de protocolos comprueba `protocoloRuta` canónica antes de borrar; antigüedad por sí sola nunca autoriza eliminación.
- RN-081: La previsualización de disponibilidad durante una edición excluye únicamente las reservas activas del mismo evento después de validar en backend que el solicitante es su propietario y que no está cancelado. Las reservas de cualquier otro evento continúan consumiendo capacidad y la mutación final vuelve a calcular todo de forma transaccional.

## Equipos

- RN-EQP-001: Solo `admin` administra el catálogo completo de Equipos.
- RN-EQP-002: El inventario se registra como cantidad agrupada por nombre y campus base, sin unidades serializadas.
- RN-EQP-003: Nombre normalizado y campus base forman una combinación única.
- RN-EQP-004: La cantidad operativa es entera de 0 a 999; un equipo activo requiere al menos una unidad.
- RN-EQP-005: Un equipo fijo no tiene destinos. Un transferible exige al menos un campus destino activo, único y diferente del campus base.
- RN-EQP-006: Agregar un campus no autoriza automáticamente el traslado de equipos existentes hacia él.
- RN-EQP-007: Un equipo utilizado no se elimina y su campus base queda inmutable; solo puede suspenderse o modificarse dentro de las restricciones vigentes.
- RN-EQP-008: Suspender impide nuevas selecciones sin eliminar reservaciones ni fotografías históricas.
- RN-EQP-009: `cantidadDisponible` se calcula; no se almacena como estado canónico mutable.
- RN-EQP-010: El catálogo administrativo admite un máximo técnico de 500 registros y nunca devuelve resultados parciales.
- RN-EQP-011: El catálogo sanitizado no expone cantidades administrativas, uso ni timestamps y no constituye confirmación de disponibilidad.

## Reservaciones y logística de Equipos — implementación autorizada

- RN-RES-001: Una solicitud confirma todos los equipos y cantidades o ninguno; no existen asignaciones parciales.
- RN-RES-002: La disponibilidad resta las cantidades de reservas coincidentes en estado `confirmada` o `requiere_revision`.
- RN-RES-003: Equipo local se bloquea 60 minutos antes y se libera 30 minutos después del evento.
- RN-RES-004: Equipo transferido se bloquea desde la salida del campus base hasta su liberación de regreso.
- RN-RES-005: La salida regular ocurre a las 17:00 del día operativo anterior que permita completar recepción; después del corte no se confirma equipo remoto.
- RN-RES-006: TUP–FCS usa 30 minutos. Un tercer campus requiere política aprobada antes de aceptar destinos.
- RN-RES-007: El regreso comienza al cierre operativo del destino o en la siguiente ventana válida y se libera 60 minutos después, salvo recepción anticipada o demora administrativa.
- RN-RES-008: Una demora exige nueva fecha y hora estimada y sustituye la liberación automática previa.
- RN-RES-009: El equipo que espera regreso no puede reutilizarse en el campus destino.
- RN-RES-010: Cancelar después de la salida conserva la ventana de regreso.
- RN-RES-011: Cobertura de Sistemas usa `no_requerida`, `pendiente` o `confirmada`; quedar pendiente no bloquea inventario y solo `admin` confirma.
- RN-RES-012: La coordinación de Sistemas se referencia por ID canónico desde Coordinaciones; no se localiza por texto ni recibe correos desde el cliente.
- RN-RES-013: Reducir inventario por debajo de compromisos marca reservas afectadas `requiere_revision`, notifica a Sistemas y no cancela ni reasigna silenciosamente.
- RN-RES-014: Cambiar fecha, horario, campus, equipos o cantidades recalcula la solicitud completa; si el nuevo estado falla, se conserva el anterior.
- RN-RES-015: No se aceptan eventos que inicien, terminen o transcurran en domingo.
- RN-RES-016: Un evento admite como máximo 20 tipos distintos de equipo; cada ID es único y cada cantidad es un entero positivo.
- RN-RES-017: Crear, sustituir, reducir, cancelar o finalizar reservaciones actualiza en una sola transacción el evento, todas sus reservas, las marcas de uso y un documento de control por equipo; si cualquier validación falla, no se aplica ninguna escritura.
- RN-RES-018: El documento `controlReservasEquipo/{equipoId}` solo fuerza concurrencia mediante una versión monotónica; nunca almacena ni representa cantidad disponible.
- RN-RES-019: Una transacción concurrente reintenta con estado canónico actualizado. Si agota reintentos, falla de forma recuperable y conserva íntegro el estado anterior.
- RN-RES-020: `motivosRevision` conserva causas independientes. Confirmar cobertura retira únicamente `cobertura_sistemas` y no oculta revisiones por inventario o coordinación.
- RN-RES-021: Solo `admin` confirma cobertura o recepción y reporta demora. Recepción anticipada finaliza y libera la reserva; demora extiende `bloqueoFin` y `liberacionProgramada`; ambas operaciones incrementan el control del equipo.
- RN-RES-022: Las acciones logísticas son idempotentes, usan hora de servidor y registran auditoría estructurada sin correos ni secretos.
- RN-RES-023: Los avisos logísticos usan `notificacionesEventos` con `tipo: logistica`, destinatarios resueltos desde la coordinación canónica de Sistemas y clave idempotente por evento, equipo, motivo, versión de origen de esa causa y correo. `versionesAvisoLogistico` impide que actualizar una causa reenvíe las demás. Se generan por cobertura pendiente, inventario reducido, cambio incompatible posterior al traslado, demora y cancelación posterior a la salida; nunca convierten a esos contactos en asistentes de Calendar.
- RN-RES-024: Mientras el formulario de Evento permanezca abierto con un intervalo válido, la previsualización de disponibilidad se actualiza al recuperar foco o visibilidad y periódicamente mientras la pestaña esté visible. Un cambio externo nunca modifica cantidades silenciosamente: conserva la captura, marca el conflicto, lo anuncia y mantiene la revalidación transaccional final.

## Consultas

- RN-028: Usuarios se buscan por nombre o correo.
- RN-029: Eventos se buscan por nombre o responsable.
- RN-030: Los listados son paginados visualmente.
- RN-031: El Dashboard muestra datos reales, no valores simulados.
- RN-DASH-001: `admin` y `usuario` autorizados consultan el mismo resumen sanitizado; el conteo de usuarios activos no concede lectura de documentos individuales.
- RN-DASH-002: Eventos registrados cuenta todos los documentos, incluidos cancelados como historial.
- RN-DASH-003: Próximos eventos incluye únicamente no cancelados con inicio desde la hora de servidor y antes de los siguientes 30 días en `America/Cancun`.
- RN-DASH-004: La tabla de próximos devuelve como máximo cinco eventos ordenados por inicio ascendente.
- RN-DASH-005: Usuarios activos cuenta exclusivamente documentos con `activo: true` mediante agregación backend.
- RN-DASH-006: Eventos con protocolo cuenta referencias `protocoloUrl` de cadena no vacía; no inspecciona Storage desde Angular.
- RN-DASH-007: Actividad reciente deriva como máximo cinco creaciones o actualizaciones de `fechaCreacion` y `fechaActualizacion`; una cancelación se presenta como actualización, no como auditoría independiente.
- RN-DASH-008: Los estados temporales del Dashboard usan la misma derivación backend de Eventos y la referencia `serverNow`; el navegador no decide los KPI.
- RN-DASH-009: Un fallo parcial muestra la sección como no disponible y conserva las demás; ausencia de datos se representa como cero o lista vacía solo cuando la consulta canónica aprobó.

## Restricciones de migración

- RN-032: No se cambiará el modelo de datos durante la migración inicial.
- RN-033: No se crearán funcionalidades ausentes sin una spec aprobada.
- RN-034: Las correcciones de seguridad pueden cambiar el mecanismo técnico, pero no los permisos funcionales aprobados.
