## Context

当前项目是 Vue 3 + uni-app + Vite 的工厂大屏可视化应用，现有页面使用 `view`、`text`、`scroll-view` 等 uni-app 组件，并通过 `DESIGN.md` 中定义的 `--um-*` 颜色和 `--space-*` 间距变量保持工业大屏风格。

仓库当前没有通用图表组件，也没有 ECharts 相关依赖。用户提供的参考图是一个白底分析卡片：顶部为标题区和右上角展开按钮，上半部分为矩阵表格，下半部分为柱线组合图。新能力需要抽象为可复用组件，而不是绑定入库业务字段。

Context7 文档确认 `uni-echarts` 支持在 uni-app Vue 3 中通过 `option`、`autoresize`、`updateOptions` 等 props 渲染图表；ECharts 官方 `setOption` 支持默认合并、`replaceMerge` 和 `notMerge`，适合处理 chart data 变化后的系列刷新。

## Goals / Non-Goals

**Goals:**

- 新增一个可复用的表格加图表卡片组件，作为后续数据分析看板的基础展示单元。
- 通过 props 分别接收标题信息、表格行配置、表格列配置、表格数据、`chartOptions` 和 `chartData`。
- 保持现有工业大屏设计系统，使用白色面板、细边框、等宽数字、紧凑表格和稳定图表高度。
- 右上角展开按钮仅保留可见控件和空函数，不做弹窗、全屏、路由跳转或状态管理。
- 图表容器自动适配尺寸变化，数据变化时正确刷新 ECharts。

**Non-Goals:**

- 不新增业务 API 请求，也不内置入库计划的业务数据计算。
- 不改变现有部门、工序、设备页面路由和导航逻辑。
- 不实现真正的展开、全屏或弹窗能力。
- 不在本次能力中实现表格编辑、排序、过滤、分页或虚拟滚动。
- 不把组件绑定到单一图表类型，调用方仍通过 `chartOptions` 决定柱状图、折线图或组合图配置。

## Decisions

### 1. 组件边界采用通用展示组件

组件建议新增在 `src/components/TableChartCard.vue`，相关类型可放在同级 `TableChartCard.types.ts` 或组件内导出。现有页面级组件仍保留在 `src/pages/**/components`，跨页面复用能力放到 `src/components`，避免未来被某个页面目录绑定。

备选方案是放入 `src/pages/index/components`。该方案改动更小，但会让部门、工序、设备以外页面复用时出现反向依赖，因此不采用。

### 2. 表格采用行列定义和数据矩阵分离

表格 props 采用三部分：

- `tableRows`: 行定义数组，包含 `key`、`label`、可选 `unit`、`formatter` 和语义状态。
- `tableColumns`: 列定义数组，包含 `key`、`label`、可选宽度和对齐方式。
- `tableData`: 数据矩阵，形如 `Record<rowKey, Record<columnKey, value>>`。

渲染时按 `tableRows` 和 `tableColumns` 的顺序输出，单元格值从 `tableData[row.key]?.[column.key]` 读取。这样行列显示顺序和数据本身解耦，满足用户“行、列都是可配置的，数据通过另一个 prop 传入”的要求。

备选方案是让 `tableData` 自带完整行列结构。该方案调用简单，但会把展示配置和数据混在一起，不利于同一数据在不同列配置下复用，因此不采用。

### 3. 图表采用 `chartOptions` 基础配置加 `chartData` 数据覆盖

组件接收：

- `chartOptions`: ECharts 基础 option，包含 tooltip、legend、grid、axis、series 样式等配置。
- `chartData`: 数据覆盖对象，支持 `dataset`、`xAxisData` 和 `series` 数据。

组件内部通过 computed 生成 `resolvedChartOptions`。合成规则为：先使用 `chartOptions`，再用 `chartData.dataset` 覆盖 dataset，用 `chartData.xAxisData` 覆盖类目轴数据，用 `chartData.series` 按 `id`、`name` 或索引合并到已有 series 中，仅替换数据字段并保留调用方在 `chartOptions` 中传入的类型和样式。

实现 ECharts 更新时需要设置 `updateOptions`。当 series 数量可能变化时，优先使用 `replaceMerge: ["series", "xAxis", "dataset"]`，避免 ECharts 默认合并导致旧 series 残留。

备选方案是要求调用方每次传入完整 option。该方案最贴近 ECharts 原生 API，但不满足用户“chartoptions 和 chart data 分别通过 props 传入”的要求，因此不采用。

### 4. ECharts 集成优先使用 uni-app 适配层

实现阶段优先引入 `echarts` 和 `uni-echarts`。相较直接操作 DOM 初始化 ECharts，`uni-echarts` 更贴近 uni-app 组件模型，支持 `autoresize` 和组件化事件，并能覆盖 H5 以外的潜在 uni-app 平台。

为了支持调用方传入不同图表类型的 `chartOptions`，第一版可以使用完整 ECharts 注册方式，确保柱线组合等常见图表可直接工作。如果后续包体积成为问题，再改为按项目实际图表类型注册 `echarts/core` 模块。

备选方案是直接在组件内 `echarts.init`。该方案 H5 可控，但在 uni-app 多端场景下需要额外处理 canvas、生命周期和 resize，不作为默认选择。

### 5. 视觉和交互保持大屏数据面板风格

组件外层为白色面板，使用 `var(--um-color-surface)`、`var(--um-color-border)`、`var(--space-*)` 和等宽数字排版。表格区域允许横向滚动，列宽稳定，避免数据较多时挤压标题和图表。图表区域必须有明确高度，防止 ECharts 容器初始化为 0。

展开按钮使用轻量按钮样式，点击调用 `handleExpand()` 空函数。该函数不 emit、不改变状态、不写 TODO 文本，后续真正展开能力另行设计。

## Risks / Trade-offs

- [Risk] `chartOptions` 与 `chartData` 合并规则过宽会产生不可预期覆盖。Mitigation: 只定义受支持的数据覆盖字段，并在类型中限制输入结构。
- [Risk] ECharts 默认合并会在 series 缩减时保留旧系列。Mitigation: 使用 `updateOptions.replaceMerge` 或在必要时 `notMerge`。
- [Risk] 完整 ECharts 注册会增加包体积。Mitigation: 第一版优先满足可配置能力，后续按实际图表类型抽取 tree-shaking 注册。
- [Risk] 表格列数过多会影响触摸屏阅读。Mitigation: 表格区域使用横向滚动和固定最小列宽，标题区与图表区不被压缩。
- [Risk] 组件没有真实展开能力会让按钮语义不完整。Mitigation: 当前仅作为视觉占位，函数命名清晰并在 spec 中限定无副作用。

## Migration Plan

1. 新增组件和类型，不影响现有页面。
2. 添加 ECharts 相关依赖和最小图表注册配置。
3. 用一份 Mock 数据接入组件进行 H5 手工验收。
4. 若验收时发现依赖不适合目标平台，可回滚依赖和组件引用，现有页面不受影响。

## Open Questions

无阻塞问题。默认按当前仓库的 H5 工厂大屏场景实现，同时保留 uni-app 多端兼容余地。
