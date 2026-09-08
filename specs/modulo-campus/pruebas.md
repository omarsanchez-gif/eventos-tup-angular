# Pruebas: Campus

## Acceso y privacidad

- CAM-001: admin abre `/campus` y ve catálogo completo.
- CAM-002: usuario normal es redirigido y no obtiene documentos completos.
- CAM-003: anónimo, sesión sin claims y usuario normal no ejecutan mutaciones.
- CAM-004: usuario autorizado obtiene catálogo seleccionable sin horarios, uso ni timestamps.
- CAM-005: Rules permiten lectura completa solo a admin y bloquean toda escritura de cliente.

## Alta y validación

- CAM-006: crea nombre y clave normalizados, opcionales como `null`, domingo inactivo y timestamps de servidor.
- CAM-007: rechaza nombre vacío o mayor de 120 caracteres.
- CAM-008: rechaza clave fuera de patrón o longitud.
- CAM-009: altas concurrentes no duplican nombre normalizado.
- CAM-010: altas concurrentes no duplican clave.
- CAM-011: dirección y referencia aceptan vacío y rechazan más de 240 caracteres.
- CAM-012: día operativo exige horas válidas y fin posterior al inicio.
- CAM-013: domingo enviado como operativo se rechaza.
- CAM-014: campus activo sin días operativos se rechaza.
- CAM-015: rechaza campos administrados o desconocidos.

## Listado y UI

- CAM-016: orden determinista por nombre y clave.
- CAM-017: búsqueda mientras se escribe no recarga ni vuelve a consultar Firebase.
- CAM-018: distingue vacío de sin coincidencias.
- CAM-019: paginación 5, 10, 15 y 20 no omite ni repite.
- CAM-020: dirección vacía muestra “Dirección pendiente”.
- CAM-021: horarios se presentan con día y texto, no solo color.

## Edición, estado y eliminación

- CAM-022: edición conserva creación, uso y estado.
- CAM-023: rechaza nombre o clave duplicados sin escritura parcial.
- CAM-024: clave de campus utilizado queda inmutable.
- CAM-025: suspensión idempotente desaparece del catálogo seleccionable.
- CAM-026: activación exige horario válido.
- CAM-027: elimina campus nunca utilizado.
- CAM-028: campus utilizado no se elimina y la UI explica la restricción.

## Accesibilidad y responsive

- CAM-029: diálogo contiene foco y lo devuelve al iniciador.
- CAM-030: acciones tienen SVG, nombre accesible y ayuda contextual.
- CAM-031: formulario y tarjetas funcionan a 320 px sin desplazamiento global.
- CAM-032: `npm run lint:visual` confirma que Campus no redefine botones/icon-buttons ni usa la paleta institucional anterior.
- CAM-033: comparación autenticada confirma igualdad de color, altura, radio, tipografía, iconos, foco y estados con los demás catálogos.

## Evidencia requerida

- Unitarias Angular y Functions.
- Firestore Emulator para unicidad, estado y eliminación.
- Security Rules para admin, usuario y anónimo.
- Lint, formato y build de staging.
- Guardia automática de normalización visual.
- Recorrido manual autenticado con TUP y FCS en staging antes de desplegar.
