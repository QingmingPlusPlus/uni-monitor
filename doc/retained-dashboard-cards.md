# 保留的历史看板卡片说明

仓库保留三组基于固定 mock 数据的部门指标卡片，便于以后恢复需求或参考 `TableChartCard` 用法。它们当前没有被部门页、工序页或设备页导入，不属于线上看板展示内容。

## 模块状态

| 目录 | 展示内容 | 数据状态 | 页面状态 |
| --- | --- | --- | --- |
| `src/components/department-defect-amount-card/` | 不良率计划实绩（金额），按 `1W` 至 `4W` 展示计划与实绩柱状图 | 固定 mock | 未挂载 |
| `src/components/department-defect-count-card/` | 不良率计划实绩（个数），按 `1W` 至 `4W` 展示计划与实绩柱状图 | 固定 mock | 未挂载 |
| `src/components/department-mh-card/` | MH 计划/实绩明细、合计和直接出勤率，使用柱线双轴图 | 固定 mock | 未挂载 |

每个目录均由一个 Vue 包装组件和一个 `*Mock.ts` 配置文件组成。包装组件接收可选 `title`、`subtitle`、`compact`，把表格与图表配置传给 `TableChartCard`，刷新按钮只向上抛出 `refresh`，不会重新生成或请求数据。

## 展开行为

三张卡片都向 `TableChartCard` 传入 `use-mock-expand`。展开时使用 `src/pages/factory-dashboard/components/DashboardExpandMockModal/` 根据当前行列生成演示数据，而不是展示真实完整月数据。

该模式只适合 mock 或视觉演示。已接入真实数据的趋势卡片应传入明确的 `modalTableRows`、`modalTableColumns`、`modalTableData`、`modalChartOptions` 和 `modalChartData`。

## 未挂载原因与接口现状

- 当前部门和工序右侧组件清单不包含不良金额、不良个数和 MH 卡片。
- `GET /schedule/getRejects` 已有前端 API 类型，但当前后端返回空数组，且没有足够稳定的金额、个数、计划值和实绩字段映射。
- MH 卡片目前没有对应的真实 loader 或经过确认的后端字段契约。
- 详细接口缺口见 `doc/department-api-gaps.md`，当前首页未展示项见 `doc/factory-dashboard-real-data-mapping.md`。

## 恢复接入前的要求

1. 先确认产品要求的挂载维度、卡片顺序、隐藏规则和月/周/日展示范围。
2. 为后端字段建立明确类型、过滤条件和聚合口径，不直接把现有 mock 常量当作线上数据。
3. 新增卡片级 loader、失败降级和刷新逻辑，并决定是否需要月级缓存及失效函数。
4. 将固定四周列改为当月分段驱动，复用 `monthSegment` 和趋势周期工具。
5. 为紧凑表格与完整展开态分别提供真实数据，并补充单元测试。
6. 接入完成后把本文件中的状态改为“生效”，同步模块索引、看板架构和接口字段映射。
