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
- Firestore `(default)` creado vacío en `nam5`, modo nativo y edición Standard.
- Firebase Hosting aprovisionado para el proyecto de staging.
- Plan Blaze habilitado mediante una cuenta de facturación activa; el consumo es pago por uso.
- Google Sign-In habilitado con `omar.sanchez@tecplayacar.edu.mx` como correo público de soporte OAuth.
- Dominios autorizados: los dominios Firebase predeterminados, `localhost` y `127.0.0.1`.
- Callable `bootstrapAuthorization` desplegada en `us-central1`.
- Política de Artifact Registry: eliminar imágenes de Functions con más de un día.
- Bucket de Storage: `eventos-tup-angular-stg.firebasestorage.app`.
- Ubicación y clase de Storage: `US-CENTRAL1`, regional, `STANDARD`.
- Calendario de pruebas.
- Cuenta o buzón SMTP de pruebas.
- Usuarios de prueba para todos los roles y estados.
- Hosting de staging o Preview Channel conectado únicamente a recursos aprobados.
- No se copiarán datos, usuarios ni archivos de producción para habilitar este ambiente.

Cuenta autorizada para la validación inicial:

- Correo: `omar.sanchez@tecplayacar.edu.mx`.
- Nombre visible: `Omar Sanchez`.
- Rol: `admin`.
- Estado: activo.
- UID y último acceso: pendientes hasta el primer inicio de sesión.

Cloud Storage está aprovisionado y enlazado a Firebase. Las Rules de Firestore y Storage permanecen sin desplegar hasta ejecutar sus pruebas con Java 21 o posterior. Los casos de aceptación restantes requieren cuentas sintéticas para `usuario`, inactivo y no autorizado.

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

- Google OAuth client ID y client secret.
- Refresh token de Calendar.
- SMTP host, usuario y contraseña.
- Remitente autorizado.

Los secretos se administrarán fuera del repositorio y nunca se incluirán en environments Angular.

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
