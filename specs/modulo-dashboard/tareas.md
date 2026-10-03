# Tareas: Dashboard

## Especificación y seguridad

- [x] DASH-T01 Autorizar el Dashboard funcional y sustituir la vista temporal sin cambiar `/dashboard`.
- [x] DASH-T02 Definir cálculos, compatibilidad histórica, errores parciales y contrato sanitizado.
- [x] DASH-T03 Documentar autorización para ambos roles y ausencia de lectura directa de `usuarios`.
- [x] DASH-T04 Declarar índices y límites de consulta.

## Backend

- [x] DASH-T05 Implementar el caso de uso `getDashboardSummary` con revalidación canónica.
- [x] DASH-T06 Implementar repositorio Firestore con agregaciones y listas limitadas.
- [x] DASH-T07 Exponer una callable Gen 2 sin secretos ni escritura.
- [x] DASH-T08 Cubrir autorización, cálculos, compatibilidad y fallos parciales con pruebas.
- [x] DASH-T09 Validar consultas e índice con Firestore Emulator.

## Angular

- [x] DASH-T10 Crear modelos, gateway Firebase y mapper de errores funcionales.
- [x] DASH-T11 Implementar `DashboardFacade` con Signals, carga y reintento.
- [x] DASH-T12 Sustituir `TemporaryDashboard` por `DashboardPage` lazy.
- [x] DASH-T13 Implementar cuatro KPI, próximos eventos y actividad reciente con datos reales.
- [x] DASH-T14 Implementar carga, vacíos, error total y error parcial accesibles.
- [x] DASH-T15 Adaptar tabla a tarjetas móviles y consumir primitivas visuales compartidas.

## Calidad y entrega

- [x] DASH-T16 Aprobar pruebas Angular y Functions, Firestore Emulator, lint, guardia visual, formato y builds.
- [ ] DASH-T17 Realizar aceptación visual y accesible manual.
- [x] DASH-T18 Desplegar índice, Function y Hosting únicamente con autorización separada de staging.
- [ ] DASH-T19 Verificar datos reales en staging para ambos roles sin usar producción.
