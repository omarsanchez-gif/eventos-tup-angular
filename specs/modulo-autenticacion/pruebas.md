# Pruebas: Autenticación

## Funcionales

### AUTH-001 — Inicio válido

Cuenta institucional registrada, activa y con rol válido. Debe acceder a `/dashboard`, cargar perfil y claims, y permitir que el Dashboard funcional solicite su resumen.

### AUTH-002 — Usuario inexistente

Cuenta Google institucional ausente de `usuarios`. Debe borrar estado local, cerrar sesión y mostrar “Usuario no autorizado”.

### AUTH-003 — Usuario inactivo

Documento con `activo: false`. No debe acceder y debe mostrar “Usuario inactivo”.

### AUTH-004 — Dominio no permitido

Cuenta Google externa. Debe rechazarse sin exponer detalles técnicos.

### AUTH-005 — Asociación de UID

Usuario activo con `uid: null`. Debe guardar el UID autenticado sin crear otro documento.

### AUTH-006 — Conflicto de UID

Usuario con UID distinto al autenticado. No debe sobrescribirse; debe rechazarse y registrar el conflicto.

### AUTH-007 — Último acceso

Inicio válido. `ultimoAcceso` debe actualizarse mediante fecha de servidor.

### AUTH-008 — Persistencia

Después de recargar, debe recuperar Firebase Auth, validar autorización y mantener acceso.

### AUTH-009 — Ruta privada sin sesión

Abrir `/dashboard` sin sesión. Debe redirigir a `/login` sin mostrar contenido privado.

### AUTH-010 — Login con sesión válida

Abrir `/login` con sesión autorizada. Debe redirigir a `/dashboard`.

### AUTH-011 — Logout

Cerrar sesión. Debe limpiar Signals, cerrar Firebase Auth y abrir `/login`.

### AUTH-012 — Historial posterior al logout

Usar Atrás después de logout. No debe recuperar contenido privado.

## Claims y seguridad

### AUTH-013 — Claims de admin

Usuario activo con rol `admin`. El token renovado debe contener `authorized: true` y `role: admin`.

### AUTH-014 — Claims de usuario

Usuario activo con rol `usuario`. El token debe contener `authorized: true` y `role: usuario`.

### AUTH-015 — Rol inválido

Documento con rol no permitido. El bootstrap debe rechazarlo y no otorgar autorización.

### AUTH-016 — Claims actualizados

Después de cambiar claims en backend, el cliente debe forzar refresh y utilizar el valor nuevo.

### AUTH-017 — Rules sin claim autorizado

Usuario Firebase autenticado sin `authorized: true`. Firestore y Storage protegidos deben rechazar acceso.

### AUTH-018 — Rules con claim autorizado

Usuario con claim autorizado puede ejecutar únicamente las operaciones permitidas por rol y propiedad.

### AUTH-019 — Reconciliación de claims durante bootstrap

Usuario activo cuyo token contiene claims ausentes o desactualizados. El bootstrap debe escribir los valores canónicos y el cliente debe obtenerlos después del refresh.

## Errores

### AUTH-020 — Popup cancelado

Debe mostrar un mensaje de cancelación y permitir reintentar.

### AUTH-021 — Popup bloqueado

Debe informar que el navegador bloqueó la ventana.

### AUTH-022 — Error de conexión

Debe salir del loading, mostrar error funcional y permitir reintentar.

### AUTH-023 — Callable no disponible

Firebase Auth válido pero bootstrap falla. No debe considerar al usuario autorizado.

## UI y accesibilidad

### AUTH-024 — Loading

Durante autenticación, el botón debe estar deshabilitado y exponer `aria-busy`.

### AUTH-025 — Teclado y foco

El botón, la alerta, el destino autenticado y logout deben ser operables y comprensibles con teclado y lector de pantalla. La accesibilidad del contenido funcional se completa en las pruebas de cada módulo.

### AUTH-026 — Responsive

Login, shell y destino autenticado funcionales a 320 px, tableta y escritorio, sin desplazamiento horizontal.

### AUTH-027 — Movimiento reducido

Con `prefers-reduced-motion`, las animaciones decorativas deben desactivarse o reducirse.

### AUTH-028 — Almacenamiento local

No deben guardarse tokens, perfil sensible o secretos manualmente en Local Storage.

### AUTH-029 — Identidad conservada en Dashboard

`/dashboard` debe conservar nombre, correo y rol autenticados dentro del Dashboard funcional y no duplicar el logout del shell. Los KPI, próximos eventos y actividad se validan mediante `modulo-dashboard/pruebas.md`.
