# Modelo de datos

## Principio

La migración Angular conserva los campos históricos sin renombrarlos, eliminarlos o convertirlos. El 19 de agosto de 2026 se autorizó la colección aditiva `coordinaciones`. El 21 de agosto de 2026 se autorizó la colección aditiva `campus`. Los campos aditivos de Eventos, Equipos, reservaciones y `notificacionesEventos` continúan sin autorización de código.

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
coordinacionIds: string[]
coordinacionesInvolucradas:
  - coordinacionId: string
    nombre: string
revisionNotificacion: number
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

`fechaInicio` y `fechaFin` conservan el formato `YYYY-MM-DD`. `horaInicio` y `horaFin` conservan el formato `HH:mm`.

El ID de Firestore identifica al evento. No existe folio institucional en el modelo implementado.

`coordinacionIds` permite validar referencias y bloquear la eliminación de una coordinación utilizada. `coordinacionesInvolucradas` conserva una fotografía del ID y nombre para que el historial no cambie cuando se renombra o suspende el catálogo. Los correos no se guardan en `eventos` porque la colección puede ser consultada por cualquier usuario autorizado.

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
