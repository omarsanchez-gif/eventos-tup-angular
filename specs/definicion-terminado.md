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
