# Spec: Equipos

## Estado

Incremento A del catálogo implementado, validado y desplegado únicamente a staging el 21 de agosto de 2026. La aceptación manual continúa pendiente. Reservaciones, disponibilidad, operación logística, Eventos y producción requieren autorización separada.

## Objetivo

Administrar el inventario utilizable por campus y preparar un contrato canónico para que Eventos pueda solicitar cantidades sin duplicar equipo, exceder existencias ni codificar nombres en el frontend.

## Fuentes obligatorias

- `../reglas-negocio.md`, RN-EQP y RN-RES.
- `../modelo-datos.md`, colecciones objetivo `equipos`, `reservasEquipo` y configuración logística.
- `../seguridad.md`, reglas SEC-EQP y SEC-RES.
- `../integraciones.md`, notificaciones logísticas.
- `../decisiones/ADR-007-campus-equipos-logistica.md`.
- `../arquitectura.md` y `../design-system/spec.md`.

## Dependencias

- Campus implementado y desplegado en staging.
- TUP y FCS capturados como campus activos antes de la aceptación funcional de Equipos.
- Coordinación responsable de Sistemas existente en Coordinaciones antes de integrar reservaciones.
- Inventario utilizable real identificado por campus para la prueba manual; no se copiarán datos productivos automáticamente.

## Incrementos separados

### Incremento A — catálogo

- Ruta administrativa `/equipos` para `admin`.
- Listado, búsqueda local, paginación, creación, edición, activación, suspensión y eliminación condicionada.
- Equipo asociado a un campus base canónico.
- Cantidad operativa agregada, sin números de serie ni fotografía.
- Clasificación `fijo` o `transferible`.
- Destinos permitidos explícitos para un equipo transferible.
- Catálogo activo sanitizado para consumidores futuros; no representa disponibilidad por fecha.

### Incremento B — reservaciones y logística

- Consulta de disponibilidad por campus, intervalo y cantidades.
- Reserva atómica de todos los equipos solicitados por un evento.
- Montaje, desmontaje, traslado, regreso, recepción, demora y cobertura de Sistemas.
- Integración con Eventos y notificaciones a la coordinación canónica de Sistemas.

El incremento B está documentado en `reservaciones.md`, pero no queda autorizado por implementar el incremento A.

## Modelo canónico del catálogo

```text
equipos/{equipoId}
  nombre: string
  nombreNormalizado: string
  campusBaseId: string
  cantidadOperativa: integer
  clasificacion: "fijo" | "transferible"
  campusDestinoIdsPermitidos: string[]
  activo: boolean
  utilizado: boolean
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

- El ID Firestore es independiente del nombre.
- La combinación `nombreNormalizado + campusBaseId` es única.
- `cantidadOperativa` representa exclusivamente unidades utilizables y admite valores de 0 a 999.
- Un equipo activo requiere `cantidadOperativa >= 1`.
- Un equipo fijo siempre conserva `campusDestinoIdsPermitidos: []`.
- Un equipo transferible requiere al menos un destino activo, distinto del campus base y sin duplicados.
- `utilizado`, normalización y timestamps son campos administrados por backend.
- `cantidadDisponible` nunca se almacena; se calculará desde cantidad operativa y reservaciones vigentes.

## Política inicial TUP–FCS

- Solo existen dos campus operativos iniciales.
- Un equipo transferible declara explícitamente el otro campus como destino permitido.
- Agregar un campus futuro no lo convierte automáticamente en destino de equipos existentes.
- Mientras no exista un módulo de Rutas, la duración TUP–FCS permanece en 30 minutos conforme a ADR-007.
- Un tercer campus exige aprobar su política de traslado antes de permitirlo como destino.

## Permisos

| Operación                       | `admin` | `usuario` autorizado |
| ------------------------------- | ------- | -------------------- |
| Leer catálogo completo          | Sí      | No                   |
| Crear o editar                  | Sí      | No                   |
| Activar o suspender             | Sí      | No                   |
| Eliminar nunca utilizado        | Sí      | No                   |
| Leer catálogo activo sanitizado | Sí      | Sí                   |

El catálogo sanitizado contiene solo `equipoId`, nombre, campus base, clasificación y destinos permitidos. No contiene cantidades administrativas, uso ni timestamps y no debe confundirse con una confirmación de disponibilidad.

## Contratos objetivo de Functions

### `listEquipment`

- Solo `admin`.
- Devuelve el catálogo completo ordenado por nombre y campus.
- Máximo técnico de 500 registros; si se excede, falla sin resultados parciales.

### `listSelectableEquipment`

- Para `admin` y `usuario` autorizados.
- Devuelve solo registros activos sanitizados.
- No acepta fecha, horario ni cantidades y no promete disponibilidad.

### `createEquipment`

- Solo `admin` canónico activo.
- Valida campos permitidos, campus base activo, nombre único por campus, cantidad, clasificación y destinos.
- Marca el campus base y los destinos referenciados como utilizados en la misma operación canónica.

### `updateEquipment`

- Solo `admin` canónico activo.
- Permite modificar nombre, cantidad, clasificación y destinos.
- El campus base queda inmutable después del primer uso.
- Cuando existan reservaciones, la cantidad no podrá reducirse silenciosamente por debajo de compromisos futuros: los registros afectados pasarán a `requiere_revision` conforme a `reservaciones.md`.

### `setEquipmentStatus`

- Recibe el estado objetivo; nunca alterna implícitamente.
- Suspender impide nuevas selecciones y conserva reservas e historial.
- Activar exige campus base activo, cantidad positiva y configuración válida para la clasificación.

### `deleteEquipment`

- Solo elimina un registro nunca utilizado.
- Revalida `utilizado` en backend inmediatamente antes de eliminar.

## Interfaz administrativa

- Encabezado “Equipos” y acción “Nuevo equipo”.
- Búsqueda inmediata por nombre, campus o clasificación, sin enviar el formulario ni recargar la SPA.
- Paginación local de 5, 10, 15 o 20 registros sobre un máximo de 500.
- Tabla de escritorio y tarjetas equivalentes en móvil.
- Columnas: equipo, campus base, cantidad operativa, clasificación, destinos, estado, actualización y acciones.
- Formulario con nombre, campus base, cantidad operativa, clasificación, destinos permitidos y estado inicial.
- Los destinos aparecen solo para `transferible` y excluyen el campus base.
- Acciones con SVG, nombre accesible, foco visible y ayuda contextual.
- La eliminación utilizada permanece deshabilitada y explica que debe suspenderse.
- Estados de carga, vacío, sin coincidencias, error, éxito y mutación en curso.

## Conformidad visual

La normalización local del 21 de agosto de 2026 eliminó de Equipos las declaraciones privadas de `.button`, sus variantes, `.icon-button` y sus estados. Encabezados, paneles, campos, badges, alertas, tooltips, diálogos y spinners consumen tokens globales cuando comparten semántica con los demás catálogos.

La hoja encapsulada conserva únicamente distribución del listado y formulario de Equipos. `npm run lint:visual` impide reintroducir selectores compartidos o los colores `#3c108e`, `#2e0a70` y `#321070`. La comparación visual autenticada y la publicación de la corrección en staging continúan pendientes.

## Reglas de edición e históricos

- Renombrar no altera fotografías históricas guardadas en reservaciones o eventos.
- Cambiar clasificación o destinos solo afecta solicitudes nuevas.
- Cuando existan reservaciones futuras, una modificación incompatible las marca `requiere_revision`; nunca las cancela ni reasigna silenciosamente.
- Suspender no borra ni modifica referencias existentes.
- El campus base utilizado queda inmutable; para trasladar inventario permanentemente se crea otro registro en el campus correspondiente y se suspende el anterior cuando aplique.

## Errores funcionales mínimos

```text
unauthenticated
permission-denied
invalid-argument
equipment-name-exists
equipment-not-found
equipment-in-use
equipment-base-campus-immutable
campus-not-found
campus-inactive
invalid-destination-campus
active-equipment-requires-stock
equipment-capacity-exceeded
reservation-review-required
service-unavailable
```

## Criterios de aceptación del catálogo

- Solo `admin` accede a `/equipos` y documentos completos.
- Un equipo válido se crea con cantidad agregada y campus canónico.
- Nombre y campus base no pueden repetirse concurrentemente.
- Un equipo fijo no admite destinos.
- Un equipo transferible solo admite destinos activos, distintos del origen y explícitamente seleccionados.
- Un nuevo campus no se convierte automáticamente en destino.
- Cantidades fuera de 0–999 son rechazadas y un registro activo exige al menos una unidad.
- Un equipo utilizado no se elimina y su campus base no cambia.
- El catálogo sanitizado no expone cantidades ni afirma disponibilidad.
- La búsqueda filtra mientras se escribe y nunca recarga la página.
- Pasan pruebas Angular, Functions, Rules y Firestore Emulator antes de cualquier publicación o corrección posterior en staging.
- Botones, iconos, controles, tipografía, foco y estados compartidos cumplen el sistema de diseño global sin redefiniciones encapsuladas.

## Fuera del incremento A

- Números de serie, códigos patrimoniales, fotografías o mantenimiento detallado.
- Disponibilidad por fecha y horario.
- Creación de reservaciones.
- Confirmación de recepción, demora o cobertura.
- Módulo administrable de rutas.
- Integración con Eventos, Calendar o correo.
- Migración automática del objeto histórico `eventos.equipos`.

## Decisiones aprobadas

- EQP-D01: El inventario se maneja como cantidades agrupadas, no por unidad física.
- EQP-D02: Existe un registro por nombre y campus base.
- EQP-D03: La clasificación es fija o transferible; los destinos son explícitos.
- EQP-D04: TUP–FCS usa inicialmente 30 minutos y un campus futuro requiere nueva política.
- EQP-D05: Solo se captura inventario utilizable; no se requiere fotografía.
- EQP-D06: Máximo de 500 registros y 999 unidades por registro.
- EQP-D07: Un registro utilizado no se elimina y conserva históricos.
- EQP-D08: La disponibilidad se calcula y nunca se persiste como contador mutable.
- EQP-D09: El catálogo se implementa antes que las reservaciones.

## Pendientes de aceptación

- Capturar y aceptar manualmente TUP y FCS en staging.
- Confirmar el inventario utilizable inicial por campus para pruebas sintéticas o institucionales controladas.
- Ejecutar el recorrido funcional y visual con sesión `admin` después de implementar.
- Autorizar por separado cualquier despliegue posterior de Functions, Rules o Hosting, incluida la futura corrección visual.
