# Seguridad

## Modelo de autorización

Firestore es la fuente canónica de usuarios, roles y estado. Los ID tokens reflejan únicamente:

```text
authorized: boolean
role: "admin" | "usuario" | null
```

La sincronización se realizará exclusivamente mediante Admin SDK conforme a `decisiones/ADR-001-autorizacion-firebase.md`.

## Requisitos generales

- SEC-001: Toda operación protegida exige Firebase Authentication.
- SEC-002: Toda operación protegida exige claim `authorized == true`.
- SEC-003: Operaciones administrativas exigen `role == "admin"`.
- SEC-004: Los guards Angular no sustituyen Rules ni Functions.
- SEC-005: Claims nunca se aceptan desde datos enviados por el cliente.
- SEC-006: Los cambios de rol o estado sincronizan claims.
- SEC-007: Al desactivar, eliminar o reducir el rol de `admin` a `usuario` se revocan refresh tokens cuando existe UID.
- SEC-008: Rules se prueban con Emulator Suite.
- SEC-009: No se almacenan secretos o tokens manualmente en Local Storage.
- SEC-010: Errores técnicos no se muestran al usuario.
- SEC-011: Credenciales de Calendar, contraseñas SMTP y refresh tokens no se incluyen en Angular, archivos versionados, Firestore, Storage, documentación o logs.
- SEC-012: Local puede usar `functions/.secret.local` únicamente ignorado por Git; staging y producción usan Secret Manager y cada Function enlaza solo los secretos que consume.
- SEC-013: La autorización SMTP se valida en backend después de resolver destinatarios canónicos y antes de abrir la conexión. Acepta la lista fija `allowedRecipients` o la procedencia protegida de Coordinaciones descrita en SEC-NOT-007; Angular no puede ampliar ninguna vía.

## Autenticación

- SEC-AUTH-001: La Function de bootstrap obtiene identidad desde `request.auth`.
- SEC-AUTH-002: Correo debe estar verificado y pertenecer al dominio configurado.
- SEC-AUTH-003: Debe existir exactamente un documento autorizado para el correo.
- SEC-AUTH-004: `activo` debe ser `true` y el rol válido.
- SEC-AUTH-005: Un UID vacío puede asociarse; un UID diferente no se sobrescribe.
- SEC-AUTH-006: Después de actualizar claims el cliente fuerza refresh del token.

## Usuarios

- SEC-USR-001: Solo `admin` lista, crea, edita, activa, desactiva o elimina usuarios.
- SEC-USR-002: El backend valida rol en cada operación.
- SEC-USR-003: No se permite eliminar, desactivar o degradar el rol del propio registro.
- SEC-USR-004: Desactivar o cambiar rol sincroniza claims.
- SEC-USR-005: La colección no tendrá escrituras administrativas abiertas a cualquier autenticado.
- SEC-USR-006: El correo de un documento con UID asociado no se modifica desde Usuarios.
- SEC-USR-007: Una mutación debe conservar al menos un documento activo con rol `admin`.
- SEC-USR-008: Las mutaciones son idempotentes, escriben un estado objetivo y fallan de forma cerrada; una inconsistencia devuelve `reconciliation-required` y nunca éxito.
- SEC-USR-009: Cada callable administrativa revalida el perfil canónico del solicitante, además de sus claims.
- SEC-USR-010: La lista administrativa se limita a 500 documentos; superar el límite produce un error funcional y nunca una respuesta truncada.
- SEC-USR-011: La revocación impide renovar la sesión, pero el ID token emitido puede permanecer válido hasta una hora; esta ventana se acepta en la migración inicial y debe mostrarse en la documentación operativa.

## Eventos

- SEC-EVT-001: Solo usuarios autorizados pueden leer y crear eventos.
- SEC-EVT-002: Solo el creador puede editar o cancelar su evento.
- SEC-EVT-003: La cancelación y toda escritura directa desde cliente permanecen bloqueadas; el documento cancelado se conserva como histórico de solo lectura.
- SEC-EVT-004: Functions de integración, reservación y cancelación validan claim autorizado, perfil canónico y propiedad.
- SEC-EVT-005: El cliente solo puede proponer IDs de coordinación; el backend lee nombres, estado y correos canónicos.
- SEC-EVT-006: Crear exige que cada coordinación seleccionada exista y esté activa. Editar permite conservar referencias históricas suspendidas, pero no agregarlas de nuevo.
- SEC-EVT-007: Los documentos de evento no exponen correos de coordinaciones ni estados internos de entrega.
- SEC-EVT-008: Backend calcula `inicioAt` y `finAt`, la fecha local de servidor y el estado derivado; rechaza instantes, estados temporales o excepciones de anticipación enviados por cliente.
- SEC-EVT-009: La creación exige cinco fechas naturales de anticipación, máximo seis fechas operativas consecutivas, un solo campus y ausencia total de domingo; `admin` no omite estas restricciones.
- SEC-EVT-010: Dentro de la ventana restringida, backend distingue campos permitidos y rechaza agregar capacidad, aumentar cantidades, cambiar campus o adelantar el evento aunque el cliente oculte esa condición.
- SEC-EVT-011: La consulta para FullCalendar exige usuario autorizado, limita y valida el intervalo solicitado y devuelve únicamente datos de evento que el mismo actor puede leer; no expone contactos, entregas, configuración ni inventario administrativo.
- SEC-EVT-012: FullCalendar no recibe secretos ni credenciales de Google Calendar y no consulta ese servicio como fuente del calendario administrativo.
- SEC-EVT-013: `terminosBusqueda`, `protocoloRuta`, `calendarEstado` y `notificacionesEstado` son calculados o validados por backend; el cliente no los escribe directamente.
- SEC-EVT-014: El cursor de búsqueda queda ligado al término normalizado y se rechaza si se reutiliza con otro modo o búsqueda.
- SEC-EVT-015: `getEventDetail` omite correos, secretos, documentos de notificación, leases y controles; edición, cancelación y reconciliación revalidan propiedad o rol en backend.
- SEC-EVT-016: El comando de backfill exige credenciales administrativas, inicia en modo seco y no se ejecuta contra producción sin autorización separada.
- SEC-EVT-017: `checkEventAvailability` solo puede excluir una reserva existente cuando recibe el `eventId` de una edición y backend revalida perfil canónico, existencia, propiedad y estado no cancelado. Un ID inexistente, ajeno o cancelado falla de forma cerrada; el cliente nunca decide por sí mismo qué capacidad ignorar.

## Coordinaciones

Estas reglas están implementadas en código, probadas localmente con Firestore Emulator y desplegadas a staging el 19 de agosto de 2026. Una prueba de humo remota confirmó que `listCoordinations` rechaza llamadas anónimas con `401`; la aceptación autenticada con perfiles sintéticos continúa pendiente.

- SEC-COO-001: Solo `admin` puede leer documentos completos de `coordinaciones` y ejecutar mutaciones.
- SEC-COO-002: Usuarios autorizados no administrativos obtienen únicamente ID y nombre de coordinaciones activas mediante un contrato backend sanitizado.
- SEC-COO-003: Firestore Rules bloquean toda escritura directa a `coordinaciones`; las mutaciones se realizan con Admin SDK después de revalidar claims y perfil canónico del admin.

## Campus

- SEC-CAM-001: Solo `admin` puede leer documentos completos de `campus` y ejecutar mutaciones.
- SEC-CAM-002: Usuarios autorizados no administrativos obtienen solo el catálogo activo sanitizado mediante callable.
- SEC-CAM-003: Firestore Rules bloquean toda escritura directa; Functions revalidan claims y perfil canónico antes de usar Admin SDK.
- SEC-CAM-004: Horarios, uso y timestamps no se exponen en el catálogo seleccionable.
- SEC-COO-004: El backend valida dominio institucional, normalización, duplicados, estado y campos permitidos.
- SEC-COO-005: `utilizada`, `nombreNormalizado` y timestamps son campos administrados por servidor.
- SEC-COO-006: La eliminación revalida `utilizada`; ocultar o deshabilitar el botón no sustituye la validación backend.

## Equipos

- SEC-EQP-001: Solo `admin` lee documentos completos y ejecuta mutaciones del catálogo.
- SEC-EQP-002: Usuarios autorizados reciben únicamente catálogo activo sanitizado mediante backend; no leen `equipos` directamente.
- SEC-EQP-003: Firestore Rules bloquean toda escritura directa a `equipos`; cada callable revalida claims y perfil canónico.
- SEC-EQP-004: El backend valida campus base, destinos, unicidad, cantidad, clasificación, uso y campos permitidos.
- SEC-EQP-005: `nombreNormalizado`, `utilizado` y timestamps son administrados exclusivamente por servidor.
- SEC-EQP-006: Ocultar acciones en Angular no sustituye revalidar uso, campus y compromisos antes de mutar.
- SEC-EQP-007: El catálogo sanitizado no expone cantidades operativas, uso, timestamps ni disponibilidad aparente.

## Reservaciones de Equipos — implementadas en staging

- SEC-RES-001: `reservasEquipo` no admite escritura directa de clientes; las operaciones atómicas usan Admin SDK.
- SEC-RES-002: El backend obtiene equipo, cantidad operativa, campus, horarios, clasificación y destinos desde fuentes canónicas.
- SEC-RES-003: Solo el propietario autorizado del evento solicita o modifica sus equipos; solo `admin` confirma cobertura, recepción o demora.
- SEC-RES-004: El cliente nunca establece disponibilidad, intervalos calculados, fotografías históricas ni estados logísticos.
- SEC-RES-005: La configuración logística y el ID de Coordinación de Sistemas son protegidos y no aceptan correos enviados por el navegador.
- SEC-RES-006: Logs y errores no incluyen listas de destinatarios, contenido de correo ni detalles innecesarios del inventario.
- SEC-RES-007: Una operación concurrente falla de forma cerrada y no deja reservas parciales.
- SEC-RES-008: La transacción usa `inicioAt`, `finAt` y configuración canónica de servidor; el navegador no puede reducir intervalos, omitir noches de eventos multidiarios ni alterar márgenes logísticos.
- SEC-RES-009: Después del límite de anticipación, solo se aceptan reducciones o retiros de equipo; agregar o aumentar capacidad se rechaza en backend.
- SEC-RES-010: `controlReservasEquipo` no admite lectura ni escritura desde clientes, incluidos administradores; solo Admin SDK lo modifica dentro de la transacción autorizada.
- SEC-RES-011: El backend admite como máximo 20 IDs de equipo únicos por evento, ordena la unión de equipos anteriores y nuevos y vuelve a leer inventario y reservas en cada reintento.
- SEC-RES-012: Ningún efecto externo, carga de archivo, correo, Calendar o mutación de estado de aplicación se ejecuta dentro de la función transaccional reintentable.
- SEC-RES-013: Firestore Rules bloquean toda escritura directa a `eventos`, `reservasEquipo`, `controlReservasEquipo`, `notificacionesEventos` y configuración logística; las mutaciones usan callables autorizadas y Admin SDK.
- SEC-RES-014: Confirmar cobertura, confirmar recepción o reportar demora exige perfil canónico `admin`; la operación actualiza reserva y control en una sola transacción.
- SEC-RES-015: Confirmar cobertura retira solo su motivo y no puede limpiar revisiones de inventario o coordinación. Recepción y demora usan hora de servidor y un estado objetivo idempotente.

La evidencia del 30 de septiembre cubre creación, disponibilidad, edición, cancelación, confirmaciones administrativas, trabajos idempotentes, leases, adaptadores de integración, control de concurrencia y Rules. Firestore Rules, Storage Rules y las Functions fueron desplegadas únicamente a staging. El 1 de octubre se acreditaron Calendar y una entrega SMTP real, se observó un rechazo cerrado fuera de la lista anterior y `SMTP_CONFIG` versión 3 quedó limitado a las cuatro cuentas institucionales autorizadas y enlazado a las ocho Functions consumidoras. El 2 de octubre, el calendario institucional compartido aprobó OAuth `calendar.events` y una lectura previa; `GOOGLE_CALENDAR_CONFIG` versión 3 se habilitó sin exponer valores y sus siete Functions quedaron `ACTIVE`. El 3 de octubre, EVT-110 aprobó sus pruebas locales y las ocho Functions consumidoras de SMTP se actualizaron en staging sin rotar secretos ni modificar Hosting, Rules, índices, datos o producción. Permanecen pendientes una creación nueva en ese calendario, la entrega de una revisión nueva a coordinación fuera de la lista fija, las negativas controladas y las pruebas reales de actualización y cancelación; producción no está autorizada.

## Notificaciones de Eventos

- SEC-NOT-001: `notificacionesEventos` no admite lectura o escritura desde clientes, incluidos administradores; solo Admin SDK y herramientas operativas expresamente autorizadas.
- SEC-NOT-002: El navegador nunca decide destinatarios ni estados de envío.
- SEC-NOT-003: Los logs no incluyen cuerpos completos, credenciales SMTP ni listas completas de destinatarios.
- SEC-NOT-004: Las claves idempotentes y transiciones de estado se validan en backend para impedir duplicados.
- SEC-NOT-005: El worker procesa exclusivamente registros creados por operaciones de Eventos autorizadas.
- SEC-NOT-006: Calendar no recibe los correos de coordinaciones como asistentes.
- SEC-NOT-007: En staging, el destinatario se permite si coincide con una cuenta de `allowedRecipients` o si el documento protegido de `notificacionesEventos` conserva `destinatarioTipo: coordinacion | sistemas`, un `coordinacionId` canónico y un correo del dominio institucional exacto. La procedencia se fotografía al crear el trabajo para que suspensión, edición de contactos o reintentos no alteren su autorización. Cualquier creador fuera de la lista fija, correo externo, trabajo sin coordinación o metadato inválido se bloquea antes de SMTP con código sanitizado, sin redirección ni éxito falso.
- SEC-NOT-008: Las Functions de Calendar y SMTP fallan de forma cerrada cuando su secreto no está enlazado, incompleto o inválido; no recurren a valores embebidos ni a configuración del navegador.
- SEC-NOT-009: El worker reclama cada trabajo mediante un lease transaccional de 10 minutos, verifica propiedad antes de enviar y procesa como máximo 50 trabajos por ejecución.
- SEC-NOT-010: Los procesos de purga y limpieza usan hora de servidor, lotes acotados y estado terminal; no aceptan rutas o fechas autoritativas del cliente.
- SEC-NOT-011: Los avisos `logistica` resuelven destinatarios exclusivamente desde la coordinación canónica de Sistemas y deduplican cada causa con su versión de origen; no participan en el resumen funcional de correos del evento ni aceptan equipo, motivo, versión o destinatario desde Angular.
- SEC-NOT-012: El HTML de correo escapa todos los valores canónicos, normaliza el asunto a una sola línea y no carga imágenes, fuentes, CSS, rastreadores o enlaces externos. La alternativa de texto conserva el contenido funcional. La fotografía protegida omite correos de otros destinatarios, IDs internos, secretos, estados técnicos y capacidad total del inventario.

## Storage

- SEC-STO-001: Solo usuarios autorizados pueden leer o cargar protocolos.
- SEC-STO-002: Ruta válida: `eventos/{year}/{fileName}`.
- SEC-STO-003: Solo `application/pdf` menor a 10 MiB.
- SEC-STO-004: Eliminación directa desde cliente bloqueada.
- SEC-STO-005: La Function de eliminación valida propiedad antes de usar Admin SDK.

## Dashboard

- SEC-DASH-001: `getDashboardSummary` exige Authentication, claim `authorized == true`, rol `admin | usuario` y documento canónico activo asociado al UID.
- SEC-DASH-002: La callable no acepta filtros, UID, correos, cursores, fechas ni campos enviados por el cliente; su entrada es un objeto vacío.
- SEC-DASH-003: El conteo de usuarios se ejecuta con Admin SDK y devuelve solo un entero; no amplía las lecturas de Firestore Rules ni expone documentos administrativos.
- SEC-DASH-004: La respuesta omite correos, URLs de protocolo, contactos, inventario, errores técnicos, secretos y estados internos de integraciones.
- SEC-DASH-005: Las consultas usan agregaciones o límites de cinco; el Dashboard no descarga colecciones completas ni consulta Firebase desde el componente.
- SEC-DASH-006: Los fallos parciales se identifican mediante claves de sección cerradas y logs sanitizados; causas, consultas o documentos no se devuelven al navegador.

## Dependencias y cadena de suministro

- SEC-DEP-001: Antes del despliegue funcional de Eventos a staging, `npm audit --omit=dev` debe reportar cero vulnerabilidades altas o críticas en dependencias de ejecución.
- SEC-DEP-002: Las correcciones se realizan mediante versiones compatibles y lockfile reproducible; no se usa `npm audit fix --force`, rebajas mayores automáticas ni `overrides` no justificados. El único override aprobado es el acotado y temporal de ADR-011.
- SEC-DEP-003: Después de actualizar Angular, Firebase Web, Firebase Admin o una dependencia transitiva de Functions se ejecutan todas las pruebas, lint, formato y builds antes de desplegar.
- SEC-DEP-004: Una vulnerabilidad no corregible solo puede aceptarse mediante una decisión documental específica con superficie afectada, mitigación, vigencia y responsable; no existe una aceptación implícita para Eventos.

Evidencia del 30 de septiembre de 2026: Angular quedó en `22.2.x`, Firebase Web en `12.19.0`, Firebase Admin en `14.5.0`, Firebase Functions en `7.4.0` y el override acotado de ADR-011 resolvió gRPC. La auditoría completa y `npm audit --omit=dev` reportaron cero vulnerabilidades altas o críticas; permanecen 15 moderadas totales y 3 moderadas de ejecución para seguimiento. Las 183 pruebas, lint, formato y ambos builds aprobaron antes del despliegue, sin `--force`.

## Criterio de aceptación

Una sesión Firebase sin claim autorizado no obtiene acceso a Firestore o Storage protegidos. Un usuario autorizado solo puede ejecutar las operaciones correspondientes a su rol y propiedad.
