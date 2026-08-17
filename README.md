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
- Reglas y pruebas de autorización para Firestore y Storage.

Dashboard funcional, Eventos y Usuarios continúan fuera del alcance actual. Sus opciones se muestran deshabilitadas como “Próximamente” y no crean rutas ni funcionalidad anticipada.

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
npm start:staging
```

Si una pestaña estuvo abierta previamente con `npm start` y Emulator Suite, cierre el servidor anterior, ejecute `npm start:staging` y haga una recarga completa del navegador (`Ctrl+F5`) o abra una pestaña nueva. Firebase se inicializa una sola vez por carga de página; una pestaña antigua puede conservar temporalmente la conexión a emuladores.

Para comprobar su compilación:

```powershell
npm run build:staging
```

El proyecto ya tiene una aplicación web, Firestore vacío en `nam5`, Google Sign-In y un sitio de Hosting. `localhost` y `127.0.0.1` están autorizados para pruebas locales. El plan Blaze está activo y `bootstrapAuthorization` está desplegada en `us-central1` con una política que elimina imágenes de compilación anteriores a un día.

La cuenta `omar.sanchez@tecplayacar.edu.mx` está autorizada y activa en Firestore staging con rol `admin`, UID pendiente y nombre visible `Omar Sanchez`. En su primer acceso, `bootstrapAuthorization` asociará el UID, actualizará `ultimoAcceso` y sincronizará los claims.

Cloud Storage está aprovisionado en `eventos-tup-angular-stg.firebasestorage.app`, región `US-CENTRAL1`, con clase `STANDARD`. Las Security Rules no se publicarán hasta ejecutar `npm run test:rules` con Java 21 o posterior.

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
