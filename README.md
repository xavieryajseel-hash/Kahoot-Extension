# Kahoot Extension

Chrome extension para Kahoot que muestra respuestas correctas y permite respuesta automática.

**Creador:** [xavieryajseel-hash](https://github.com/xavieryajseel-hash)

## Instalación

1. Abre `chrome://extensions/` en tu navegador
2. Activa el **Modo desarrollador** (esquina superior derecha)
3. Haz clic en **Cargar descomprimida**
4. Selecciona la carpeta de esta extensión

## Uso

1. Entra a un juego en [kahoot.it](https://kahoot.it)
2. El panel de KaHack aparecerá en la esquina superior izquierda
3. Introduce el **Quiz ID** del Kahoot (se obtiene del enlace del quiz)
4. Activa las opciones deseadas

## Funciones

| Función | Descripción |
|---------|-------------|
| **Auto Answer** | Responde automáticamente la respuesta correcta con timing calibrado para máximos puntos |
| **Show Answers** | Resalta las respuestas correctas (verde) e incorrectas (rojo) en pantalla |
| **Points Slider** | Ajusta los puntos objetivo por pregunta (500-1000) |

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `ALT + H` | Mostrar/ocultar la interfaz |
| `ALT + W` | Responder correctamente (manual) |
| `ALT + S` | Mostrar respuestas (mientras se mantiene) |
| `Shift` | Ocultar/mostrar rápido |

## Tipos de Pregunta Soportados

- **Quiz** (opción múltiple) — selecciona el botón correcto
- **Multiple Select** — selecciona todos los correctos y envía
- **Open Ended** — escribe la respuesta en el campo de texto

## Obtener el Quiz ID

El Quiz ID se encuentra en la URL del quiz cuando lo previsualizas o editas en Kahoot:
```
https://create.kahoot.it/details/mi-quiz/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```
El UUID al final es el Quiz ID.

## Estructura

```
├── manifest.json    # Configuración de la extensión (Manifest V3)
├── content.js       # Script principal inyectado en kahoot.it
└── README.md        # Este archivo
```

## Notas Técnicas

- Usa **Manifest V3** (compatible con Chrome moderno)
- Se inyecta solo en `https://kahoot.it/*`
- Las respuestas se obtienen de la API REST de Kahoot: `/rest/kahoots/{quizId}`
- El auto-answer calibra el input lag dinámicamente para maximizar puntos
- Los botones se clickean directamente (no eventos de teclado sintéticos)

## Versión

v3.0.0
