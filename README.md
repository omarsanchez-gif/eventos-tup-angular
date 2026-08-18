# Sistema de Eventos TUP — Angular

Migración del frontend institucional a Angular 22, guiada exclusivamente por las especificaciones de [`/specs`](./specs).

## Alcance implementado

- Base Angular standalone con TypeScript estricto y rutas diferidas.
- Login institucional con Google y Firebase Authentication.
- Callable `bootstrapAuthorization` con validación canónica en Firestore.
- Custom Claims `authorized` y `role` mediante Admin SDK.
- Estado de autenticación con Signals, guards y recuperación de sesión.
- Shell administrativo responsive con sidebar, topbar, navegación por rol, perfil y cierre de sesión.
- Vista temporal autenticada en `/dashboard` integrada al shell.
- Módulo administrativo de Usuarios en `/usuarios`, con guard por rol, listado, búsqueda, paginación, alta, edición, estado y eliminación.
- Cinco callables administrativas con Firestore canónico, validaciones transaccionales, sincronización de claims, revocación e idempotencia.
- Reglas y pruebas de autorización para Firestore y Storage.

Dashboard funcional y Eventos continúan fuera del alcance actual. Eventos permanece deshabilitado como “Próximamente”; Usuarios solo aparece para `admin`.

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

El proyecto ya tiene una aplicación web, Firestore en `nam5` inicializado con la autorización admin, Google Sign-In y un sitio de Hosting. `localhost` y `127.0.0.1` están autorizados para pruebas locales. El plan Blaze está activo y `bootstrapAuthorization` está desplegada en `us-central1` con una política que elimina imágenes de compilación anteriores a un día.

Las cinco callables de Usuarios están implementadas, aprobadas en Emulator Suite y desplegadas en `us-central1` únicamente para staging. Con `npm run start:staging`, una sesión `admin` puede listar, crear, editar, activar, desactivar y eliminar autorizaciones conforme al spec. Producción permanece fuera de alcance.

La cuenta `omar.sanchez@tecplayacar.edu.mx` está autorizada y activa en Firestore staging con rol `admin` y nombre visible `Omar Sanchez`. Cuando el UID aún no esté asociado, `bootstrapAuthorization` lo vinculará en el siguiente acceso; en cada acceso actualizará `ultimoAcceso` y reconciliará los claims.

Cloud Storage está aprovisionado en `eventos-tup-angular-stg.firebasestorage.app`, región `US-CENTRAL1`, con clase `STANDARD`. Las 8 pruebas de Firestore y Storage Rules están aprobadas; Firestore Rules fueron publicadas en staging para proteger Usuarios y Storage Rules permanecen sin desplegar porque ese servicio no forma parte de este incremento.

Cuando staging esté funcional y validado, Hosting podrá publicarse explícitamente con:

```powershell
npm run deploy:staging:hosting
```

No existe un comando genérico de despliegue que pueda apuntar accidentalmente a producción.

Google Sign-In se administra como configuración versionada y se despliega únicamente a staging con:

```powershell
npm run deploy:staging:auth
```

Los secretos de Calendar y SMTP nunca pertenecen a los environments Angular.

## Calidad

```powershell
npm run lint
npm run test
npm run test:functions
npm run test:users:emulators
npm run test:rules
npm run build
```

`test:rules` inicia Firestore y Storage Emulator y por ello requiere Java. Para ejecutar toda la verificación:

```powershell
npm run test:all
```

## Firebase

`firebase.json` está configurado para compilar Cloud Functions y publicar la SPA generada en `dist/eventos-tup-angular/browser`. El alias predeterminado es intencionalmente `demo-eventos-tup`; `staging` corresponde a `eventos-tup-angular-stg` y `production` a `eventos-tup-bb903`. El proyecto visible `eventos-tup` no está autorizado para esta migración.

Blaze es pago por uso. Antes de ampliar pruebas o habilitar nuevas integraciones se debe crear un presupuesto con alertas en Google Cloud; el importe requiere aprobación del responsable del proyecto.
