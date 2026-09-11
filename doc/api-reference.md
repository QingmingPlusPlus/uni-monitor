# 后端接口参考

核验日期：2026-09-11。来源：[Swagger UI](http://123.57.81.179:8080/swagger-ui/index.html)、[OpenAPI JSON](http://123.57.81.179:8080/v3/api-docs)（可视化自研接口 1.0，OAS 3.0）及下述只读请求。共 22 个端点，包含 21 个 GET 和 1 个 POST。前端访问层与接入状态见 [API 模块](api-module.md)，页面口径见 [字段映射](factory-dashboard-real-data-mapping.md)，未解决问题见 [接口缺口](department-api-gaps.md)。

## 阅读约定

- **声明**：来自 Swagger；不等于实际返回已经验证。
- **实测**：来自本次请求的 JSON 类型与字段集合；仅代表所列样本，不能据此保证所有记录必填、所有月份有值或枚举完整。
- **推测**：根据字段名称和样本推断业务含义，待后端确认。
- `null`、字段缺失和空数组分别记录。仅观察到 `null` 或 `[]` 时，不推断其非空值类型。
- 下文 `number` 表示 JSON 数值；Swagger 的 `integer/int64` 单独注明。大整数 ID 不应仅按 Swagger 转为 JavaScript number。
- 文档不保存账号密码、认证头、人员明细或客户实际数据；只保留字段、类型和汇总样本信息。

## 访问与公共响应

服务地址为 `http://123.57.81.179:8080`。本文端点不含 `/api`；前端请求 `/api/<端点>`，开发代理移除 `/api` 后转发。

Swagger 文档需要 HTTP Basic 认证。本次业务 GET 请求不带该认证头可以访问；把文档的 Basic 认证头带到业务接口时，观察到 HTTP 500、`code="B0301"`、TOKEN 解析失败。文档认证与业务 Token 机制不能混用，该现象不代表其他环境也免认证。

Swagger 成功响应媒体类型标为 `*/*`，实际成功查询为 `application/json`。schedule 参数说明中的“JSON 对象字符串”也不准确：本次 `data` 直接是数组，不需要再次 `JSON.parse`。

| 字段 | 声明/实测类型 | 说明 |
| --- | --- | --- |
| `success` | boolean | 业务成功标记；HTTP 200 仍可能为 false。 |
| `code` | string | 实测成功码有 `200`、`00000`；不能只认可其中一个。 |
| `message` | string | 响应描述。 |
| `data` | 端点对应类型，失败可能为 null 或缺失 | 成功空数组不同于请求失败。 |

Swagger 的 HTTP 500 响应允许字符串或错误对象。本次还观察到 HTTP 200、`success=false`、`code="B0001"` 且无业务数据的设备统计结果。API 层目前没有统一业务错误拦截；消费方需要区分 HTTP 错误、业务失败和成功空数据。

## 查询参数一览

所有下列参数均在 query 中，Swagger 类型均为 string。`必填` 严格对应 Swagger 的 `required=true`，未标注则为可选；可选不代表已验证省略后的行为。日期使用 `yyyy-MM-dd`，月份 `yyyy-MM`，年份 `yyyy`。

考勤的 `department` 表示科室 `1`–`4`；`processType` 为 `preprocessing`（前处理）、`sulfur_addition`（加硫）、`post_processing`（后处理）。设备接口使用 `departmentId`，不能直接替换为考勤参数名。

| 方法与端点 | 参数 | 成功 data |
| --- | --- | --- |
| GET `/attendance/monthlyAttendanceSituation` | `month` 必填；`department`、`processType` 可选 | 月度出勤数组 |
| GET `/attendance/monthlyWorkhourSituation` | `month` 必填；`department`、`processType` 可选 | 月度工时数组 |
| GET `/attendance/attendanceSituation` | `date`、`department`、`processType` 可选 | 实时考勤数组 |
| GET `/attendance/attendanceDetailSituation` | `date`、`department`、`processType` 可选 | 人员明细数组 |
| GET `/attendance/twoDayAttendancePerformance` | `dataDate`、`reportDate` 必填；`department`、`processType` 可选 | `{ monitorNames, rows }` |
| GET `/basic/month-segment/base-data` | `month` 必填 | 月分段配置数组 |
| GET `/schedule/getPlan` | `month` 必填 | 生产计划数组 |
| GET `/schedule/getOutput` | `month` 必填 | 生产实绩数组 |
| GET `/schedule/getDeviceload` | `month` 必填 | 开放对象数组，非空结构待验证 |
| GET `/schedule/getRukuPlan` | `month` 必填 | 入库计划数组 |
| GET `/schedule/getRukuShiji` | `month` 必填 | 入库实绩数组 |
| GET `/schedule/getRejects` | `month` 必填 | 开放对象数组，非空结构待验证 |
| GET `/schedule/getWorkhours` | `date`、`banci` 必填；班次声明为 `早` 或 `夜` | 设备工时类型数组 |
| GET `/schedule/getChangePoint` | 无 | 开放对象数组，本次失败 |
| GET `/device/realtime/list` | `deviceCode`、`deviceCodes`、`deviceCodeLike`、`factoryId`、`departmentId`、`processType` 可选 | 设备实时快照数组 |
| GET `/device/device/timeLine` | `deviceCode`、`queryDate` 可选 | 设备时间轴数组（声明） |
| GET `/device/availability/year` | `year`、`departmentId`、`processType`、`deviceCode` 可选 | 月度设备时长数组（声明） |
| GET `/device/availability/month` | `month`、`departmentId`、`processType`、`deviceCode` 可选 | 每日设备时长数组（声明） |
| GET `/device/availability/day` | `day`、`departmentId`、`processType`、`deviceCode` 可选 | 当日设备时长数组（声明） |
| GET `/device/availability/pauseRecords` | `deviceCode`、`queryDate` 可选；日期未传默认前一天（声明） | 暂停记录数组（声明） |
| GET `/visual/getValue` | `key` 必填 | string（声明），本次为 null |
| POST `/visual/saveMap` | JSON body 键值 Map，见下文 | boolean（声明，未执行写入） |

`deviceCodes` 是逗号分隔的最多 50 个设备编码；`deviceCode` 精确匹配单台，`deviceCodeLike` 模糊匹配。未验证同时传多个设备筛选条件时的优先级。时间轴路径中的双重 `/device/device/` 是服务端现有路径。

## schedule 实测字段

Swagger 对这 8 个接口统一使用 `ResponseDataListMapStringObject`，即 `data: Array<Record<string, unknown>>`。`additionalProp1/2/3` 是开放 Map 的自动示例，不是业务字段。以下清单来自完整响应数组的字段类型统计。

| 接口 | 实测数组元素字段 | 含义与边界 |
| --- | --- | --- |
| `getPlan` | `date: string`、`shebei: string`、`number: number`、`process: string`、`zhifan: string`、`banci: string`、`dept: string`、`mh: number` | 推测依次为生产日期、设备编码、计划数量、工序名称、制番、班次、部门、MH 相关值。`mh` 单位、粒度与算法尚未确认，不直接作为计划 MH 使用。 |
| `getOutput` | `date: string`、`shebei: string`、`number: number`、`zhifan: string`、`process: string`、`banci: string`、`dept: string` | 推测 `number` 为生产实绩数量。7 月样本没有 `mh`。 |
| `getRukuPlan` | `date: string`、`number: number`、`zhifan: string`、`dept: string 或 null`、`customer: string` | 推测为入库日期、计划数量、制番、部门、客户。未观察到 `shebei`、`banci`、`process` 或 `processType`；仍无法严格分配到工序。 |
| `getRukuShiji` | `date: string`、`shebei: string`、`number: number`、`zhifan: string`、`banci: string`、`cusCode: string`、`dept: string`、`custName: string` | 推测 `number` 为入库实绩数量，`cusCode/custName` 为客户编码/名称；无明确工序字段。 |
| `getWorkhours` | `shebei: string`、`type: string` | 样本只有设备编码与类型；9 月早班观察到字符串 `0`、`1`，枚举含义待确认。没有工时数值、日期、班次或部门字段；查询日期和班次只来自入参。 |
| `getDeviceload` | 本次只有 `[]` | 无法从本次样本确认元素类型。仓库已有 `devCode`、`devName`、`fuhe` 类型定义，仅作为历史前端契约保留。 |
| `getRejects` | 本次只有 `[]` | 无法确认不良数量、金额或计划/实绩结构。现有 `date/banci/shebei/number/zhifan` 为前端类型，未获本次实测确认。 |
| `getChangePoint` | 本次 HTTP 500 | 无成功数据，不能验证 `device/type/change/varify` 等历史字段；不从错误 SQL 推导成功契约。 |

计划 7 月、9 月样本均使用 `date`，未观察到 `workDate`。`process` 是业务工序名称，不能直接当成 `processType` 枚举。`banci` 观察到 `早`、`夜`，不是完整枚举保证。入库计划 7 月 3012 条中 `dept` 有 1193 条为 null；有字段但值为 null 不应写成字段不存在，也不能归到任意部门。

## 考勤字段

下表除特别标注外已取得非空记录并确认 JSON 类型；统计含义和百分比单位来自 Swagger。

| data 元素/对象 | 字段与类型 | 说明 |
| --- | --- | --- |
| 月度出勤 | `statDate: string`；`directSchedulePersonCount`、`indirectSchedulePersonCount`、`directAttendancePersonCount`、`directAttendanceRate: number` | 日期、直接计划人数、间接排班人数、直接实际人数、直接出勤率（%）。 |
| 月度工时 | `statDate: string`；`directPlanWorkhours`、`directActualWorkhours`、`directWorkhourRate: number` | 直接计划/实际工时（小时）、工时达成率（%）；不能混同于 schedule 的工时类型查询。 |
| 实时考勤 | `shiftType`、`shiftTypeName`、`positionId`、`positionName`、`positionType: string`；`schedulePersonCount`、`actualAttendancePersonCount: number` | `positionId` 声明 integer/int64，实测 string。`positionType` 声明 direct/indirect。 |
| 人员明细 | `shiftName`、`account`、`realName`、`positionName`、`workTypeName`、`attendanceSituation`、`attendanceStatus: string`；`ability: string 或 null`；`workHourList: WorkHour[] 或 null` | 6 月非空样本中 `ability` 部分为 null；`workHourList` 全部为 null，数组元素仅声明，尚未实测。工号/姓名为 `account/realName`。 |
| `WorkHour`（仅声明） | `workHourType: string`、`workHour: string` | 工时数值声明为字符串，不能仅按名称改为 number。 |
| 两日出勤 data | `monitorNames: string[]`（元素仅声明，本次空）；`rows: TwoDayAttendancePerformanceRow[]` | 班长名单和直接人员统计行；不是 `/daily-report/attendance` 的 `{meta, rows}`。 |
| 两日出勤 row | `statDate`、`reportDate`、`shiftType`、`shiftName: string`；以下均为 number：`onRollCount`、`actualAttendanceCount`、`attendanceRate`、`absenceCount`、`annualLeaveCount`、`nursingLeaveCount`、`sickLeaveCount`、`personalLeaveCount`、`otherLeaveCount`、`absenteeismCount` | 在籍、实绩出勤、出勤率（%）、缺勤及年假/陪护/病假/事假/其他/旷工。 |

两日出勤本次返回 3 行，不据此固定所有请求的班次数量、日期分组方式或报告日截取规则。月度接口有 30 行只表示返回了日期记录，不代表每天已有有效实绩。

## 月分段字段

| 字段 | 声明结合实测的类型 | 说明 |
| --- | --- | --- |
| `id` | string 或 null | 配置 ID；9 月未配置样本为 null。 |
| `departmentId`、`processType` | string | 部门与工序，使用复合键匹配。 |
| `segments` | Segment[] 或 null | 9 月 6 个组合均为 null，6 月 6 个组合均有数组。不能假定全部部门/工序组合都有记录。 |
| `segments[].segmentIndex`、`startDay`、`endDay` | number（声明 integer/int32） | 分段序号、起始日、结束日；6 月样本共 24 个分段。 |

## 设备实时字段

`GET /device/realtime/list?deviceCode=3301` 返回 1 条设备及 1 条在线人员，生产任务数组为空。以下字段均属于数组元素。

| 对象 | 字段与类型 | 验证边界 |
| --- | --- | --- |
| 设备 | `deviceId: string` | 实测字符串，Swagger 声明 integer/int64。 |
| 设备 | `deviceCode`、`deviceName`、`deviceType`、`deviceTypeName`、`factoryId`、`departmentId`、`departmentName`、`processType`、`processTypeName`、`procedureName`、`scheduleMode`、`deviceStatus`、`deviceStatusName`、`actualStatus`、`actualStatusName: string` | 此样本为字符串，不排除其他设备为空；前端已有部分可空类型应保留。 |
| 设备 | `deviceParseType`、`deviceParseTypeName: string 或 null` | 本次均 null；非空字符串来自声明。前者为暂停类型 ID，后者为名称，不保证 ID 就是 `CUT` 等语义枚举。 |
| 设备 | `onlinePersonList: OnlinePerson[]`、`productionTaskList: ProductionTask[]` | 人员元素已实测；任务元素仅声明。 |
| 在线人员 | `recordId`、`employeeId: string` | 实测字符串，Swagger 均声明 integer/int64。 |
| 在线人员 | `employeeName`、`employeeNumber`、`onlineTime`、`onlineStatusName`、`operationDeviceLevel`、`operationDeviceLevelName`、`employeePauseStatusName: string` | 时间声明 date-time，未验证统一时区；不保存真实姓名/工号。 |
| 在线人员 | `onlineStatus`、`employeePauseStatus: number` | 声明 integer/int32；人员暂停状态声明 0 否、1 是。 |
| 在线人员 | `employeePauseTypeName`、`employeePauseStartTime: string 或 null` | 本次 null；字符串与 date-time 来自声明。 |
| 生产任务（仅声明） | `id: integer/int64`；`planId`、`productionNumber`、`planStatusDesc`、`actualStartTime`、`completionRate: string`；`planStatus`、`targetCount`、`actualCount: integer/int32` | 前端把 `id` 定义为 string，但本次无非空任务验证；不要推广其他 ID 的实测结论。完成率声明为 string。 |

## 设备历史与时长字段（仅声明）

这些端点本次未得到成功业务数据，以下字段全部来自 Swagger。可空性、ID 的实际 JSON 类型、时间格式和时区仍待验证。

| 对象 | 字段与声明类型 | 说明 |
| --- | --- | --- |
| 时长统计 | `deviceId: integer/int64`；`deviceCode`、`deviceName`、`departmentId`、`departmentName`、`processType`、`processTypeName`、`period: string`；`totalRunHours`、`obstructionHours: number/double` | 年/月/日接口共用结构，时长单位小时；`period` 的实际格式待成功样本确认。设备阻碍不能直接视作已去重的生产线阻碍。 |
| 暂停记录 | `id`、`deviceId: integer/int64`；`deviceCode`、`deviceName`、`pauseType`、`pauseTypeName`、`startTime`、`endTime`、`shiftDate: string`；`durationMinutes`、`operationStatus: integer/int32` | 起止时间声明 date-time，时长为分钟；状态声明 1 暂停中、2 已恢复。 |
| 时间轴 | `deviceId: integer/int64`；`deviceCode`、`deviceName`、`departmentId`、`departmentName`、`processType`、`processTypeName`、`triggerTime`、`triggerType`、`startTime`、`endTime: string`；`extra: Extra[]` | 三个时间字段声明 date-time。触发类型说明包括任务开始/结束/暂停/恢复、人员上下岗，未给稳定编码枚举。 |
| Extra | `filedKey: string`、`filedLabel: string`、`filedValue: object` | `filed` 为 Swagger 原始拼写；不要自行改成 `field`。值为开放对象，具体形态待验证。 |

当前 `src/api/deviceAvailability.ts` 的暂停字段 `pauseReason/reason/status` 及部分时间、时长别名不是这次 Swagger 的字段；后端声明的是 `pauseTypeName/operationStatus/startTime/endTime/durationMinutes`。需另行校正适配与类型，本文更新不代表运行时代码已修复。

## 可视化配置

- `GET /visual/getValue?key=demoKey` 本次成功返回 `data=null`；非空字符串内容尚未验证。前端的 `parseVisualConfigValue` 会尝试解析字符串，失败则保留原字符串。
- `POST /visual/saveMap` 的文字声明是持久化 body 中所有键值对，返回 `ApiResponse<boolean>`；但 OpenAPI 未定义 `requestBody`，没有可验证的键值 schema。项目封装为 `Record<string, unknown>`。本次未调用该写入接口，不能把前端封装当成实测契约。

## 只读核验记录

以下均为 2026-09-11 的样本结果；数量用于追溯类型依据，不是持续监控状态或业务总量承诺。未保存原始业务响应。除明确失败外，结果均为 HTTP 200、`success=true`。

| 端点/参数 | 结果 |
| --- | --- |
| `getPlan`，month=2026-09 / 2026-07 | 5340 / 1105 条，均有数值 `mh`。 |
| `getOutput`，month=2026-09 / 2026-07 | 0 / 9 条。 |
| `getRukuPlan`，month=2026-09 / 2026-07 | 0 / 3012 条；7 月 `dept=null` 1193 条。 |
| `getRukuShiji`，month=2026-09 / 2026-07 | 0 / 8 条。 |
| `getDeviceload`、`getRejects`，各查 month=2026-09、2026-07、2026-05 | 均为空数组；不能判定其他月份永远无数据。 |
| `getWorkhours`，date=2026-09-10、banci=早；date=2026-07-01、banci=夜 | 137 / 68 条，只有 `shebei/type`。 |
| `getChangePoint`，无参数 | HTTP 500、B0001；缺列错误，无成功响应。 |
| `monthlyAttendanceSituation`、`monthlyWorkhourSituation`，month=2026-09、department=1、processType=preprocessing | 各 30 条。 |
| `attendanceSituation`，date=2026-09-10、department=1、processType=preprocessing | 24 条，`positionId` 均为 string。 |
| `attendanceDetailSituation`，date=2026-09-10 / 2026-06-26、department=1、processType=preprocessing | 0 / 73 条；6 月 `ability` 63 条 null，`workHourList` 全为 null。 |
| `twoDayAttendancePerformance`，dataDate=2026-09-10、reportDate=2026-09-11、department=1、processType=preprocessing | 对象；`monitorNames=[]`，`rows` 3 条。 |
| `base-data`，month=2026-09 / 2026-06 | 各 6 条；9 月配置空，6 月分段总计 24 条。 |
| `realtime/list`，deviceCode=3301 | 1 条设备，1 条在线人员，0 条生产任务。 |
| `timeLine`、`pauseRecords`，deviceCode=3301、queryDate=2026-09-10 | HTTP 500、B0001；缺表错误，无成功响应。 |
| `availability/day`，deviceCode=3301、day=2026-09-10 | HTTP 200、success=false、B0001，无业务数据。 |
| `availability/month`，deviceCode=3301、month=2026-09 | HTTP 200、success=false、B0001，无业务数据。 |
| `availability/year`，deviceCode=3301、year=2026 | HTTP 200、success=false、B0001，无业务数据。 |
| `visual/getValue`，key=demoKey | 成功，data=null。 |

可使用不含凭据的查询命令复核，例如 `curl "http://123.57.81.179:8080/schedule/getWorkhours?date=2026-09-10&banci=%E6%97%A9"`。空数组和失败端点需等有效数据/后端恢复后重新核验，不能根据 Swagger 自动示例补造字段。
