## 1. 依赖与组件骨架

- [x] 1.1 确认 ECharts 目标平台方案，并在 `package.json` 中添加 `echarts` 与适合 uni-app Vue 3 的图表集成依赖。
- [x] 1.2 新增 `src/components/TableChartCard.vue`，使用 `<script setup lang="ts">` 和 uni-app 的 `view`、`text`、`scroll-view` 结构。
- [x] 1.3 定义组件 props 和类型，包括 `title`、`subtitle`、可选标签、`tableRows`、`tableColumns`、`tableData`、`chartOptions` 和 `chartData`。
- [x] 1.4 为表格单元格值、行配置、列配置、图表数据覆盖对象补齐类型约束，避免使用宽泛未约束类型。

## 2. 表格实现

- [x] 2.1 按 `tableRows` 和 `tableColumns` 顺序渲染表头、行标题和单元格。
- [x] 2.2 从 `tableData[row.key][column.key]` 读取单元格值，并支持数字、字符串、空值和格式化函数。
- [x] 2.3 为缺失数据渲染统一空值占位，确保空数组、空对象和未定义数据不会触发运行时错误。
- [x] 2.4 为列数较多的表格实现横向滚动或等效溢出处理，保持标题区和图表区稳定。

## 3. 图表实现

- [x] 3.1 集成 ECharts 渲染组件，完成必要的 `provideEcharts`、组件注册或等效初始化。
- [x] 3.2 实现 `resolvedChartOptions`，将 `chartOptions` 与 `chartData` 合成最终 ECharts option。
- [x] 3.3 按 `id`、`name` 或索引合并 `chartData.series` 到基础 series，保留调用方在 `chartOptions` 中配置的图表类型和样式。
- [x] 3.4 配置 ECharts 更新策略，确保数据更新和 series 数量减少时不会残留旧数据。
- [x] 3.5 为图表区域设置稳定宽高和自动 resize，并在无图表数据时展示空状态或空图表容器。

## 4. 视觉与交互

- [x] 4.1 实现标题区、可选副标题、可选标签和右上角展开占位按钮。
- [x] 4.2 实现 `handleExpand()` 空函数，点击展开按钮时不改变路由、布局或组件状态。
- [x] 4.3 使用 `DESIGN.md` 中的 `--um-*`、`--space-*`、等宽数字和低动效策略完成组件样式。
- [x] 4.4 补齐窄屏和大屏响应式规则，确保文本、表格和图表不重叠、不挤压、不产生非预期横向页面滚动。

## 5. 示例与验证

- [x] 5.1 添加一份 Mock 使用示例，覆盖参考图中的标题、表格行列、表格数据和柱线组合图数据。
- [x] 5.2 在可见页面或临时验收入口接入示例，确保组件能通过 H5 真实页面观察。
- [x] 5.3 运行 `npm run type-check` 并修复组件相关类型诊断。
- [x] 5.4 运行 `npm run build:h5`，确认新增依赖和组件能完成生产构建。
- [x] 5.5 启动 H5 预览并进行手工 QA：检查大屏和窄屏布局、表格横向滚动、图表渲染、空状态和展开按钮无副作用。
