# Spec: Autenticación

## Objetivo

Permitir acceso exclusivamente a usuarios institucionales previamente autorizados y activos, con autorización aplicable en Firebase Security Rules.

## Alcance

- Google Sign-In con Firebase Authentication.
- Validación backend de dominio, existencia, UID, estado y rol.
- Asociación de UID cuando esté vacío.
- Actualización de último acceso.
- Custom Claims mínimos de autorización.
- Renovación del ID token.
- Persistencia y recuperación de sesión.
- Cierre de sesión.
- Protección de rutas.
- Login institucional.
- Vista temporal autenticada en `/dashboard`.
- Mensajes funcionales de error.

## No incluye

- Registro público.
- Correo y contraseña.
- Recuperación de contraseña.
- MFA.
- Otros proveedores.
- Gestión visual de usuarios.
- Dashboard funcional, KPIs, actividad o próximos eventos.
- Funcionalidad propia del sidebar o topbar distinta de navegación, identidad y logout.

## Contrato `bootstrapAuthorization`

Entrada: ninguna información de identidad suministrada por el cliente. La Function obtiene UID y correo desde `request.auth`.

Salida exitosa:

```text
uid: string
nombre: string
correo: string
rol: "admin" | "usuario"
activo: true
claimsUpdated: boolean
```

Errores funcionales:

```text
unauthenticated
domain-not-allowed
user-not-authorized
user-inactive
uid-conflict
invalid-role
service-unavailable
```

## Flujo

1. Mostrar Login.
2. Autenticar con Google.
3. Invocar `bootstrapAuthorization`.
4. La Function valida correo verificado y dominio.
5. Busca un único usuario por correo normalizado.
6. Valida `activo`, rol y compatibilidad de UID.
7. Asocia UID si está vacío y actualiza `ultimoAcceso`.
8. Establece claims `authorized` y `role`.
9. El cliente fuerza refresh del token.
10. Carga perfil en estado Angular.
11. Redirige a `/dashboard`.

Si falla cualquier validación, el cliente no establecerá estado autorizado y cerrará la sesión de Firebase.

## Estado

El módulo expondrá mediante Signals:

```text
user
loading
initialized
error
authorized
role
isAuthenticated
```

## Interfaz Login

- Logo institucional.
- Nombre del sistema.
- Botón “Iniciar sesión con Google”.
- Estado de carga.
- Mensajes amigables para rechazo, cancelación y fallos.
- Contenido conforme al wireframe de `../design-system/spec.md`.

## Vista temporal autenticada

Ruta: `/dashboard`.

Propósito: comprobar autenticación, recuperación de sesión, claims, perfil y logout sin implementar el Dashboard funcional.

Contenido exclusivo:

- Mensaje “Bienvenido al Sistema de Eventos TUP”.
- Nombre del usuario.
- Correo institucional.
- Rol asignado.
- Contexto breve de sesión autorizada.

La vista se presenta dentro del shell definido por `modulo-layout`. El cierre de sesión pertenece al shell para que sea compartido por todas las rutas privadas. No debe incluir KPIs, tablas, actividad, próximos eventos ni funcionalidad de módulos fuera de alcance. Cuando `modulo-dashboard` sea autorizado, esta vista será reemplazada por su implementación funcional.

## Seguridad

- Firestore conserva rol y estado como fuente canónica.
- Claims solo contienen autorización.
- Claims se escriben exclusivamente con Admin SDK.
- El cliente no envía rol, activo o correo como autoridad.
- Un UID existente diferente se considera conflicto y no se sobrescribe.

## Criterios de aceptación

- Pasan todos los casos de `pruebas.md`.
- Usuario autorizado y activo accede con claims correctos.
- Usuario inexistente, inactivo, externo, con rol inválido o UID conflictivo no accede.
- La sesión se recupera sin mostrar contenido privado antes de autorizar.
- La vista temporal muestra únicamente los datos y contexto especificados dentro del shell administrativo.
- Logout impide volver mediante historial.
- No se exponen secretos ni errores técnicos.
