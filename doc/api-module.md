# API 访问层说明

`src/api/` 是前端访问后端的薄封装层，负责统一请求实例、参数类型、响应类型和端点名称。业务过滤、聚合、缓存、降级和展示格式由地图加载器或看板 loader 处理，不应放入 API 文件。

最新完整接口清单、参数、响应字段和实测依据见 [后端接口参考](api-reference.md)（2026-09-14，25 个 Swagger 端点）。访问层已覆盖全部已发布端点；文档区分本次实测、历史实测、Swagger 声明与兼容类型，空数据/超时接口不宣称已完成非空验证。

## 公共约定

- `src/api/http.ts` 创建唯一 Axios 实例，`baseURL` 固定为 `/api`。
- 后端通用响应结构为 `ApiResponse<T>`：`success`、`code`、`message`、`data`。
- 当前实例通过 `requestScheduler.ts` 的 adapter 统一调度：全局最多 4 个传输，普通请求最多占 3 个位置，设备 `month/daily-net` 最多占 2 个位置，为变化点保留容量。前端排队不启动传输超时；开始传输后默认 15 秒超时，调用方可覆盖。
- 排队中的 `AbortSignal` 取消会移除请求，成功或失败均释放位置；不自动重试，Axios 异常直接向调用方传播。
- API 函数返回完整 Axios response，消费方通常通过 `response.data.data` 读取业务数据。
- `src/api/index.ts` 是 barrel，可统一导入全部 API；现有业务代码也允许按域文件直接导入以减少依赖范围。

## 接口域

| 文件 | 能力 | 端点 |
| --- | --- | --- |
| `attendance.ts` | 月度出勤/工时、实时出勤、人员明细、两日出勤 | `GET /attendance/monthlyAttendanceSituation`、`GET /attendance/attendanceSituation`、`GET /attendance/attendanceDetailSituation`、`GET /attendance/monthlyWorkhourSituation`、`GET /attendance/twoDayAttendancePerformance` |
| `basic.ts` | 按月查询部门与工序的周分段配置 | `GET /basic/month-segment/base-data` |
| `deviceRealtime.ts` | 按设备、工厂、部门或工序查询设备实时状态、在线人员、生产任务及历史时间轴 | `GET /device/realtime/list`、`GET /device/device/timeLine` |
| `deviceAvailability.ts` | 设备日/月/年时长、暂停记录、每日净工时、日报可动率 | `GET /device/availability/day`、`month`、`year`、`pauseRecords`、`month/daily-net`、`day/report` |
| `schedule.ts` | 工时、生产计划/实绩、设备负荷、入库计划/实绩、不良和 5M 变化点 | `GET /schedule/getWorkhours`、`getPlan`、`getOutput`、`getDeviceload`、`getRukuPlan`、`getRukuShiji`、`getRejects`、`getChangePoint`、`getShijiByDate` |
| `dailyReport.ts` | 日报显示模型与可取消的15秒原始请求 | 两日出勤、月计划/实绩/不良、设备 `day/report`；页面层 `reportApi/reportAdapters/reportSources` 适配四区，不请求 `/daily-report/*`；详见 `doc/daily-report.md` |
| `visualConfig.ts` | 保存可视化配置 Map、按 key 读取并解析配置值 | `POST /visual/saveMap`、`GET /visual/getValue` |

## 已封装但尚未接入页面的能力

2026-09-14 已补齐以下能力的参数、响应和请求函数，并由现有 barrel 导出。封装不代表页面已经接入。

| 函数 | 端点与边界 |
| --- | --- |
| `getMonthlyWorkhourSituation` | 月度直接人员工时，month 必填。 |
| `getDeviceTimeLine` | 保留服务端双重 /device/device/timeLine 路径及 filedKey/filedLabel/filedValue 拼写。 |
| `getDeviceAvailabilityByMonth/ByYear` | 与 day 共用时长响应，允许 deviceId 过滤。 |
| `getScheduleShijiByDate` | date/device 必填；Swagger 标记未完成，两组查询为空，元素保持开放对象。 |

`getRejects.type` 来自 Swagger 文字示例，非空响应仍未验证。`getDeviceload.fuhe` 兼容文字示例的字符串小数与历史 number 类型，地图和设备详情可读取数值字符串；加硫负荷按设备类型汇总，不保证 devCode。

`getDeviceAvailabilityDailyNet` 已接入部门与工序生产性卡片：按各卡片设备范围查询 period/netHours，单请求超时15秒，字段及聚合规则见字段映射。其他未接入页面的能力仍按上表区分。

两日出勤和设备 `day/report` 已通过日报专用可取消封装接入页面；月计划、实绩和不良共享进行中的请求，不使用已完成缓存。出勤日名单、未知班次状态、设备维度、原始比例与缺失质量字段均在显示模型中显式标明。本次出勤/设备仍超时，不能将已实现适配视为全部字段完成非空联调。

最新契约快照见 [2026-09-16 Swagger 核对](swagger-contract-review.md)，其中接入状态以当前代码及本文为准。变化点统计卡通过 `dept/process/progress` 查询，保留非设备关联记录；按 2026-09-18 用户确认，`dept/process` 改为可选，不传查询全部；地图省略这两个参数，显式传入 `progress=` 一次查询全部，再按设备编码关联，仅显示 `status=0`（兼容字符串）。该约定优先于旧 Swagger，后端同步尚待联调。统计口径见 [变化点统计](change-point-statistics.md)。

## 参数与返回值边界

### 出勤和基础配置

- 月份统一使用 `yyyy-MM`；日期使用 `YYYY-MM-dd`。
- API 科室使用字符串编号 `1` 至 `4`，API 工序使用 `preprocessing`、`sulfur_addition`、`post_processing`。
- 页面枚举到 API 值的转换由 `src/pages/factory-dashboard/data/loaders/cssMapValueMapping.ts` 负责。
- 月分段响应允许 `segments` 为 `null`；自然周回退由 `src/utils/monthSegment.ts` 处理。
- `monthlyAttendanceSituation`、`monthlyWorkhourSituation` 的 `month` 为 Swagger 必填；`attendanceSituation` 与 `attendanceDetailSituation` 的 `date`、`department`、`processType` 在 Swagger 中均标为可选，页面仍应按自身查询语义显式传入。
- `twoDayAttendancePerformance` 的 `dataDate` 和 `reportDate` 是必填日期；日报在页面适配层转换其响应，访问层不再声明未发布的 `/daily-report/attendance` 请求。

### 设备实时数据

- `deviceCodes` 是逗号分隔的设备编码字符串；地图加载器会按每批 50 个编码拆分请求。
- API 层保留后端实时状态原值，状态中文语义和优先级由 `src/components/css-map/deviceRealtimeStatus.ts` 映射。
- 设备时长统计的过滤参数是 `departmentId`、`processType`、`deviceCode`；日/月/年统计还支持 `deviceId`，时间轴仅 `deviceCode/queryDate`；不要误用实时列表的 `deviceCodes` 或把 `obstructionHours` 直接解释为日报已去重的生产线阻碍时长。

### 计划与实绩

- `schedule.ts` 只描述后端当前可能返回的字段，不在此处补造部门、工序或设备归属。
- 后端字段不稳定、缺失或为空时的现状记录在 `doc/department-api-gaps.md`。
- 卡片字段来源、过滤与聚合口径记录在 `doc/factory-dashboard-real-data-mapping.md`。
- 2026-09-11 实测：`getPlan` 含数值 `mh`，用户已确认为计划 MH，前端已补充可选、可空类型并接入生产性推移表；`getWorkhours` 只有 `shebei: string`、`type: string`，不是工时数值接口。`getRukuPlan.dept` 可为 null。2026-09-14 已补齐入库计划部门的可空类型，详情见 `doc/api-reference.md`。

### 声明与运行时差异

- Swagger 的 `positionId`、设备 `deviceId`、在线人员 `recordId/employeeId` 声明为 integer/int64，实测均为 string；当前前端字符串 ID 定义应保留。
- 考勤明细 `ability`、`workHourList` 实测可为 null，2026-09-14 已在类型中补齐可空性。
- 暂停记录的 Swagger 字段为 `pauseTypeName`、`operationStatus`，访问层和设备详情已移除 `pauseReason/reason/status` 等旧别名，按声明的 1 暂停中、2 已恢复展示。
- 成功码存在 `200` 与 `00000`；设备时长查询实测存在 HTTP 200 且 `success=false` 的业务失败，不能仅靠 Axios 是否抛错区分成功。
- 文档 Basic 认证头不能直接用于业务查询；本次业务 GET 不带该头可访问，2026-09-11 携带后出现 B0301 Token 解析失败。凭据不写入项目文档或代码。

- 2026-09-14 `getChangePoint` 成功返回 8 条，字段为 `pid/date/factory/process/device/type/changePointContent/potentialRisk/implMethod/implResult/respPerson/reviewer/notes`；地图改读 `changePointContent`，mock 同步。声明允许 `device=null`，不关联具体设备。
- 本次考勤、基础配置和设备查询超时，保留 2026-09-11 历史字段依据，新增设备字段以 Swagger 声明为准；不从超时推断业务空数据。

### 可视化配置

- `parseVisualConfigValue` 对非空字符串优先执行 `JSON.parse`；解析失败时返回原字符串，空字符串或 `null` 返回 `null`。
- `visualConfig.ts` 目前仅由 `src/api/index.ts` 导出，仓库内没有业务调用方，属于已提供但未接入页面的接口能力。

## 运行时调用关系

```text
页面 / 地图组件
  -> 看板 loader 或 css-map 实时数据加载器
    -> src/api/<domain>.ts
      -> src/api/http.ts
        -> /api
```

本地开发时 `/api` 由 `vite.config.ts` 代理并移除前缀；生产环境需要同源网关提供相同路由。运行时和部署约束详见 `doc/application-runtime.md`。

## 新增或修改接口

1. 在最接近的域文件中定义参数、数据项和 `ApiResponse` 类型；没有合适域时再新增文件。
2. API 函数只组装 method、path、query 或 body，不加入卡片展示逻辑。
3. 需要对页面枚举、日期、比例或后端缺省值做转换时，放到对应 loader，并添加单元测试。
4. 新增域文件后从 `src/api/index.ts` 导出。
5. 同步更新接口字段映射；存在契约缺口时同时更新缺口记录。
