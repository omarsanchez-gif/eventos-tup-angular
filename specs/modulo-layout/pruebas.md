# Pruebas: Layout administrativo

## Estructura y autorización

### LAYOUT-001 — Shell privado

Una sesión autorizada que abre `/dashboard` debe ver sidebar, topbar y contenido temporal. Sin sesión, el guard debe redirigir a `/login` sin renderizar el shell.

### LAYOUT-002 — Composición de ruta

El shell debe contener el `router-outlet` y la vista temporal debe renderizarse dentro del área principal.

## Navegación por rol

### LAYOUT-003 — Rol admin

Un `admin` debe ver Dashboard, Eventos, Usuarios y Cerrar sesión. Usuarios y Eventos deben estar deshabilitadas en este incremento.

### LAYOUT-004 — Rol usuario

Un `usuario` debe ver Dashboard, Eventos y Cerrar sesión; no debe ver Usuarios.

### LAYOUT-005 — Opción activa

Dashboard debe exponer `aria-current="page"` y un estado visual distinguible sin depender solo del color.

### LAYOUT-006 — Módulos no autorizados

Activar Eventos o Usuarios no debe cambiar la URL ni crear contenido o rutas provisionales.

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
