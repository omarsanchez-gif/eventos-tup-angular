# Spec: Layout administrativo

## Objetivo

Proporcionar la estructura privada, institucional y responsive que aparece después de autorizar la sesión, sin adelantar funcionalidad del Dashboard, Eventos o Usuarios.

## Alcance

- Shell administrativo compartido.
- Sidebar izquierdo con identidad institucional.
- Topbar con control de navegación y avatar informativo.
- Área principal con `router-outlet`.
- Identidad, rol y estado del usuario autenticado.
- Navegación visible según rol.
- Cierre de sesión.
- Comportamiento responsive y accesible.

## Fuera de alcance

- KPIs, estadísticas o actividad del Dashboard.
- Listados, búsquedas, formularios o acciones de Eventos.
- Listados, búsquedas, formularios o acciones de Usuarios.
- Menú de perfil, edición de cuenta o notificaciones.
- Rutas provisionales `/eventos` o `/usuarios` sin su módulo autorizado.

## Referencia visual

La composición toma como pauta el sistema histórico: sidebar morado a la izquierda, topbar blanca, fondo gris claro y contenido en superficies blancas. No es una copia literal; emplea los tokens institucionales de `../design-system/spec.md`, jerarquía más clara y comportamiento accesible.

## Navegación durante este incremento

| Opción        | `admin` | `usuario` | Estado actual                                   |
| ------------- | ------- | --------- | ----------------------------------------------- |
| Dashboard     | Visible | Visible   | Activa y navega a `/dashboard`                  |
| Eventos       | Visible | Visible   | Deshabilitada hasta autorizar `modulo-eventos`  |
| Usuarios      | Visible | Oculta    | Deshabilitada hasta autorizar `modulo-usuarios` |
| Cerrar sesión | Visible | Visible   | Activa                                          |

Las opciones deshabilitadas usan `disabled` y `aria-disabled="true"`, no crean rutas ni emiten navegación y muestran el texto auxiliar “Próximamente” de forma perceptible.

## Identidad

- Marca: icono TUP y texto “Sistema de Eventos TUP”.
- Perfil: iniciales derivadas del nombre, nombre, etiqueta de rol y estado “Sesión activa”.
- Etiquetas de rol: `admin` se presenta como “Administrador”; `usuario`, como “Usuario”.
- El avatar superior es informativo y no abre un menú.
- Nombre y correo nunca se guardan manualmente en Local Storage.

## Escritorio — desde 960 px

- Sidebar de 264 px visible inicialmente y fijo en el viewport.
- Topbar sticky de 72 px.
- El botón de menú oculta o vuelve a mostrar completamente el sidebar.
- El contenido ocupa el espacio restante, con ancho máximo de 1280 px y márgenes fluidos.
- El sidebar mantiene la marca arriba, la navegación en el centro y el perfil al pie.
- No existe desplazamiento horizontal global.

## Móvil y tableta — menos de 960 px

- Sidebar fuera de pantalla inicialmente y abierto como panel superpuesto.
- La apertura no modifica permanentemente el ancho del contenido.
- Un overlay cierra el panel al hacer clic.
- `Escape` cierra el panel y el foco vuelve al botón de apertura.
- Seleccionar Dashboard cierra el panel automáticamente.
- El contenido conserva al menos 16 px de margen lateral a 320 px.

## Accesibilidad

- Contiene un enlace “Saltar al contenido principal”.
- Usa `aside`, `nav`, `header` y `main` con nombres accesibles.
- El control del sidebar expone `aria-controls`, `aria-expanded` y una etiqueta dependiente del estado.
- La opción activa usa `aria-current="page"` además del tratamiento visual.
- Todos los controles activos miden al menos 44 × 44 px.
- El overlay no es el único mecanismo de cierre móvil.
- El contraste y foco visible cumplen WCAG 2.2 AA.
- La transición del panel respeta `prefers-reduced-motion`.

## Estados

- Sidebar: abierto y cerrado.
- Navegación: default, hover, focus, activa y disabled.
- Logout: default, hover, focus, loading y disabled.
- Usuario: perfil cargado; el guard impide mostrar el shell sin perfil autorizado.

## Criterios de aceptación

- El shell aparece únicamente después de una sesión autorizada.
- Dashboard se identifica visual y semánticamente como opción activa.
- `usuario` no ve Usuarios; `admin` sí la ve deshabilitada.
- Eventos permanece deshabilitada para ambos roles hasta autorizar su módulo.
- Logout limpia la sesión y abre Login.
- Sidebar y navegación funcionan con teclado y lector de pantalla.
- El layout funciona desde 320 px sin desplazamiento horizontal.
- Ningún componente del layout importa Firebase directamente.
- Pasan los casos de `pruebas.md` y las verificaciones de `definicion-terminado.md`.
