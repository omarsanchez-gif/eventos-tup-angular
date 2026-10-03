# ADR-010: Cierre operativo para implementar Eventos

## Estado

Aprobada el 30 de septiembre de 2026 por instrucción del usuario de documentar las recomendaciones necesarias antes de continuar código. Cerró los contratos técnicos que permitieron implementar y, mediante autorizaciones posteriores separadas, desplegar Eventos únicamente a staging. Esta ADR por sí sola no autoriza nuevos despliegues ni producción.

## Contexto

Creación, disponibilidad, listado, detalle inicial, calendario y estados temporales ya funcionan localmente. Permanecían ambiguos la búsqueda sobre todas las páginas, el detalle editable, las acciones administrativas de logística, la reclamación exclusiva del worker, la limpieza programada, los estados públicos de integración y la compatibilidad de búsqueda y calendario con eventos históricos.

## Decisión 1: búsqueda global paginada

1. El backend genera `terminosBusqueda` al crear o editar un evento; el navegador nunca lo envía como autoridad.
2. La normalización usa minúsculas, descomposición Unicode, retiro de diacríticos, espacios simples y recorte.
3. Se generan, sin duplicados:
   - prefijos de 2 a 80 caracteres de `nombreEvento` y `responsable` normalizados;
   - prefijos de 2 a 30 caracteres de cada palabra de ambos campos.
4. El documento admite como máximo 500 términos. Los límites actuales de nombre y responsable deben caber; excederlos es error interno y no produce un índice parcial.
5. La entrada de búsqueda admite de 2 a 80 caracteres normalizados. Un carácter no consulta backend; la interfaz explica el mínimo.
6. `listEvents` recibe `busqueda` y `cursor`. Sin búsqueda conserva orden descendente por creación. Con búsqueda usa `array-contains` sobre `terminosBusqueda` y el mismo orden y tamaño de página de 25.
7. El cursor opaco incluye modo, término normalizado, `fechaCreacion` e ID; no se puede reutilizar con otro término.
8. Se agrega el índice compuesto de `terminosBusqueda ARRAY_CONTAINS`, `fechaCreacion DESC` y `__name__ DESC`.
9. Los eventos históricos siguen visibles en el listado. Para incluirlos en búsqueda global y calendario se autoriza implementar un comando administrativo de backfill con `--dry-run`, reanudación y conteos; ejecutarlo en producción requerirá autorización separada.

## Decisión 2: detalle y mutaciones

Se implementan los contratos backend siguientes:

- `getEventDetail(eventId)`: proyección sanitizada con datos editables, fotografías y logística; nunca devuelve correos, secretos, controles de concurrencia o documentos técnicos de notificación.
- `updateEvent(eventId, estadoObjetivo)`: solo propietario; compara estado previo y objetivo, aplica reglas posteriores al límite, sustituye reservas de forma atómica y conserva íntegro el estado anterior si falla.
- `cancelEvent(eventId)`: solo propietario; idempotente, retira Calendar y PDF, resuelve logística y conserva el documento histórico cancelado.
- `reconcileEventIntegrations(eventId)`: propietario o `admin`; vuelve a intentar exclusivamente el estado canónico pendiente sin duplicar Calendar o correos enviados.

El formulario de alta se reutiliza para edición. Un evento cancelado queda de solo lectura. Listado y calendario abren el mismo detalle; solo el propietario ve Editar o Cancelar.

## Decisión 3: estados públicos de integración

`eventos` incorpora campos administrados por backend:

```text
protocoloRuta: string | null
calendarEstado: "pendiente" | "sincronizado" | "error" | "retirado"
notificacionesEstado: "pendiente" | "completas" | "parciales" | "no_aplica"
terminosBusqueda: string[]
```

- `protocoloRuta` se deriva del objeto validado de Storage y es la referencia autoritativa para reemplazo, cancelación y limpieza; la URL continúa siendo solo una referencia de lectura.
- Los estados públicos no incluyen errores técnicos ni destinatarios.
- `calendarEventId` sigue siendo la clave idempotente externa.
- `revisionNotificacion` sigue controlando las revisiones de correo.

## Decisión 4: revisión y acciones logísticas

`reservasEquipo` incorpora:

```text
motivosRevision: ("cobertura_sistemas" | "inventario_reducido" | "coordinacion_sistemas")[]
```

El arreglo evita que confirmar cobertura borre una revisión causada por inventario u otra condición.

Se implementan tres callables exclusivas de `admin`:

- `confirmReservationCoverage(eventId, equipmentId)`: confirma cobertura y retira solo `cobertura_sistemas`; cambia a `confirmada` únicamente cuando no quedan motivos.
- `confirmEquipmentReception(eventId, equipmentId)`: registra hora de servidor, finaliza y libera anticipadamente la reserva, actualiza `bloqueoFin` y aumenta el control del equipo.
- `reportEquipmentDelay(eventId, equipmentId, nuevaLiberacion)`: exige un instante futuro posterior al regreso previsto, actualiza `liberacionProgramada` y `bloqueoFin`, conserva consumo de capacidad y aumenta el control.

Todas revalidan perfil, rol, evento, reserva y estado objetivo; son idempotentes y registran una entrada estructurada de Cloud Logging sin correos ni secretos.

La interfaz vive en el detalle del evento, sección “Logística de equipos”. Todos los autorizados pueden leer la proyección funcional; solo `admin` ve acciones. Cada acción usa confirmación, estado de carga independiente, texto además de color y anuncia el resultado.

## Decisión 5: Calendar, correo y reclamación exclusiva

1. Crear o editar confirma Firestore primero y después intenta Calendar y la creación de trabajos de correo.
2. El intento inmediato ocurre fuera de la transacción. Un fallo devuelve integración parcial y no revierte el evento.
3. Un worker programado cada 5 minutos recupera trabajos vencidos en lotes máximos de 50.
4. Cada trabajo se reclama en una transacción mediante `procesadorId` y `bloqueoHasta`; el lease dura 10 minutos.
5. Un worker solo envía si conserva el lease. Un lease vencido puede recuperarse sin considerar enviado el intento anterior.
6. El envío confirmado se marca antes de liberar el lease. Las claves idempotentes impiden volver a crear el mismo trabajo.
7. El intento inicial y los reintentos conservan los intervalos ya aprobados: inmediato, 5 minutos, 30 minutos y 2 horas.
8. `notificacionesEstado` se recalcula desde la revisión vigente: `pendiente` mientras exista trabajo recuperable, `completas` cuando todos estén enviados y `parciales` ante un fallo permanente.
9. Calendar usa el mismo estado canónico y recrea el evento ante `404/410`; nunca agrega asistentes.

`notificacionesEventos` añade `procesadorId`, `bloqueoHasta` y `ultimoIntento` para hacer observable y recuperable la reclamación.

Los correos a Sistemas usan `tipo: logistica`. Su `revision` es la versión monotónica del control que originó esa causa, fotografiada por separado en `versionesAvisoLogistico`; la clave idempotente incluye evento, equipo, motivo, versión y destinatario. Por ello otra operación logística no repite causas vigentes ni altera `revisionNotificacion` o los correos funcionales del evento.

## Decisión 6: retención y limpieza

- `cleanupEventProtocols` se ejecuta diariamente a las 04:00 en `America/Cancun`.
- Examina exclusivamente `eventos/`, ignora objetos menores de 24 horas y elimina solo objetos sin un evento cuyo `protocoloRuta` coincida.
- Procesa como máximo 1000 objetos por ejecución. Si se supera, registra `reconciliation-required` y no comunica limpieza completa.
- `notificacionesEventos.fechaExpiracion` usa una política TTL de Firestore. Backend la establece 90 días después del estado terminal; registros recuperables conservan `null`.
- TTL es asíncrono y puede eliminar después del instante objetivo conforme al comportamiento administrado de Firestore; la aplicación nunca depende de una eliminación exacta para autorización o lógica.
- Repetir la limpieza de protocolos es idempotente. Un fallo parcial conserva elementos no confirmados para la siguiente ejecución.

## Decisión 7: compatibilidad histórica

- El lector nunca inventa datos ausentes.
- Eventos con fechas locales completas pueden derivar instantes en memoria; los incompletos conservan estado histórico y muestran “Revisión necesaria”.
- El backfill autorizado calcula únicamente `inicioAt`, `finAt` y `terminosBusqueda` cuando las fuentes históricas sean completas y válidas; no crea reservas, no envía correos y no crea Calendar.
- El comando genera reporte de procesados, omitidos y errores, admite reanudación y empieza siempre en `--dry-run`.
- Staging se valida antes de solicitar una ejecución productiva separada.

## Decisión 8: secuencia de implementación y staging

1. Actualizar modelos, índices, Rules y pruebas contractuales.
2. Implementar detalle, búsqueda, edición, cancelación y logística con dobles de integraciones.
3. Implementar Calendar, outbox SMTP, workers y limpieza con dobles.
4. Completar Angular y pruebas accesibles.
5. Resolver dependencias altas sin `--force` y ejecutar la suite integral.
6. Guardar el ID canónico de Sistemas en `configuracion/logisticaEquipos`.
7. Cargar secretos y allowlist en Secret Manager.
8. Desplegar a staging por servicio: índices, Rules, Functions y Hosting.
9. Ejecutar pruebas sintéticas y aceptación. Producción requiere otra autorización.

## Consecuencias

- La siguiente sesión no necesita tomar decisiones funcionales o técnicas para el alcance pendiente.
- Se agregan campos derivados y protegidos, tres callables administrativas, un worker SMTP programado, una limpieza programada de Storage, una política TTL y un comando de backfill no ejecutable implícitamente.
- La búsqueda continúa dentro de Firestore y conserva paginación; no se incorpora un motor externo.
- Los costos permanecen acotados por páginas, lotes, rangos y límites documentados.

## Alternativas descartadas

- Filtrar solo la página visible: no satisface búsqueda global.
- Descargar todos los eventos: rompe paginación y escalabilidad.
- Algolia, Typesense o Elastic: dependencia y costo innecesarios para el volumen inicial.
- Liberar equipo por reloj del navegador: no es autoritativo.
- Un worker sin lease: permite envíos duplicados concurrentes.
- Borrar PDFs por antigüedad sin comprobar referencia: puede eliminar el protocolo vigente.
