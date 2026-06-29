# 部门维度四卡片真实接口缺口记录

本文档记录部门维度四个瀑布流卡片接入真实接口后，仍存在的接口契约缺口与字段映射限制。

## 已接入接口

| 卡片 | 接口函数 | 端点 | 适配文件 |
| --- | --- | --- | --- |
| 人员出勤情况 | `getAttendanceSituation` | `GET /attendance/attendanceSituation` | `src/pages/factory-dashboard/data/factoryDashboardLoader.ts` |
| 出勤率推移表 | `getMonthlyAttendanceSituation` | `GET /attendance/monthlyAttendanceSituation` | 同上 |
| 入库计划推移表 | `getScheduleRukuPlanByMonth` | `GET /schedule/getRukuPlan` | 同上 |
| 人员明细及状态 | `getAttendanceDetailSituation` | `GET /attendance/attendanceDetailSituation` | 同上 |

## 接口契约缺口

### 1. 入库计划推移表（#3）

**接口**：`getScheduleRukuPlanByMonth(month: string)`

| 缺口 | 说明 | 当前处理 |
| --- | --- | --- |
| 无 `department` / `processType` 过滤参数 | 接口只接收 `month`，无法按科室或工序过滤，返回全厂所有入库计划记录 | 前端按日聚合所有记录的 `number` 字段作为 `planInbound`，不分科室 |
| 无实绩字段 | `ScheduleRukuPlanRecord` 只有 `number`（计划数），无 `actualInbound`（实绩入库量） | `actualInbound` 暂置 0；`achievementRate`（达成率）因分母为 0 显示 0% |
| 无 `processType` 字段 | 返回记录不含工序类型，无法按工序分组 | 所有记录归入 `processTypes[0]` 的桶以复用周汇总逻辑，使用该工序的月周分段配置 |

**建议**：后端扩展 `getScheduleRukuPlanByMonth` 签名增加 `department` / `processType` 可选参数，并新增 `actualNumber` 字段返回实绩数据。

### 2. 出勤率推移表（#2）

**接口**：`getMonthlyAttendanceSituation(params: { month, department?, processType? })`

| 缺口 | 说明 | 当前处理 |
| --- | --- | --- |
| 无 `targetRate`（利记出勤率）字段 | `MonthlyAttendanceStatisticsVO` 返回 `directAttendanceRate`（实际出勤率），但不返回目标/利记出勤率 | `targetRate` 暂置 0，"利记出勤率"行显示 0% |

**建议**：后端在 `MonthlyAttendanceStatisticsVO` 中新增 `targetAttendanceRate` 字段，或提供单独的目标值查询接口。

### 3. 人员出勤情况（#1）

**接口**：`getAttendanceSituation(params: { date?, department?, processType? })`

| 缺口 | 说明 | 当前处理 |
| --- | --- | --- |
| 接口返回按职务扁平行，卡片需按工序族分组 | `CurrentAttendanceStatisticsVO` 返回 (shiftType, positionType, positionName, schedulePersonCount, actualAttendancePersonCount)，不含工序族信息 | 前端按 `css3dMapSelection` 的 `departmentProcessMap` 推导工序族，对同族同班次的职务行做前端聚合 |
| 无 teamLeader / regular / dispatched / temporary / standby 明细拆分 | 卡片 `PersonnelAttendanceRow` 有 5 个直接人员明细子字段（班长/正式工/派遣/临时/顶岗），接口只返回 `positionName` 文本和合计值 | 将同工序族同班次的直接人员 `schedulePersonCount` 合并到 `directRegular`，其余 4 个子字段置 0 |
| 无 indirect 明细拆分 | 卡片有 `indirectDirectRoster` 和 `indirectLeaderRoster` 两个间接人员字段，接口只返回 `positionType: 'indirect'` | `indirectDirectRoster` 取间接人员排班合计，`indirectLeaderRoster` 置 0 |

**建议**：后端在 `CurrentAttendanceStatisticsVO` 中新增 `processType` 字段和人员明细子分类（或让 `positionName` 遵循固定枚举以便前端精确映射）。

### 4. 人员明细及状态（#4）

**接口**：`getAttendanceDetailSituation(params: { date?, department?, processType? })`

| 缺口 | 说明 | 当前处理 |
| --- | --- | --- |
| 枚举值依赖文本匹配 | `attendanceSituation` / `attendanceStatus` / `ability` 均为自由文本，需前端按中文关键词匹配映射到卡片枚举 | 使用 `includes()` 关键词匹配，未匹配到时 `attendanceStatus` 默认 `'present'`，`attendanceState` 默认 `'none'`，`capability` 默认 `'B'` |
| 班次字段无标准枚举 | `shiftName` 为自由文本，需推断早班/夜班/正常班 | 按是否包含"夜""早""白"关键词推断，未匹配默认"早班" |
| `workingHours` 格式拼接 | `workHourList` 返回 `{ workHourType, workHour }` 数组，卡片需单个字符串 | 前端拼接为 `"{workHourType} {workHour} {workHourType} {workHour} ..."` 格式 |

**建议**：后端对 `attendanceSituation` / `attendanceStatus` / `ability` / `shiftName` 使用固定枚举值而非自由文本。

## 环境配置

- `.env` 配置 `VITE_API_BASE_URL=http://123.57.81.179:8080/`
- H5 dev 模式下直接跨域请求后端，需后端开启 CORS 或在 `vite.config.ts` 配置 `server.proxy` 兜底

## 架构说明

- 部门页 `dashboardData` 从同步 `computed` 改为 `ref` + `watch` 触发异步 `loadDepartmentDashboardData`
- Loader 镜像 `loadMonthSegmentConfig` 模式：Promise 去重 + sessionStorage 缓存（TTL 60s）+ 降级到同步 mock
- 四张卡通过 `Promise.allSettled` 并发加载，任一卡片失败不阻塞其他卡片，失败卡片降级为 fallback 值
- KPI 网格和告警栏仍使用 mock 数据，不在本次改造范围内

## 5. 部门/工序维度卡片接口现状（2026-06 增补）

下表汇总 2026-06 新增瀑布流卡片、展开模态与 css-map 美化各组件对应的接口/mock 现状。

| 卡片/组件 | 数据来源 | 接口现状 | 说明 |
| --- | --- | --- | --- |
| 人员出勤情况 | `getAttendanceSituation` | 真实接口 | 仍保留 #1 已记录的接口缺口 |
| 出勤率推移表 | `getMonthlyAttendanceSituation` | 真实接口 | 仍保留 #2 已记录的接口缺口 |
| 入库计划推移表 | `getScheduleRukuPlanByMonth` | 真实接口 | 仍保留 #3 已记录的接口缺口；1 课（部门为 `department1` 或工序为 `pretreatment1`/`pretreatment2`）不展示该组件 |
| 人员明细及状态 | `getAttendanceDetailSituation` | 真实接口 | 仍保留 #4 已记录的接口缺口 |
| 不良率计画实绩（金额） | `src/components/department-defect-amount-card/departmentDefectAmountMock.ts` | mock | 无对应真实接口：现有接口未返回按周维度的不良率金额计划/实绩数据；演示期间使用 mock |
| 不良率计画实绩（个数） | `src/components/department-defect-count-card/departmentDefectCountMock.ts` | mock | 无对应真实接口：现有接口未返回按周维度的不良率个数计划/实绩数据；演示期间使用 mock |
| MH实绩 | `src/components/department-mh-card/departmentMhMock.ts` | mock | 无对应真实接口：MH 计划分定时/平日加班/休日加班/祝日加班/合计，实绩同结构 + 直接出勤率，未对接工时统计接口；演示期间使用 mock |
| 生产计划实绩推移表 | `src/components/process-production-plan-trend-card/processProductionPlanTrendMock.ts` | mock | 无对应真实接口：当前 mock 列覆盖月合计/4 周/任意 7 日，行简化为计划/实绩两行；最终接入时建议后端提供按工序的日计划/实绩推送 |
| 卡片展开模态（演示） | `src/pages/factory-dashboard/components/DashboardExpandMockModal/DashboardExpandMockModal.vue` | mock | 演示不再开发而做的 mock 大表，列覆盖月合计/4 周/30 日，行为计划/实绩，所有卡片共用同一演示源；标题附加 `（mock）` 标识 |

### 建议后端扩展

- 不良率金额 / 不良率个数 / MH 实绩 / 生产计划实绩推移表：建议后端提供按部门+工序粒度、按月/周/日分汇总的接口（计划、实绩双值，必要时附带达成率/出勤率等派生字段），前端可复用现有周汇总逻辑（`src/utils/departmentTrendAggregation.ts`）切换到真实接口。
- 展开模态切换为真实接口后，可在 `TableChartCard` / `PersonnelAttendanceCard` / `PersonnelDetailCard` 关闭 `use-mock-expand` 并传入月+周+日维度的扩展数据集。
