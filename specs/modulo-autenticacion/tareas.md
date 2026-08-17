# Tareas: Autenticación

## Preparación

- [ ] AUTH-T01 Crear la base Angular conforme a `arquitectura.md`.
- [ ] AUTH-T02 Activar TypeScript estricto, lint, formato y pruebas.
- [ ] AUTH-T03 Configurar ambientes local y staging sin secretos.
- [ ] AUTH-T04 Configurar conexión explícita a Emulator Suite en local.
- [ ] AUTH-T05 Integrar tokens mínimos del design system para Login y vista temporal.

## Firebase frontend

- [ ] AUTH-T06 Crear inicialización única del Firebase Web SDK modular.
- [ ] AUTH-T07 Crear adaptador inyectable de Firebase Authentication.
- [ ] AUTH-T08 Crear adaptador inyectable de Cloud Functions.
- [ ] AUTH-T09 Configurar `GoogleAuthProvider` y popup.
- [ ] AUTH-T10 Implementar observador de sesión.

## Autorización backend

- [ ] AUTH-T11 Implementar y validar el contrato `bootstrapAuthorization` definido en `spec.md`.
- [ ] AUTH-T12 Validar `request.auth` y correo verificado.
- [ ] AUTH-T13 Validar dominio institucional en backend.
- [ ] AUTH-T14 Consultar `usuarios` por correo normalizado y exigir un único resultado.
- [ ] AUTH-T15 Rechazar usuario inexistente o inactivo.
- [ ] AUTH-T16 Asociar UID cuando sea `null`.
- [ ] AUTH-T17 Rechazar y registrar conflicto cuando exista otro UID.
- [ ] AUTH-T18 Validar que el rol sea `admin` o `usuario`.
- [ ] AUTH-T19 Actualizar `ultimoAcceso` con fecha de servidor.
- [ ] AUTH-T20 Sincronizar claims `authorized` y `role` mediante Admin SDK.
- [ ] AUTH-T21 Forzar refresh del ID token después del bootstrap.

## Estado Angular

- [ ] AUTH-T22 Crear modelo de usuario autorizado.
- [ ] AUTH-T23 Crear facade o servicio de estado con Signals.
- [ ] AUTH-T24 Exponer `user`, `loading`, `initialized`, `error`, `authorized`, `role` e `isAuthenticated`.
- [ ] AUTH-T25 Evitar inicialización duplicada de sesión.
- [ ] AUTH-T26 Limpiar estado durante logout o rechazo.

## Navegación

- [ ] AUTH-T27 Crear `/login`.
- [ ] AUTH-T28 Crear guard funcional de autenticación y autorización.
- [ ] AUTH-T29 Redirigir rutas privadas a Login.
- [ ] AUTH-T30 Redirigir Login a `/dashboard` cuando la sesión sea válida.
- [ ] AUTH-T31 Crear la vista temporal `/dashboard` definida en `spec.md`.
- [ ] AUTH-T32 Implementar logout desde la vista temporal.
- [ ] AUTH-T33 Impedir recuperación de contenido privado después del logout.

## Interfaz

- [ ] AUTH-T34 Implementar wireframe de Login aprobado.
- [ ] AUTH-T35 Mostrar logo, nombre y mensaje de acceso restringido.
- [ ] AUTH-T36 Implementar botón Google con loading, disabled y `aria-busy`.
- [ ] AUTH-T37 Mapear errores Firebase y backend a mensajes funcionales.
- [ ] AUTH-T38 Mostrar nombre, correo, rol y logout en la vista temporal.
- [ ] AUTH-T39 Implementar responsive desde 320 px.
- [ ] AUTH-T40 Respetar teclado, foco y reducción de movimiento.

## Pruebas

- [ ] AUTH-T41 Crear pruebas unitarias de mapeo de errores y estado.
- [ ] AUTH-T42 Crear pruebas de integración de Login, sesión y vista temporal.
- [ ] AUTH-T43 Crear pruebas de callable con emuladores.
- [ ] AUTH-T44 Crear pruebas de Rules basadas en claims.
- [ ] AUTH-T45 Ejecutar todos los casos de `pruebas.md`.
- [ ] AUTH-T46 Validar visualmente en staging antes de producción.

## Cierre

- [ ] AUTH-T47 Actualizar matriz de trazabilidad.
- [ ] AUTH-T48 Confirmar que no se implementaron módulos fuera de alcance.
- [ ] AUTH-T49 Cumplir `definicion-terminado.md`.
