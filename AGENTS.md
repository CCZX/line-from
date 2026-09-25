# 语言

- 所有输出必须使用中文。

# 项目定位

- 线构（Lineform）是一个 React 18 + TypeScript + PixiJS 7 的二维图形编辑器，后端使用 Java 17 + Spring Boot。
- 优先做与用户请求直接相关的最小改动，保留工作区内与当前任务无关的修改和未跟踪文件。

# 按需读取文档

- 项目功能、启动方式和命令：阅读 `README.md`。
- 前端架构、关键数据流和实现不变量：阅读 `docs/architecture.md`。
- 修改视觉样式或交互：额外阅读 `DESIGN.md`。
- 修改 ShapeData 导入、导出或字段：额外阅读 `docs/contracts/shape-data.md`。
- 修改后端：额外阅读 `backend/README.md`，并遵循 `backend/AGENTS.md`。
- 部署、发布、回滚或操作 `ccxhq.cn`：使用仓库内 `deploy-graphs-cloud` skill。
- 只读取当前任务需要的文档，不要求为小改动加载全部资料。

# 架构边界

- `src/domain/contract/` 定义接口和依赖注入 Token，`src/domain/service/` 提供实现；领域服务优先依赖接口，不直接依赖具体实现。
- 需要撤销/重做的用户操作必须经过 Action 系统，不得只修改图形或 UI 状态。
- 图形属性更新后必须同步空间索引；批量选择变化必须同步选择服务和多选框。
- 坐标转换统一通过 `IViewportService`、Pixi `toLocal` 或公共矩阵服务完成，不在事件处理器内复制一套换算公式。
- 修改 ShapeData 时必须保持旧数据可导入；破坏性字段变更必须提供迁移方案和导入导出测试。
- 新增或修改用户可见文案时同步维护 `src/i18n/locales/zh-CN.ts` 与 `src/i18n/locales/en.ts`。
- 不提交临时调试输出、仅用于本机的绝对路径、密钥或生产凭据。

# 命名与改动原则

- 新目录默认使用 lowerCamelCase，React 组件、类及其同名文件使用 UpperCamelCase，其他文件使用 lowerCamelCase。
- `src/domain/` 中已有部分 UpperCamelCase 历史目录；除专门的重构任务外，不要仅为调整大小写批量改路径。
- 优先扩展现有服务、测试夹具和公共工具，避免创建功能重叠的第二套实现。
- 行为变化应增加或更新最接近该行为层级的测试。

# 验证

- 纯文档变更无需运行测试，但交付时要明确说明未运行测试的原因。
- 修改前端代码、测试或前端构建配置后，交付前运行 `pnpm verify:frontend`。
- 修改后端代码或 Maven 配置后，运行 `pnpm verify:backend`，并按仓库统一要求额外运行 `pnpm test:e2e`。
- 同时涉及前后端，或需要完整验证时，运行 `pnpm verify`。
- 任何代码修改都必须在交付前通过完整 E2E：`pnpm test:e2e`。只有 E2E 通过后才能报告完成；若失败或环境受限，必须明确说明失败项和阻塞原因。

# 完成标准

- 请求的行为已经实现，相关测试已补充并通过。
- 架构、命令、数据契约发生变化时，对应文档已同步。
- 工作区中没有本次改动引入的调试代码、生成物或无关格式化。
- 最终回复列出主要变更、验证命令和结果。

# Code Review Rules

- 标记绕过 Action 系统而导致撤销/重做失效的用户操作。
- 标记图形属性改变后未刷新空间索引、选择态与多选框不同步的问题。
- 标记会让既有 ShapeData 无法导入且没有迁移或兼容处理的变更。
- 标记只更新一种语言、遗留调试输出或缺少对应行为测试的变更。
