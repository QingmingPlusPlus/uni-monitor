# 后端接口参考

## 2026-09-22 日报不良字段与日期查询

根据用户转述的后端确认，`getRejects` 的month必填，新增可选date（YYYY-MM-DD），省略date查询整月；`yuanyin`为现象名称、`number`为对应数量，仅type=不良计入不良分子和现象。前端日报已传month+date，并按日期隔离共享请求；通用月封装保持只传month的兼容行为。数量兼容number/string，日报显式校验十进制非负安全整数。

本次使用文档认证读取在线Swagger成功，getRejects仍只声明month，文字示例尚无yuanyin；新增字段与参数的依据是用户提供的后端说明。业务只读GET `month=2026-09`、`month=2026-09&date=2026-09-21`、`month=2026-07&date=2026-07-01` 均success=true、data=[]。已确认带date请求可成功，但非空字段和日期筛选效果尚无样本验证，不将空数据当作字段缺失。下文旧日期记录为历史核验结果。

> 2026-09-20 实测 `getChangePoint?progress=` 在省略 `dept/process/beginDate/endDate/banci` 时成功返回2条记录；Swagger仍把六个参数全部标为必填，声明与运行时不一致。地图保持用户确认的全范围查询及 `status=0` 筛选。新日期/班次参数仅核对声明，尚未验证筛选行为。

核验日期：2026-09-20（保留9月11日、14日的历史结果，未重测的接口不推断当前可用性）。来源：[Swagger UI](http://123.57.81.179:8080/swagger-ui/index.html)、[OpenAPI JSON](http://123.57.81.179:8080/v3/api-docs)（可视化自研接口 1.0，OAS 3.0）及下述只读请求。共25个端点，包含24个GET和1个POST。前端访问层与接入状态见 [API 模块](api-module.md)，页面口径见 [字段映射](factory-dashboard-real-data-mapping.md)，未解决问题见 [接口缺口](department-api-gaps.md)。

## 2026-09-21 生产日报口径更新

生产区按用户确认：上表使用 `zhifan`，设备即产线；流动=`ΣgetOutput.number`，废弃=`ΣgetRejects.number`全部类型，不良仅type=不良，合格=流动+明确非不良，实绩=流动+废弃。成功且范围完整的不良空数组或分组无记录按0；品质区已同步相同数量公式及空值规则，并读取设备日报补充产线名称。计划停止列略过，availabilityRate/ratio直接显示数值，不换算或追加百分号。上述事项无需新增接口，详见[制造日报](daily-report.md)。

只读GET复核：9月计划5775条、实绩0条、不良0条；7月计划1105条、实绩9条、不良0条。7月1日制造3课后处理设备日报59台，时间与可动率全0、阻碍数组全空。计划/实绩/设备字段集合与已有记录一致。在线Swagger返回401，声明继续参考9月20日快照；本次不要求取得非空不良样本。

## 2026-09-20 更新

- 实时契约与仓库已有 [9月20日快照](swagger/openapi-2026-09-20.json) 内容一致，保留原文件；与9月16日快照比较，只有 `getChangePoint` 操作发生变化，端点数量及components schemas未变。
- `getChangePoint` 新增查询 `beginDate/endDate/banci`，描述补齐返回 `banci/endDate/status`；省略范围参数的查询成功，不能把Swagger required当成已验证的运行时要求。
- 两日出勤和设备 `day/report` 已恢复成功，不再沿用9月14日超时结论。两日出勤分类出现小数0.5、1.5，前端改为保留原值；存在在籍0但实绩29、分类合计与缺勤总数不一致等数据质量问题。
- `day/report.deviceId` 实测为string；三个设备样本有35/59/56条记录，但时间、可动率全0，`obstructionItems`全空。不能据此确认采集完整性、非零比率尺度或阻碍项运行时结构。
- 9月生产实绩仍空；7月实绩9条，5月2条；不良5/7/9月均空。独立合格数、流动数、模具关联、不良现象、班次状态、源更新时间等仍未提供。完整缺口见 [制造日报](daily-report.md)。

## 2026-09-14 更新

- 新增三个 Swagger 端点：`/schedule/getShijiByDate`（标记“未完成”）、`/device/availability/month/daily-net`（实绩 MH）、`/device/availability/day/report`（日报设备可动率）。访问层已补齐三个新接口及此前未封装的月度工时、两日出勤、时间轴、设备月/年统计，共覆盖全部 25 个已发布端点。
- `getChangePoint` 已恢复成功，8 条记录确认新字段，地图和 mock 已同步。`getWorkhours.type` 的 Swagger 文字说明已明确 `1` 半圆形、`0` 扇形，实测类型仍为 string。
- `getRejects` 文字示例增加 `type`（示例“不良”），并说明日报废弃数为“不良+其它”；多月查询仍为空，枚举完整性、非空字段类型尚未验证。日报仅对运行时已明确的分类按此求和，缺分类或空记录保留缺失；看板质量卡片保持既有口径。
- 设备日/月/年统计增加可选 `deviceId`；新 daily-net、day/report 只有 `deviceCode`，不要向这两个接口扩散 `deviceId` 参数。
- 2026-09-14 考勤、月分段和设备 GET 均在 25 秒内未获得响应；daily-net 追加 55 秒重试仍超时。超时不能推导空数组、业务错误码或字段变更。下文这些域的非空实测仍来自 2026-09-11；新增设备结构仅来自本次 Swagger。

## 阅读约定

- **声明**：来自 Swagger；不等于实际返回已经验证。
- **实测**：来自本次请求的 JSON 类型与字段集合；仅代表所列样本，不能据此保证所有记录必填、所有月份有值或枚举完整。
- **推测**：根据字段名称和样本推断业务含义，待后端确认。
- `null`、字段缺失和空数组分别记录。仅观察到 `null` 或 `[]` 时，不推断其非空值类型。
- 下文 `number` 表示 JSON 数值；Swagger 的 `integer/int64` 单独注明。大整数 ID 不应仅按 Swagger 转为 JavaScript number。
- 文档不保存账号密码、认证头、人员明细或客户实际数据；只保留字段、类型和汇总样本信息。

## 访问与公共响应

服务地址为 `http://123.57.81.179:8080`。本文端点不含 `/api`；前端请求 `/api/<端点>`，开发代理移除 `/api` 后转发。

Swagger 文档需要 HTTP Basic 认证。本次业务 GET 请求不带该认证头可以访问；2026-09-11 将文档的 Basic 认证头带到业务接口时，观察到 HTTP 500、`code="B0301"`、TOKEN 解析失败。文档认证与业务 Token 机制不能混用，该现象不代表其他环境也免认证。

Swagger 成功响应媒体类型标为 `*/*`，实际成功查询为 `application/json`。schedule 参数说明中的“JSON 对象字符串”也不准确：本次 `data` 直接是数组，不需要再次 `JSON.parse`。

| 字段 | 声明/实测类型 | 说明 |
| --- | --- | --- |
| `success` | boolean | 业务成功标记；HTTP 200 仍可能为 false。 |
| `code` | string | 实测成功码有 `200`、`00000`；不能只认可其中一个。 |
| `message` | string | 响应描述。 |
| `data` | 端点对应类型，失败可能为 null 或缺失 | 成功空数组不同于请求失败。 |

Swagger 的 HTTP 500 响应允许字符串或错误对象。2026-09-11 还观察到 HTTP 200、`success=false`、`code="B0001"` 且无业务数据的设备统计结果。API 层目前没有统一业务错误拦截；消费方需要区分 HTTP 错误、业务失败和成功空数据。

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
| GET `/schedule/getShijiByDate` | `date`、`device` 必填 | 开放对象数组；两次实测为空，服务端标记未完成 |
| GET `/schedule/getOutput` | `month` 必填 | 生产实绩数组 |
| GET `/schedule/getDeviceload` | `month` 必填 | 开放对象数组，非空结构待验证 |
| GET `/schedule/getRukuPlan` | `month` 必填 | 入库计划数组 |
| GET `/schedule/getRukuShiji` | `month` 必填 | 入库实绩数组 |
| GET `/schedule/getRejects` | `month` 必填；`date` 可选（2026-09-22后端说明，Swagger尚未补录） | 开放对象数组，yuanyin为现象、number为数量，非空结构待验证 |
| GET `/schedule/getWorkhours` | `date`、`banci` 必填；班次声明为 `早` 或 `夜` | 设备工时类型数组 |
| GET `/schedule/getChangePoint` | Swagger将 `dept/process/beginDate/endDate/banci/progress` 均标为必填；本次仅传 `progress=` 也成功 | 变化点数组，返回描述补齐班次、解除日期、状态 |
| GET `/device/realtime/list` | `deviceCode`、`deviceCodes`、`deviceCodeLike`、`factoryId`、`departmentId`、`processType` 可选 | 设备实时快照数组 |
| GET `/device/device/timeLine` | `deviceCode`、`queryDate` 可选 | 设备时间轴数组（声明） |
| GET `/device/availability/year` | `year`、`departmentId`、`processType`、`deviceCode`、`deviceId` 可选 | 月度设备时长数组（声明） |
| GET `/device/availability/month` | `month`、`departmentId`、`processType`、`deviceCode`、`deviceId` 可选 | 每日设备时长数组（声明） |
| GET `/device/availability/day` | `day`、`departmentId`、`processType`、`deviceCode`、`deviceId` 可选 | 当日设备时长数组（声明） |
| GET `/device/availability/pauseRecords` | `deviceCode`、`queryDate` 可选；日期未传默认前一天（声明） | 暂停记录数组（声明） |
| GET `/device/availability/month/daily-net` | `month`、`departmentId`、`processType`、`deviceCode` 可选 | 每日净工时数组（声明） |
| GET `/device/availability/day/report` | `day`、`departmentId`、`processType`、`deviceCode` 可选 | 日报设备可动率数组（9月20日非空设备列表已验证） |
| GET `/visual/getValue` | `key` 必填 | string（声明），本次为 null |
| POST `/visual/saveMap` | JSON body 键值 Map，见下文 | boolean（声明，未执行写入） |

`deviceCodes` 是逗号分隔的最多 50 个设备编码；`deviceCode` 精确匹配单台，`deviceCodeLike` 模糊匹配。未验证同时传多个设备筛选条件时的优先级。时间轴路径中的双重 `/device/device/` 是服务端现有路径。

## schedule 实测字段

Swagger 对这 9 个接口统一使用 `ResponseDataListMapStringObject`，即 `data: Array<Record<string, unknown>>`。`additionalProp1/2/3` 是开放 Map 的自动示例，不是业务字段。以下清单来自完整响应数组的字段类型统计。

| 接口 | 实测数组元素字段 | 含义与边界 |
| --- | --- | --- |
| `getPlan` | `date: string`、`shebei: string`、`number: number`、`process: string`、`zhifan: string`、`banci: string`、`dept: string`、`mh: number` | 推测依次为生产日期、设备编码、计划数量、工序名称、制番、班次、部门、计划 MH。2026-09-11 用户确认 `mh` 为该条记录的计划 MH，按周期直接求和，不再通过能力或提高基础数推算。 |
| `getOutput` | `date: string`、`shebei: string`、`number: number`、`zhifan: string`、`process: string`、`banci: string`、`dept: string` | 推测 `number` 为生产实绩数量。7 月样本没有 `mh`。 |
| `getRukuPlan` | `date: string`、`number: number`、`zhifan: string`、`dept: string 或 null`、`customer: string` | 推测为入库日期、计划数量、制番、部门、客户。未观察到 `shebei`、`banci`、`process` 或 `processType`；仍无法严格分配到工序。 |
| `getRukuShiji` | `date: string`、`shebei: string`、`number: number`、`zhifan: string`、`banci: string`、`cusCode: string`、`dept: string`、`custName: string` | 推测 `number` 为入库实绩数量，`cusCode/custName` 为客户编码/名称；无明确工序字段。 |
| `getWorkhours` | `shebei: string`、`type: string` | 样本只有设备编码与类型；历史样本观察到字符串 `0`、`1`，2026-09-14 Swagger 已说明分别为扇形、半圆形。没有工时数值、日期、班次或部门字段；查询日期和班次只来自入参。 |
| `getDeviceload` | 本次只有 `[]` | 无法从本次样本确认元素类型。`devName`、`fuhe` 有 Swagger 文字示例，`fuhe` 示例为 string 小数比例；保留 number|string 兼容及历史 `devCode`，非空类型待验证。加硫仅按设备类型汇总，不能假设每行都对应具体设备。 |
| `getRejects` | 本次只有 `[]` | 无法确认不良数量、金额或计划/实绩结构。现有 `date/banci/shebei/number/zhifan` 为前端兼容类型，新增可选 `type` 来自 Swagger 文字示例，均未获本次非空实测确认。 |
| `getChangePoint` | 2026-09-14 实测均为 string：`pid`、`date`、`factory`、`process`、`device`、`type`、`changePointContent`、`potentialRisk`、`implMethod`、`implResult`、`respPerson`、`reviewer`、`notes` | 声明另允许 `device=null`，表示非设备关联；`factory` 不是 `dept`。旧 `change/varify/respStaff/confStaff/effect` 不再作为后端字段。 |
| `getShijiByDate` | 两次均为 `[]` | 保持 `Record<string, unknown>`，不把月度实绩结构套到本接口。 |

计划 7 月、9 月样本均使用 `date`，未观察到 `workDate`。`process` 是业务工序名称，不能直接当成 `processType` 枚举。`banci` 观察到 `早`、`夜`，不是完整枚举保证。入库计划 7 月 3012 条中 `dept` 有 1193 条为 null；有字段但值为 null 不应写成字段不存在，也不能归到任意部门。

## 考勤字段

两日出勤在2026-09-20重验成功，分类统计可为小数；其他考勤端点下表类型仍来自2026-09-11（9月14日重查超时）。统计含义和百分比单位来自Swagger。

| data 元素/对象 | 字段与类型 | 说明 |
| --- | --- | --- |
| 月度出勤 | `statDate: string`；`directSchedulePersonCount`、`indirectSchedulePersonCount`、`directAttendancePersonCount`、`directAttendanceRate: number` | 日期、直接计划人数、间接排班人数、直接实际人数、直接出勤率（%）。 |
| 月度工时 | `statDate: string`；`directPlanWorkhours`、`directActualWorkhours`、`directWorkhourRate: number` | 直接计划/实际工时（小时）、工时达成率（%）；不能混同于 schedule 的工时类型查询。 |
| 实时考勤 | `shiftType`、`shiftTypeName`、`positionId`、`positionName`、`positionType: string`；`schedulePersonCount`、`actualAttendancePersonCount: number` | `positionId` 声明 integer/int64，实测 string。`positionType` 声明 direct/indirect。 |
| 人员明细 | `shiftName`、`account`、`realName`、`positionName`、`workTypeName`、`attendanceSituation`、`attendanceStatus: string`；`ability: string 或 null`；`workHourList: WorkHour[] 或 null` | 6 月非空样本中 `ability` 部分为 null；`workHourList` 全部为 null，数组元素仅声明，尚未实测。工号/姓名为 `account/realName`。 |
| `WorkHour`（仅声明） | `workHourType: string`、`workHour: string` | 工时数值声明为字符串，不能仅按名称改为 number。 |
| 两日出勤 data | `monitorNames: string[]`（9月20日页面非空名单已验证，未保存姓名）；`rows: TwoDayAttendancePerformanceRow[]` | 班长名单和直接人员统计行；日报已在页面层适配为显示模型，名单按日展示，未知班次完成状态不补造。 |
| 两日出勤 row | `statDate`、`reportDate`、`shiftType`、`shiftName: string`；以下均为 number：`onRollCount`、`actualAttendanceCount`、`attendanceRate`、`absenceCount`、`annualLeaveCount`、`nursingLeaveCount`、`sickLeaveCount`、`personalLeaveCount`、`otherLeaveCount`、`absenteeismCount` | 在籍、实绩出勤、出勤率（%）、缺勤及年假/陪护/病假/事假/其他/旷工。 |

两日出勤 2026-09-11 返回 3 行，不据此固定所有请求的班次数量、日期分组方式或报告日截取规则。月度接口有 30 行只表示返回了日期记录，不代表每天已有有效实绩。

## 月分段字段

非空与 null 样本均来自 2026-09-11；本次请求超时。

| 字段 | 声明结合实测的类型 | 说明 |
| --- | --- | --- |
| `id` | string 或 null | 配置 ID；9 月未配置样本为 null。 |
| `departmentId`、`processType` | string | 部门与工序，使用复合键匹配。 |
| `segments` | Segment[] 或 null | 9 月 6 个组合均为 null，6 月 6 个组合均有数组。不能假定全部部门/工序组合都有记录。 |
| `segments[].segmentIndex`、`startDay`、`endDay` | number（声明 integer/int32） | 分段序号、起始日、结束日；6 月样本共 24 个分段。 |

## 设备实时字段

2026-09-11 的 `GET /device/realtime/list?deviceCode=3301` 返回 1 条设备及 1 条在线人员，生产任务数组为空。以下字段均属于数组元素。

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

2026-09-14 已修正 `src/api/deviceAvailability.ts` 及设备详情适配：使用 `pauseTypeName/operationStatus/startTime/endTime/durationMinutes`，移除旧别名。新历史设备 ID 类型兼容 `string | number`，不是已确认服务端返回字符串；时间轴与暂停记录 `endTime` 允许 null 属于防御性兼容，非本次非空实测。

## 设备日报与净工时字段（2026-09-20）

| 对象 | 字段与声明类型 | 边界 |
| --- | --- | --- |
| 每日净工时 | `period: string`、`netHours: number/double` | Swagger 仅标记“实绩MH”；日期格式、班次归属、汇总范围尚未实测，不自行推导公式。 |
| 日报设备可动率 | `deviceId` 声明integer/int64、实测string；`deviceCode/deviceName/departmentId/departmentName/processType/processTypeName/day: string`；`totalRunHours/productionHours/obstructionHours/availabilityRate: number`；`obstructionItems: DeviceObstructionItem[]` | 本次返回非空设备列表，但数值全0、原因数组全空；可动率单位及分母不明确。 |
| 阻碍项 | `pauseType/pauseTypeName: string`；`obstructionHours/ratio: number/double`；`count: integer/int32` | ratio 单位及事件去重口径待确认。 |

按用户确认的卡片设备范围，daily-net 已接入部门与工序生产性卡片：netHours 直接作为实绩 MH，不自行推导公式；period 按有效日期并截止生产日处理。9月14日 month=2026-09、departmentId=4、processType=sulfur_addition 查询25秒超时（9月20日未重测），尚无非空实测，页面按失败保留空值。day/report 已通过日报适配层接入设备维度展示；原始比例不换算百分比，设备源失败仍显示计划实绩。前端不再请求未发布的 `/daily-report/*`。

## 可视化配置

- `GET /visual/getValue?key=demoKey` 在9月14日成功返回 `data=null`；非空字符串内容尚未验证。前端的 `parseVisualConfigValue` 会尝试解析字符串，失败则保留原字符串。
- `POST /visual/saveMap` 的文字声明是持久化 body 中所有键值对，返回 `ApiResponse<boolean>`；但 OpenAPI 未定义 `requestBody`，没有可验证的键值 schema。项目封装为 `Record<string, unknown>`。本次未调用该写入接口，不能把前端封装当成实测契约。

## 2026-09-20 只读核验记录

以下业务GET均未携带文档认证头，均HTTP200、success=true。仅保留数量、字段和聚合异常，不保存人员姓名、制番明细或凭据。文档认证成功不代表业务接口使用相同认证方式。

| 端点 | 参数 | 结果 |
| --- | --- | --- |
| `getPlan` | month=2026-09 / 2026-07 | 5775 / 1105条；number为JSON数值，字段集沿用历史记录 |
| `getOutput` | month=2026-09 / 2026-07 / 2026-05 | 0 / 9 / 2条；7月的8条在7月1日、1条在7月22日，均制造3课后处理（含出货检查包装） |
| `getRejects` | month=2026-09 / 2026-07 / 2026-05 | 均0条，不能认定不良为零 |
| `twoDayAttendancePerformance` | dataDate=2026-09-19，reportDate=2026-09-20，department=1，processType=preprocessing | 3行；9月19日夜班在籍0、实绩29；次日早班缺勤7，分类合计7.5（其他0.5） |
| `twoDayAttendancePerformance` | dataDate=2026-07-01，reportDate=2026-07-02，department=3，processType=post_processing | 3行；次日早班缺勤3，分类合计3.5（其他1.5） |
| `day/report` | day=2026-09-19，departmentId=1，processType=preprocessing | 35台设备 |
| `day/report` | day=2026-07-01，departmentId=3，processType=post_processing | 59台设备 |
| `day/report` | day=2026-09-18，departmentId=4，processType=sulfur_addition | 56台设备 |
| `getChangePoint` | 仅progress=空字符串 | 2条；实际含banci/endDate/status。未在本次验证日期/班次/状态筛选效果 |

三个 `day/report` 样本的totalRunHours、productionHours、obstructionHours、availabilityRate全部为0，obstructionItems全部为空。设备字段形态已验证，非零时间/原因与统计完整性未验证。出勤和设备成功码为 `00000`，schedule为 `200`。未调用POST保存接口；未重测的其他业务GET保留历史证据。

## 2026-09-11 历史只读核验记录

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

## 2026-09-14 只读核验记录

成功样本只保留字段类型和数量，不保存原始人员、客户或变化点内容。下表是实际请求结果；“超时”指客户端 25 秒截止，不代表服务器业务失败。

| 端点 | 查询条件 | 结果 |
| --- | --- | --- |
| `/schedule/getRukuPlan` | month=2026-09 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getOutput` | month=2026-09 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getRukuShiji` | month=2026-09 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getDeviceload` | month=2026-09 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getRejects` | month=2026-09 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getOutput` | month=2026-07 | HTTP 200，success=true，code=200，9 条 |
| `/schedule/getPlan` | month=2026-07 | HTTP 200，success=true，code=200，1105 条 |
| `/schedule/getRukuShiji` | month=2026-07 | HTTP 200，success=true，code=200，8 条 |
| `/schedule/getDeviceload` | month=2026-07 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getRejects` | month=2026-07 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getRukuPlan` | month=2026-07 | HTTP 200，success=true，code=200，3012 条 |
| `/schedule/getOutput` | month=2026-05 | HTTP 200，success=true，code=200，2 条 |
| `/schedule/getRukuPlan` | month=2026-05 | HTTP 500，success=false，code=B0001 |
| `/schedule/getRukuShiji` | month=2026-05 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getDeviceload` | month=2026-05 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getRejects` | month=2026-05 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getChangePoint` | 无 | HTTP 200，success=true，code=200，8 条 |
| `/schedule/getWorkhours` | date=2026-09-13，banci=早 | HTTP 200，success=true，code=200，0 条 |
| `/schedule/getPlan` | month=2026-05 | HTTP 200，success=true，code=200，1856 条 |
| `/schedule/getWorkhours` | date=2026-07-01，banci=夜 | HTTP 200，success=true，code=200，68 条 |
| `/schedule/getPlan` | month=2026-09 | HTTP 200，success=true，code=200，5775 条 |
| `/attendance/monthlyAttendanceSituation` | month=2026-09，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/monthlyWorkhourSituation` | month=2026-09，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/attendanceSituation` | date=2026-09-13，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/attendanceDetailSituation` | date=2026-09-13，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/attendanceSituation` | date=2026-06-26，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/attendanceDetailSituation` | date=2026-06-26，department=1，processType=preprocessing | 25 秒超时 |
| `/attendance/twoDayAttendancePerformance` | dataDate=2026-09-13，reportDate=2026-09-14，department=1，processType=preprocessing | 25 秒超时 |
| `/basic/month-segment/base-data` | month=2026-09 | 25 秒超时 |
| `/basic/month-segment/base-data` | month=2026-06 | 25 秒超时 |
| `/device/realtime/list` | deviceCode=3301 | 25 秒超时 |
| `/device/device/timeLine` | deviceCode=3301，queryDate=2026-09-13 | 25 秒超时 |
| `/device/availability/pauseRecords` | deviceCode=3301，queryDate=2026-09-13 | 25 秒超时 |
| `/device/device/timeLine` | deviceCode=3301，queryDate=2026-07-01 | 25 秒超时 |
| `/device/availability/pauseRecords` | deviceCode=3301，queryDate=2026-07-01 | 25 秒超时 |
| `/device/availability/day` | day=2026-09-13，deviceCode=3301 | 25 秒超时 |
| `/device/availability/month` | month=2026-09，deviceCode=3301 | 25 秒超时 |
| `/device/availability/year` | year=2026，deviceCode=3301 | 25 秒超时 |
| `/visual/getValue` | key=demoKey | HTTP 200，success=true，code=200，data=null |
| `/device/availability/month/daily-net` | month=2026-09，deviceCode=3301 | 25 秒超时 |
| `/device/availability/day/report` | day=2026-09-13，deviceCode=3301 | 25 秒超时 |
| `/schedule/getShijiByDate` | date=2026-09-11、device=1101；date=2026-07-01、device=3301 | 均 HTTP 200，success=true，code=200，空数组 |

追加重试：daily-net（month=2026-09、deviceCode=3301）55 秒超时。day/report（day=2026-09-11、deviceCode=1101）55 秒重试也超时。POST 保存接口只核对声明，未进行业务写入。

### 日报接入追加核验（2026-09-14）

- `getPlan/getOutput` 的 2026-07 查询分别为 1105/9 条，均 HTTP200、success=true。真实 `process` 除前处理/加硫/后处理外，还出现前处理1、前处理2、仕上检查、出货检查包装。用户确认后二者均归后处理；日报据此归并，未知名称标为归属未确认。
- 两日出勤（dataDate=2026-07-01、reportDate=2026-07-02、department=1、processType=preprocessing）和 day/report（day=2026-07-01、departmentId=1、processType=preprocessing）追加查询20秒超时。不能用适配器测试样本代替成功非空实测。
- 本地真实代理页面以制造3课、后处理、2026-07-01 查询，生产、设备数量和制番明细可显示；设备时长缺失单独提示。getRejects 的7月查询仍为空，品质保留实绩，未伪造不良数或模具排行。
- 现有源没有日报 meta。读取时间与未知起止时刻由页面显示模型明确区分；完整接入评估见 [制造日报](daily-report.md)。

## 生产实绩参考图专项复核（2026-09-20，历史口径）

再次核对在线Swagger及真实GET后，生产相关契约与现有快照一致。`getPlan`9月5775条/7月1105条，`getOutput`9月0条/7月9条，`getRejects`两月均0条。制造3课（departmentId=3）后处理2026-07-01的`day/report`返回59条：时间全0、availabilityRate全0、obstructionItems全空；同范围2026-09-19本次请求超时，不能记录为空数组。业务请求无需沿用Swagger文档的Basic凭据。

上述为当时判断。9月21日用户已确认生产数量公式、制番及设备即产线，比例直接显示且略过计划停止列，不再将这些项目列为接入缺口。当前实现见[制造日报](daily-report.md)。
