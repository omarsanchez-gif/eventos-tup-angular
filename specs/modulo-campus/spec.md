# Spec: Campus

## Estado

Implementación autorizada el 21 de agosto de 2026. El despliegue requiere autorización separada.

## Objetivo

Permitir que un administrador mantenga el catálogo canónico de campus y sus horarios de Sistemas para que Equipos y Eventos futuros calculen ubicación, disponibilidad y logística sin valores fijos en el frontend.

## Fuentes obligatorias

- `../reglas-negocio.md`, reglas RN-CAM.
- `../modelo-datos.md`, colección `campus`.
- `../seguridad.md`, reglas SEC-CAM.
- `../arquitectura.md`.
- `../design-system/spec.md`.
- `../decisiones/ADR-007-campus-equipos-logistica.md`.

## Actor y acceso

### Admin

- Accede a `/campus`.
- Lista documentos completos.
- Crea, edita, activa, suspende y elimina cuando no existe uso.

### Usuario autorizado

- No accede a `/campus` ni lee documentos completos.
- Mediante contrato backend futuro o actual obtiene únicamente campus activos con ID, nombre, clave, dirección y referencia.

## Modelo administrativo

```text
documentId: string
nombre: string
nombreNormalizado: string
clave: string
direccion: string | null
referencia: string | null
activo: boolean
utilizado: boolean
horariosSistemas:
  lunes..sabado:
    operativo: boolean
    inicio: string | null
    fin: string | null
  domingo:
    operativo: false
    inicio: null
    fin: null
fechaCreacion: Timestamp
fechaActualizacion: Timestamp
```

## Validación

- `nombre`: obligatorio, espacios compactados, máximo 120 caracteres y único sin distinguir mayúsculas ni espacios exteriores.
- `clave`: obligatoria, única, normalizada a mayúsculas, entre 2 y 10 caracteres; admite letras A–Z, números y guion.
- `direccion`: opcional, `null` cuando queda vacía, máximo 240 caracteres.
- `referencia`: opcional, `null` cuando queda vacía, máximo 240 caracteres.
- Un día operativo exige `inicio` y `fin` `HH:mm`, con fin posterior al inicio.
- Un campus activo requiere al menos un día operativo entre lunes y sábado.
- Domingo siempre se persiste inactivo.
- Los campos normalizados, `utilizado` y timestamps son administrados por backend.
- La capacidad técnica inicial es de 100 campus. Si se supera, las listas fallan sin devolver resultados parciales.

## Contratos backend

### `listCampuses`

- Requiere claim `authorized: true`, rol `admin` y perfil canónico activo `admin`.
- Devuelve el catálogo completo ordenado por nombre y clave.

### `listSelectableCampuses`

- Requiere usuario autorizado y perfil canónico activo.
- Devuelve solo registros activos con `campusId`, `nombre`, `clave`, `direccion` y `referencia`.
- No devuelve horarios, uso ni timestamps.

### `createCampus`

- Solo `admin`.
- Acepta `nombre`, `clave`, `direccion`, `referencia`, `horariosSistemas` y `activo`.
- Crea con `utilizado: false` y timestamps del servidor.
- Valida capacidad, nombre y clave únicos dentro de una transacción.

### `updateCampus`

- Solo `admin`.
- Actualiza campos editables y conserva creación, estado y uso.
- Una clave utilizada queda inmutable; nombre, dirección, referencia y horarios pueden corregirse.

### `setCampusStatus`

- Solo `admin`.
- Recibe el estado objetivo; es idempotente.
- Activar exige al menos un día operativo válido.

### `deleteCampus`

- Solo `admin`.
- Elimina únicamente `utilizado: false`.

## UI

- Ruta lazy `/campus` con `authorizedGuard` heredado y `adminGuard`.
- Navegación visible solo para `admin`.
- Encabezado “Campus” y acción “Nuevo campus”.
- Búsqueda local mientras se escribe por nombre, clave, dirección o referencia.
- Tabla de nombre/clave, dirección, horarios, estado, actualización y acciones.
- Paginación visual con 5, 10, 15 o 20 registros.
- Formulario en diálogo accesible con nombre, clave, dirección, referencia, estado inicial y horarios de lunes a sábado; domingo se informa como inactivo.
- Direcciones vacías muestran “Dirección pendiente”.
- Acciones usan las primitivas globales y ayudas contextuales.
- Eliminar aparece deshabilitado y explicado cuando `utilizado: true`.
- Estados de carga, vacío, sin coincidencias, error y éxito.
- Responsive desde 320 px mediante tarjetas equivalentes.

## Datos iniciales esperados

La aplicación no crea semillas automáticas. El administrador podrá capturar:

- `Tecnológico Universitario Playacar`, clave `TUP`, dirección pendiente, lunes a viernes 08:00–20:00, sábado 08:00–18:00 y domingo inactivo.
- `Facultad de Ciencias de la Salud`, clave `FCS`, dirección pendiente, lunes a viernes 09:00–18:00, sábado 09:00–14:00 y domingo inactivo.

## Fuera de alcance

- Equipos, inventarios y reservaciones.
- Cálculos o rutas de traslado.
- Cobertura de Sistemas fuera de horario.
- Festivos.
- Espacios físicos dentro de un campus.
- Integración con Eventos, correo o Calendar.
- Despliegue a staging o producción.

## Criterio de terminado

- Documentación, código, pruebas unitarias, Emulator y Rules alineados.
- CRUD administrativo completo y catálogo sanitizado.
- Concurrencia de nombre y clave probada.
- Escrituras directas bloqueadas.
- Lint, formato, pruebas y build en verde.
- Producción no utilizada.
