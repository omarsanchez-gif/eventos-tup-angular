# ADR-011: Remediación de dependencias antes de Eventos en staging

## Estado

Aprobada operativamente el 30 de septiembre de 2026 por solicitud expresa de resolver las vulnerabilidades altas antes de probar Calendar y SMTP reales. No autoriza producción.

## Contexto

`npm audit --omit=dev` reportó seis entradas altas. Angular Router quedó corregido al actualizar todo Angular de 22.1 a 22.2. Firebase Web, Firebase Admin y Firebase Functions se actualizaron a sus versiones compatibles vigentes. `brace-expansion` y las copias de gRPC usadas por Google Cloud aceptaron versiones corregidas dentro de sus rangos normales.

Después de esas actualizaciones permanecieron cuatro entradas que representan una sola causa: `firebase`, `@firebase/firestore`, `@firebase/firestore-compat` y `@grpc/grpc-js`. Firebase Web `12.19.0` instala Firestore `4.17.2`, cuya entrada universal conserva `@grpc/grpc-js ~1.9.0`. La aplicación Angular usa la entrada de navegador y no SSR, pero npm audita también la entrada Node del paquete. La versión corregida de gRPC es `1.14.5` y Firebase todavía no amplió su rango.

La corrección automática propuesta por npm rebaja Firebase a una versión mayor anterior e incompatible con el proyecto. `npm audit fix --force` y esa rebaja se rechazan.

## Decisión

1. Actualizar Angular completo a `22.2.x`, Firebase Web a `12.19.x`, Firebase Admin a `14.5.x` y Firebase Functions a `7.4.x`.
2. Conservar las actualizaciones transitivas compatibles de `brace-expansion` y gRPC usadas por Google Cloud.
3. Declarar un `overrides` limitado a `@firebase/firestore > @grpc/grpc-js: 1.14.5`.
4. No agregar una dependencia directa de gRPC ni usarla desde Angular.
5. Exigir `npm audit --omit=dev` con cero vulnerabilidades altas o críticas, suite completa, lint, formato y builds aprobados antes de desplegar Functions.
6. Retirar el override cuando una versión estable de Firebase Web utilice de forma nativa una versión corregida dentro de su rango.

## Justificación

- El override permanece dentro de la misma versión mayor `1.x` de gRPC.
- La aplicación desplegada es una SPA de navegador y no usa la entrada Node de Firestore Web.
- Las Functions consumen Firebase Admin y Google Cloud Firestore, cuyas copias de gRPC quedan igualmente verificadas en `1.14.5`.
- El cambio es reproducible en `package-lock.json`, acotado a una relación padre-hijo y está cubierto por pruebas y builds.

## Criterio de reversión

Si instalación, compilación, pruebas, emuladores o auditoría detectan incompatibilidad, no se despliega Eventos. Se revierte únicamente este override y se mantiene bloqueado staging funcional hasta que Firebase publique una corrección compatible.

## Consecuencias

- Se elimina la alerta alta sin aceptar una rebaja mayor ni ocultar resultados de auditoría.
- El lockfile pasa a formar parte de la evidencia de seguridad del despliegue.
- La vigencia del override debe revisarse en cada actualización de Firebase.

## Evidencia de ejecución

El 30 de septiembre de 2026 se aplicó la migración coordinada de Angular `22.1` a `22.2`, Firebase Web `12.19.0`, Firebase Admin `14.5.0`, Firebase Functions `7.4.0`, Rules Unit Testing `5.0.2` y gRPC `1.14.5` mediante el override acotado. La auditoría completa terminó con cero vulnerabilidades altas o críticas y 15 moderadas; `npm audit --omit=dev` terminó con cero altas o críticas y 3 moderadas. Aprobaron 183 pruebas, lint, formato y builds de Angular staging y Functions. No se utilizó `npm audit fix --force`.

## Estabilización vigente — 27 de octubre de 2026

Una nueva auditoría detectó vulnerabilidades corregibles en dependencias de ejecución y desarrollo. Se actualizaron versiones compatibles y el lockfile, incluyendo Angular `22.2.x`, Firebase CLI `15.34.1`, Vitest `4.1.12`, Nodemailer `10.2.1`, las dependencias Google compatibles y sus transitivas. Se agregaron overrides reproducibles para `zod 4.6.7` y `vite 8.3.5`, además del override previo y acotado de gRPC.

Resultado obligatorio:

- `npm audit --omit=dev`: cero vulnerabilidades informativas, bajas, moderadas, altas o críticas.
- `npm audit` completo: cero altas o críticas; cinco entradas moderadas, todas transitivas y exclusivas de `firebase-tools`.
- Build de producción limpio dentro de 750 kB/1 MB para el bundle inicial y 6 kB/8 kB por estilo encapsulado.
- Build de staging, compilación de Functions, lint Angular/Functions/visual, formato y regresión automatizada aprobados.
- No se utilizó `npm audit fix --force`, no se degradó Firebase y no se desplegó ningún servicio.

### Aceptación acotada del riesgo de herramienta

Las cinco entradas moderadas residuales proceden de `firebase-tools` mediante `@google-cloud/pubsub`, `@opentelemetry/core`, `gaxios` y `uuid`. La propia versión estable vigente de Firebase CLI no publica una ruta compatible para eliminarlas; la corrección automática propone una degradación mayor de la CLI o sustituciones mayores no soportadas.

- Superficie: CLI local de desarrollo y despliegue; no forma parte del bundle Angular, Cloud Functions ni dependencias de ejecución auditadas con `--omit=dev`.
- Mitigación: usar la CLI solo contra aliases conocidos, no procesar entradas no confiables con esas rutas, conservar cero vulnerabilidades de ejecución y repetir la auditoría antes de cada publicación.
- Vigencia: hasta que Firebase publique una versión compatible corregida o antes de autorizar producción, lo que ocurra primero.
- Responsable: mantenimiento técnico del Sistema Institucional de Eventos TUP.

Esta aceptación no cubre vulnerabilidades altas/críticas ni autoriza `--force` o una degradación automática.
