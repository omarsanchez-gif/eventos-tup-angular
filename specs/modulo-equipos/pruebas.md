# Pruebas: Equipos

## Catálogo — autorización y consulta

- EQP-001: una sesión anónima no accede a `/equipos` ni a callables.
- EQP-002: `usuario` autorizado no abre `/equipos` ni lista documentos completos.
- EQP-003: `admin` canónico activo lista el catálogo completo.
- EQP-004: un usuario autorizado obtiene solo el catálogo activo sanitizado.
- EQP-005: el catálogo sanitizado no contiene cantidad, uso ni timestamps y no afirma disponibilidad.
- EQP-006: las escrituras Firestore directas fallan incluso para `admin`.

## Altas y validación

- EQP-007: crea un equipo fijo válido con destinos vacíos.
- EQP-008: crea un equipo transferible con destino activo distinto del origen.
- EQP-009: normaliza nombre y valida unicidad por campus.
- EQP-010: permite el mismo nombre en campus base diferentes.
- EQP-011: dos altas concurrentes con el mismo nombre y campus producen un solo registro.
- EQP-012: rechaza campus base inexistente o suspendido.
- EQP-013: rechaza cantidad menor que 0, mayor que 999 o no entera.
- EQP-014: rechaza alta activa con cantidad 0 y permite alta suspendida con cantidad 0.
- EQP-015: rechaza destinos para clasificación fija.
- EQP-016: rechaza transferible sin destino, con origen como destino, duplicados o campus suspendido.
- EQP-017: un tercer campus no se vuelve destino automáticamente.
- EQP-018: cliente no puede establecer normalización, uso o timestamps.

## Edición, estado y eliminación

- EQP-019: edita nombre, cantidad, clasificación y destinos válidos.
- EQP-020: impide cambiar el campus base después del primer uso.
- EQP-021: solicita estado objetivo de forma idempotente.
- EQP-022: suspender conserva datos e históricos y lo excluye del catálogo seleccionable.
- EQP-023: activar exige cantidad positiva, campus activo y configuración válida.
- EQP-024: elimina únicamente un equipo nunca utilizado.
- EQP-025: un equipo utilizado conserva eliminación deshabilitada y backend devuelve `equipment-in-use`.
- EQP-026: superar 500 registros falla sin respuesta parcial.

## Interfaz

- EQP-027: búsqueda filtra al escribir por nombre, campus o clasificación sin recargar.
- EQP-028: estados carga, vacío, sin coincidencias, error y éxito son visibles y accesibles.
- EQP-029: paginación cambia entre 5, 10, 15 y 20 sin descargar más de 500 registros.
- EQP-030: formulario muestra destinos solo para transferible y excluye campus base.
- EQP-031: acciones usan iconos SVG, `aria-label`, foco visible y tooltip descriptivo.
- EQP-032: tabla y tarjetas conservan datos y acciones desde 320 px.
- EQP-033: cerrar diálogos devuelve el foco al control que los abrió.

## Contrato futuro de reservaciones

Estos casos se ejecutarán solo cuando `reservaciones.md` sea autorizado:

- RES-001: reserva local bloquea desde 60 minutos antes hasta 30 minutos después.
- RES-002: reservas coincidentes consumen cantidades y nunca exceden `cantidadOperativa`.
- RES-003: dos solicitudes concurrentes no producen sobreasignación.
- RES-004: varios equipos se confirman todos o ninguno.
- RES-005: inventario insuficiente rechaza toda la solicitud sin reserva parcial.
- RES-006: equipo transferible se bloquea desde la salida hasta la liberación de regreso.
- RES-007: solicitud posterior al corte de las 17:00 rechaza equipo remoto y conserva opciones locales.
- RES-008: evento del lunes en FCS programa salida el viernes a las 17:00.
- RES-009: equipo esperando regreso no puede reutilizarse en FCS.
- RES-010: recepción anticipada de `admin` libera antes de la hora automática.
- RES-011: demora de `admin` exige nueva fecha/hora y sustituye la liberación previa.
- RES-012: cancelación posterior al traslado conserva la ventana de regreso.
- RES-013: cobertura fuera de horario queda pendiente sin bloquear inventario.
- RES-014: solo `admin` confirma cobertura, recepción o demora.
- RES-015: coordinación de Sistemas se resuelve por ID y correos canónicos.
- RES-016: coordinación suspendida o sin correos conserva reserva y genera reconciliación.
- RES-017: reducir inventario marca conflictos `requiere_revision` sin cancelar eventos.
- RES-018: editar evento conserva reserva anterior cuando el nuevo estado no puede confirmarse.
- RES-019: reintentar el mismo estado no duplica ni alterna reservas.
- RES-020: evento que toca domingo se rechaza en frontend y backend.

## Evidencia requerida antes de staging

- Unitarias Angular de página y facade.
- Unitarias de validadores y operaciones backend.
- Firestore Emulator para concurrencia, unicidad y eliminación condicionada.
- Security Rules con roles anónimo, sin claim, `usuario` y `admin`.
- Revisión accesible y responsive autenticada.
- Lint, formato, build y suite completa aprobados.
