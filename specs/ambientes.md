# Ambientes

## Local

Objetivo: desarrollo y pruebas automatizadas sin tocar servicios productivos.

- Firebase Emulator Suite para Authentication, Firestore, Storage, Functions y Hosting cuando aplique.
- Project ID de demostración con prefijo `demo-` para pruebas aisladas.
- Datos sintéticos sin información personal real.
- Calendar y SMTP reales deshabilitados o sustituidos por dobles de prueba.

## Staging

Objetivo: validar integración real y aceptación antes de producción.

- Proyecto Firebase: `eventos-tup-angular-stg`.
- Alias Firebase CLI obligatorio: `staging`.
- Aplicación web registrada: `Eventos TUP Angular Staging Web`.
- Firestore `(default)` creado en `nam5`, modo nativo y edición Standard; contiene únicamente la autorización admin inicial y datos de staging aprobados.
- Firebase Hosting aprovisionado para el proyecto de staging.
- Plan Blaze habilitado mediante una cuenta de facturación activa; el consumo es pago por uso.
- Presupuesto informativo mensual de `100 MXN` configurado con avisos al primer gasto y al alcanzar `50 MXN`, `80 MXN` y `100 MXN`. Las alertas no suspenden automáticamente los servicios ni constituyen un límite duro de gasto.
- Google Sign-In habilitado con `omar.sanchez@tecplayacar.edu.mx` como correo público de soporte OAuth.
- Dominios autorizados: los dominios Firebase predeterminados, `localhost` y `127.0.0.1`.
- Callable `bootstrapAuthorization` desplegada en `us-central1`.
- Política de Artifact Registry: eliminar imágenes de Functions con más de un día.
- Bucket de Storage: `eventos-tup-angular-stg.firebasestorage.app`.
- Ubicación y clase de Storage: `US-CENTRAL1`, regional, `STANDARD`.
- Calendario de pruebas `CALENDARIO - STAGING`, creado bajo `eventos@tecplayacar.edu.mx`; Google Calendar API está habilitada en `eventos-tup-angular-stg` y los datos OAuth necesarios ya fueron obtenidos, sin registrar sus valores en documentación.
- Buzón SMTP de staging `eventos@tecplayacar.edu.mx`; el envío manual hacia `omar.sanchez@tecplayacar.edu.mx` fue comprobado y existe una contraseña de aplicación pendiente de cargarse de forma segura en backend.
- Lista permitida de correo de staging: únicamente `omar.sanchez@tecplayacar.edu.mx`. La restricción debe aplicarse en backend antes del primer envío automatizado.
- Usuarios de prueba para todos los roles y estados.
- Hosting de staging o Preview Channel conectado únicamente a recursos aprobados.
- No se copiarán datos, usuarios ni archivos de producción para habilitar este ambiente.

Cuenta autorizada para la validación inicial:

- Correo: `omar.sanchez@tecplayacar.edu.mx`.
- Nombre visible: `Omar Sanchez`.
- Rol: `admin`.
- Estado: activo.
- UID y último acceso: administrados exclusivamente por `bootstrapAuthorization` y no asumidos por la documentación operativa.

Las cinco callables administrativas de Usuarios fueron aprobadas con datos sintéticos en Auth y Firestore Emulator y desplegadas en `us-central1` para staging el 18 de agosto de 2026. La callable pública exige sesión autorizada y las mutaciones revalidan el perfil canónico `admin`.

Las seis callables de Coordinaciones (`listCoordinations`, `listSelectableCoordinations`, `createCoordination`, `updateCoordination`, `setCoordinationStatus` y `deleteCoordination`) fueron desplegadas por alcance explícito en `us-central1` para staging el 19 de agosto de 2026. Firestore Rules se publicaron en un despliegue separado después de aprobar la automatización. La verificación remota confirmó las seis Functions y el rechazo `401` de una llamada anónima a `listCoordinations`. El Hosting se publicó posteriormente con el incremento de Campus; la aceptación autenticada de Coordinaciones con datos sintéticos continúa pendiente.

Las seis callables de Campus (`listCampuses`, `listSelectableCampuses`, `createCampus`, `updateCampus`, `setCampusStatus` y `deleteCampus`) fueron desplegadas por alcance explícito en `us-central1` para staging el 21 de agosto de 2026. Firestore Rules se publicaron después de aprobar 12 pruebas de Rules y bloquean las escrituras directas a `campus`. El Hosting Angular se publicó en `https://eventos-tup-angular-stg.web.app`; la verificación remota confirmó respuesta `200`, presencia de las seis Functions y rechazo `401` de una llamada anónima a `listCampuses`. Producción no fue utilizada ni modificada.

Java Temurin 21.0.12 está instalado. Las 12 pruebas vigentes de Firestore y Storage Rules fueron aprobadas; Firestore Rules se desplegaron a staging después de la validación y Storage Rules permanecen sin desplegar por estar fuera del incremento de Campus. Los casos de aceptación visual restantes requieren sesión autenticada y un segundo administrador antes de probar reducción de privilegios en staging.

## Producción

Objetivo: operar con los datos y servicios institucionales reales.

- Proyecto Firebase actual: `eventos-tup-bb903`.
- Alias Firebase CLI: `production`.
- Calendar institucional y SMTP productivos.
- Despliegue exclusivo desde proceso autorizado.
- Prohibido probar cambios manualmente sobre datos reales.

## Configuración pública del frontend

- Firebase API key web.
- Auth domain.
- Project ID.
- Storage bucket.
- Messaging sender ID.
- App ID.
- Dominio institucional permitido.

Estos valores son configuración pública, pero no deben mezclarse entre ambientes.

## Secretos backend

- `GOOGLE_CALENDAR_CONFIG`: JSON protegido con `clientId`, `clientSecret`, `refreshToken` y `calendarId`.
- `SMTP_CONFIG`: JSON protegido con `host`, `port`, `secure`, `user`, `from`, `password` y `allowedRecipients`.

En local, los emuladores pueden sustituir secretos mediante `functions/.secret.local`; la configuración no sensible puede vivir en `functions/.env.local`. Ambos archivos deben permanecer ignorados por Git. En staging y producción los valores reales se almacenan en Firebase/Google Cloud Secret Manager y se enlazan solamente a las Functions que los consumen. Nunca se incluyen en environments Angular, bundles, documentación, logs o archivos versionados.

La obtención de credenciales no equivale a su configuración: al 29 de septiembre de 2026 los datos de Calendar y la contraseña de aplicación SMTP existen y están bajo custodia del usuario, pero todavía no están cargados en Secret Manager. Esto no bloquea el desarrollo local con dobles o emuladores; sí bloquea el primer despliegue funcional de Calendar y SMTP en staging.

## Precondiciones exactas para Eventos en staging

1. Suite EVT-001 a EVT-102, Rules, emuladores, lint, formato y build en verde.
2. Dependencias de ejecución sin vulnerabilidades altas o críticas conocidas.
3. `configuracion/logisticaEquipos` creado con el ID documental real de Sistemas y los valores de ADR-010.
4. `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` cargados y enlazados únicamente a sus Functions.
5. `allowedRecipients` limitado a `omar.sanchez@tecplayacar.edu.mx`.
6. Índice de búsqueda, índices de reservas y calendario, además de TTL sobre `notificacionesEventos.fechaExpiracion`, creados antes de Functions dependientes.
7. Despliegue separado y verificable: índices, Firestore Rules, Storage Rules, Functions y Hosting.
8. Creación, edición, cancelación, reconciliación, correo permitido y bloqueo fuera de lista probados con datos sintéticos.
9. Workers y limpieza observados sin bucles o crecimiento inesperado; presupuesto y alertas continúan activos.
10. Aceptación funcional, visual, accesible y responsive. Ningún paso autoriza producción.

## Reglas de despliegue

- Local nunca apunta accidentalmente a producción.
- Al cambiar entre emuladores y staging se reinicia el servidor Angular y se recarga completamente el navegador; no se reutiliza una instancia Firebase inicializada para otro ambiente.
- El alias predeterminado permanece en `demo-eventos-tup`; staging y producción siempre requieren alias explícito.
- `eventos-tup` no es un ambiente autorizado para esta migración.
- Staging se valida antes de producción.
- No se despliegan Rules sin ejecutar antes sus pruebas automatizadas.
- Los recursos de Blaze deben tener límites o políticas de limpieza aplicables y un presupuesto con alertas aprobado.
- No se despliega a producción sin solicitud expresa, revisión de cambios y evidencia aprobada en staging.
- Preview Channels se consideran URLs públicas y no deben exponer datos productivos.
- La versión Vue se conserva como reversión hasta completar la migración.
