# 后端开发规则

- 修改本目录前阅读 `backend/README.md`；根目录 `AGENTS.md` 的规则继续生效。
- 后端按限界上下文组织，依赖方向保持为 `interfaces -> application -> domain`，以及 `infrastructure -> domain`。
- `domain` 必须保持为纯 Java，不依赖 Spring、HTTP、数据库实现或接口层 DTO。
- REST 请求与响应模型放在 `interfaces`，用例编排和事务边界放在 `application`，仓储接口放在 `domain`，实现放在 `infrastructure`。
- 新业务优先落到明确的限界上下文，不新增全局巨型 `controller`、`service` 或 `repository` 目录。
- 修改行为时补充相应层级的测试；交付前运行 `pnpm verify:backend`，并遵循根规则运行完整 E2E。
