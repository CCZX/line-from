# Claude Code 项目入口

本仓库的共享开发约定以 [`AGENTS.md`](./AGENTS.md) 为唯一规则来源。开始任务前先读取它，
再按其中的“按需读取文档”选择与任务相关的资料，避免在多个代理配置文件中重复维护架构说明。

常用入口：

- 项目说明与命令：[`README.md`](./README.md)
- 前端架构与实现不变量：[`docs/architecture.md`](./docs/architecture.md)
- 视觉规范：[`DESIGN.md`](./DESIGN.md)
- ShapeData 契约：[`docs/contracts/shape-data.md`](./docs/contracts/shape-data.md)
- 后端规范：[`backend/README.md`](./backend/README.md) 与 [`backend/AGENTS.md`](./backend/AGENTS.md)

常用验证命令：

```bash
pnpm verify:fast      # 单元测试、测试类型检查和 lint
pnpm verify:frontend  # 完整前端验证，包含构建和 E2E
pnpm verify:backend   # Maven 后端验证
pnpm verify           # 前后端完整验证
```
