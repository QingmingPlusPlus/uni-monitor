# Swagger 契约核对（2026-09-20）

2026-09-22补充核对：在线文档认证成功，`getRejects`仍只声明必填month，描述仍为date/banci/shebei/number/zhifan/type示例；未声明date查询参数或yuanyin字段。前端按用户提供的后端说明接入可选date和yuanyin，不伪改9月20日快照。带month+date业务GET成功但为空，非空字段及日期过滤效果仍未实测，详见[接口参考](api-reference.md)。

> 本次实测 `getChangePoint?progress=` 成功返回2条，省略部门、工序、日期和班次参数被服务端接受，与Swagger的required标记不一致。地图保持用户确认的全范围查询及 `status=0` 筛选；新增日期/班次参数的筛选效果未在本次验证。

来源：[Swagger UI](http://123.57.81.179:8080/swagger-ui/index.html)，机器契约：`http://123.57.81.179:8080/v3/api-docs`。服务标题“可视化自研接口”，版本 `1.0`。实时契约与仓库已有 [OpenAPI 快照](swagger/openapi-2026-09-20.json) 一致，保留原文件；未保存认证信息或业务明细。

本次核对全部25个操作，并与9月16日快照逐路径及schema比较：仅 `/schedule/getChangePoint` 发生变化，未新增/删除端点，components schemas未变。Swagger通过文档认证读取；业务GET不带文档认证头可成功。日报和变化点请求结果详见 [接口参考](api-reference.md)。

## 当前端点清单

参数后的 `*` 表示 Swagger `required=true`。可选不等于业务统计时可以省略。

| 方法 | 端点 | 说明 | 查询参数 |
| --- | --- | --- | --- |
| POST | `/visual/saveMap` | 保存 JSON 键值 | 无 |
| GET | `/visual/getValue` | 按键查询配置值 | `key`* |
| GET | `/schedule/getWorkhours` | 获取当天工作时长类型 | `date`*、`banci`* |
| GET | `/schedule/getShijiByDate` | 根据日期和设备获取当天计划实绩信息(未完成) | `date`*、`device`* |
| GET | `/schedule/getRukuShiji` | 获取当月入库实绩数据 | `month`* |
| GET | `/schedule/getRukuPlan` | 获取当月入库计划数据 | `month`* |
| GET | `/schedule/getRejects` | 获取当月不良品数据 | `month`* |
| GET | `/schedule/getPlan` | 获取当月计划数据 | `month`* |
| GET | `/schedule/getOutput` | 获取当月实绩数据 | `month`* |
| GET | `/schedule/getDeviceload` | 获取当月负荷数据 | `month`* |
| GET | `/schedule/getChangePoint` | 获取人机料法环数据 | `dept`*、`process`*、`beginDate`*、`endDate`*、`banci`*、`progress`*（实际允许省略范围参数） |
| GET | `/device/realtime/list` | 查询设备的信息和状态 、人员上岗人员信息和状态 、正在进行中的人任务信息 | `deviceCode`、`deviceCodes`、`deviceCodeLike`、`factoryId`、`departmentId`、`processType` |
| GET | `/device/device/timeLine` | 设备时间轴 | `deviceCode`、`queryDate` |
| GET | `/device/availability/year` | 设备阻碍/运转时间按年统计 | `year`、`departmentId`、`processType`、`deviceCode`、`deviceId` |
| GET | `/device/availability/pauseRecords` | 设备暂停记录 | `deviceCode`、`queryDate` |
| GET | `/device/availability/month` | 设备阻碍/运转时间按月统计 | `month`、`departmentId`、`processType`、`deviceCode`、`deviceId` |
| GET | `/device/availability/month/daily-net` | 实绩MH | `departmentId`、`processType`、`month`、`deviceCode` |
| GET | `/device/availability/day` | 设备阻碍/运转时间按日统计 | `day`、`departmentId`、`processType`、`deviceCode`、`deviceId` |
| GET | `/device/availability/day/report` | 日报设备可动率 | `day`、`departmentId`、`processType`、`deviceCode` |
| GET | `/basic/month-segment/base-data` | 根据月份查询月份段基础数据 | `month`* |
| GET | `/attendance/twoDayAttendancePerformance` | 制造日报-出勤实绩 | `department`、`processType`、`dataDate`*、`reportDate`* |
| GET | `/attendance/monthlyWorkhourSituation` | 根据月份、科室、工序查询每日工时推移 | `month`*、`department`、`processType` |
| GET | `/attendance/monthlyAttendanceSituation` | 根据月份、科室、工序查询每日出勤概况 | `month`*、`department`、`processType` |
| GET | `/attendance/attendanceSituation` | 根据科室及工序查询实时考勤状况 | `date`、`department`、`processType` |
| GET | `/attendance/attendanceDetailSituation` | 当日考勤详情状况 | `date`、`department`、`processType` |

## 本次需要关注的契约变化与补录

- `getChangePoint`：本次新增 `beginDate/endDate/banci` 查询参数，说明分别为开始日期、结束日期、班次（早/夜），空值表示全部；返回描述新增 `banci/endDate/status`，状态0进行中、1已关闭。Swagger将六个参数均标必填，但只传progress=的GET成功；文档明确区分声明与实测，不覆盖用户已确认的省略范围查询约定。字段及图表分析见 [变化点统计分析](change-point-statistics.md)。
- `getShijiByDate`：按日期和设备查询计划实绩；标题明确“未完成”，响应项仍是开放对象，不能据此替换设备详情 mock。
- `month/daily-net`：“实绩MH”，响应 `data[]` 为 `period`、`netHours`。未解释净时长公式、人员/设备口径、班次或单位，不能直接认定为生产性公式中的直接人员出勤 MH。
- `day/report`：“日报设备可动率”，响应含设备、部门、工序、`day`、`totalRunHours`、`productionHours`、`obstructionHours`、`availabilityRate` 和 `obstructionItems[]`（`pauseType/pauseTypeName/obstructionHours/count/ratio`）。本次非空设备列表已验证，deviceId为string；三个样本时间全0、原因全空，仍未说明比率尺度、时间扣除和生产线重叠去重规则。
- 可动性 `year/month/day` 还支持可选 `deviceId`；`pauseRecords.deviceCode` 在 Swagger 中为可选，现有设备页面仍应传设备编码。已封装的 `day/pauseRecords` 不应列为“尚未接入访问层”。
- `getRejects` 描述给出 `type` 示例“不良”，并声明“日报中 废弃数 = 不良+其它”。这是服务端来源说明，尚未确认“其它”的枚举、去重和计数口径，不能直接覆盖项目日报规范中权威指标独立取值的要求。
- `getDeviceload` 描述声明负荷为小数，并提示加硫只返回机型汇总；与设备卡按 `devCode` 匹配的需求存在粒度差异，需实际联调，不能把机型负荷自动分摊到每台设备。
- schedule 多数返回项仍是开放对象；描述中的示例不构成完备类型，也不能据此删除过去实测过的扩展字段。

## 验证边界

本次同步更新日报适配、回归测试及制造日报spec。出勤分类小数保留、有效部分隔离与完整性提示已实现；未变更其他看板的筛选或统计策略。未执行POST保存接口。历史超时不是本次恢复后的状态，空数据也不代表数据完整或数量为零。
