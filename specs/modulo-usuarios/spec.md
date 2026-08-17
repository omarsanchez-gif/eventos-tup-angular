# Spec: Usuarios

## Estado

Especificado, pero fuera del alcance de implementación actual.

## Objetivo

Permitir a `admin` gestionar los documentos que autorizan el acceso y mantener sincronizados sus claims.

## Alcance

- Listado ordenado por nombre.
- Búsqueda por nombre o correo.
- Paginación visual.
- Crear y editar usuario.
- Activar y desactivar.
- Eliminar otro usuario.
- Mostrar rol, estado y último acceso.
- Sincronizar claims al cambiar rol o estado.

## Formulario

- Nombre.
- Correo institucional.
- Rol `admin | usuario`.
- Estado activo o inactivo.

## Validaciones

- Nombre y correo obligatorios.
- Correo normalizado, institucional y único.
- Rol válido.
- No eliminar el propio registro.

## Seguridad

- Ruta y menú exclusivos para `admin`.
- Operaciones administrativas validadas en backend.
- Firestore es fuente canónica.
- Claims se sincronizan con Admin SDK.
- Desactivar revoca sesión.
- Crear un documento no crea una cuenta Google ni Firebase Auth.

## Interfaz

- Encabezado y “Nuevo Usuario”.
- Búsqueda.
- Tabla: Nombre, Correo, Rol, Estado, Último acceso y Acciones.
- Diálogos de alta, edición y eliminación.
- Estados de carga, vacío, error y éxito.

## Criterios de aceptación

- `admin` completa operaciones autorizadas.
- `usuario` no accede ni ejecuta operaciones administrativas.
- No hay correos duplicados.
- No se elimina el usuario autenticado.
- Rol o estado actualizado se refleja en claims.
- Usuario desactivado pierde acceso después de revocación y renovación.
