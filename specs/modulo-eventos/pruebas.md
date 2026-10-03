# Pruebas: Eventos

## Estado

Casos redefinidos para Coordinaciones y notificaciones y ampliados el 28 de septiembre de 2026 con anticipación, eventos multidiarios, estados derivados y FullCalendar. El 30 de septiembre se obtuvo evidencia local de creación, disponibilidad, búsqueda, detalle, edición, cancelación, logística administrativa, integraciones con dobles, leases, limpieza, backfill, concurrencia, Rules y experiencia Angular; además se desplegaron secretos, configuración, Rules, Functions y Hosting únicamente a staging. El 1 de octubre se verificaron una entrega SMTP permitida y la creación/reconciliación real de `PRUEBA 1` en Calendar sin duplicar el correo. La aceptación manual, la actualización y cancelación externas, el rechazo SMTP fuera de lista y la ejecución exhaustiva de toda la matriz EVT-001 a EVT-102 continúan pendientes.

### Evidencia automatizada disponible

- 71 pruebas unitarias de Functions aprobadas, incluidas tiempo, creación, consultas, protocolo PDF, disponibilidad de edición y adaptadores de Calendar/SMTP.
- 14 pruebas específicas con Firestore Emulator aprobadas para concurrencia, todos-o-ninguno, versión monotónica, búsqueda, detalle, edición, exclusión segura de reserva propia, cancelación, logística, avisos a Sistemas, leases, backfill y limpieza.
- 15 pruebas de Firestore y Storage Rules aprobadas; el cliente no escribe Eventos ni lee reservas, controles, notificaciones o configuración.
- 63 pruebas Angular aprobadas, incluidas la transición temporal automática, la propagación del `eventId` al abrir una edición, la actualización anunciada al recuperar foco y las acciones/visibilidad por rol del listado; compilación TypeScript de Functions, lint completo, formato y build Angular de staging aprobados.
- La evidencia automatizada vigente suma 191 pruebas aprobadas: 63 Angular, 71 Functions, 42 de emuladores funcionales y 15 de Rules.
- Las pruebas no acreditan todavía aceptación visual, teclado, lector de pantalla, integraciones reales ni despliegue; edición y cancelación sí cuentan con evidencia automatizada local.

## Acceso y propiedad

### EVT-001 — Usuario autorizado abre Eventos

Admin y usuario autorizados abren `/eventos`; anónimo o sesión sin autorización se redirigen y no leen datos.

### EVT-002 — Crear con identidad manipulada

Backend ignora UID, correo o responsable enviados y usa el perfil canónico.

### EVT-003 — Editar o cancelar ajeno

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

### EVT-025 — Editar solo observaciones, equipo permitido o PDF

No incrementa revisión ni genera correo si ningún dato notificable cambió.

### EVT-026 — Contactos cambiados

La siguiente actualización usa contactos vigentes; no genera correo por el solo hecho de editar la coordinación.

### EVT-027 — Reintento de edición

No incrementa de nuevo la revisión ni duplica trabajos para el mismo estado objetivo.

## Cancelación e historial

### EVT-028 — Cancelar válido

Retira Calendar y PDF, resuelve reservas, crea trabajos de cancelación y conserva Firestore con estado `cancelado` y metadatos canónicos.

### EVT-029 — Destinatarios de cancelación

Incluye creador, previamente notificados y contactos vigentes aplicables, deduplicados.

### EVT-030 — Evento cancelado antes de enviar

Cada trabajo conserva datos suficientes para entregar cancelación sin leer el evento.

### EVT-031 — Fallo Calendar o PDF durante cancelación

No finaliza falsamente la cancelación ni pierde Firestore; permite reintento idempotente.

### EVT-032 — Fallo SMTP de cancelación

Evento permanece cancelado con trabajo fallido recuperable; el fallo no reactiva evento, Calendar o PDF.

### EVT-033 — Coordinación utilizada

Cancelar el evento no restaura `utilizada: false`.

## Seguridad y privacidad

### EVT-034 — Lectura de evento

Usuario autorizado ve nombres fotografiados, pero no correos ni registros de entrega.

### EVT-035 — Bandeja de salida

Admin, usuario, sesión sin claims y anónimo no pueden leer o escribir `notificacionesEventos` directamente.

### EVT-099A — Avisos logísticos idempotentes

Cobertura pendiente, demora, inventario reducido, cambio incompatible y cancelación posterior a la salida crean trabajos `tipo: logistica` únicamente para los correos de la coordinación canónica de Sistemas. Reconciliar otra vez sin cambiar la versión de origen de esa causa no duplica trabajos; una nueva ocurrencia obtiene otra versión sin repetir los demás motivos vigentes. Estos trabajos no incrementan `revisionNotificacion` ni reenvían la actualización funcional a creador y coordinaciones.

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

Detalle, edición y cancelación contienen y restauran foco conforme a WCAG 2.2 AA.

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

Calendar usa el calendario institucional compartido de staging. SMTP entrega a las cuentas de la lista fija y a contactos del dominio institucional cuya procedencia canónica de Coordinaciones quede fotografiada en un trabajo protegido; creadores fuera de la lista fija, direcciones externas, correos libres y trabajos sin coordinación canónica permanecen bloqueados. Ningún recurso de producción recibe efectos durante la aceptación.

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

### EVT-059 — Cancelación con equipo local

Cancela reservas locales y libera capacidad sin restaurar marcas históricas de uso.

### EVT-060 — Cancelación después del traslado

El evento queda cancelado, pero el registro logístico conserva la ventana de regreso hasta liberar el equipo en su campus base.

## Anticipación y eventos multidiarios

### EVT-061 — Día límite incluido

En `America/Cancun`, durante toda la fecha 15 se puede crear un evento cuyo inicio local es el día 20, independientemente de su hora.

### EVT-062 — Anticipación insuficiente

Desde el día 16, frontend informa la restricción y backend rechaza el mismo evento con `event-advance-required`, incluido `admin`.

### EVT-063 — Formulario abierto antes del corte

Si el formulario se abrió el día permitido pero se envía después de cambiar la fecha local del servidor, backend vuelve a calcular y rechaza sin PDF huérfano, evento, reserva o notificación.

### EVT-064 — Evento multidiario válido

Acepta un intervalo continuo de lunes a sábado, en un solo campus, y Calendar recibe una sola entrada.

### EVT-065 — Duración excedida

Rechaza más de seis fechas operativas consecutivas con `event-duration-exceeded` sin efectos parciales.

### EVT-066 — Domingo intermedio

Rechaza sábado a lunes aunque inicio y fin no tengan una hora en domingo, porque el intervalo lo atraviesa.

### EVT-067 — Equipo montado durante las noches

Un evento de lunes a miércoles mantiene la capacidad consumida sin huecos desde el montaje previo hasta el desmontaje o regreso posterior.

### EVT-068 — Un solo campus

Formulario y backend no aceptan campus diferentes por jornada ni cambios de campus dentro de un mismo intervalo.

### EVT-069 — Ediciones permitidas después del límite

Permite nombre, observaciones, coordinaciones, retirar equipo, reducir cantidades y cancelar, conservando notificaciones y logística aplicables.

### EVT-070 — Ediciones restringidas después del límite

Rechaza agregar equipo, aumentar cantidades, cambiar campus o adelantar a una fecha inválida aunque el payload manipulado lo solicite.

### EVT-071 — Posposición válida

Después del límite permite posponer solo si la nueva fecha vuelve a cumplir cinco fechas naturales desde la fecha backend de la edición.

## Estado temporal automático

### EVT-072 — Programado antes del inicio

Un evento no cancelado se presenta `Programado` hasta el instante anterior a `inicioAt`.

### EVT-073 — En ejecución desde el inicio

Al alcanzar `inicioAt` cambia visualmente a `En ejecución` sin escribir el documento ni recargar la aplicación.

### EVT-074 — Finalizado exactamente al terminar

Al alcanzar `finAt` cambia a `Finalizado`; un evento de 12:00 a 14:00 ya está finalizado a las 14:00 y continúa así a las 16:00.

### EVT-075 — Multidiario durante la noche

Desde el primer inicio hasta el último fin permanece `En ejecución`, incluidas todas las noches intermedias.

### EVT-076 — Cancelado prevalece

Un evento cancelado se presenta `Cancelado` antes, durante o después de su intervalo y no ofrece edición o reactivación.

### EVT-077 — Separación de logística

Un evento puede estar `Finalizado` mientras equipo local sigue en desmontaje o equipo transferido continúa bloqueado; la UI no confunde ambos estados.

### EVT-078 — Hora autoritativa

Backend decide con hora de servidor y `America/Cancun`; la UI usa `serverNow` como referencia. Alterar reloj o zona del navegador no adelanta el estado visible autoritativo ni permite crear, editar o reservar fuera de reglas.

### EVT-079 — Histórico con fechas completas

Deriva estado desde campos locales históricos válidos sin escribir un backfill automático.

### EVT-080 — Histórico incompleto

Conserva presentación compatible del estatus conocido, muestra revisión necesaria y no inventa instantes.

## Calendario administrativo

### EVT-081 — Acceso y rutas

Admin y usuario autorizados abren `/eventos/calendario`; anónimo o no autorizado no recibe datos.

### EVT-082 — Vistas y zona

Mes, semana, día y lista muestran textos en español y fechas consistentes en `America/Cancun`; móvil prioriza lista.

### EVT-083 — Consulta por intervalo visible

Cada navegación solicita como máximo 42 fechas, incluye eventos que se superponen aunque inicien antes del rango y no descarga el historial completo.

### EVT-084 — Firestore canónico

El calendario sigue mostrando el evento canónico ante un fallo o diferencia de Google Calendar y no consulta feeds públicos o credenciales Google.

### EVT-085 — Solo lectura y propiedad

No permite crear por selección, arrastrar ni redimensionar. Seleccionar abre detalle y solo el propietario ve editar o cancelar.

### EVT-086 — Accesibilidad y estados

Los eventos son alcanzables por teclado, tienen nombre accesible con nombre, fecha, horario, campus y estado, no dependen solo del color y la vista anuncia carga, vacío y error recuperable.

## Configuración segura de integraciones

### EVT-087 — Secretos ausentes del frontend y repositorio

Build Angular, archivos versionados, documentación y logs no contienen client secret, refresh token, contraseña SMTP ni valores completos de `GOOGLE_CALENDAR_CONFIG` o `SMTP_CONFIG`.

### EVT-088 — Secretos enlazados por Function

Cada Function de Calendar o SMTP declara únicamente el secreto que consume. Una Function no enlazada no puede leerlo y falla de forma cerrada con un error funcional sanitizado. Un secreto con dos JSON concatenados se rechaza antes de solicitar el token. La recuperación crea una versión con un único objeto, valida token y lectura del calendario sin exponer valores, redespliega solo consumidores y reconcilia sin duplicar Calendar ni correos ya enviados.

Evidencia de staging del 1 de octubre de 2026: las siete callables consumidoras quedaron enlazadas a `GOOGLE_CALENDAR_CONFIG` versión 2; la reconciliación autenticada persistió `calendarEstado: sincronizado`, conservó `notificacionesEstado: completas` y la bandeja protegida mantuvo un único trabajo `creacion/enviado` previo al reintento. Google Calendar devolvió la entrada `PRUEBA 1` como `confirmed` para el intervalo esperado. No se expusieron secretos ni identificadores externos completos.

### EVT-089 — Lista fija y procedencia permitida de staging

En `eventos-tup-angular-stg`, `omar.sanchez@tecplayacar.edu.mx`, `eventos@tecplayacar.edu.mx`, `victor.yama@tecplayacar.edu.mx` y `lizett.mendez@tecplayacar.edu.mx` forman la lista fija para creadores y cuentas operativas. Además, puede recibir un contacto fuera de esa lista cuando el backend lo resolvió desde Coordinaciones, el trabajo protegido conserva `destinatarioTipo: coordinacion | sistemas` y `coordinacionId` canónico, y el correo pertenece exactamente al dominio institucional. Cualquier otro destinatario se bloquea antes de SMTP, no se redirige y no se marca como enviado. Una configuración sin `allowedRecipients`, con tipo inválido, vacía o duplicada falla antes de crear el transporte; la prueba negativa inspecciona estado y logs sanitizados sin contactar cuentas no autorizadas.

Evidencia histórica del 1 de octubre de 2026: bajo la versión 2, `PRUEBA 2` revisión 3 envió el trabajo del creador y terminó el trabajo de coordinación con `recipient-not-allowed`, produciendo `parciales`. La versión 3 se creó con las cuatro direcciones exactas y las ocho Functions consumidoras se verificaron `ACTIVE` y enlazadas a esa versión. EVT-110 sustituyó esa restricción absoluta por la procedencia protegida descrita arriba, sin rotar el secreto, y el 3 de octubre se desplegaron las ocho Functions consumidoras en staging. Falta comprobar una entrega real a un contacto de Coordinaciones fuera de la lista fija; el trabajo terminal anterior no se reintenta automáticamente.

### EVT-090 — Configuración local no versionada

Las pruebas locales funcionan con dobles sin credenciales. Si se habilita una prueba real, usa `functions/.secret.local` y `functions/.env.local`, ambos ignorados por Git, y nunca toma secretos desde Angular.

## Atomicidad e índices aprobados

### EVT-091 — Máximo de equipos

Una solicitud con hasta 20 tipos distintos puede validarse; 21 tipos, IDs repetidos o cantidades no enteras positivas se rechazan sin evento ni reservas parciales.

### EVT-092 — Control de concurrencia sin reserva previa

Dos creaciones simultáneas para el mismo equipo, cuando la consulta inicial no devuelve reservas, escriben el mismo control. Una transacción se reintenta y ambas nunca exceden la cantidad operativa.

### EVT-093 — Sustitución atómica

Editar fecha, campus o equipos bloquea la unión ordenada de equipos anteriores y nuevos. Si cualquier reserva objetivo falla, evento y reservas anteriores permanecen sin cambios.

### EVT-093A — Disponibilidad al abrir edición

Abrir un evento con equipos ya reservados consulta disponibilidad con su `eventId`: las reservas activas propias no se descuentan, las reservas superpuestas de otros eventos sí y el formulario permite conservar cantidades válidas sin mostrar una indisponibilidad falsa. Crear no envía `eventId`. Un ID inexistente, ajeno o cancelado se rechaza y nunca permite ignorar capacidad; `updateEvent` vuelve a calcular el estado dentro de su transacción.

Evidencia del 1 de octubre de 2026: aprobaron la regresión Angular, las pruebas unitarias de Functions y la prueba con Firestore Emulator; `checkEventAvailability` y Hosting se desplegaron por separado únicamente a staging. Falta la aceptación autenticada en navegador abriendo un evento existente con equipo reservado.

### EVT-093B — Actualización del formulario abierto

Con un intervalo y equipos válidos, el formulario vuelve a consultar al recuperar foco o visibilidad y cada 30 segundos mientras la pestaña esté visible. Si otra pestaña consume capacidad, conserva las cantidades capturadas, actualiza “Disponibles”, marca el resumen no confirmable y anuncia el cambio mediante región viva. Durante la consulta conserva el resultado anterior, no solapa llamadas, no consulta con el documento oculto y detiene temporizadores al cerrar o destruir el componente. La confirmación backend continúa rechazando cualquier carrera posterior.

Evidencia del 1 de octubre de 2026: la prueba de componente simula una segunda respuesta que reduce la capacidad al recuperar foco, confirma la actualización a `Disponibles: 0`, el anuncio accesible y la conservación de la cantidad capturada. Las 59 pruebas Angular, lint completo, guardia visual, formato y build de staging aprobaron; después se publicó únicamente Hosting en staging. Falta la aceptación manual en dos pestañas.

### EVT-094 — Índices declarativos

Emulator Suite y staging ejecutan disponibilidad, calendario general, calendario por campus y listado paginado usando los índices declarados; una ausencia de índice falla en pruebas y no se resuelve descargando colecciones completas. La prueba remota de disponibilidad debe confirmar que Firestore utiliza el índice `reservasEquipo` en orden `equipoId`, `estado`, `bloqueoFin`, `bloqueoInicio` y no devuelve `FAILED_PRECONDITION`.

Las pruebas remotas de calendario deben confirmar por separado que la consulta general utiliza `finAt`, `inicioAt`, y que la consulta filtrada utiliza `campusId`, `finAt`, `inicioAt`. Ambos índices deben estar `READY`; cada consulta debe recuperar el intervalo superpuesto sin `FAILED_PRECONDITION` y sin descargar el historial completo.

Evidencia del 1 de octubre de 2026: los dos índices corregidos alcanzaron `READY`; la consulta general recuperó 8 documentos y la filtrada por un campus existente recuperó 6, ambas sin `FAILED_PRECONDITION`. Después se retiraron los dos índices de orden inverso y el inventario final quedó con siete índices compuestos, todos `READY`.

### EVT-095 — Búsqueda global paginada

Buscar desde cualquier página por prefijo normalizado de nombre o responsable devuelve hasta 25 coincidencias en creación descendente, admite acentos y mayúsculas equivalentes y no descarga el historial. Un carácter no consulta backend y cambiar el término invalida el cursor anterior.

### EVT-096 — Términos de búsqueda protegidos

Crear o editar genera términos únicos dentro del máximo aprobado. Un cliente no puede inyectar `terminosBusqueda`; históricos sin backfill continúan visibles en listado normal y el modo seco informa cuáles serían actualizados.

### EVT-097 — Motivos de revisión independientes

Una reserva con revisión de cobertura e inventario conserva `inventario_reducido` después de confirmar cobertura y no cambia falsamente a `confirmada`.

### EVT-098 — Recepción y demora concurrentes

Solo `admin` puede confirmar recepción o reportar demora. Ambas operaciones son idempotentes, incrementan el control y una carrera usa el estado canónico más reciente sin liberar equipo demorado ni extender uno ya recibido.

### EVT-099 — Lease exclusivo de SMTP

Dos workers concurrentes no envían el mismo trabajo. Un lease vigente excluye al segundo; un lease vencido se recupera; únicamente el envío confirmado cambia a `enviado`. El lote nunca supera 50.

### EVT-100 — Limpiezas seguras

Los registros recuperables conservan `fechaExpiracion: null`; los terminales reciben una fecha 90 días posterior y la política TTL está declarada en staging. La limpieza de Storage ignora archivos menores de 24 horas y referenciados por `protocoloRuta`, limita 1000 objetos y puede repetirse sin borrar el protocolo vigente.

### EVT-101 — Estados públicos de integración

Listado y detalle muestran estados funcionales coherentes durante éxito, fallo recuperable, fallo permanente y cancelación, sin correos, errores técnicos, leases o secretos.

### EVT-102 — Backfill controlado

El modo seco no escribe. La ejecución autorizada calcula únicamente instantes y términos de históricos completos, omite inválidos con reporte, admite reanudación y no crea reservas, Calendar o notificaciones.

### EVT-103 — Acciones directas y propiedad en el listado

El creador de un evento no cancelado ve en la columna `Acciones` los controles accesibles `Ver detalle`, `Editar evento` y `Cancelar evento`. Editar carga el detalle canónico y abre directamente el formulario; cancelar abre una confirmación que explica la conservación histórica y solo después invoca la operación. Para un evento ajeno o cancelado no se renderizan editar ni cancelar. En móvil se conservan las mismas acciones con texto. Backend vuelve a validar propiedad y estado en todos los casos.

### EVT-104 — Integraciones visibles solo para administradores

Con rol canónico `usuario`, el listado no renderiza el encabezado `Integración`, estados de Calendar ni estados de correo. Con rol `admin`, la columna y sus estados públicos sí aparecen. Cambiar el rol reactivo actualiza la vista sin depender de ocultamiento por CSS ni exponer datos técnicos.

Evidencia del 2 de octubre de 2026: los 6 casos del componente de listado y la regresión Angular completa de 63 pruebas aprobaron. También aprobaron lint Angular/Functions/visual, formato y build de staging. Después se publicó únicamente Hosting en staging y la URL respondió HTTP 200 con el bundle esperado; falta la aceptación autenticada por rol.

### EVT-105 — Composición visual administrativa normalizada

El listado de Eventos conserva el orden común de encabezado, alertas, controles, listado y diálogos. Sus superficies usan las primitivas compartidas `panel` y `alert`; el encabezado del listado usa separación de 16 px y relleno de 20 px; las tarjetas móviles agrupan acciones en `card-actions`; cada encabezado de tabla declara `scope="col"`; y los tooltips de acciones aparecen con puntero, `focus-within` o foco directo. El selector `Listado`/`Calendario` permanece como extensión funcional dentro del panel de controles y no altera colores, tipografía, radios, tamaños o estados compartidos. Debe aprobar `npm run lint:visual`, lint, formato, pruebas Angular y build de staging sin introducir cambios funcionales.

Evidencia del 2 de octubre de 2026: aprobaron la guardia visual, lint Angular/Functions, formato, build de staging y la regresión completa de 63 pruebas Angular en 17 archivos. Después se publicó únicamente Hosting en staging; la URL respondió HTTP 200 y entregó el bundle esperado `main-ACLYBD7D.js`. No se desplegaron servicios backend ni producción; la revisión visual autenticada y responsive permanece pendiente.

### EVT-106 — Ocupación multidiaria y presentación del calendario

Un evento del 12 al 15 de octubre se proyecta en FullCalendar como fecha completa con inicio inclusivo `2026-10-12` y fin exclusivo `2026-10-16`, por lo que cubre visualmente 12, 13, 14 y 15. Un evento de una sola fecha conserva sus instantes ISO y sigue siendo horario. El cálculo funciona también al cruzar fin de mes y no altera el objeto canónico recibido.

En vista mensual todos los eventos usan `display: block`, muestran nombre y estado, aplican el color semántico correspondiente y limitan filas por celda con acceso “más”. La cuadrícula, controles, día actual, leyenda, foco y vistas responsive consumen tokens del sistema de diseño y deben aprobar `npm run lint:visual`. Seleccionar por puntero o teclado conserva el mismo detalle con fechas y horas exactas.

Evidencia del 2 de octubre de 2026: tres pruebas nuevas aprobaron inicio inclusivo, fin exclusivo, conservación del evento horario y cruce de mes. La regresión completa quedó en 66 pruebas Angular distribuidas en 18 archivos; también aprobaron lint Angular/Functions, guardia visual, formato y build de staging. Después se publicó únicamente Hosting en staging; la URL respondió HTTP 200 y entregó `main-6DTMESSF.js`. No se desplegaron servicios backend ni producción; la aceptación visual autenticada permanece pendiente.

### EVT-107 — Compatibilidad visual con FullCalendar 7

La compilación incluye `skeleton.css`, `theme.css` y `palette.css` del tema Classic. La proyección usa `className`, `color` y `contrastColor` admitidos por FullCalendar 7, por lo que cada evento se presenta como bloque semántico y el multidiario conserva una franja continua. No existen personalizaciones dependientes de `.fc`, `.fc-event`, `.fc-popover` u otros selectores internos retirados. El panel de “más” conserva filas legibles sin superposición y limita su altura al viewport.

Evidencia del 2 de octubre de 2026: aprobaron 66 pruebas Angular en 18 archivos, lint Angular/Functions, guardia visual, formato y build de staging. La muestra aislada con los mismos assets y tokens midió 280 px para un evento del 12 al 15 sobre celdas de 71 px, comprobó texto blanco sobre fondo institucional y abrió seis filas separadas en un popover de 360 × 216 px con `overflow-y: auto` completamente dentro del viewport. Después se publicó únicamente Hosting de staging; la URL respondió HTTP 200 y entregó `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`. No se desplegaron Functions, Rules, índices, secretos, datos ni producción.

### EVT-108 — Sustitución segura del Calendar de staging

El calendario institucional adicional está compartido con `eventos@tecplayacar.edu.mx` con permiso para modificar eventos. El refresh token usa `calendar.events`; una lectura del endpoint de eventos debe aprobar antes de rotar el secreto. `GOOGLE_CALENDAR_CONFIG` conserva exactamente `clientId`, `clientSecret`, `refreshToken` y `calendarId`; ninguno se imprime, documenta o envía al cliente. Después de crear la versión nueva se redespliegan únicamente `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations` y `syncUpdatedEventIntegrations` a staging y las siete deben quedar `ACTIVE`.

Los eventos de prueba y `calendarEventId` del calendario desechable no se migran ni se reconcilian. La aceptación final crea un evento nuevo desde la aplicación y confirma exactamente una entrada en el calendario institucional; actualizar y cancelar deben operar sobre esa misma entrada. Producción, Hosting, Rules, índices, Firestore, Storage y SMTP permanecen sin cambios.

Evidencia del 2 de octubre de 2026: OAuth `calendar.events`, estructura del secreto, coincidencia del calendario objetivo y lectura del endpoint aprobaron. `GOOGLE_CALENDAR_CONFIG` versión 3 quedó `ENABLED` y las siete Functions quedaron `ACTIVE` en `us-central1`. La creación nueva desde la aplicación permanece pendiente.

### EVT-109 — Correos HTML institucionales

Creación, actualización, retiro de coordinación, cancelación y logística generan asunto `[Eventos TUP]`, HTML responsive y texto plano equivalente. El HTML usa los tokens institucionales aprobados, estado textual, evento, fecha en español, horario de Cancún, campus, dirección, responsable y las secciones opcionales disponibles de coordinaciones, equipos, observaciones y cambios.

Valores con `<`, `>`, `&`, comillas o saltos de línea no pueden inyectar etiquetas, atributos o encabezados. El HTML no contiene scripts, formularios, recursos remotos, rastreadores, correos de otros destinatarios, IDs internos, estados técnicos, inventario total, secretos o enlaces no autorizados. Un trabajo histórico sin los campos ampliados conserva asunto, intervalo, responsable y texto/HTML válidos sin informar cambios falsos.

La fotografía de una revisión nueva conserva los datos canónicos y el resumen de campos modificados. Reintentar el trabajo produce el mismo contenido; no vuelve a leer nombres o cantidades modificados posteriormente. El adaptador SMTP entrega simultáneamente `html` y `text` después de validar la allowlist.

Evidencia del 2 de octubre de 2026: aprobaron 75 pruebas unitarias de Functions en 10 archivos y 14 pruebas de Eventos con Firestore Emulator, además de lint Angular/Functions/visual, formato, `git diff --check` y compilación TypeScript de Functions. Las pruebas cubren los cinco tipos de notificación, texto alternativo, datos opcionales, fotografía histórica, resumen de cambios, escape de HTML y asuntos sin saltos de línea. Después se desplegaron únicamente `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations`, `syncUpdatedEventIntegrations` y `processEventNotifications` en staging; Firebase confirmó las ocho actualizaciones. La entrega visual real queda pendiente de aceptar mediante una revisión nueva, porque los correos ya enviados no se regeneran.

### EVT-110 — Autorización dinámica de contactos de Coordinaciones

Un destinatario fuera de `allowedRecipients` se entrega cuando el trabajo protegido contiene `destinatarioTipo: coordinacion` o `sistemas`, `coordinacionId` canónico y el correo pertenece exactamente al dominio institucional. La autorización usa la fotografía de procedencia del trabajo y no se pierde si la coordinación se suspende o cambia antes de un reintento. El mismo correo como creador y contacto seleccionado conserva procedencia de Coordinación para la deduplicación.

Un creador institucional fuera de la lista fija, un correo externo aunque se etiquete como coordinación, un trabajo de coordinación sin ID, un tipo desconocido o un correo libre continúan fallando con `recipient-not-allowed` antes de crear el transporte SMTP. Angular no aporta los metadatos de autorización. La lista fija continúa operativa y `SMTP_CONFIG` no requiere una versión nueva.

Evidencia del 3 de octubre de 2026: aprobaron 78 pruebas unitarias de Functions en 10 archivos y 14 pruebas de Eventos con Firestore Emulator. Se verificaron contacto institucional fuera de la lista fija, creador fuera de lista, dominio externo, coordinación sin ID, ausencia de apertura SMTP en rechazos y preferencia de procedencia de Coordinación cuando el mismo correo también es el creador. Aprobaron además compilación TypeScript de Functions, lint Angular/Functions/visual, formato y `git diff --check`. Después se actualizaron únicamente `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations`, `syncUpdatedEventIntegrations` y `processEventNotifications` en staging; Firebase confirmó las ocho operaciones. No se modificaron secretos, Hosting, Rules, índices, datos o producción. La entrega real positiva y las negativas controladas permanecen pendientes.

## Evidencia requerida

- Unitarias Angular y Functions.
- Auth/Firestore/Storage Emulator.
- Pruebas Rules para propiedad, catálogos y bandeja protegida.
- Dobles de Calendar y SMTP con fallos parciales, leases, reconciliación y reintentos.
- Inspección de bundle, archivos versionados, bindings de Secret Manager y lista permitida de staging.
- Concurrencia de revisiones, idempotencia y uso de coordinación.
- Concurrencia de inventario, reserva atómica, traslado y compatibilidad del objeto histórico `equipos`.
- Reloj controlado para fronteras temporales, zona `America/Cancun`, cinco fechas de anticipación y seis fechas operativas.
- Consultas de calendario por rango, superposición, límites, propiedad y ausencia de sobrelectura.
- Pruebas de integración de FullCalendar Standard sin arrastre ni escritura directa.
- Recorrido manual accesible y responsive.
- Staging con calendario y SMTP sintéticos; nunca producción.
