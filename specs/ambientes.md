# Ambientes

## Local

Objetivo: desarrollo y pruebas automatizadas sin tocar servicios productivos.

- Firebase Emulator Suite para Authentication, Firestore, Storage, Functions y Hosting cuando aplique.
- Project ID de demostración con prefijo `demo-` para pruebas aisladas.
- Datos sintéticos sin información personal real.
- Calendar y SMTP reales deshabilitados o sustituidos por dobles de prueba.

## Staging

Objetivo: validar integración real y aceptación antes de producción.

- Proyecto Firebase distinto de producción.
- Proveedor Google y dominios autorizados propios de staging.
- Calendario de pruebas.
- Cuenta o buzón SMTP de pruebas.
- Usuarios de prueba para todos los roles y estados.
- Hosting de staging o Preview Channel conectado únicamente a recursos aprobados.

## Producción

Objetivo: operar con los datos y servicios institucionales reales.

- Proyecto actual confirmado antes del corte.
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
- Staging se valida antes de producción.
- Preview Channels se consideran URLs públicas y no deben exponer datos productivos.
- La versión Vue se conserva como reversión hasta completar la migración.
