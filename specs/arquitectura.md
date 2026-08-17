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

El alcance actual autoriza Login y `/dashboard` dentro del shell administrativo. `/eventos` y `/usuarios` son rutas objetivo, pero no se crean hasta autorizar sus módulos. Mientras tanto, el shell puede mostrar sus opciones con estado deshabilitado y sin navegación.

## Composición de rutas privadas

```text
/dashboard [authorizedGuard]
  └── AdminShell
      └── TemporaryDashboard
```

`AdminShell` es un componente standalone de presentación y navegación. Consume el estado público de `AuthFacade`, ejecuta logout mediante la facade y aloja el `router-outlet`; no consulta Firebase ni contiene reglas de negocio de módulos.

## Configuración

- Configuración pública separada por ambiente.
- Secretos exclusivamente en backend.
- Conexión a emuladores solo en local.
- Producción nunca es valor predeterminado de desarrollo.

### Mapa de proyectos Firebase

| Ambiente         | Alias CLI    | Project ID                | Uso                           |
| ---------------- | ------------ | ------------------------- | ----------------------------- |
| Local/emuladores | `default`    | `demo-eventos-tup`        | Desarrollo y pruebas aisladas |
| Staging          | `staging`    | `eventos-tup-angular-stg` | Integración real y aceptación |
| Producción       | `production` | `eventos-tup-bb903`       | Operación institucional       |

El proyecto `eventos-tup` no forma parte de la arquitectura aprobada. Todo comando contra un servicio real debe incluir `--project staging` o `--project production`; el alias de producción solo se utilizará mediante un despliegue expresamente autorizado.

Staging usa Firestore `(default)` vacío en `nam5`. El frontend toma su configuración pública de `environment.staging.ts`; Calendar, SMTP y el dominio institucional permitido permanecen en configuración backend.

El plan Blaze está activo solo en staging. Google Sign-In usa una marca OAuth propia, con `localhost` y `127.0.0.1` autorizados para desarrollo. `bootstrapAuthorization` se ejecuta en `us-central1`; sus imágenes de Artifact Registry se eliminan después de un día para limitar costos.

Cloud Storage de staging utiliza el bucket predeterminado `eventos-tup-angular-stg.firebasestorage.app`, regional en `US-CENTRAL1` y clase `STANDARD`. La ubicación es inmutable. Security Rules solo se despliegan después de pasar sus pruebas automatizadas.

## Calidad

- Pruebas unitarias, integración, Rules, callables y end-to-end.
- Presupuestos definidos en `criterios-no-funcionales.md`.
- Definición de terminado transversal.
