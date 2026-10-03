# Contrato: reservaciones y logística de Equipos

## Estado

Decisiones funcionales documentadas, incluido el contrato multidiario aprobado el 28 de septiembre de 2026. La estrategia transaccional, índices, reservaciones y su integración con Eventos fueron autorizadas expresamente el 29 de septiembre de 2026 conforme a ADR-009. El 30 de septiembre se implementaron, verificaron y desplegaron únicamente a staging la disponibilidad, creación y sustitución atómicas, cancelación, recepción, demora, cobertura administrativa y avisos logísticos. Los índices requeridos están `READY`; la aceptación manual sigue pendiente y producción no está autorizada.

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

- Máximo 20 tipos distintos de equipo por evento.
- `equipoId` no se repite dentro de la solicitud.
- Cada cantidad es un entero positivo.

## Reglas del Evento solicitante

- Se crea con al menos cinco fechas naturales de anticipación, calculadas por backend en `America/Cancun`; el día límite completo es válido y no existe excepción de `admin`.
- Puede durar como máximo seis fechas operativas consecutivas.
- Pertenece a un solo campus y no puede iniciar, terminar ni transcurrir en domingo.
- Un intervalo de varios días es continuo. El inventario permanece comprometido durante las noches aunque no exista actividad visible.

## Intervalos

### Equipo local

- Inicio de bloqueo: 60 minutos antes del evento.
- Fin de bloqueo: 30 minutos después del evento.
- En eventos multidiarios, ambos márgenes se aplican una sola vez: antes del primer inicio y después del último fin; todas las noches intermedias permanecen bloqueadas.
- La cobertura fuera de horario de Sistemas puede quedar pendiente, pero no impide reservar inventario.

### Equipo transferido

- Sale a las 17:00 del día operativo anterior en que origen y destino permiten completar la recepción.
- Una solicitud creada después del corte correspondiente no puede confirmar ese equipo remoto.
- Para un evento del lunes en FCS, la salida ocurre el viernes a las 17:00 porque FCS no recibe a las 17:30 del sábado.
- El equipo permanece bloqueado desde la salida hasta su liberación en el campus base.
- En eventos multidiarios, la salida se calcula respecto del primer inicio y el regreso respecto del último fin; no regresa ni se reutiliza entre jornadas.
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
- La consulta previa de una edición excluye las reservas activas cuyo `eventoId` coincide con el evento editado, únicamente después de validar existencia, propiedad y estado no cancelado en backend. La consulta de creación no excluye ninguna reserva y una edición nunca ignora reservas de otros eventos.

## Estrategia transaccional aprobada

1. El backend calcula primero todos los intervalos logísticos sin producir efectos externos.
2. Ordena la unión de IDs de equipo del estado anterior y objetivo.
3. Dentro de una sola transacción lee perfil, evento, campus, configuración, equipos, `controlReservasEquipo/{equipoId}` y reservas activas superpuestas.
4. Calcula todas las cantidades disponibles con el mismo estado consistente.
5. Si cualquier equipo falla, termina la transacción sin escribir evento, reservas, controles ni marcas de uso.
6. Si todos cumplen, escribe el evento y las reservas deterministas, cancela o sustituye las reservas anteriores, incrementa la versión de cada control y marca como utilizados los catálogos aplicables.
7. Dos operaciones concurrentes sobre un mismo equipo escriben el mismo control. Firestore reintenta una de ellas y la disponibilidad se vuelve a calcular con el estado actualizado.
8. Si se agotan los reintentos, responde un error recuperable; no confirma cantidades parciales.

La función transaccional puede ejecutarse más de una vez. No sube PDFs, no llama Calendar o SMTP, no escribe logs con destinatarios y no modifica estado de interfaz.

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
- Después del día límite de cinco fechas se permite retirar equipo o reducir cantidades. Agregar equipo, aumentar cantidades o cambiar de campus se rechaza aunque exista disponibilidad.
- Posponer solo permite recalcular equipo cuando la nueva fecha de inicio vuelve a cumplir cinco fechas naturales desde la fecha de servidor. Adelantar nunca puede producir una fecha inválida.
- Abrir una edición sin modificar fechas, campus, equipos o cantidades muestra como confirmable el estado ya reservado por ese evento, salvo que capacidad adicional ajena produzca una incompatibilidad real. El guardado conserva la validación transaccional de todo o nada.

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
motivosRevision: ("cobertura_sistemas" | "inventario_reducido" | "coordinacion_sistemas")[]
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

El identificador es determinista por evento y equipo para facilitar idempotencia. Esta spec no prescribe un contador disponible mutable.

## Modelo de control de concurrencia

```text
controlReservasEquipo/{equipoId}
  equipoId: string
  version: integer
  fechaActualizacion: Timestamp
```

La versión es monotónica y administrada por servidor. No contiene disponibilidad ni cantidades. Su actualización dentro de cada transacción garantiza un documento común de contención incluso cuando la consulta de reservas coincidentes estaba vacía.

## Índices aprobados

- `reservasEquipo`: `equipoId ASC`, `estado ASC`, `bloqueoFin ASC`, `bloqueoInicio ASC`.
- `eventos`: `finAt ASC`, `inicioAt ASC`.
- `eventos` por campus: `campusId ASC`, `finAt ASC`, `inicioAt ASC`.
- listado de `eventos`: `fechaCreacion DESC`, `__name__ DESC`, atendido por el índice automático de campo único; no se declara como compuesto porque Firestore lo rechaza como redundante.

Los índices compuestos necesarios se declaran en `firestore.indexes.json`, se prueban localmente y se despliegan únicamente a staging mediante autorización específica. El orden podrá optimizarse con Query Explain sin cambiar las reglas funcionales y documentando previamente cualquier ajuste.

El 1 de octubre de 2026 se corrigió el orden de los dos campos de rango de `reservasEquipo` después de que la consulta real de staging solicitara `bloqueoFin` antes de `bloqueoInicio`. El índice corregido quedó `READY`, la consulta remota fue satisfactoria y el índice anterior se retiró. Este ajuste no cambia intervalos, capacidad, atomicidad ni modelo de datos.

Ese mismo día, la consulta real del calendario solicitó `finAt` antes de `inicioAt`, tanto en la variante general como después de `campusId` en la variante filtrada. Los dos índices corregidos quedaron `READY`, ambas consultas remotas fueron satisfactorias y los índices anteriores se retiraron. El ajuste no cambia la semántica de superposición ni el contrato de reservaciones.

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

## Operaciones administrativas aprobadas

- `confirmReservationCoverage(eventId, equipmentId)` retira únicamente `cobertura_sistemas`; la reserva se confirma solo cuando no queda otro motivo.
- `confirmEquipmentReception(eventId, equipmentId)` usa hora de servidor, registra recepción, cambia a `finalizada`, acorta `bloqueoFin` y aumenta el control.
- `reportEquipmentDelay(eventId, equipmentId, nuevaLiberacion)` exige una nueva liberación futura posterior al regreso previsto, extiende `bloqueoFin`, conserva consumo de capacidad y aumenta el control.
- Solo `admin` ejecuta estas acciones. Se revalidan evento, reserva, rol y estado objetivo dentro de la transacción.
- La UI se ubica en el detalle de Eventos, sección “Logística de equipos”; no se crea un módulo o ruta adicional.
- Las causas independientes viven en `motivosRevision`, por lo que confirmar cobertura no borra una revisión por inventario o coordinación.

## Pendientes operativos

- Resolver y guardar por ID canónico la Coordinación de Sistemas ya creada en staging.
- Probar la consulta por intervalo, eventos multidiarios, límites de anticipación, traslados, demoras y edición concurrente en Emulator Suite.
- Cargar secretos y completar pruebas controladas antes del despliegue funcional de Calendar y SMTP a staging.
- Las tres operaciones administrativas están implementadas; la matriz exhaustiva de carreras de recepción, demora y cobertura continúa como aceptación técnica pendiente conforme a ADR-010.
- Enviar alertas logísticas mediante la bandeja protegida cuando exista `cobertura_sistemas`, `inventario_reducido`, cambio incompatible posterior al traslado, demora o cancelación posterior a la salida. `versionesAvisoLogistico` conserva por causa la versión del control que la originó y la deduplicación usa evento, equipo, motivo, esa versión y destinatario de la coordinación canónica de Sistemas.
