# Spec: Dashboard

## Objetivo

Mostrar una vista resumida del estado real de eventos, usuarios y documentos.

## Dependencias

El Dashboard se implementará después de los servicios de Usuarios y Eventos porque deriva sus datos de ambos dominios.

## Alcance

- Bienvenida y perfil autenticado.
- KPI de eventos registrados.
- KPI de eventos dentro de los próximos 30 días.
- KPI de usuarios activos.
- KPI de eventos con protocolo PDF.
- Tabla de hasta cinco próximos eventos.
- Lista de hasta cinco actividades recientes derivadas de eventos.

## Reglas de cálculo

- Eventos registrados: cantidad total disponible para la consulta aprobada.
- Próximos eventos: inicio entre la fecha actual local y los siguientes 30 días.
- Usuarios activos: documentos con `activo: true`.
- Documentos: eventos con `protocoloUrl` no vacío.
- Actividad: creación o actualización según timestamps.

## Interfaz

- Bienvenida con nombre, correo y rol.
- Cuatro KPI cards.
- Tabla de próximos eventos con nombre, fecha, hora, responsable y estatus.
- Actividad reciente.
- Estados de carga, error y vacío.

## Criterios de aceptación

- No se muestran datos simulados.
- Los cálculos corresponden a los datos consultados.
- `registrado` se presenta como Programado.
- La tabla no provoca desplazamiento horizontal de toda la página.
- Los errores parciales se comunican sin mensajes técnicos.
