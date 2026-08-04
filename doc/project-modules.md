# 项目模块索引

本文档按可独立维护的源码边界列出当前模块及其说明入口。目录中的每个文件不单独视为模块；同一业务能力的页面、组件、数据装配和工具会归入一个模块说明。

## 模块一览

| 模块 | 主要路径 | 职责 | 当前状态 | 说明入口 |
| --- | --- | --- | --- | --- |
| 应用入口与运行时 | `src/main.ts`、`src/App.vue`、`src/pages.json`、`src/manifest.json`、根目录构建配置 | 创建 Uni-app/Vue 应用、注册页面、提供全局样式变量和开发构建配置 | 生效 | `doc/application-runtime.md` |
| API 访问层 | `src/api/`、`vite.config.ts` | 统一 `/api` 请求前缀、接口类型和后端端点封装 | 生效 | `doc/api-module.md` |
| 部门、工序、设备页面 | `src/pages/department/`、`src/pages/process/`、`src/pages/equipment/` | 维护三个可视化维度的路由状态、页面生命周期和设备详情返回逻辑 | 生效 | `doc/factory-dimensions.md`、`doc/factory-dashboard-architecture.md` |
| 看板页面骨架 | `src/pages/factory-dashboard/components/`、`src/pages/factory-dashboard/utils/` | 组合告警栏、地图、右侧卡片、设备详情和跨运行时路由 | 生效 | `doc/factory-dashboard-architecture.md`、`DESIGN.md` |
| 看板数据装配 | `src/pages/factory-dashboard/data/` | 定义看板数据模型，按维度并发加载卡片，处理缓存、聚合和 mock 降级 | 生效 | `doc/factory-dashboard-architecture.md`、`doc/factory-dashboard-real-data-mapping.md` |
| 厂区地图 | `src/components/css-map/`、`src/static/factory-map/` | 加载地图配置和实时设备数据，以 Sprite 为主、CSS3D 为回退渲染厂区 | 生效 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md`、`openspec/specs/css-map/spec.md` |
| 共用表格图表卡片 | `src/components/table-chart-card/` | 提供表格、ECharts、展开弹窗和紧凑模式的统一容器 | 生效 | `DESIGN.md`、`doc/factory-dimensions.md` |
| 业务趋势卡片 | `src/components/attendance-trend-card/`、`src/components/department-inbound-plan-trend-card/`、`src/components/process-production-plan-trend-card/` | 在共用卡片上封装出勤、入库、生产计划实绩三类展示 | 生效 | `doc/factory-dashboard-real-data-mapping.md`、`doc/factory-dimensions.md` |
| 共享工具 | `src/utils/`、`src/components/LoadingIcon.vue` | 维护月分段缓存、跨工序周聚合和通用加载态 | 生效 | `doc/shared-utilities.md` |
| 历史指标卡片 | `src/components/department-defect-amount-card/`、`src/components/department-defect-count-card/`、`src/components/department-mh-card/` | 保留不良金额、不良个数和 MH 的固定 mock 展示实现 | 保留，未挂载 | `doc/retained-dashboard-cards.md` |
| 设计系统 | `DESIGN.md`、`src/App.vue` | 规定大屏颜色、排版、间距、组件和交互基线 | 生效 | `DESIGN.md` |
| 项目治理与记忆 | `AGENTS.md`、`doc/agent-guide.md`、`doc/agent-memory-map.md`、`.agents/skills/`、`openspec/` | 约束文档语言、三层记忆路由和 OpenSpec 工作流 | 生效 | `doc/agent-guide.md`、`doc/agent-memory-map.md` |

## 配置与静态资源边界

- `src/static/factory-map/devices.json` 保存地图尺寸、工序边界、设备和子设备布局；`src/static/factory-map/selection.json` 保存部门、工序和默认选择关系。
- `src/pages.json` 是页面注册清单，不保存业务筛选状态；部门、工序、设备主状态均来自 URL query。
- `src/manifest.json` 是 Uni-app 多端清单；当前厂区 Sprite 地图的产品目标仍是 H5 大屏。
- 根目录的 `vite.config.ts`、`vitest.config.ts` 和 `tsconfig.json` 分别负责开发代理、单元测试发现和 TypeScript 编译边界。

## 维护规则

- 新增顶层页面、独立业务组件族、API 域或共享基础设施时，先判断是否属于上表已有模块；属于时更新对应专项说明，不重复创建同义文档。
- 新能力形成独立维护边界时，新增中文说明文档，并同步本索引与 `doc/agent-memory-map.md`。
- 模块从“生效”变为“保留”或被删除时，必须更新状态，避免后续开发把未挂载代码误认为线上入口。
- 接口字段、聚合口径和已知缺口分别维护在 `doc/factory-dashboard-real-data-mapping.md` 与 `doc/department-api-gaps.md`，不在本索引重复展开。
