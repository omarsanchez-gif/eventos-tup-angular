# Tareas: Usuarios

## Estado

Implementación autorizada, validada en Emulator Suite y desplegada únicamente a staging el 18 de agosto de 2026. Las tareas marcadas reflejan evidencia disponible; revisión visual autenticada, recorrido manual completo y aceptación final permanecen pendientes.

## Documentación base

- [x] USR-T01 Contrastar reglas de negocio, modelo de datos, seguridad, arquitectura y ADR-001.
- [x] USR-T02 Contrastar el comportamiento del módulo Vue real sin copiar sus debilidades de seguridad.
- [x] USR-T03 Redactar `spec.md`, `pruebas.md` y `tareas.md` para validación.

## Decisiones y aprobación

- [x] USR-T04 Aprobar `USR-D01`: lista limitada a 500, búsqueda por fragmento y paginación local.
- [x] USR-T05 Aprobar `USR-D02`: correo inmutable después de asociar UID.
- [x] USR-T06 Aprobar `USR-D03`: sin auto-retiro y permanencia de al menos un admin activo.
- [x] USR-T07 Aprobar `USR-D04`: estado objetivo idempotente, fallo cerrado y reconciliación.
- [x] USR-T08 Confirmar nombres, entradas, salidas y errores de las cinco callables.
- [x] USR-T09 Confirmar que la eliminación física del documento continúa dentro del alcance conforme a RN-013.
- [x] USR-T10 Registrar la aprobación documental de las decisiones; la aceptación visual permanece en USR-T110.

## Preparación técnica

- [x] USR-T11 Verificar que Java 21 y Emulator Suite estén disponibles antes de desarrollar Rules y callables.
- [x] USR-T12 Crear cuentas y documentos sintéticos definidos en `pruebas.md`.
- [x] USR-T13 Confirmar el dominio institucional de prueba por configuración backend.
- [ ] USR-T14 Confirmar que el volumen actual y esperado de `usuarios` permanece por debajo del límite aprobado de 500.
- [ ] USR-T15 Inventariar índices Firestore necesarios sin desplegarlos todavía.
- [x] USR-T16 Confirmar que las decisiones aprobadas no requieren campos, colecciones o dependencias nuevas.

## Modelos y contratos Angular

- [x] USR-T17 Crear el modelo `SystemUser` con los siete campos canónicos y `documentId` técnico.
- [x] USR-T18 Crear payloads separados para alta, edición y cambio de estado.
- [x] USR-T19 Crear tipos de paginación, resultados y errores funcionales.
- [x] USR-T20 Impedir que los payloads acepten UID, fechas, último acceso o claims.
- [x] USR-T21 Crear tokens de inyección para gateways testeables.

## Backend compartido

- [x] USR-T22 Crear validación común de sesión, claims y perfil canónico admin. Cubre USR-004 y USR-005.
- [x] USR-T23 Crear normalización y validación backend de nombre y correo. Cubre USR-022 a USR-025.
- [x] USR-T24 Crear validación exhaustiva de roles. Cubre USR-027.
- [x] USR-T25 Crear consulta segura de documento por `documentId` con manejo `user-not-found`.
- [x] USR-T26 Crear verificación de unicidad normalizada y concurrencia. Cubre USR-025 y USR-026.
- [x] USR-T27 Crear mapeo único de errores técnicos a los códigos del spec.
- [x] USR-T28 Implementar logging estructurado sin datos sensibles. Cubre USR-055 y USR-056.
- [x] USR-T29 Diseñar claves o estrategia idempotente para reintentos sin nuevos campos. Cubre USR-054.

## Callable de listado

- [x] USR-T30 Implementar `listAuthorizedUsers` sin entrada funcional y con salida máxima de 500.
- [x] USR-T31 Leer como máximo 501 documentos y responder `user-capacity-exceeded` sin datos parciales.
- [x] USR-T32 Ordenar por nombre y `documentId` para obtener resultados deterministas.
- [x] USR-T33 Diferenciar en Angular colección vacía, búsqueda vacía y búsqueda sin coincidencias.
- [x] USR-T34 Confirmar que la consulta es limitada y no requiere índices de texto.

## Callable de alta

- [x] USR-T35 Implementar `createAuthorizedUser` con autorización administrativa.
- [x] USR-T36 Asignar `uid: null`, `fechaCreacion` de servidor y `ultimoAcceso: null`.
- [x] USR-T37 Garantizar que el alta no invoque creación de cuentas Authentication.
- [x] USR-T38 Proteger contra doble envío y altas concurrentes duplicadas.
- [x] USR-T39 Rechazar campos extra administrados por servidor.

## Callable de edición

- [x] USR-T40 Implementar `updateAuthorizedUser` con autorización administrativa.
- [x] USR-T41 Actualizar exclusivamente nombre, correo y rol permitidos.
- [x] USR-T42 Rechazar cambios de correo cuando exista UID y devolver `uid-bound-email-change-forbidden`.
- [x] USR-T43 Sincronizar claim de rol cuando exista UID.
- [x] USR-T44 Conservar el rol canónico objetivo y devolver reconciliación si falla Claims; nunca restaurar privilegios mayores.
- [x] USR-T45 Conservar estado, UID, fecha de creación y último acceso.

## Callable de estado

- [x] USR-T46 Implementar `setAuthorizedUserStatus` con autorización administrativa.
- [x] USR-T47 Activar usuario sin UID modificando únicamente Firestore.
- [x] USR-T48 Activar usuario con UID y sincronizar claims canónicos.
- [x] USR-T49 Desactivar usuario sin UID modificando únicamente Firestore.
- [x] USR-T50 Desactivar usuario con UID, retirar autorización y rol, y revocar tokens.
- [x] USR-T51 Rechazar auto-desactivación y cambios que dejen cero admins activos dentro de la transacción.
- [x] USR-T52 Conservar el estado restrictivo, permitir reintento idempotente y devolver `reconciliation-required`.

## Callable de eliminación

- [x] USR-T53 Implementar `deleteAuthorizedUser` con autorización administrativa.
- [x] USR-T54 Rechazar eliminación propia mediante UID en backend.
- [x] USR-T55 Marcar inactivo en Firestore, desautorizar, revocar y después eliminar un usuario con UID.
- [x] USR-T56 No eliminar la cuenta de Firebase Authentication.
- [x] USR-T57 Rechazar eliminación propia y cualquier eliminación que deje cero admins activos.
- [x] USR-T58 Mantener al objetivo inactivo y retornar reconciliación ante fallo parcial.

## Security Rules

- [x] USR-T59 Permitir lectura de `usuarios` únicamente con claims autorizado y admin.
- [x] USR-T60 Bloquear toda escritura administrativa directa desde clientes.
- [x] USR-T61 Conservar compatibilidad con `bootstrapAuthorization` sin abrir permisos adicionales.
- [x] USR-T62 Crear pruebas de Rules para admin, usuario, sin claims y anónimo.
- [x] USR-T63 Ejecutar Rules en Emulator Suite antes de cualquier despliegue a staging.

## Estado Angular y acceso a datos

- [x] USR-T64 Crear gateway de callables sin importar Firebase en componentes.
- [x] USR-T65 Crear facade/estado con Signals para la lista limitada, filtro local, página, loading, error y resultado.
- [x] USR-T66 Impedir solicitudes duplicadas y resolver correctamente `finally`.
- [x] USR-T67 Filtrar y paginar localmente; recargar o actualizar la lista después de una mutación exitosa.
- [x] USR-T68 Conservar el listado y mostrar alerta persistente ante reconciliación requerida.
- [x] USR-T69 Crear mensajes funcionales centralizados en español.

## Ruta y navegación

- [x] USR-T70 Crear carga diferida de `/usuarios` como hija de `AdminShell`.
- [x] USR-T71 Aplicar guard autorizado y guard de rol admin.
- [x] USR-T72 Habilitar la opción Usuarios únicamente para admin y retirar “Próximamente”.
- [x] USR-T73 Mantener la opción oculta para rol usuario.
- [x] USR-T74 Marcar la opción activa de forma visual y con `aria-current`.
- [x] USR-T75 Verificar redirección segura de sesión ausente o rol no permitido.

## Vista principal

- [x] USR-T76 Crear encabezado, descripción y acción “Nuevo usuario”.
- [x] USR-T77 Crear búsqueda por nombre o correo, botón Buscar y acción Limpiar.
- [x] USR-T78 Crear tabla con caption y las seis columnas especificadas.
- [x] USR-T79 Crear badges accesibles de rol y estado.
- [x] USR-T80 Formatear último acceso en `es-MX`, `America/Cancun`, o mostrar “Sin acceso”.
- [x] USR-T81 Crear acciones Editar, Activar/Desactivar y Eliminar con nombres accesibles.
- [x] USR-T82 Deshabilitar y explicar eliminación del usuario autenticado.
- [x] USR-T83 Crear paginación con tamaños 5, 10, 15 y 20.
- [x] USR-T84 Implementar estados loading, vacío, sin coincidencias, error y reintento.

## Diálogo de alta y edición

- [x] USR-T85 Crear formulario con nombre, correo, rol y estado inicial en alta.
- [x] USR-T86 Crear edición sin estado, UID, fecha de creación o último acceso.
- [x] USR-T87 Asociar errores accesibles a cada campo y enfocar el primero inválido.
- [x] USR-T88 Bloquear doble guardado y exponer `aria-busy`.
- [x] USR-T89 Cerrar y actualizar listado solo ante éxito completo.
- [x] USR-T90 Restaurar foco al cerrar o cancelar.

## Confirmaciones y retroalimentación

- [x] USR-T91 Crear confirmación de desactivación con efecto sobre sesiones.
- [x] USR-T92 Crear advertencia al cambiar `admin` a `usuario`.
- [x] USR-T93 Crear confirmación de eliminación con nombre, correo y aclaración sobre Google/Auth.
- [x] USR-T94 Crear mensajes de éxito anunciados sin depender del color.
- [x] USR-T95 Crear alerta persistente para `reconciliation-required`.

## Responsive y accesibilidad

- [x] USR-T96 Definir tabla contenida o tarjetas equivalentes debajo de 720 px.
- [ ] USR-T97 Validar ancho mínimo de 320 px sin scroll horizontal global.
- [ ] USR-T98 Validar objetivos táctiles mínimos de 44 × 44 px.
- [ ] USR-T99 Validar contraste, foco, teclado y lector de pantalla.
- [ ] USR-T100 Validar diálogos, regiones dinámicas y `prefers-reduced-motion`.

## Pruebas automatizadas

- [x] USR-T101 Crear pruebas unitarias de normalización y validación.
- [x] USR-T102 Crear pruebas unitarias de facade, estados y errores.
- [ ] USR-T103 Crear pruebas de componentes, formulario, tabla, diálogos y navegación.
- [x] USR-T104 Crear pruebas de las cinco callables con Auth y Firestore Emulator.
- [ ] USR-T105 Crear pruebas de claims, revocación, ventana del ID token, fallo cerrado, reconciliación e idempotencia.
- [x] USR-T106 Crear pruebas de concurrencia para correo único.
- [ ] USR-T107 Ejecutar USR-001 a USR-069 y registrar evidencia de cada resultado.

## Verificación y cierre

- [x] USR-T108 Ejecutar formato, lint, TypeScript, pruebas frontend, Functions y Rules.
- [x] USR-T109 Verificar presupuesto de bundle y carga diferida.
- [ ] USR-T110 Realizar revisión visual en 320 px, tableta y escritorio.
- [ ] USR-T111 Realizar recorrido completo por teclado y lector de pantalla.
- [ ] USR-T112 Validar primero con Emulator Suite y después con cuentas sintéticas de staging.
- [x] USR-T113 Confirmar que producción no fue utilizada ni modificada.
- [x] USR-T114 Actualizar trazabilidad, decisiones pendientes y README solo después de autorizar implementación.
- [ ] USR-T115 Obtener aceptación funcional y visual antes de habilitar Hosting de staging.

## Seguimiento de búsqueda e iconografía

- [x] USR-T116 Vincular el formulario reactivo de búsqueda para impedir el envío nativo y la recarga de la SPA.
- [x] USR-T117 Agregar una prueba de regresión que envíe el formulario real, verifique el filtrado y confirme que no se repite la consulta remota.
- [x] USR-T118 Sustituir los caracteres de acciones por SVG lineales de editar, activar/desactivar y papelera.
- [x] USR-T119 Mostrar ayudas contextuales accesibles en `hover` y `focus-visible`, incluidas las restricciones de acciones deshabilitadas.
- [x] USR-T120 Ejecutar pruebas Angular, lint, formato y build de staging; actualizar la evidencia documental.

## Seguimiento de búsqueda en tiempo real

- [x] USR-T121 Filtrar el listado local con cada cambio del campo, sin requerir botón ni `Enter`.
- [x] USR-T122 Agregar una prueba que escriba y borre el término sin enviar el formulario y confirme que no se repite la consulta remota.
- [x] USR-T123 Ejecutar pruebas Angular, lint, formato y build de staging; actualizar trazabilidad y evidencia.
