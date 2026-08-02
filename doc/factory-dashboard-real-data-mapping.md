# 工厂首页组件接口字段映射

本文档记录部门维度和工序维度首页各组件使用的真实接口、字段来源和无法匹配的字段。实现入口已从单个 `factoryDashboardLoader.ts` 拆分为 `src/pages/factory-dashboard/data/loaders/`（卡片级 loader）和 `src/pages/factory-dashboard/data/dashboard/`（维度级请求装配）；`factoryDashboardLoader.ts` 保留为统一导出 barrel。地图实时数据入口在 `src/components/css-map/css3dMapLiveData.ts`。

## 公共过滤与时间

| 前端概念 | 来源/转换 | 说明 |
| --- | --- | --- |
| 当前部门 | `departmentId` query，例如 `department2` | 通过 `toApiDepartmentCode` 转为接口 `department=2`。 |
| 当前工序 | `processId` query，例如 `vulcanization1` | 通过 `toApiProcessType` 转为接口工序：`pretreatment* -> preprocessing`，`vulcanization* -> sulfur_addition`，`posttreatment* -> post_processing`。实时人员出勤按转换后的 API 工序去重后请求；例如制造1课的 `pretreatment1`、`pretreatment2` 只请求并汇总一次 `preprocessing`，避免重复累加。 |
| 工序设备范围 | `public/factory-map/devices.json` 的 `section`、`deviceCode`、`deviceCodes`、`children[].deviceCode` | 用于把设备级接口过滤到当前部门或工序。 |
| 当前月 | 前端本地日期 `YYYY-MM` | 推移表接口按月查询。 |
| 月周配置 | `GET /basic/month-segment/base-data` | 前端按接口周配置聚合日数据；配置缺失时回退自然周。sessionStorage 记录键为 `${departmentId}:${processType}` 复合键；推移表查找时将 CssMap 值经 `toApiDepartmentCode`/`toApiProcessType` 转为接口格式后拼键读取，未命中的 (部门,工序) 组合回退自然周。 |

## 卡片刷新与缓存

- 部门维度和工序维度的整页看板数据不再写入或读取 `sessionStorage`；页面刷新、部门切换、工序切换或刷新版本变化时重新调用 loader 读取接口。仅保留同一请求仍在进行时的 Promise 去重，不复用已完成结果。
- 推移表卡片按月缓存接口记录：出勤率推移直接调用 `getMonthlyAttendanceSituation`（无月级缓存，每次刷新都会请求接口）；入库计划实绩推移使用 `scheduleRukuPlanCache`/`scheduleRukuShijiCache`，生产计划实绩推移使用 `schedulePlanCache`/`scheduleOutputCache`，键均为当前月 `YYYY-MM`。
- 手动刷新按钮经 `FactoryDashboardPanel` → `refreshDashboard` 触发页面 `refreshCard(cardId)`。入库计划实绩推移与生产计划实绩推移卡片 MUST 以 `{ forceRefresh: true }` 调用对应 loader，由 `src/pages/factory-dashboard/data/loaders/scheduleRecordCache.ts` 中的 `invalidateInboundScheduleRecords(month)`/`invalidateProductionScheduleRecords(month)` 清除当月缓存后才会重新请求接口；否则命中同月缓存，刷新表现为不生效。
- 新增基于月级 schedule 缓存的推移卡片时，需同时补充对应的 `invalidate*ScheduleRecords(month)` 并在 `refreshCard` 中传 `forceRefresh: true`，否则刷新按钮不生效。

## 左侧 css-map

左侧地图默认使用 `SpriteCssMapPanel.vue`（Three.js WebGL Sprite 渲染），旧 CSS3D DOM 地图保留为 WebGL 不可用时的回退。两种渲染器共用 `css3dMapLiveData.ts` 的数据聚合和状态判定，不改变接口契约。

H5 调试时可在浏览器控制台调用 `window.mapMock(true)` 切换为前端 mock 运行态数据，调用 `window.mapMock(false)` 恢复真实接口。mock 只替换设备工作状态、负荷率、人员配置和 5M 变化点，不替换 `devices.json` 静态布局；切换后已挂载地图会重新加载。

| 地图信息 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 设备工作状态 | `GET /device/realtime/list` | `actualStatus`、`deviceParseType`、`actualStatusName`、`deviceParseTypeName` | 以 `actualStatus` 为主状态：`normal` 显示计划停止，`running` 显示生产中；`pause_running`/`pause_not_running` 优先按 `deviceParseTypeName` 中文名称映射，避免接口返回枚举 ID 时误判，再回退 `deviceParseType`。`CUT` 显示切替，`CLEAN` 显示清扫，“用餐”/`TOOL_CHANGE`、`DEVICE_TOOL_CHANGE`、“休息”/`REST`、`DEVICE_REST` 显示计划停止，其余暂停原因显示异常停止。 |
| 负荷率 | `GET /schedule/getDeviceload` | `devCode`、`fuhe` | 按设备编码匹配；`fuhe` 视为 0-1 或百分比值，前端格式化为一位小数百分比。 |
| 人员配置 | `GET /device/realtime/list` | `onlinePersonList` | 展示当前设备在线人员数量和人员信息。 |
| 生产任务 | `GET /device/realtime/list` | `productionTaskList` | 作为地图设备实时信息补充。 |
| 5M 变化点 | `GET /schedule/getChangePoint` | `device`、`type`、`change`、`varify`、`notes` | 按设备编码匹配；`type` 映射为人、机、料、法、环。当前接口返回空数组时不展示变化点。 |

地图渲染补充规则：带 `children` 的外层设备组不显示，每个子设备直接使用自身数据独立显示；子设备的 `x`、`y`、`width`、`height` 按外层设备内部 100×100 局部坐标换算到地图坐标，以自身实际位置和尺寸渲染。设备或子设备可用可选 `polygon` 数组描述自身局部坐标系内的多边形轮廓，子设备顶点会随子设备宽高一起换算；未配置时保持矩形。无 `children` 的单设备保持原布局。设备内部信息区按原始宽高选择纵向或横向结构，并根据名称、工况、负荷率、可见人员和可见 5M 数量估算所需宽度后进入稳定档位；设备占位宽于内容档位时，信息靠左且右侧留白，矩形设备的外框和点击区域覆盖完整占位，多边形设备则裁剪到配置轮廓。右侧 L 型设备可配置 `contentLayout: "right-l-shape"` 启用专用排列：名称与工况位于顶部横条，负荷率位于横条下半区左侧，人员和 5M 在其右侧分两行显示；右侧凸出竖条保持白色留白，不承载状态色、负荷率色或信息，五类原有内容均保留。该方向和档位不随地图缩放变化。人员配置继续显示班次扇形标记且不展示姓名；5M 显示带正向“人/机/料/法/环”glyph 的填充菱形，并固定使用人=紫、机=红、料=绿、法=近黑、环=黄配色；纵向最多六槽、横向最多五槽，超出部分以中性 `+N` 汇总。地图图例在负荷率、工况分组下方显示同一套 5M 菱形色样，空间不足时仅滚动图例自身。小设备名称可省略，放大后恢复完整显示。Sprite 与 CSS3D 回退使用同一颜色来源、菱形几何和布局规划规则。

多边形设备配置示例（顶点相对设备自身左上角）：

```json
{
  "x": 100,
  "y": 80,
  "width": 120,
  "height": 80,
  "polygon": [
    { "x": 0, "y": 0 },
    { "x": 120, "y": 0 },
    { "x": 90, "y": 80 },
    { "x": 20, "y": 80 }
  ]
}
```

## 信息汇总组件

| 指标 | 接口/来源 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 生产线稼动 | `GET /device/realtime/list` | `deviceId`、`deviceCode`、`actualStatus`、`deviceParseType`、`deviceParseTypeName` | 汇总卡片直接使用当前部门/接口工序返回的 JSON；跨前端工序先按 `deviceId`（缺失时按 `deviceCode`）去重，总台数取去重后的接口记录数，不读取地图 `devices.json`。除计划停止外的接口设备均计入稼动台数（含异常、切替、清扫），并计算稼动率。状态判定与 css-map 同源（`src/components/css-map/deviceRealtimeStatus.ts`）。 |
| 人员出勤-直接 | `GET /attendance/attendanceSituation` | `positionType=direct`、`shiftType`/`shiftTypeName`、`schedulePersonCount`、`actualAttendancePersonCount` | 只汇总当前时间对应班次的直接人员应出勤/实际出勤和出勤率；早班 06:30-14:30，中班 14:30-22:30，晚班 22:30-次日 06:30。 |
| 人员出勤-间接 | `GET /attendance/attendanceSituation` | `positionType=indirect`、`shiftType`/`shiftTypeName`、`schedulePersonCount`、`actualAttendancePersonCount` | 只汇总当前时间对应班次的间接人员应出勤/实际出勤和出勤率；早班 06:30-14:30，中班 14:30-22:30，晚班 22:30-次日 06:30。接口 `shiftTypeName` 不含早/中/晚/夜/白等关键词时前端归为 `正常班(regular)`；信息汇总不统计 `正常班`。 |
| 入库实绩 | `GET /schedule/getRukuPlan`、`GET /schedule/getRukuShiji` | `number` | 计划来自 `getRukuPlan`，实绩来自 `getRukuShiji`；取当月接口全量合计，**不按部门/工序过滤**（与入库计划实绩推移表口径不同），计算实绩/计划与达成率。此卡片不区分维度，后续按设备 id 访问为预留扩展点。 |
| 生产实际 | `GET /schedule/getPlan`、`GET /schedule/getOutput` | `number` | 计划来自 `getPlan`，实绩来自 `getOutput`；取当月接口全量合计，**不按部门/工序过滤**（与生产计划实绩推移表口径不同），计算实绩/计划与达成率。此卡片不区分维度。 |

> 参考图中的“※以上为实时数据”“※以上数据截止昨日”只作为刷新时机说明，本次组件不显示这两行。

## 生产线稼动情况

| 列 | 接口 | 字段 | 当前处理 |
| --- | --- | --- | --- |
| 部门 | 页面状态、`selection.json` | `departmentId` | 部门维度显示当前部门名称；工序维度显示当前工序所属部门名称。 |
| 工序 | `selection.json` | `processId`、label | 部门维度每个工序一行；工序维度只显示当前工序一行。 |
| 总台数 | `GET /device/realtime/list` + 地图设备范围 | 设备记录数 | 按当前部门或工序设备编码过滤后计数。 |
| 稼动台数 | 同上 | `actualStatus`、`deviceParseType` | 除计划停止外均计入稼动台数（含生产中、切替、清扫、异常、中立）；状态判定与 css-map 同源（`deviceRealtimeStatus.ts`），以 `actualStatus` 为主，暂停再按 `deviceParseType` 细分。 |
| 异常台数 | 同上 | `actualStatus`、`deviceParseType` | 暂停且 `deviceParseType` 不属于切替(CUT)/清扫(CLEAN)/计划停止类时计入（即 css-map 的 `abnormalStop`）。 |
| 计划停止台数 | 同上 | `actualStatus`、`deviceParseType`、`deviceParseTypeName` | `actualStatus === 'normal'`，或暂停且解析后的原因属于“用餐”/`TOOL_CHANGE`、`DEVICE_TOOL_CHANGE`、“休息”/`REST`、`DEVICE_REST` 时计入（与 css-map 的 `plannedStop` 一致）。 |

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
| 间接在籍人数 | `GET /attendance/monthlyAttendanceSituation` | `indirectSchedulePersonCount` | 后端按日返回，前端按月/周/日聚合，月/周聚合值取该指标不为 0 的有效日平均，无有效日返回空。 |
| 直接计划出勤人数 | 同上 | `directSchedulePersonCount` | 同上：月/周聚合取该指标不为 0 的有效日平均。 |
| 直接实际出勤人数 | 同上 | `directAttendancePersonCount` | 日列直接展示；月/周聚合取平均时剔除直接实际出勤人数为 0 的日，分母为直接实际出勤人数不为 0 的天数。 |
| 直接实际出勤率 | 同上 | `directAttendanceRate` 或前端聚合计算 | 日列直接按当天值计算；月/周聚合时剔除直接实际出勤人数为 0 的日，再用 `直接实际出勤合计 / 直接计划出勤合计`。 |
| 利计出勤率 | 前端固定值 | 无接口字段 | 固定 91.0%；表格只在月列显示一个值，chart 显示 91.0% 红色目标线，并在线末端标注 `91%`。 |

截止规则：接口记录只展示并聚合到当前班次所属生产日。班次边界为早班 06:30、中班 14:30、晚班 22:30；00:00-06:29 仍属于前一生产日的晚班，因此当前自然日记录保持为空。截止生产日之后的记录不参与月/周聚合，日列也不展示值。

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
| 计划生产数 | `GET /schedule/getPlan` | `number`、`workDate`、`banci`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合；日列展示当日全部班次计划，周合计和月合计只累计到当前班次（含当前班次），不计入当前生产日后续班次及未来生产日计划。 |
| 实绩生产数 | `GET /schedule/getOutput` | `number`、`date`、设备/工序相关字段 | 按当前工序设备范围过滤并按月/周/日聚合；无记录时显示为空。 |
| 合格数、不良数、抽样数 | 无稳定匹配字段 | 无 | 本次不展示。 |
| 实绩计划差 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 - 计划`。 |
| 生产达成率 | 前端派生 | 计划、实绩 | 有计划和实绩时计算 `实绩 / 计划`。 |

显示规则：仅工序维度展示。表格保留月列，折线图不展示月列。当前班次沿用早班 06:30-14:30、中班 14:30-22:30、晚班 22:30-次日 06:30 的边界；00:00-06:29 按前一生产日的晚班累计。折线图两条 y 轴均自适应数据范围，不固定上限：计划/实绩生产数轴与生产达成率轴均由 ECharts 依当前周/日数据自动计算刻度，达成率轴保留百分比标签。

## 未接入或空置字段

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 不良率金额、个数 | 未展示 | `GET /schedule/getRejects` 当前返回空数组，且本次页面结构已移除旧不良卡片。 |
| MH 实绩 | 未展示 | 用户本次要求的右侧组件中不包含旧 MH 卡片。 |
| 入库计划工序过滤 | 部分受限 | `getRukuPlan` 目前只有 `dept`，没有 `shebei` 或 `processType`，工序维度入库计划实绩按所属部门口径聚合。 |
