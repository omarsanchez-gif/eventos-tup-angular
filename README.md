# Sistema de Eventos TUP — Angular

**Publicación de EVT-121 — 28 de octubre de 2026:** corrección de cancelación de eventos finalizados desplegada con autorización expresa únicamente a staging: Hosting y cuatro Functions (`cancelEvent`, `getEventDetail`, `listEvents`, `listCalendarEvents`). Las cuatro están `ACTIVE`; los 20 archivos remotos coinciden con el build validado y las cuatro callables rechazan solicitudes anónimas. Se conserva la aceptación de las doce validaciones anteriores. Pendiente únicamente la aceptación funcional específica de EVT-121 con sesión iniciada; evidencia en la matriz de trazabilidad. Producción intacta.

**Reparación publicada (27 de octubre):** EVT-120 está en Hosting de staging; SMTP recuperado con versión 4 y ocho Functions ACTIVE. `VALIDACIÓN 02`: siete envíos aceptados por SMTP, resumen `completas`. 96 pruebas Angular, lint, build e integridad remota aprobados. Evidencia en `specs/integraciones.md`; los doce escenarios anteriores fueron aceptados por el responsable el 28 de octubre; la aceptación visual específica de EVT-120 se conserva por separado.

**Publicación previa en staging — 27 de octubre de 2026:** EVT-116 a EVT-119 (acceso previo, respuestas vigentes, cierre del detalle y reutilización de catálogos) desplegado con autorización expresa mediante syncUpdatedEventIntegrations y Hosting. Verificación técnica remota aprobada; 240 pruebas locales previas (92 Angular, 108 Functions y 40 Eventos con Firestore Emulator). Aceptación funcional de estas cuatro correcciones confirmada por el responsable el 28 de octubre de 2026. Producción no fue modificada.

**Estado al 27 de octubre de 2026:** las ocho correcciones de consistencia están implementadas, probadas localmente y desplegadas con autorización expresa únicamente en staging: Firestore Rules, 12 Functions y Hosting. La verificación técnica remota aprobó; la aceptación funcional de este incremento fue confirmada por el responsable el 28 de octubre de 2026. La aceptación administrativa anterior corresponde a la versión publicada previa. Evidencia y alcance en [matriz de trazabilidad](specs/matriz-trazabilidad.md).

Migración del frontend institucional a Angular 22, guiada exclusivamente por las especificaciones de [`/specs`](./specs).

## Alcance implementado

- Base Angular standalone con TypeScript estricto y rutas diferidas.
- Login institucional con Google y Firebase Authentication.
- Callable `bootstrapAuthorization` con validación canónica en Firestore.
- Custom Claims `authorized` y `role` mediante Admin SDK.
- Estado de autenticación con Signals, guards y recuperación de sesión.
- Shell administrativo responsive con sidebar, topbar, navegación por rol, perfil y cierre de sesión.
- Dashboard funcional en `/dashboard` con cuatro KPI, próximos eventos y actividad reciente mediante un read model sanitizado.
- Módulo administrativo de Usuarios en `/usuarios`, con guard por rol, listado, búsqueda, paginación, alta, edición, estado y eliminación.
- Cinco callables administrativas con Firestore canónico, validaciones transaccionales, sincronización de claims, revocación e idempotencia.
- Módulos administrativos de Coordinaciones, Campus y Equipos, visibles únicamente para `admin`.
- Eventos en `/eventos` y `/eventos/calendario` para todo usuario autorizado, con creación, búsqueda, edición, cancelación histórica, PDF y FullCalendar.
- Reservaciones atómicas de equipos, disponibilidad por intervalo, eventos multidiarios y logística entre TUP y FCS.
- Integraciones backend idempotentes con Google Calendar institucional y correo HTML mediante secretos de staging.
- Reglas y pruebas de autorización para Firestore y Storage, índices compuestos y TTL de notificaciones.

Todo el alcance anterior está desplegado únicamente a staging. El 3 de octubre de 2026 se completó la aceptación funcional, operativa, visual, accesible y responsive definida para staging, incluidos Calendar, SMTP, roles, concurrencia y logística. Producción no está autorizada.

## Requisitos locales

- Node.js 24.15 o posterior para Angular.
- Node.js 22 para ejecutar o desplegar Cloud Functions.
- Java 21 o posterior para Firestore y Storage Emulator.
- npm 11.

## Instalación

```powershell
npm install
```

No se requiere una instalación global de Angular CLI o Firebase CLI; ambas herramientas están fijadas en el proyecto.

## Desarrollo seguro

La configuración predeterminada usa exclusivamente el proyecto de demostración `demo-eventos-tup` y Firebase Emulator Suite.

Terminal 1:

```powershell
npm run firebase:emulators
```

Terminal 2:

```powershell
npm start
```

Aplicación: `http://localhost:4200`  
Emulator UI: `http://localhost:4000`

No utilice credenciales ni datos personales reales en emuladores.

## Staging

El ambiente Angular de staging está conectado exclusivamente al proyecto `eventos-tup-angular-stg`. No utiliza emuladores ni recursos de producción.

Para ejecutar la aplicación local contra los servicios reales de staging:

```powershell
npm run start:staging
```

Si una pestaña estuvo abierta previamente con `npm start` y Emulator Suite, cierre el servidor anterior, ejecute `npm run start:staging` y haga una recarga completa del navegador (`Ctrl+F5`) o abra una pestaña nueva. Firebase se inicializa una sola vez por carga de página; una pestaña antigua puede conservar temporalmente la conexión a emuladores.

Para comprobar su compilación:

```powershell
npm run build:staging
```

El proyecto tiene aplicación web, Firestore en `nam5`, Google Sign-In, Storage, Functions Gen 2 y Hosting. `localhost` y `127.0.0.1` están autorizados para pruebas locales. El plan Blaze está activo, existe un presupuesto informativo de `100 MXN` con alertas y Artifact Registry elimina imágenes de Functions con más de un día.

Las callables de autorización, Usuarios, Coordinaciones, Campus, Equipos, Eventos y Dashboard están desplegadas en `us-central1` únicamente para staging conforme a sus specs. Firestore Rules y Storage Rules protegen las escrituras directas y los documentos internos; los siete índices de Eventos están `READY`, el índice del Dashboard está `READY` y el TTL de notificaciones está `ACTIVE`.

La cuenta `omar.sanchez@tecplayacar.edu.mx` está autorizada y activa en Firestore staging con rol `admin` y nombre visible `Omar Sanchez`. Cuando el UID aún no esté asociado, `bootstrapAuthorization` lo vinculará en el siguiente acceso; en cada acceso actualizará `ultimoAcceso` y reconciliará los claims.

Cloud Storage está aprovisionado en `eventos-tup-angular-stg.firebasestorage.app`, región `US-CENTRAL1`, con clase `STANDARD`. Las 15 pruebas vigentes de Firestore y Storage Rules están aprobadas y ambas reglas están desplegadas únicamente a staging.

Hosting ya está publicado en staging. Cualquier actualización posterior requiere autorización y se ejecuta explícitamente con:

```powershell
npm run deploy:staging:hosting
```

No existe un comando genérico de despliegue que pueda apuntar accidentalmente a producción.

Google Sign-In se administra como configuración versionada y se despliega únicamente a staging con:

```powershell
npm run deploy:staging:auth
```

Los secretos de Calendar y SMTP nunca pertenecen a los environments Angular. `GOOGLE_CALENDAR_CONFIG` versión 3 apunta al calendario institucional compartido y `SMTP_CONFIG` versión 4 conserva la lista fija aprobada; los contactos institucionales de Coordinaciones pueden recibir notificaciones únicamente cuando su procedencia canónica queda fotografiada por backend.

La aceptación de staging confirmó creación, actualización y cancelación sobre una sola entrada del calendario institucional, entrega SMTP a contactos canónicos de Coordinaciones, negativas controladas, roles, reservaciones concurrentes, logística y revisión accesible y responsive. La estabilización del 27 de octubre dejó el build limpio, `npm audit --omit=dev` en cero y la auditoría completa sin altas/críticas; los cinco avisos moderados exclusivos de Firebase CLI están aceptados y mitigados en ADR-011. Ese mismo día se publicaron únicamente Hosting y `bootstrapAuthorization` en staging, se verificaron contra el build y los contratos locales y el responsable aceptó los recorridos administrativos exhaustivos de Usuarios, Coordinaciones, Campus y Equipos. El cierre de staging no autoriza producción.

## Calidad

```powershell
npm run lint
npm run test
npm run test:functions
npm run test:events:emulators
npm run test:dashboard:emulators
npm run test:rules
npm run build
```

`test:rules` inicia Firestore y Storage Emulator y por ello requiere Java. Para ejecutar toda la verificación:

```powershell
npm run test:all
```

## Firebase

`firebase.json` está configurado para compilar Cloud Functions y publicar la SPA generada en `dist/eventos-tup-angular/browser`. El alias predeterminado es intencionalmente `demo-eventos-tup`; `staging` corresponde a `eventos-tup-angular-stg` y `production` a `eventos-tup-bb903`. El proyecto visible `eventos-tup` no está autorizado para esta migración.

Blaze es pago por uso. El presupuesto de `100 MXN` y sus alertas son informativos y no detienen automáticamente los servicios; cualquier ampliación de recursos debe conservar el control de costos y documentarse antes del despliegue.
