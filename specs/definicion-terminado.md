# Definición de terminado

## Para una tarea

- Tiene referencia a una regla, criterio de aceptación o caso de prueba.
- Implementa solo el alcance indicado.
- Incluye estados de carga, error y éxito aplicables.
- Tiene pruebas automatizadas proporcionales al riesgo.
- Cumple lint, formato y TypeScript estricto.
- Si modifica UI, supera `npm run lint:visual` y consume las primitivas globales sin redefinirlas.

## Para un módulo

- Todos los criterios de aceptación de `spec.md` están demostrados.
- Todas las tareas obligatorias están completadas.
- Todos los casos de `pruebas.md` pasan.
- Guards, Rules y Functions aplicables fueron probados.
- Cumple accesibilidad y responsive.
- Mantiene la identidad visual común de botones, iconos, controles, tipografía, foco y estados.
- No existen errores conocidos críticos o altos.
- La trazabilidad está actualizada.
- Se validó en emuladores y, cuando corresponda, staging.

## Para Eventos y reservaciones

- Fronteras de cinco fechas de anticipación, seis fechas operativas, domingo y zona `America/Cancun` fueron probadas con reloj controlado.
- La transacción de varios equipos demuestra todo o nada, idempotencia y ausencia de sobreasignación concurrente.
- Eventos multidiarios mantienen equipos bloqueados durante todas las noches y separan estado temporal de logística.
- `Programado`, `En ejecución` y `Finalizado` se derivan sin cron; cancelación histórica, Calendar, correo y reservas se reconcilian sin estados falsos.
- FullCalendar consulta solo el intervalo visible, usa Firestore como fuente, permanece de solo lectura y ofrece vistas mes, semana, día y lista accesibles.
- La búsqueda global usa el índice y cursor aprobados, encuentra nombre o responsable fuera de la página visible y no descarga la colección.
- Edición y cancelación demuestran propiedad, comparación previo/objetivo, sustitución atómica y conservación del estado anterior ante fallo.
- Cobertura, recepción y demora demuestran roles, motivos de revisión independientes y control monotónico del equipo.
- Calendar, SMTP y limpieza demuestran idempotencia, lease exclusivo, lotes, recuperación y estados públicos sin datos sensibles.
- El backfill histórico pasa primero en modo seco; ninguna ejecución productiva forma parte implícita de la publicación.
- Índices Firestore, calendario, SMTP, lista permitida y Coordinación de Sistemas de staging están verificados antes de aceptación.

## Para una publicación

- Build de producción exitoso.
- Pruebas unitarias, integración, reglas y end-to-end en verde.
- Variables del ambiente validadas sin exponer secretos.
- Preview o staging aprobado.
- Plan de reversión verificado.
- No se ejecutaron migraciones de datos implícitas.
- Existe aceptación funcional y visual.

## Evidencia mínima

- Resultado de pruebas.
- Capturas o registro de aceptación visual.
- Lista de criterios verificados.
- Cambios de specs o ADRs asociados.
- Identificador de la versión desplegada.
