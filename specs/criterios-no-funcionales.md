# Criterios no funcionales

## Accesibilidad

- Cumplimiento objetivo: WCAG 2.2 nivel AA.
- Navegación completa por teclado.
- Foco visible.
- Etiquetas y nombres accesibles para controles.
- Contraste mínimo conforme a AA.
- Mensajes de error asociados al campo o región correspondiente.
- Respeto a `prefers-reduced-motion`.
- No depender solo de color para comunicar estados.
- La vista calendario ofrece alternativa de lista, eventos alcanzables por teclado y nombres accesibles con fecha, horario, campus y estado.

## Compatibilidad

- Últimas dos versiones estables de Chrome, Edge y Firefox.
- Versión estable vigente de Safari.
- Ancho mínimo soportado: 320 px.
- Diseño optimizado para escritorio y funcional en móvil y tableta.

## Rendimiento

- Carga diferida de rutas funcionales.
- Evitar importar módulos completos cuando existan imports específicos.
- Presupuesto inicial de build: advertencia en 750 kB y error en 1 MB para el bundle inicial, sujeto a medición después del primer módulo.
- Objetivos en staging representativo: LCP ≤ 2.5 s, INP ≤ 200 ms y CLS ≤ 0.1.
- Imágenes optimizadas y sin recursos decorativos innecesarios.
- FullCalendar y sus vistas se cargan únicamente con la ruta lazy de Eventos; la consulta limita el rango visible y no descarga el historial completo.
- Listado y búsqueda de Eventos devuelven como máximo 25 registros; búsqueda usa un índice `array-contains` y no una carga completa.
- El worker SMTP reclama como máximo 50 trabajos por ejecución; limpieza de Storage revisa como máximo 1000 objetos y retención de notificaciones usa TTL.

## Seguridad y privacidad

- Ningún secreto en el bundle del navegador.
- No registrar tokens, credenciales, PDFs o datos personales completos en consola.
- Sesión gestionada exclusivamente por Firebase Authentication.
- Autorización backend mediante claims y reglas aprobadas.
- Dependencias con versiones soportadas y revisión de vulnerabilidades antes de publicar.

## Confiabilidad

- Mensajes diferenciados entre fallo total y operación parcialmente completada.
- Operaciones externas idempotentes o con estrategia de reintento documentada.
- Workers concurrentes usan lease de 10 minutos y hora de servidor; un lease vencido es recuperable y nunca equivale a envío confirmado.
- La aplicación no debe quedar en carga infinita.
- Todo flujo asíncrono debe contemplar éxito, error y cancelación cuando aplique.

## Localización

- Idioma de interfaz: español.
- Formato regional: `es-MX`.
- Zona horaria institucional: `America/Cancun`.
- Textos de UI centralizados para evitar variantes inconsistentes.

## Mantenibilidad

- TypeScript estricto.
- Un concepto principal por archivo.
- Componentes enfocados en presentación.
- Firebase encapsulado en servicios.
- Sin duplicar reglas de validación crítica sin una fuente común.
- Pruebas junto a la funcionalidad correspondiente.

## Control de costos en staging

- Presupuesto mensual informativo: `100 MXN`.
- Alertas: primer gasto, `50 MXN`, `80 MXN` y `100 MXN`.
- Una alerta de presupuesto no suspende Firebase ni garantiza un tope de facturación; los límites de consulta, reintentos, retención y limpieza continúan siendo obligatorios.
- Calendar, SMTP, Functions y trabajos programados deben exponer métricas suficientes para detectar bucles, reintentos anómalos o crecimiento inesperado sin registrar datos sensibles.
- Superar un lote de worker o limpieza registra `reconciliation-required`; no amplía automáticamente límites ni inicia un bucle sin control.
