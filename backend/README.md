# 线构后端

基于 Spring Boot 4 和 Java 17 的 Maven 工程。

## 本地运行

```bash
mvn spring-boot:run
```

服务默认监听 `http://localhost:8080`，可通过环境变量 `SERVER_PORT` 修改端口。

启动后可访问：

- `GET /api/health`：前后端联调健康接口
- `GET /actuator/health`：Spring Boot Actuator 健康检查

## DDD 架构

后端采用“按限界上下文组织的 DDD 分层架构”。首个核心上下文是 `document`，用于承载
画布文档的保存、加载、版本与共享等业务能力。

```text
cn.ccxhq.graphs
├── GraphsBackendApplication.java
├── interfaces/rest/              # 应用级 REST 接口，例如健康检查
└── document/                     # 画布文档限界上下文
    ├── interfaces/               # 输入适配器：REST、消息消费者
    ├── application/              # 用例编排、事务和应用 DTO
    ├── domain/                   # 聚合、实体、值对象和仓储接口
    └── infrastructure/           # 数据库、消息和外部服务实现
```

依赖方向固定为：

```text
interfaces -> application -> domain
infrastructure ------------> domain
```

- `domain` 保持为纯 Java，不依赖 Spring、HTTP 或具体数据库。
- 仓储接口定义在 `domain`，实现放在 `infrastructure`。
- REST 请求和响应模型属于 `interfaces`，不直接暴露领域对象。
- `application` 负责调用领域对象完成一个用例，但不承载核心业务规则。
- 新业务优先创建新的限界上下文，不建立全局巨型 `controller`、`service`、
  `repository` 目录。

## 测试与构建

```bash
mvn test
mvn package
```
