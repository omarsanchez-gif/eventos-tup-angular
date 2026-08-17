# ADR-002: Integración Firebase en Angular

## Estado

Aceptada.

## Contexto

El sistema Vue utiliza el Firebase Web SDK modular. AngularFire puede ofrecer integración con Angular, pero su compatibilidad debe acompañar la versión Angular seleccionada.

## Decisión

La primera versión Angular utilizará Firebase Web SDK modular directamente, encapsulado en servicios inyectables.

No se utilizará AngularFire inicialmente.

## Reglas

- Un único proveedor o fábrica inicializa Firebase.
- Auth, Firestore, Storage y Functions se exponen mediante adaptadores en `core/firebase`.
- Los módulos funcionales dependen de interfaces de servicio, no de componentes Firebase.
- Ningún componente importa Firebase directamente.
- Conexión a emuladores se controla por ambiente.

## Consecuencias

- Menor riesgo de incompatibilidad entre Angular y AngularFire.
- Mayor continuidad con los contratos actuales.
- Se debe implementar manualmente la adaptación a Signals y RxJS.

## Revisión futura

AngularFire podrá evaluarse posteriormente mediante una nueva ADR. No se mezclará con el SDK directo sin una necesidad comprobada.
