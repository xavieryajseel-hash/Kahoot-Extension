# Kahoot Extension

Chrome extension para Kahoot que muestra respuestas correctas y responde automáticamente.

**Creador & Developer:** [xavieryajseel-hash](https://github.com/xavieryajseel-hash)

## Instalación

1. Abre `chrome://extensions/` en tu navegador
2. Activa el **Modo desarrollador** (esquina superior derecha)
3. Haz clic en **Cargar descomprimida**
4. Selecciona la carpeta de esta extensión

## Uso

1. Entra a un juego en [kahoot.it](https://kahoot.it)
2. El panel de **Kahoot Extension** aparecerá en la esquina superior izquierda
3. Introduce el **Quiz ID** del Kahoot (UUID del quiz)
4. Activa **Auto Answer** o **Show Answers** según necesites

## Funciones

| Función | Descripción |
|---------|-------------|
| **Auto Answer** | Selecciona automáticamente la respuesta correcta al instante |
| **Show Answers** | Resalta las respuestas correctas (verde) e incorrectas (rojo) |

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `ALT + H` | Mostrar/ocultar el panel |
| `ALT + W` | Responder correctamente (manual, una sola respuesta) |
| `ALT + S` | Mostrar respuestas (mientras se mantiene presionado) |
| `Shift` | Minimizar/maximizar panel rápidamente |

## Tipos de Pregunta Soportados

- **Quiz** (opción múltiple) — selecciona la respuesta correcta
- **Multiple Select** — selecciona todas las respuestas correctas
- **Open Ended** — escribe la respuesta en el campo de texto

## Obtener el Quiz ID

El Quiz ID (UUID) se encuentra en la URL del quiz en Kahoot:
```
https://create.kahoot.it/details/mi-quiz/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```
Copia el UUID al final para usarlo en la extensión.

## Estructura del Proyecto

```
Kahoot-Extension/
├── manifest.json    # Configuración (Manifest V3)
├── content.js       # Script principal (~700 líneas)
├── README.md        # Este archivo
└── icons/           # Iconos de la extensión (16, 32, 48, 128px)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Características Técnicas

- ✅ **Manifest V3** — Compatible con Chrome moderno
- ✅ **MAIN World Injection** — Acceso directo a handlers de React
- ✅ **Proxy Bypass** — Usa worker proxy para obtener datos de quiz
- ✅ **Instant Click** — Responde en milisegundos
- ✅ **Retry Mechanism** — Reintenta hasta 60 veces si los botones no están listos
- ✅ **Multi-Strategy Click** — React direct handler + DOM events + native click

## API

- **Endpoint Proxy:** `https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/{quizId}`
- **Original (bloqueado):** `https://kahoot.it/rest/kahoots/{quizId}`

## Versión

v3.0.0

