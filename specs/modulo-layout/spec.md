# Spec: Layout administrativo

## Objetivo

Proporcionar la estructura de navegación privada compartida por los módulos.

## Alcance

- Shell administrativo.
- Sidebar izquierdo.
- Topbar.
- Área de contenido con router outlet.
- Navegación por rol.
- Identidad del usuario.
- Cierre de sesión.
- Comportamiento responsive.

## Navegación

- Dashboard.
- Eventos.
- Usuarios, solo para `admin`.
- Cerrar sesión.

## Escritorio

- Sidebar visible inicialmente.
- Control para ocultarlo completamente.
- Topbar fija o sticky.
- Contenido sin desplazamiento horizontal global.

## Móvil

- Sidebar fuera de pantalla inicialmente.
- Botón de apertura.
- Overlay de cierre.
- Botón accesible de cierre.
- Cierre automático después de navegar.

## Criterios de aceptación

- La opción activa se identifica visualmente.
- `usuario` no ve Usuarios.
- `admin` sí ve Usuarios.
- Logout elimina la sesión y abre Login.
- La navegación funciona con teclado.
- El layout funciona desde 320 px de ancho.
