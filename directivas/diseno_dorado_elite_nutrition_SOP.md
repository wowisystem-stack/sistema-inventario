# Sistema de Diseño y Guía de Color: Dorado Elite Nutrition

Este documento sirve como la Fuente de la Verdad para las variables de diseño y paleta de colores de Dorado Elite Nutrition.

## 🎨 Variables CSS 

Todas las variables de color deben estar declaradas en el elemento `:root` global del proyecto (ej. `index.css`, `App.css`, o `App.vue` según el framework utilizado). 

### Superficies y Fondos
| Variable CSS | Color (HEX/RGBA) | Uso |
|---|---|---|
| `--bg-primary` | `#ffffff` | Fondo principal de la aplicación. |
| `--bg-secondary` | `#f5f5f7` | Fondos secundarios (ej. áreas de contenido delimitadas). |
| `--bg-tertiary` | `#fbfbfd` | Fondos terciarios sutiles. |
| `--surface` | `#ffffff` | Superficie de tarjetas o contenedores opacos. |
| `--surface-elevated` | `rgba(255, 255, 255, 0.8)` | Superficies elevadas (usadas junto a sombras). |
| `--glass-bg` | `rgba(255, 255, 255, 0.72)` | Fondos con efecto glassmorphism (blur). |

### 🖋️ Tinta y Tipografía
| Variable CSS | Color (HEX) | Uso |
|---|---|---|
| `--ink` / `--text-primary` | `#1d1d1f` | Texto principal, títulos y botones primarios. |
| `--ink-secondary` | `#424245` | Texto secundario y subtítulos oscuros. |
| `--text-secondary` | `#6e6e73` | Texto descriptivo, labels, placeholders. |
| `--text-tertiary` | `#86868b` | Texto deshabilitado o de muy baja jerarquía. |

### 🏆 Marca (Dorado Elite Nutrition)
| Variable CSS | Color (HEX/Gradiente) | Uso |
|---|---|---|
| `--gold` / `--accent-primary` | `#b08d57` | Color de acento primario (botones principales, highlights). |
| `--gold-deep` / `--accent-secondary` | `#8a6d3d` | Tonos oscuros del acento (estados hover/active). |
| `--gold-light` | `#e8d9b5` | Fondos suaves de acento (tags, alertas sutiles). |
| `--gold-gradient` | `linear-gradient(...)` | Gradiente premium para fondos destacados o modales. |

### 🚦 Semánticos (Alertas y Estados)
| Variable CSS | Color (HEX) | Uso |
|---|---|---|
| `--success` | `#34c759` | Éxito, confirmaciones, estado "Activo". |
| `--warning` | `#ff9500` | Advertencias, estado "Pendiente". |
| `--danger` | `#ff3b30` | Errores, borrado, estado "Crítico". |

### 🔲 Bordes
| Variable CSS | Color (HEX/RGBA) | Uso |
|---|---|---|
| `--border` | `#d2d2d7` | Bordes estándar (inputs, tarjetas). |
| `--border-subtle` | `#e8e8ed` | Separadores de listas o tablas (muy sutil). |
| `--glass-border` | `rgba(0, 0, 0, 0.06)` | Bordes para elementos flotantes/glassmorphism. |

## 🛠️ Implementación

Para utilizar estos colores en cualquier componente, emplea la función `var()` nativa de CSS:
```css
/* Ejemplos de uso: */
color: var(--gold);
background-color: var(--bg-secondary);
border: 1px solid var(--border-subtle);
```
