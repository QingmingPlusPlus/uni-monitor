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
