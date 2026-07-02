# 工厂首页组件接口字段映射

本文档记录部门维度和工序维度首页各组件使用的真实接口、字段来源和无法匹配的字段。实现入口主要在 `src/pages/factory-dashboard/data/factoryDashboardLoader.ts`，地图实时数据入口在 `src/components/css-map/css3dMapLiveData.ts`。

## 公共过滤与时间

| 前端概念 | 来源/转换 | 说明 |
| --- | --- | --- |
| 当前部门 | `departmentId` query，例如 `department2` | 通过 `toApiDepartmentCode` 转为接口 `department=2`。 |
| 当前工序 | `processId` query，例如 `vulcanization1` | 通过 `toApiProcessType` 转为接口工序：`pretreatment* -> preprocessing`，`vulcanization* -> sulfur_addition`，`posttreatment* -> post_processing`。 |
| 工序设备范围 | `public/factory-map/devices.json` 的 `section`、`deviceCode`、`deviceCodes`、`children[].deviceCode` | 用于把设备级接口过滤到当前部门或工序。 |
| 当前月 | 前端本地日期 `YYYY-MM` | 推移表接口按月查询。 |
| 月周配置 | `GET /basic/month-segment/base-data` | 前端按接口周配置聚合日数据；配置缺失时回退自然周。sessionStorage 记录键为 `${departmentId}:${processType}` 复合键；推移表查找时将 CssMap 值经 `toApiDepartmentCode`/`toApiProcessType` 转为接口格式后拼键读取，未命中的 (部门,工序) 组合回退自然周。 |

## 左侧 css-map

| 地图信息 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 设备工作状态 | `GET /device/realtime/list` | `actualStatus`、`deviceParseType`、`actualStatusName`、`deviceParseTypeName` | 以 `actualStatus` 为主状态：`normal` 显示计划停止，`running` 显示生产中；`pause_running`/`pause_not_running` 再按 `deviceParseType` 判断，`CUT` 显示切替，`CLEAN` 显示清扫，`TOOL_CHANGE`/`DEVICE_TOOL_CHANGE`/`REST`/`DEVICE_REST` 显示计划停止，其余暂停原因显示异常停止。 |
| 负荷率 | `GET /schedule/getDeviceload` | `devCode`、`fuhe` | 按设备编码匹配；`fuhe` 视为 0-1 或百分比值，前端格式化为一位小数百分比。 |
| 人员配置 | `GET /device/realtime/list` | `onlinePersonList` | 展示当前设备在线人员数量和人员信息。 |
| 生产任务 | `GET /device/realtime/list` | `productionTaskList` | 作为地图设备实时信息补充。 |
| 5M 变化点 | `GET /schedule/getChangePoint` | `device`、`type`、`change`、`varify`、`notes` | 按设备编码匹配；`type` 映射为人、机、料、法、环。当前接口返回空数组时不展示变化点。 |

## 信息汇总组件

| 指标 | 接口/来源 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 生产线稼动 | `GET /device/realtime/list` | `deviceStatus`、`actualStatus` | 从生产线稼动情况聚合：除计划停止外的设备均计入稼动台数（含异常状态），并计算稼动率。 |
| 人员出勤-直接 | `GET /attendance/attendanceSituation` | `positionType=direct`、`shiftType`/`shiftTypeName`、`schedulePersonCount`、`actualAttendancePersonCount` | 只汇总当前时间对应班次的直接人员应出勤/实际出勤和出勤率；早班 06:30-14:30，中班 14:30-22:30，晚班 22:30-次日 06:30。 |
| 人员出勤-间接 | `GET /attendance/attendanceSituation` | `positionType=indirect`、`shiftType`/`shiftTypeName`、`schedulePersonCount`、`actualAttendancePersonCount` | 只汇总当前时间对应班次的间接人员应出勤/实际出勤和出勤率；早班 06:30-14:30，中班 14:30-22:30，晚班 22:30-次日 06:30。 |
| 入库实绩 | `GET /schedule/getRukuPlan`、`GET /schedule/getRukuShiji` | `number` | 计划来自 `getRukuPlan`，实绩来自 `getRukuShiji`；取当月接口全量合计，**不按部门/工序过滤**（与入库计划实绩推移表口径不同），计算实绩/计划与达成率。此卡片不区分维度，后续按设备 id 访问为预留扩展点。 |
| 生产实际 | `GET /schedule/getPlan`、`GET /schedule/getOutput` | `number` | 计划来自 `getPlan`，实绩来自 `getOutput`；取当月接口全量合计，**不按部门/工序过滤**（与生产计划实绩推移表口径不同），计算实绩/计划与达成率。此卡片不区分维度。 |

> 参考图中的“※以上为实时数据”“※以上数据截止昨日”只作为刷新时机说明，本次组件不显示这两行。

## 生产线稼动情况

| 列 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 部门 | 页面状态、`selection.json` | `departmentId` | 部门维度显示当前部门名称；工序维度显示当前工序所属部门名称。 |
| 工序 | `selection.json` | `processId`、label | 部门维度每个工序一行；工序维度只显示当前工序一行。 |
| 总台数 | `GET /device/realtime/list` + 地图设备范围 | 设备记录数 | 按当前部门或工序设备编码过滤后计数。 |
| 稼动台数 | 同上 | `actualStatus`、`deviceStatus` 等状态字段 | 除计划停止外均计入稼动台数；异常状态同时计入稼动台数和异常台数。 |
| 异常台数 | 同上 | 状态字段 | 状态匹配异常/报警/故障时计入。 |
| 计划停止台数 | 同上 | 状态字段 | 状态匹配计划停止/停止时计入。 |

## 人员出勤情况

| 字段 | 接口 | 后端字段 | 当前处理 |
| --- | --- | --- | --- |
| 班次 | `GET /attendance/attendanceSituation` | `shiftTypeName`、`shiftType` | 映射为早班、夜班、正常班和合计。 |
| 间接+直接在籍 | 同上 | `schedulePersonCount` | 前端派生为本行间接总在籍 + 直接在籍合计。 |
| 间接班长在籍、间接班长出勤 | 同上 | `positionType=indirect` 或 `positionName` 包含 `班长`、`schedulePersonCount`、`actualAttendancePersonCount` | 班长按间接口径展示；若接口把班长标为 direct，前端仍归入间接。 |
| 直接在籍细分 | 同上 | `positionType=direct`、`positionName`、`schedulePersonCount` | 直接人员排除班长；按 `positionName` 关键词拆分组长、派遣、临时、顶岗；剩余计入正式工。 |
| 实际出勤人数 | 同上 | `actualAttendancePersonCount` | 汇总直接人员实际出勤，班长不计入直接出勤。 |
| 出勤率 | 同上 | 由前端计算 | `直接实际出勤 / 直接在籍合计`。 |

## 人员明细及状态

| 列 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 班次、工号、姓名、职务、工种 | `GET /attendance/attendanceDetailSituation` | `shiftName`、`workNo`、`name`、`positionName`、`workTypeName` | 直接展示或按空值兜底。 |
| 出勤情况 | 同上 | `attendanceSituation` | 原样显示接口返回文本，不做关键词映射。 |
| 出勤状态 | 同上 | `attendanceStatus` | 原样显示接口返回文本，不再做关键词映射。 |
| 能力 | 同上 | `ability` | 映射为 A/B/C，缺失时默认 B。 |
| 工时 | 同上 | `workHourList[].workHourType`、`workHourList[].workHour` | 拼接为单列文本。 |

## 出勤率推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 间接在籍人数 | `GET /attendance/monthlyAttendanceSituation` | `indirectSchedulePersonCount` | 后端按日返回，前端按月/周/日聚合，聚合值取有效日平均。 |
| 直接在籍人数 | 同上 | `directSchedulePersonCount` | 同上。 |
| 直接出勤人数 | 同上 | `directAttendancePersonCount` | 日列直接展示；月/周聚合取平均时剔除直接出勤人数为 0 的日，分母为直接出勤人数不为 0 的天数。 |
| 直接实际出勤率 | 同上 | `directAttendanceRate` 或前端聚合计算 | 日列直接按当天值计算；月/周聚合时剔除直接出勤人数为 0 的日，再用 `直接出勤合计 / 直接在籍合计`。 |
| 利计出勤率 | 前端固定值 | 无接口字段 | 固定 91.0%；表格只在月列显示一个值，chart 显示 91.0% 红色目标线，并在线末端标注 `91%`。 |

显示规则：月、周人数聚合显示为整数；百分比统一显示一位小数。

## 入库计划实绩推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 计划入库数 | `GET /schedule/getRukuPlan` | `date`、`number`、`dept`、`customer` | 按当前部门过滤后按日读取，并按月/周/日聚合；当前接口已有数据，但存在 `dept` 缺失或为 `0` 的未归属记录，前端不计入部门口径。 |
| 实绩入库数 | `GET /schedule/getRukuShiji` | `date`、`shebei`、`number`、`dept`、`banci`、`custName` | 按当前部门过滤后按日读取，并按月/周/日聚合；当前接口已有数据。 |
| 实绩计划差 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 - 计划`。 |
| 入库达成率 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 / 计划`。 |

显示规则：部门维度和工序维度均展示；制造1课以及制造1课下的前处理1/前处理2不展示。工序维度因 `getRukuPlan` 暂无 `processType` 或设备字段，入库计划实绩口径为当前工序所属部门。表格保留月列，折线图不展示月列。

## 生产计划实绩推移表

| 行 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 计划生产数 | `GET /schedule/getPlan` | `number`、`workDate`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合。 |
| 实绩生产数 | `GET /schedule/getOutput` | `number`、`date`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合；无记录时显示为空。 |
| 合格数、不良数、抽样数 | 无稳定匹配字段 | 无 | 本次不展示。 |
| 实绩计划差 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 - 计划`。 |
| 生产达成率 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 / 计划`。 |

显示规则：仅工序维度展示。表格保留月列，折线图不展示月列。

## 未接入或空置字段

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 不良率金额、个数 | 未展示 | `GET /schedule/getRejects` 当前返回空数组，且本次页面结构已移除旧不良卡片。 |
| MH 实绩 | 未展示 | 用户本次要求的右侧组件中不包含旧 MH 卡片。 |
| 入库计划工序过滤 | 部分受限 | `getRukuPlan` 目前只有 `dept`，没有 `shebei` 或 `processType`，工序维度入库计划实绩按所属部门口径聚合。 |
