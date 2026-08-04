# 智能体记忆路由表

开发、评审、排障或文档/spec/skill 改动前，先按目标路径或模块读取本表。多行匹配时选择最具体路径，并合并读取相关记忆。

| 路径/模块 | 先读 doc | 先读 spec | 触发 skill | 改后同步 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md`、`doc/agent-guide.md`、`doc/agent-memory-map.md`、`.agents/skills`、`.codex/skills`、`.opencode/skills`、`.qoder/skills` | `doc/agent-guide.md`、`doc/agent-memory-map.md` | `openspec/specs/governance/spec.md` | `cross-memory-routing` | 更新治理 spec、路由表或对应 skill | 生效 |
| 仓库模块盘点、模块边界、新增顶层模块、`doc/project-modules.md` | `doc/project-modules.md`、`doc/agent-memory-map.md` | - | `cross-memory-routing` | 更新模块索引、对应专项 doc 和路由表 | 生效 |
| `src/main.ts`、`src/App.vue`、`src/pages.json`、`src/manifest.json`、`src/uni.scss`、`package.json`、`vite.config.ts`、`tsconfig.json`、`vitest.config.ts`、应用入口/运行时/构建/测试配置 | `doc/application-runtime.md`、`DESIGN.md` | - | - | 更新运行时说明；涉及全局视觉时同步设计系统 | 生效 |
| `src/api/http.ts`、`src/api/*`、接口域、`/api` 前缀、开发代理 | `doc/api-module.md`、`doc/factory-dashboard-real-data-mapping.md`、`doc/department-api-gaps.md` | - | - | 更新 API 模块、字段映射、接口缺口或代理说明 | 生效 |
| `src/pages/factory-dashboard/components`、`src/pages/factory-dashboard/data`、`src/pages/factory-dashboard/utils`、看板装配/降级/卡片刷新/路由适配 | `doc/factory-dashboard-architecture.md`、`doc/factory-dashboard-real-data-mapping.md`、`doc/factory-dimensions.md` | - | - | 更新看板架构、接口映射或维度说明 | 生效 |
| `src/utils`、`src/components/LoadingIcon.vue`、月分段、跨工序周聚合、共享加载态 | `doc/shared-utilities.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新共享工具说明、接口映射和相关测试 | 生效 |
| `src/components/department-defect-amount-card`、`src/components/department-defect-count-card`、`src/components/department-mh-card`、历史/保留指标卡片 | `doc/retained-dashboard-cards.md`、`doc/department-api-gaps.md` | - | - | 更新保留状态；重新挂载时同步看板架构与接口映射 | 保留 |
| `pages/department/index`、`pages/process/index`、`pages/equipment/index`、工厂可视化三维度 | `doc/factory-dimensions.md`、`doc/factory-dashboard-architecture.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新工厂维度 doc、看板架构、接口映射或页面组件 | 生效 |
| `src/components/css-map`、`SpriteCssMapPanel`、`public/factory-map`、`src/static/factory-map`、`css-map` 厂区地图、设备卡片自适应布局、设备多边形、L 型专用内容布局 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md`、`DESIGN.md` | `openspec/specs/css-map/spec.md` | - | 更新 css-map spec、工厂维度 doc、接口映射 doc、设计系统或地图组件 | 生效 |
| `src/utils/monthSegment.ts`、`src/components/LoadingIcon.vue`、月分段/自然周/sessionStorage 缓存 | `doc/shared-utilities.md`、`doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新共享工具说明：自然周计算、session 读写、`departmentId:processType` 复合键查找、CssMap→接口格式转换、加载器去重 | 生效 |
| `src/pages/factory-dashboard/data/factoryDashboardLoader.ts`、部门/工序维度首页真实接口适配 | `doc/factory-dashboard-architecture.md`、`doc/factory-dashboard-real-data-mapping.md`、`doc/department-api-gaps.md`、`doc/factory-dimensions.md` | - | - | 更新看板架构、接口映射、接口缺口或工厂维度 doc；若新增/调整 loader 子模块，同步更新架构和映射入口 | 生效 |
| `src/components/table-chart-card`、`TableChartCard`、推移表共用紧凑表格/展开弹窗 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新共用表格数值适配、滚动或图表行为说明及组件测试 | 生效 |
| `src/components/attendance-trend-card`、`出勤率推移表`、`loadAttendanceTrendCard` | `doc/factory-dashboard-real-data-mapping.md`、`doc/factory-dimensions.md` | - | - | 更新出勤率推移表聚合口径、列展示规则或组件测试 | 生效 |
| `src/components/department-inbound-plan-trend-card`、`src/components/process-production-plan-trend-card`、`loadInboundPlanTrendCard`、`loadProductionPlanTrendCard`、推移卡片月级缓存与 `forceRefresh` 刷新 | `doc/factory-dashboard-real-data-mapping.md`、`doc/factory-dimensions.md` | - | - | 更新卡片刷新与缓存说明或推移表口径 | 生效 |

## 兜底策略

- 没有匹配项时，先用 `rg` 在 `doc/`、`spec/`、`openspec/specs/`、`.agents/skills/` 中搜索目标路径、页面名、接口名和业务名。
- 若仍无结果，按三层治理创建最小记忆：约束未来行为进 spec，描述当前项目进 doc，指导重复操作进 skill。
- 本次改动新增长期入口、模块文档、spec 或 skill 时，必须补充本表。
