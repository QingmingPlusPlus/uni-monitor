# 制造日报

## 当前实现与边界

独立 H5 查询页面为 `src/pages/daily-report/index.vue`，路由 `/pages/daily-report/index`。部门、工序看板顶部提供“制造日报”入口。首版只做查询展示，不包含填报、审批、归档、导出或打印。历史查询反映后端当前结果，不是发布快照。

前端已实现四个日报查询接口的类型、加载器、页面与测试；**仓库没有后端服务源码，`/daily-report/*` 四个服务端接口仍属于待交付依赖，尚未完成真实接口联调**。2026-09-09 的 Swagger 已发布不同契约的 `GET /attendance/twoDayAttendancePerformance`，可提供日报出勤实绩的部分原始统计，但不等同于本页面的 `/daily-report/attendance`，更不能据此视为四个分区已联调。不能因为前端存在 API 函数或 Swagger 有相似接口就认为日报后端已完整提供数据。

日报没有 mock 降级，也未接入未经验证的旧接口。测试数据只在 `reportFixtures.test-support.ts` 中，由测试导入，不进入页面或业务构建依赖。页面样式通过脚本导入 `dailyReport.css`，所有规则限定在 `.daily-report` 内，避免 Uni-app 页面样式隔离导致子组件失去样式。

## 查询与页面

URL query：

| 参数 | 说明 |
| --- | --- |
| `departmentId` | 地图部门值 `department1` 至 `department4`，非法或缺失值使用配置默认部门。 |
| `processType` | `preprocessing`、`sulfur_addition`、`post_processing`；只允许当前部门支持的工序族，无效值回退到该部门首个工序族。 |
| `date` | `YYYY-MM-DD` 数据日；默认设备本地昨日，非法日期回退昨日并提示。报告日固定为次日。 |
| `from` | `department` 或 `process`，默认前者。 |
| `sourceProcessId` | 从工序看板进入时保留原始工序，例如 `pretreatment2`。若当前筛选仍匹配，返回该工序，否则返回所选工序族的首个工序。 |

部门配置从已有选择配置加载，失败时使用内置配置并提示。工序族按 API 值去重，制造1课的前处理1、前处理2只查询一次。筛选编辑后点击“查询”生效，已加载日报始终显示自己的部门、工序、数据日期和报告日期。“刷新”读取已应用筛选；编辑条件未提交时禁止刷新，避免语义混淆。H5 查询替换当前 URL 历史项，刷新可恢复筛选。

页面全宽纵向排列：出勤、生产数量、低达成率生产线、品质。出勤列出数据日全部有效班次以及次日早班；是否为早班由接口布尔字段决定，不解析中文班次名称。生产、品质统计完整生产日，跨午夜归属由后端决定。三列生产线卡在小于1280px时退化为单列；宽表在窄屏内滚动，字号不为塞满屏幕而缩小。

出勤班长按班次展示，不计入直接人员。页面“在籍”是排班口径。未开始班次保留排班人数，隐藏实绩、比率、缺勤和分类值；统计中的班次可显示当前实绩，但不推算缺勤或出勤率。

每个分区独立加载、重试、显示完整性及工厂时区下的更新时间与统计起止时间。新查询/刷新取消旧请求，并用版本号拦截不响应取消的旧结果；卸载时取消请求。已完成结果不缓存。单区失败不阻断其余区域。

## API 契约

访问层为 `src/api/dailyReport.ts`，统一 `/api` 前缀，四个接口均为 GET，超时15秒，可取消。后端需实现：

| 端点 | 响应 data 类型 | 分组粒度 |
| --- | --- | --- |
| `/daily-report/attendance` | `AttendanceReport` | 日期＋有效班次 |
| `/daily-report/production` | `ProductionReport` | 作业类别（例如洗净、粘接） |
| `/daily-report/line-losses` | `LineLossReport` | 生产线，低于90%的最低前三条 |
| `/daily-report/quality` | `QualityReport` | 前处理/后处理按制番；加硫按模具，最高前三项 |

共同请求为 `date`、`department`（字符串 `1` 至 `4`）、`processType`。共同响应为 `ApiResponse<{meta, rows}>`：

```json
{
  "success": true,
  "code": "0",
  "message": "",
  "data": {
    "meta": {
      "date": "2026-08-12",
      "department": "1",
      "processType": "preprocessing",
      "reportDate": "2026-08-13",
      "timeZone": "Asia/Shanghai",
      "periodStart": "2026-08-12T06:30:00+08:00",
      "periodEnd": "2026-08-13T06:30:00+08:00",
      "updatedAt": "2026-08-13T09:00:00+08:00",
      "status": "complete",
      "notes": []
    },
    "rows": []
  }
}
```

示例时间只用于解释格式，不意味着所有工厂、工序都按该班制。`timeZone` 必须为工厂 IANA 时区，时间戳必须带 UTC 偏移或 `Z`。出勤统计起止时间需要覆盖次日早班，与生产/品质范围可以不同。`rows: []` 表示已成功查询但无记录；`meta.status=unavailable` 表示数据未接入。`notes` 为业务口径或完整性说明。

### 指标包装与状态

所有数量、次数、时长字段统一为 `ReportMetric`：

```json
{ "value": 28, "status": "complete", "note": "当班直接人员，已排除班长" }
```

- `complete`：口径完整且值可用；真实零返回 `0`。
- `partial`：值尚未完成，可以显示数值和“未完成”，但不参与比率。
- `unavailable`：未接入，`value` 返回 `null`，显示 `— / 未接入`。
- 口径不明确也应使用 `partial` 或 `unavailable`，不能把猜测标成完整。
- `complete + null` 表示数值缺失，页面显示 `— / 缺失`。缺失字段也不会自动补零。
- `note` 可选，单元格提供说明；需要显著提示的口径同时放入 `meta.notes`。
- 前端发现缺少指标、未完成班次、原因未接入或缺勤校验不一致，会将分区“完整”标记降为“未完成”，避免错误地声称完整。

### 各接口行字段

| 类型 | 字段 |
| --- | --- |
| `ReportAttendanceRow` | 唯一 `id`、生产归属日 `date`、`shiftCode`、`shiftName`、`isEarlyShift`、带偏移的 `startAt/endAt`、`status`（`not_started/in_progress/complete`）；`leaders` 为实际出勤班长 `{employeeId,name}[]`，`null` 未接入，`[]` 确认无人；指标为 `roster/actual/absent`；`absence` 包含 `annual/care/sick/personal/other/unexcused` 六个指标。 |
| `ReportProductionRow` | 作业类别 `id/name`；`plan/actual/qualified/flowing/defective/scrapped` 六个指标。 |
| `ReportLineRow` | 权威生产线 `id/name`；`plan/actual/availableSeconds/plannedStopSeconds/productionSeconds/lossSeconds`；`reasons` 包含 `{code,name,count,durationSeconds}`，全部原因为数组，未接入为 `null`。 |
| `ReportQualityRow` | 排行主体 `id/name`；`dimension` 为 `production_number` 或 `mold`；`lines: {id,name}[]`、`productionNumbers: string[]`；`actual/qualified/defective`；`reasons: {code,name,count}[] | null`；可选 `reasonNote` 说明多重计数或分类边界。 |

后端先在完整业务范围聚合，再排名并返回前三条；前端额外校验阈值、排序和最多三条。完整原因列表按影响程度降序：生产按时长、品质按不良数，同值按原因码。页面默认前三项生产原因、前两项品质原因，支持展开全部。加硫必须先按模具聚合，对同一模具关联的全部制番计算总实绩和不良，不允许前端将截断后的制番榜再转成模具榜。

返回范围必须与请求一致。重复业务键、错误品质维度、越界出勤、非数组结构、非法时间或非数值指标都视为契约错误，分区提示重试。HTTP404/501及业务码 `NOT_CONNECTED/NOT_IMPLEMENTED` 显示“未接入”；网络、超时、其他HTTP/业务错误显示“加载失败”，不能误称无业务记录。

## 计算口径

| 指标 | 公式/限制 |
| --- | --- |
| 出勤率 | 完成班次的直接实绩出勤 ÷ 直接排班人数；班长不参与。 |
| 缺勤总数 | 优先后端值；仅完成班次且人数完整、排班不少于出勤时允许排班−出勤。 |
| 达成率 | 实绩÷计划。 |
| 合格率、不良率 | 合格÷实绩、不良÷实绩。 |
| 品质原因不良率 | 该现象数量÷同一排行主体实绩；不是该现象÷总不良。 |
| 可动率 | 生产时间÷可运转时间；后者已扣计划停止，不再次扣除。 |
| 阻碍占比 | 原因时长÷可运转时间。 |

比率使用完整输入，分母必须大于零；先汇总数量/时间再计算，不平均百分比。人数、件数、次数显示千分位整数；时间接口用秒，页面转小时两位小数；出勤率和可动率一位小数，其余比率两位。数量独立取值，不能强制 `实绩=合格+不良`，不能以减法生成流动、废弃。

生产排行只包含计划>0且达成率<90%的生产线；品质排行只包含实绩>0、不良>0的主体；并列按稳定 `id` 排序。不足三项不补造，无符合项显示说明。

缺勤分类按人、班次去重，六类应互斥并与缺勤总数对应；无法归类的数据标为不完整，不塞入“其他”。前端发现分类合计不一致会显示提示。阻碍时长由后端对生产线内设备事件进行重叠去重。生产线统计范围不使用地图显示白名单。

## 现有接口复用与后端交付清单

| 数据 | 现有来源 | 交付缺口 |
| --- | --- | --- |
| 排班、实绩出勤 | `/attendance/twoDayAttendancePerformance`、`/attendance/attendanceSituation` | Swagger 已确认前者接收数据日、报告日，并返回班长名单及早/夜班出勤、缺勤分类汇总；仍缺日报契约的稳定班次状态、时间范围、指标完整性和统一 `meta`，需单独映射并联调。后者可复用底层实时统计，仍需验证历史 `date` 生效、班次归属、完成状态。 |
| 班长、请假分类 | `/attendance/attendanceDetailSituation` | 姓名/岗位/出勤为文本，需结构化角色与原因枚举、出勤判定、人数去重。 |
| 生产计划与实绩 | `/schedule/getPlan`、`getOutput` | 月记录仅是候选来源，需确认日期、部门、工序归属、是否含不良和洗净/粘接作业类别。 |
| 合格、流动、废弃 | 无稳定字段 | 独立数据源及口径。 |
| 不良数量 | `/schedule/getRejects` | 仓库旧记录为空数组，本次未确认服务现状；缺原因、模具、完整关联维度。 |
| 生产线排名 | 计划/实绩原始记录 | 权威生产线与设备关系、完整业务范围和聚合。 |
| 阻碍次数/时长 | `/device/availability/day`、`/month`、`/year`、`/pauseRecords`、`/device/device/timeLine` | Swagger 已发布设备级总运转/阻碍时长、暂停记录和时间轴；仍缺生产线聚合、跨班次归属、重叠去重及日报原因分类，不能直接作为日报可动率或阻碍排行。 |
| 品质排行 | 实绩及不良记录仅部分可用 | 制番/模具范围、合格数、原因分布、分子分母一致性。 |

月度出勤没有班次明细；设备负荷率不是可动率；`getWorkhours` 未明确结构且不是设备运转时间；5M变化点不是停机事件；设备详情和生产趋势演示卡不能作为日报数据源。

后端上线前应以一个真实生产日核对考勤、生产计划/实绩、品质记录与现场日报，尤其是跨午夜、模具关联和重复停机。再分别接通四区，验证完整性状态和缺失字段。前端不因其他看板已经有相似卡片而视为联调完成。

## 验证入口

- `npm test -- src/pages/daily-report`：公式、日期、筛选去重、排名、结构与范围校验、分区错误、取消与旧响应保护。
- `npm run type-check`、`npm test`、`npm run build:h5`：项目检查。
- 浏览器使用隔离且显式标识的测试数据验证1920px、2K、窄屏、筛选提交、刷新恢复、原因展开和未接入状态；不得把测试服务地址写入业务配置。
