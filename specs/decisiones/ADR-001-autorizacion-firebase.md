# ADR-001: Autorización Firebase

## Estado

Aceptada.

## Contexto

Los documentos de `usuarios` usan IDs automáticos y contienen el UID como campo. Firestore Rules no puede ejecutar una consulta por campo para resolver el perfil del solicitante. El producto actual controla rol y estado principalmente en el cliente, lo cual no es suficiente.

## Decisión

Firestore seguirá siendo la fuente canónica de perfil, rol y estado. Firebase Authentication Custom Claims reflejará exclusivamente:

```text
authorized: boolean
role: "admin" | "usuario" | null
```

Los claims se establecerán únicamente mediante Admin SDK en Cloud Functions. No almacenarán nombre, correo u otros datos de perfil.

## Flujo de bootstrap

1. Google autentica al usuario.
2. El cliente invoca una Function callable de resolución de acceso.
3. La Function usa el correo verificado de `request.auth`, valida dominio y consulta `usuarios` por correo normalizado.
4. Si no existe o está inactivo, establece `authorized: false`, elimina rol, revoca tokens cuando corresponda y rechaza el acceso.
5. Si existe y está activo, asocia UID si está vacío, actualiza `ultimoAcceso` y establece claims `authorized: true` y `role`.
6. El cliente fuerza la renovación del ID token.
7. El cliente obtiene perfil y continúa.

## Cambios de rol o estado

- Solo una operación backend autorizada para `admin` podrá cambiar rol o estado.
- Después de cambiar Firestore se sincronizarán claims.
- Al desactivar se establecerá `authorized: false`, se eliminará el rol y se revocarán refresh tokens.
- Si falla la sincronización, la operación se registrará como error y no se comunicará éxito total.

## Security Rules objetivo

- Lecturas y escrituras protegidas exigen `request.auth.token.authorized == true`.
- Operaciones administrativas exigen además `request.auth.token.role == "admin"`.
- Edición de eventos conserva verificación de propiedad por UID.
- Eliminación de eventos y PDFs continúa únicamente mediante Functions.

## Consecuencias

### Positivas

- No requiere migrar IDs de documentos.
- Rules puede validar autorización sin consultas por campo.
- Usuarios inactivos pueden perder acceso backend.
- Firestore sigue siendo fuente canónica.

### Costos

- Se requiere sincronización rigurosa de claims.
- Los cambios no llegan al token hasta renovarlo.
- Se requieren Functions y pruebas adicionales.

## Alternativas descartadas

- Usar UID como ID de documento: requiere migración de datos.
- Confiar solo en guards: no protege Firebase.
- Guardar todo el perfil en claims: uso incorrecto y duplicación innecesaria.
