# API 访问层说明

`src/api/` 是前端访问后端的薄封装层，负责统一请求实例、参数类型、响应类型和端点名称。业务过滤、聚合、缓存、降级和展示格式由地图加载器或看板 loader 处理，不应放入 API 文件。

## 公共约定

- `src/api/http.ts` 创建唯一 Axios 实例，`baseURL` 固定为 `/api`。
- 后端通用响应结构为 `ApiResponse<T>`：`success`、`code`、`message`、`data`。
- 当前实例没有请求/响应拦截器、统一错误转换或自动重试；Axios 异常直接向调用方传播。
- API 函数返回完整 Axios response，消费方通常通过 `response.data.data` 读取业务数据。
- `src/api/index.ts` 是 barrel，可统一导入全部 API；现有业务代码也允许按域文件直接导入以减少依赖范围。

## 接口域

| 文件 | 能力 | 端点 |
| --- | --- | --- |
| `attendance.ts` | 月度出勤、实时出勤、当日人员明细 | `GET /attendance/monthlyAttendanceSituation`、`GET /attendance/attendanceSituation`、`GET /attendance/attendanceDetailSituation` |
| `basic.ts` | 按月查询部门与工序的周分段配置 | `GET /basic/month-segment/base-data` |
| `deviceRealtime.ts` | 按设备、工厂、部门或工序查询设备实时状态、在线人员和生产任务 | `GET /device/realtime/list` |
| `deviceAvailability.ts` | 按设备查询当日运行/阻碍时长与暂停记录 | `GET /device/availability/day`、`/device/availability/pauseRecords` |
| `schedule.ts` | 工时、生产计划/实绩、设备负荷、入库计划/实绩、不良和 5M 变化点 | `GET /schedule/getWorkhours`、`getPlan`、`getOutput`、`getDeviceload`、`getRukuPlan`、`getRukuShiji`、`getRejects`、`getChangePoint` |
| `dailyReport.ts` | 制造日报专用查询契约，服务端待交付 | `GET /daily-report/attendance`、`production`、`line-losses`、`quality`；详见 `doc/daily-report.md` |
| `visualConfig.ts` | 保存可视化配置 Map、按 key 读取并解析配置值 | `POST /visual/saveMap`、`GET /visual/getValue` |

## Swagger 已发布但尚未接入访问层的能力

以下端点已于 2026-09-09 从服务端 Swagger（`可视化自研接口 1.0`，OAS 3.0）核验。它们尚未在 `src/api/` 中封装，也没有页面调用；需要时应先按本页“新增或修改接口”流程补齐类型、函数和消费方，不能把 Swagger 示例中的 `additionalProp*` 当作稳定业务字段。

| 域 | 端点 | Swagger 契约摘要 |
| --- | --- | --- |
| 考勤 | `GET /attendance/twoDayAttendancePerformance` | 制造日报出勤实绩；必填 `dataDate`、`reportDate`，可选 `department`、`processType`。返回班长名单 `monitorNames` 和按日期、班次汇总的在籍、实际出勤、出勤率及六类缺勤人数。 |
| 考勤 | `GET /attendance/monthlyWorkhourSituation` | 必填 `month`，可选 `department`、`processType`；按日返回 `directPlanWorkhours`、`directActualWorkhours`、`directWorkhourRate`。 |
| 设备 | `GET /device/device/timeLine` | `deviceCode`、`queryDate` 查询设备阶段时间轴；返回阶段起止时间、触发类型和可扩展 `extra` 字段。 |
| 设备 | `GET /device/availability/year` | 按 `year` 统计设备每月 `totalRunHours`、`obstructionHours`，可选按部门、工序、设备过滤。 |
| 设备 | `GET /device/availability/month` | 按 `month` 统计设备每日 `totalRunHours`、`obstructionHours`，可选按部门、工序、设备过滤。 |
| 设备 | `GET /device/availability/day` | 按 `day` 统计当天设备 `totalRunHours`、`obstructionHours`，可选按部门、工序、设备过滤。 |
| 设备 | `GET /device/availability/pauseRecords` | 按 `deviceCode` 查询暂停记录；`queryDate` 可选，未传时服务端默认前一天。返回暂停原因、起止时间、分钟数、状态及班次日期。 |

Swagger 还明确了以下已接入端点的契约：`/attendance/attendanceDetailSituation` 返回字段为 `account`、`realName`（非旧文档中的 `workNo`、`name`）；`/device/realtime/list` 的 `deviceCodes` 为最多 50 个设备编码的逗号分隔列表；`/schedule/getWorkhours` 必填 `date`、`banci`，其数组元素结构在 Swagger 中仍为开放对象；`/schedule/getChangePoint` 无查询参数。

## 参数与返回值边界

### 出勤和基础配置

- 月份统一使用 `yyyy-MM`；日期使用 `YYYY-MM-dd`。
- API 科室使用字符串编号 `1` 至 `4`，API 工序使用 `preprocessing`、`sulfur_addition`、`post_processing`。
- 页面枚举到 API 值的转换由 `src/pages/factory-dashboard/data/loaders/cssMapValueMapping.ts` 负责。
- 月分段响应允许 `segments` 为 `null`；自然周回退由 `src/utils/monthSegment.ts` 处理。
- `monthlyAttendanceSituation`、`monthlyWorkhourSituation` 的 `month` 为 Swagger 必填；`attendanceSituation` 与 `attendanceDetailSituation` 的 `date`、`department`、`processType` 在 Swagger 中均标为可选，页面仍应按自身查询语义显式传入。
- `twoDayAttendancePerformance` 的 `dataDate` 和 `reportDate` 是必填日期；它与项目预定义的 `/daily-report/attendance` 不是同一端点或同一响应结构。

### 设备实时数据

- `deviceCodes` 是逗号分隔的设备编码字符串；地图加载器会按每批 50 个编码拆分请求。
- API 层保留后端实时状态原值，状态中文语义和优先级由 `src/components/css-map/deviceRealtimeStatus.ts` 映射。
- 设备时间轴与可动/阻碍统计端点的过滤参数是 `departmentId`、`processType`、`deviceCode`；不要误用实时列表的 `deviceCodes` 或把 `obstructionHours` 直接解释为日报已去重的生产线阻碍时长。

### 计划与实绩

- `schedule.ts` 只描述后端当前可能返回的字段，不在此处补造部门、工序或设备归属。
- 后端字段不稳定、缺失或为空时的现状记录在 `doc/department-api-gaps.md`。
- 卡片字段来源、过滤与聚合口径记录在 `doc/factory-dashboard-real-data-mapping.md`。

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
