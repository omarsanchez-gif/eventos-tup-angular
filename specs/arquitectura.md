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

El alcance actual autoriza Login, `/dashboard` y `/usuarios` dentro del shell administrativo. `/usuarios` se habilita únicamente para `admin`; `/eventos` permanece como ruta objetivo deshabilitada hasta autorizar su módulo.

## Composición de rutas privadas

```text
Rutas privadas [authorizedGuard]
  └── AdminShell
      ├── /dashboard → TemporaryDashboard
      └── /usuarios [adminGuard] → UsersPage
```

`AdminShell` es un componente standalone de presentación y navegación. Consume el estado público de `AuthFacade`, ejecuta logout mediante la facade y aloja el `router-outlet`; no consulta Firebase ni contiene reglas de negocio de módulos.

El módulo de Usuarios sigue el flujo `UsersPage → UsersFacade → UsersGateway → callables`. El componente no importa Firebase. Las cinco callables Gen 2 revalidan claims y el documento canónico del administrador, ejecutan las validaciones y escrituras Firestore y sincronizan Authentication mediante Admin SDK. Firestore permanece como fuente canónica ante cualquier reconciliación.

Las cinco callables de Usuarios están desplegadas únicamente en staging, región `us-central1`, después de aprobar pruebas unitarias, Auth/Firestore Emulator y Security Rules. Firestore Rules de staging bloquean escrituras directas y limitan la lectura de `usuarios` a claims administrativos; las mutaciones continúan exclusivamente por Admin SDK.

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

Staging usa Firestore `(default)` en `nam5`, inicializado con la autorización del administrador. El frontend toma de `environment.staging.ts` la configuración Firebase y el dominio institucional público para validación temprana; Calendar, SMTP y la validación autoritativa del dominio permanecen en backend.

El plan Blaze está activo solo en staging. Google Sign-In usa una marca OAuth propia, con `localhost` y `127.0.0.1` autorizados para desarrollo. `bootstrapAuthorization` se ejecuta en `us-central1`; sus imágenes de Artifact Registry se eliminan después de un día para limitar costos.

Cloud Storage de staging utiliza el bucket predeterminado `eventos-tup-angular-stg.firebasestorage.app`, regional en `US-CENTRAL1` y clase `STANDARD`. La ubicación es inmutable. Security Rules solo se despliegan después de pasar sus pruebas automatizadas.

## Calidad

- Pruebas unitarias, integración, Rules, callables y end-to-end.
- Presupuestos definidos en `criterios-no-funcionales.md`.
- Definición de terminado transversal.
