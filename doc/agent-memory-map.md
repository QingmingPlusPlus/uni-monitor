# 智能体记忆路由表

开发、评审、排障或文档/spec/skill 改动前，先按目标路径或模块读取本表。多行匹配时选择最具体路径，并合并读取相关记忆。

| 路径/模块 | 先读 doc | 先读 spec | 触发 skill | 改后同步 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md`、`doc/agent-guide.md`、`doc/agent-memory-map.md`、`.agents/skills`、`.codex/skills`、`.opencode/skills`、`.qoder/skills` | `doc/agent-guide.md`、`doc/agent-memory-map.md` | `openspec/specs/governance/spec.md` | `cross-memory-routing` | 更新治理 spec、路由表或对应 skill | 生效 |
| `pages/department/index`、`pages/process/index`、`pages/equipment/index`、工厂可视化三维度 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新工厂维度 doc、接口映射 doc 或页面组件 | 生效 |
| `src/components/css-map`、`public/factory-map`、`src/static/factory-map`、`css-map` 厂区地图 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md`、`DESIGN.md` | - | - | 更新工厂维度 doc、接口映射 doc、设计系统或地图组件 | 生效 |
| `src/utils/monthSegment.ts`、`src/components/LoadingIcon.vue`、月分段/自然周/sessionStorage 缓存 | `doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md` | - | - | 更新月分段模块说明：自然周计算、session 读写、`departmentId:processType` 复合键查找、CssMap→接口格式转换、加载器去重 | 生效 |
| `src/api/http.ts`、`src/api/*`、`vite.config.ts`、`.env`、接口前缀/开发代理 | - | - | - | 更新接口统一前缀、开发代理 rewrite 或环境说明 | 生效 |
| `src/pages/factory-dashboard/data/factoryDashboardLoader.ts`、部门/工序维度首页真实接口适配 | `doc/factory-dashboard-real-data-mapping.md`、`doc/department-api-gaps.md`、`doc/factory-dimensions.md` | - | - | 更新接口映射 doc、接口缺口 doc 或工厂维度 doc | 生效 |
| `<module-path>` | `doc/<module-doc>.md` | `<spec-path>` | `<skill-name>` | 更新模块 doc/spec/skill | 生效 |

## 兜底策略

- 没有匹配项时，先用 `rg` 在 `doc/`、`spec/`、`openspec/specs/`、`.agents/skills/` 中搜索目标路径、页面名、接口名和业务名。
- 若仍无结果，按三层治理创建最小记忆：约束未来行为进 spec，描述当前项目进 doc，指导重复操作进 skill。
- 本次改动新增长期入口、模块文档、spec 或 skill 时，必须补充本表。
