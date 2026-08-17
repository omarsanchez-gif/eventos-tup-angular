# Arquitectura Angular

## Plataforma

- Angular 22 estable.
- SPA renderizada en cliente.
- TypeScript estricto.
- Componentes standalone.
- Angular Router con carga diferida.
- Firebase Web SDK modular.
- Signals y RxJS.
- Angular Material y CDK.
- SCSS y CSS Custom Properties.
- Firebase Hosting estático.

No se utilizarán inicialmente SSR, AngularFire, NgRx o TailwindCSS.

## Organización

```text
src/app/
  core/
    auth/
    configuration/
    firebase/
    guards/
    error-handling/

  shared/
    models/
    ui/
    utilities/

  layout/
    shell/
    sidebar/
    topbar/

  features/
    authentication/
    users/
    events/
    dashboard/
```

## Flujo

```text
Componente
    ↓
Facade/estado con Signals
    ↓
Servicio inyectable
    ↓
Adaptador Firebase o callable
```

## Reglas

- Ningún componente importa Firebase.
- Firebase se inicializa una sola vez.
- Servicios dependen de adaptadores testeables.
- Efectos secundarios viven fuera de componentes.
- Guards controlan navegación; Rules y Functions controlan autorización.
- Errores Firebase se convierten en errores funcionales.
- Modelos de dominio no dependen de Material.
- Componentes compartidos encapsulan variantes visuales.

## Autorización

Firestore conserva el perfil canónico. Claims `authorized` y `role` permiten que Rules evalúe acceso sin depender de IDs documentales. Consultar `ADR-001`.

## Estado

Signals representan estado y valores derivados. RxJS representa observadores y composición asíncrona. Consultar `ADR-003`.

## UI

Angular Material/CDK aporta comportamiento y accesibilidad. El tema institucional y los wrappers propios evitan una apariencia Material genérica. Consultar `ADR-004`.

## Rutas objetivo

```text
/login
/dashboard
/eventos
/usuarios
```

El alcance actual solo autoriza Login y la navegación mínima necesaria para validar una sesión.

## Configuración

- Configuración pública separada por ambiente.
- Secretos exclusivamente en backend.
- Conexión a emuladores solo en local.
- Producción nunca es valor predeterminado de desarrollo.

## Calidad

- Pruebas unitarias, integración, Rules, callables y end-to-end.
- Presupuestos definidos en `criterios-no-funcionales.md`.
- Definición de terminado transversal.
