# Spec: Eventos

## Estado

Especificación redefinida documentalmente el 19 de agosto de 2026 para incorporar Coordinaciones y notificaciones confiables. No autoriza implementación ni despliegue. El módulo depende de que `modulo-coordinaciones` esté implementado y aceptado.

## Objetivo

Gestionar eventos institucionales autorizados, protocolos PDF, coordinaciones involucradas y sus integraciones con Google Calendar y correo, conservando propiedad, historial e idempotencia.

## Fuentes obligatorias

- `../reglas-negocio.md`, RN-015 a RN-027 y RN-047 a RN-064.
- `../modelo-datos.md`, colecciones `eventos`, `coordinaciones` y `notificacionesEventos`.
- `../seguridad.md`, reglas SEC-EVT, SEC-COO, SEC-NOT y SEC-STO.
- `../integraciones.md`.
- `../decisiones/ADR-006-coordinaciones-notificaciones-eventos.md`.
- `../arquitectura.md` y `../design-system/spec.md`.

## Dependencia previa

Antes de implementar Eventos deben existir y estar aceptados:

- Administración de Coordinaciones por `admin`.
- Administración de Campus por `admin` y catálogo sanitizado de campus activos.
- Contrato sanitizado de coordinaciones activas para usuarios autorizados.
- Rules y callables de Coordinaciones aprobadas en Emulator Suite.
- Políticas aprobadas de límites, reintentos, retención, PDFs, paginación y verificación de staging.

## Alcance

- Ruta privada `/eventos` para `admin` y `usuario` autorizados.
- Listado por fecha de creación descendente.
- Búsqueda por evento o responsable.
- Paginación de 25 registros por página mediante cursores de Firestore.
- Creación, detalle, edición y eliminación por el creador.
- Un protocolo PDF vigente.
- Equipamiento estructurado.
- Selección opcional y múltiple de coordinaciones activas.
- Sin máximo funcional de coordinaciones seleccionadas; se permiten todas las activas disponibles.
- Fotografía histórica de coordinaciones.
- Calendar institucional.
- Correos individuales de creación, actualización, retiro y cancelación.
- Estado visible de integración completa o parcial sin exponer datos técnicos.

## Fuera de alcance

- Flujo de aprobación.
- Asistentes o respuestas RSVP de Google Calendar.
- Correo libre capturado en el formulario.
- Contactos externos al dominio institucional.
- Gestión de asistentes generales.
- Reportes, exportación, Teams, Zoom o firma electrónica.
- Múltiples protocolos vigentes.
- Modificación de Coordinaciones desde el formulario de Eventos.

## Actor y propiedad

- `admin` y `usuario` autorizados pueden consultar y crear eventos.
- Solo `creadoPorUid` puede editar o eliminar su evento, sin excepción administrativa en esta versión.
- Responsable, UID y correo del creador se obtienen del perfil canónico, no del payload.
- Functions y Rules repiten la validación de propiedad.

## Formulario

### Información general

- Nombre del evento.
- Campus activo obligatorio, resuelto por ID canónico; el evento futuro conserva nombre y dirección históricos.
- Fecha y hora de inicio.
- Fecha y hora de término.
- Responsable de solo lectura desde la sesión.
- Correo de solo lectura desde la sesión.
- Estatus.
- Observaciones.

### Coordinaciones involucradas

- Selector múltiple, buscable y accesible.
- Muestra solo nombres de coordinaciones activas.
- La selección es opcional.
- Muestra las seleccionadas como texto o chips removibles con nombre accesible.
- No muestra ni descarga correos de contactos.
- Una coordinación suspendida previamente seleccionada permanece visible al editar, marcada como “Suspendida”; puede conservarse o retirarse, pero no agregarse de nuevo.

### Equipamiento

- Laptops.
- Proyectores.
- Pantallas.
- Bocinas.
- Micrófonos.
- Consola de audio.
- Extensiones.

### Protocolo

- PDF obligatorio al crear.
- PDF opcional al editar; si se reemplaza, se conserva una sola referencia vigente.
- Tipo `application/pdf` y tamaño menor a 10 MiB.

## Modelo consumido

Además de los campos históricos, el evento usa:

```text
coordinacionIds: string[]
coordinacionesInvolucradas:
  - coordinacionId: string
    nombre: string
revisionNotificacion: number
```

El cliente envía `coordinacionIds`. El backend elimina duplicados, exige que cada coordinación nueva exista y esté activa, obtiene el nombre canónico y construye ambos campos. Nunca acepta nombres o correos como autoridad.

Los eventos históricos sin estos campos se leen como sin coordinaciones y revisión `0`.

## Estados

- `programado`.
- `en_proceso`.
- `finalizado`.
- `registrado` solo para lectura histórica, mostrado como “Programado”.

## Flujo de creación

1. Validar sesión, perfil canónico, datos, fechas, equipamiento y PDF.
2. Validar IDs únicos y coordinaciones activas.
3. Cargar PDF a `eventos/{year}/{fileName}`.
4. Crear Firestore con creador canónico, fotografía de coordinaciones, `revisionNotificacion: 1` y timestamps de servidor.
5. Marcar permanentemente `utilizada: true` en las coordinaciones seleccionadas.
6. Crear o reconciliar Calendar mediante `processEventIntegrations`.
7. Calcular creador más contactos vigentes, normalizar y deduplicar.
8. Crear trabajos idempotentes `creacion` por destinatario.
9. Informar “creado correctamente” si Calendar y trabajos quedaron preparados; informar integración parcial si algún paso posterior al guardado requiere reconciliación.

El evento no se elimina porque SMTP falle.

## Flujo de edición

- Solo el creador puede editar.
- El backend compara estado previo y objetivo.
- Cambiar nombre, fecha, hora o coordinaciones aumenta `revisionNotificacion` exactamente una vez.
- Cambiar únicamente estatus, observaciones, equipamiento o protocolo no aumenta la revisión ni genera correo.
- Calendar se actualiza cuando cambie información que forme parte de su contenido.
- Coordinaciones agregadas deben estar activas y se marcan utilizadas.
- Coordinaciones suspendidas existentes pueden conservarse o retirarse.
- Coordinaciones retiradas reciben `retiro_coordinacion`.
- Creador y coordinaciones agregadas o conservadas reciben `actualizacion`.
- Si un correo sigue involucrado por el creador u otra coordinación, recibe actualización y no un aviso contradictorio de retiro.
- Los destinatarios se calculan con contactos vigentes y el historial mínimo necesario para avisar a quienes ya fueron notificados.
- El PDF nuevo no sustituye la referencia hasta completar su carga y confirmar el evento. Después se elimina el archivo anterior; si falla, queda para reintento. Un archivo sin referencia se purga después de 24 horas.

## Flujo de eliminación

1. Revalidar autorización, propiedad y documento.
2. Construir fotografía de cancelación y destinatarios antes de perder el evento.
3. Eliminar o confirmar ausente el evento de Calendar.
4. Eliminar o confirmar ausente el PDF vigente.
5. En una transacción, crear trabajos idempotentes `cancelacion` y eliminar Firestore.
6. Informar eliminación completa con notificaciones en proceso o integración parcial.

La cancelación se dirige al creador y a la unión sin duplicados de destinatarios previamente notificados y contactos vigentes de las coordinaciones involucradas. Eliminar el evento no habilita eliminar una coordinación utilizada.

## Google Calendar

- Se utiliza exclusivamente el calendario institucional configurado.
- Zona horaria `America/Cancun`.
- Los contactos de Coordinaciones no se incluyen en `attendees`.
- No existe RSVP ni inserción automática en calendarios personales.
- Calendar y correo tienen estados y reintentos independientes.

## Notificaciones por correo

| Operación                                       | Tipo                  | Destinatarios                                                                          |
| ----------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| Crear                                           | `creacion`            | Creador + contactos vigentes de coordinaciones seleccionadas                           |
| Cambiar nombre, fecha, horario o coordinaciones | `actualizacion`       | Creador + contactos vigentes de coordinaciones agregadas o conservadas                 |
| Retirar coordinación                            | `retiro_coordinacion` | Destinatarios previamente notificados y contactos vigentes de la coordinación retirada |
| Eliminar evento                                 | `cancelacion`         | Creador + destinatarios previamente notificados + contactos vigentes aplicables        |

- Cada correo es individual; no expone otros destinatarios.
- Un correo repetido en varias coordinaciones recibe un solo mensaje por tipo y revisión.
- Los destinatarios son siempre institucionales.
- El cuerpo incluye tipo de aviso, evento, fecha, horario y responsable.
- Los trabajos ya enviados no vuelven a enviarse en un reintento.
- Los fallos se muestran como notificaciones pendientes, no como pérdida del evento.

## Consulta y detalle

- El listado consulta 25 eventos por página mediante cursores de Firestore; no descarga la colección completa.
- El listado no muestra correos de Coordinaciones.
- El detalle muestra nombres de coordinaciones, incluso si después fueron suspendidas o renombradas.
- No muestra `notificacionesEventos`, claves idempotentes, errores SMTP ni listas de destinatarios.
- `calendarEventId` puede mostrarse como referencia operativa únicamente conforme al diseño aprobado.

## Estados de interfaz

- Carga inicial.
- Vacío.
- Búsqueda sin coincidencias.
- Error recuperable.
- Carga de PDF.
- Guardado.
- Integración completa.
- Evento guardado con Calendar pendiente.
- Evento guardado con notificaciones pendientes.
- Eliminación con notificaciones de cancelación en proceso.

## Accesibilidad y responsive

- WCAG 2.2 AA.
- Formulario completamente operable por teclado.
- Selector múltiple con etiqueta, instrucciones, estado y eliminación accesible de cada coordinación.
- Errores asociados al campo correspondiente.
- Progreso y resultados asíncronos anunciados.
- Datos y acciones disponibles desde 320 px sin desplazamiento global.

## Errores funcionales mínimos

```text
unauthenticated
permission-denied
event-not-found
coordination-not-found
coordination-inactive
invalid-argument
invalid-date-range
invalid-pdf
integration-partial
notification-reconciliation-required
service-unavailable
```

## Criterios de aceptación

- Un evento válido puede crearse con cero o varias coordinaciones activas.
- El creador siempre queda registrado y recibe notificación.
- Las coordinaciones seleccionadas reciben correos individuales y deduplicados.
- Ningún correo de coordinación procede directamente del cliente ni aparece en el documento público del evento.
- Una coordinación suspendida no puede agregarse, pero no rompe eventos históricos.
- Cambios relevantes, retiro y eliminación producen los tipos de aviso definidos.
- Calendar nunca agrega contactos como asistentes.
- Un fallo SMTP no revierte Firestore, Storage o Calendar.
- Los reintentos no duplican Calendar ni correos enviados.
- Cada correo usa un intento inicial y hasta tres reintentos a los 5 minutos, 30 minutos y 2 horas.
- Los registros terminales de envío se purgan después de 90 días.
- Solo el creador edita o elimina.
- Pasan `pruebas.md`, Rules, Emulator Suite, pruebas de Functions y definición transversal de terminado.

## Decisiones aprobadas

- EVT-D01: El creador y las coordinaciones reciben correo; las coordinaciones no reemplazan al creador.
- EVT-D02: Cada coordinación admite varios correos institucionales.
- EVT-D03: La selección de coordinaciones es opcional.
- EVT-D04: Una coordinación utilizada no se elimina; se suspende.
- EVT-D05: Nombre, fecha, horario y coordinaciones generan actualización por correo.
- EVT-D06: Retiro de coordinación y eliminación de evento generan avisos.
- EVT-D07: Los contactos no son asistentes de Calendar.
- EVT-D08: Correo individual, deduplicado, protegido e idempotente mediante bandeja de salida.
- EVT-D09: El estado final prevalece cuando un destinatario pertenece simultáneamente a coordinaciones retiradas y conservadas.
- EVT-D10: Cada coordinación admite como máximo 10 correos institucionales.
- EVT-D11: No existe máximo funcional de coordinaciones seleccionadas por evento.
- EVT-D12: Cada correo realiza un intento inmediato y tres reintentos a los 5 minutos, 30 minutos y 2 horas.
- EVT-D13: Los registros terminales de notificación se conservan 90 días.
- EVT-D14: Los PDFs huérfanos se purgan después de 24 horas y el PDF anterior se elimina solo tras confirmar la referencia nueva.
- EVT-D15: El listado utiliza paginación por cursor de 25 eventos.
- EVT-D16: Calendar y SMTP se verifican en staging con recursos sintéticos y destinatarios permitidos.

## Pendientes antes de implementar

- Implementar y aceptar Coordinaciones.
- Provisionar y verificar Calendar, SMTP, lista permitida y cuotas del worker en staging.
- Autorizar expresamente el código de Eventos.
