# Modelo de datos

## Principio

La migración Angular consumirá el modelo real existente. No se renombrarán, eliminarán o convertirán campos durante la sustitución del frontend.

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
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

`fechaInicio` y `fechaFin` conservan el formato `YYYY-MM-DD`. `horaInicio` y `horaFin` conservan el formato `HH:mm`.

El ID de Firestore identifica al evento. No existe folio institucional en el modelo implementado.

## Compatibilidad histórica

El estatus `registrado` se conservará para leer datos históricos y se presentará al usuario como “Programado”. Los registros nuevos utilizarán `programado`, `en_proceso` o `finalizado`.

## Archivos

Firestore solo almacenará `protocoloUrl` y `protocoloNombre`. El PDF permanecerá en Firebase Storage.

## Auditoría

No existe actualmente una colección de auditoría operativa. Su creación queda fuera de la migración inicial y requerirá una especificación y actualización de este modelo.
