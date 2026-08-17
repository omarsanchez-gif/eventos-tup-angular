# Spec: Eventos

## Objetivo

Gestionar eventos institucionales autorizados, protocolos PDF y sus integraciones.

## Alcance

- Listado por fecha de creación descendente.
- Búsqueda por evento o responsable.
- Paginación visual con 5, 10, 15 o 20 registros.
- Creación.
- Detalle.
- Edición por creador.
- Eliminación por creador.
- Un protocolo PDF vigente.
- Equipamiento estructurado.
- Calendar y correo.

## Formulario

- Nombre del evento.
- Fecha y hora de inicio.
- Fecha y hora de término.
- Responsable de solo lectura desde la sesión.
- Correo de solo lectura desde la sesión.
- Estatus.
- Observaciones.
- Laptops, proyectores, pantallas, bocinas, micrófonos, consola de audio y extensiones.
- Protocolo PDF.

## Estados

- `programado`.
- `en_proceso`.
- `finalizado`.
- `registrado` solo para lectura histórica, mostrado como Programado.

## Flujo de creación

1. Validar datos.
2. Cargar PDF a `eventos/{year}/{fileName}`.
3. Crear Firestore con creador y timestamps.
4. Invocar `processEventIntegrations`.
5. Informar éxito o guardado parcial con fallo de integración.

## Edición

- Solo el creador puede editar.
- El PDF es opcional; si se carga, reemplaza la referencia vigente.
- Después de Firestore se invoca `syncUpdatedEventCalendar`.

## Eliminación

- Solo el creador puede solicitarla.
- Se invoca `deleteEvent`.
- La eliminación directa desde cliente permanece bloqueada.

## Criterios de aceptación

- Un evento válido se crea con PDF.
- Archivos no PDF, de 10 MiB o mayores se rechazan.
- Fechas y horas inválidas se rechazan.
- El creador queda registrado automáticamente.
- Calendar recibe altas y ediciones.
- El creador recibe correo al alta cuando SMTP funciona.
- Solo el creador puede editar o eliminar.
- El detalle muestra información, equipo, protocolo y Calendar ID.
- Se pueden leer documentos históricos con `registrado`.
