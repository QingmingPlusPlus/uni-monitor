## Why

当前入库计划实绩推移表只展示月、全部周和当前周工作日，缺少“截止当天”累计口径，并会在图表中绘制零值或保留无有效数据的类目。低保真示意要求表格稳定表达全月、截至业务当天、月内周段和当周每日数据，同时让趋势曲线只呈现真实有效的非零点。

## What Changes

- 调整入库计划实绩推移表的周期列，依次展示全月、截止当天、当月存在的 `1W` 至 `5W`、当前周全部自然日日列。
- 将月内周段明确为 `1–7`、`8–14`、`15–21`、`22–28`、`29–月末`；月份不存在第 29 日时不生成 `5W`，且不生成 `6W`。
- 为“截止当天”增加包含当天的累计口径，并使用当前业务日期动态生成表头。
- 入库趋势图按第一个至最后一个有效非零点裁剪横轴首尾无数据区间，同时保留中间的空类目作为断线位置；零值和空值不显示为点，也不跨空点连线。
- 当某条入库趋势系列完全没有有效点时，不渲染该系列及其图例。
- 表格继续展示真实零值；零值隐藏规则仅作用于图表。
- 紧凑视图和展开视图遵循同一周期列规则，不再由展开视图额外展示整月所有日列。
- 补充日期边界、周段、零值断线和空系列的自动化测试，并同步项目文档。

## Capabilities

### New Capabilities

- `inbound-trend-period-display`: 定义入库计划实绩推移表的全月/截止当天/固定月周段/当周每日列口径，以及图表有效点、零值断线和空系列显示规则。

### Modified Capabilities

无。

## Impact

- 影响 `src/pages/factory-dashboard/data/loaders/loadInboundPlanTrendCard.ts`、周期构造与入库趋势数据转换逻辑。
- 可能为共享周期或图表构造函数增加入库专用策略参数，但不得改变出勤率推移表和生产计划实绩推移表的现有行为。
- 影响入库计划实绩推移表的紧凑表格、展开表格和对应 ECharts 数据。
- 影响 `src/pages/factory-dashboard/data/factoryDashboardLoader.test.ts` 及必要的周期/图表单元测试。
- 需要同步 `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md`，若调整共享月分段回退行为还需同步 `doc/shared-utilities.md` 和 `doc/agent-memory-map.md`。
- 不改变后端 API、缓存刷新协议、部门/工序过滤口径或通用 `TableChartCard` 的业务无关 props 契约。
