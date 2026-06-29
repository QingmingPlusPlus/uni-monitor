# 工厂可视化三维度说明

本项目是一个工厂可视化看板，用于在 2K 触摸大屏上集中呈现工厂项目的运行状态。整体信息架构围绕三个维度展开：**部门**、**工序**、**设备**。

## 三个维度

### 1. 部门维度（Department）

- 路由：`pages/department/index?departmentId=department1`
- 描述：以部门为粒度展示组织单元的计划、实绩、人员配置与工序覆盖关系。
- 页面布局：顶部为 `Omni Monitor` + 当前部门 Mock 告警跑马灯；主体左侧三分之一为 `css-map`，右侧三分之二为可滚动瀑布流。宽屏右侧按 `2列 x 2排` 展示人员出勤情况（mock）、人员出勤率推移（mock）、人员明细及状态（mock）、入库计划推移（mock）；窄屏退化为单列。
- 状态来源：`departmentId` query 是页面状态源。
- 长屏刷新：部门页按设备本地时间每天 06:20 软刷新一次显示数据；右侧各 mock 卡片右上角均提供手动刷新与展开按钮，刷新不执行整页 reload。

### 2. 工序维度（Process）

- 路由：`pages/process/index?processId=pretreatment1`
- 描述：以工序为粒度展示生产流程，关注当前工序的人员、稼动、计划和异常。
- 页面布局：顶部为 `Omni Monitor` + 当前工序 Mock 告警跑马灯；主体左侧为 `css-map`，右侧为 KPI 总览 + 瀑布流；瀑布流第一项是跨整行的人员出勤情况（mock）组件，后续保留 4 个 `TableChartCard` 仪表盘。
- 状态来源：`processId` query 是页面状态源。

### 3. 设备维度（Equipment）

- 路由：`pages/equipment/index?deviceId=1101&from=department`
- 描述：以单个设备为粒度展示停止、计划、损耗、原因、时间轴和周期信息。
- 页面布局：顶部为返回按钮 + `Omni Monitor` + 当前设备 Mock 告警跑马灯；主体为全宽详情分析面板，不展示旧设备瀑布流。
- 状态来源：`deviceId` query 是设备主键；`from` 仅用于返回部门或工序维度。
- 注意：URL 不传 `deviceCode`，后续真实接口应通过 `deviceId` 查询设备元数据与业务数据。

## 顶部告警栏

- 三个维度统一使用顶部告警栏，品牌标题固定显示为 `Omni Monitor`。
- 告警数据当前为 Mock：部门页按 `departmentId`、工序页按 `processId`、设备页按当前 `deviceId` 生成。
- 告警栏左侧固定显示“异常信息”，多条告警横向连续滚动；无告警时显示“暂无异常信息”。
- 设备维度返回按钮位于顶部告警栏最左侧，并沿用 `from` 与设备所属工序的原返回逻辑。

## Mock 展示规则

- 可见 Mock 标识统一放在对应块的标题或 KPI 标签中，格式为 `（mock）`，不再使用独立的 Mock 标签行或信息行。
- 人员出勤卡、人员出勤率推移、人员明细及状态、入库计划推移、右侧 `TableChartCard` 和设备详情主标题在标题中显示 `（mock）`。
- KPI 中仅由 Mock 数据产生的项目在标签中显示 `（mock）`；对应 note 为空时不展示 note 行。
- 部门页人员出勤率推移表与入库计划推移表只展示周数据，不展示月列或日列。
- 部门页两个推移表的 mock 源数据按工序返回一个月中每一天的数据；页面首次加载时查询月周配置并写入 `sessionStorage`，再按各工序周配置汇总为周数据。配置缺失或加载失败时沿用自然周回退。

## `css-map` 数据与交互

- 地图数据源：`public/factory-map/devices.json`。
- 选择器配置源：`public/factory-map/selection.json`，维护部门列表、工序列表、默认值以及部门 → 工序对应关系；H5 构建同时保留 `src/static/factory-map/selection.json` 作为 Uni-app 静态资源副本，加载失败或格式非法时回退到代码内置默认配置。
- 下拉选择部门：真实跳转到 `/pages/department/index?departmentId=<id>`，并同步右侧 Mock 数据。
- 下拉选择工序：真实跳转到 `/pages/process/index?processId=<id>`，并同步右侧 Mock 数据。
- 清空工序选择：真实跳转到 `/pages/department/index?departmentId=<当前部门 id>`；在工序维度清空时使用当前工序所属部门。
- 地图区域：只负责视觉聚焦，不通过点击区域切换维度。
- 设备节点：双击进入 `/pages/equipment/index?deviceId=<id>&from=department|process`。
- 点选模式：通过地图屏幕按钮开启，开启后单击设备进入设备详情；双击快捷入口仍保留。
- 屏幕按钮：固定步长上/下/左/右平移、放大、缩小、重置、适配当前选区。

## 层级关系

```
部门（Department）
  └── 工序（Process）—— 一个部门负责一个或多个工序
        └── 设备（Equipment）—— 一个工序包含若干设备
```

- **部门 → 工序**：由 `public/factory-map/selection.json` 维护部门与工序的聚合关系，当前为制造1课负责前处理1/前处理2、制造2课负责加硫1、制造3课负责后处理1、制造4课负责加硫2/后处理2。
- **部门人员出勤表**：由部门对应的 `processIds` 决定显示哪些工序类别；同类工序按去除尾部数字后的工序名合并，例如前处理1/前处理2 显示为一组“前处理”，制造4课的加硫2/后处理2 显示为“加硫”“后处理”并追加“制造4课全体”合计；信息行仅显示部门名与更新时间。
- **工序人员出勤表**：工序维度复用部门人员出勤组件，但仅展示当前 `processId` 对应工序的一组 Mock 出勤数据，不按工序类别合并。
- **工序 → 设备**：由 `devices.json` 中设备的 `section` 字段关联。
- **设备详情**：以 `devices.json` 中的设备 `id` 作为 URL 主状态，当前 Mock 数据可共用，但代码结构按未来真实接口预留。

## 页面路由一览

| 路由 | 维度 | 状态 query | 布局 |
| --- | --- | --- | --- |
| `pages/department/index` | 部门 | `departmentId` | 告警栏 + 左三分之一 `css-map` + 右侧 `2列 x 2排` 人员出勤/出勤率/人员明细/入库计划 mock 瀑布流 |
| `pages/process/index` | 工序 | `processId` | 告警栏 + `css-map` + KPI + 人员出勤卡 + 4 个 `TableChartCard` |
| `pages/equipment/index` | 设备 | `deviceId`、`from` | 带返回按钮的告警栏 + 单设备详情分析面板 |
