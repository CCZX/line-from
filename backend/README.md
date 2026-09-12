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

## 测试与构建

```bash
mvn test
mvn package
```
