<div align="center">
  <img src="./public/favicon.svg" width="88" alt="线构图标" />
  <h1>线构</h1>
  <p><strong>把想法连成形。</strong></p>
  <p>一个简洁、流畅的 Web 端二维图形编辑器。</p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&amp;logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&amp;logoColor=white" alt="TypeScript 5.6" />
    <img src="https://img.shields.io/badge/PixiJS-7-e72264" alt="PixiJS 7" />
    <img src="https://img.shields.io/badge/Vite-4-646cff?logo=vite&amp;logoColor=white" alt="Vite 4" />
  </p>
</div>

## 项目介绍

线构（Lineform）是一款基于 React 和 PixiJS 构建的二维图形编辑器。项目使用
WebGL 加速渲染，围绕图形创建、选择、变换、连接和样式编辑提供完整的画布交互，
同时通过命令系统记录操作，支持撤销与重做。

界面采用灰度层次和紫色强调色，工具图标保留轻微手绘质感，整体风格简洁、克制、
偏工具型。详细规范见 [DESIGN.md](./DESIGN.md)。

## 功能特性

- **图形绘制**：支持矩形、圆角矩形、菱形、圆形、直线、箭头和文本。
- **选择与多选**：支持单击选择、框选、全选、批量移动和批量缩放。
- **图形变换**：支持拖拽移动、八方向缩放和中心旋转。
- **连线编辑**：支持端点、途经点、箭头和图形锚点；图形移动后连线会同步更新。
- **文本编辑**：双击文本或含文本的图形即可进入编辑状态。
- **样式面板**：支持描边颜色、宽度、规整/手绘描边、填充颜色、透明度以及纯色和
  手绘填充。
- **操作历史**：创建、删除、移动、缩放、旋转及属性修改均可撤销和重做。
- **画布导航**：进入页面时自动缩放全览，并支持滚轮平移、快捷横向滚动、中心缩放以及空格拖拽画布。
- **数据导入导出**：可将当前画布导出为 ShapeData JSON，也可从 JSON 恢复画布。
- **多语言界面**：支持简体中文和英文，浏览器标题会随语言切换同步更新。

## 画布操作

| 操作                         | 效果                     |
| ---------------------------- | ------------------------ |
| 鼠标滚轮 / 触控板滑动        | 上下或自由平移画布       |
| `Shift` + 鼠标滚轮           | 左右平移画布             |
| `Ctrl` + 鼠标滚轮            | 以鼠标位置为中心缩放画布 |
| 按住 `Space` + 鼠标左键拖拽  | 自由平移画布             |
| 点击工具栏缩放比例           | 重置为 100%              |
| 悬停缩放比例并选择“缩放全览” | 居中显示画布内全部图形   |
| 点击工具栏 `−` / `+`         | 按预设档位缩小或放大     |

画布缩放范围为 10%–400%。空格拖拽使用 Pointer Capture，因此鼠标移出画布后
仍能保持连续平移。

## 快捷键

| 快捷键                     | 功能         |
| -------------------------- | ------------ |
| `V`                        | 选择工具     |
| `R`                        | 矩形工具     |
| `U`                        | 圆角矩形工具 |
| `D`                        | 菱形工具     |
| `C`                        | 圆形工具     |
| `L`                        | 直线工具     |
| `A`                        | 箭头工具     |
| `T`                        | 文本工具     |
| `Ctrl/Cmd` + `A`           | 全选图形     |
| `Delete` / `Backspace`     | 删除选中图形 |
| `Ctrl/Cmd` + `Z`           | 撤销         |
| `Ctrl/Cmd` + `Shift` + `Z` | 重做         |

在输入框、文本编辑器或其他可编辑元素中输入时，工具切换、全选、删除和空格平移
快捷键不会接管键盘事件。

## 快速开始

### 环境要求

- Node.js 18 或更高版本
- pnpm 8 或更高版本

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

启动后访问 [http://localhost:5173](http://localhost:5173)。

### 构建与预览

```bash
pnpm build
pnpm preview
```

## 常用命令

| 命令                  | 说明                               |
| --------------------- | ---------------------------------- |
| `pnpm dev`            | 启动 Vite 开发服务器               |
| `pnpm build`          | 执行 TypeScript 检查并构建生产资源 |
| `pnpm preview`        | 本地预览生产构建                   |
| `pnpm test`           | 运行全部单元测试                   |
| `pnpm test:watch`     | 以监听模式运行测试                 |
| `pnpm test:typecheck` | 检查测试代码类型                   |
| `pnpm lint`           | 检查源码与测试代码                 |
| `pnpm lint:fix`       | 自动修复可修复的代码规范问题       |

## 技术栈

| 分类     | 技术                          |
| -------- | ----------------------------- |
| UI       | React 18、Less、Sketchbook UI |
| 渲染     | PixiJS 7、RoughJS             |
| 语言     | TypeScript 5.6                |
| 状态管理 | Zustand                       |
| 依赖注入 | InversifyJS                   |
| 事件流   | RxJS、Pointer Events          |
| 国际化   | i18next、react-i18next        |
| 工程化   | Vite、ESLint、Prettier、Husky |
| 测试     | Vitest                        |

## 项目结构

```text
.
├── public/                    # favicon 等静态资源
├── src/
│   ├── canvas/core/          # PixiJS Stage 与 Viewport
│   ├── common/               # IoC 容器、React 上下文与公共服务
│   ├── domain/
│   │   ├── contract/         # 领域接口与依赖注入 Token
│   │   └── service/          # 事件、动作、选择、快捷键等领域服务
│   ├── i18n/                 # 中英文资源与语言初始化
│   ├── shape/                # 图形、属性、装饰器、状态机与几何计算
│   └── widget/               # 编辑器、工具栏和属性面板
├── tests/unit/               # 单元测试
├── DESIGN.md                 # 视觉设计规范
└── vite.config.ts            # Vite 与路径别名配置
```

## 架构概览

- **渲染层**：`Stage` 创建 PixiJS 应用，`Viewport` 作为所有图形的父容器，统一负责
  平移和缩放。
- **图形层**：`BaseShape` 组合基础属性、填充、描边、文本和连线属性；装饰器负责悬停、
  选中与控制手柄的可视化。
- **交互层**：`EventManager` 根据当前工具选择事件模式，并按优先级将 Pointer Event
  分发给文本编辑、连线、缩放、旋转、移动、选择和悬停处理器。
- **动作层**：`ActionManager` 使用命令模式执行创建、删除和属性更新，
  `ActionLogManager` 维护撤销与重做历史。
- **服务层**：领域接口与实现分离，通过 InversifyJS 完成依赖注入；React 组件通过
  Context 获取所需服务。

## 数据格式

工具栏可以导出当前画布的 ShapeData JSON。导入时会先校验数据结构，再使用文件内容
替换当前画布。建议在导入前先导出当前内容作为备份。

ShapeData 包含图形类型和对应属性，例如位置、尺寸、旋转、描边、填充、文本以及连线
端点与路由信息。

## 开发约定

- 源码使用 `@/` 作为 `src/` 的路径别名。
- 目录使用 lowerCamelCase，React 组件与类使用 UpperCamelCase。
- 领域服务优先通过接口 Token 注入，不直接依赖具体实现。
- 提交前建议运行：

```bash
pnpm test
pnpm test:typecheck
pnpm lint
pnpm build
```
