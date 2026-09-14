# 制造日报

## 当前实现与评估（2026-09-14）

独立 H5 页面为 `src/pages/daily-report/index.vue`，路由 `/pages/daily-report/index`，部门、工序看板顶部提供入口。页面只读查询，历史查询反映服务端当前数据，不包含填报、审批、归档、导出、打印或发布快照。

**日报已改为调用现有真实接口，不再请求未发布的 `/daily-report/*`。现有字段可真实展示，但不能完整覆盖原设计。** 缺合格数、流动数、模具关联、不良现象、权威生产线归属及班次状态等；设备日报的比例单位也未明确。不得通过补零、减法、设备工时或其他看板演示数据填满这些字段。

| 分区 | 已接入来源 | 当前展示与缺口 |
| --- | --- | --- |
| 出勤实绩 | `/attendance/twoDayAttendancePerformance` | 班次在籍、实绩、服务端出勤率、缺勤及六类原因；班长为数据日整体名单，不分配到班次。尚缺班次完成状态、起止时刻。本次实测超时，按历史非空响应与 Swagger 适配，页面可独立重试。 |
| 生产实绩 | `/schedule/getPlan`、`getOutput`、`getRejects` | 工序合计计划、实绩；不良有明确分类和归属才统计，废弃按不良＋其他。合格、流动未提供。 |
| 设备生产与阻碍 | 月计划/实绩＋`/device/availability/day/report` | 设备计划、实绩、达成率；设备源可用时补充总运转/生产/阻碍时间、次数、原因和原始比率。未包装成生产线；本次设备源超时，仍保留计划实绩。 |
| 品质实绩 | 月实绩＋不良，月计划辅助确认设备归属 | 全工序按制番展示实绩和可确认不良；无法排行时保留明细。加硫暂不提供模具排行，不能把制番冒充模具。 |

`2026-07` 月计划、实绩分别成功返回 1105、9 条；制造3课后处理 `2026-07-01` 已在真实页面显示数量和制番明细。`getRejects` 多月仍为空，不能因此宣称不良为零。两日出勤、设备日报同一历史日期查询超时，不宣称新设备字段已完成非空联调。详细请求依据见 [接口参考](api-reference.md)。

## 查询与范围

| URL 参数 | 说明 |
| --- | --- |
| `departmentId` | `department1` 至 `department4`；无效值使用选择配置默认部门。 |
| `processType` | `preprocessing`、`sulfur_addition`、`post_processing`，限部门支持的工序族；无效值回退首个工序族。 |
| `date` | `YYYY-MM-DD` 数据日，默认设备本地昨日；非法值回退并提示。报告日固定次日。 |
| `from`、`sourceProcessId` | 保留部门/工序入口与返回目标；筛选不再匹配原工序时返回新工序族首项。 |

修改部门或工序自动查询四区并更新 URL；单改日期通过“查询”提交。未提交条件不改变已显示日报标签，且禁止刷新；“刷新”重新读取已应用条件。选择配置失败时使用内置配置并提示。

日报读取完整月记录，按记录日期、部门和工序族过滤，**不读取地图设备显示白名单、不借用当前实时设备归属**。制造1课的前处理1、前处理2合并查询一次，区别于看板生产性卡片各自设备范围。

工序归并：`前处理/前处理1/前处理2 → preprocessing`，`加硫 → sulfur_addition`，`后处理/仕上检查/出货检查包装 → post_processing`，同时接受 API 工序枚举。检查和包装归后处理由用户在本次任务中确认。未知工序或缺少部门的同日记录排除并提示，相关已知合计标为部分，不能参与比率与排行。

制造2课月记录也包含仕上检查，因此日报额外提供该部门的后处理选项。此选项不修改地图工序配置；从工序看板返回时，若没有对应地图工序，返回部门看板。

`getRejects` 未提供部门、工序时，仅通过该月计划/实绩中同一设备的唯一部门＋工序归属关联；冲突、未知归属不强行分配，显式字段不能被设备关联覆盖。未关联不良会提示并阻止不完整合计参与排名。日期归属使用服务端 `date/workDate`，不编造跨午夜起止时刻。

## 模块与接口

- `src/api/dailyReport.ts`：前端显示模型及五个原始请求薄封装，统一 `/api` 前缀、15秒超时、AbortSignal；这些类型不是服务端已发布的新契约。
- `reportSources.ts`：原始来源成功/结构检查，以及进行中月请求去重。三区共享同月计划/实绩，不缓存已完成结果。单区取消不影响其他订阅者，最后一个取消才中断上游。
- `reportAdapters.ts`：工序归并、历史范围过滤、指标完整性、生产/设备/制番聚合及源字段映射。
- `reportApi.ts`：将真实来源装配为四区显示模型；部分来源失败保留其他可用字段，全部必要来源失败才使整区报错。
- `reportResource.ts`、`reportValidation.ts`：四区独立状态、范围/结构校验、取消与版本保护；卸载不再发布结果。
- `reportModel.ts`、各 Section：日期、比率、排名及显示。样式从脚本导入 `dailyReport.css`，限定 `.daily-report`。

| 原始请求函数 | 参数 |
| --- | --- |
| `getReportAttendanceSource` | `dataDate`、次日 `reportDate`、`department`、`processType` |
| `getReportPlanSource/getReportOutputSource/getReportRejectsSource` | `month=YYYY-MM` |
| `getReportDeviceSource` | `day`、`departmentId`、`processType` |

原始响应必须 `success=true`，不能仅凭 HTTP200 或某一种成功码判断。数组结构异常、业务失败、超时分别由来源或分区提供中文提示。真实零保留0；空数组只表示未返回记录，无法证明某个设备/制番的数量为零。日报不导入 mock，测试样本只在测试文件中使用。

## 显示模型与口径

`ReportMetric` 为 `{ value: number | null, status: complete | partial | unavailable, note? }`。缺失或无效数字显示 `— / 未提供`；有效部分值可查看但不参与比率。人数、数量、次数只接受非负有限整数，时间和原始比例接受非负有限数，不把数值字符串隐式当数值。

`ReportMeta` 保留查询范围、次日报告日、完整性与说明。现有源没有统计起止时间和数据更新时间，因此 `periodStart/periodEnd=null`，`timestampSource=retrieved`，`updatedAt` 仅表示实际读取时间。显示采用工厂时区 `Asia/Shanghai`；不能将读取时间标成服务端更新时间。当前各区均标“部分数据可用”。

### 出勤

`statDate/shiftType/shiftName` 对应日期与班次；按两日端点契约，报告日行属于报告日早班。没有稳定起止时间，不通过中文名称猜测时间；`status=reported` 显示“状态未提供”，`startAt/endAt=null`。

`onRollCount/actualAttendanceCount/absenceCount` 对应直接排班、出勤和服务端缺勤；`attendanceRate` 按文档百分数显示一位小数。六类原因依次来自 `annualLeaveCount/nursingLeaveCount/sickLeaveCount/personalLeaveCount/otherLeaveCount/absenteeismCount`，差异提示核对。状态未知时不做排班减出勤、不重新计算出勤率。`monitorNames` 每日只显示一次，名单不分班次、不加到直接人员人数。

### 生产与品质

生产按工序合计，计划和实绩分别求记录 `number` 之和；合格和流动没有独立来源，保留缺失。`getRejects.type` 为“不良”时进入不良，已声明的“不良/其它/其他”进入废弃总数；缺分类、未知分类、空记录均不猜测。不以实绩减不良生成合格数。

品质按 `zhifan` 分组实绩和已确认不良，`meta.qualityDimension=production_number` 明示降级维度。无模具关联、无不良现象时明确提示。完整分子分母存在时计算达成率、不良率；计划或实绩分母须大于零。生产只排达成率低于90%的最低3台设备；品质只排实绩>0、不良>0的最高3项，并列按稳定编码。无法排名时仍显示真实明细，有排名时可切换查看全部。

### 设备时间与原因

`day/report` 必须匹配请求日期、部门和工序；重复设备统计不能重复合计。`totalRunHours/productionHours/obstructionHours` 转成显示模型秒，页面显示小时两位小数。`obstructionItems` 用 `pauseType/pauseTypeName/count/obstructionHours`，按时长排序，可展开全部原因。

`totalRunHours` 不等同于扣计划停止后的可运转时间。`availabilityRate/ratio` 单位尚未取得非空验证，当前明确标“原始值”显示四位小数，不能擅自乘100或附百分号。不把设备事件合计成未经重叠去重的生产线时长。

## 待后端补齐与验证

恢复出勤和设备查询响应；核对真实非空设备字段、可动率/占比单位和分母、原因去重；补齐独立合格/流动数、不良分类与模具关联、权威生产线归属、班次状态与时间、源更新时间及完整性。`getShijiByDate` 标记未完成且实测为空，未接入日报；`getWorkhours` 为图形类型，也不是设备运转时间。

## 验证入口

- `npm test -- src/pages/daily-report`：日期、筛选、公式、排名、契约校验、真实源映射、未知工序、空数据/失败、共享取消与旧响应保护。
- `npm run type-check`、`npm run build:h5`：类型与 H5 构建。
- 浏览器核对真实历史日期的数量、失败来源提示、明细切换和筛选恢复；宽屏及窄屏检查字号、局部横向滚动。测试数据不得进入业务配置。
