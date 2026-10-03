# Modelo de datos

## Principio

La migración Angular conserva los campos históricos sin renombrarlos, eliminarlos o convertirlos. El 19 de agosto de 2026 se autorizó la colección aditiva `coordinaciones`. El 21 de agosto de 2026 se autorizaron `campus` y el incremento A de `equipos`, posteriormente implementados y desplegados únicamente a staging. El 29 de septiembre de 2026 se autorizaron los campos aditivos de Eventos, `reservasEquipo`, `controlReservasEquipo` y la configuración logística conforme a ADR-009. El 30 de septiembre el modelo completo de Eventos, reservaciones y notificaciones quedó implementado, probado y desplegado únicamente a staging; producción continúa fuera de alcance.

## Colección `campus`

```text
nombre: string
nombreNormalizado: string
clave: string
direccion: string | null
referencia: string | null
activo: boolean
utilizado: boolean
horariosSistemas:
  lunes..sabado:
    operativo: boolean
    inicio: string | null
    fin: string | null
  domingo:
    operativo: false
    inicio: null
    fin: null
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

Nombre y clave son únicos. Dirección y referencia son opcionales. Los horarios usan `HH:mm`, domingo permanece inactivo y `utilizado` cambia permanentemente a `true` cuando Equipos o Eventos crea la primera referencia. El ID Firestore es independiente de la clave.

## Colección `equipos`

```text
nombre: string
nombreNormalizado: string
campusBaseId: string
cantidadOperativa: integer
clasificacion: "fijo" | "transferible"
campusDestinoIdsPermitidos: string[]
activo: boolean
utilizado: boolean
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

- La combinación `nombreNormalizado + campusBaseId` es única.
- `cantidadOperativa` contiene solo unidades utilizables, entre 0 y 999; no existe un contador persistido de disponibilidad.
- Un registro fijo conserva destinos vacíos. Un registro transferible contiene IDs canónicos únicos, activos y distintos del campus base.
- Agregar un campus no amplía automáticamente los destinos.
- `utilizado` cambia permanentemente a `true` con la primera reservación y bloquea eliminación y cambio de campus base.
- El catálogo admite como máximo 500 documentos en su primera estrategia de consulta.

## Colección objetivo protegida `reservasEquipo`

```text
eventoId: string
equipoId: string
cantidad: integer
campusEventoId: string
estado: "confirmada" | "requiere_revision" | "cancelada" | "finalizada"
esTraslado: boolean
bloqueoInicio: Timestamp
bloqueoFin: Timestamp
salidaProgramada: Timestamp | null
regresoProgramado: Timestamp | null
liberacionProgramada: Timestamp
recepcionConfirmada: Timestamp | null
demoraReportada: boolean
coberturaSistemas: "no_requerida" | "pendiente" | "confirmada"
motivosRevision: ("cobertura_sistemas" | "inventario_reducido" | "coordinacion_sistemas")[]
versionesAvisoLogistico:
  cobertura_sistemas: number | null
  inventario_reducido: number | null
  cambio_incompatible: number | null
  demora: number | null
  cancelacion_post_salida: number | null
fotografia:
  equipoNombre: string
  campusBaseId: string
  campusBaseNombre: string
  campusEventoId: string
  campusEventoNombre: string
  clasificacion: "fijo" | "transferible"
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

- Su ID será determinista por evento y equipo.
- `confirmada` y `requiere_revision` consumen capacidad hasta resolver, cancelar o finalizar.
- `motivosRevision` conserva causas independientes; `estado` vuelve a `confirmada` únicamente cuando el arreglo queda vacío. `versionesAvisoLogistico` fotografía la versión del control que originó cada aviso; resolver una causa fija su entrada en `null` y una causa posterior obtiene una versión nueva sin repetir las demás.
- Confirmar recepción anticipada registra hora de servidor, fija `bloqueoFin` al instante efectivo y cambia a `finalizada`. Reportar demora extiende `bloqueoFin` y `liberacionProgramada` sin liberar capacidad.
- El cliente no escribe reservas ni estados logísticos directamente.
- La colección está implementada y desplegada únicamente a staging para creación, sustitución, cancelación y operaciones logísticas mediante la estrategia transaccional e índices de ADR-009.

## Colección protegida `controlReservasEquipo`

```text
equipoId: string
version: integer
fechaActualizacion: Timestamp
```

- El ID del documento coincide con `equipoId`.
- `version` inicia en `1` y aumenta en toda transacción que cree, sustituya, reduzca, cancele o finalice una reserva del equipo.
- No almacena disponibilidad ni cantidades y no sustituye el cálculo por intervalos.
- Solo Admin SDK puede leer o escribir esta colección; su finalidad es crear contención determinista entre operaciones concurrentes, incluso cuando inicialmente no existen reservas superpuestas.

## Documento objetivo protegido `configuracion/logisticaEquipos`

```text
coordinacionSistemasId: string
montajeMinutos: 60
desmontajeMinutos: 30
horaSalidaTraslado: "17:00"
duracionTrasladoInicialMinutos: 30
margenLiberacionRegresoMinutos: 60
zonaHoraria: "America/Cancun"
```

La coordinación se referencia por ID canónico. Los correos se resuelven desde Coordinaciones al generar cada aviso y no se copian en configuración.

## Colección `usuarios`

```text
uid: string | null
nombre: string
correo: string
rol: "admin" | "usuario"
activo: boolean
fechaCreacion: Timestamp
ultimoAcceso: Timestamp | null
```

El ID del documento es independiente del UID de Firebase. Un registro nuevo puede tener `uid: null` hasta el primer inicio de sesión autorizado.

## Colección `eventos`

```text
nombreEvento: string
fechaInicio: string
horaInicio: string
fechaFin: string
horaFin: string
inicioAt: Timestamp
finAt: Timestamp
responsable: string
estatus: "programado" | "en_proceso" | "finalizado" | "registrado" | "cancelado"
observaciones: string
equipos:
  laptops: number
  proyectores: number
  pantallas: number
  bocinas: number
  microfonos: number
  consolaAudio: number
  extensiones: number
protocoloUrl: string | null
protocoloNombre: string | null
protocoloRuta: string | null
calendarEventId: string | null
calendarEstado: "pendiente" | "sincronizado" | "error" | "retirado"
notificacionesEstado: "pendiente" | "completas" | "parciales" | "no_aplica"
creadoPorUid: string
creadoPorCorreo: string
campusId: string
campusHistorico:
  campusId: string
  nombre: string
  direccion: string | null
coordinacionIds: string[]
coordinacionesInvolucradas:
  - coordinacionId: string
    nombre: string
revisionNotificacion: number
terminosBusqueda: string[]
equipoIds: string[]
equiposSolicitados:
  - equipoId: string
    nombre: string
    cantidad: integer
    campusBaseId: string
    campusBaseNombre: string
    clasificacion: "fijo" | "transferible"
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
fechaCancelacion: Timestamp | null
canceladoPorUid: string | null
```

`fechaInicio` y `fechaFin` conservan el formato `YYYY-MM-DD`. `horaInicio` y `horaFin` conservan el formato `HH:mm`.

`inicioAt` y `finAt` son instantes canónicos calculados por backend a partir de los campos locales y `America/Cancun`; el cliente no los establece. Permiten validar anticipación, derivar el estado temporal y consultar rangos sin depender del reloj o zona del navegador. Un evento dura como máximo seis fechas operativas consecutivas, utiliza un solo campus y no puede tocar domingo.

Los eventos nuevos persisten `programado` al crearse. La interfaz y el backend derivan `programado`, `en_ejecucion` o `finalizado` comparando la hora actual con `inicioAt` y `finAt`; no escriben transiciones temporales. `cancelado` sí es un estado persistido, prevalece sobre el cálculo y convierte el documento en registro histórico de solo lectura. `fechaCancelacion` y `canceladoPorUid` se completan desde backend al finalizar la cancelación.

`protocoloUrl`, `protocoloNombre`, `protocoloRuta` y `calendarEventId` admiten `null` durante integración parcial y después de confirmar su retiro en una cancelación. `protocoloRuta` se deriva en backend desde el objeto de Storage validado y es la autoridad para reemplazo, cancelación y limpieza. La fotografía mínima necesaria para correo permanece en la bandeja protegida y no depende de conservar recursos eliminados.

`calendarEstado` y `notificacionesEstado` son resúmenes funcionales administrados por backend. No contienen destinatarios ni errores técnicos. `terminosBusqueda` se calcula desde nombre y responsable conforme a ADR-010; el cliente no lo propone.

El ID de Firestore identifica al evento. No existe folio institucional en el modelo implementado.

`coordinacionIds` permite validar referencias y bloquear la eliminación de una coordinación utilizada. `coordinacionesInvolucradas` conserva una fotografía del ID y nombre para que el historial no cambie cuando se renombra o suspende el catálogo. Los correos no se guardan en `eventos` porque la colección puede ser consultada por cualquier usuario autorizado.

`campusId`, `campusHistorico`, `inicioAt`, `finAt`, `fechaCancelacion`, `canceladoPorUid`, `equipoIds`, `equiposSolicitados`, `protocoloRuta`, `calendarEstado`, `notificacionesEstado` y `terminosBusqueda` son campos aditivos autorizados. Creación, edición, cancelación y estados derivados están implementados y desplegados únicamente a staging; el comando de backfill existe, pero no se ha ejecutado en staging ni producción. Los eventos históricos conservan el objeto fijo `equipos`; no se renombra, elimina ni migra implícitamente. Un lector interpreta la ausencia de campos dinámicos como “sin reservación administrada”. Si un histórico tiene fechas locales completas se pueden derivar instantes en memoria; persistir instantes o términos exige el backfill explícito de ADR-010. Si son incompletas o inválidas, conserva la presentación compatible del `estatus` histórico y marca revisión sin inventar una zona u hora.

`revisionNotificacion` inicia en `1` al crear y aumenta únicamente cuando una operación requiere nuevas notificaciones conforme a RN-050 a RN-053. Los documentos históricos que no tengan estos tres campos se interpretan como `coordinacionIds: []`, `coordinacionesInvolucradas: []` y `revisionNotificacion: 0`; no se exige backfill para leerlos.

## Colección `coordinaciones`

```text
nombre: string
nombreNormalizado: string
correos: string[]
activo: boolean
utilizada: boolean
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

- `nombreNormalizado` lo calcula el backend y se usa solo para unicidad.
- `correos` contiene direcciones institucionales normalizadas y únicas dentro del documento.
- `correos` admite como máximo 10 elementos.
- `utilizada` es administrado por backend, inicia en `false` y cambia permanentemente a `true` cuando un evento referencia la coordinación.
- Una coordinación utilizada no se elimina físicamente aunque después se cancelen sus eventos.

## Colección protegida `notificacionesEventos`

```text
eventoId: string
revision: number
tipo: "creacion" | "actualizacion" | "retiro_coordinacion" | "cancelacion" | "logistica"
destinatarioCorreo: string
destinatarioTipo: "creador" | "coordinacion" | "sistemas"
coordinacionId: string | null
equipoId: string | null
motivoLogistico: "cobertura_sistemas" | "inventario_reducido" | "cambio_incompatible" | "demora" | "cancelacion_post_salida" | null
claveIdempotencia: string
estado: "pendiente" | "procesando" | "enviado" | "fallido"
intentos: number
ultimoErrorCodigo: string | null
proximoIntento: Timestamp | null
datosEvento:
  nombreEvento: string
  fechaInicio: string
  horaInicio: string
  fechaFin: string
  horaFin: string
  responsable: string
  campusNombre: string
  campusDireccion: string | null
  coordinacionesNombres: string[]
  equipos:
    - nombre: string
      cantidad: number
  observaciones: string
  cambios: string[]
  equipoNombre: string | null
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
fechaEnvio: Timestamp | null
fechaFinalizacion: Timestamp | null
fechaExpiracion: Timestamp | null
procesadorId: string | null
bloqueoHasta: Timestamp | null
ultimoIntento: Timestamp | null
```

Esta colección funciona como bandeja de salida protegida. El navegador no crea, modifica ni lee sus documentos. Para correos funcionales, `claveIdempotencia` es única por evento, `revisionNotificacion`, tipo y destinatario normalizado. Para `tipo: logistica`, la revisión corresponde a la entrada específica de `versionesAvisoLogistico`, tomada de la versión monotónica de `controlReservasEquipo/{equipoId}` que originó esa causa, y la clave incorpora también `equipoId` y `motivoLogistico`; así, cambiar otra causa no repite avisos todavía vigentes y una nueva ocurrencia sí genera una entrega. `datosEvento` permite completar una cancelación o alerta logística sin depender de volver a leer recursos que puedan haber cambiado.

`destinatarioTipo` y `coordinacionId` también constituyen la procedencia protegida usada por el adaptador SMTP. Un trabajo `coordinacion` o `sistemas` con ID canónico permite entregar a su correo institucional aunque no aparezca en la lista fija del ambiente. Estos campos son escritos únicamente por backend después de resolver Coordinaciones; no amplían la capacidad del cliente ni exigen releer contactos mutables durante un reintento. Un trabajo sin procedencia válida conserva el control estricto de `allowedRecipients`.

Los campos `equipoId`, `motivoLogistico` y `datosEvento.equipoNombre` solo son obligatorios para `tipo: logistica`; en los demás tipos permanecen en `null`. Los trabajos logísticos se dirigen exclusivamente a los correos institucionales de la coordinación cuyo ID está guardado en `configuracion/logisticaEquipos.coordinacionSistemasId`. El cliente nunca propone esos destinatarios.

`intentos` cuenta el intento inicial y los reintentos. `proximoIntento` contiene la siguiente ejecución programada y queda en `null` al enviar o agotar el proceso. `procesadorId` y `bloqueoHasta` forman un lease exclusivo de 10 minutos; un worker solo envía si conserva el lease y otro puede recuperar un lease vencido. `ultimoIntento` usa hora de servidor. `fechaFinalizacion` registra el momento en que el envío alcanza `enviado` o fallo permanente. `fechaExpiracion` se fija 90 días después para la purga automática; no se utiliza para registros todavía recuperables.

## Compatibilidad histórica

El estatus `registrado` se conservará para leer datos históricos y se presentará al usuario como “Programado”. Los valores históricos `en_proceso` y `finalizado` siguen siendo legibles, pero cuando existan fechas válidas el estado temporal se deriva sin modificar el documento. Los registros nuevos se crean con `programado`, no persisten cambios automáticos a `en_proceso` o `finalizado` y solo escriben `cancelado` mediante la operación backend autorizada.

## Archivos

Firestore solo almacenará `protocoloUrl` y `protocoloNombre`. El PDF permanecerá en Firebase Storage.

## Auditoría

No existe actualmente una colección de auditoría operativa. Su creación queda fuera de la migración inicial y requerirá una especificación y actualización de este modelo.

`datosEvento` es una fotografía protegida para renderizar el mismo contenido durante reintentos sin depender de catálogos que puedan cambiar. `cambios` contiene únicamente etiquetas funcionales de campos modificados, nunca valores anteriores, correos, IDs o información técnica. Los documentos históricos creados antes de ampliar la fotografía siguen siendo procesables: los campos ausentes se omiten de la plantilla y no se interpretan como cambios.

`notificacionesEventos` no sustituye una auditoría general: conserva únicamente el estado técnico mínimo necesario para entregar y reintentar correos de Eventos.

## Read model no persistido de Dashboard

Dashboard no crea colección, documentos ni campos. La callable `getDashboardSummary` calcula una respuesta efímera desde `eventos` y `usuarios` mediante Admin SDK:

```text
serverNow: ISO string
metrics:
  registeredEvents: integer | null
  upcomingEvents: integer | null
  activeUsers: integer | null
  eventsWithProtocol: integer | null
upcoming: DashboardEventSummary[0..5]
recentActivity: DashboardActivity[0..5]
unavailableSections: DashboardSection[]
```

`DashboardEventSummary` contiene únicamente ID, nombre, fecha y hora de inicio, responsable y estado temporal. `DashboardActivity` contiene ID, nombre, `creacion | actualizacion`, timestamp, responsable y estado temporal. No devuelve documentos de Usuario, correos de coordinaciones, URLs de protocolos, inventario, errores técnicos, secretos ni estados internos de integraciones. Los valores `null` identifican consultas fallidas; un conteo real sin coincidencias usa `0`.
