# 工厂可视化三维度说明

本项目是一个工厂可视化看板，用于在 2K 触摸大屏上集中呈现工厂项目的运行状态。整体信息架构围绕三个维度展开：**部门**、**工序**、**设备**。

## 三个维度

### 1. 部门维度（Department）

- 路由：`pages/department/index?departmentId=department1`
- 描述：以部门为粒度展示组织单元的计划、实绩、人员配置与工序覆盖关系。
- 页面布局：左侧为 `css-map`，右侧为 KPI 总览 + 5 个 `TableChartCard` 仪表盘。
- 状态来源：`departmentId` query 是页面状态源。

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

- **部门 → 工序**：由 `cssMapDepartmentProcessMap` 维护部门与工序的聚合关系。
- **工序 → 设备**：由 `devices.json` 中设备的 `section` 字段关联。
- **设备详情**：以 `devices.json` 中的设备 `id` 作为 URL 主状态，当前 Mock 数据可共用，但代码结构按未来真实接口预留。

## 页面路由一览

| 路由 | 维度 | 状态 query | 布局 |
| --- | --- | --- | --- |
| `pages/department/index` | 部门 | `departmentId` | `css-map` + KPI + 5 个 `TableChartCard` |
| `pages/process/index` | 工序 | `processId` | `css-map` + KPI + 4 个 `TableChartCard` |
| `pages/equipment/index` | 设备 | `deviceId`、`from` | 单设备详情分析面板 |
