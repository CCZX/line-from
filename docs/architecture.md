# 线构架构与实现不变量

本文是代码架构的共享事实来源。`README.md` 负责产品介绍和使用方式，`DESIGN.md` 负责视觉规范；
本文只记录修改代码时必须理解的模块边界、数据流和不变量。

## 运行时组成

```text
React UI
  ├─ Toolbar / Property / Editor
  └─ ContextProvider
       └─ Inversify Container
            ├─ Canvas: Stage -> Viewport -> Shape containers
            ├─ Domain: events, actions, selection, tools, snapping
            └─ Common: IoC bridge, matrix, logging
```

- `src/main.tsx` 先加载 `reflect-metadata` 和 i18n，再通过 `ContextProvider` 渲染应用。
- `src/common/container.ts` 创建默认 Singleton 的 Inversify 容器，并加载 `@provide` 注册的服务。
- `src/App.tsx` 只组合应用级 UI；画布生命周期由 `src/widget/editor/` 与 Canvas 服务负责。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/common/` | IoC 桥接、矩阵、日志及跨领域基础能力 |
| `src/canvas/` | PixiJS Stage、Viewport 和画布服务 |
| `src/domain/contract/` | 领域接口、状态类型和依赖注入 Token |
| `src/domain/service/` | 事件、Action、选择、工具、吸附、图形索引等实现 |
| `src/shape/` | 图形、属性、装饰器、状态机和几何算法 |
| `src/widget/` | React 编辑器、工具栏和属性面板 |
| `src/i18n/` | 中英文资源与初始化 |
| `tests/unit/` | 无浏览器或最小 DOM 环境下的领域与几何测试 |
| `tests/e2e/` | 浏览器中的关键用户流程与跨模块回归测试 |

## 依赖注入

领域能力遵循 Contract/Service 分离：

1. 在 `src/domain/contract/` 定义接口及同名 Symbol Token。
2. 在 `src/domain/service/` 实现接口，并使用 `@provide(Token)` 注册。
3. 消费方使用 `@inject(Token)`；同一 Token 的多实现使用 `@multiInject(Token)`。
4. React 组件通过 `useInject` 或 `useMultiInject` 获取服务，不自行创建领域服务实例。

新增实现时确认它已被 `src/domain/index.ts` 或相应 barrel 文件导入，否则装饰器不会执行，容器也不会注册该服务。

## 画布与坐标系

`Stage` 持有 PixiJS `Application`，`Viewport` 是所有图形和画布覆盖物的共同父容器。

代码中存在三个常用坐标空间：

- 客户端坐标：Pointer Event 的 `clientX/clientY`，用于接收浏览器输入。
- Viewport/世界坐标：图形基础属性、连线端点、途经点和空间索引使用的坐标。
- Shape 本地坐标：旋转或缩放后的精确命中检测使用的图形容器坐标。

必须遵守：

- 客户端坐标转换为世界坐标时使用 `IViewportService.clientToViewportLocal`。
- 世界坐标转换为图形本地坐标时使用 Pixi `container.toLocal`，并明确源容器。
- 通用仿射矩阵运算使用 `IMatrixService`，不要在 Handler 内复制矩阵逻辑。
- 连线的 `start`、`end` 和 `midPoints` 是世界坐标；移动连线时必须一起平移这些字段。
- 控制柄、选择框和吸附阈值需要按 Viewport scale 反向补偿，以保持稳定的屏幕像素尺寸。

## 事件链

`EventManager` 监听 document 级别的 pointer 事件，但 pointerdown 只处理画布区域。它根据当前工具选择模式：

- `InteractionMode`：选择工具，负责文本编辑、连线编辑、缩放、旋转、移动、选择与悬停。
- `CreatorMode`：图形创建工具，负责拖拽创建图形或连线。

Mode 通过 `@multiInject` 收集 Handler，并按各 Handler 的 `sort` 数字升序执行：

1. `enable` 决定本次事件是否参与。
2. `execute` 返回 `true` 时继续向后分发，返回 `false` 时消费事件并停止链路。
3. 跨 Handler 的短期状态只能放在 `InteractionState` 或明确的服务中，不使用模块级可变全局变量。
4. 新 Handler 必须明确排序位置，并覆盖与相邻 Handler 的冲突场景。

## Action、历史和派生状态

创建、删除以及会影响文档数据的属性修改通过 `IActionManager` 执行：

```text
ActionManager.push
  -> 写入撤销历史（按 needAddLog）
  -> PreActionInterceptor
  -> IActionExecute
  -> PostActionInterceptor
```

- 每个可撤销 Action 必须能生成语义正确的 back action。
- 拖拽等连续操作使用 `setStreamStart`/`setStreamEnd`，一次手势只产生一个撤销步骤。
- 属性更新完成后调用 `IShapeManager.refreshShapeIndex`，确保命中检测与空间查询读取新位置。
- 选择集合由 `ISelectService` 维护；批量变换后同步更新多选框。
- 导入并替换文档时必须清理选择、交互状态、Action 历史、现有图形和空间索引，再初始化新图形。

## Shape 与 ShapeData

- `BaseShape` 负责通用生命周期和属性容器；具体图形负责自身绘制、命中与能力声明。
- `ShapeFactory` 是从 ShapeData 创建运行时图形的集中入口。
- ShapeData 类型定义位于 `src/shape/contract/shape.ts`，运行时导入校验位于
  `src/widget/toolbar/shapeDataJson.ts`。
- ShapeData 的具体兼容规则和修改清单见 [`contracts/shape-data.md`](./contracts/shape-data.md)。

## 状态与 UI

Zustand store 由领域服务持有，例如 Viewport、选择、工具和历史状态；不存在独立的 `src/store/`
目录。React UI 订阅服务暴露的 store，不复制一份同含义状态。

用户可见文案必须同时更新：

- `src/i18n/locales/zh-CN.ts`
- `src/i18n/locales/en.ts`

视觉布局、颜色、间距、组件状态和反模式以 `DESIGN.md` 为准。

## 常见改动检查表

### 新增图形

- 扩展 `ShapeTypeEnum` 和 ShapeData 能力。
- 实现 Shape 类并接入 `ShapeFactory`。
- 接入工具栏数据、工具状态、快捷键和创建 Handler（如果需要）。
- 同步中英文文案。
- 增加 ShapeFactory/几何/行为单元测试，以及创建和导入导出的 E2E。

### 新增可撤销操作

- 定义 Action 与 back action。
- 注册对应 `IActionExecute`；需要联动时使用明确的 Interceptor。
- 覆盖首次执行、undo、redo，以及 undo 后产生新操作清空 redo 的测试。

### 修改导入导出

- 同步 TypeScript 类型、运行时校验、工厂和导出逻辑。
- 保持既有可选字段的默认行为。
- 更新 ShapeData 契约文档及导入导出往返 E2E。

## 后端边界

后端位于 `backend/`，按限界上下文组织 DDD 分层。详细规则见 `backend/README.md` 和
`backend/AGENTS.md`。前后端接口发生变化时，应同步接口文档、前端调用方和两侧测试。
