# PC 与大屏双端构建规范

## Purpose

在同一仓库维护独立的 PC 与大屏页面，共享 API 和业务模块，并分别生成可部署的 H5 产物。

## Requirements

### Requirement: 两端页面独立注册

系统必须（MUST）根据构建目标选择独立页面入口，不以一套页面的运行时布局切换代替页面拆分。

#### Scenario: 构建 PC 端

- **WHEN** 执行 `npm run build:pc`
- **THEN** 仅注册 `pages-pc` 下的部门、工序、设备三个页面，默认入口为部门页
- **AND** 不注册现有大屏页面或制造日报页面

#### Scenario: 构建大屏端或使用原 H5 命令

- **WHEN** 执行 `npm run build:screen` 或原有 `npm run build:h5`
- **THEN** 保留部门、工序、设备和制造日报四个大屏页面及原有路径
- **AND** 不注册 PC 页面

### Requirement: 两端构建产物独立

系统必须（MUST）将 PC 与大屏构建产物输出至不同目录，允许分别部署。

#### Scenario: 依次构建两端

- **WHEN** 依次执行两个端的构建命令
- **THEN** `dist/build/pc/` 与 `dist/build/screen/` 均保留完整产物
- **AND** 后一次构建不清空前一端的输出目录

### Requirement: 两端共用 API 和业务模块

两端必须（MUST）共用同一套后端 API 和 `src/api/` 客户端，可以复用业务组件、数据加载模块和工具；页面布局由各端独立维护。

#### Scenario: PC 后续接入业务数据

- **WHEN** PC 页面需要查询已有业务接口
- **THEN** 复用现有 API 封装，不复制一套 PC 专用 API 实现
- **AND** 页面跳转指向 PC 端已注册页面

### Requirement: PC 部门与工序复用大屏业务组件

PC 部门、工序页必须（MUST）复用大屏地图、告警、业务卡片及数据加载和刷新逻辑；不显示制造日报按钮，布局以 1920×1080 为设计基准。

#### Scenario: 访问 PC 部门或工序

- **WHEN** 访问对应 PC 页面并传入 `departmentId` 或 `processId`
- **THEN** 展示该范围的大屏同款地图和卡片，保留筛选、刷新和展开交互
- **AND** 不显示制造日报按钮
- **AND** 在 1920×1080 下顶部展示告警栏，主体地图与卡片各占一半，右侧独立滚动且页面无横向溢出

#### Scenario: PC 内切换维度

- **WHEN** 选择部门、选择或清空工序、打开设备
- **THEN** 导航只指向 `pages-pc` 下已注册页面，保留维度参数和设备返回来源
- **AND** 大屏仍使用原 `pages` 路径及制造日报入口
