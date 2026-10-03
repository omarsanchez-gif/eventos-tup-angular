# Spec: Dashboard

## Estado

Implementado, validado y desplegado únicamente a staging el 3 de octubre de 2026. Sustituyó el incremento temporal autenticado sin cambiar la ruta `/dashboard` ni los permisos de acceso. La aceptación visual, accesible y funcional con ambos roles continúa pendiente; producción no está autorizada.

## Objetivo

Mostrar un resumen real, seguro y eficiente del estado de Eventos, Usuarios y protocolos para orientar la operación institucional al iniciar sesión.

## Fuentes obligatorias

- `../reglas-negocio.md`, RN-031 y RN-DASH-001 a RN-DASH-009.
- `../modelo-datos.md`, colecciones `eventos` y `usuarios` y read model de Dashboard.
- `../seguridad.md`, SEC-DASH-001 a SEC-DASH-006.
- `../arquitectura.md` y `../design-system/spec.md`.
- `../modulo-eventos/spec.md` para estado temporal y compatibilidad histórica.

## Dependencias

El Dashboard se implementa después de Usuarios y Eventos. No crea una colección propia ni copia datos: obtiene un read model mediante una callable que consulta las fuentes canónicas con Admin SDK.

## Actores y autorización

- `admin` y `usuario` autorizados acceden al mismo resumen funcional.
- La callable exige Authentication, claim `authorized == true`, rol válido y documento canónico activo para el UID.
- El conteo de usuarios activos no concede lectura de documentos de `usuarios` ni expone nombres, correos, roles, UID o timestamps.

## Alcance

- Bienvenida y perfil autenticado.
- KPI de eventos registrados.
- KPI de eventos dentro de los próximos 30 días.
- KPI de usuarios activos.
- KPI de eventos con protocolo PDF vigente.
- Tabla de hasta cinco próximos eventos.
- Lista de hasta cinco actividades recientes derivadas de Eventos.
- Estados inicial, carga, error total, error parcial y vacío.
- Acción `Reintentar` que vuelve a consultar el resumen completo.

## Fuera de alcance

- Gráficas, tendencias, porcentajes, comparaciones con periodos anteriores o metas.
- Filtros, exportaciones, reportes o personalización por usuario.
- Actividad de Usuarios, Coordinaciones, Campus o Equipos.
- Navegación desde una fila hacia el detalle de Evento en este incremento.
- Actualización en tiempo real, listeners Firestore, caché persistente o polling.
- Escrituras, colecciones, campos o dependencias externas nuevas.

## Reglas de cálculo

### Eventos registrados

Cuenta todos los documentos de `eventos`, incluidos los cancelados como historial. Usa agregación `count()` y no descarga la colección.

### Próximos eventos

- Usa hora de servidor y zona `America/Cancun`.
- Incluye eventos no cancelados con `inicioAt >= serverNow` e `inicioAt < serverNow + 30 días`.
- El KPI usa agregación `count()`.
- La tabla devuelve como máximo cinco, ordenados por `inicioAt ASC` y por ID como desempate estable.
- Los eventos cancelados no aparecen ni consumen el KPI de próximos.

### Usuarios activos

Cuenta documentos de `usuarios` con `activo: true` mediante agregación backend. No devuelve documentos individuales.

### Eventos con protocolo

Cuenta documentos de `eventos` cuyo `protocoloUrl` sea una cadena no vacía. Incluye históricos y cancelados que aún conserven referencia; una cancelación cuyo protocolo ya fue retirado deja de contar.

### Actividad reciente

- Devuelve como máximo cinco eventos ordenados por `fechaActualizacion DESC` e ID como desempate estable.
- La actividad es `creacion` cuando `fechaActualizacion` y `fechaCreacion` representan el mismo instante; en otro caso es `actualizacion`.
- Una cancelación se presenta como actualización y conserva el estado `Cancelado`; no se inventa una auditoría separada.
- Cada entrada contiene únicamente ID, nombre, tipo de actividad, timestamp, responsable y estado temporal sanitizado.

### Estado temporal

`programado`, `en_ejecucion` y `finalizado` se derivan con la misma función backend de Eventos y `serverNow`. `cancelado` prevalece. `registrado` se presenta como `Programado` cuando no existen instantes canónicos suficientes.

## Contrato backend `getDashboardSummary`

### Entrada

Objeto vacío. Cualquier campo enviado se rechaza con `invalid-argument`.

### Respuesta

```text
serverNow: ISO string
metrics:
  registeredEvents: integer | null
  upcomingEvents: integer | null
  activeUsers: integer | null
  eventsWithProtocol: integer | null
upcoming:
  - eventId: string
    name: string
    dateStart: string
    timeStart: string
    responsible: string
    status: "programado" | "en_ejecucion" | "finalizado" | "cancelado"
recentActivity:
  - eventId: string
    name: string
    action: "creacion" | "actualizacion"
    occurredAt: ISO string
    responsible: string
    status: "programado" | "en_ejecucion" | "finalizado" | "cancelado"
unavailableSections: ("registeredEvents" | "upcomingEvents" | "activeUsers" | "eventsWithProtocol" | "upcoming" | "recentActivity")[]
```

Cada consulta funcional se ejecuta de forma independiente. Un fallo parcial devuelve `null` para el KPI afectado o una lista vacía para su sección, registra únicamente el identificador sanitizado en `unavailableSections` y conserva los datos restantes. Fallas de autenticación o perfil canónico rechazan toda la callable.

## Arquitectura Angular

```text
DashboardPage
    ↓
DashboardFacade [Signals]
    ↓
DashboardGateway
    ↓
getDashboardSummary
```

- El componente no importa Firebase.
- La facade conserva `loading`, `error`, `summary` y `partialWarning`.
- La carga ocurre una vez al entrar en la ruta y al activar `Reintentar`.
- El reloj del navegador no decide los KPIs ni reescribe la respuesta.

## Interfaz

- Encabezado institucional con bienvenida, nombre y contexto breve; correo y rol permanecen visibles sin repetir el bloque temporal completo de sesión.
- Cuatro KPI cards con etiqueta, valor real y explicación breve.
- Tabla `Próximos eventos` con nombre, fecha, hora, responsable y estado.
- Lista `Actividad reciente` con acción, evento, responsable y fecha localizada.
- La tabla usa la primitiva administrativa compartida; en móvil cambia a tarjetas y no provoca desplazamiento horizontal de toda la página.
- Los estados usan texto y tokens semánticos, nunca solo color.
- Los números se anuncian con etiquetas completas; los skeletons no se leen como datos reales.

## Estados de pantalla

- Carga inicial: skeletons y texto `Cargando resumen institucional` con `aria-live`.
- Error total: alerta funcional `No fue posible cargar el Dashboard` y botón `Reintentar`.
- Error parcial: advertencia `Algunos datos no están disponibles` y conserva las secciones válidas; cada KPI no disponible muestra `—`, nunca `0`.
- Sin próximos eventos: mensaje `No hay eventos programados para los próximos 30 días`.
- Sin actividad: mensaje `No hay actividad de eventos para mostrar`.

## Índices y rendimiento

- Conteos usan agregaciones Firestore.
- Próximos eventos usa índice compuesto `estatus ASC, inicioAt ASC, __name__ ASC`.
- Actividad reciente usa `fechaActualizacion DESC, __name__ DESC`.
- Ninguna consulta descarga todos los eventos o usuarios.
- Las listas se limitan a cinco documentos.

## Criterios de aceptación

- No se muestran datos simulados, aproximados o calculados desde la página visible de Eventos.
- Los cuatro KPIs corresponden a consultas canónicas backend.
- `admin` y `usuario` autorizados reciben el mismo read model sin exposición de documentos administrativos.
- Los eventos cancelados cuentan como registrados, pero no como próximos.
- `registrado` se presenta como Programado.
- La tabla no provoca desplazamiento horizontal de toda la página.
- Carga, vacío, error total y error parcial son accesibles y no muestran mensajes técnicos.
- Pruebas, lint, guardia visual, formato y builds pasan antes de cualquier despliegue.
- El despliegue de staging ya fue autorizado y ejecutado por servicios separados; producción requiere autorización distinta y evidencia de aceptación.
