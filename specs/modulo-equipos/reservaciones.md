# Contrato futuro: reservaciones y logística de Equipos

## Estado

Decisiones funcionales documentadas. No autoriza código, colecciones, Functions, triggers, correo ni integración con Eventos.

## Principio

Una solicitud de Evento confirma todos los equipos y cantidades o ninguno. La operación no deja reservaciones parciales y debe resistir solicitudes concurrentes.

## Entrada mínima

```text
eventoId
campusEventoId
fechaHoraInicio
fechaHoraFin
equiposSolicitados:
  - equipoId
    cantidad
```

El backend obtiene campus, clasificación, cantidades, destinos, nombres y configuración logística desde documentos canónicos. Nunca acepta disponibilidad calculada, nombres históricos, correos o permisos desde el cliente.

## Intervalos

### Equipo local

- Inicio de bloqueo: 60 minutos antes del evento.
- Fin de bloqueo: 30 minutos después del evento.
- La cobertura fuera de horario de Sistemas puede quedar pendiente, pero no impide reservar inventario.

### Equipo transferido

- Sale a las 17:00 del día operativo anterior en que origen y destino permiten completar la recepción.
- Una solicitud creada después del corte correspondiente no puede confirmar ese equipo remoto.
- Para un evento del lunes en FCS, la salida ocurre el viernes a las 17:00 porque FCS no recibe a las 17:30 del sábado.
- El equipo permanece bloqueado desde la salida hasta su liberación en el campus base.
- El regreso inicia al cierre operativo del destino o en la siguiente ventana operativa cuando evento y desmontaje terminan después.
- La liberación predeterminada ocurre 60 minutos después de iniciar el regreso.
- Un `admin` puede confirmar recepción anticipada.
- Si reporta demora, debe proporcionar una nueva fecha y hora estimada; esta sustituye la liberación automática anterior.
- El equipo que espera regreso no puede reutilizarse en el campus destino.
- Cancelar después de la salida conserva la ventana de regreso.

## Cobertura de Sistemas

```text
no_requerida
pendiente
confirmada
```

- La cobertura se evalúa con horarios del campus del evento.
- Una solicitud fuera de horario conserva la reservación con estado `pendiente`.
- Solo `admin` confirma cobertura.
- La coordinación responsable se elige desde Coordinaciones y se guarda por ID canónico en configuración protegida.
- Los correos se resuelven desde la coordinación vigente al crear cada notificación; nunca se guardan en el navegador.
- Coordinación suspendida o sin correos no revierte la reservación: genera advertencia y reconciliación pendiente.

## Disponibilidad

```text
disponible = cantidadOperativa - suma(cantidades reservadas en intervalos coincidentes)
```

- No existe campo persistido `cantidadDisponible`.
- Estados que consumen capacidad: `confirmada` y `requiere_revision` mientras no se resuelva o cancele.
- Una solicitud insuficiente se rechaza completa; nunca asigna cantidades parciales.
- Varios tipos de equipo se validan y confirman en una sola operación atómica.
- Reintentar el mismo estado objetivo es idempotente.

## Reducción de inventario

- El administrador puede registrar una reducción operativa aunque revele insuficiencia futura.
- Las reservaciones afectadas se marcan `requiere_revision` de forma determinista.
- Se notifica a Sistemas.
- No se cancela el evento, no se reduce silenciosamente la cantidad solicitada y no se reasigna otro equipo automáticamente.

## Edición de Eventos

- Cambiar fechas, horas, campus, equipos o cantidades recalcula el estado completo.
- La nueva reserva se confirma antes de liberar la anterior dentro de una operación que no deje estado parcial.
- Si el nuevo estado no puede confirmarse, se conserva el estado anterior.
- Después de iniciar un traslado, una edición incompatible requiere revisión administrativa y no adelanta el regreso automáticamente.

## Domingo

- No se crean eventos que inicien, terminen o transcurran en domingo.
- El frontend lo comunica tempranamente y el backend lo aplica como autoridad.

## Modelo objetivo de reservación

```text
reservasEquipo/{reservaIdDeterminista}
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

El identificador debe ser determinista por evento y equipo para facilitar idempotencia. La implementación deberá aprobar previamente la estrategia transaccional e índices de Firestore; esta spec no prescribe un contador disponible mutable.

## Configuración protegida objetivo

```text
configuracion/logisticaEquipos
  coordinacionSistemasId: string
  montajeMinutos: 60
  desmontajeMinutos: 30
  horaSalidaTraslado: "17:00"
  duracionTrasladoInicialMinutos: 30
  margenLiberacionRegresoMinutos: 60
  zonaHoraria: "America/Cancun"
```

Solo backend y operaciones administrativas expresamente especificadas pueden modificar esta configuración.

## Pendiente bloqueante

Debe decidirse si Eventos permitirá intervalos de varios días. Hasta resolverlo, el catálogo puede implementarse, pero reservaciones y Eventos no pueden autorizarse.
