# 工厂首页真实接口缺口记录

本文档记录部门维度和工序维度首页改造后仍存在的接口契约缺口、字段缺失和运行时异常。组件字段映射详见 `doc/factory-dashboard-real-data-mapping.md`。

## 已接入接口

| 组件/能力 | 接口函数 | 端点 | 适配文件 |
| --- | --- | --- | --- |
| 地图设备实时状态、人员、任务 | `getDeviceRealtimeList` | `GET /device/realtime/list` | `src/components/css-map/css3dMapLiveData.ts`、`src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 地图/汇总符合率 | `getScheduleDeviceLoadByMonth` | `GET /schedule/getDeviceload` | 同上 |
| 地图 5M 变化点 | `getScheduleChangePoint` | `GET /schedule/getChangePoint` | `src/components/css-map/css3dMapLiveData.ts` |
| 人员出勤情况 | `getAttendanceSituation` | `GET /attendance/attendanceSituation` | `src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 出勤率推移表 | `getMonthlyAttendanceSituation` | `GET /attendance/monthlyAttendanceSituation` | 同上 |
| 人员明细及状态 | `getAttendanceDetailSituation` | `GET /attendance/attendanceDetailSituation` | 同上 |
| 月周配置 | `loadMonthSegmentConfig` | `GET /basic/month-segment/base-data` | `src/pages/department/index.vue`、`src/pages/process/index.vue` |
| 生产计划 | `getSchedulePlanByMonth` | `GET /schedule/getPlan` | `src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 生产实际 | `getScheduleOutputByMonth` | `GET /schedule/getOutput` | 同上 |
| 入库计划 | `getScheduleRukuPlanByMonth` | `GET /schedule/getRukuPlan` | 同上 |

## 缺口与当前处理

| 缺口 | 影响组件 | 当前处理 |
| --- | --- | --- |
| `GET /schedule/getRukuPlan` 仅有 `month` 查询条件，缺少 `department`、`processType` 或设备范围字段 | 入库计划实绩推移、信息汇总的入库实绩 | 前端只能按日聚合接口返回的全量入库计划；无法严格按部门过滤。制造1课按业务规则隐藏入库推移。 |
| `GET /schedule/getRukuPlan` 返回字段中没有入库实绩 | 入库计划实绩推移、信息汇总的入库实绩 | `actual` 置空，达成率置空；文案保留为“实绩字段缺失”。 |
| 当前 `GET /schedule/getRukuPlan?month=2026-06` 返回 `data: null` | 入库计划实绩推移 | 前端显示空值，不回退到 mock。 |
| `GET /schedule/getOutput?month=2026-06` 返回空数组 | 生产计划实绩推移、信息汇总的生产实际 | 生产计划仍展示，生产实绩为空；chart 跳过空点。 |
| `GET /schedule/getRejects?month=2026-06` 后端 SQL 报错，提示缺少 `visual.tb_pad_dongjie` | 不良相关指标 | 本次首页右侧不再展示旧不良率金额/个数卡片，因此未接入该接口；该接口仍需后端修复后才能用于未来不良指标。 |
| 人员出勤接口没有稳定的 `teamLeader`、正式工、派遣工、临时工、顶岗等结构化字段 | 人员出勤情况 | 前端按 `positionName` 中文关键词拆分；班长/组长合并到 `directTeamLeader`。 |
| 人员出勤接口缺少人员子类明细时的严格枚举 | 人员出勤情况 | 未匹配到的直接人员计入 `directRegular`；间接人员合并到 `indirectDirectRoster`。 |
| 人员明细接口中的 `attendanceSituation`、`attendanceStatus`、`ability`、`shiftName` 是自由文本 | 人员明细及状态 | 前端使用中文关键词映射；未匹配项使用默认状态。 |
| `GET /schedule/getChangePoint` 当前返回空数组 | 地图变化点 | 地图不显示变化点标记；接口有数据后按 `device` 和 `type` 自动展示。 |
| 月周配置接口部分工序在 2026-06 返回空配置 | 所有推移表 | 前端回退到自然周分段，仍保持月/周/日汇总逻辑。 |

## 建议后端扩展

- `getRukuPlan` 增加 `department`、`processType` 或设备范围字段，并补充入库实绩字段。
- `getOutput` 保持与 `getPlan` 一致的部门、工序或设备编码可过滤字段，避免当前月实绩为空时无法判断是无数据还是未同步。
- `getRejects` 修复缺表错误，并明确不良金额、不良个数、计划值、实绩值和日期字段。
- 人员出勤与人员明细接口补充稳定枚举或结构化字段，减少前端中文关键词映射。
- 月周配置接口确保当前月份每个工序都返回分段配置；否则前端只能使用自然周兜底。
