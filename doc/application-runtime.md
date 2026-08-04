# 应用入口与运行时说明

本模块负责启动 Uni Monitor、注册三个页面、注入全局设计变量，并配置本地开发、类型检查和测试环境。业务页面和接口映射不在本模块中实现。

## 主要入口

| 文件 | 职责 |
| --- | --- |
| `src/main.ts` | 通过 `createSSRApp(App)` 创建 Uni-app/Vue 3 应用实例；当前未注册全局插件或全局组件。 |
| `src/App.vue` | 接收 `onLaunch`、`onShow`、`onHide` 生命周期，并在全局样式中定义颜色、间距和页面基础样式。 |
| `src/pages.json` | 注册部门、工序、设备三个页面，统一使用自定义导航栏。 |
| `src/manifest.json` | 保存 Uni-app 应用标识、多端构建清单和平台能力配置。 |
| `src/uni.scss` | Uni-app 样式入口；项目主要设计变量目前定义在 `src/App.vue`。 |
| `vite.config.ts` | 启用 Uni-app Vite 插件，并配置开发环境 `/api` 反向代理。 |
| `tsconfig.json` | 覆盖 `src` 下的 TypeScript、声明文件和 Vue SFC，提供 `@/* -> src/*` 路径别名。 |
| `vitest.config.ts` | 使用 Node 环境运行 `src/**/*.test.ts`。 |

## 启动与页面注册

应用启动后由 Uni-app 根据 `src/pages.json` 创建页面。当前页面顺序如下：

1. `pages/department/index`：默认入口，读取 `departmentId`。
2. `pages/process/index`：读取 `processId`。
3. `pages/equipment/index`：读取 `deviceId` 和返回来源 `from`。

页面职责、query 规则和维度间跳转详见 `doc/factory-dimensions.md` 与 `doc/factory-dashboard-architecture.md`。

## 全局样式

`src/App.vue` 在 `page`、`body` 和 `#app` 上定义 `--um-color-*` 与 `--space-*` 变量，所有看板组件应复用这些变量。`768px` 以上切换为像素间距，窄屏保留 `rpx` 间距。完整的视觉语义和组件规则以 `DESIGN.md` 为准。

本模块只提供全局基线；页面组件继续使用 scoped 样式维护自身布局，不应在 `App.vue` 中加入单个业务卡片的特例。

## 开发代理与生产部署

- API 客户端固定请求 `/api`，详见 `doc/api-module.md`。
- 本地 `npm run dev:h5` 由 Vite 接收 `/api/*`，转发到 `vite.config.ts` 中的开发后端，并在转发时移除 `/api` 前缀。
- 当前代理目标直接写在 `vite.config.ts`，没有从 `.env` 读取。
- 生产构建不会自动继承 Vite 开发代理；部署环境需要由同源网关或 Web 服务器提供 `/api` 转发，否则浏览器请求会落到前端站点自身。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev:h5` | 启动 H5 开发服务。 |
| `npm run build:h5` | 生成 H5 构建产物。 |
| `npm run type-check` | 运行 `vue-tsc --noEmit`。 |
| `npm test` | 运行全部 Vitest 单元测试。 |
| `npm run test:watch` | 监听源码并重复运行相关测试。 |

`package.json` 还保留多种小程序、App 和快应用脚本，但当前 WebGL Sprite 厂区地图只承诺 H5 大屏体验。跨端发布前需要单独验证 Three.js、DOM API、`window`、`sessionStorage` 和 hash 路由相关能力。

## 修改注意事项

- 新增页面时同步更新 `src/pages.json`、模块索引和路由说明。
- 调整全局颜色或间距时同步更新 `DESIGN.md`，避免实现与设计基线分叉。
- 修改 `/api` 前缀或代理 rewrite 时同时检查 `src/api/http.ts`、部署网关和接口文档。
- 新增测试目录规则或浏览器环境测试时更新 `vitest.config.ts`；当前默认测试环境不提供 DOM。
