# Spec: Coordinaciones

## Estado

Especificación funcional e implementación aprobadas el 19 de agosto de 2026. Pruebas automatizadas, lint y build están en verde. Las seis callables y Firestore Rules fueron desplegadas únicamente a staging y el Hosting vigente incluye `/coordinaciones`. Sus contactos institucionales pueden autorizar notificaciones de Eventos mediante procedencia protegida, sin incorporarlos a la lista fija del secreto. Permanecen pendientes la revisión manual accesible y la aceptación funcional y visual; producción no está autorizada.

## Objetivo

Permitir que un administrador mantenga el catálogo de áreas institucionales y sus correos de contacto para que Eventos pueda seleccionar coordinaciones involucradas y generar notificaciones canónicas sin exponer destinatarios al navegador.

## Fuentes obligatorias

- `../reglas-negocio.md`, RN-041 a RN-057.
- `../modelo-datos.md`, colección `coordinaciones`.
- `../seguridad.md`, SEC-COO-001 a SEC-COO-006.
- `../integraciones.md`.
- `../decisiones/ADR-006-coordinaciones-notificaciones-eventos.md`.
- `../arquitectura.md` y `../design-system/spec.md`.

## Alcance

- Ruta privada `/coordinaciones` dentro de `AdminShell`.
- Navegación visible únicamente para `admin`.
- Listado, búsqueda local y paginación visual.
- Alta de coordinación.
- Edición de nombre y correos.
- Activación y suspensión mediante estado objetivo.
- Eliminación únicamente si nunca fue utilizada.
- Varios correos institucionales por coordinación.
- Catálogo sanitizado de coordinaciones activas para el formulario de Eventos.
- Estados de carga, vacío, error, éxito y conflicto de referencia.

## Fuera de alcance

- Nuevos roles o permisos por coordinación.
- Convertir contactos en usuarios autorizados.
- Nombres de personas, teléfonos, extensiones o domicilios.
- Correos externos al dominio institucional.
- Grupos de Google, listas de distribución o sincronización de directorio.
- Envíos de correo desde esta pantalla.
- Estadísticas o auditoría general.

## Actor y autorización

### `admin`

Puede listar documentos completos, crear, editar, activar, suspender y eliminar cuando corresponda.

### `usuario`

No ve `/coordinaciones`, no obtiene correos y no ejecuta mutaciones. Desde Eventos puede solicitar únicamente el catálogo sanitizado de coordinaciones activas con ID y nombre.

### Capas obligatorias

1. `authorizedGuard` exige sesión autorizada.
2. `adminGuard` protege `/coordinaciones`.
3. Firestore Rules niegan escrituras directas y lectura completa a no administradores.
4. Cada callable administrativa revalida claims y perfil canónico activo con rol `admin`.
5. El contrato seleccionable valida usuario autorizado y elimina `correos`, campos técnicos y coordinaciones suspendidas.

## Modelo

```text
documentId: string
nombre: string
nombreNormalizado: string
correos: string[]
activo: boolean
utilizada: boolean
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

`documentId` es técnico. `nombreNormalizado`, `utilizada` y timestamps son administrados por backend y nunca editables desde el cliente.

## Reglas funcionales

### COO-R01 — Nombre

- Obligatorio después de eliminar espacios exteriores.
- Se conserva el texto visible con mayúsculas y acentos.
- `nombreNormalizado` elimina espacios exteriores, compacta espacios internos y compara sin distinguir mayúsculas o minúsculas.
- Debe ser único, incluso ante altas o renombres concurrentes.

### COO-R02 — Correos

- Se agrega y elimina cada correo como elemento independiente del formulario.
- Se normalizan a minúsculas y sin espacios exteriores.
- Todos deben tener formato válido y pertenecer al dominio institucional configurado en backend.
- No se permiten duplicados dentro de la misma coordinación.
- Se permiten como máximo 10 correos institucionales.
- Una coordinación activa requiere al menos un correo.
- Una coordinación suspendida conserva sus correos para actualizaciones y cancelaciones de eventos existentes.

### COO-R03 — Alta

- Crea `activo` según el estado explícito solicitado.
- Establece `utilizada: false` y timestamps del servidor.
- No crea usuarios, cuentas Authentication, grupos de correo ni claims.

### COO-R04 — Edición

- Permite cambiar nombre y lista de correos.
- No modifica `utilizada`, `fechaCreacion` o referencias históricas.
- Cambiar contactos no envía correos retrospectivos.
- Las notificaciones futuras de eventos usan contactos vigentes.

### COO-R05 — Estado

- Activar requiere al menos un correo válido.
- Suspender establece `activo: false`.
- Suspender impide nuevas selecciones, pero no elimina la coordinación de eventos existentes.
- La operación solicita estado final; nunca alterna implícitamente.

### COO-R06 — Eliminación

- Solo puede eliminarse cuando `utilizada == false`.
- Si `utilizada == true`, backend responde `coordination-in-use` y la interfaz orienta a suspender.
- La eliminación no borra fotografías de eventos ni notificaciones.

### COO-R07 — Uso por Eventos

- Cuando una operación de Eventos selecciona la coordinación por primera vez, backend establece `utilizada: true` de forma permanente.
- El cliente no puede restaurarla a `false`.
- Una coordinación renombrada no cambia el nombre fotografiado en eventos anteriores.

## Consulta administrativa

- Orden por `nombreNormalizado` y `documentId`.
- Búsqueda por fragmento de nombre o correo, ignorando mayúsculas y espacios exteriores.
- Paginación visual con 5, 10, 15 o 20 registros; inicial 10.
- Filtrado mientras se escribe, sin recarga.
- Distingue catálogo vacío y búsqueda sin coincidencias.
- No existe límite funcional de selección por evento; un evento puede seleccionar todas las coordinaciones activas disponibles.
- La capacidad técnica máxima es de 500 coordinaciones. La callable consulta hasta 501 para detectar exceso y falla sin devolver una lista parcial.

## Contratos backend objetivo

### `listCoordinations`

- Solo admin.
- Devuelve todos los campos administrativos permitidos y nunca secretos.

### `listSelectableCoordinations`

- Cualquier usuario autorizado.
- Devuelve exclusivamente:

```text
items:
  - coordinacionId: string
    nombre: string
```

- Incluye solo `activo == true`.

### `createCoordination`

Entrada:

```text
nombre: string
correos: string[]
activo: boolean
```

### `updateCoordination`

Entrada:

```text
documentId: string
nombre: string
correos: string[]
```

### `setCoordinationStatus`

Entrada:

```text
documentId: string
activo: boolean
```

### `deleteCoordination`

Entrada:

```text
documentId: string
```

Las mutaciones aceptan únicamente campos declarados, son idempotentes respecto al estado objetivo y convierten errores técnicos en códigos funcionales.

## Errores funcionales mínimos

```text
unauthenticated
permission-denied
invalid-argument
domain-not-allowed
duplicate-email
email-capacity-exceeded
coordination-name-exists
coordination-not-found
coordination-in-use
active-coordination-requires-email
coordination-capacity-exceeded
service-unavailable
```

## Interfaz principal

### Encabezado

- Contexto “Catálogo institucional”.
- Título “Coordinaciones”.
- Descripción breve.
- Acción “Nueva coordinación”.

### Tabla de escritorio

Columnas:

1. Coordinación.
2. Correos.
3. Estado.
4. Última actualización.
5. Acciones.

- Correos puede mostrar una lista resumida y cantidad, con acceso al detalle administrativo.
- Acciones con SVG y ayuda contextual: Editar, Activar/Suspender y Eliminar.
- Eliminar aparece deshabilitado y explicado cuando `utilizada == true`.

### Móvil

- Tarjetas equivalentes con todos los datos y acciones.
- Objetivos táctiles de al menos 44 × 44 px.
- Sin desplazamiento horizontal global desde 320 px.

## Formulario

- Nombre.
- Lista dinámica “Correos institucionales”.
- Acción “Agregar correo”.
- Acción accesible para retirar cada correo.
- Estado inicial solo en alta; edición usa la acción de estado separada.
- Errores por correo asociados a su elemento.
- Guardado bloqueado durante operación y sin doble envío.

## Confirmaciones

- Suspender explica que no podrá seleccionarse en nuevos eventos y que los históricos se conservan.
- Eliminar aclara que solo procede si nunca se utilizó.
- Si backend detecta uso concurrente, no elimina y ofrece suspender.

## Accesibilidad

- WCAG 2.2 AA.
- Tabla con caption y encabezados.
- Formularios y lista dinámica operables por teclado.
- Foco contenido y restaurado en diálogos.
- Errores y estados anunciados.
- Ayudas contextuales visibles con puntero y foco.

## Criterios de aceptación

- Solo admin administra documentos completos.
- Usuario normal no obtiene correos ni mutaciones.
- Nombre único y correos institucionales se validan en backend.
- Una coordinación activa siempre tiene al menos un correo.
- Suspender preserva referencias y bloquea nuevas selecciones.
- Una coordinación utilizada no se elimina aun manipulando la petición.
- El catálogo de Eventos expone únicamente ID y nombre activos.
- No se crean cuentas Authentication, claims ni asistentes Calendar.
- Pasan `pruebas.md`, Rules, Functions, Emulator Suite, accesibilidad y definición transversal de terminado.

## Decisiones aprobadas

- COO-D01: Administración exclusiva de `admin`.
- COO-D02: Varios correos institucionales por coordinación, sin nombres de contacto en esta versión.
- COO-D03: Suspensión conserva historial y contactos.
- COO-D04: La eliminación se bloquea permanentemente después del primer uso.
- COO-D05: Eventos recibe catálogo sanitizado; correos permanecen en backend.
- COO-D06: Cada coordinación admite como máximo 10 correos institucionales.
- COO-D07: Eventos no impone un límite funcional de coordinaciones seleccionadas.
- COO-D08: El catálogo administrativo admite como máximo 500 coordinaciones; superar el límite produce `coordination-capacity-exceeded` sin datos parciales.

## Decisiones pendientes

No existen decisiones funcionales pendientes para implementar Coordinaciones. Las seis callables y Firestore Rules fueron desplegadas únicamente a staging el 19 de agosto de 2026 después de aprobar la evidencia automatizada y recibir autorización expresa. La verificación remota confirmó las Functions y el rechazo correcto de una llamada anónima. Ese despliegue inicial no modificó Hosting; publicaciones posteriores del frontend incorporaron `/coordinaciones`. La aceptación funcional y visual autenticada continúa pendiente y producción no fue modificada.
