# Spec: Eventos

## Estado

Especificación redefinida documentalmente el 19 de agosto de 2026 para incorporar Coordinaciones y notificaciones confiables, ampliada el 21 de agosto de 2026 con Campus y Equipos dinámicos, actualizada el 28 de septiembre de 2026 con eventos multidiarios, anticipación, estados derivados y calendario administrativo, y sincronizada el 29 de septiembre de 2026 con la configuración real disponible de staging. La implementación de Eventos y reservaciones fue autorizada expresamente el 29 de septiembre de 2026 conforme a ADR-009. El 30 de septiembre quedaron implementados y probados localmente la creación y disponibilidad transaccional, las consultas paginada y por intervalo, la carga inicial de PDF y las rutas Angular de listado, alta, detalle y calendario. Edición, cancelación, reemplazo o limpieza de PDFs, Calendar, SMTP y aceptación manual siguen pendientes. No existe despliegue de Eventos a staging y producción continúa fuera de alcance.

## Objetivo

Gestionar eventos institucionales autorizados, protocolos PDF, coordinaciones involucradas y sus integraciones con Google Calendar y correo, conservando propiedad, historial e idempotencia.

## Fuentes obligatorias

- `../reglas-negocio.md`, RN-015 a RN-027 y RN-047 a RN-075.
- `../modelo-datos.md`, colecciones `eventos`, `coordinaciones` y `notificacionesEventos`.
- `../seguridad.md`, reglas SEC-EVT, SEC-COO, SEC-NOT y SEC-STO.
- `../integraciones.md`.
- `../decisiones/ADR-006-coordinaciones-notificaciones-eventos.md`.
- `../decisiones/ADR-007-campus-equipos-logistica.md`.
- `../decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`.
- `../decisiones/ADR-009-transacciones-indices-eventos.md`.
- `../decisiones/ADR-010-cierre-operativo-eventos.md`.
- `../arquitectura.md` y `../design-system/spec.md`.

## Dependencias previas

Antes de integrar Eventos deben existir:

- Administración de Coordinaciones por `admin`.
- Administración de Campus por `admin` y catálogo sanitizado de campus activos.
- Catálogo de Equipos implementado y aceptado.
- Contrato de reservaciones, concurrencia e índices Firestore aprobado por separado.
- Contrato sanitizado de coordinaciones activas para usuarios autorizados.
- Rules y callables de Coordinaciones aprobadas en Emulator Suite.
- Políticas aprobadas de límites, reintentos, retención, PDFs, paginación y verificación de staging.

La creación del calendario, la habilitación de la API, la obtención de credenciales OAuth, la comprobación manual del buzón SMTP y la creación de la contraseña de aplicación ya están realizadas. Sus valores no se documentan ni se requieren para iniciar desarrollo con dobles; deben cargarse en Secret Manager antes del primer despliegue funcional de las integraciones.

La aceptación manual pendiente de los catálogos ya implementados no impide construir Eventos localmente contra contratos y dobles aprobados, pero sí debe concluir antes de aceptar Eventos en staging.

## Alcance

- Ruta privada `/eventos` para `admin` y `usuario` autorizados.
- Listado por fecha de creación descendente.
- Búsqueda por evento o responsable.
- Paginación de 25 registros por página mediante cursores de Firestore.
- Calendario por intervalo visible con vistas mes, semana, día y lista.
- Creación, detalle, edición y cancelación por el creador.
- Anticipación mínima de cinco fechas naturales.
- Eventos continuos de hasta seis fechas operativas consecutivas y un solo campus.
- Estados temporales automáticos derivados en `America/Cancun`.
- Un protocolo PDF vigente.
- Equipamiento dinámico con cantidades y reservación atómica.
- Máximo de 20 tipos distintos de equipo por evento.
- Selección opcional y múltiple de coordinaciones activas.
- Sin máximo funcional de coordinaciones seleccionadas; se permiten todas las activas disponibles.
- Fotografía histórica de coordinaciones.
- Calendar institucional.
- Correos individuales de creación, actualización, retiro y cancelación.
- Estado visible de integración completa o parcial sin exponer datos técnicos.

## Fuera de alcance

- Flujo de aprobación.
- Asistentes o respuestas RSVP de Google Calendar.
- Correo libre capturado en el formulario.
- Contactos externos al dominio institucional.
- Gestión de asistentes generales.
- Reportes, exportación, Teams, Zoom o firma electrónica.
- Múltiples protocolos vigentes.
- Modificación de Coordinaciones desde el formulario de Eventos.
- Eventos recurrentes o una agenda de jornadas independientes.
- FullCalendar Premium/Scheduler, vistas por recursos y recurrencia.
- Creación, arrastre, redimensionado o cambio de campus directamente desde el calendario.

## Actor y propiedad

- `admin` y `usuario` autorizados pueden consultar y crear eventos.
- Solo `creadoPorUid` puede editar o cancelar su evento, sin excepción administrativa en esta versión.
- Responsable, UID y correo del creador se obtienen del perfil canónico, no del payload.
- Functions y Rules repiten la validación de propiedad.

## Formulario

### Información general

- Nombre del evento.
- Campus activo obligatorio, resuelto por ID canónico; el evento futuro conserva nombre y dirección históricos.
- Fecha y hora de inicio.
- Fecha y hora de término.
- El intervalo pertenece a un solo campus, admite como máximo seis fechas operativas consecutivas y no puede tocar domingo.
- La fecha inicial debe conservar al menos cinco fechas naturales de anticipación respecto de la fecha backend en `America/Cancun`; el día límite completo es válido.
- Responsable de solo lectura desde la sesión.
- Correo de solo lectura desde la sesión.
- Estado temporal de solo lectura; no existe selector manual.
- Observaciones.

### Coordinaciones involucradas

- Selector múltiple, buscable y accesible.
- Muestra solo nombres de coordinaciones activas.
- La selección es opcional.
- Muestra las seleccionadas como texto o chips removibles con nombre accesible.
- No muestra ni descarga correos de contactos.
- Una coordinación suspendida previamente seleccionada permanece visible al editar, marcada como “Suspendida”; puede conservarse o retirarse, pero no agregarse de nuevo.

### Equipamiento

- Selector dinámico después de capturar campus, fecha y horario válidos.
- Muestra nombre, campus base, clasificación y disponibilidad calculada para el intervalo.
- Permite cantidad entera positiva hasta la disponibilidad confirmable.
- Una solicitud con varios equipos se confirma completa o se rechaza completa.
- Admite como máximo 20 equipos distintos, sin IDs repetidos y con cantidades enteras positivas.
- Equipos fijos aparecen solo en su campus base. Transferibles aparecen únicamente para destinos explícitamente permitidos y antes del corte logístico.
- En eventos de varios días todos los equipos permanecen montados y reservados durante las noches; la disponibilidad cubre el intervalo continuo completo.
- Los nombres fijos históricos del objeto `eventos.equipos` permanecen solo para compatibilidad de lectura y no definen el catálogo nuevo.

### Protocolo

- PDF obligatorio al crear.
- PDF opcional al editar; si se reemplaza, se conserva una sola referencia vigente.
- Tipo `application/pdf` y tamaño menor a 10 MiB.

## Modelo consumido

Además de los campos históricos, el evento usa:

```text
coordinacionIds: string[]
coordinacionesInvolucradas:
  - coordinacionId: string
    nombre: string
revisionNotificacion: number
inicioAt: Timestamp
finAt: Timestamp
estatus: "programado" | "cancelado" | "registrado" | "en_proceso" | "finalizado"
fechaCancelacion: Timestamp | null
canceladoPorUid: string | null
campusId: string
campusHistorico:
  campusId: string
  nombre: string
  direccion: string | null
equipoIds: string[]
equiposSolicitados:
  - equipoId: string
    nombre: string
    cantidad: integer
    campusBaseId: string
    campusBaseNombre: string
    clasificacion: "fijo" | "transferible"
```

El cliente envía `coordinacionIds`. El backend elimina duplicados, exige que cada coordinación nueva exista y esté activa, obtiene el nombre canónico y construye ambos campos. Nunca acepta nombres o correos como autoridad.

`inicioAt` y `finAt` son calculados por backend desde los campos locales y la zona institucional. El cliente no envía instantes ni un estado temporal autoritativo.

Los eventos históricos sin estos campos se leen como sin coordinaciones y revisión `0`. Cuando sus fechas locales sean completas se deriva el estado sin modificar el documento; si son incompletas se usa la presentación compatible del estatus histórico y se marca revisión.

Los eventos históricos conservan el objeto fijo `equipos` y se leen como “sin reservación administrada”. No existe migración implícita hacia `reservasEquipo`.

## Estados

### Estado temporal derivado

- `programado`: hora de servidor anterior a `inicioAt`.
- `en_ejecucion`: hora de servidor igual o posterior a `inicioAt` y anterior a `finAt`.
- `finalizado`: hora de servidor igual o posterior a `finAt`.

No se persisten transiciones automáticas ni se programa un cron por evento. Las consultas incluyen una referencia `serverNow`; la interfaz la usa como base y recalcula al cargar, navegar y alcanzar la siguiente transición. En un evento multidiario continuo permanece `en_ejecucion` durante las noches.

### Estado persistido

- `cancelado`: prevalece sobre el cálculo temporal y deja el evento de solo lectura.
- `registrado`, `en_proceso` y `finalizado` históricos continúan siendo legibles; `registrado` se presenta como “Programado” cuando no pueda derivarse un estado más preciso.

Los estados de Calendar, correo, cobertura de Sistemas, reservaciones, traslado y liberación son independientes del estado temporal del evento.

## Flujo de creación

1. Validar sesión, perfil canónico, datos, anticipación de cinco fechas, máximo de seis fechas operativas, un solo campus, fechas, equipamiento y PDF; ningún intervalo puede tocar domingo.
2. Validar IDs únicos, coordinaciones activas, equipos canónicos, cantidades y destinos.
3. Cargar PDF a `eventos/{year}/{fileName}`.
4. Calcular `inicioAt` y `finAt` en `America/Cancun` y crear Firestore con creador canónico, `estatus: programado`, fotografías de campus, coordinaciones y equipos, `revisionNotificacion: 1`, reservaciones completas y timestamps de servidor mediante la estrategia atómica aprobada.
5. Marcar permanentemente `utilizada: true` en las coordinaciones seleccionadas.
6. Crear o reconciliar Calendar mediante `processEventIntegrations`.
7. Calcular creador más contactos vigentes, normalizar y deduplicar.
8. Crear trabajos idempotentes `creacion` por destinatario.
9. Informar “creado correctamente” si Calendar y trabajos quedaron preparados; informar integración parcial si algún paso posterior al guardado requiere reconciliación.

El evento no se elimina porque SMTP falle.

## Flujo de edición

- Solo el creador puede editar.
- El backend compara estado previo y objetivo.
- Después del día límite se permiten nombre, observaciones, coordinaciones, retiro o reducción de equipos y cancelación. Se rechazan nuevos equipos, aumentos, cambio de campus o adelantos que incumplan anticipación.
- Posponer exige que la nueva fecha de inicio vuelva a cumplir cinco fechas naturales desde la fecha backend de la edición.
- Cambiar fecha, hora, campus, equipos o cantidades recalcula la reservación completa. Si el nuevo estado no puede confirmarse, conserva el anterior.
- Cambiar nombre, fecha, hora o coordinaciones aumenta `revisionNotificacion` exactamente una vez.
- Cambiar únicamente observaciones, equipamiento permitido o protocolo no aumenta la revisión ni genera correo; el estado temporal no es editable.
- Calendar se actualiza cuando cambie información que forme parte de su contenido.
- Coordinaciones agregadas deben estar activas y se marcan utilizadas.
- Coordinaciones suspendidas existentes pueden conservarse o retirarse.
- Coordinaciones retiradas reciben `retiro_coordinacion`.
- Creador y coordinaciones agregadas o conservadas reciben `actualizacion`.
- Si un correo sigue involucrado por el creador u otra coordinación, recibe actualización y no un aviso contradictorio de retiro.
- Los destinatarios se calculan con contactos vigentes y el historial mínimo necesario para avisar a quienes ya fueron notificados.
- El PDF nuevo no sustituye la referencia hasta completar su carga y confirmar el evento. Después se elimina el archivo anterior; si falla, queda para reintento. Un archivo sin referencia se purga después de 24 horas.

## Flujo de cancelación

1. Revalidar autorización, propiedad y documento.
2. Rechazar reactivación o cancelación duplicada no idempotente y construir la fotografía y destinatarios.
3. Eliminar o confirmar ausente el evento de Calendar.
4. Eliminar o confirmar ausente el PDF vigente.
5. En una transacción, crear trabajos idempotentes `cancelacion`, limpiar referencias externas confirmadas y actualizar Firestore con `estatus: cancelado`, `fechaCancelacion` y `canceladoPorUid`.
6. Dejar el evento de solo lectura e informar cancelación completa con notificaciones en proceso o integración parcial.

Las reservaciones locales se cancelan y liberan. Si un equipo ya salió de su campus base, conserva su ventana de regreso y el registro logístico necesario aunque el evento se cancele.

La cancelación se dirige al creador y a la unión sin duplicados de destinatarios previamente notificados y contactos vigentes de las coordinaciones involucradas. Cancelar el evento no habilita eliminar una coordinación utilizada.

## Google Calendar

- Se utiliza exclusivamente el calendario institucional configurado.
- Zona horaria `America/Cancun`.
- Los contactos de Coordinaciones no se incluyen en `attendees`.
- No existe RSVP ni inserción automática en calendarios personales.
- Calendar y correo tienen estados y reintentos independientes.
- Un evento multidiario se sincroniza como una sola entrada continua.
- Google Calendar nunca es la fuente de la vista administrativa FullCalendar.

En staging se usa exclusivamente `CALENDARIO - STAGING`, perteneciente a `eventos@tecplayacar.edu.mx`, dentro de `eventos-tup-angular-stg`. Las credenciales se leen desde `GOOGLE_CALENDAR_CONFIG` enlazado a las Functions correspondientes.

## Notificaciones por correo

| Operación                                       | Tipo                  | Destinatarios                                                                          |
| ----------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| Crear                                           | `creacion`            | Creador + contactos vigentes de coordinaciones seleccionadas                           |
| Cambiar nombre, fecha, horario o coordinaciones | `actualizacion`       | Creador + contactos vigentes de coordinaciones agregadas o conservadas                 |
| Retirar coordinación                            | `retiro_coordinacion` | Destinatarios previamente notificados y contactos vigentes de la coordinación retirada |
| Cancelar evento                                 | `cancelacion`         | Creador + destinatarios previamente notificados + contactos vigentes aplicables        |

- Cada correo es individual; no expone otros destinatarios.
- Un correo repetido en varias coordinaciones recibe un solo mensaje por tipo y revisión.
- Los destinatarios son siempre institucionales.
- El cuerpo incluye tipo de aviso, evento, fecha, horario y responsable.
- Los trabajos ya enviados no vuelven a enviarse en un reintento.
- Los fallos se muestran como notificaciones pendientes, no como pérdida del evento.

En staging, `eventos@tecplayacar.edu.mx` envía mediante `smtp.gmail.com:465` con `secure: true`. El backend permite entregar únicamente a `omar.sanchez@tecplayacar.edu.mx`; cualquier otro destinatario se bloquea antes de SMTP y nunca se redirige silenciosamente. La configuración se lee desde `SMTP_CONFIG` enlazado a las Functions correspondientes.

## Consulta y detalle

- El listado consulta 25 eventos por página mediante cursores de Firestore; no descarga la colección completa.
- La búsqueda consulta el conjunto indexado completo por prefijo normalizado de nombre o responsable, no solo la página visible. Exige de 2 a 80 caracteres y conserva páginas de 25.
- Backend calcula `terminosBusqueda`: prefijos de campos completos hasta 80 caracteres y de cada palabra hasta 30, sin diacríticos, en minúsculas, únicos y con máximo de 500.
- El cursor queda ligado al término; cambiar o limpiar búsqueda reinicia la primera página.
- El listado no muestra correos de Coordinaciones.
- El detalle muestra nombres de coordinaciones, incluso si después fueron suspendidas o renombradas.
- `getEventDetail` entrega los IDs y cantidades necesarios para editar, además de una proyección logística sanitizada; no expone correos, configuración, claves idempotentes, leases o controles.
- No muestra `notificacionesEventos`, claves idempotentes, errores SMTP ni listas de destinatarios.
- `calendarEventId` puede mostrarse como referencia operativa únicamente conforme al diseño aprobado.
- Los eventos cancelados permanecen visibles como históricos y no ofrecen edición o reactivación.

### Acciones en el detalle

- Solo el propietario ve `Editar` y `Cancelar`; el backend vuelve a validar propiedad.
- `Editar` reutiliza el formulario, conserva coordinaciones suspendidas ya asociadas y aplica las restricciones posteriores al límite.
- `Cancelar` exige confirmación explícita, no borra el documento y comunica integración completa o parcial.
- La sección “Logística de equipos” muestra cobertura, traslado, regreso, liberación, demora y recepción en texto.
- Solo `admin` ve `Confirmar cobertura`, `Confirmar recepción` y `Reportar demora`; cada acción tiene carga independiente, confirmación y resultado anunciado.

## Calendario administrativo

- Ruta privada `/eventos/calendario`, accesible a los mismos usuarios autorizados que `/eventos`.
- FullCalendar Standard `7.1.0` se carga de forma lazy dentro del módulo y es compatible con Angular 22; no se incluye ningún complemento Premium.
- Vistas autorizadas: mes predeterminado en escritorio, semana, día y lista; en móvil se prioriza lista.
- Ofrece navegación anterior/siguiente, “Hoy”, alternancia `Listado | Calendario` y filtros por campus y estado.
- Seleccionar un evento abre el mismo detalle del listado. Solo el propietario ve acciones de edición o cancelación.
- Fechas y duración son de solo lectura: `editable: false`; no existe creación por selección, arrastre ni redimensionado.
- Cada solicitud cubre únicamente el rango visible, máximo 42 fechas, e incluye eventos cuyo intervalo se superpone aunque inicie antes del rango.
- La respuesta se obtiene desde Firestore mediante la capa de Eventos, no desde Google Calendar, y omite correos, entregas, configuración e inventario administrativo.
- La vista usa `America/Cancun`, representa un evento multidiario como un bloque continuo y actualiza su texto de estado al cruzar una frontera temporal.
- Carga, vacío, error y reintento del rango se muestran sin afirmar que no existen eventos cuando la consulta falló.

## Estados de interfaz

- Carga inicial.
- Vacío.
- Búsqueda sin coincidencias.
- Error recuperable.
- Carga de PDF.
- Guardado.
- Integración completa.
- Evento guardado con Calendar pendiente.
- Evento guardado con notificaciones pendientes.
- Cancelación con notificaciones en proceso.
- Calendario cargando intervalo, vacío, error recuperable y actualización de estado temporal.
- Búsqueda con mínimo de dos caracteres, resultados paginados, sin coincidencias y error recuperable.
- Edición guardando, conflicto de disponibilidad sin cambios parciales y reconciliación pendiente.
- Logística confirmando cobertura o recepción y registrando demora, sin bloquear otras filas.

Los estados públicos de integración son `calendarEstado` y `notificacionesEstado`. La UI puede presentar `Pendiente`, `Sincronizado/Completas`, `Error/Parciales` o `Retirado/No aplica`, pero nunca muestra códigos técnicos o destinatarios.

## Accesibilidad y responsive

- WCAG 2.2 AA.
- Formulario completamente operable por teclado.
- Selector múltiple con etiqueta, instrucciones, estado y eliminación accesible de cada coordinación.
- Errores asociados al campo correspondiente.
- Progreso y resultados asíncronos anunciados.
- Datos y acciones disponibles desde 320 px sin desplazamiento global.
- Calendario operable por teclado, eventos interactivos con nombre accesible y vista de lista equivalente; estado, fecha, horario y campus no dependen solo del color.

## Errores funcionales mínimos

```text
unauthenticated
permission-denied
event-not-found
event-cancelled
coordination-not-found
coordination-inactive
equipment-not-found
equipment-inactive
equipment-unavailable
equipment-cutoff-missed
equipment-reservation-review-required
invalid-argument
invalid-date-range
event-advance-required
event-duration-exceeded
event-on-sunday
event-edit-restricted
calendar-range-invalid
invalid-pdf
integration-partial
notification-reconciliation-required
service-unavailable
```

## Criterios de aceptación

- Un evento válido puede crearse con cero o varias coordinaciones activas.
- Todos los equipos solicitados quedan reservados o ninguno; nunca se excede cantidad operativa.
- Eventos que tocan domingo son rechazados.
- La creación exige cinco fechas naturales de anticipación sin excepción de `admin` y acepta el día límite completo.
- Un evento multidiario usa un solo campus, máximo seis fechas operativas y conserva equipos durante todas las noches.
- El estado temporal cambia de forma derivada exactamente en inicio y fin sin depender de una escritura programada; `cancelado` prevalece.
- El creador siempre queda registrado y recibe notificación.
- Las coordinaciones seleccionadas reciben correos individuales y deduplicados.
- Ningún correo de coordinación procede directamente del cliente ni aparece en el documento público del evento.
- Una coordinación suspendida no puede agregarse, pero no rompe eventos históricos.
- Cambios relevantes, retiro y cancelación producen los tipos de aviso definidos.
- Calendar nunca agrega contactos como asistentes.
- Un fallo SMTP no revierte Firestore, Storage o Calendar.
- Los reintentos no duplican Calendar ni correos enviados.
- Cada correo usa un intento inicial y hasta tres reintentos a los 5 minutos, 30 minutos y 2 horas.
- Los registros terminales de envío se purgan después de 90 días.
- Solo el creador edita o cancela.
- Listado y calendario muestran el mismo estado canónico; el calendario consulta solo el intervalo visible y no usa Google Calendar como fuente.
- Mes, semana, día y lista funcionan por teclado y desde 320 px; no existe edición por arrastre.
- Pasan `pruebas.md`, Rules, Emulator Suite, pruebas de Functions y definición transversal de terminado.

## Decisiones aprobadas

- EVT-D01: El creador y las coordinaciones reciben correo; las coordinaciones no reemplazan al creador.
- EVT-D02: Cada coordinación admite varios correos institucionales.
- EVT-D03: La selección de coordinaciones es opcional.
- EVT-D04: Una coordinación utilizada no se elimina; se suspende.
- EVT-D05: Nombre, fecha, horario y coordinaciones generan actualización por correo.
- EVT-D06: Retiro de coordinación y cancelación de evento generan avisos.
- EVT-D07: Los contactos no son asistentes de Calendar.
- EVT-D08: Correo individual, deduplicado, protegido e idempotente mediante bandeja de salida.
- EVT-D09: El estado final prevalece cuando un destinatario pertenece simultáneamente a coordinaciones retiradas y conservadas.
- EVT-D10: Cada coordinación admite como máximo 10 correos institucionales.
- EVT-D11: No existe máximo funcional de coordinaciones seleccionadas por evento.
- EVT-D12: Cada correo realiza un intento inmediato y tres reintentos a los 5 minutos, 30 minutos y 2 horas.
- EVT-D13: Los registros terminales de notificación se conservan 90 días.
- EVT-D14: Los PDFs huérfanos se purgan después de 24 horas y el PDF anterior se elimina solo tras confirmar la referencia nueva.
- EVT-D15: El listado utiliza paginación por cursor de 25 eventos.
- EVT-D16: Calendar y SMTP se verifican en staging con recursos sintéticos y destinatarios permitidos.
- EVT-D17: Equipos se seleccionan desde catálogo dinámico y se reservan en una operación completa, sin asignación parcial.
- EVT-D18: El objeto fijo histórico `eventos.equipos` permanece para lectura y no se migra implícitamente.
- EVT-D19: Equipo local usa márgenes de 60 minutos antes y 30 después; el transferido permanece bloqueado hasta regresar.
- EVT-D20: No se permiten eventos que inicien, terminen o transcurran en domingo.
- EVT-D21: Se permiten intervalos continuos de hasta seis fechas operativas consecutivas y un solo campus; los equipos permanecen montados durante las noches.
- EVT-D22: Crear exige cinco fechas naturales de anticipación en `America/Cancun`, con día límite completo y sin excepción administrativa.
- EVT-D23: Después del límite se permiten cambios descriptivos, coordinaciones, reducciones y cancelación; no se permite agregar capacidad, aumentar cantidades, cambiar campus o adelantar inválidamente.
- EVT-D24: `programado`, `en_ejecucion` y `finalizado` se derivan de instantes canónicos; `cancelado` se persiste y prevalece.
- EVT-D25: Cancelar conserva un documento histórico de solo lectura y reemplaza la eliminación física del nuevo flujo.
- EVT-D26: FullCalendar Standard pertenece al módulo de Eventos como vista lazy, de solo lectura y basada en Firestore.
- EVT-D27: El calendario ofrece mes, semana, día y lista, consulta rangos de hasta 42 fechas y usa `America/Cancun`.
- EVT-D28: Google Calendar permanece como integración de salida y nunca alimenta la vista administrativa.
- EVT-D29: Local usa dobles y, solo cuando sea necesario, `functions/.secret.local`; staging y producción usan Secret Manager, nunca environments Angular ni archivos versionados.
- EVT-D30: La búsqueda global usa términos derivados en backend, `array-contains`, creación descendente y cursor opaco ligado al término; no se agrega un motor externo.
- EVT-D31: Detalle, edición, cancelación, reconciliación y tres acciones logísticas usan callables explícitas y proyecciones sanitizadas conforme a ADR-010.
- EVT-D32: SMTP usa intento inmediato más worker cada 5 minutos, lote 50 y lease transaccional de 10 minutos.
- EVT-D33: Notificaciones terminales usan TTL sobre `fechaExpiracion`; limpieza de protocolos ocurre a las 04:00 en `America/Cancun`, con lote acotado e idempotencia.
- EVT-D34: Históricos válidos reciben instantes y términos solo mediante backfill explícito con modo seco; producción requiere autorización independiente.
- EVT-D30: Staging usa `CALENDARIO - STAGING`, el remitente `eventos@tecplayacar.edu.mx` y una lista permitida limitada a `omar.sanchez@tecplayacar.edu.mx`.
- EVT-D31: El presupuesto de staging es informativo por `100 MXN`, con avisos al primer gasto y a `50`, `80` y `100 MXN`; no sustituye límites técnicos ni detiene servicios.
- EVT-D32: Reservaciones usa la transacción, controles por equipo e índices de ADR-009; hasta 20 tipos se confirman todos o ninguno y una concurrencia agotada falla sin estado parcial.

## Pendiente operativo

- Resolver y guardar el ID canónico de la Coordinación de Sistemas ya creada en staging antes de activar notificaciones logísticas reales. La implementación local puede obtenerlo mediante configuración sintética.

No bloquean iniciar desarrollo local, pero sí el primer despliegue funcional de integraciones a staging:

- Completar la aceptación funcional, accesible y visual pendiente de Coordinaciones, Campus y Equipos.
- Cargar `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` en Secret Manager.
- Implementar y comprobar la lista permitida de SMTP.
- Confirmar cuotas aplicables y ejecutar pruebas reales de creación, actualización y cancelación de Calendar y de envío SMTP.
