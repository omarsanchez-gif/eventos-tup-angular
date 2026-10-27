# ADR-005: Ambiente Firebase de staging

## Estado

Aceptada el 17 de agosto de 2026.

## Contexto

La migración Angular necesita validar servicios Firebase reales sin desarrollar, probar o desplegar sobre el proyecto productivo existente. El proyecto demo seguirá protegiendo el flujo local con Emulator Suite, pero no sustituye las pruebas de integración y aceptación.

## Decisión

- Utilizar `eventos-tup-angular-stg` como proyecto Firebase exclusivo de staging.
- Registrar el alias Firebase CLI `staging`; conservar `demo-eventos-tup` como alias predeterminado.
- Reservar el alias `production` para `eventos-tup-bb903` sin autorizar despliegues productivos por esta decisión.
- No utilizar el proyecto visible `eventos-tup`, porque no pertenece al mapa de ambientes aprobado.
- Utilizar Firestore `(default)` inicialmente vacío en `nam5`, modo nativo y edición Standard, sin copiar datos de producción.
- Mantener staging sin datos, cuentas o archivos copiados de producción.
- Usar configuración web pública propia de staging en `environment.staging.ts` y secretos únicamente en backend.
- No desplegar Security Rules hasta ejecutar satisfactoriamente sus pruebas automatizadas.

## Estado operativo inicial

- Proyecto, aplicación web, Firestore y Hosting: creados.
- Plan Blaze: habilitado únicamente en staging mediante una cuenta de facturación activa.
- Google Sign-In: habilitado con `omar.sanchez@tecplayacar.edu.mx` como soporte OAuth.
- Dominios locales autorizados: `localhost` y `127.0.0.1`.
- `bootstrapAuthorization`: desplegada en `us-central1`.
- Usuarios: cinco callables Gen 2 desplegadas en `us-central1` después de aprobar Auth/Firestore Emulator y Rules.
- Firestore Rules y Storage Rules: aprobadas y desplegadas únicamente a staging.
- Entorno local: Java Temurin 21.0.12 disponible para Emulator Suite.
- Artifact Registry: limpieza automática de imágenes con más de un día.
- Cloud Storage: bucket predeterminado `eventos-tup-angular-stg.firebasestorage.app`, regional en `US-CENTRAL1`, clase `STANDARD`.
- Cuenta `omar.sanchez@tecplayacar.edu.mx`: autorizada, activa y rol `admin`; UID y último acceso permanecen administrados por `bootstrapAuthorization`.
- Calendar institucional, SMTP y perfiles de aceptación: configurados y aceptados el 3 de octubre de 2026.

## Consecuencias

La aplicación puede compilarse y abrirse localmente contra la configuración pública de staging. Google Sign-In, autorización, Rules, Calendar, SMTP y perfiles por rol cuentan con aceptación integral en staging desde el 3 de octubre de 2026. Las cuentas utilizadas pueden ser institucionales reales aprobadas y no requieren copiar datos de producción.

Blaze permite desplegar Functions y utilizar Storage, pero introduce consumo facturable. Toda ampliación deberá ser explícita, limitada a staging y acompañada por controles de costo. La ubicación `US-CENTRAL1` del bucket es definitiva y no se podrá cambiar.

Producción queda aislada por alias, documentación y ausencia de comandos genéricos de despliegue.
