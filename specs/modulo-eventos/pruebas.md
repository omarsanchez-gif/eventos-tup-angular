# Pruebas: Eventos

## Estado

Casos redefinidos para Coordinaciones y notificaciones. No existe evidencia de implementación Angular.

## Acceso y propiedad

### EVT-001 — Usuario autorizado abre Eventos

Admin y usuario autorizados abren `/eventos`; anónimo o sesión sin autorización se redirigen y no leen datos.

### EVT-002 — Crear con identidad manipulada

Backend ignora UID, correo o responsable enviados y usa el perfil canónico.

### EVT-003 — Editar o eliminar ajeno

UI no ofrece la acción y backend responde `permission-denied` sin cambios.

## Formulario y PDF

### EVT-004 — Crear válido sin coordinaciones

Crea con arrays vacíos, revisión 1, PDF y creador canónico; genera correo solo al creador.

### EVT-005 — Crear válido con varias coordinaciones

Guarda IDs únicos y fotografía canónica, marca cada coordinación utilizada y prepara creador más contactos.

### EVT-006 — Coordinación inactiva o inexistente

Backend rechaza sin guardar el evento ni enviar correo.

### EVT-007 — Correos enviados por cliente

Payload con correos o nombres de coordinación adicionales se rechaza; nunca define destinatarios.

### EVT-008 — PDF faltante, inválido o de 10 MiB o más

Se rechaza antes de crear el evento.

### EVT-009 — Fechas y horas inválidas

Se rechazan rangos cuyo fin sea anterior al inicio.

### EVT-010 — Evento histórico

Documento sin campos de Coordinaciones se muestra con arrays vacíos y revisión 0.

## Calendar y creación

### EVT-011 — Calendar institucional

Crea una sola entrada con zona America/Cancun y guarda `calendarEventId`.

### EVT-012 — Sin asistentes

La petición Calendar no contiene correos de coordinaciones en `attendees`.

### EVT-013 — Reintento de Calendar

Repetir integración no crea un segundo evento si ya existe ID; si Calendar responde ausente, se recrea una sola vez.

### EVT-014 — Fallo Calendar después de Firestore

El evento permanece, se informa integración parcial y puede reconciliarse.

## Notificación de creación

### EVT-015 — Creador obligatorio

El creador recibe exactamente un trabajo `creacion`.

### EVT-016 — Coordinaciones involucradas

Cada correo vigente recibe un trabajo individual sin conocer otros destinatarios.

### EVT-017 — Duplicados globales

El mismo correo como creador o en varias coordinaciones recibe un solo mensaje por tipo y revisión.

### EVT-018 — Correo externo almacenado por manipulación

Backend rechaza la coordinación inválida o el contacto externo antes de crear trabajos.

### EVT-019 — Fallo SMTP parcial

Los enviados permanecen `enviado`; los fallidos quedan disponibles para reintento y el evento no se revierte.

### EVT-020 — Reintento de correo

Reprocesar la misma revisión no vuelve a enviar destinatarios confirmados.

## Edición

### EVT-021 — Cambio de nombre, fecha u horario

Actualiza Calendar, incrementa revisión una vez y genera `actualizacion` para creador y coordinaciones conservadas.

### EVT-022 — Agregar coordinación

Exige activa, guarda fotografía, marca utilizada y notifica contactos vigentes.

### EVT-023 — Conservar coordinación suspendida

Permite mantenerla en el evento y muestra “Suspendida”; no puede agregarse a otro evento nuevo.

### EVT-024 — Retirar coordinación

Genera `retiro_coordinacion` para destinatarios previamente notificados y contactos vigentes sin duplicados.

### EVT-025 — Editar solo observaciones, equipo, estatus o PDF

No incrementa revisión ni genera correo si ningún dato notificable cambió.

### EVT-026 — Contactos cambiados

La siguiente actualización usa contactos vigentes; no genera correo por el solo hecho de editar la coordinación.

### EVT-027 — Reintento de edición

No incrementa de nuevo la revisión ni duplica trabajos para el mismo estado objetivo.

## Eliminación y cancelación

### EVT-028 — Eliminar válido

Retira Calendar y PDF y crea cancelaciones antes de eliminar Firestore.

### EVT-029 — Destinatarios de cancelación

Incluye creador, previamente notificados y contactos vigentes aplicables, deduplicados.

### EVT-030 — Evento eliminado antes de enviar

Cada trabajo conserva datos suficientes para entregar cancelación sin leer el evento.

### EVT-031 — Fallo Calendar o PDF

No elimina Firestore ni crea una cancelación falsa; permite reintento idempotente.

### EVT-032 — Fallo SMTP de cancelación

Evento puede quedar eliminado con trabajo fallido recuperable; el fallo no recrea evento, Calendar o PDF.

### EVT-033 — Coordinación utilizada

Eliminar el evento no restaura `utilizada: false`.

## Seguridad y privacidad

### EVT-034 — Lectura de evento

Usuario autorizado ve nombres fotografiados, pero no correos ni registros de entrega.

### EVT-035 — Bandeja de salida

Admin, usuario, sesión sin claims y anónimo no pueden leer o escribir `notificacionesEventos` directamente.

### EVT-036 — Worker restringido

Solo procesa estados válidos y no acepta trabajos fabricados por cliente.

### EVT-037 — Logs sanitizados

No contienen credenciales, cuerpo completo ni lista completa de destinatarios.

## UI, accesibilidad y responsive

### EVT-038 — Selector múltiple

Permite buscar, seleccionar y retirar coordinaciones por teclado con nombres accesibles.

### EVT-039 — Selección opcional

El formulario válido puede enviarse sin coordinaciones.

### EVT-040 — Estados parciales

La UI distingue guardado, Calendar pendiente y correos pendientes sin afirmar éxito total falso.

### EVT-041 — Responsive

Listado, detalle, formulario y acciones funcionan desde 320 px sin desplazamiento global.

### EVT-042 — Diálogos y foco

Detalle, edición y eliminación contienen y restauran foco conforme a WCAG 2.2 AA.

### EVT-043 — Correo presente en coordinación retirada y conservada

Recibe una actualización y no un aviso contradictorio de retiro.

### EVT-044 — Selección sin límite funcional

El formulario y backend aceptan todas las coordinaciones activas disponibles, sin truncar silenciosamente la selección ni aceptar IDs duplicados.

### EVT-045 — Calendario de reintentos SMTP

Un fallo temporal ejecuta el intento inicial y programa reintentos a los 5 minutos, 30 minutos y 2 horas; después del cuarto fallo queda permanente y `proximoIntento` es `null`.

### EVT-046 — Rechazo SMTP permanente

Un rechazo clasificado como permanente no programa nuevos intentos, conserva un código sanitizado y no revierte Evento, PDF o Calendar.

### EVT-047 — Retención de notificaciones

Un registro terminal calcula `fechaExpiracion` 90 días después de `fechaFinalizacion`; la purga elimina solo el registro técnico y conserva el evento.

### EVT-048 — Reemplazo y huérfanos PDF

La referencia nueva se confirma antes de eliminar el PDF anterior. Una carga nueva no referenciada se elimina inmediatamente o mediante la purga posterior a 24 horas, sin afectar PDFs canónicos o históricos.

### EVT-049 — Paginación por cursor

Cada consulta devuelve como máximo 25 eventos en orden determinista; avanzar y retroceder con cursores no repite ni omite registros y no descarga la colección completa.

### EVT-050 — Recursos controlados de staging

Calendar usa el calendario sintético y SMTP solo entrega a la lista permitida; ningún contacto real ni recurso de producción recibe efectos durante la aceptación.

## Campus, Equipos y reservaciones

### EVT-051 — Campus canónico

Solo permite campus activo y guarda ID, nombre y dirección históricos desde backend.

### EVT-052 — Catálogo dinámico

Después de capturar campus, fecha y horario muestra equipos aplicables sin usar el objeto fijo histórico como catálogo.

### EVT-053 — Disponibilidad por intervalo

Muestra cantidades calculadas para la ventana completa; el catálogo sanitizado por sí solo no se presenta como disponibilidad.

### EVT-054 — Reserva completa

Varios equipos y cantidades se confirman todos o ninguno; un fallo no deja documentos parciales.

### EVT-055 — Concurrencia

Dos eventos simultáneos no pueden superar la cantidad operativa aunque se confirmen concurrentemente.

### EVT-056 — Corte de traslado

Después del corte correspondiente, equipo remoto queda no disponible y equipo local válido continúa seleccionable.

### EVT-057 — Edición con nueva disponibilidad

Cambiar fecha, horario, campus, equipos o cantidades conserva la reserva anterior cuando el estado nuevo no puede confirmarse.

### EVT-058 — Domingo

Rechaza un evento que inicie, termine o transcurra en domingo desde frontend y backend.

### EVT-059 — Eliminación con equipo local

Cancela reservas locales y libera capacidad sin restaurar marcas históricas de uso.

### EVT-060 — Eliminación después del traslado

El evento puede eliminarse, pero el registro logístico conserva la ventana de regreso hasta liberar el equipo en su campus base.

## Evidencia requerida

- Unitarias Angular y Functions.
- Auth/Firestore/Storage Emulator.
- Pruebas Rules para propiedad, catálogos y bandeja protegida.
- Dobles de Calendar y SMTP con fallos parciales y reintentos.
- Concurrencia de revisiones, idempotencia y uso de coordinación.
- Concurrencia de inventario, reserva atómica, traslado y compatibilidad del objeto histórico `equipos`.
- Recorrido manual accesible y responsive.
- Staging con calendario y SMTP sintéticos; nunca producción.
