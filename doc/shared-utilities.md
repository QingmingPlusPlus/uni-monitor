# 共享工具模块说明

共享工具模块保存跨卡片复用、无页面 UI 归属的月分段和周聚合逻辑，以及统一加载图标。看板内部的日期、数值、设备范围和卡片缓存工具仍放在 `src/pages/factory-dashboard/data/loaders/`，由 `doc/factory-dashboard-architecture.md` 说明。

## `src/utils/monthSegment.ts`

该工具把当前月的后端分段配置转换为同步可读取的 `sessionStorage` 记录，供出勤、入库和生产计划趋势按月、周、日构造列和聚合数据。

### 记录结构

- session key：`uni-monitor:month-segment:<yyyy-MM>`。
- 记录 key：`${departmentId}:${processType}`，其中值必须使用 API 科室编号和 API 工序枚举。
- 记录 value：`SegmentVO[]`，每项包含 `segmentIndex`、`startDay`、`endDay`。

### 加载与回退

1. `loadMonthSegmentConfig()` 只加载设备本地时间对应的当前月。
2. 同一页面会话中若当前月记录已存在则立即返回；并发调用复用同一个 Promise。
3. API 某个部门/工序返回空分段时，写入该月的自然周分段。
4. API 请求失败时写入空对象，表示已经尝试加载；之后任意未命中组合都现算自然周。
5. session 还不存在时，`getProcessSegments()` 返回 `null`，消费方可显示加载态；session 已存在但复合键未命中时返回自然周。

`computeNaturalWeeks()` 以周一到周日分段；月首或月尾不足一周时保留短周，`segmentIndex` 从 1 开始递增。

### 使用约束

- CssMap 的 `department1`、`pretreatment1` 等值不能直接作为 lookup key，必须先通过 `toApiDepartmentCode` 和 `toApiProcessType` 转换。
- 本工具缓存的是周分段配置，不缓存看板接口结果。
- 当前 Promise 不按月份重置；应用如果跨月持续不刷新，仍应依赖页面既有的定时刷新或重新加载来创建新会话状态。

## `src/utils/departmentTrendAggregation.ts`

该工具为需要跨多个工序合并周列的 mock 和 fallback 数据提供基础操作：

- `resolveProcessSegments`：逐工序读取分段；任一工序仍在加载时整体返回 `null`。
- `getMaxSegmentIndex`：确定多个工序中最大的周序号，用于生成统一列数。
- `createWeekKey`、`createWeekColumns`：生成 `week1`、`1W` 等表格配置。
- `getRowsInSegment`：按工序和起止日筛选日数据。

它不负责百分比、计划实绩或人数等业务聚合，也不直接读取 session。真实接口趋势的通用周期构造位于 `data/loaders/trendPeriodBuilder.ts`，两者不要互相复制业务口径。

## `src/components/LoadingIcon.vue`

`LoadingIcon` 是无 props、无事件的纯展示组件，提供 `role="status"` 和“加载中”辅助文本。当前由 `FactoryDashboardPanel` 在趋势卡片数据为 `null` 时渲染，也可用于等待月分段等异步前置数据。

组件颜色使用全局 `--um-color-rail` 与 `--um-color-operation`，消费方负责提供卡片尺寸、边框和摆放位置。

## 测试与修改

- `src/utils/monthSegment.test.ts` 覆盖自然周连续性、session 解析和复合键行为；修改分段规则时先扩展这些测试。
- `departmentTrendAggregation.ts` 的调用方 mock 测试会覆盖跨工序聚合结果；新增通用操作时应优先添加直接单元测试。
- 共享工具只保存稳定的跨模块机制；单张卡片的字段名称、过滤条件和显示特例应留在卡片 loader 或组件中。
