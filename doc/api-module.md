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
| `schedule.ts` | 工时、生产计划/实绩、设备负荷、入库计划/实绩、不良和 5M 变化点 | `GET /schedule/getWorkhours`、`getPlan`、`getOutput`、`getDeviceload`、`getRukuPlan`、`getRukuShiji`、`getRejects`、`getChangePoint` |
| `visualConfig.ts` | 保存可视化配置 Map、按 key 读取并解析配置值 | `POST /visual/saveMap`、`GET /visual/getValue` |

## 参数与返回值边界

### 出勤和基础配置

- 月份统一使用 `yyyy-MM`；日期使用 `YYYY-MM-dd`。
- API 科室使用字符串编号 `1` 至 `4`，API 工序使用 `preprocessing`、`sulfur_addition`、`post_processing`。
- 页面枚举到 API 值的转换由 `src/pages/factory-dashboard/data/loaders/cssMapValueMapping.ts` 负责。
- 月分段响应允许 `segments` 为 `null`；自然周回退由 `src/utils/monthSegment.ts` 处理。

### 设备实时数据

- `deviceCodes` 是逗号分隔的设备编码字符串；地图加载器会按每批 50 个编码拆分请求。
- API 层保留后端实时状态原值，状态中文语义和优先级由 `src/components/css-map/deviceRealtimeStatus.ts` 映射。

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
