# Spec del sistema de diseño

## Objetivo

Crear desde cero una interfaz administrativa universitaria para Angular, manteniendo identidad institucional y equivalencia funcional sin copiar literalmente Vue.

## Base técnica

- Angular Material y CDK.
- Tema institucional propio.
- SCSS y CSS Custom Properties.
- Tokens y primitivas visuales globales en `src/styles.scss`; los estilos encapsulados controlan únicamente la distribución específica de cada vista.
- Los componentes wrapper se introducirán solo cuando una primitiva necesite comportamiento Angular compartido, no para duplicar estilos estáticos.
- Sin TailwindCSS inicialmente.

## Principios

- Diseño limpio, académico y profesional.
- WCAG 2.2 AA.
- Jerarquía clara.
- Responsive desktop-first y funcional desde 320 px.
- Formularios comprensibles y tablas legibles.
- Movimiento limitado y respeto a `prefers-reduced-motion`.
- Estados visibles de carga, vacío, error y éxito.

## Tokens de color implementados

```text
--color-primary-700:       #252a86
--color-primary-800:       #271e5d
--color-primary-soft:      #eeeef9
--color-primary-soft-hover: #e2e2f4
--color-neutral-500:       #888887
--color-background:        #f8f9fb
--color-surface:           #ffffff
--color-surface-subtle:    #f6f7f9
--color-text:              #101828
--color-text-muted:        #667085
--color-border:            #dfe3ea
--color-control-border:    #b8c0cc
--color-error:             #b3261e
--color-error-hover:       #8f1f18
--color-error-soft:        #fff2f0
--color-error-border:      #efb5b0
--color-success:           #18794e
--color-success-soft:      #ecfdf3
--color-warning:           #9a6700
--color-info:              #175cd3
```

Los valores anteriores corresponden a las Custom Properties actuales de `src/styles.scss`. Los tonos futuros se derivarán conservando contraste AA, se incorporarán primero a esta tabla y no se escribirán como colores arbitrarios dentro de componentes.

## Tipografía

- Toda la aplicación usa una sola pila sans-serif: `Inter`, `Segoe UI`, `Roboto`, `Arial`, `sans-serif`.
- No se mezclan familias serif y sans-serif entre Login, Dashboard y módulos administrativos.
- Tamaño base: 16 px.
- Texto auxiliar mínimo: 12 px solo cuando conserve legibilidad.
- Altura de línea de texto corrido: 1.5 o superior.
- Título de página: `clamp(28px, 3vw, 36px)`, peso 800 y altura de línea 1.2.
- Título de sección: 18 px, peso 700.
- Texto de botones y datos compactos: 14 px, peso 700 en acciones y 400–600 en datos.
- Eyebrow institucional: 12 px, peso 800, mayúsculas y espaciado de letras de `0.08em`.

La pila se mantiene local y no depende de descargar fuentes externas. Si posteriormente se licencia Inter institucionalmente, se podrá servir como activo propio sin cambiar métricas ni componentes.

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
- Lista dinámica de correos con agregar, validar y retirar cada entrada.
- Selector múltiple buscable de coordinaciones con chips o lista equivalente.
- Selector de campus base, clasificación fija/transferible y destinos permitidos.
- Campo numérico entero para cantidad operativa con límites y ayuda asociada.
- Estado futuro de disponibilidad suficiente, insuficiente o `requiere revisión` sin depender solo del color.
- Estado de integración parcial para Calendar y notificaciones.
- KPI cards.
- Sidebar, topbar y shell.
- Skeleton o indicador de carga.
- Estados vacíos y de error.

## Estándar transversal de botones

Todos los módulos reutilizan las clases globales `.button` e `.icon-button`; una vista no redefine color, tipografía, radio, altura o estados de estas clases.

- Altura mínima: 44 px.
- Radio: 8 px en botones con texto y botones de icono.
- Texto: 14 px, peso 700, familia global y altura de línea 1.25.
- Icono: SVG lineal de 20 × 20 px, trazo de 1.9 y color heredado.
- Primario: fondo morado institucional, texto blanco y sombra discreta; se usa para la acción principal de una vista o formulario.
- Secundario: superficie blanca, borde gris de control y texto morado; se usa para cancelar, limpiar, volver o agregar elementos auxiliares.
- Peligro: fondo rojo institucional y texto blanco; se reserva para confirmaciones destructivas o de reducción de acceso.
- Icono normal: superficie blanca, borde neutro y color morado.
- Icono peligro: fondo rojo tenue, borde rojo tenue e icono rojo; la papelera conserva esta variante.
- Hover, focus, active, disabled y loading conservan la misma jerarquía en Usuarios, Coordinaciones y módulos futuros.
- Disabled usa opacidad de 0.52, elimina sombra y mantiene nombre accesible y ayuda contextual cuando corresponda.
- Una fila de acciones no mezcla botones circulares, cuadrados o sin borde para acciones equivalentes.

Las variantes se definen en `src/styles.scss`; los estilos encapsulados de una pantalla solo pueden controlar distribución, no redefinir la identidad visual de los controles compartidos.

## Estados de controles

Cada control interactivo debe definir:

- Default.
- Hover.
- Focus visible.
- Active.
- Disabled.
- Loading cuando corresponda.
- Error cuando corresponda.

## Botones de icono y ayudas contextuales

- Los botones que no muestran texto visible usan SVG lineales coherentes con la iconografía del shell; no usan letras, emojis o caracteres tipográficos como sustituto.
- El icono de eliminación es una papelera y conserva la variante visual de peligro.
- Todo botón de icono tiene un nombre accesible y una ayuda contextual visible al posicionar el puntero o al recibir foco visible.
- La ayuda describe la acción; cuando el control está deshabilitado, también explica la restricción.
- La ayuda contextual no sustituye `aria-label`, foco visible ni el objetivo mínimo de 44 × 44 px y no debe provocar desplazamiento horizontal global.

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
│ [ ] Coordinac.*  │                                                  │
│     Próximamente │                                                  │
│ [ ] Usuarios*    │                                                  │
│                  │                                                  │
│ Cerrar sesión    │                                                  │
│ [Avatar] Perfil  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
* Solo admin. Usuarios y Coordinaciones están habilitados en código; Eventos permanece documentado y deshabilitado hasta autorizarlo.
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
│ Coordinaciones*      │          │
│   Próximamente       │          │
│ Usuarios*             │         │
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

## Wireframe de Coordinaciones — escritorio

```text
┌─────────────────────────────────────────────────────────────┐
│ CATÁLOGO INSTITUCIONAL  Coordinaciones    [Nueva coordinación] │
├─────────────────────────────────────────────────────────────┤
│ [ Buscar por coordinación o correo                         ] │
├─────────────────────────────────────────────────────────────┤
│ Coordinación │ Correos │ Estado │ Actualización │ Acciones │
│ Academia     │ 2       │ Activa │ ...           │ ...      │
│ Deportes     │ 1       │ Activa │ ...           │ ...      │
└─────────────────────────────────────────────────────────────┘
```

- La lista dinámica de correos usa un campo por dirección, no una cadena separada por comas.
- Agregar o retirar un correo mantiene orden de foco predecible y anuncia el cambio.
- La suspensión y la eliminación utilizada explican consecuencias diferentes.

## Wireframe de Campus — escritorio

```text
┌────────────────────────────────────────────────────────────────┐
│ CATÁLOGO INSTITUCIONAL  Campus                  [Nuevo campus] │
├────────────────────────────────────────────────────────────────┤
│ [ Buscar por nombre, clave o dirección                       ] │
├────────────────────────────────────────────────────────────────┤
│ CAMPUS │ DIRECCIÓN │ HORARIOS │ ESTADO │ ACTUALIZACIÓN │ ... │
│ TUP    │ Pendiente │ L–V...   │ Activo │ ...           │ ... │
└────────────────────────────────────────────────────────────────┘
```

- El formulario agrupa identidad, ubicación opcional y horarios de Sistemas.
- Cada día operativo usa checkbox, hora de inicio y hora de fin con etiquetas propias.
- Domingo se muestra como inactivo en esta versión.
- En móvil, cada campus se presenta como tarjeta con las mismas acciones y restricciones.

## Wireframe de Equipos — escritorio

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ INVENTARIO INSTITUCIONAL  Equipos                         [Nuevo equipo] │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ Buscar por equipo, campus o clasificación                              ] │
├─────────────────────────────────────────────────────────────────────────────┤
│ EQUIPO │ CAMPUS │ CANTIDAD │ TIPO │ DESTINOS │ ESTADO │ ACTUALIZACIÓN │ … │
│ Bocina │ TUP    │    2     │ Transf. │ FCS    │ Activo │ ...          │ … │
└─────────────────────────────────────────────────────────────────────────────┘
```

- El formulario agrupa identidad, inventario y traslado.
- Campus base es un selector de campus activos y cantidad operativa usa entero de 0 a 999.
- Elegir `fijo` oculta y limpia destinos; elegir `transferible` muestra selección de campus activos excluyendo el origen.
- El texto explica que destino permitido no equivale a disponibilidad para una fecha.
- Un equipo utilizado muestra la restricción histórica y deshabilita eliminación con ayuda contextual.
- En móvil cada equipo se presenta como tarjeta con nombre, campus, cantidad, clasificación, destinos, estado y las mismas acciones.

## Apartado futuro de Equipos en Eventos

```text
┌ Equipos requeridos ─────────────────────────────────────────────────────┐
│ Campus: FCS       Fecha y horario: 14/09/2026 · 12:00–14:00            │
│ [ Buscar equipo                                                        ] │
│ Bocina · origen TUP · disponible 2       Cantidad [ 1 ]                │
│ Proyector · origen FCS · disponible 1     Cantidad [ 1 ]                │
│ [!] Cobertura de Sistemas pendiente fuera del horario regular          │
└─────────────────────────────────────────────────────────────────────────┘
```

- La disponibilidad solo se muestra después de conocer campus, fecha y horario completos.
- El formulario no presenta cantidades provenientes del catálogo sanitizado como si fueran disponibilidad.
- Una solicitud insuficiente explica la cantidad requerida y la confirmable, sin hacer asignación parcial.
- `requiere revisión`, cobertura pendiente, traslado y hora de liberación se presentan como estados separados.
- Este apartado permanece sin autorización de código hasta aprobar reservaciones y Eventos.

## Apartado de Coordinaciones en Eventos

```text
┌ Coordinaciones involucradas ────────────────────────────────┐
│ Selección opcional                                          │
│ [ Buscar coordinación                                     ] │
│ [Academia ×] [Marketing ×]                                  │
│ Solo se muestran coordinaciones activas.                    │
└─────────────────────────────────────────────────────────────┘
```

- El selector muestra nombres, no correos.
- Las seleccionadas tienen nombre accesible y pueden retirarse por teclado.
- Una coordinación histórica suspendida se muestra con texto “Suspendida”; el estado no depende solo del color.
- Calendar pendiente y notificaciones pendientes se muestran como estados separados.

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
