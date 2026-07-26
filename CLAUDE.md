# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # start Vite dev server
pnpm build            # typecheck (tsc) then bundle (vite build)
pnpm preview          # preview production build locally
pnpm lint             # eslint check on src/
pnpm lint:fix         # eslint auto-fix on src/
pnpm test             # placeholder — no test runner configured yet
```

## Naming conventions

- Directories: **lowerCamelCase**
- React components & classes: **UpperCamelCase**
- Other files: **lowerCamelCase**

## Architecture

**Bear Draw** — a 2D vector drawing editor built on React 18 + PixiJS 7 + InversifyJS + Zustand + TypeScript.

Code is organized into five top-level areas:

- `common/` — IoC container, React context bridge, shared contracts & services
- `canvas/` — PixiJS rendering (stage, viewport)
- `domain/` — interaction logic (events, handlers, actions/undo), all DI-managed
- `widget/` — React UI components (properties panel, toolbar, editor)
- `store/` — Zustand state (viewport, selection, tool)
- `shapes/` — shape classes, properties, decorators, state machine

### IoC container (InversifyJS)

The container is the central wiring mechanism. All domain services and shapes resolve dependencies through it.

- `container` (in `src/common/container.ts`) is a singleton InversifyJS `Container` with `defaultScope: Singleton`. It loads all `@provide`-decorated classes via `buildProviderModule()`.
- `ContextProvider` (`src/common/context.tsx`) wraps `<App />` in `main.tsx`, making the container available to React components via `useInject<T>(token)` and `useIOCContainer()`.
- Entry point (`main.tsx`) imports `reflect-metadata` first, then renders `App` inside `ContextProvider`.

**Contract/service split**: Each domain concern defines an abstract interface and a Symbol token in `contract/`, then a concrete implementation in `service/` decorated with `@provide(SymbolToken)`. Dependencies are injected via `@inject(SymbolToken)`.

```
common/
  contract/          # ILoggerService, IocContainerService + Symbol tokens
  service/           # LoggerService, IocContainerService (concrete implementations)
domain/
  contract/          # IShapeManager, IEventManager, IActionManager, ICanvasInitService + Symbol tokens
    action/          # IAction<T>, IActionExecute, ActionTypeEnum, IActionManager
  service/           # ShapeManager, CanvasInitService, EventManager, ActionManager (concrete)
    events/          # EventManager, Handler, types, modes, handlers
    action/          # ActionManager, AbsAction, AbsActionExecute, actionExecutes/
```

Symbol token naming convention: the token exports the same name as the interface (e.g., `export const IShapeManager = Symbol('IShapeManager')`).

For injecting multiple implementations of the same interface, use `@provide(IActionExecute)` on each implementation and `@multiInject(IActionExecute)` in the consumer. (`ActionManager` currently holds a hardcoded execute list.)

### Rendering: Canvas → Viewport → Shapes

- `Stage` (`src/canvas/core/Stage.ts`) owns the PixiJS `Application` and a `Viewport` container. Shapes are added to the viewport via `stage.appendShape(container)`.
- `Viewport` (`src/canvas/core/Viewport.ts`) is a PixiJS `Container` that handles **pan** (wheel) and **zoom** (Ctrl+wheel), syncing state to `viewportStore`.
- `BaseShape` (`src/shapes/BaseShape.ts`) is the abstract base for all drawable shapes. Each shape wraps a PixiJS `Graphics` inside a `Container`. Concrete shapes: `Circle`, `Rectangle`, `Text`.
- Shapes receive a `ShapeContext` (containing `ioc: IocContainerService`) in their constructor, allowing them to resolve domain services (e.g., `IShapeManager` during state transitions).
- Shapes use **pivot-centered positioning**: container pivot and position are both set to the geometric center, so `angle` rotates around the shape center natively.

### State machine for shapes

Each shape has a `StateMachine` (`src/shapes/state/StateMachine.ts`) that enforces allowed state transitions:

```
Normal → Hover ↔ Selected → Moving | Resizing | Rotating → Selected → Normal
```

Each `AbsState` defines `allowNextStateTypes` listing valid transitions. `StateFactory` creates state instances lazily and caches them per shape in a `Map`.

### Event system: chain of responsibility

`EventManager` (`src/domain/service/events/EventManager.ts`) is an IoC-managed service (`@provide(IEventManager)`). It listens on `document` for `pointermove` (throttled ~60fps), `pointerdown` (throttled), and `pointerup`.

On each event:

1. Picks the first active `AbsEventMode` whose `enable()` returns true. `InteractionMode` activates when the active tool is `ToolType.Select`; `CreatorMode` activates otherwise.
2. Pre-computes an `EventPayload` (viewport coordinates, screen coordinates, zoom scale).
3. Iterates the mode's `Handler` list in order: **Resize → Rotate → Move → Select → Hover**. Each handler's `enable()` returns `true` to run it, and `execute()` returns `true` to continue the chain or `false` to stop (consuming the event).

Cross-handler mutable state lives in `InteractionState` (hovered shape, selected shape). Handlers also read from stores and resolve `IShapeManager` from the IoC container.

### Action system (undo/redo)

`ActionManager` (`src/domain/service/action/ActionManager.ts`) is an IoC-managed service (`@provide(IActionManager)`). It matches incoming `AbsAction` instances to registered `AbsActionExecute` handlers by `ActionTypeEnum`. Each action carries a `data` payload; the corresponding execute handler applies it (e.g., `CreateShapeActionExecute` adds a new shape to the stage). `ActionLog` records executed actions for undo/redo support.

### Shape properties and decorators

- **Properties**: `BaseShape` holds `AbsProperty` instances keyed by `ShapePropertyEnum` (Base, Fill, Stroke). Each property has a `draw()` method called when values change. `BaseProperty.draw()` handles position/rotation/geometry re-rendering. Located in `src/shapes/property/`.
- **Decorators**: Visual overlays (HoverBorder, SelectedBorder) keyed by `ShapeDecorateTypeEnum`, shown/hidden by state `onActivate`/`onDeactivate` hooks. Located in `src/shapes/decorate/`.

### State management (Zustand)

- `viewportStore` — pan offset (x, y) and zoom scale
- `selectionStore` — currently selected shape ID, consumed by the properties panel
- `toolStore` — currently active tool (`ToolType` enum: Select, Pen, Eraser, Rect, Circle, Line, Arrow, Text), controls which event mode is active

### Coordinate systems

Screen coordinates (`e.pageX/Y` or `e.clientX/Y`) are converted to viewport coordinates via `transformCanvasCoordinateToViewport()` for hit-testing. Shape-local coordinates use `container.toLocal()` for rotation-aware hit detection.

### Key module paths (with `@/` alias → `src/`)

| Concern              | Path                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| IoC container        | `@/common/container.ts`, `context.tsx`                                                        |
| Common contracts     | `@/common/contract/`                                                                          |
| Common services      | `@/common/service/`                                                                           |
| PixiJS setup         | `@/canvas/core/Stage.ts`, `Viewport.ts`                                                       |
| Shapes               | `@/shapes/BaseShape.ts`, `Circle.ts`, `Rectangle.ts`, `Text.ts`                               |
| Shape properties     | `@/shapes/property/AbsProperty.ts`, `BaseProperty.ts`, `FillProperty.ts`, `StrokeProperty.ts` |
| Shape decorators     | `@/shapes/decorate/AbsDecorate.ts`, `HoverBorder.ts`, `SelectedBorder.ts`                     |
| Shape contracts      | `@/shapes/contract/`                                                                          |
| State machine        | `@/shapes/state/`                                                                             |
| React canvas UI      | `@/canvas/components/editorCanvas/index.tsx`                                                  |
| Domain contracts     | `@/domain/contract/`                                                                          |
| Domain services      | `@/domain/service/`                                                                           |
| Event dispatch       | `@/domain/service/events/EventManager.ts`                                                     |
| Event types          | `@/domain/service/events/types.ts`                                                            |
| Handler base         | `@/domain/service/events/Handler.ts`                                                          |
| Handlers             | `@/domain/service/events/modes/interaction/handlers/`, `modes/creator/handlers/`              |
| Action system        | `@/domain/service/action/ActionManager.ts`, `AbsAction.ts`, `AbsActionExecute.ts`             |
| Action contracts     | `@/domain/contract/action/`                                                                   |
| React widgets        | `@/widget/property/index.tsx`, `@/widget/toolbar/index.tsx`                                   |
| Stores               | `@/store/viewport.ts`, `selection.ts`, `tool.ts`                                              |
| Types                | `@/types/shape.ts`, `geometry.d.ts`                                                           |
| Utils                | `@/utils/decorate.ts`, `geometry.ts`, `viewport.ts`, `log.ts`                                 |

### Code style

- Prettier: 100 print width, 2-space indent with tabs, single quotes, trailing commas.
- Decorator pattern for throttling: `@throttle<T>(ms)` — defined in `src/domain/service/events/EventManager.ts` (was `src/utils/decorate.ts`), used on `EventManager` pointer handlers to cap event frequency.
- TypeScript decorators enabled (`experimentalDecorators: true`, `emitDecoratorMetadata: true`) for InversifyJS `@provide` / `@inject`.
