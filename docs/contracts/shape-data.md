# ShapeData 数据契约

ShapeData 是画布导入、导出和撤销重建图形时使用的持久化数据。当前格式尚未包含显式版本号，
顶层是 `ShapeData[]` JSON 数组，因此所有字段变更都必须优先考虑旧文件兼容性。

## 事实来源

- TypeScript 类型：`src/shape/contract/shape.ts`
- 运行时导入校验：`src/widget/toolbar/shapeDataJson.ts`
- 运行时图形创建：`src/shape/ShapeFactory.ts`
- 往返 E2E：`tests/e2e/import-export.spec.ts`

修改契约时必须同步这些位置。本文解释兼容策略，不替代代码中的类型和校验器。

## 当前结构

```text
ShapeData
├─ id: 非空且在同一文档内唯一的 string
├─ type: circle | rectangle | roundedRectangle | diamond | text | line
└─ properties
   ├─ base: { x, y, width, height, rotation? }
   ├─ fill?: { color, alpha, style?, seed? }
   ├─ stroke?: { color, width, alpha, style?, seed? }
   ├─ text?: { text, color?, fontSize?, fontFamily?, ... }
   └─ line?: { start, end, midPoints?, routing?, startArrow?, endArrow? }
```

约束：

- 数值必须是有限数；`width`、`height` 和描边 `width` 不得为负数。
- 同一次导入中的图形 ID 不能重复。
- 连线端点和途经点使用世界坐标。
- 端点可以通过 `shapeId` 和 `anchor` 绑定图形。
- 当前校验器允许未知的额外字段，但运行时不会自动保留所有未知语义；不要把这一行为当作扩展机制。

## 兼容规则

- 新增可选字段属于首选演进方式；旧文件缺少字段时必须有稳定默认行为。
- 不直接重命名或删除既有字段，不改变既有枚举值的含义。
- 不把可选字段直接改为必填字段。
- 若必须进行破坏性变更，先引入显式文档版本和迁移函数，再切换导出格式。
- 导入成功后再替换当前画布；校验失败不得部分写入运行时状态。
- 导出后重新导入再导出，应保持业务数据等价。

## 修改检查表

1. 更新 TypeScript 类型和默认值。
2. 更新运行时校验器，覆盖合法值、边界值和非法值。
3. 更新 `ShapeFactory`、`BaseShape.toData()` 和相关 Property。
4. 确认 Action 的 back action 能保留新增字段。
5. 添加单元测试和 `tests/e2e/import-export.spec.ts` 的往返场景。
6. 更新本文；若格式已版本化，记录迁移路径。
