# Seguridad

## Modelo de autorización

Firestore es la fuente canónica de usuarios, roles y estado. Los ID tokens reflejan únicamente:

```text
authorized: boolean
role: "admin" | "usuario" | null
```

La sincronización se realizará exclusivamente mediante Admin SDK conforme a `decisiones/ADR-001-autorizacion-firebase.md`.

## Requisitos generales

- SEC-001: Toda operación protegida exige Firebase Authentication.
- SEC-002: Toda operación protegida exige claim `authorized == true`.
- SEC-003: Operaciones administrativas exigen `role == "admin"`.
- SEC-004: Los guards Angular no sustituyen Rules ni Functions.
- SEC-005: Claims nunca se aceptan desde datos enviados por el cliente.
- SEC-006: Los cambios de rol o estado sincronizan claims.
- SEC-007: Al desactivar, eliminar o reducir el rol de `admin` a `usuario` se revocan refresh tokens cuando existe UID.
- SEC-008: Rules se prueban con Emulator Suite.
- SEC-009: No se almacenan secretos o tokens manualmente en Local Storage.
- SEC-010: Errores técnicos no se muestran al usuario.

## Autenticación

- SEC-AUTH-001: La Function de bootstrap obtiene identidad desde `request.auth`.
- SEC-AUTH-002: Correo debe estar verificado y pertenecer al dominio configurado.
- SEC-AUTH-003: Debe existir exactamente un documento autorizado para el correo.
- SEC-AUTH-004: `activo` debe ser `true` y el rol válido.
- SEC-AUTH-005: Un UID vacío puede asociarse; un UID diferente no se sobrescribe.
- SEC-AUTH-006: Después de actualizar claims el cliente fuerza refresh del token.

## Usuarios

- SEC-USR-001: Solo `admin` lista, crea, edita, activa, desactiva o elimina usuarios.
- SEC-USR-002: El backend valida rol en cada operación.
- SEC-USR-003: No se permite eliminar, desactivar o degradar el rol del propio registro.
- SEC-USR-004: Desactivar o cambiar rol sincroniza claims.
- SEC-USR-005: La colección no tendrá escrituras administrativas abiertas a cualquier autenticado.
- SEC-USR-006: El correo de un documento con UID asociado no se modifica desde Usuarios.
- SEC-USR-007: Una mutación debe conservar al menos un documento activo con rol `admin`.
- SEC-USR-008: Las mutaciones son idempotentes, escriben un estado objetivo y fallan de forma cerrada; una inconsistencia devuelve `reconciliation-required` y nunca éxito.
- SEC-USR-009: Cada callable administrativa revalida el perfil canónico del solicitante, además de sus claims.
- SEC-USR-010: La lista administrativa se limita a 500 documentos; superar el límite produce un error funcional y nunca una respuesta truncada.
- SEC-USR-011: La revocación impide renovar la sesión, pero el ID token emitido puede permanecer válido hasta una hora; esta ventana se acepta en la migración inicial y debe mostrarse en la documentación operativa.

## Eventos

- SEC-EVT-001: Solo usuarios autorizados pueden leer y crear eventos.
- SEC-EVT-002: Solo el creador puede editar o eliminar su evento.
- SEC-EVT-003: La eliminación directa desde cliente permanece bloqueada.
- SEC-EVT-004: Functions de integración y eliminación validan claim autorizado y propiedad.

## Storage

- SEC-STO-001: Solo usuarios autorizados pueden leer o cargar protocolos.
- SEC-STO-002: Ruta válida: `eventos/{year}/{fileName}`.
- SEC-STO-003: Solo `application/pdf` menor a 10 MiB.
- SEC-STO-004: Eliminación directa desde cliente bloqueada.
- SEC-STO-005: La Function de eliminación valida propiedad antes de usar Admin SDK.

## Criterio de aceptación

Una sesión Firebase sin claim autorizado no obtiene acceso a Firestore o Storage protegidos. Un usuario autorizado solo puede ejecutar las operaciones correspondientes a su rol y propiedad.
