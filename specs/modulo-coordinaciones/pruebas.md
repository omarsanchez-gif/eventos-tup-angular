# Pruebas: Coordinaciones

## Estado

Casos definidos como matriz de aceptación. Existe evidencia automatizada local para validadores, facade, componentes, callables, transacciones y Rules. Las seis callables y Firestore Rules están desplegadas a staging; la lista remota las confirmó y una llamada anónima a `listCoordinations` fue rechazada con `401`. COO-024, COO-028 a COO-033 todavía requieren completar evidencia manual o la integración futura con Eventos antes de cerrar todo el rango.

## Acceso y privacidad

### COO-001 — Admin abre módulo

Un admin autorizado abre `/coordinaciones`, ve el catálogo completo y la navegación activa.

### COO-002 — Usuario normal abre módulo

Un `usuario` es redirigido de forma segura y no recibe documentos completos.

### COO-003 — Invocación administrativa manipulada

Usuario normal, sesión sin claim y anónimo invocan cada mutación; backend rechaza y no escribe.

### COO-004 — Catálogo seleccionable

Usuario autorizado recibe solo `coordinacionId` y `nombre` de registros activos; no recibe correos, estado técnico ni timestamps.

### COO-005 — Rules directas

Rules niegan escrituras de cliente y lectura completa a no administradores.

## Listado

### COO-006 — Orden y columnas

Admin recibe orden determinista y las cinco columnas especificadas.

### COO-007 — Búsqueda mientras se escribe

Nombre o correo filtra localmente sin recarga ni solicitud remota adicional; vaciar restaura el listado.

### COO-008 — Paginación

Los tamaños 5, 10, 15 y 20 no repiten ni omiten registros.

### COO-009 — Vacío y sin coincidencias

Se distinguen “No hay coordinaciones” y “No se encontraron coordinaciones”.

## Alta y validación

### COO-010 — Alta activa válida

Crea nombre visible, nombre normalizado, correos normalizados, `activo: true`, `utilizada: false` y timestamps de servidor.

### COO-011 — Alta suspendida válida

Permite crear suspendida conservando sus correos.

### COO-012 — Nombre vacío

Frontend y backend rechazan sin escribir.

### COO-013 — Nombre duplicado normalizado

Mayúsculas y espacios no evitan la unicidad.

### COO-014 — Altas concurrentes

Dos altas simultáneas con el mismo nombre normalizado dejan como máximo una coordinación.

### COO-015 — Correo externo o mal formado

Cada valor inválido se identifica y backend rechaza toda la operación.

### COO-016 — Correos duplicados

Duplicados con distintas mayúsculas responden `duplicate-email`; nunca se persiste el documento parcial ni una lista repetida.

### COO-017 — Activa sin correo

Responde `active-coordination-requires-email` y no crea.

### COO-018 — Campos administrados

Intentar enviar `utilizada`, nombre normalizado o timestamps se rechaza.

## Edición y estado

### COO-019 — Editar nombre y correos

Actualiza solo campos permitidos y timestamp; conserva creación y uso.

### COO-020 — Renombre duplicado

Rechaza `coordination-name-exists` sin cambios parciales.

### COO-021 — Suspender

Establece `activo: false`, desaparece del catálogo seleccionable y permanece en catálogo admin.

### COO-022 — Activar válida

Con al menos un correo establece `activo: true` y vuelve al catálogo seleccionable.

### COO-023 — Activar sin correos

Backend rechaza aunque el cliente sea manipulado.

### COO-024 — Estado idempotente

Solicitar nuevamente el mismo estado no alterna ni duplica datos.

### COO-025 — Evento histórico suspendido

Suspender no altera la fotografía del evento ni borra contactos necesarios para actualizaciones o cancelaciones.

## Eliminación y uso

### COO-026 — Eliminar nunca utilizada

Admin confirma y el documento con `utilizada: false` se elimina.

### COO-027 — Eliminar utilizada

UI lo explica y backend responde `coordination-in-use`; documento e históricos permanecen.

### COO-028 — Carrera entre selección y eliminación

Si un evento la utiliza concurrentemente, la transacción garantiza `utilizada: true` y la eliminación no puede completar.

### COO-029 — Uso permanente

Eliminar posteriormente el evento no restaura `utilizada: false`.

## UI y accesibilidad

### COO-030 — Lista dinámica de correos

Agregar, enfocar, validar y retirar entradas funciona por teclado y mantiene etiquetas únicas.

### COO-031 — Diálogos y foco

Alta, edición y confirmaciones contienen foco y lo devuelven al iniciador.

### COO-032 — Ayudas de acciones

Editar, Activar/Suspender y Eliminar tienen SVG, nombre accesible y explicación visible; Eliminar utilizada explica la restricción.

### COO-033 — Responsive

A 320 px no existe desplazamiento global y siguen disponibles datos, correos y acciones.

### COO-034 — Máximo de correos

Frontend y backend aceptan hasta 10 correos institucionales normalizados y rechazan una lista de 11 con `email-capacity-exceeded`, sin escritura parcial.

## Evidencia requerida antes de aceptar

- Pruebas unitarias de normalización, validadores, facade y componentes.
- Pruebas de concurrencia y callables con Auth/Firestore Emulator.
- Security Rules para admin, usuario, sesión sin claims y anónimo.
- Verificación de privacidad del catálogo seleccionable.
- Recorrido manual de teclado, lector de pantalla y responsive.
- Aceptación en staging con datos sintéticos; nunca producción.

## Evidencia de despliegue a staging — 19 de agosto de 2026

- Despliegue explícito y separado de las seis callables de Coordinaciones a `eventos-tup-angular-stg`.
- Despliegue separado de Firestore Rules después de aprobar sus pruebas automatizadas.
- `firebase functions:list --project staging` confirmó las seis Functions en `us-central1` junto con los servicios previamente autorizados.
- La llamada remota sin credenciales a `listCoordinations` respondió HTTP `401`, confirmando que no existe acceso anónimo.
- No se desplegó Hosting, Storage Rules, Eventos ni ningún recurso de producción.
- Sigue pendiente el recorrido autenticado del CRUD con la cuenta admin y datos sintéticos.
