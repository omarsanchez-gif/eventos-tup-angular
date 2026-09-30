# Pruebas: Eventos

## Estado

Casos redefinidos para Coordinaciones y notificaciones y ampliados el 28 de septiembre de 2026 con anticipación, eventos multidiarios, estados derivados y FullCalendar. El 30 de septiembre se obtuvo evidencia local de creación y disponibilidad transaccionales, consultas, carga inicial de PDF, controles de concurrencia, índices, Rules y experiencia Angular; ADR-010 añadió búsqueda global, logística administrativa, leases, limpieza y backfill. Integraciones, edición, cancelación, aceptación manual y la ejecución integral EVT-001 a EVT-102 continúan pendientes.

### Evidencia automatizada disponible

- 66 pruebas unitarias de Functions aprobadas, incluidas las de tiempo, creación, consultas y validación del protocolo PDF.
- 5 pruebas específicas con Firestore Emulator aprobadas para concurrencia sin reservas previas, todos-o-ninguno, versión monotónica, listado paginado y consulta por intervalo.
- 15 pruebas de Firestore y Storage Rules aprobadas; el cliente no escribe Eventos ni lee reservas, controles, notificaciones o configuración.
- 57 pruebas Angular aprobadas, incluida la transición temporal automática de la facade de Eventos; compilación TypeScript de Functions, lint completo, formato y build Angular de staging aprobados.
- La suite integral suma 171 pruebas aprobadas: 57 Angular, 66 Functions, 33 de emuladores funcionales y 15 de Rules.
- Las pruebas no acreditan todavía aceptación visual, teclado, lector de pantalla, integraciones reales, edición, cancelación ni despliegue.

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

Cada Function de Calendar o SMTP declara únicamente el secreto que consume. Una Function no enlazada no puede leerlo y falla de forma cerrada con un error funcional sanitizado.

### EVT-089 — Lista permitida de staging

En `eventos-tup-angular-stg`, `omar.sanchez@tecplayacar.edu.mx` puede recibir el envío controlado. Cualquier otro destinatario canónico se bloquea antes de SMTP, no se redirige y no se marca como enviado.

### EVT-090 — Configuración local no versionada

Las pruebas locales funcionan con dobles sin credenciales. Si se habilita una prueba real, usa `functions/.secret.local` y `functions/.env.local`, ambos ignorados por Git, y nunca toma secretos desde Angular.

## Atomicidad e índices aprobados

### EVT-091 — Máximo de equipos

Una solicitud con hasta 20 tipos distintos puede validarse; 21 tipos, IDs repetidos o cantidades no enteras positivas se rechazan sin evento ni reservas parciales.

### EVT-092 — Control de concurrencia sin reserva previa

Dos creaciones simultáneas para el mismo equipo, cuando la consulta inicial no devuelve reservas, escriben el mismo control. Una transacción se reintenta y ambas nunca exceden la cantidad operativa.

### EVT-093 — Sustitución atómica

Editar fecha, campus o equipos bloquea la unión ordenada de equipos anteriores y nuevos. Si cualquier reserva objetivo falla, evento y reservas anteriores permanecen sin cambios.

### EVT-094 — Índices declarativos

Emulator Suite y staging ejecutan disponibilidad, calendario general, calendario por campus y listado paginado usando los índices declarados; una ausencia de índice falla en pruebas y no se resuelve descargando colecciones completas.

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
