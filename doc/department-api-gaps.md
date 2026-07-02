# 工厂首页真实接口缺口记录

本文档记录部门维度和工序维度首页改造后仍存在的接口契约缺口、字段缺失和运行时异常。组件字段映射详见 `doc/factory-dashboard-real-data-mapping.md`。

## 已接入接口

| 组件/能力 | 接口函数 | 端点 | 适配文件 |
| --- | --- | --- | --- |
| 地图设备实时状态、人员、任务 | `getDeviceRealtimeList` | `GET /device/realtime/list` | `src/components/css-map/css3dMapLiveData.ts`、`src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 地图负荷率 | `getScheduleDeviceLoadByMonth` | `GET /schedule/getDeviceload` | 同上 |
| 地图 5M 变化点 | `getScheduleChangePoint` | `GET /schedule/getChangePoint` | `src/components/css-map/css3dMapLiveData.ts` |
| 人员出勤情况 | `getAttendanceSituation` | `GET /attendance/attendanceSituation` | `src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 出勤率推移表 | `getMonthlyAttendanceSituation` | `GET /attendance/monthlyAttendanceSituation` | 同上 |
| 人员明细及状态 | `getAttendanceDetailSituation` | `GET /attendance/attendanceDetailSituation` | 同上 |
| 月周配置 | `loadMonthSegmentConfig` | `GET /basic/month-segment/base-data` | `src/pages/department/index.vue`、`src/pages/process/index.vue` |
| 生产计划 | `getSchedulePlanByMonth` | `GET /schedule/getPlan` | `src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 生产实际 | `getScheduleOutputByMonth` | `GET /schedule/getOutput` | 同上 |
| 入库计划 | `getScheduleRukuPlanByMonth` | `GET /schedule/getRukuPlan` | 同上 |
| 入库实绩 | `getScheduleRukuShijiByMonth` | `GET /schedule/getRukuShiji` | 同上 |

## 近期已更新接口

| 接口 | 最新字段/状态 | 前端处理 |
| --- | --- | --- |
| `GET /schedule/getRukuPlan` | 当前返回 `date`、`number`、`zhifan`、`dept`、`customer`，2026-07 有数据；其中部分记录 `dept` 缺失或为 `0`。 | 入库计划实绩推移表按有效 `dept` 过滤当前部门后聚合，未归属记录不计入部门口径。 |
| `GET /schedule/getRukuShiji` | 新增入库实绩，返回 `date`、`shebei`、`number`、`zhifan`、`banci`、`dept`、`cusCode`、`custName`，2026-07 有数据。 | 入库计划实绩推移表按 `dept` 过滤当前部门，计算实绩、差值和达成率；信息汇总取当月全量合计，不按部门过滤。 |
| `GET /schedule/getOutput` | 当前月接口已有记录，字段包含 `date`、`shebei`、`number`、`zhifan`、`process`、`banci`、`dept`。 | 生产计划实绩推移表继续按设备范围和部门/工序过滤。 |
| `GET /schedule/getRejects` | 当前返回空数组，未再复现缺表 SQL 报错。 | 首页右侧已移除旧不良率卡片，暂不接入。 |

## 缺口与当前处理

| 缺口 | 影响组件 | 当前处理 |
| --- | --- | --- |
| `GET /schedule/getRukuPlan` 仍只有 `month` 查询条件，返回字段中没有 `shebei` 或 `processType` | 工序维度入库计划实绩推移表 | 前端可按 `dept` 过滤到当前工序所属部门，但无法把计划严格拆到单个工序。信息汇总不区分维度，取全量合计，不受此缺口影响。 |
| `GET /schedule/getRukuShiji` 只有 `month` 查询条件，没有 `processType` | 工序维度入库计划实绩推移表 | 前端按 `dept` 过滤到当前工序所属部门；如后续需要单工序口径，后端需补充工序字段或稳定设备范围。信息汇总不区分维度，取全量合计，不受此缺口影响。 |
| 人员出勤接口没有稳定的 `teamLeader`、正式工、派遣工、临时工、顶岗等结构化字段 | 人员出勤情况 | 前端按 `positionName` 中文关键词拆分；班长归入间接班长列，组长归入直接组长列。 |
| 人员出勤接口缺少人员子类明细时的严格枚举 | 人员出勤情况 | 未匹配到的直接人员计入 `directRegular`；`间接+直接在籍` 由本行间接总在籍与直接在籍合计相加得出。 |
| 人员明细接口中的 `attendanceSituation`、`ability`、`shiftName` 是自由文本 | 人员明细及状态 | `attendanceSituation` 和 `attendanceStatus` 均原样显示；能力与班次仍按前端兜底规则处理。 |
| `GET /schedule/getChangePoint` 当前返回空数组 | 地图变化点 | 地图不显示变化点标记；接口有数据后按 `device` 和 `type` 自动展示。 |
| 月周配置接口部分 (部门,工序) 组合在 2026-06 返回空配置 | 所有推移表 | 前端按 `departmentId:processType` 复合键查找；未命中的组合回退到自然周分段，仍保持月/周/日汇总逻辑。 |

## 建议后端扩展

- `getRukuPlan` 和 `getRukuShiji` 增加 `processType` 或稳定设备范围字段，让工序维度可以严格按单工序过滤。
- `getOutput` 保持与 `getPlan` 一致的部门、工序或设备编码可过滤字段。
- `getRejects` 明确不良金额、不良个数、计划值、实绩值和日期字段，便于未来恢复不良指标。
- 人员出勤与人员明细接口补充稳定枚举或结构化字段，减少前端中文关键词映射。
- 月周配置接口确保当前月份每个工序都返回分段配置；否则前端只能使用自然周兜底。
