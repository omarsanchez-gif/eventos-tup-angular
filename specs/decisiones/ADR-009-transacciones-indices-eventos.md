# ADR-009: Concurrencia e índices de Eventos y reservaciones

## Estado

Aprobada expresamente el 29 de septiembre de 2026. Autoriza implementar la estrategia transaccional, los índices de Firestore, las reservaciones y su integración con Eventos. No autoriza despliegue productivo.

## Contexto

Dos solicitudes simultáneas pueden consultar la misma disponibilidad y crear reservaciones diferentes. Consultar únicamente los documentos existentes no proporciona por sí solo un punto común de contención cuando todavía no existe una reserva coincidente. El sistema también debe confirmar una solicitud de hasta 20 tipos de equipo completa o no escribir ninguna parte.

El listado y el calendario requieren consultas acotadas por cursores o intervalos; no deben descargar el historial completo. Firestore admite filtros de rango sobre varios campos, pero las consultas compuestas requieren índices explícitos y deben medirse para controlar lecturas y costos.

## Decisión transaccional

1. Toda creación o sustitución de reservaciones se ejecuta exclusivamente en backend mediante Admin SDK.
2. El backend ordena los IDs de equipo y lee primero, dentro de una sola transacción:
   - perfil canónico y documento del evento aplicable;
   - campus y configuración logística canónicos;
   - documentos de cada equipo;
   - `controlReservasEquipo/{equipoId}`;
   - reservaciones activas que se superponen con cada intervalo calculado.
3. `controlReservasEquipo/{equipoId}` contiene una versión monotónica administrada por servidor. No contiene ni representa disponibilidad.
4. Toda transacción que cree, sustituya, reduzca, cancele o finalice una reserva incrementa la versión de cada equipo afectado. Dos operaciones concurrentes sobre el mismo equipo modifican el mismo documento de control; Firestore reintenta una de ellas y obliga a recalcular con las reservas confirmadas más recientes.
5. La disponibilidad se calcula desde `cantidadOperativa` menos la suma de reservas `confirmada` o `requiere_revision` cuyos intervalos se superponen.
6. Si cualquier equipo, cantidad, campus, destino, corte o intervalo es inválido, la transacción termina sin escribir evento, reservas, controles ni marcas de uso.
7. Si todo es válido, la misma transacción escribe el estado canónico del evento, todas las reservas deterministas, controles y marcas permanentes de uso.
8. Un evento admite como máximo 20 tipos distintos de equipo, IDs únicos y cantidades enteras positivas.
9. El ID de reserva es determinista por evento y equipo. Repetir el mismo estado objetivo no crea documentos adicionales.
10. En edición se bloquea la unión ordenada de equipos anteriores y nuevos. Las reservas nuevas sustituyen a las anteriores dentro de la misma transacción; si falla, el estado anterior permanece intacto.
11. En cancelación se actualizan reservas y controles dentro de la misma transacción. Una reserva con traslado iniciado conserva el bloqueo y la logística de regreso definidos por la spec.
12. PDF, Google Calendar y SMTP no se ejecutan dentro de la transacción. Se procesan después de confirmar Firestore mediante operaciones idempotentes y reconciliables.

## Modelo de control protegido

```text
controlReservasEquipo/{equipoId}
  equipoId: string
  version: integer
  fechaActualizacion: Timestamp
```

El documento se crea idempotentemente en la primera operación que afecte al equipo. Solo Admin SDK puede leerlo o escribirlo. No se expone al frontend y no reemplaza a `reservasEquipo`.

## Consultas e índices aprobados

`firestore.indexes.json` declarará como mínimo:

1. Disponibilidad por equipo e intervalo en `reservasEquipo`:
   - `equipoId ASC`
   - `estado ASC`
   - `bloqueoInicio ASC`
   - `bloqueoFin ASC`
2. Calendario general por superposición en `eventos`:
   - `inicioAt ASC`
   - `finAt ASC`
3. Calendario filtrado por campus:
   - `campusId ASC`
   - `inicioAt ASC`
   - `finAt ASC`
4. Listado administrativo por creación:
   - `fechaCreacion DESC`
   - `__name__ DESC`

La consulta de superposición usa inicio anterior al fin exclusivo solicitado y fin posterior al inicio inclusivo solicitado. Los eventos sin instantes canónicos se atienden mediante el contrato histórico separado y no amplían silenciosamente la consulta principal.

El estado temporal se deriva después de recuperar el intervalo, por lo que no forma parte del índice. El filtro visual de estado se aplica sobre el resultado acotado a un máximo de 42 fechas y nunca obliga a leer el historial completo.

Los índices se validan primero en Emulator Suite y staging. Después de contar con volumen representativo se usa Query Explain para revisar documentos e índices leídos; cualquier cambio de orden o campos actualiza esta ADR y las pruebas.

## Consecuencias

- Existe un punto de contención por equipo incluso cuando la consulta de reservas inicialmente está vacía.
- Una solicitud de varios equipos es todo o nada.
- La transacción puede reintentarse; no puede enviar correos, subir archivos ni modificar estado de interfaz durante su función.
- Solicitudes sobre equipos distintos no compiten por un bloqueo global.
- Un equipo muy solicitado puede producir contención; el backend devuelve un error recuperable después de agotar los reintentos y nunca confirma capacidad parcial.
- Los documentos de control agregan una escritura por equipo afectado, aceptada para el límite de 20 tipos por evento.

## Alternativas descartadas

### Confiar solo en la consulta de reservas

Descartado porque dos solicitudes pueden partir de un conjunto vacío o diferente sin compartir un documento escrito común.

### Guardar `cantidadDisponible`

Descartado porque puede quedar desincronizada respecto de intervalos, cancelaciones, demoras y ediciones.

### Un único bloqueo global

Descartado porque eventos con equipos independientes competirían innecesariamente y crearían un punto caliente.

### Reservar cada equipo por separado

Descartado porque dejaría asignaciones parciales y exigiría compensaciones frágiles.
