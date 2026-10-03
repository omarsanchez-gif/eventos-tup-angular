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
--color-success-border:    #a8ddbd
--color-warning:           #9a6700
--color-warning-soft:      #fff7d6
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

### Contrato visual canónico

`src/styles.scss` es la única fuente de verdad ejecutable para controles compartidos. Todos los módulos existentes y futuros deben consumir exactamente estas variantes:

| Variante               | Uso                                                        | Color y superficie canónicos                                                                                 |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.button--primary`     | Alta, guardar o confirmar una acción positiva principal    | `--color-primary-700` con texto blanco; hover `--color-primary-800`                                          |
| `.button--secondary`   | Cancelar, limpiar, volver o acción auxiliar                | `--color-surface`, borde `--color-control-border`, texto `--color-primary-700`; hover `--color-primary-soft` |
| `.button--danger`      | Confirmar eliminación, suspensión o reducción destructiva  | Fondo y borde `--color-error`, texto blanco; hover `--color-error-hover`                                     |
| `.icon-button`         | Editar, consultar, paginar o cambiar estado no destructivo | `--color-surface`, borde `--color-border`, icono `--color-primary-700`; hover `--color-primary-soft`         |
| `.icon-button--danger` | Eliminar desde una fila o tarjeta                          | `--color-error-soft`, borde `--color-error-border`, icono `--color-error`                                    |

Reglas normativas:

- Altura y ancho táctil mínimo: `--control-height`, actualmente 44 px.
- Radio: `--radius-small`, actualmente 8 px. Un módulo no convierte localmente las acciones equivalentes en círculos.
- Tipografía: `--font-family-ui`, `--font-size-body-small` y `--font-weight-semibold`.
- Foco visible: contorno global basado en `--color-info`; no se sustituye por un morado local.
- Disabled: opacidad global de 0.52 y sin sombra; conserva `aria-label` y explicación cuando existe una restricción.
- Los colores de marca, estados, bordes, texto, superficies, controles y foco se consumen mediante Custom Properties. No se agregan valores hexadecimales locales cuando ya existe un token semántico.
- Las hojas encapsuladas pueden definir distribución como `gap`, alineación, ancho responsive o posición del tooltip, pero no pueden declarar `.button`, `.button--primary`, `.button--secondary`, `.button--danger`, `.icon-button`, `.icon-button--danger` ni sus estados visuales.

### Primitivas administrativas compartidas

La misma regla de fuente única aplica a:

- encabezados de página, `eyebrow`, títulos y texto auxiliar;
- paneles, bordes, radios y elevación;
- campos, selects, checkboxes y foco;
- tablas, encabezados, paginación y tarjetas móviles;
- badges de estado;
- alertas de error y éxito;
- diálogos, overlays, tooltips, spinners y estados vacíos.

Una diferencia de contenido o distribución entre módulos no autoriza una variante nueva de color, tamaño, tipografía, radio o interacción. Toda variante nueva debe incorporarse primero a este documento y a los tokens/primitivas globales.

### Composición estándar de módulos administrativos

Las vistas de catálogo y operación conservan este orden visual cuando el bloque aplica:

1. encabezado de página dentro de `panel`, con `eyebrow`, título, ayuda y acción primaria;
2. alertas de error o éxito fuera de los paneles, inmediatamente después del encabezado;
3. panel de controles para búsqueda, filtros o cambio de vista;
4. panel de listado con encabezado, estado de carga/vacío/error, tabla de escritorio, tarjetas móviles y paginación;
5. diálogos de captura, consulta o confirmación al final del árbol de la vista.

`Eventos` puede combinar el cambio `Listado`/`Calendario` con la búsqueda en su panel de controles, porque es una extensión funcional definida, pero no crea variantes visuales de panel, alerta, tabla, tooltip o acciones. El encabezado del listado usa separación de 16 px y relleno de 20 px, igual que los demás catálogos. Las acciones de escritorio usan iconos del sistema compartido y tooltip visible con puntero o foco; en móvil usan botones con texto dentro de `card-actions`. Todos los encabezados de tabla declaran `scope="col"`.

### Auditoría de conformidad — 21 de agosto de 2026

| Superficie        | Estado verificado               | Hallazgo                                                                                  |
| ----------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/styles.scss` | Canónica                        | Contiene tokens y primitivas globales aprobadas.                                          |
| Usuarios          | Conforme en botones compartidos | Consume las clases globales y conserva estilos encapsulados de distribución.              |
| Coordinaciones    | Conforme en botones compartidos | Consume las clases globales y conserva estilos encapsulados de distribución.              |
| Campus            | Conforme en código local        | Consume botones, icon-buttons y tokens globales; conserva únicamente distribución propia. |
| Equipos           | Conforme en código local        | Consume las mismas primitivas globales que los demás catálogos.                           |

La corrección retiró las redefiniciones detectadas y agregó `npm run lint:visual`, integrado en `npm run lint`, para impedir que un módulo vuelva a declarar botones/icon-buttons o use la paleta institucional anterior. El Hosting vigente de staging incorpora estas primitivas; la aceptación visual autenticada y responsive continúa pendiente.

### Verificación obligatoria de normalización

Una corrección visual transversal debe demostrar:

1. Ausencia de redefiniciones locales de los selectores compartidos prohibidos.
2. Uso de tokens semánticos para marca, estados, superficies, bordes y foco.
3. Igualdad de altura, radio, tipografía, iconografía y estados para acciones equivalentes.
4. Comparación autenticada de Dashboard, Eventos, Usuarios, Coordinaciones, Campus y Equipos en escritorio, tableta y 320 px.
5. Recorrido por teclado de hover/focus, disabled, loading, error, éxito y diálogos.
6. Pruebas Angular, lint, formato y build aprobados antes de cualquier despliegue de la corrección.
7. `npm run lint:visual` aprobado como guardia obligatoria de todos los módulos.

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
│ [ ] Coordinac.*  │                                                  │
│ [ ] Campus*       │                                                  │
│ [ ] Equipos*      │                                                  │
│ [ ] Usuarios*    │                                                  │
│                  │                                                  │
│ Cerrar sesión    │                                                  │
│ [Avatar] Perfil  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
* Solo admin. Campus, Coordinaciones, Equipos y Usuarios están habilitados para `admin`; Dashboard y Eventos están habilitados para ambos roles autorizados.
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
│ Eventos              │          │
│ Coordinaciones*      │          │
│ Campus*              │          │
│ Equipos*             │          │
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

## Wireframe de Dashboard — escritorio

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PANEL INSTITUCIONAL  Bienvenido, Omar                               │
│ Resumen operativo actualizado con datos del sistema                 │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ Eventos      │ Próximos 30d │ Usuarios     │ Con protocolo          │
│     42       │      6       │      3       │       39                │
├────────────────────────────────────┬─────────────────────────────────┤
│ Próximos eventos                   │ Actividad reciente              │
│ Evento │ Fecha │ Responsable │ ... │ Actualización · Evento · fecha │
└────────────────────────────────────┴─────────────────────────────────┘
```

- Las cuatro KPI cards usan la misma superficie, borde, radio y elevación; el color puede diferenciar el icono, pero el significado permanece en etiqueta y valor.
- Los valores usan números tabulares y nunca muestran `0` mientras cargan. Una sección no disponible muestra `—` y texto de advertencia.
- Próximos eventos ocupa el área principal; Actividad reciente usa una lista semántica. Ambas superficies conservan encabezado, estado vacío y separación coherentes con los módulos.
- Debajo de 900 px las dos superficies se apilan. Debajo de 720 px los KPI forman una cuadrícula de dos columnas y la tabla cambia a tarjetas; a 320 px los KPI usan una columna si el contenido lo requiere.
- No se agregan gráficas, porcentajes, tendencias decorativas, enlaces o acciones no definidos por la spec.

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

## Apartado de Equipos en Eventos

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
- Este apartado está implementado conforme a `modulo-equipos/reservaciones.md` y `modulo-eventos/spec.md`; la disponibilidad visible no sustituye la revalidación transaccional final.

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

## Wireframe de Eventos — listado y calendario

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ GESTIÓN INSTITUCIONAL  Eventos                         [Nuevo evento]   │
│ Los eventos requieren cinco fechas naturales de anticipación.           │
├──────────────────────────────────────────────────────────────────────────┤
│ [Listado] [Calendario]   Campus [Todos ▾]   Estado [Todos ▾]            │
├──────────────────────────────────────────────────────────────────────────┤
│ [‹] [Hoy] [›]          SEPTIEMBRE 2026        [Mes] [Semana] [Día] [Lista]│
│ lun        mar        mié        jue        vie        sáb        dom    │
│ 14         15         16         17         18         19         20     │
│            Congreso TUP · Programado                                    │
│            ───────────────────────────                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

- FullCalendar Standard vive dentro del módulo y la ruta lazy de Eventos; no crea un módulo administrativo separado.
- Escritorio inicia en mes. En 320 px se prioriza lista y se conserva un control explícito para cambiar de vista.
- Seleccionar un evento abre el detalle. El calendario no crea por selección, no arrastra, no redimensiona y no cambia campus.
- `Programado`, `En ejecución`, `Finalizado` y `Cancelado` usan texto visible y tokens semánticos; nunca dependen solo del color.
- El nombre accesible incluye evento, intervalo, campus y estado. Todos los eventos interactivos se recorren por teclado.
- Navegación de rango conserva foco predecible y anuncia carga, vacío, error y periodo mostrado.
- Un evento de varios días se muestra como un bloque continuo, incluidas noches; la información de equipo permanece separada.
- La vista consume Firestore por intervalo visible y no representa Google Calendar como fuente de verdad.
- En mes, los eventos se presentan como bloques compactos con nombre y estado; no se usa la variante de punto para el catálogo institucional. Un intervalo de varias fechas cubre visualmente cada día ocupado y usa la fecha posterior a `fechaFin` únicamente como final exclusivo de FullCalendar.
- FullCalendar 7 consume sus hojas `skeleton`, `theme` y `palette`, y se personaliza solo mediante variables del tema, propiedades públicas de evento y selectores semánticos propios `calendar-event*`; quedan prohibidos los selectores internos `fc-*` de versiones anteriores. El popover de acumulación limita su altura al viewport, permite desplazamiento y conserva bloques separados por estado.
- La cuadrícula usa borde semántico, encabezados sutiles, día actual destacado, filas limitadas con enlace “más” y botones coherentes con los controles administrativos. Una leyenda con texto identifica los cuatro estados sin depender solo del color.
- En semana, día y lista se conserva acceso al detalle y al intervalo horario canónico. La proyección de ocupación visual nunca modifica las fechas ni horas almacenadas.
- En el listado de escritorio, `Acciones` usa ojo para consultar, lápiz para editar y papelera para cancelar; todos consumen `icon-button`, tienen tooltip, nombre accesible y el mismo tamaño. Editar y cancelar solo se renderizan para el creador de un evento no cancelado.
- En tarjetas móviles se conservan las mismas acciones mediante botones con texto; no se obliga al creador a abrir el detalle para editar o cancelar.
- La columna operativa `Integración` y sus estados Calendar/correo se renderizan únicamente para `admin`. Un perfil `usuario` no recibe una columna vacía ni contenido oculto por CSS.

## Reglas visuales del formulario de Eventos

- Fecha y hora muestran ayuda persistente sobre cinco fechas naturales, máximo seis fechas operativas y prohibición de domingo.
- El estado temporal es de solo lectura; no se presenta como select editable.
- Después del límite, campos y cantidades restringidos se deshabilitan con explicación accesible, pero backend conserva la autoridad.
- Correcciones permitidas, reducción de equipos y cancelación continúan disponibles conforme a la spec.
- El detalle separa claramente estado del evento, integración Calendar, correo, cobertura de Sistemas y logística de equipos.
- La acción destructiva se denomina “Cancelar evento”, explica que conserva un registro histórico y requiere confirmación; no usa “Eliminar” para el flujo nuevo.

## Correos transaccionales de Eventos

- Ancho máximo de contenido: 600 px, fondo general `#f8f9fb`, superficie blanca, borde `#dfe3ea` y tipografía de sistema segura para clientes de correo.
- Encabezado con `#252a86`, texto blanco y la identidad textual “Sistema de Eventos TUP”; la plantilla no depende de un logotipo o fuente remota para ser reconocible.
- `Confirmación`, `Actualización`, `Retiro de coordinación`, `Cancelación` y `Aviso logístico` se muestran como texto además de usar colores semánticos.
- El nombre del evento encabeza el contenido. Los datos principales se presentan como pares etiqueta/valor; coordinaciones, equipos, observaciones y cambios se muestran solo cuando existan.
- Cancelación usa la paleta de error; logística usa advertencia; confirmación usa éxito; actualización conserva el primario institucional. El contraste debe permanecer legible aunque el cliente altere colores.
- Todo estilo es inline y compatible con Gmail; se usan tablas de presentación para la estructura, sin scripts, formularios, animaciones, hojas externas, imágenes remotas o píxeles de seguimiento.
- En móvil, el contenido usa el ancho disponible, tipografía mínima de 16 px para cuerpo y espaciado táctil, aunque no contiene acciones interactivas.
- Cada correo tiene alternativa de texto plano con el mismo significado y un pie que identifica el envío automático y remite a la persona responsable para solicitar cambios.

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
