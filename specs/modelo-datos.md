# Modelo de datos

## Principio

La migración Angular conserva los campos históricos sin renombrarlos, eliminarlos o convertirlos. El 19 de agosto de 2026 se autorizó la colección aditiva `coordinaciones`. El 21 de agosto de 2026 se autorizó la colección aditiva `campus`. El modelo objetivo de Equipos y reservaciones quedó documentado el 21 de agosto de 2026, pero sus colecciones y campos continúan sin autorización de código.

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

Nombre y clave son únicos. Dirección y referencia son opcionales. Los horarios usan `HH:mm`, domingo permanece inactivo y `utilizado` cambia permanentemente a `true` cuando un consumidor futuro crea la primera referencia. El ID Firestore es independiente de la clave.

## Colección objetivo `equipos`

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
- El cliente no escribe reservas ni estados logísticos directamente.
- Este modelo no autoriza la colección; requiere aprobar la estrategia transaccional e índices antes de código.

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
responsable: string
estatus: "programado" | "en_proceso" | "finalizado" | "registrado"
observaciones: string
equipos:
  laptops: number
  proyectores: number
  pantallas: number
  bocinas: number
  microfonos: number
  consolaAudio: number
  extensiones: number
protocoloUrl: string
protocoloNombre: string
calendarEventId: string
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
```

`fechaInicio` y `fechaFin` conservan el formato `YYYY-MM-DD`. `horaInicio` y `horaFin` conservan el formato `HH:mm`.

El ID de Firestore identifica al evento. No existe folio institucional en el modelo implementado.

`coordinacionIds` permite validar referencias y bloquear la eliminación de una coordinación utilizada. `coordinacionesInvolucradas` conserva una fotografía del ID y nombre para que el historial no cambie cuando se renombra o suspende el catálogo. Los correos no se guardan en `eventos` porque la colección puede ser consultada por cualquier usuario autorizado.

`campusId`, `campusHistorico`, `equipoIds` y `equiposSolicitados` son campos aditivos objetivo sin autorización de código. Los eventos históricos conservan el objeto fijo `equipos`; no se renombra, elimina ni migra implícitamente. Un lector futuro interpretará la ausencia de los campos dinámicos como “sin reservación administrada”.

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
- Una coordinación utilizada no se elimina físicamente aunque después se eliminen sus eventos.

## Colección protegida `notificacionesEventos`

```text
eventoId: string
revision: number
tipo: "creacion" | "actualizacion" | "retiro_coordinacion" | "cancelacion"
destinatarioCorreo: string
destinatarioTipo: "creador" | "coordinacion"
coordinacionId: string | null
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
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
fechaEnvio: Timestamp | null
fechaFinalizacion: Timestamp | null
fechaExpiracion: Timestamp | null
```

Esta colección funciona como bandeja de salida protegida. El navegador no crea, modifica ni lee sus documentos. `claveIdempotencia` es única por evento, revisión, tipo y destinatario normalizado. `datosEvento` permite completar una cancelación aun después de eliminar el documento original.

`intentos` cuenta el intento inicial y los reintentos. `proximoIntento` contiene la siguiente ejecución programada y queda en `null` al enviar o agotar el proceso. `fechaFinalizacion` registra el momento en que el envío alcanza `enviado` o fallo permanente. `fechaExpiracion` se fija 90 días después para la purga automática; no se utiliza para registros todavía recuperables.

## Compatibilidad histórica

El estatus `registrado` se conservará para leer datos históricos y se presentará al usuario como “Programado”. Los registros nuevos utilizarán `programado`, `en_proceso` o `finalizado`.

## Archivos

Firestore solo almacenará `protocoloUrl` y `protocoloNombre`. El PDF permanecerá en Firebase Storage.

## Auditoría

No existe actualmente una colección de auditoría operativa. Su creación queda fuera de la migración inicial y requerirá una especificación y actualización de este modelo.

`notificacionesEventos` no sustituye una auditoría general: conserva únicamente el estado técnico mínimo necesario para entregar y reintentar correos de Eventos.
