# Pruebas: Dashboard

### DASH-001 — Acceso autorizado

`admin` y `usuario` con claim autorizado y documento canónico activo reciben el resumen. Una sesión ausente, sin claim, con rol inválido, perfil inexistente o inactivo falla de forma cerrada.

### DASH-002 — Entrada cerrada

La callable acepta únicamente un objeto vacío. Cualquier campo adicional o entrada no objeto devuelve `invalid-argument`.

### DASH-003 — Eventos registrados

La métrica cuenta todos los documentos de `eventos`, incluidos cancelados, sin descargar documentos.

### DASH-004 — Próximos 30 días

Con hora de servidor controlada, cuenta y lista eventos no cancelados cuyo inicio está dentro de `[serverNow, serverNow + 30 días)`. Excluye un evento anterior, uno exactamente en el límite superior y todo cancelado.

### DASH-005 — Máximo y orden próximos

Con más de cinco próximos eventos, devuelve solo los cinco primeros por `inicioAt ASC` y desempate estable por ID.

### DASH-006 — Usuarios activos

Cuenta `activo: true`, excluye inactivos y no devuelve documentos, correos, UID, rol o timestamps.

### DASH-007 — Protocolos vigentes

Cuenta únicamente `protocoloUrl` de cadena no vacía. Ausente, `null` o cadena vacía no cuentan.

### DASH-008 — Actividad reciente

Devuelve hasta cinco eventos por `fechaActualizacion DESC`. Igualdad con `fechaCreacion` produce `creacion`; una fecha posterior produce `actualizacion`; cancelación se presenta como actualización con estado Cancelado.

### DASH-009 — Estado temporal

Los estados se derivan con `serverNow` y los instantes canónicos. `cancelado` prevalece y `registrado` compatible se presenta como Programado.

### DASH-010 — Error parcial

Si falla una consulta de métrica o lista, las demás se conservan, la sección aparece en `unavailableSections`, el KPI afectado es `null` o la lista afectada queda vacía y no se filtra un error técnico.

### DASH-011 — Error total Angular

Si la callable falla, la pantalla muestra mensaje funcional y `Reintentar`; no conserva datos simulados ni muestra errores Firebase.

### DASH-012 — Carga y vacíos

Durante carga se anuncia `Cargando resumen institucional`. Sin próximos o actividad se muestran los mensajes vacíos aprobados.

### DASH-013 — KPI no disponible

Un KPI parcial muestra `—`, no `0`, y la advertencia explica que algunos datos no están disponibles.

### DASH-014 — Perfil y contenido real

La bienvenida conserva nombre, correo y rol autenticados. La pantalla presenta exactamente cuatro KPI, próximos eventos y actividad reciente obtenidos del gateway.

### DASH-015 — Responsive y accesibilidad

En escritorio se usa tabla; en móvil se muestran tarjetas sin scroll horizontal de página. Encabezados, regiones, estados, fechas, valores y acción de reintento tienen nombres accesibles y foco visible.

### DASH-016 — Sin acceso administrativo indirecto

Un `usuario` recibe el conteo activo, pero no puede listar `usuarios` ni obtener datos individuales desde la respuesta o Rules.

### DASH-017 — Índices y límites

Firestore Emulator valida el índice de próximos eventos y la consulta de actividad. Las listas leen como máximo cinco documentos y los conteos usan agregación.

### DASH-018 — Despliegue explícito y acotado

Índice, Function y Hosting solo pueden desplegarse con autorización separada y comandos `--only --project staging`. La evidencia del 3 de octubre de 2026 confirma ese despliegue acotado; Rules, secretos, datos y producción no se modificaron.
