# ADR-007: Campus como base de inventario y logística

## Estado

Aprobada para Campus y ampliada documentalmente para Equipos el 21 de agosto de 2026. La implementación de Equipos, reservaciones, traslados y su integración con Eventos permanece pendiente de autorización separada.

## Contexto

La institución opera inicialmente en dos campus: Tecnológico Universitario Playacar (`TUP`) y Facultad de Ciencias de la Salud (`FCS`). Los horarios de Sistemas difieren por campus y algunos equipos, en particular bocinas y micrófonos, deben trasladarse desde TUP hacia FCS. Por ello, campus no puede ser un texto libre ni una lista fija en el frontend.

## Decisión para Campus

1. Crear una colección administrativa `campus` con nombre y clave únicos, dirección y referencia opcionales, horarios semanales, estado y marca permanente de uso.
2. Permitir tantos campus como requiera la institución, con un máximo técnico inicial de 100 registros para la consulta administrativa local.
3. Reservar el domingo como día inactivo en esta versión. De lunes a sábado cada campus define si Sistemas opera y su horario de inicio y fin.
4. Permitir crear y activar un campus sin dirección. La interfaz muestra “Dirección pendiente”.
5. Solo `admin` administra documentos completos. Todo usuario autorizado obtiene mediante callable únicamente campus activos sanitizados.
6. Un campus utilizado por Eventos, Equipos o rutas futuras conserva `utilizado: true` y no puede eliminarse; solo suspenderse.
7. Conservar en Eventos futuros el ID, nombre y dirección histórica del campus.

## Política logística futura aprobada

- Montaje y pruebas: 60 minutos antes del evento.
- Desmontaje: 30 minutos después.
- Los equipos transferibles solicitados fuera del campus base se trasladan en la ventana regular de las 17:00 del día operativo anterior que pueda completar la recepción.
- Las solicitudes posteriores a ese corte no confirman equipos provenientes de otro campus.
- El recorrido TUP–FCS se estima inicialmente en 30 minutos; las rutas futuras se configurarán por origen y destino.
- Sistemas opera en TUP de lunes a viernes de 08:00 a 20:00 y sábado de 08:00 a 18:00; en FCS de lunes a viernes de 09:00 a 18:00 y sábado de 09:00 a 14:00.
- Domingo es inactivo; los festivos se consideran operativos hasta implementar un calendario de excepciones.
- El regreso inicia al cierre operativo de FCS: 18:00 entre semana y 14:00 el sábado. Si el evento y desmontaje terminan después, utiliza la siguiente ventana operativa.
- La liberación automática ocurre 60 minutos después de iniciar el regreso. Un `admin` puede confirmar recepción anticipada o reportar demora antes de esa liberación.
- Un equipo trasladado no puede reutilizarse en FCS mientras espera regresar.
- Cancelar después del traslado conserva la ventana de regreso.
- Una solicitud fuera del horario normal de Sistemas sí reserva inventario; queda con cobertura de Sistemas pendiente, notificando a la coordinación de Sistemas. Solo `admin` confirma esa cobertura.

## Decisión documental para Equipos

1. El catálogo registra cantidades agrupadas por nombre y campus base; no identifica cada unidad física.
2. La combinación nombre normalizado y campus base es única. La cantidad operativa admite de 0 a 999 y el catálogo un máximo técnico de 500 registros.
3. Cada registro es `fijo` o `transferible`. Los fijos no tienen destinos; los transferibles declaran campus destino permitidos de forma explícita.
4. Con TUP y FCS, el otro campus se selecciona expresamente como destino. Agregar un campus no autoriza traslados hacia él y exige una política posterior.
5. El inventario contiene solo equipo utilizable y no requiere fotografía, número de serie ni control de mantenimiento en el primer incremento.
6. Un equipo utilizado no se elimina y su campus base queda inmutable. Las fotografías históricas conservan nombre, campus y clasificación.
7. La disponibilidad se calcula a partir de cantidad operativa y reservas coincidentes; no se almacena un contador mutable.
8. El catálogo y las reservaciones son incrementos distintos. Implementar el catálogo no autoriza disponibilidad ni integración con Eventos.

## Decisión documental para reservaciones

1. Una solicitud con varios equipos se confirma completa o se rechaza completa mediante una operación atómica.
2. No existe asignación parcial cuando una cantidad es insuficiente.
3. Reducir inventario por debajo de compromisos futuros marca las reservas afectadas `requiere_revision`, notifica a Sistemas y no cancela eventos silenciosamente.
4. Cobertura de Sistemas usa `no_requerida`, `pendiente` y `confirmada`; pendiente no bloquea la reserva y solo `admin` confirma.
5. La coordinación responsable se selecciona desde Coordinaciones y se guarda por ID canónico; nunca se identifica por nombre ni por correos enviados desde el cliente.
6. Una coordinación suspendida o sin correos conserva la reserva y genera una reconciliación de notificación.
7. Una demora de regreso exige nueva fecha y hora estimada. Esta sustituye la liberación previa y una recepción anticipada puede liberar antes.
8. No se aceptan eventos que inicien, terminen o transcurran en domingo.
9. El evento del lunes en FCS traslada equipo remoto el viernes a las 17:00, porque el sábado no permite completar recepción después de esa hora.
10. Cambiar fecha, horario, campus, equipos o cantidades recalcula la solicitud completa; si el nuevo estado no puede confirmarse, se conserva el anterior.

## Pendiente bloqueante de reservaciones

Debe definirse si Eventos permitirá intervalos de varios días. Esta decisión no bloquea el catálogo, pero sí la autorización de reservaciones y Eventos.

## Fuera del incremento Campus

- Colecciones de Equipos, inventarios o reservaciones.
- Rutas de traslado editables.
- Confirmación de recepción, demora o cobertura fuera de horario.
- Correos logísticos.
- Integración con Eventos o Calendar.
- Calendario de festivos.

El detalle del catálogo y de las reservaciones objetivo está en `../modulo-equipos/spec.md` y `../modulo-equipos/reservaciones.md`.

## Consecuencias

- Campus se implementa antes de Equipos y Eventos.
- Los horarios se administran como datos y no se codifican en el formulario de Eventos.
- La lógica logística futura podrá calcularse con IDs canónicos y horarios del servidor.
- El catálogo debe impedir referencias rotas y escrituras directas desde clientes.
