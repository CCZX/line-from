# Bear Draw

A high-performance 2D vector drawing editor built with React 18, PixiJS 7, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

## Features

- **Drawing Tools** - Rectangle, Circle, Line, Arrow, Text, Pen, Eraser
- **Selection** - Single/multi-select with marquee, resize and rotate handles
- **Real-time Editing** - Property panel for stroke, fill, and transparency
- **Undo/Redo** - Full action history with Ctrl+Z / Ctrl+Shift+Z
- **Pan & Zoom** - Smooth viewport navigation with mouse wheel

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Rendering**: PixiJS 7 (WebGL-accelerated)
- **State Management**: Zustand
- **Dependency Injection**: InversifyJS
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

### Testing

Run the unit test suite once:

```bash
pnpm test
```

Run tests in watch mode or type-check the test suite:

```bash
pnpm test:watch
pnpm test:typecheck
```

Unit tests live under `tests/unit` and share their global setup from `tests/setup.ts`.

## Project Structure

```
src/
├── canvas/          # PixiJS rendering (Stage, Viewport)
├── common/          # IoC container, React context bridge
├── domain/         # Interaction logic (events, handlers, actions)
├── shapes/         # Shape classes (Circle, Rectangle, Text, etc.)
├── store/          # Zustand state (viewport, selection, tool)
└── widget/         # React UI (toolbar, property panel)
```

## Architecture

- **Canvas**: PixiJS Application with viewport container for pan/zoom
- **Shapes**: Pivot-centered positioning with state machine (Normal → Hover → Selected)
- **Event System**: Chain of responsibility pattern (Resize → Rotate → Move → Select → Hover)
- **Action System**: Command pattern with undo/redo support

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `L` | Line tool |
| `A` | Arrow tool |
| `T` | Text tool |
| `P` | Pen tool |
| `E` | Eraser tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

## License

MIT
