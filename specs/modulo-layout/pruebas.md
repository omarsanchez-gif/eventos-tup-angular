# Pruebas: Layout administrativo

## Estructura y autorización

### LAYOUT-001 — Shell privado

Una sesión autorizada que abre `/dashboard` debe ver sidebar, topbar y el Dashboard funcional. Sin sesión, el guard debe redirigir a `/login` sin renderizar el shell.

### LAYOUT-002 — Composición de ruta

El shell debe contener el `router-outlet` y renderizar dentro del área principal cualquiera de las rutas privadas vigentes.

## Navegación por rol

### LAYOUT-003 — Rol admin

Un `admin` debe ver y poder navegar a Dashboard, Eventos, Campus, Coordinaciones, Equipos y Usuarios, además de Cerrar sesión.

### LAYOUT-004 — Rol usuario

Un `usuario` debe ver Dashboard, Eventos y Cerrar sesión; no debe ver Campus, Coordinaciones, Equipos ni Usuarios.

### LAYOUT-005 — Opción activa

Cada opción activa debe exponer `aria-current="page"` al coincidir con su ruta y un estado visual distinguible sin depender solo del color.

### LAYOUT-006 — Módulos administrativos protegidos

Las rutas Campus, Coordinaciones, Equipos y Usuarios deben exigir `adminGuard`; ocultarlas en el sidebar de `usuario` no constituye la única barrera.

## Interacción

### LAYOUT-007 — Toggle

El botón de menú debe alternar el sidebar y actualizar `aria-expanded` y su etiqueta accesible.

### LAYOUT-008 — Cierre con Escape

Con el sidebar abierto en modo superpuesto, `Escape` debe cerrarlo.

### LAYOUT-009 — Logout

Cerrar sesión debe invocar `AuthFacade.logout`, reflejar loading y dejar la redirección a Login a la facade.

## Accesibilidad y responsive

### LAYOUT-010 — Semántica

Debe existir un enlace para saltar al contenido y regiones `navigation`, `banner` y `main` con nombres comprensibles.

### LAYOUT-011 — Teclado y foco

Todos los controles activos deben ser alcanzables por teclado y mostrar foco visible. Los elementos deshabilitados no deben navegar.

### LAYOUT-012 — Ancho mínimo

A 320 px no debe existir desplazamiento horizontal global y el contenido debe conservar margen legible.

### LAYOUT-013 — Movimiento reducido

Con `prefers-reduced-motion`, la transición del sidebar debe reducirse a una duración prácticamente nula.
