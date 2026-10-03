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
- Calendario institucional adicional compartido con `eventos@tecplayacar.edu.mx` con permiso para realizar cambios y administrar el uso compartido; Google Calendar API está habilitada en `eventos-tup-angular-stg`. Su ID y credenciales se conservan exclusivamente en `GOOGLE_CALENDAR_CONFIG`, sin registrar valores sensibles en documentación. Sustituye como destino al calendario desechable `CALENDARIO - STAGING`; los eventos de prueba anteriores no se migran ni se reconcilian.
- Buzón SMTP de staging `eventos@tecplayacar.edu.mx`; el envío manual hacia `omar.sanchez@tecplayacar.edu.mx` fue comprobado. `SMTP_CONFIG` versión 3 está habilitada en Secret Manager, enlazada a las Functions consumidoras e incluye la estructura completa.
- Lista fija de correo de staging: `omar.sanchez@tecplayacar.edu.mx`, `eventos@tecplayacar.edu.mx`, `victor.yama@tecplayacar.edu.mx` y `lizett.mendez@tecplayacar.edu.mx`. `SMTP_CONFIG` versión 3 conserva ese arreglo. Además, backend permite correos institucionales cuya procedencia `coordinacion` o `sistemas` esté fotografiada en un trabajo protegido con `coordinacionId`; agregar contactos no exige rotar el secreto.
- Cuentas institucionales autorizadas para validar los roles y estados necesarios. No es obligatorio crear usuarios ficticios si los recorridos se ejecutan con cuentas reales aprobadas y datos exclusivos de staging.
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

Java Temurin 21.0.12 está instalado. Las 15 pruebas vigentes de Firestore y Storage Rules fueron aprobadas; ambas Rules fueron desplegadas a staging el 30 de septiembre de 2026 para Eventos. Los casos de aceptación visual restantes requieren sesión autenticada; las pruebas destructivas de reducción de privilegios conservan sus requisitos propios.

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

El 30 de septiembre de 2026 se verificó que `GOOGLE_CALENDAR_CONFIG` existe y se creó `SMTP_CONFIG` versión 2 con la configuración original más `allowedRecipients: ["omar.sanchez@tecplayacar.edu.mx"]`. La actualización se realizó dentro de un proceso controlado, sin imprimir contraseña ni valores OAuth; la versión anterior se conserva temporalmente para reversión hasta terminar la validación real. Ambas configuraciones quedaron enlazadas únicamente a las Functions consumidoras. Calendar y SMTP todavía requieren prueba controlada de extremo a extremo.

El 1 de octubre de 2026 se autorizó ampliar staging a cuatro destinatarios institucionales. `SMTP_CONFIG` versión 3 conservó host, puerto, SSL, remitente, usuario y contraseña sin exponerlos y sustituyó únicamente `allowedRecipients` por Omar, Eventos, Víctor Yama y Lizett Méndez. `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations`, `syncUpdatedEventIntegrations` y `processEventNotifications` quedaron `ACTIVE` y enlazadas explícitamente a la versión 3. No se desplegaron Hosting, Rules, índices ni producción.

El 3 de octubre de 2026 se implementó y desplegó únicamente a staging la autorización adicional de contactos institucionales con procedencia protegida de Coordinaciones. Conserva `SMTP_CONFIG` versión 3 y no requiere editar `allowedRecipients`; las ocho Functions consumidoras fueron actualizadas y quedaron activas. Hosting, Rules, índices, datos y producción no fueron modificados por ese despliegue.

El 1 de octubre de 2026 la prueba real confirmó la entrega SMTP, pero Calendar quedó inicialmente en revisión. `GOOGLE_CALENDAR_CONFIG` versión 1 contenía dos objetos JSON idénticos concatenados y no podía analizarse. La versión 2 normalizada quedó habilitada sin cambiar credenciales; el refresh token y el endpoint de eventos del calendario respondieron correctamente. `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations` y `syncUpdatedEventIntegrations` están `ACTIVE` y enlazadas explícitamente a la versión 2.

La reconciliación autenticada de `PRUEBA 1` terminó correctamente ese mismo día: Firestore registró Calendar sincronizado, conservó el correo como completo y Google Calendar confirmó una sola entrada activa para el intervalo esperado. La versión 1 del secreto permanece habilitada temporalmente como reversión controlada mientras se completan las pruebas reales de actualización y cancelación; producción no fue utilizada.

El 2 de octubre de 2026 se autorizó sustituir el calendario desechable por el calendario institucional adicional compartido con `eventos@tecplayacar.edu.mx`. El permiso de Calendar fue confirmado y se obtuvo consentimiento OAuth con `calendar.events`; una consulta de solo lectura al endpoint de eventos del calendario institucional aprobó antes de modificar staging. `GOOGLE_CALENDAR_CONFIG` versión 3 quedó `ENABLED` con el nuevo destino y las siete Functions consumidoras se redesplegaron correctamente en `us-central1`, todas en estado `ACTIVE`. No se migraron eventos de prueba, no se eliminó el calendario anterior y no se modificaron Hosting, Rules, índices, Firestore, Storage, SMTP ni producción. Permanece pendiente comprobar una creación nueva desde la aplicación.

Ese mismo día se desplegaron a staging los siete índices compuestos aceptados por Firestore y la política TTL declarada para `notificacionesEventos.fechaExpiracion`; la verificación administrativa final confirmó los siete índices en `READY` y TTL en `ACTIVE`. El listado por `fechaCreacion DESC` y `__name__ DESC` conserva el índice automático de campo único porque Firestore rechazó la declaración compuesta equivalente como redundante.

El 1 de octubre de 2026 la primera consulta autenticada de disponibilidad reveló que Firestore exigía invertir los campos de rango del índice de `reservasEquipo`: `bloqueoFin ASC` debe preceder a `bloqueoInicio ASC`. La corrección quedó `READY`, superó la consulta remota que antes devolvía `FAILED_PRECONDITION` y el índice anterior fue retirado. No se desplegaron Functions ni Hosting, no se modificaron datos y producción no fue utilizada.

Ese mismo día, la primera consulta autenticada del calendario reveló que los dos índices de `eventos` tenían el orden inverso al plan exigido por Firestore. Se desplegaron exclusivamente a staging `finAt ASC, inicioAt ASC` y `campusId ASC, finAt ASC, inicioAt ASC`; ambos alcanzaron `READY`. La consulta general recuperó 8 documentos y la filtrada por un campus existente recuperó 6, sin `FAILED_PRECONDITION`. Los dos índices anteriores se retiraron y el inventario final quedó con siete índices compuestos, todos `READY`. No se desplegaron Functions, Rules ni Hosting, no se modificaron datos y producción no fue utilizada.

Posteriormente, el mismo 1 de octubre se publicó en staging la corrección EVT-093A: `checkEventAvailability` y Hosting se desplegaron por separado para que la previsualización de una edición excluya únicamente las reservas activas del propio evento después de validar existencia, propiedad y estado. No se modificaron Rules, índices, secretos ni datos y producción no fue utilizada. La aceptación autenticada en navegador permanece pendiente.

Ese mismo día se publicó únicamente Hosting con EVT-093B. El formulario abierto vuelve a consultar disponibilidad al recuperar foco o visibilidad y cada 30 segundos visibles, conserva las cantidades capturadas y anuncia cambios externos. Las 59 pruebas Angular, lint completo, guardia visual, formato y build de staging habían aprobado. No se desplegaron Functions, Rules, índices o secretos, no se modificaron datos y producción no fue utilizada; la prueba manual en dos pestañas permanece pendiente.

El 2 de octubre de 2026 se publicó únicamente Hosting con EVT-103 y EVT-104. El listado ofrece `Ver`, `Editar` y `Cancelar` directamente al creador de un evento no cancelado, conserva solo `Ver` para registros ajenos y renderiza la columna `Integración` exclusivamente para `admin`. Antes del despliegue aprobaron 63 pruebas Angular, lint completo, guardia visual, formato y build de staging; después, `https://eventos-tup-angular-stg.web.app` respondió HTTP 200 con el bundle esperado. No se desplegaron Functions, Rules, índices ni secretos, no se modificaron datos y producción no fue utilizada; la aceptación autenticada por rol permanece pendiente.

Posteriormente, el mismo 2 de octubre se publicó únicamente Hosting con EVT-105. Eventos adoptó el orden y las primitivas visuales compartidas para encabezado, alertas, controles, listado, acciones móviles, columnas y tooltips, conservando `Listado`/`Calendario` como extensión funcional. La URL de staging respondió HTTP 200 y entregó el bundle verificado `main-ACLYBD7D.js`. No se desplegaron Functions, Rules, índices o secretos, no se modificaron datos y producción no fue utilizada; la aceptación visual autenticada y responsive permanece pendiente.

Después se publicó únicamente Hosting con EVT-106. El calendario representa los eventos multidiarios como franjas continuas sobre todas sus fechas ocupadas, corrige las clases visuales de estado y mejora cuadrícula, controles, leyenda, acumulación “más”, foco y responsive. Antes del despliegue aprobaron 66 pruebas Angular, lint completo, guardia visual, formato y build de staging; después, la URL respondió HTTP 200 y entregó `main-6DTMESSF.js`. No se desplegaron Functions, Rules, índices o secretos, no se modificaron datos y producción no fue utilizada; la aceptación visual autenticada permanece pendiente.

La revisión autenticada de EVT-106 detectó que FullCalendar 7 no recibía `palette.css`, la proyección conservaba `classNames` y los estilos dependían de selectores internos retirados. EVT-107 corrigió estos tres puntos, aprobó nuevamente las 66 pruebas Angular, lint, guardia visual, formato, build y una muestra visual aislada. Con autorización expresa se publicó únicamente Hosting a staging el 2 de octubre de 2026. La URL respondió HTTP 200 y coincidió con `main-XUBYXJ4E.js` y `styles-DKW66HHD.css`; Functions, Rules, índices, secretos, datos y producción no fueron modificados.

También se creó `configuracion/logisticaEquipos` con `coordinacionSistemasId: GoPowUg4NO8bbW5658Jx` y los tiempos de ADR-010. Después de aprobar 183 pruebas, lint, formato, los builds Angular/Functions y la auditoría, se desplegaron por separado Firestore Rules, Storage Rules, las 16 Functions de Eventos en `us-central1` y Hosting en `https://eventos-tup-angular-stg.web.app`. La auditoría completa y `npm audit --omit=dev` quedaron con cero vulnerabilidades altas o críticas; permanecen 15 moderadas de desarrollo y 3 moderadas de ejecución para seguimiento, sin aceptación de riesgos altos ni uso de `--force`. Producción no fue utilizada.

El 3 de octubre de 2026, después de aprobar EVT-110 localmente, se actualizaron exclusivamente `createEvent`, `updateEvent`, `cancelEvent`, `reportEquipmentDelay`, `reconcileEventIntegrations`, `processEventIntegrations`, `syncUpdatedEventIntegrations` y `processEventNotifications` en staging. Firebase confirmó las ocho revisiones en `us-central1`. `SMTP_CONFIG` versión 3 se conservó sin rotación; no se desplegaron Hosting, Rules o índices, no se modificaron datos y producción no fue utilizada.

Ese mismo día se desplegó el Dashboard real únicamente a staging y por servicios separados. El índice `eventos(estatus ASC, inicioAt ASC, __name__ ASC)` alcanzó `READY`; la callable Gen 2 `getDashboardSummary` quedó activa en `us-central1` y rechazó correctamente una solicitud sin autenticar con `401`; Hosting respondió HTTP 200 y sirvió `main-YA3LURUC.js`. No se desplegaron Rules, secretos ni otras Functions, no se modificaron datos y producción no fue utilizada. La aceptación visual, accesible y funcional autenticada con `admin` y `usuario` continúa pendiente.

## Precondiciones exactas para Eventos en staging

1. Suite EVT-001 a EVT-102, Rules, emuladores, lint, formato y build en verde.
2. `npm audit --omit=dev` sin vulnerabilidades altas o críticas. No se acepta `--force`, una rebaja mayor sugerida automáticamente ni una excepción implícita; cualquier riesgo no corregible requiere una decisión documental separada.
3. `configuracion/logisticaEquipos` creado con el ID documental real de Sistemas y los valores de ADR-010.
4. `GOOGLE_CALENDAR_CONFIG` y `SMTP_CONFIG` cargados y enlazados únicamente a sus Functions.
5. `allowedRecipients` conserva las cuatro cuentas operativas; la vía adicional de Coordinaciones exige procedencia protegida, ID canónico y dominio institucional exacto.
6. Índice de búsqueda, índices de reservas y calendario, además de TTL sobre `notificacionesEventos.fechaExpiracion`, creados antes de Functions dependientes.
7. Despliegue separado y verificable: índices, Firestore Rules, Storage Rules, Functions y Hosting.
8. Creación, edición, cancelación, reconciliación, correo permitido y bloqueo fuera de lista probados con datos sintéticos.
9. Workers y limpieza observados sin bucles o crecimiento inesperado; presupuesto y alertas continúan activos.
10. Aceptación funcional, visual, accesible y responsive. Ningún paso autoriza producción.

## Secuencia aprobada para activar Calendar y SMTP en staging

1. Conservar `SMTP_CONFIG` versión 3 y validar que la autorización dinámica solo acepte trabajos protegidos de Coordinaciones; `GOOGLE_CALENDAR_CONFIG` se conserva si supera la validación estructural.
2. Resolver vulnerabilidades altas o críticas de dependencias de ejecución y repetir build, lint, pruebas y auditoría.
3. Crear `configuracion/logisticaEquipos` con el ID canónico de Sistemas y los valores aprobados, sin aceptar correos desde cliente.
4. Desplegar y verificar por separado Firestore Rules, Storage Rules y las Functions autorizadas; Hosting se publica después de validar backend.
5. Crear un evento sintético con Omar como creador y sin coordinaciones opcionales; comprobar una sola entrada en el calendario institucional configurado para staging y un correo permitido.
6. Editar fecha u horario y comprobar actualización del mismo evento Calendar y una notificación sin duplicados.
7. Cancelar y comprobar retiro idempotente de Calendar y correo de cancelación.
8. Ejecutar un contacto de Coordinaciones fuera de la lista fija y comprobar entrega; ejecutar un creador fuera de lista y un correo externo y comprobar `recipient-not-allowed` sin conexión SMTP, entrega ni redirección.
9. Revisar estados públicos, trabajos protegidos, logs sanitizados, reintentos, presupuesto y ausencia de efectos en producción.

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
