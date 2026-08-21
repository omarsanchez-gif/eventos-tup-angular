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
    coordinations/
    campuses/
    equipment/
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
/coordinaciones
/campus
/equipos
```

El alcance actual autoriza código para Login, `/dashboard`, `/usuarios`, `/coordinaciones`, `/campus` y el catálogo `/equipos` dentro del shell administrativo. Las rutas administrativas se habilitan únicamente para `admin`. `/eventos`, disponible para todo usuario autorizado, permanece documentada y deshabilitada; las reservaciones de Equipos tampoco están autorizadas.

## Composición de rutas privadas

```text
Rutas privadas [authorizedGuard]
  └── AdminShell
      ├── /dashboard → TemporaryDashboard
      ├── /usuarios [adminGuard] → UsersPage
      └── /coordinaciones [adminGuard] → CoordinationsPage
      └── /campus [adminGuard] → CampusesPage
      └── /equipos [adminGuard] → EquipmentPage
```

`AdminShell` es un componente standalone de presentación y navegación. Consume el estado público de `AuthFacade`, ejecuta logout mediante la facade y aloja el `router-outlet`; no consulta Firebase ni contiene reglas de negocio de módulos.

El módulo de Usuarios sigue el flujo `UsersPage → UsersFacade → UsersGateway → callables`. El componente no importa Firebase. Las cinco callables Gen 2 revalidan claims y el documento canónico del administrador, ejecutan las validaciones y escrituras Firestore y sincronizan Authentication mediante Admin SDK. Firestore permanece como fuente canónica ante cualquier reconciliación.

Las cinco callables de Usuarios están desplegadas únicamente en staging, región `us-central1`, después de aprobar pruebas unitarias, Auth/Firestore Emulator y Security Rules. Firestore Rules de staging bloquean escrituras directas y limitan la lectura de `usuarios` a claims administrativos; las mutaciones continúan exclusivamente por Admin SDK.

## Arquitectura objetivo de Coordinaciones y Eventos

```text
CoordinationPage [admin]
    ↓
CoordinationFacade
    ↓
CoordinationGateway
    ↓
Callables administrativas → coordinaciones

EventForm [authorized]
    ↓ solicita catálogo sanitizado: ID + nombre
listSelectableCoordinations
    ↓ envía únicamente IDs seleccionados
Callable de Eventos
    ↓ revalida coordinaciones y crea fotografía histórica
eventos
    ├── integración idempotente con Calendar
    └── notificacionesEventos → worker SMTP idempotente
```

- Los documentos completos de `coordinaciones`, incluidos sus correos, son administrativos y no se exponen a usuarios normales.
- El formulario de Eventos recibe exclusivamente coordinaciones activas con `coordinacionId` y `nombre`.
- Una coordinación contiene como máximo 10 correos; el selector de Eventos no impone un máximo funcional y puede incluir todas las activas disponibles.
- El backend obtiene los correos canónicos; no confía en destinatarios enviados por el navegador.
- El evento conserva IDs y nombres como fotografía histórica, pero no almacena correos visibles para todo usuario autorizado.
- Calendar no recibe los contactos como asistentes. La creación, actualización o eliminación en el calendario institucional no depende del resultado SMTP.
- Cada correo se representa mediante un registro protegido e idempotente en `notificacionesEventos`; un worker backend controla envío, reintentos y estados por destinatario.
- El worker ejecuta un intento inmediato y reintentos a los 5 minutos, 30 minutos y 2 horas; los registros terminales expiran después de 90 días.
- Eventos pagina 25 registros mediante cursores de Firestore. El catálogo administrativo de Coordinaciones conserva búsqueda local sobre un máximo técnico aprobado de 500 registros y falla sin resultados parciales si se excede.
- Calendar y SMTP se validan en staging mediante recursos sintéticos y una lista permitida antes de cualquier autorización productiva.
- La decisión completa está registrada en `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md`.

Coordinaciones implementa el flujo `CoordinationsPage → CoordinationsFacade → CoordinationsGateway → callables`. Sus seis callables revalidan claims y perfil canónico; las mutaciones usan transacciones para nombre único, capacidad, estado y eliminación. Firestore Rules permite lectura completa solo a `admin` y bloquea toda escritura de cliente. La implementación fue validada localmente y sus seis callables y Firestore Rules fueron desplegadas únicamente a staging el 19 de agosto de 2026. La verificación remota confirmó las Functions en `us-central1` y el rechazo `401` de una llamada anónima; Hosting y producción no fueron modificados.

Campus implementa el flujo `CampusesPage → CampusesFacade → CampusesGateway → seis callables`. Firestore conserva documentos completos administrativos; `listSelectableCampuses` entrega a usuarios autorizados solo ID, nombre, clave, dirección y referencia de registros activos. Equipos y Eventos consumirán este contrato en incrementos posteriores.

## Arquitectura objetivo de Equipos

```text
EquipmentPage [admin]
    ↓
EquipmentFacade
    ↓
EquipmentGateway
    ↓
seis callables administrativas → equipos

EventForm [authorized, futuro]
    ↓ solicita campus + intervalo + cantidades
EquipmentReservationService backend
    ↓ valida catálogos y disponibilidad de forma atómica
reservasEquipo
    ├── fotografía histórica
    ├── cobertura de Sistemas
    └── traslado y liberación
```

- El catálogo y las reservaciones son límites arquitectónicos distintos.
- `listSelectableEquipment` entrega un catálogo sanitizado y nunca se utiliza como prueba de disponibilidad.
- La disponibilidad, los intervalos, fotografías y estados logísticos se calculan en backend.
- El cliente envía IDs y cantidades solicitadas; no envía disponibilidad, campus históricos, clasificación, correos o estados.
- Una reserva de varios equipos se confirma completa o no escribe ningún elemento.
- `cantidadDisponible` no se persiste. Antes del código de reservaciones se aprobará una estrategia transaccional e índices Firestore que impida sobreasignación concurrente.
- La configuración logística referencia la coordinación de Sistemas por ID canónico y conserva `America/Cancun` como zona horaria.
- La primera política admite traslados TUP–FCS de 30 minutos con destinos explícitos; un campus futuro requiere extensión documental.
- La definición completa está en `modulo-equipos/spec.md`, `modulo-equipos/reservaciones.md` y ADR-007.

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
