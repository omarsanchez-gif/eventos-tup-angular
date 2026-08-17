# Spec del sistema de diseño

## Objetivo

Crear desde cero una interfaz administrativa universitaria para Angular, manteniendo identidad institucional y equivalencia funcional sin copiar literalmente Vue.

## Base técnica

- Angular Material y CDK.
- Tema institucional propio.
- SCSS y CSS Custom Properties.
- Componentes wrapper para variantes del sistema.
- Sin TailwindCSS inicialmente.

## Principios

- Diseño limpio, académico y profesional.
- WCAG 2.2 AA.
- Jerarquía clara.
- Responsive desktop-first y funcional desde 320 px.
- Formularios comprensibles y tablas legibles.
- Movimiento limitado y respeto a `prefers-reduced-motion`.
- Estados visibles de carga, vacío, error y éxito.

## Tokens de color iniciales

```text
--color-primary-700: #252a86
--color-primary-800: #271e5d
--color-neutral-500: #888887
--color-background:  #f8f9fb
--color-surface:     #ffffff
--color-text:        #101828
--color-text-muted:  #667085
--color-border:      #dfe3ea
--color-error:       #b3261e
--color-success:     #18794e
--color-warning:     #9a6700
--color-info:        #175cd3
```

Los tonos adicionales se derivarán conservando contraste AA. No se usarán colores arbitrarios dentro de componentes.

## Tipografía

- Interfaz y datos: familia sans-serif institucional o fallback de sistema.
- Títulos de Login: se permite una familia serif académica aprobada y licenciada.
- Tamaño base: 16 px.
- Texto auxiliar mínimo: 12 px solo cuando conserve legibilidad.
- Altura de línea de texto corrido: 1.5 o superior.

La familia final queda pendiente de aprobación de identidad; no bloquea estructura ni pruebas.

## Espaciado y forma

```text
Espaciado: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px
Radio pequeño: 8 px
Radio medio: 12 px
Radio grande: 20 px
Altura mínima de control principal: 44 px
Ancho máximo de contenido administrativo: 1280 px
```

## Elevación

- Nivel 0: sin sombra.
- Nivel 1: tarjetas y tablas.
- Nivel 2: topbar sticky y menús.
- Nivel 3: diálogos y overlays.

Las sombras serán suaves; no sustituirán bordes o contraste.

## Componentes requeridos

- Botones primario, secundario, texto, peligro e icono.
- Campos de texto, fecha, hora, número, select y textarea.
- Carga de PDF.
- Alertas, snackbars y validaciones inline.
- Diálogos y confirmaciones.
- Tabla, paginación y búsqueda.
- Badges de rol y estado.
- KPI cards.
- Sidebar, topbar y shell.
- Skeleton o indicador de carga.
- Estados vacíos y de error.

## Estados de controles

Cada control interactivo debe definir:

- Default.
- Hover.
- Focus visible.
- Active.
- Disabled.
- Loading cuando corresponda.
- Error cuando corresponda.

## Wireframe de Login — escritorio

```text
┌──────────────────────────────────────┬──────────────────────────────┐
│                                      │                              │
│  [Logo institucional]                │      ACCESO SEGURO           │
│                                      │      Iniciar sesión          │
│  Sistema de Eventos TUP              │                              │
│                                      │      Texto de orientación    │
│  Descripción institucional breve     │                              │
│                                      │      [Alerta, si existe]     │
│                                      │                              │
│                                      │      [ Google  Iniciar ]     │
│                                      │                              │
│                                      │      Solo autorizados        │
└──────────────────────────────────────┴──────────────────────────────┘
```

## Wireframe de Login — móvil

```text
┌─────────────────────────────┐
│      [Logo institucional]   │
│   Sistema de Eventos TUP    │
│   Descripción breve         │
├─────────────────────────────┤
│   ACCESO SEGURO             │
│   Iniciar sesión            │
│   [Alerta, si existe]       │
│   [ Google  Iniciar ]       │
│   Solo autorizados          │
└─────────────────────────────┘
```

## Comportamiento del Login

- En escritorio se usan dos columnas equilibradas.
- En móvil la identidad aparece antes del formulario.
- El botón Google ocupa todo el ancho disponible del formulario.
- Durante loading se deshabilita y expone `aria-busy`.
- La alerta aparece antes del botón y anuncia el error.
- La decoración no puede competir con el contenido.
- El formulario mantiene ancho legible, aproximadamente 420–460 px en escritorio.

## Wireframe del shell administrativo — escritorio

```text
┌──────────────────┬──────────────────────────────────────────────────┐
│ [TUP] SISTEMA    │ [Menú]                              [Iniciales] │
│       DE EVENTOS │──────────────────────────────────────────────────│
│                  │                                                  │
│ [■] Dashboard    │  CONTENIDO DE LA RUTA                            │
│ [ ] Eventos      │  Superficie institucional                        │
│     Próximamente │                                                  │
│ [ ] Usuarios*    │                                                  │
│     Próximamente │                                                  │
│                  │                                                  │
│ Cerrar sesión    │                                                  │
│ [Avatar] Perfil  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
* Solo admin. Eventos y Usuarios permanecen deshabilitados en el incremento actual.
```

## Wireframe del shell administrativo — móvil

```text
┌─────────────────────────────────┐
│ [Menú]  Sistema de Eventos [OS] │
├─────────────────────────────────┤
│                                 │
│  CONTENIDO DE LA RUTA           │
│                                 │
└─────────────────────────────────┘

Menú abierto:
┌──────────────────────┬──────────┐
│ [TUP] SISTEMA        │ overlay  │
│ [×]                  │          │
│ Dashboard            │          │
│ Eventos Próximamente │          │
│ Usuarios* Próximamente│         │
│ Cerrar sesión        │          │
│ Perfil               │          │
└──────────────────────┴──────────┘
```

## Comportamiento del shell

- El morado institucional concentra navegación y marca; el contenido usa fondo neutro y superficies blancas.
- La topbar no agrega buscador, notificaciones ni menú de avatar mientras no exista spec.
- El sidebar se oculta por completo en escritorio y funciona como drawer superpuesto debajo de 960 px.
- El área principal mantiene máximo 1280 px, padding fluido y un encabezado de página legible.
- Iconografía de navegación: SVG lineal coherente, tamaño 20–22 px y texto siempre visible.
- El estado activo combina superficie clara, peso tipográfico e indicador lateral; no depende solo del color.

## Restricciones

- No glassmorphism excesivo.
- No neones.
- No apariencia de landing page de startup.
- No animaciones sin función.
- No mezclar familias de iconos.
- No agregar menús, campos o acciones fuera de specs.
- No depender de estilos internos frágiles de Material.

## Aceptación del diseño

Antes de implementar una nueva pantalla se aprobarán su wireframe, estados, responsive y contenido. La aceptación visual no puede eliminar requisitos funcionales o accesibles.
