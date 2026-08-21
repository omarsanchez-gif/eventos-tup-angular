# ADR-007: Campus como base de inventario y logística

## Estado

Aprobada para Campus el 21 de agosto de 2026. La implementación de Equipos, reservaciones, traslados y su integración con Eventos permanece pendiente de autorización separada.

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

## Fuera del incremento Campus

- Colecciones de Equipos, inventarios o reservaciones.
- Rutas de traslado editables.
- Confirmación de recepción, demora o cobertura fuera de horario.
- Correos logísticos.
- Integración con Eventos o Calendar.
- Calendario de festivos.

## Consecuencias

- Campus se implementa antes de Equipos y Eventos.
- Los horarios se administran como datos y no se codifican en el formulario de Eventos.
- La lógica logística futura podrá calcularse con IDs canónicos y horarios del servidor.
- El catálogo debe impedir referencias rotas y escrituras directas desde clientes.
