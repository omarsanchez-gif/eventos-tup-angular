# ADR-004: Librería visual

## Estado

Aceptada.

## Decisión

Utilizar Angular Material y Angular CDK como base accesible de controles, overlays, diálogos, tablas y utilidades, con un tema institucional propio.

No se utilizará un tema preconstruido como identidad final. No se incorporará TailwindCSS inicialmente.

## Estrategia

- Angular Material para primitivas y comportamiento accesible.
- Angular CDK cuando se requiera control visual adicional.
- SCSS y CSS Custom Properties para tokens institucionales.
- Componentes propios del design system para encapsular variantes.
- Material Design Icons o una biblioteca única aprobada; no mezclar familias de iconos.

## Reglas

- La UI no debe parecer una instalación Material genérica.
- Color, tipografía, densidad y forma proceden de tokens.
- Los componentes propios deben conservar teclado, foco y semántica.
- No sobrescribir estilos internos frágiles si existe una API de tema o composición.
- No agregar otra librería de componentes sin nueva ADR.

## Consecuencias

- Base sólida de accesibilidad y overlays.
- Personalización visual mediante tema y wrappers propios.
- Se debe controlar el tamaño del bundle con imports específicos.
