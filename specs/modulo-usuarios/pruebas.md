# Pruebas: Usuarios

## Estado

Casos definidos conforme a las decisiones aprobadas USR-D01 a USR-D04. Java 21, pruebas unitarias, Auth/Firestore Emulator y Security Rules están aprobados. La ejecución manual integral de USR-001 a USR-069 y la revisión visual autenticada permanecen pendientes antes de Hosting o producción.

## Datos base

Las pruebas usan cuentas y documentos sintéticos en Emulator Suite. Nunca usan producción.

- `adminA`: autorizado, activo, rol `admin`, UID asociado.
- `adminB`: autorizado, activo, rol `admin`, UID asociado.
- `usuarioA`: autorizado, activo, rol `usuario`, UID asociado.
- `pendienteA`: autorizado, activo, rol `usuario`, `uid: null`.
- `inactivoA`: autorizado, `activo: false`, UID asociado.
- Cuenta Firebase autenticada sin documento en `usuarios`.

Los correos utilizan el dominio institucional configurado para pruebas, no direcciones personales reales.

## Acceso y autorización

### USR-001 — Admin abre la ruta

Con `adminA` autenticado y autorizado, abrir `/usuarios` debe renderizar el módulo dentro de `AdminShell` y marcar Usuarios como opción activa.

### USR-002 — Usuario sin rol administrativo

Con `usuarioA`, abrir `/usuarios` directamente debe redirigir a `/dashboard` o a la ruta segura definida, sin renderizar datos de usuarios.

### USR-003 — Sesión ausente

Sin sesión, abrir `/usuarios` debe redirigir a `/login`.

### USR-004 — Invocación directa por `usuario`

`usuarioA` invoca cada callable administrativa sin usar la UI. Todas deben responder `permission-denied` y no modificar Firestore ni claims.

### USR-005 — Claim administrativo sin perfil canónico válido

Una sesión con claims `authorized: true`, `role: admin`, pero sin documento canónico activo correspondiente, intenta una mutación. El backend debe rechazarla y no modificar datos.

### USR-006 — Rules de lectura

Firestore Rules permiten consultar `usuarios` únicamente a una sesión autorizada con rol `admin`; rechazan usuario normal, sesión sin claim y sesión anónima.

### USR-007 — Escritura directa desde cliente

Incluso `adminA` intenta crear, editar o eliminar directamente en Firestore. Rules deben rechazarlo; las mutaciones se realizan únicamente mediante callables.

## Listado, búsqueda y paginación

### USR-008 — Listado inicial

`adminA` abre Usuarios. Debe obtener registros ordenados por `nombre` ascendente y mostrar las seis columnas definidas.

### USR-009 — Último acceso nulo

Un documento con `ultimoAcceso: null` debe mostrar “Sin acceso”.

### USR-010 — Formato de último acceso

Un Timestamp conocido debe presentarse en español de México y zona `America/Cancun`.

### USR-011 — Búsqueda por nombre

Buscar un fragmento del nombre con diferencias de mayúsculas o espacios exteriores debe filtrar localmente y devolver únicamente las coincidencias dentro del conjunto autorizado.

### USR-012 — Búsqueda por correo

Buscar por correo o fragmento de correo debe filtrar localmente ignorando mayúsculas y espacios exteriores.

### USR-013 — Búsqueda vacía

Limpiar el término debe restaurar el listado normal y regresar a la primera página.

### USR-014 — Sin coincidencias

Una búsqueda válida sin resultados debe mostrar “No se encontraron usuarios”, no el mensaje de colección vacía.

### USR-015 — Paginación

Con más de 10 resultados, la primera página muestra 10, avanzar no repite ni omite registros y regresar conserva el orden.

### USR-016 — Tamaño de página

Cambiar entre 5, 10, 15 y 20 debe actualizar el número visible y regresar a la primera página. La UI no ofrece ni acepta valores distintos.

### USR-017 — Colección vacía

Sin documentos, debe mostrar “No hay usuarios autorizados” y mantener disponible “Nuevo usuario”.

### USR-018 — Error de consulta

Ante fallo de red o callable, debe terminar loading, mostrar un mensaje funcional y permitir reintentar sin duplicar solicitudes.

## Alta

### USR-019 — Alta válida activa

Crear un usuario válido debe generar exactamente un documento con:

```text
uid: null
nombre: texto sin espacios exteriores
correo: minúsculas sin espacios exteriores
rol: valor seleccionado
activo: true
fechaCreacion: Timestamp de servidor
ultimoAcceso: null
```

Debe aparecer en el listado y anunciar éxito.

### USR-020 — Alta válida inactiva

Crear con estado inactivo debe guardar `activo: false` sin crear claims ni cuenta de Authentication.

### USR-021 — No crea Authentication

Después de cualquier alta, Firebase Authentication no debe contener una nueva cuenta causada por el módulo.

### USR-022 — Nombre vacío

Nombre vacío o solo espacios debe producir `invalid-argument`; no se crea documento.

### USR-023 — Correo vacío o mal formado

Debe mostrarse error asociado al correo y el backend debe rechazar el comando sin escribir.

### USR-024 — Dominio no permitido

Un correo externo válido debe responder `domain-not-allowed`; no se crea documento.

### USR-025 — Correo duplicado normalizado

Si ya existe `persona@dominio`, intentar `Persona@DOMINIO` debe responder `email-already-exists` y conservar un solo documento.

### USR-026 — Altas concurrentes duplicadas

Dos solicitudes simultáneas con el mismo correo normalizado deben dejar como máximo un documento y una respuesta exitosa.

### USR-027 — Rol inválido

Enviar cualquier rol distinto de `admin` o `usuario`, aun manipulando la petición, debe responder `invalid-role` y no escribir.

### USR-028 — Campos administrados por cliente

Enviar propiedades adicionales como `uid`, `fechaCreacion`, `ultimoAcceso` o claims debe ignorarse o rechazarse; nunca se persisten desde la entrada.

### USR-029 — Doble envío

Durante el guardado, la acción debe quedar deshabilitada y no producir dos documentos si el administrador activa Guardar repetidamente.

## Edición

### USR-030 — Edición válida sin UID

Editar nombre, correo y rol de `pendienteA` debe actualizar solo esos campos; conserva UID, estado y fechas.

### USR-031 — Correo duplicado al editar

Cambiar el correo al de otro documento debe responder `email-already-exists` y conservar los valores anteriores.

### USR-032 — Documento inexistente

Editar un `documentId` inexistente debe responder `user-not-found` sin crear un documento nuevo.

### USR-033 — Campos no editables

UID, estado, fecha de creación y último acceso no aparecen como editables y el backend rechaza intentos de alterarlos por esta callable.

### USR-034 — Cambio de correo con UID

El correo debe aparecer como solo lectura. Una invocación manipulada con un valor diferente debe responder `uid-bound-email-change-forbidden` y conservar el documento.

### USR-035 — Cambio de rol con UID

Cambiar `usuarioA` a `admin` debe actualizar Firestore y claims al mismo rol, renovar el token para la verificación y no alterar otros campos.

### USR-036 — Fallo al sincronizar rol

Si Firestore cambia pero Admin SDK falla al escribir claims, la operación conserva el estado canónico objetivo, no restaura privilegios mayores, responde `reconciliation-required` y admite un reintento idempotente.

### USR-037 — Cancelar edición

Cerrar o cancelar el diálogo no invoca backend y conserva los datos originales.

## Activación y desactivación

### USR-038 — Activar sin UID

Activar un documento con `uid: null` debe establecer únicamente `activo: true`.

### USR-039 — Activar con UID

Activar un documento con UID debe establecer Firestore activo y claims `authorized: true`, `role` igual al valor canónico.

### USR-040 — Desactivar sin UID

Desactivar un documento sin UID debe establecer únicamente `activo: false`.

### USR-041 — Desactivar con UID

Debe establecer `activo: false`, claims `authorized: false`, eliminar `role` y revocar refresh tokens.

### USR-042 — Usuario desactivado renueva sesión

Después de la desactivación y renovación o nuevo acceso, el usuario no debe recuperar contenido privado ni ejecutar operaciones protegidas.

### USR-043 — Confirmación de desactivación

Cancelar la confirmación no modifica datos. Confirmar ejecuta una sola solicitud y anuncia el resultado.

### USR-044 — Auto-desactivación o auto-degradación

Las acciones aparecen deshabilitadas. Una invocación directa para desactivar o degradar al administrador autenticado responde `self-status-change-forbidden` y conserva documento y claims.

### USR-045 — Último administrador

Desactivar o degradar al único admin activo debe responder `last-admin-required` dentro de la transacción y no modificar Firestore ni claims.

### USR-046 — Fallo parcial al desactivar

Si falla claims o revocación, Firestore conserva `activo: false`, no se muestra éxito y se responde `reconciliation-required`. Repetir la misma desactivación debe completar lo pendiente sin reactivar al usuario.

## Eliminación

### USR-047 — Eliminar otro usuario sin UID

Confirmar la eliminación de un documento ajeno con UID nulo debe eliminar solo el documento y actualizar el listado.

### USR-048 — Eliminar otro usuario con UID

Debe desautorizar, revocar tokens y después eliminar el documento. No elimina la cuenta de Authentication.

### USR-049 — Eliminar el propio registro

El botón debe estar deshabilitado. Una invocación directa debe responder `self-delete-forbidden` y conservar documento y claims.

### USR-050 — Cancelar eliminación

Cancelar el diálogo no invoca backend ni modifica el listado.

### USR-051 — Eliminación inexistente

Un `documentId` inexistente responde `user-not-found` y no afecta otros documentos.

### USR-052 — Fallo parcial al eliminar

Si no puede completarse la eliminación después de iniciar la reducción de acceso, el usuario objetivo queda inactivo y sin restauración automática de privilegios. No se comunica éxito, se responde `reconciliation-required` y el reintento completa la eliminación.

### USR-053 — Eliminar último administrador

Eliminar al único admin activo debe responder `last-admin-required` dentro de la transacción y conservar documento y claims.

## Consistencia, errores e idempotencia

### USR-054 — Reintento de mutación completada

Reintentar una solicitud después de perder la respuesta no debe duplicar documentos ni revertir accidentalmente el estado final.

### USR-055 — Error técnico sanitizado

Errores de Firestore, Admin SDK o Functions deben convertirse en códigos funcionales sin stack trace, project ID, token o datos completos en la interfaz.

### USR-056 — Cloud Logging

Una inconsistencia crítica registra operación, identificadores técnicos mínimos y etapa fallida; no registra ID tokens, credenciales ni el perfil completo.

### USR-057 — Bootstrap reconcilia claims

Cuando el documento canónico y los claims difieren, el siguiente bootstrap debe aplicar el estado canónico definido por autenticación.

## UI, accesibilidad y responsive

### USR-058 — Semántica de tabla

La tabla debe tener caption accesible, encabezados asociados y acciones con nombres específicos por usuario.

### USR-059 — Operación por teclado

Búsqueda, paginación, alta, edición, estado, eliminación y cancelación deben funcionar sin ratón y mostrar foco visible.

### USR-060 — Gestión de foco en diálogos

Al abrir, el foco entra al diálogo; al cerrar vuelve al control iniciador. El foco no escapa mientras el diálogo está activo.

### USR-061 — Errores de formulario

Cada error debe asociarse a su campo y anunciarse. El foco se dirige al primer campo inválido al intentar guardar.

### USR-062 — Estados sin depender del color

Rol, activo, inactivo, éxito, advertencia y error incluyen texto o iconografía con nombre accesible; el color es complementario.

### USR-063 — Ancho mínimo

A 320 px no debe existir desplazamiento horizontal global. Todos los datos y acciones siguen disponibles y los objetivos táctiles activos miden al menos 44 × 44 px.

### USR-064 — Movimiento reducido

Con `prefers-reduced-motion`, transiciones de diálogos, mensajes y estados se reducen sin impedir comprender cambios.

### USR-065 — Loading y doble acción

Toda operación asíncrona finaliza en éxito o error, expone loading perceptible y evita acciones incompatibles simultáneas.

### USR-066 — Límite administrativo

Con 500 documentos, `listAuthorizedUsers` devuelve el conjunto completo, ordenado y con `maxSupported: 500`. Con 501 documentos responde `user-capacity-exceeded`, no entrega una lista parcial y la UI explica que se requiere rediseñar la búsqueda.

### USR-067 — Envío de búsqueda sin recarga

Escribir un fragmento y enviar el formulario mediante el botón “Buscar” o `Enter` debe cancelar el envío nativo, conservar la ruta y la instancia de la SPA, filtrar el listado local y no volver a invocar `listAuthorizedUsers`.

### USR-068 — Iconos y ayudas contextuales de acciones

Editar, Activar/Desactivar y Eliminar deben usar SVG lineales reconocibles, incluido un icono de papelera para Eliminar. Cada botón conserva un nombre accesible específico por usuario y muestra su descripción al recibir `hover` o `focus-visible`; si está deshabilitado, la ayuda explica la restricción.

### USR-069 — Búsqueda mientras se escribe

Escribir o borrar cualquier parte de un nombre o correo debe actualizar inmediatamente el resultado y regresar a la primera página, sin seleccionar “Buscar”, sin enviar el formulario y sin volver a invocar `listAuthorizedUsers`. Vaciar el campo restaura el listado completo.

## Evidencia mínima

- Pruebas unitarias de validadores, facade/estado y componentes.
- Pruebas de integración de gateways y callables con Emulator Suite.
- Pruebas de Firestore Rules para admin, usuario, sesión sin claims y anónimo.
- Pruebas de Admin SDK para claims y revocación.
- Capturas de escritorio, tableta y 320 px.
- Registro de prueba con teclado y lector de pantalla.
- Validación en staging con cuentas sintéticas después de aprobar emuladores.

## Evidencia local del 18 de agosto de 2026

- 31 pruebas Angular aprobadas en total; 12 fueron agregadas para guard administrativo, facade y página de Usuarios, y las 6 pruebas existentes de `AdminShell` fueron actualizadas para la navegación habilitada.
- 20 pruebas de Functions aprobadas en total; 11 corresponden a autorización administrativa, validación, límite, claims, revocación, reconciliación, reintento y campos administrados de Usuarios.
- 7 pruebas integrales aprobadas con cuentas y documentos sintéticos en Auth y Firestore Emulator: listado canónico, alta sin Authentication, concurrencia de correo, correo vinculado, rol/claims, desactivación y eliminación conservando la cuenta Auth.
- Build TypeScript de Functions aprobado.
- La regresión USR-067 aprobó el envío real del formulario sin recarga ni segunda consulta remota; USR-068 aprobó los SVG y descripciones contextuales, incluida la restricción del registro propio.
- USR-069 aprobó el filtrado y restauración del listado mientras se escribe, sin enviar el formulario ni repetir `listAuthorizedUsers`.
- Build Angular de staging aprobado con `users-page` como chunk diferido de 83.11 kB y bundle inicial de 460.80 kB.
- Lint de Angular y Functions aprobado y formato Prettier validado.
- 8 pruebas de Firestore y Storage Rules aprobadas con Java Temurin 21.0.12; cubren anónimo, sesión sin claims, `usuario`, `admin` y escrituras directas.
- Las cinco callables y Firestore Rules fueron desplegadas únicamente a staging. La prueba de humo confirmó `401 unauthenticated` sin sesión.
- No se ejecutaron despliegues ni pruebas contra producción.
