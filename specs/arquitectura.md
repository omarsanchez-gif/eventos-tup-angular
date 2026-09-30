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

### Dependencia visual unidireccional

```text
design-system/spec.md
        ↓
tokens y primitivas en src/styles.scss
        ↓
templates de Login, shell y módulos
        ↓
SCSS encapsulado solo para distribución específica
```

- Los módulos consumen las primitivas globales; no crean copias locales de botones, icon-buttons, campos, badges, alertas, tooltips o diálogos equivalentes.
- Una hoja de componente puede ajustar composición responsive, columnas, espacios y posición, pero no sobrescribe color, tipografía, altura, radio, iconografía o estados de una primitiva compartida.
- Un nuevo requisito visual se resuelve primero en el sistema de diseño y después se consume desde los módulos.
- La revisión arquitectónica debe rechazar selectores compartidos redefinidos dentro de Campus, Equipos o módulos futuros.

## Rutas objetivo

```text
/login
/dashboard
/eventos
/eventos/calendario
/usuarios
/coordinaciones
/campus
/equipos
```

El alcance actual autoriza código para Login, `/dashboard`, `/usuarios`, `/coordinaciones`, `/campus`, el catálogo `/equipos`, Eventos y reservaciones. Las rutas administrativas se habilitan únicamente para `admin`; `/eventos` y `/eventos/calendario` están habilitadas localmente para todo usuario autorizado. Eventos todavía no fue desplegado a staging.

## Composición de rutas privadas

```text
Rutas privadas [authorizedGuard]
  └── AdminShell
      ├── /dashboard → TemporaryDashboard
      ├── /usuarios [adminGuard] → UsersPage
      └── /coordinaciones [adminGuard] → CoordinationsPage
      └── /campus [adminGuard] → CampusesPage
      └── /equipos [adminGuard] → EquipmentPage
      └── /eventos → EventsPage
          └── /eventos/calendario → EventsCalendarPage
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
- Calendar no recibe los contactos como asistentes. La creación, actualización o retiro por cancelación en el calendario institucional no depende del resultado SMTP.
- Cada correo se representa mediante un registro protegido e idempotente en `notificacionesEventos`; un worker backend controla envío, reintentos y estados por destinatario.
- El worker ejecuta un intento inmediato y reintentos a los 5 minutos, 30 minutos y 2 horas; los registros terminales expiran después de 90 días.
- Eventos pagina 25 registros mediante cursores de Firestore. El catálogo administrativo de Coordinaciones conserva búsqueda local sobre un máximo técnico aprobado de 500 registros y falla sin resultados parciales si se excede.
- Calendar y SMTP se validan en staging mediante recursos sintéticos y una lista permitida antes de cualquier autorización productiva.
- La decisión completa está registrada en `decisiones/ADR-006-coordinaciones-notificaciones-eventos.md`.

## Arquitectura objetivo temporal y calendario de Eventos

```text
EventsPage / EventsCalendarPage [autorizado]
    ↓
EventsFacade [Signals + estado derivado]
    ↓
EventsGateway
    ├── listado paginado de 25 por cursor
    └── intervalo visible sanitizado, máximo 42 fechas
            ↓
        Firestore canónico

FullCalendar Standard [presentación lazy]
    └── detalle del evento; sin crear, arrastrar ni redimensionar

Google Calendar [integración backend de salida]
    └── nunca es fuente de la vista administrativa
```

- `inicioAt` y `finAt` son instantes canónicos calculados por backend desde fecha y hora local en `America/Cancun`; los campos históricos separados se conservan.
- `programado`, `en_ejecucion` y `finalizado` son valores derivados. No existe un cron que escriba una transición por evento; `cancelado` sí se persiste y prevalece.
- Las respuestas de consulta incluyen `serverNow`. La facade conserva esa referencia, avanza el reloj únicamente para presentación y actualiza el estado al cargar, navegar y llegar a la siguiente frontera temporal. Toda decisión backend vuelve a usar hora de servidor.
- Un evento multidiario es un único intervalo continuo, máximo seis fechas operativas, en un solo campus y sin domingo. Equipos permanecen montados y bloqueados durante las noches.
- La ruta `/eventos` conserva listado y paginación; `/eventos/calendario` usa la misma facade y permisos, consulta solo el rango visible y permite alternar entre lista y calendario sin duplicar datos.
- FullCalendar Standard `7.1.0` se carga únicamente con la ruta lazy de Eventos. Mes, semana, día y lista están implementados; Premium/Scheduler, edición por arrastre y creación por selección quedan fuera de alcance.
- La consulta calendario incluye eventos superpuestos, incluidos los iniciados antes del rango. Los índices y la consulta aprobados están en ADR-009 y se validan en Emulator Suite antes de desplegar.
- La dependencia y sus consecuencias se registran en `decisiones/ADR-008-ciclo-temporal-calendario-eventos.md`.

## Cierre operativo de Eventos

```text
EventsPage / EventsCalendarPage
    ↓ lista, búsqueda y detalle sanitizado
EventsFacade
    ↓
EventsGateway
    ├── listEvents(busqueda, cursor)
    ├── getEventDetail(eventId)
    ├── updateEvent(eventId, estadoObjetivo)
    ├── cancelEvent(eventId)
    └── reconcileEventIntegrations(eventId)

Detalle del evento [admin]
    └── Logística de equipos
        ├── confirmar cobertura
        ├── confirmar recepción
        └── reportar demora

Operaciones de Eventos
    ├── Firestore transaccional
    ├── Calendar idempotente
    └── notificacionesEventos
            ↓ lease de 10 minutos
        worker SMTP cada 5 minutos
```

- La búsqueda global usa `terminosBusqueda` generados por backend y un índice `array-contains` más creación descendente; conserva páginas de 25 y no incorpora un motor externo.
- El detalle es el único punto de entrada de edición, cancelación y logística. Las acciones de propiedad y rol se repiten en backend.
- `calendarEstado` y `notificacionesEstado` son resúmenes seguros para la UI; errores técnicos, contactos, leases y claves idempotentes permanecen protegidos.
- `cleanupEventProtocols` es una Function programada, idempotente y acotada. La retención de notificaciones usa TTL sobre `fechaExpiracion`; ninguno forma parte de componentes Angular.
- La compatibilidad histórica usa un comando administrativo separado con modo seco; nunca se ejecuta como efecto lateral de una lectura.
- El contrato completo está en `decisiones/ADR-010-cierre-operativo-eventos.md`.

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

EventForm [autorizado; alta Angular implementada]
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
- `cantidadDisponible` no se persiste. ADR-009 define una transacción que lee reservas superpuestas y actualiza `controlReservasEquipo/{equipoId}` para crear un punto de contención por cada equipo afectado.
- La unión de equipos anteriores y nuevos se ordena antes de leer controles. Cada transacción actualiza evento, reservas deterministas, controles y marcas de uso como una sola unidad; Calendar, SMTP y Storage permanecen fuera de la función reintentable.
- Los índices declarativos viven en `firestore.indexes.json`: disponibilidad por equipo, estado e intervalo; superposición general y por campus; y listado por fecha de creación.
- Para eventos multidiarios, la reserva cubre el intervalo continuo completo y las noches; montaje se aplica antes del primer inicio y desmontaje o regreso después del último fin.
- La configuración logística referencia la coordinación de Sistemas por ID canónico y conserva `America/Cancun` como zona horaria.
- La primera política admite traslados TUP–FCS de 30 minutos con destinos explícitos; un campus futuro requiere extensión documental.
- La definición completa está en `modulo-equipos/spec.md`, `modulo-equipos/reservaciones.md` y ADR-007.
- La estrategia de concurrencia e índices está en `decisiones/ADR-009-transacciones-indices-eventos.md`.

El incremento local del 30 de septiembre implementa `checkEventAvailability`, `createEvent`, `listEvents` y `listCalendarEvents` mediante `EventsService → FirestoreEventsRepository`. La transacción vuelve a leer usuario, campus, configuración, coordinaciones, equipos, controles y reservas superpuestas; después crea evento y reservas, incrementa controles y marca catálogos usados. La previsualización no sustituye esta confirmación. El cliente carga el PDF inicial y el backend valida su objeto antes de crear; Calendar, SMTP, reemplazo o limpieza de PDF y edición no se ejecutan dentro de la transacción y permanecen pendientes.

## Configuración

- Configuración pública separada por ambiente.
- Secretos exclusivamente en backend.
- Conexión a emuladores solo en local.
- Producción nunca es valor predeterminado de desarrollo.
- Local usa dobles por defecto; una prueba excepcional con credenciales usa `functions/.secret.local`, nunca un environment Angular.
- Staging y producción consumen secretos estructurados desde Secret Manager: `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG`.
- Las Functions declaran explícitamente el secreto requerido; no existe un secreto global disponible para todo el backend.
- La lista permitida SMTP forma parte de la configuración backend del ambiente y se valida inmediatamente antes del envío.

### Mapa de proyectos Firebase

| Ambiente         | Alias CLI    | Project ID                | Uso                           |
| ---------------- | ------------ | ------------------------- | ----------------------------- |
| Local/emuladores | `default`    | `demo-eventos-tup`        | Desarrollo y pruebas aisladas |
| Staging          | `staging`    | `eventos-tup-angular-stg` | Integración real y aceptación |
| Producción       | `production` | `eventos-tup-bb903`       | Operación institucional       |

El proyecto `eventos-tup` no forma parte de la arquitectura aprobada. Todo comando contra un servicio real debe incluir `--project staging` o `--project production`; el alias de producción solo se utilizará mediante un despliegue expresamente autorizado.

Staging usa Firestore `(default)` en `nam5`, inicializado con la autorización del administrador. El frontend toma de `environment.staging.ts` la configuración Firebase y el dominio institucional público para validación temprana; Calendar, SMTP y la validación autoritativa del dominio permanecen en backend.

El plan Blaze está activo solo en staging. Google Sign-In usa una marca OAuth propia, con `localhost` y `127.0.0.1` autorizados para desarrollo. `bootstrapAuthorization` se ejecuta en `us-central1`; sus imágenes de Artifact Registry se eliminan después de un día para limitar costos.

Staging tiene un presupuesto informativo de `100 MXN` con avisos al primer gasto y a `50 MXN`, `80 MXN` y `100 MXN`; no es un interruptor automático. Calendar usa `CALENDARIO - STAGING` y SMTP usa `eventos@tecplayacar.edu.mx`, con `omar.sanchez@tecplayacar.edu.mx` como único destinatario permitido durante aceptación. Las credenciales ya fueron obtenidas, pero se cargarán en Secret Manager únicamente antes del primer despliegue funcional de estas integraciones.

Cloud Storage de staging utiliza el bucket predeterminado `eventos-tup-angular-stg.firebasestorage.app`, regional en `US-CENTRAL1` y clase `STANDARD`. La ubicación es inmutable. Security Rules solo se despliegan después de pasar sus pruebas automatizadas.

## Calidad

- Pruebas unitarias, integración, Rules, callables y end-to-end.
- `npm run lint:visual` bloquea redefiniciones encapsuladas de botones/icon-buttons y colores institucionales obsoletos.
- Presupuestos definidos en `criterios-no-funcionales.md`.
- Definición de terminado transversal.
