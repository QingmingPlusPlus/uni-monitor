# 工厂首页组件接口字段映射

本文档记录部门维度和工序维度首页各组件使用的真实接口、字段来源和无法匹配的字段。实现入口主要在 `src/pages/factory-dashboard/data/factoryDashboardLoader.ts`，地图实时数据入口在 `src/components/css-map/css3dMapLiveData.ts`。

## 公共过滤与时间

| 前端概念 | 来源/转换 | 说明 |
| --- | --- | --- |
| 当前部门 | `departmentId` query，例如 `department2` | 通过 `toApiDepartmentCode` 转为接口 `department=2`。 |
| 当前工序 | `processId` query，例如 `vulcanization1` | 通过 `toApiProcessType` 转为接口工序：`pretreatment* -> preprocessing`，`vulcanization* -> sulfur_addition`，`posttreatment* -> post_processing`。 |
| 工序设备范围 | `public/factory-map/devices.json` 的 `section`、`deviceCode`、`deviceCodes`、`children[].deviceCode` | 用于把设备级接口过滤到当前部门或工序。 |
| 当前月 | 前端本地日期 `YYYY-MM` | 推移表接口按月查询。 |
| 月周配置 | `GET /basic/month-segment/base-data` | 前端按接口周配置聚合日数据；配置缺失时回退自然周。 |

## 左侧 css-map

| 地图信息 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 设备工作状态 | `GET /device/realtime/list` | `actualStatus`、`actualStatusName`、`deviceStatus`、`deviceStatusName`、`deviceParseTypeName` | 优先使用实际状态字段，映射为运行、异常、计划停止、待机等状态。 |
| 符合率 | `GET /schedule/getDeviceload` | `devCode`、`fuhe` | 按设备编码匹配；`fuhe` 视为 0-1 或百分比值，前端格式化为百分比。 |
| 人员配置 | `GET /device/realtime/list` | `onlinePersonList` | 展示当前设备在线人员数量和人员信息。 |
| 生产任务 | `GET /device/realtime/list` | `productionTaskList` | 作为地图设备实时信息补充。 |
| 5M 变化点 | `GET /schedule/getChangePoint` | `device`、`type`、`change`、`varify`、`notes` | 按设备编码匹配；`type` 映射为人、机、料、法、环。当前接口返回空数组时不展示变化点。 |

## 信息汇总组件

| 指标 | 接口/来源 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 生产线稼动 | `GET /device/realtime/list` | `deviceStatus`、`actualStatus` | 从生产线稼动情况聚合：稼动台数/总台数，并计算稼动率。 |
| 人员出勤-直接 | `GET /attendance/attendanceSituation` | `positionType=direct`、`schedulePersonCount`、`actualAttendancePersonCount` | 汇总当前部门或工序的直接人员应出勤/实际出勤和出勤率。 |
| 人员出勤-间接 | `GET /attendance/attendanceSituation` | `positionType=indirect`、`schedulePersonCount`、`actualAttendancePersonCount` | 汇总当前部门或工序的间接人员应出勤/实际出勤和出勤率。 |
| 入库实绩 | `GET /schedule/getRukuPlan` | `number` | 目前只有计划字段，实绩字段缺失；显示为 `-/计划` 或空。 |
| 生产实际 | `GET /schedule/getPlan`、`GET /schedule/getOutput` | `number`、`workDate`、设备/工序相关字段 | 计划来自 `getPlan`，实绩来自 `getOutput`；当前月 `getOutput` 为空时实绩显示为空。 |
| 可动率 | `GET /schedule/getDeviceload` | `fuhe` | 对当前设备范围的符合率取平均。 |

> 参考图中的“※以上为实时数据”“※以上数据截止昨日”只作为刷新时机说明，本次组件不显示这两行。

## 生产线稼动情况

| 列 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 部门 | 页面状态、`selection.json` | `departmentId` | 部门维度显示当前部门名称；工序维度显示当前工序所属部门名称。 |
| 工序 | `selection.json` | `processId`、label | 部门维度每个工序一行；工序维度只显示当前工序一行。 |
| 总台数 | `GET /device/realtime/list` + 地图设备范围 | 设备记录数 | 按当前部门或工序设备编码过滤后计数。 |
| 稼动台数 | 同上 | `actualStatus`、`deviceStatus` 等状态字段 | 状态匹配运行/稼动时计入。 |
| 异常台数 | 同上 | 状态字段 | 状态匹配异常/报警/故障时计入。 |
| 计划停止台数 | 同上 | 状态字段 | 状态匹配计划停止/停止时计入。 |

## 人员出勤情况

| 字段 | 接口 | 后端字段 | 当前处理 |
| --- | --- | --- | --- |
| 班次 | `GET /attendance/attendanceSituation` | `shiftTypeName`、`shiftType` | 映射为早班、夜班、正常班和合计。 |
| 间接+直接在籍、间接在籍、间接出勤 | 同上 | `positionType=indirect`、`schedulePersonCount`、`actualAttendancePersonCount` | 间接人员汇总到对应列。 |
| 直接在籍细分 | 同上 | `positionType=direct`、`positionName`、`schedulePersonCount` | 按 `positionName` 关键词拆分班长/组长、派遣、临时、顶岗；剩余计入正式工。 |
| 实际出勤人数 | 同上 | `actualAttendancePersonCount` | 汇总直接人员实际出勤。 |
| 出勤率 | 同上 | 由前端计算 | `直接实际出勤 / 直接在籍合计`。 |

## 人员明细及状态

| 列 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 班次、工号、姓名、职务、工种 | `GET /attendance/attendanceDetailSituation` | `shiftName`、`workNo`、`name`、`positionName`、`workTypeName` | 直接展示或按空值兜底。 |
| 出勤情况 | 同上 | `attendanceSituation` | 直接展示。 |
| 出勤状态 | 同上 | `attendanceStatus` | 关键词映射为管理、本岗、顶岗、新人等状态。 |
| 能力 | 同上 | `ability` | 映射为 A/B/C，缺失时默认 B。 |
| 工时 | 同上 | `workHourList[].workHourType`、`workHourList[].workHour` | 拼接为单列文本。 |

## 出勤率推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 间接在籍人数 | `GET /attendance/monthlyAttendanceSituation` | `indirectSchedulePersonCount` | 后端按日返回，前端按月/周/日聚合，聚合值取有效日平均。 |
| 直接在籍人数 | 同上 | `directSchedulePersonCount` | 同上。 |
| 直接出勤人数 | 同上 | `directAttendancePersonCount` | 同上。 |
| 直接实际出勤率 | 同上 | `directAttendanceRate` 或前端聚合计算 | 聚合时用 `直接出勤合计 / 直接在籍合计`。 |
| 利记出勤率 | 前端固定值 | 无接口字段 | 固定 91%；表格只在月列显示一个值，chart 显示 91% 红色目标线。 |

## 入库计划实绩推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 计划入库数 | `GET /schedule/getRukuPlan` | `number`、日期字段 | 按日读取并按月/周/日聚合。 |
| 实绩入库数 | 无匹配字段 | 无 | 暂为空。 |
| 实绩计划差 | 前端派生 | 计划、实绩 | 因实绩缺失暂为空。 |
| 入库达成率 | 前端派生 | 计划、实绩 | 因实绩缺失暂为空。 |

显示规则：仅部门维度展示，且制造1课不展示。

## 生产计划实绩推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 计划生产数 | `GET /schedule/getPlan` | `number`、`workDate`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合。 |
| 实绩生产数 | `GET /schedule/getOutput` | `number`、`workDate`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合；当前月接口为空时显示为空。 |
| 合格数、不良数、抽样数 | 无稳定匹配字段 | 无 | 本次不展示。 |
| 实绩计划差 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 - 计划`。 |
| 生产达成率 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 / 计划`。 |

显示规则：仅工序维度展示。

## 未接入或空置字段

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 不良率金额、个数 | 未展示 | `GET /schedule/getRejects` 当前后端 SQL 报错，且本次页面结构已移除旧不良卡片。 |
| MH 实绩 | 未展示 | 用户本次要求的右侧组件中不包含旧 MH 卡片。 |
| 入库实绩 | 空置 | 未在 Swagger 中找到可匹配字段。 |
| 生产实绩当前月 | 空置 | `GET /schedule/getOutput?month=2026-06` 返回空数组。 |
