# Spec: Usuarios

## Estado

Especificación funcional definida. Las decisiones `USR-D01` a `USR-D04` fueron aprobadas documentalmente. La implementación fue autorizada expresamente por el usuario el 18 de agosto de 2026, aprobó pruebas unitarias, Auth/Firestore Emulator y Security Rules, y sus cinco callables fueron desplegadas únicamente a staging. Permanecen pendientes la revisión visual autenticada, el recorrido manual completo y la aceptación antes de Hosting o producción.

## Objetivo

Permitir que un usuario con rol `admin` gestione los documentos de la colección `usuarios` que autorizan el acceso al Sistema de Eventos TUP, manteniendo Firestore como fuente canónica y sincronizando los Custom Claims cuando cambien el rol o el estado.

## Fuentes obligatorias

- `../reglas-negocio.md`, reglas RN-001 a RN-014 y RN-028 a RN-040 aplicables.
- `../modelo-datos.md`, colección `usuarios`.
- `../seguridad.md`, SEC-001 a SEC-010 y SEC-USR-001 a SEC-USR-011.
- `../decisiones/ADR-001-autorizacion-firebase.md`.
- `../arquitectura.md` y `../design-system/spec.md`.

Si este documento contradice una fuente de mayor prioridad, prevalece la fuente superior y se detiene la implementación.

## Alcance funcional

- Ruta privada `/usuarios` dentro de `AdminShell`.
- Listado ordenado por nombre.
- Búsqueda por nombre o correo.
- Paginación visual.
- Alta de documentos de autorización.
- Edición de nombre, correo y rol conforme a las restricciones de este spec.
- Activación y desactivación.
- Eliminación de otro usuario.
- Visualización de rol, estado y último acceso.
- Sincronización de claims al cambiar rol o estado cuando exista UID asociado.
- Revocación de refresh tokens al desactivar, eliminar o degradar de `admin` a `usuario` cuando exista UID.
- Estados de carga, vacío, error, éxito y operación parcial.

## Fuera de alcance

- Crear, modificar o eliminar cuentas de Google.
- Crear una cuenta de Firebase Authentication al dar de alta un documento.
- Gestión de contraseñas, MFA o proveedores de identidad.
- Importación o exportación masiva.
- Envío de invitaciones por correo.
- Colección de auditoría, porque no existe en `modelo-datos.md`.
- Nuevos roles distintos de `admin` y `usuario`.
- Campos adicionales en `usuarios`.
- Historial de cambios, permisos granulares o grupos.

## Actor y autorización

### `admin`

Puede listar, buscar, crear, editar, activar, desactivar y eliminar usuarios, sujeto a validación backend.

### `usuario`

No ve la opción Usuarios, no accede a `/usuarios` y no puede ejecutar operaciones administrativas aunque invoque el backend directamente.

### Capas obligatorias

1. `authorizedGuard` exige sesión autorizada.
2. Un guard de rol impide abrir `/usuarios` si `role !== "admin"`.
3. Firestore Rules protegen toda lectura administrativa.
4. Cada callable valida `request.auth`, claim `authorized == true` y `role == "admin"`.
5. Las mutaciones verifican además que el solicitante corresponda a un documento canónico activo con rol `admin`.

Los guards solo controlan navegación; nunca sustituyen Rules o Functions.

## Modelo consumido

La implementación utiliza exclusivamente:

```text
documentId: string          // ID técnico de Firestore; no es un campo nuevo
uid: string | null
nombre: string
correo: string
rol: "admin" | "usuario"
activo: boolean
fechaCreacion: Timestamp
ultimoAcceso: Timestamp | null
```

No se renombra ni agrega ningún campo. El `documentId` solo identifica el documento en comandos administrativos.

## Reglas funcionales

### USR-R01 — Alta

- Crear un usuario agrega un documento a `usuarios`.
- El backend establece `uid: null`, `fechaCreacion` con fecha del servidor y `ultimoAcceso: null`.
- El alta no crea una cuenta de Authentication.
- Estado inicial y rol proceden del formulario validado.

### USR-R02 — Correo

- Se elimina espacio exterior y se normaliza a minúsculas.
- Debe ser un correo válido del dominio institucional configurado en backend.
- Debe ser único en `usuarios` después de normalizar.
- Solo puede modificarse mientras `uid == null`; con UID asociado se muestra como solo lectura y el backend rechaza cualquier cambio.
- La validación crítica se repite en backend; el cliente solo ofrece retroalimentación temprana.

### USR-R03 — Nombre

- Es obligatorio después de eliminar espacios exteriores.
- Se conserva el texto capturado; no se altera el uso de mayúsculas ni acentos.

### USR-R04 — Rol

- Solo se admiten `admin` y `usuario`.
- Si el documento tiene UID y cambia el rol, la callable sincroniza el claim `role`.
- Cambiar `admin` a `usuario` revoca refresh tokens cuando existe UID.
- Un administrador no puede cambiar su propio rol a `usuario`.
- Antes de degradar a un administrador, el backend comprueba que permanezca al menos otro `admin` activo.
- Los claims nunca aceptan el rol enviado por el cliente sin consultar y validar el documento canónico resultante.

### USR-R05 — Estado

- Activar establece `activo: true`.
- Desactivar establece `activo: false`, cambia claims a `authorized: false`, elimina `role` y revoca refresh tokens cuando existe UID.
- Un administrador no puede desactivar su propio registro.
- Antes de desactivar a un administrador, el backend comprueba que permanezca al menos otro `admin` activo.
- Un usuario sin UID puede activarse o desactivarse sin operación sobre Authentication.
- La interfaz no comunica éxito total si Firestore, claims o revocación quedan inconsistentes.

### USR-R06 — Eliminación

- Solo se elimina un documento diferente al usuario autenticado cuando su UID coincide.
- Antes de eliminar a un administrador, el backend comprueba que permanezca al menos otro `admin` activo.
- El backend repite la validación; ocultar o deshabilitar el botón no es suficiente.
- Eliminar el documento no elimina la cuenta Google ni la cuenta Firebase Authentication.
- Si el usuario eliminado tiene UID, primero debe quedar sin autorización y con tokens revocados.

### USR-R07 — UID y último acceso

- No se editan manualmente desde el módulo.
- `uid` solo se asocia durante `bootstrapAuthorization`.
- `ultimoAcceso` solo lo actualiza el flujo de autenticación.

### USR-R08 — Fecha de creación

- No es editable.
- Todo registro nuevo usa fecha del servidor.

## Ruta y navegación

- Ruta: `/usuarios`.
- Se carga de forma diferida como hija de `AdminShell`.
- La opción Usuarios deja de mostrar “Próximamente” únicamente cuando el módulo sea implementado y aprobado.
- El shell identifica Usuarios con `aria-current="page"` cuando corresponda.
- No se agregan rutas o entradas de navegación adicionales.

## Consulta, búsqueda y paginación

- Orden inicial: `nombre` ascendente.
- `listAuthorizedUsers` obtiene como máximo 501 documentos para detectar el límite sin devolver una lista truncada.
- Hasta 500 documentos, la callable devuelve el conjunto completo al cliente autorizado y lo ordena de forma determinista por nombre y `documentId`.
- Con 501 documentos, responde `user-capacity-exceeded` y no devuelve resultados parciales.
- Angular realiza búsqueda por fragmento de nombre o correo, ignorando mayúsculas, minúsculas y espacios exteriores.
- Angular realiza la paginación visual sobre el resultado filtrado.
- Una búsqueda vacía recupera el listado normal.
- Cambiar el término o el tamaño de página regresa a la primera página.
- Tamaños visibles compatibles con el producto real: 5, 10, 15 y 20; valor inicial 10.
- El resultado distingue entre colección vacía y búsqueda sin coincidencias.
- No se crean campos normalizados, índices de texto, dependencias de búsqueda o servicios adicionales durante la migración inicial.
- Antes de implementar se confirma que el volumen actual y esperado permanezca por debajo de 500. Superar el límite exige actualizar specs y aprobar otra estrategia.

## Contratos backend aprobados

Las cinco callables son Gen 2 en la región aprobada y no aceptan identidad o rol del solicitante como autoridad.

### `listAuthorizedUsers`

Entrada:

```text
{} // sin entrada funcional
```

Salida:

```text
items: Array<{
  documentId: string
  uid: string | null
  nombre: string
  correo: string
  rol: "admin" | "usuario"
  activo: boolean
  fechaCreacion: Timestamp
  ultimoAcceso: Timestamp | null
}>
total: integer
maxSupported: 500
```

Si existen más de 500 documentos, no devuelve `items` y responde `user-capacity-exceeded`.

### `createAuthorizedUser`

Entrada:

```text
nombre: string
correo: string
rol: "admin" | "usuario"
activo: boolean
```

Salida:

```text
documentId: string
status: "completed"
```

El backend agrega los campos administrados por servidor definidos en USR-R01.

### `updateAuthorizedUser`

Entrada:

```text
documentId: string
nombre: string
correo: string
rol: "admin" | "usuario"
```

Salida:

```text
documentId: string
status: "completed" | "reconciliation_required"
```

No acepta `uid`, `activo`, `fechaCreacion` o `ultimoAcceso`.

### `setAuthorizedUserStatus`

Entrada:

```text
documentId: string
activo: boolean
```

Salida:

```text
documentId: string
status: "completed" | "reconciliation_required"
```

### `deleteAuthorizedUser`

Entrada:

```text
documentId: string
```

Salida:

```text
documentId: string
status: "completed" | "reconciliation_required"
```

## Consistencia Firestore–Claims

No existe una transacción atómica entre Firestore, Custom Claims y revocación de tokens. La estrategia aprobada es:

1. Revalidar sesión, claims y documento canónico del administrador solicitante.
2. Leer el documento objetivo y calcular el estado final solicitado; nunca alternar valores implícitamente.
3. Aplicar en una transacción Firestore las validaciones de correo único, auto-restricción y permanencia de otro admin activo.
4. Escribir el estado objetivo en Firestore, que permanece como fuente canónica.
5. Sincronizar únicamente los claims aprobados `authorized` y `role` cuando exista UID.
6. Revocar refresh tokens al desactivar, eliminar o degradar `admin` a `usuario`.
7. Si un paso posterior a Firestore falla, conservar el estado más restrictivo; nunca restaurar automáticamente permisos mayores.
8. Responder `reconciliation-required`, registrar la etapa fallida sin datos sensibles y permitir reintentar la misma operación.
9. Hacer el reintento idempotente: solicitar nuevamente el mismo estado no duplica, alterna ni revierte datos.
10. Permitir que `bootstrapAuthorization` vuelva a reconciliar los claims con Firestore.

`updateAuthorizedUser` vuelve a escribir los claims canónicos cuando el objetivo tiene UID, aunque el estado Firestore solicitado ya exista. Si el estado objetivo es `usuario`, el reintento vuelve a revocar refresh tokens. Esta repetición deliberada permite completar una degradación cuyo primer intento falló después de escribir Firestore, sin agregar campos de coordinación al modelo; las operaciones de Auth son idempotentes respecto al estado de acceso solicitado.

Para otorgar acceso, Firestore se actualiza antes que claims; si claims falla, no existe acceso nuevo y no se comunica éxito. Para reducir acceso, Firestore registra primero el estado restrictivo, después se reducen claims y se revocan tokens.

La revocación impide obtener ID tokens nuevos, pero un ID token ya emitido puede permanecer válido hasta aproximadamente una hora. Esta ventana se acepta en la migración inicial. Las callables críticas mitigan el riesgo revalidando el documento canónico; eliminar por completo la ventana requeriría otra spec e infraestructura de revocación adicional.

## Errores funcionales

Las callables convierten errores técnicos a uno de estos códigos:

```text
unauthenticated
permission-denied
invalid-argument
domain-not-allowed
email-already-exists
user-not-found
self-delete-forbidden
self-status-change-forbidden
last-admin-required
uid-bound-email-change-forbidden
invalid-role
user-capacity-exceeded
reconciliation-required
service-unavailable
```

La interfaz muestra mensajes en español sin nombres de proyectos, rutas internas, stack traces ni datos de otras cuentas.

## Interfaz principal

### Encabezado

- Contexto “Control de acceso”.
- Título “Usuarios”.
- Descripción breve.
- Acción primaria “Nuevo usuario”.

### Filtros

- Campo “Buscar por nombre o correo”.
- Botón “Buscar”.
- `Enter` ejecuta la búsqueda.
- Cada cambio del campo filtra inmediatamente el listado local; no es necesario seleccionar “Buscar” ni presionar `Enter`.
- El filtrado en tiempo real no vuelve a invocar `listAuthorizedUsers`, no consulta Firebase y regresa a la primera página.
- Enviar la búsqueda con `Enter` o con el botón “Buscar” filtra el listado en la SPA; no recarga la página, no navega y no vuelve a solicitar el listado a Firebase.
- Acción para limpiar cuando exista término activo.

### Tabla de escritorio

Columnas, en este orden:

1. Nombre.
2. Correo.
3. Rol.
4. Estado.
5. Último acceso.
6. Acciones.

- Rol y estado se presentan como badges con texto, no solo color.
- `ultimoAcceso: null` se muestra como “Sin acceso”.
- Las fechas usan `es-MX` y zona `America/Cancun`.
- Las acciones usan iconos SVG lineales reconocibles y de la misma familia visual: lápiz para Editar, cambio de estado para Activar/Desactivar y papelera para Eliminar; no se usan caracteres tipográficos como sustituto de iconos.
- Cada acción conserva un nombre accesible específico por usuario y muestra una descripción contextual al posicionar el puntero o enfocar el control.
- La descripción de una acción deshabilitada explica la restricción aplicable en lugar de ocultar su propósito.
- El botón Eliminar del usuario autenticado aparece deshabilitado con explicación disponible.

### Móvil

- A menos de 720 px la tabla puede transformarse en tarjetas de usuario o conservar tabla con desplazamiento horizontal contenido dentro de la superficie.
- No existe desplazamiento horizontal global.
- Cada registro conserva nombre, correo, rol, estado, último acceso y las mismas acciones.
- Las acciones táctiles miden al menos 44 × 44 px.

## Diálogo de alta y edición

Campos visibles:

1. Nombre.
2. Correo institucional.
3. Rol.
4. Estado, solo en alta; en edición se cambia desde la acción de estado para evitar dos flujos distintos.

Comportamiento:

- Títulos “Nuevo usuario” y “Editar usuario”.
- Botones “Cancelar” y “Guardar”.
- Cerrar sin guardar no altera datos.
- Durante guardado se bloquea el doble envío y se expone `aria-busy`.
- Errores por campo se asocian mediante texto y atributos accesibles.
- Al completar, se cierra el diálogo, se actualiza el listado y se anuncia éxito.
- En edición nunca se muestran como editables UID, fechas o último acceso.
- En edición, el correo es editable únicamente si el registro conserva `uid: null`; con UID aparece como solo lectura y con explicación.
- Al editar el propio registro, el rol aparece como solo lectura.

## Confirmaciones sensibles

- Desactivar confirma el efecto sobre el acceso y sesiones.
- Cambiar el rol de `admin` a `usuario` advierte la pérdida de permisos administrativos.
- Las acciones para desactivar o degradar el registro propio aparecen deshabilitadas con una explicación.
- Eliminar confirma el nombre y correo del registro, aclara que no elimina la cuenta Google y usa una acción de peligro.
- Los diálogos devuelven el foco al control que los abrió.

## Estados de pantalla

- Carga inicial: skeleton o indicador con texto “Cargando usuarios”.
- Vacío inicial: “No hay usuarios autorizados”.
- Búsqueda sin resultados: “No se encontraron usuarios”.
- Error recuperable: mensaje y acción “Reintentar”.
- Guardando: acción bloqueada y progreso perceptible.
- Éxito: mensaje anunciado sin depender solo del color.
- Reconciliación requerida: alerta persistente que indica que la operación no terminó y debe reintentarse o revisarse.

## Accesibilidad

- Objetivo WCAG 2.2 AA.
- Región principal rotulada por el título Usuarios.
- Tabla con `caption` accesible y encabezados asociados.
- Diálogos con título, descripción y foco contenido.
- Navegación completa por teclado y foco visible.
- Alertas dinámicas anunciadas mediante una región adecuada.
- Badges y acciones comprensibles sin iconos ni color.
- Las ayudas contextuales de botones de icono se muestran tanto con `hover` como con `focus-visible`, están asociadas semánticamente al control y no sustituyen su `aria-label`.
- Responsive funcional desde 320 px.
- Movimiento reducido conforme a `prefers-reduced-motion`.

## Criterios de aceptación

- Solo un `admin` activo y autorizado accede y ejecuta operaciones.
- El listado usa los campos existentes, orden, búsqueda y paginación definidos.
- Alta, edición, cambio de estado y eliminación respetan RN-011 a RN-014 y RN-035 a RN-040.
- No se crean cuentas de Authentication durante el alta.
- Correo institucional único, nombre requerido y rol válido se validan en backend.
- UID, fecha de creación y último acceso no se editan desde el módulo; el correo queda inmutable después de asociar UID.
- No se elimina, desactiva o degrada el registro propio.
- Siempre permanece al menos un `admin` activo.
- Los cambios de rol y estado se reflejan en claims cuando existe UID.
- Desactivar, eliminar o degradar un admin revoca refresh tokens cuando existe UID.
- El listado nunca devuelve más de 500 usuarios ni resultados parciales al superar ese límite.
- Ninguna operación parcial se presenta como éxito.
- No se agregan campos, colecciones, roles o rutas no documentados.
- Pasan los casos aplicables de `pruebas.md` y la definición transversal de terminado.

## Decisiones aprobadas

### USR-D01 — Búsqueda y paginación

La callable devuelve como máximo 500 usuarios y Angular ejecuta búsqueda por fragmento y paginación visual. Con 501 documentos se rechaza la consulta completa. No se cambia el modelo ni se agrega búsqueda externa.

### USR-D02 — Correo con UID asociado

El correo solo se edita mientras `uid == null`. Después de asociar UID queda como solo lectura; para cambiar de identidad se desactiva el registro anterior y se crea una nueva autorización.

### USR-D03 — Pérdida del último administrador

Un administrador no puede eliminarse, desactivarse o degradarse. Ninguna mutación puede dejar cero administradores activos; la validación se ejecuta en backend dentro de la transacción Firestore.

### USR-D04 — Compensación de claims

Las mutaciones establecen estados objetivo idempotentes, escriben primero Firestore y después Claims/revocación. Ante fallo conservan el estado más restrictivo, responden `reconciliation-required` y se reconcilian por reintento o bootstrap. Se acepta la ventana máxima aproximada de una hora del ID token vigente.
