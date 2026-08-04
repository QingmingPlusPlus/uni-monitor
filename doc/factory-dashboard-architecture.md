# 工厂看板模块架构说明

工厂看板模块把部门、工序和设备三个页面连接到共用视图、卡片组件、真实接口 loader 与 mock 降级数据。本文描述代码分层和装配关系；业务展示口径见 `doc/factory-dimensions.md`，接口字段见 `doc/factory-dashboard-real-data-mapping.md`。

## 总体数据流

```text
页面入口（department / process / equipment）
  -> 读取 URL query 与选择配置
  -> 创建同步 fallback 数据
  -> 调用维度级 dashboard loader
     -> 并发调用卡片级 loaders
     -> 单卡失败时保留 fallback
  -> FactoryDashboardView / EquipmentDetailView
     -> 地图、告警栏、汇总、稼动、人员、趋势卡片
```

## 页面入口职责

| 页面 | 主要职责 |
| --- | --- |
| `src/pages/department/index.vue` | 以 `departmentId` 为状态源；加载选择配置和当月分段；装配部门看板；支持卡片级刷新，并在本地时间每日 06:20 触发一次显示数据刷新。 |
| `src/pages/process/index.vue` | 以 `processId` 为状态源；反查所属部门；装配单工序看板并处理工序卡片刷新。 |
| `src/pages/equipment/index.vue` | 以 `deviceId` 为状态源，从地图设备或子设备中定位当前设备；详情主体仍使用 `equipmentDetailMock.ts`，并依据 `from` 返回部门或工序页。 |

部门页和工序页都先创建同步 mock fallback，再异步加载真实数据。这样页面可以立即得到完整的数据结构，接口部分失败时也不会让整个看板失去渲染条件。

## 视图组件

| 目录/组件 | 职责 |
| --- | --- |
| `FactoryDashboardView` | 组合顶部告警、左侧地图和右侧滚动面板；默认使用 Sprite 地图，收到回退事件后切换 CSS3D；管理 80vw × 80vh 地图展开层。 |
| `FactoryDashboardPanel` | 按固定顺序装配汇总、稼动、人员出勤、人员明细和趋势卡片；制造 1 课及其前处理工序隐藏入库计划卡。 |
| `FactoryAlertHeader` | 轮播当前维度的告警项；告警数据目前来自 `factoryAlarmMock.ts`。 |
| `ProductionSummaryCard` | 展示计划、实绩、人员等汇总值。 |
| `ProductionActivityCard` | 展示部门或工序下设备运行、异常和计划停止数量。 |
| `PersonnelAttendanceCard`、`PersonnelDetailCard` | 展示实时出勤聚合和人员明细，向页面上抛卡片刷新事件。 |
| `EquipmentDetailView` | 展示设备 KPI、计划、损耗原因、时间轴和周期数据，并上抛返回事件。 |
| `FactoryKpiGrid` | 设备详情使用的通用 KPI 网格。 |
| `DashboardExpandMockModal` | 为 `TableChartCard` 的 `use-mock-expand` 模式生成演示展开表格；真实趋势卡片使用自身完整 modal 数据。 |

## 数据目录分层

| 路径 | 作用 |
| --- | --- |
| `data/factoryDashboardTypes.ts` | 定义三类看板数据、卡片 ID、KPI、告警、出勤、稼动和设备详情模型。 |
| `data/factoryDashboardLoader.ts` | 统一导出页面允许调用的维度级与卡片级 loader，本身不保存业务实现。 |
| `data/dashboard/` | 按部门或工序并发装配完整看板数据；只复用相同 key 的进行中 Promise，不缓存已完成整页结果。 |
| `data/loaders/` | 负责 API 值转换、设备范围、班次与日期、卡片聚合、趋势周期、数值格式和月级 schedule 缓存。 |
| `data/factoryDashboardMock.ts` | 创建部门/工序同步 fallback 结构，并复用各趋势 mock 生成器。 |
| `data/factoryAlarmMock.ts` | 生成部门、工序和设备告警；当前没有真实告警接口。 |
| `data/equipmentDetailMock.ts` | 根据设备 ID 稳定生成设备详情演示数据。 |
| 其他 `*Mock.ts` | 为接口失败或未接入区域提供确定性的降级数据。 |

## 加载与降级

- 维度级 loader 使用 `Promise.allSettled` 并行加载稼动、出勤、趋势和人员明细。
- 单个 loader 成功时替换对应 fallback 字段；失败时仅该字段保留 fallback，其他卡片继续使用真实结果。
- 信息汇总依赖已解析的稼动和出勤，并额外读取计划/实绩；汇总生成失败时保留 fallback 汇总。
- 趋势字段为 `null` 时，`FactoryDashboardPanel` 显示 `LoadingIcon`。接口抛错但维度级 loader 有 fallback 时，通常会展示 fallback 卡片而不是空白。
- 设备详情、告警和部分同步 fallback 仍是 mock。判断某个字段是否真实接入时，以 `doc/factory-dashboard-real-data-mapping.md` 为准，不以组件名称推断。

## 刷新与缓存边界

- 页面筛选变化或刷新版本变化时重新调用维度级 loader；已完成的整页结果不缓存。
- 页面上的刷新事件携带卡片 ID，只替换被刷新卡片的数据，不重置地图选择。
- 入库与生产计划趋势存在按月 schedule 记录缓存；手动刷新必须传入 `forceRefresh: true` 使对应缓存失效。
- 月分段配置单独保存在 `sessionStorage`，不属于整页看板缓存。
- 地图设备配置和实时数据使用自己的加载、并发去重及 mock 开关，不能复用看板卡片缓存。

## 路由适配

`src/pages/factory-dashboard/utils/factoryRoutes.ts` 屏蔽 H5 与其他 Uni-app 运行时差异：

- H5 直接写入 `window.location.hash`，并监听 `hashchange` 同步 query。
- 非浏览器运行时使用 `uni.navigateTo` 或 `uni.redirectTo`。
- 部门、工序和设备 URL 统一由 `buildDepartmentUrl`、`buildProcessUrl`、`buildEquipmentUrl` 创建。
- 非法或缺失的设备返回来源默认按 `department` 处理。

## 扩展模块时

- 新增右侧卡片先扩展 `FactoryDashboardData` 和卡片 ID，再实现卡片级 loader、维度级装配、页面刷新分支与 `FactoryDashboardPanel` 渲染。
- 新卡片如果需要月级缓存，必须同时提供明确的失效函数和手动刷新路径。
- 单卡失败不得阻塞整个看板；为可选卡片明确约定 `null`、fallback 或错误态中的一种。
- 新增真实字段映射时更新 `doc/factory-dashboard-real-data-mapping.md`；新增后端契约缺口时更新 `doc/department-api-gaps.md`。
- 新增页面或 query 时使用路由工具创建 URL，并同步 `src/pages.json` 和 `doc/factory-dimensions.md`。
