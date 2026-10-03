# ADR-008: Ciclo temporal y calendario administrativo de Eventos

## Estado

Aprobada documentalmente el 28 de septiembre de 2026. La implementación de Eventos, FullCalendar Standard, Functions e índices fue autorizada expresamente el 29 de septiembre de 2026 mediante ADR-009. No autoriza producción ni despliegue real de integraciones sin sus precondiciones de staging.

## Contexto

Eventos necesita soportar actividades de varios días, anticipación operativa, estados coherentes con la hora institucional y una vista calendario de eventos pasados y próximos. Persistir transiciones temporales mediante tareas programadas introduciría estados obsoletos si un proceso se retrasa. Usar Google Calendar como fuente mezclaría una integración externa con el estado canónico del producto.

## Decisión

1. La zona institucional es `America/Cancun` y backend calcula `inicioAt` y `finAt` desde los campos locales del evento.
2. Un evento nuevo requiere cinco fechas naturales de anticipación. El día límite se acepta completo y no existe excepción administrativa.
3. Se permiten hasta seis fechas operativas consecutivas, un solo campus, intervalo continuo y ninguna presencia en domingo.
4. Los equipos permanecen montados y bloqueados durante las noches. Montaje ocurre antes del primer inicio y desmontaje o regreso después del último fin.
5. `programado`, `en_ejecucion` y `finalizado` se derivan de instantes y de una referencia `serverNow` entregada por backend; no se escriben mediante cron. `cancelado` es persistido y prevalece.
6. Cancelar conserva un registro histórico de solo lectura, retira las integraciones y resuelve la logística sin borrar la evidencia funcional.
7. Firestore permanece como fuente canónica del listado y del calendario administrativo. Google Calendar es solo una integración backend de salida.
8. Se adopta FullCalendar Standard mediante su conector oficial Angular, cargado de forma lazy dentro de Eventos. La implementación fijará una versión compatible con Angular 22 y registrará su licencia MIT en el inventario de dependencias.
9. La primera versión permite vistas mes, semana, día y lista; en móvil prioriza lista. No permite crear por selección, arrastrar, redimensionar ni cambiar campus.
10. La vista solicita únicamente el intervalo visible, inicialmente hasta 42 fechas, incluye superposiciones y devuelve una proyección sanitizada.
11. Seleccionar un evento abre su detalle. Editar o cancelar continúa sujeto a propiedad y a las mismas validaciones del formulario.
12. Premium/Scheduler, vistas por recursos, recurrencia y edición directa quedan fuera de alcance.

## Ediciones después del límite

Después del día límite se permiten correcciones de nombre u observaciones, cambios de coordinaciones, retiro o reducción de equipos y cancelación. Se prohíben nuevos equipos, aumentos, cambio de campus y adelantos inválidos. Posponer exige que la nueva fecha vuelva a cumplir cinco fechas naturales desde el momento de la operación.

## Accesibilidad

- Estado, campus, fecha y horario se comunican mediante texto; el color nunca es la única señal.
- Eventos seleccionables son alcanzables por teclado y tienen nombre accesible.
- La vista de lista ofrece una alternativa equivalente al calendario gráfico.
- Carga, vacío, error y actualización de rango se anuncian sin mover el foco inesperadamente.

## Consecuencias

- Se agregan instantes canónicos y metadatos de cancelación al modelo objetivo sin eliminar campos históricos.
- La consulta por rango y las reservaciones usan la estrategia e índices aprobados en ADR-009.
- La cancelación reemplaza la eliminación física del documento de Evento en el nuevo flujo.
- El calendario no puede ocultar fallos de integraciones ni presentar disponibilidad de equipos como confirmada sin backend.
- Incorporar FullCalendar requiere la revisión de dependencia prevista por `AGENTS.md`, pruebas accesibles y control del presupuesto de bundle.

## Alternativas descartadas

- Cron que actualiza cada evento: puede retrasarse y duplica un estado derivable.
- Google Calendar como fuente: no contiene todo el estado canónico y puede fallar independientemente.
- FullCalendar Premium/Scheduler: no es necesario para el alcance y añade obligaciones de licencia.
- Arrastrar para editar: omite o vuelve opacas las validaciones de anticipación, disponibilidad, notificaciones y logística.
