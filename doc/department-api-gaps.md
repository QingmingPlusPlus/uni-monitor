# 工厂首页真实接口缺口记录

本文档记录部门维度和工序维度首页改造后仍存在的接口契约缺口、字段缺失和运行时异常。组件字段映射详见 `doc/factory-dashboard-real-data-mapping.md`。

## 2026-09-11 核验补充

完整查询条件、字段类型与样本数量见 [后端接口参考](api-reference.md)。下文旧记录中的“当前月”“当前返回”是历史状态；与本节冲突时，以本次核验的具体查询范围为准。

| 差异或缺口 | 本次证据与处理边界 |
| --- | --- |
| 生产计划新增 `mh` | 2026-07、2026-09 均有 number 字段；用户已确认是计划 MH，前端按记录求和，并以计划数量合计除以 MH 合计计算计划个数生产性。 |
| `getWorkhours` 并不返回工时数值 | 两组日/班次查询只有 `shebei: string`、`type: string`，类型枚举含义待确认；没有部门/工序或直接人员工时数值，仍不能满足生产性 MH。 |
| 月份数据可用性不同 | 2026-09 生产计划非空，生产实绩、入库计划/实绩为空；2026-07 后三者有数据。不能再笼统描述“当前月已有实绩”。 |
| 入库计划部门可空 | 2026-07 的 `dept` 为 string 或 null，3012 条中 1193 条 null；前端类型尚未表达 null。单工序归属缺口仍存在。 |
| 5M 查询本次失败 | `getChangePoint` 无参数请求 HTTP 500、B0001，服务端报告缺列；与历史成功空数组不同，需按失败处理，成功字段待恢复后验证。 |
| 设备历史接口失败 | 设备 3301、2026-09-10 的时间轴与暂停记录 HTTP 500、B0001，报告缺表；不能视作没有历史记录。 |
| 设备日/月/年时长业务失败 | 设备 3301 的 2026-09-10 / 2026-09 / 2026 查询均 HTTP 200、success=false、B0001；仅捕获 Axios 异常不能识别该失败。 |
| 暂停字段与前端别名不一致 | Swagger 声明 `pauseTypeName/operationStatus`，访问层使用 `pauseReason/reason/status`；类型与消费方需另行修正，本次未更改运行时代码。 |
| 人员明细存在 null | 2026-06-26、部门1、前处理样本中 `ability` 部分 null，`workHourList` 全为 null；当前类型需补充可空性。 |
| 月分段配置随月份不同 | 2026-09 返回的6个组合均未配置，2026-06 返回的6个组合均已配置；不能沿用“6月部分空配置”描述本次结果。 |
| 负荷与不良结构仍未验证 | `getDeviceload/getRejects` 的2026-05、07、09样本均为空；历史前端字段不是本次确认的后端契约。 |

`monthlyWorkhourSituation` 已声明直接计划/实际工时（小时）并实测获得数值字段，可作为后续 MH 数据源评估对象，但仍需确认与生产性卡片所需的班次粒度及统计口径一致；按用户要求，实绩 MH 算法未定时显示 `-`，不使用此接口替代；依赖该分母的实绩个数生产性也显示 `-`。

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
| `GET /schedule/getOutput` | 当前月接口已有记录，字段包含 `date`、`shebei`、`number`、`zhifan`、`process`、`banci`、`dept`。 | 供恢复的生产计划实绩推移表及信息汇总的生产实际使用；生产性推移表也已使用该接口的数量；空月份保留 `-`。 |
| `GET /schedule/getRejects` | 当前返回空数组，未再复现缺表 SQL 报错。 | 首页右侧已移除旧不良率卡片，暂不接入。 |

## 缺口与当前处理

| 缺口 | 影响组件 | 当前处理 |
| --- | --- | --- |
| `GET /schedule/getRukuPlan` 仍只有 `month` 查询条件，返回字段中没有 `shebei` 或 `processType` | 工序维度入库计划实绩推移表 | 前端可按 `dept` 过滤到当前工序所属部门，但无法把计划严格拆到单个工序。信息汇总不区分维度，取全量合计，不受此缺口影响。 |
| `GET /schedule/getRukuShiji` 只有 `month` 查询条件，没有 `processType` | 工序维度入库计划实绩推移表 | 前端按 `dept` 过滤到当前工序所属部门；如后续需要单工序口径，后端需补充工序字段或稳定设备范围。信息汇总不区分维度，取全量合计，不受此缺口影响。 |
| 人员出勤接口没有稳定的 `teamLeader`、正式工、派遣工、临时工、顶岗、新人等独立结构化字段 | 人员出勤情况 | 前端按 `positionName` 中文关键词拆分；班长归入间接班长列，组长归入直接组长列，新人归入直接新人列。 |
| 人员出勤接口缺少人员子类明细时的严格枚举 | 人员出勤情况 | 未匹配到的直接人员计入 `directRegular`；已匹配的新人从正式工兜底中排除；`间接+直接在籍` 由本行间接总在籍与直接在籍合计相加得出。 |
| 人员明细接口中的 `attendanceSituation`、`ability`、`shiftName` 是自由文本 | 人员明细及状态 | `attendanceSituation` 和 `attendanceStatus` 均原样显示；能力与班次仍按前端兜底规则处理。 |
| `GET /schedule/getChangePoint` 当前返回空数组 | 地图变化点 | 地图不显示变化点标记；接口有数据后按 `device` 和 `type` 自动展示。 |
| 月周配置接口部分 (部门,工序) 组合在 2026-06 返回空配置 | 所有推移表 | 前端按 `departmentId:processType` 复合键查找；未命中的组合回退到自然周分段，仍保持月/周/日汇总逻辑。 |
| 实绩 MH 的具体计算方式未确定 | 实绩 MH、实绩个数生产性 | 两行显示 `-`；其余四行使用 getPlan/getOutput 真实数据，计划 MH 直接累计 mh，不再依赖能力与提高基础数。 |

后处理生产性数量已由用户确认采用 `getPlan/getOutput` 的后处理数量，沿用“入库数（含待倒箱、端数等）”行名；此决策不修复独立入库卡的工序过滤缺口。

## 建议后端扩展

- `getRukuPlan` 和 `getRukuShiji` 增加 `processType` 或稳定设备范围字段，让工序维度可以严格按单工序过滤。
- `getOutput` 保持与 `getPlan` 一致的部门、工序或设备编码可过滤字段。
- 确认实绩 MH 的计算方式、输入字段及班次归属，之后才能同时启用实绩 MH 与实绩个数生产性。计划 MH 已由 getPlan.mh 提供，无需前端反推能力或提高基础数。
- `getRejects` 明确不良金额、不良个数、计划值、实绩值和日期字段，便于未来恢复不良指标。
- 人员出勤与人员明细接口补充稳定枚举或结构化字段，减少前端中文关键词映射。
- 月周配置接口确保当前月份每个工序都返回分段配置；否则前端只能使用自然周兜底。

## 制造日报接口边界

独立日报已定义四个 `/daily-report/*` 前端查询契约，后端实现与真实数据联调待交付。旧出勤和 schedule 接口仅作为候选底层来源，不自动回退接入；请假分类、权威数量细分、历史阻碍和模具品质维度仍需后端补齐。字段映射、现有接口复用分析及交付清单统一见 `doc/daily-report.md`。
