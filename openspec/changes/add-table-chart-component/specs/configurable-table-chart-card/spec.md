## ADDED Requirements

### Requirement: 组件渲染标题区和展开占位
表格图表卡片组件 MUST 接收标题相关 props，并在卡片顶部渲染标题、可选副标题和可选标签。组件 MUST 在右上角保留展开按钮控件，点击后仅调用内部空函数，不产生页面跳转、弹窗、全屏或状态变化。

#### Scenario: 渲染标题和展开按钮
- **WHEN** 调用方传入 `title`、`subtitle` 和可选标签
- **THEN** 组件顶部按设计系统样式展示这些文本
- **AND** 右上角展示展开占位按钮

#### Scenario: 点击展开占位按钮
- **WHEN** 用户点击展开占位按钮
- **THEN** 组件调用内部 `handleExpand` 空函数
- **AND** 页面布局、路由和组件状态保持不变

### Requirement: 表格行列配置由 props 控制
组件 MUST 通过 `tableRows` 和 `tableColumns` props 控制表格展示行和展示列。渲染顺序 MUST 与 props 数组顺序一致，组件不得内置入库计划、实绩、差异、达成率等业务行列。

#### Scenario: 按传入配置渲染表格结构
- **WHEN** 调用方传入 4 个 `tableRows` 和 6 个 `tableColumns`
- **THEN** 组件渲染 4 行业务数据和 6 列数据单元
- **AND** 每一行和每一列的显示顺序与 props 数组一致

#### Scenario: 更换行列配置
- **WHEN** 调用方传入另一组 `tableRows` 或 `tableColumns`
- **THEN** 组件按新的配置重新渲染表格结构
- **AND** 组件不依赖旧配置中的行 key 或列 key

### Requirement: 表格数据由独立 prop 提供
组件 MUST 通过独立的 `tableData` prop 接收表格数据，并按 `tableRows[*].key` 和 `tableColumns[*].key` 定位单元格值。组件 MUST 支持数字、字符串、空值和调用方提供的格式化函数。

#### Scenario: 渲染矩阵数据
- **WHEN** `tableRows` 包含 key `plan`，`tableColumns` 包含 key `month`
- **AND** `tableData.plan.month` 的值为 `600000`
- **THEN** 组件在 `plan` 行和 `month` 列交叉单元格展示格式化后的值

#### Scenario: 数据缺失
- **WHEN** 某个行列交叉位置在 `tableData` 中不存在或值为空
- **THEN** 组件展示统一的空值占位
- **AND** 组件不抛出运行时错误

### Requirement: 图表 options 和数据由独立 props 提供
组件 MUST 通过 `chartOptions` prop 接收 ECharts 基础配置，并通过 `chartData` prop 接收图表数据覆盖。组件 MUST 将两者合成为传给 ECharts 的最终 option，且数据变化后 MUST 刷新图表。

#### Scenario: 渲染传入的图表配置和数据
- **WHEN** 调用方传入包含 tooltip、legend、axis 和 series 样式的 `chartOptions`
- **AND** 调用方传入包含类目和 series 数据的 `chartData`
- **THEN** 组件渲染使用这些配置和数据的 ECharts 图表

#### Scenario: 图表数据更新
- **WHEN** 调用方更新 `chartData` 中的类目或 series 数据
- **THEN** 组件刷新 ECharts option
- **AND** 图表展示最新数据而不是旧数据

#### Scenario: series 数量减少
- **WHEN** 新的 `chartData.series` 数量少于上一轮数据
- **THEN** 组件更新图表后不保留已经删除的旧 series

### Requirement: 组件遵循工厂大屏设计系统
组件 MUST 使用项目现有 `DESIGN.md` 中的颜色、字号、间距、边框和低动效约束。组件 MUST 保持白色面板、紧凑表格、稳定图表高度和等宽数字排版，并在窄屏下避免内容重叠。

#### Scenario: 大屏展示
- **WHEN** 组件在 H5 大屏页面中展示
- **THEN** 卡片背景、边框、文字颜色和间距使用 `--um-*` 与 `--space-*` 设计变量
- **AND** 表格和图表均在卡片范围内稳定展示

#### Scenario: 列数较多
- **WHEN** 表格列数超过可视宽度
- **THEN** 表格区域提供横向滚动或等效溢出处理
- **AND** 标题区和图表区不被挤压变形

### Requirement: 组件提供基础空状态
组件 MUST 在缺少表格配置、表格数据或图表数据时提供可读的空状态，且不得因为空数组、空对象或未定义数据导致运行时错误。

#### Scenario: 表格无配置
- **WHEN** `tableRows` 或 `tableColumns` 为空数组
- **THEN** 表格区域展示空状态提示
- **AND** 组件仍渲染标题区和图表区域

#### Scenario: 图表无数据
- **WHEN** `chartData` 不包含可渲染数据
- **THEN** 图表区域展示空状态或空图表容器
- **AND** 组件不抛出运行时错误
