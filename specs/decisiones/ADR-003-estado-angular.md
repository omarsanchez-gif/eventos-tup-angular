# ADR-003: Estado y reactividad

## Estado

Aceptada.

## Decisión

- Signals para estado local, estado de funcionalidad y valores derivados.
- `computed` para selectores derivados.
- RxJS para observadores Firebase, operaciones asíncronas y composición temporal.
- Conversión entre Observable y Signal en los límites del servicio o facade.
- Sin NgRx en el alcance inicial.

## Modelo de estado mínimo

Cada funcionalidad podrá exponer:

```text
data
loading
initialized
error
```

Autenticación expondrá además:

```text
user
isAuthenticated
role
authorized
```

## Reglas

- Componentes no mutan estado de otros módulos directamente.
- Efectos secundarios viven en servicios o facades.
- Suscripciones deben gestionarse sin fugas.
- No duplicar el mismo estado en Signals y Observables sin una fuente definida.

## Revisión

NgRx solo se considerará si la complejidad real demuestra necesidad y se registra una nueva ADR.
