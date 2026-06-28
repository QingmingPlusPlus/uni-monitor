# 工厂可视化三维度说明

本项目是一个工厂可视化看板，用于在 2K 触摸大屏上集中呈现工厂项目的运行状态。整体信息架构围绕三个维度展开：**部门**、**工序**、**设备**。

## 三个维度

### 1. 部门维度（Department）

- 路由：`pages/department/index?departmentId=department1`
- 描述：以部门为粒度展示组织单元的计划、实绩、人员配置与工序覆盖关系。
- 页面布局：左侧为 `css-map`，右侧第一行是人员出勤情况专用表格卡片，下方为两列瀑布流展位卡片。
- 状态来源：`departmentId` query 是页面状态源。
- 长屏刷新：部门页按设备本地时间每天 06:20 软刷新一次显示数据；人员出勤卡和下方展位卡右上角均提供手动刷新与展开按钮，刷新不执行整页 reload。

### 2. 工序维度（Process）

- 路由：`pages/process/index?processId=pretreatment1`
- 描述：以工序为粒度展示生产流程，关注当前工序的人员、稼动、计划和异常。
- 页面布局：左侧为 `css-map`，右侧为 KPI 总览 + 4 个 `TableChartCard` 仪表盘。
- 状态来源：`processId` query 是页面状态源。

### 3. 设备维度（Equipment）

- 路由：`pages/equipment/index?deviceId=1101&from=department`
- 描述：以单个设备为粒度展示停止、计划、损耗、原因、时间轴和周期信息。
- 页面布局：全宽详情分析面板，不展示旧设备瀑布流。
- 状态来源：`deviceId` query 是设备主键；`from` 仅用于返回部门或工序维度。
- 注意：URL 不传 `deviceCode`，后续真实接口应通过 `deviceId` 查询设备元数据与业务数据。

## `css-map` 数据与交互

- 地图数据源：`public/factory-map/devices.json`。
- 选择器配置源：`public/factory-map/selection.json`，维护部门列表、工序列表、默认值以及部门 → 工序对应关系；H5 构建同时保留 `src/static/factory-map/selection.json` 作为 Uni-app 静态资源副本，加载失败或格式非法时回退到代码内置默认配置。
- 下拉选择部门：真实跳转到 `/pages/department/index?departmentId=<id>`，并同步右侧 Mock 数据。
- 下拉选择工序：真实跳转到 `/pages/process/index?processId=<id>`，并同步右侧 Mock 数据。
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
- **部门人员出勤表**：由部门对应的 `processIds` 决定显示哪些工序类别；同类工序按去除尾部数字后的工序名合并，例如前处理1/前处理2 显示为一组“前处理”，制造4课的加硫2/后处理2 显示为“加硫”“后处理”并追加“制造4课全体”合计。
- **工序 → 设备**：由 `devices.json` 中设备的 `section` 字段关联。
- **设备详情**：以 `devices.json` 中的设备 `id` 作为 URL 主状态，当前 Mock 数据可共用，但代码结构按未来真实接口预留。

## 页面路由一览

| 路由 | 维度 | 状态 query | 布局 |
| --- | --- | --- | --- |
| `pages/department/index` | 部门 | `departmentId` | `css-map` + 人员出勤卡 + 两列瀑布流展位卡 |
| `pages/process/index` | 工序 | `processId` | `css-map` + KPI + 4 个 `TableChartCard` |
| `pages/equipment/index` | 设备 | `deviceId`、`from` | 单设备详情分析面板 |
