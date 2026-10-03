# Tareas: Autenticación

## Preparación

- [x] AUTH-T01 Crear la base Angular conforme a `arquitectura.md`.
- [x] AUTH-T02 Activar TypeScript estricto, lint, formato y pruebas.
- [x] AUTH-T03 Configurar ambientes local y staging sin secretos.
- [x] AUTH-T04 Configurar conexión explícita a Emulator Suite en local.
- [x] AUTH-T05 Integrar tokens mínimos del design system para Login y destino autenticado.

## Firebase frontend

- [x] AUTH-T06 Crear inicialización única del Firebase Web SDK modular.
- [x] AUTH-T07 Crear adaptador inyectable de Firebase Authentication.
- [x] AUTH-T08 Crear adaptador inyectable de Cloud Functions.
- [x] AUTH-T09 Configurar `GoogleAuthProvider` y popup.
- [x] AUTH-T10 Implementar observador de sesión.

## Autorización backend

- [x] AUTH-T11 Implementar y validar el contrato `bootstrapAuthorization` definido en `spec.md`.
- [x] AUTH-T12 Validar `request.auth` y correo verificado.
- [x] AUTH-T13 Validar dominio institucional en backend.
- [x] AUTH-T14 Consultar `usuarios` por correo normalizado y exigir un único resultado.
- [x] AUTH-T15 Rechazar usuario inexistente o inactivo.
- [x] AUTH-T16 Asociar UID cuando sea `null`.
- [x] AUTH-T17 Rechazar y registrar conflicto cuando exista otro UID.
- [x] AUTH-T18 Validar que el rol sea `admin` o `usuario`.
- [x] AUTH-T19 Actualizar `ultimoAcceso` con fecha de servidor.
- [x] AUTH-T20 Sincronizar claims `authorized` y `role` mediante Admin SDK.
- [x] AUTH-T21 Forzar refresh del ID token después del bootstrap.

## Estado Angular

- [x] AUTH-T22 Crear modelo de usuario autorizado.
- [x] AUTH-T23 Crear facade o servicio de estado con Signals.
- [x] AUTH-T24 Exponer `user`, `loading`, `initialized`, `error`, `authorized`, `role` e `isAuthenticated`.
- [x] AUTH-T25 Evitar inicialización duplicada de sesión.
- [x] AUTH-T26 Limpiar estado durante logout o rechazo.

## Navegación

- [x] AUTH-T27 Crear `/login`.
- [x] AUTH-T28 Crear guard funcional de autenticación y autorización.
- [x] AUTH-T29 Redirigir rutas privadas a Login.
- [x] AUTH-T30 Redirigir Login a `/dashboard` cuando la sesión sea válida.
- [x] AUTH-T31 Integrar la redirección autenticada a `/dashboard` definida en `spec.md`.
- [x] AUTH-T32 Implementar logout y trasladar su acceso al shell administrativo compartido.
- [x] AUTH-T33 Impedir recuperación de contenido privado después del logout.

## Interfaz

- [x] AUTH-T34 Implementar wireframe de Login aprobado.
- [x] AUTH-T35 Mostrar logo, nombre y mensaje de acceso restringido.
- [x] AUTH-T36 Implementar botón Google con loading, disabled y `aria-busy`.
- [x] AUTH-T37 Mapear errores Firebase y backend a mensajes funcionales.
- [x] AUTH-T38 Exponer nombre, correo y rol al Dashboard; mantener logout en el shell.
- [x] AUTH-T39 Implementar responsive desde 320 px.
- [x] AUTH-T40 Respetar teclado, foco y reducción de movimiento.

## Pruebas

- [x] AUTH-T41 Crear pruebas unitarias de mapeo de errores y estado.
- [x] AUTH-T42 Crear pruebas de integración de Login, sesión y destino autenticado.
- [ ] AUTH-T43 Crear pruebas de callable con emuladores.
- [x] AUTH-T44 Crear pruebas de Rules basadas en claims.
- [ ] AUTH-T45 Ejecutar todos los casos de `pruebas.md`.
- [ ] AUTH-T46 Validar visualmente en staging antes de producción.

## Cierre

- [x] AUTH-T47 Actualizar matriz de trazabilidad.
- [x] AUTH-T48 Confirmar que no se implementaron módulos fuera de alcance.
- [ ] AUTH-T49 Cumplir `definicion-terminado.md`.
