# 应用入口与运行时说明

本模块负责启动 Uni Monitor、按构建目标注册大屏或 PC 页面、注入全局设计变量，并配置本地开发、类型检查和测试环境。业务页面和接口映射不在本模块中实现。

## 主要入口

| 文件 | 职责 |
| --- | --- |
| `src/main.ts` | 通过 `createSSRApp(App)` 创建 Uni-app/Vue 3 应用实例；当前未注册全局插件或全局组件。 |
| `src/App.vue` | 接收 `onLaunch`、`onShow`、`onHide` 生命周期，并在全局样式中定义颜色、间距和页面基础样式。 |
| `src/pages.json` | 通过 `PC` 条件编译注册大屏四个页面或 PC 三个页面，统一使用自定义导航栏。 |
| `src/pages-pc/` | PC 部门、工序、设备独立页面；部门、工序复用大屏组件与数据，设备保留占位文字。 |
| `package.json` | 定义基于 H5 的 `screen`、`pc` 自定义构建目标和独立输出目录。 |
| `src/manifest.json` | 保存 Uni-app 应用标识、多端构建清单和平台能力配置。 |
| `src/uni.scss` | Uni-app 样式入口；项目主要设计变量目前定义在 `src/App.vue`。 |
| `vite.config.ts` | 启用 Uni-app Vite 插件，并配置开发环境 `/api` 反向代理。 |
| `tsconfig.json` | 覆盖 `src` 下的 TypeScript、声明文件和 Vue SFC，提供 `@/* -> src/*` 路径别名。 |
| `vitest.config.ts` | 使用 Node 环境运行 `src/**/*.test.ts`。 |

## 启动与页面注册

应用启动后由 Uni-app 根据 `src/pages.json` 创建页面。大屏页面顺序如下：

1. `pages/department/index`：默认入口，读取 `departmentId`。
2. `pages/process/index`：读取 `processId`。
3. `pages/equipment/index`：读取 `deviceId` 和返回来源 `from`。
4. `pages/daily-report/index`：读取部门、工序族、数据日期和返回来源，详见 `doc/daily-report.md`。

页面职责、query 规则和维度间跳转详见 `doc/factory-dimensions.md` 与 `doc/factory-dashboard-architecture.md`。

PC 构建仅注册以下独立页面，部门页为默认入口：

| 页面 | H5 hash 地址 | 当前内容 |
| --- | --- | --- |
| `src/pages-pc/department/index.vue` | `/#/pages-pc/department/index` | 部门地图与业务卡片，读取 `departmentId` |
| `src/pages-pc/process/index.vue` | `/#/pages-pc/process/index` | 工序地图与业务卡片，读取 `processId` |
| `src/pages-pc/equipment/index.vue` | `/#/pages-pc/equipment/index` | PC端 · 设备维度（待开发） |

PC 部门、工序页复用 `FactoryDashboardView`、地图和全部业务卡片，通过共用 composable 加载真实数据、同步 query 并刷新卡片。制造日报按钮不显示，日报页面仍仅属于大屏端。PC 设备页暂为占位；地图打开设备时进入该 PC 地址。

PC 布局样式由 `src/pages-pc/factory-dashboard.css` 独立维护，以 1920×1080 为设计基准：页面边距与分区间距均为 16px，顶部告警栏，左右等宽地图与卡片面板，高度跟随浏览器可用视口，右侧独立滚动。小于 1024px 时退化为单列。

## 双端构建与共享边界

- 两端共用 `src/main.ts`、`src/App.vue`、`src/manifest.json`、`src/api/`、基础组件和工具，仅页面入口及布局独立。
- `package.json` 的 `uni-app.scripts` 将 `screen` 和 `pc` 都映射到 `h5`，分别启用 `SCREEN`、`PC` 条件编译标记。
- `src/pages.json` 用 `#ifndef PC` 保留原大屏页面，用 `#ifdef PC` 注册 PC 页面。原 `dev:h5`、`build:h5` 仍默认使用大屏页面。
- 构建产物分别写入 `dist/build/screen/` 和 `dist/build/pc/`，可以独立部署，依次打包不会覆盖另一端产物。未被页面引用的业务代码不会因存在于源码目录而自动成为页面入口；`static/` 等静态资源仍按 Uni-app 的资源复制规则处理。
- 两套系统使用同一套后端 API 和现有 `src/api/` 客户端，不创建 PC 专用 API 副本。PC 接入业务时直接复用现有接口封装；部门、工序页已通过共享 loader 查询业务接口。
- `factoryRoutes.ts` 的 URL 构造函数支持 `terminal` 参数，默认 `screen`，PC composable 显式传入 `pc`，所有维度跳转均保留当前端；`reportRoutes.ts` 仍仅服务大屏。
- 长期边界和验收要求见 `openspec/specs/dual-terminal-build/spec.md`。

## 全局样式

`src/App.vue` 在 `page`、`body` 和 `#app` 上定义 `--um-color-*` 与 `--space-*` 变量，所有看板组件应复用这些变量。`768px` 以上切换为像素间距，窄屏保留 `rpx` 间距。完整的视觉语义和组件规则以 `DESIGN.md` 为准。

本模块只提供全局基线；页面组件继续使用 scoped 样式维护自身布局，不应在 `App.vue` 中加入单个业务卡片的特例。

## 开发代理与生产部署

- API 客户端固定请求 `/api`，详见 `doc/api-module.md`。
- 本地 `dev:h5`、`dev:screen`、`dev:pc` 共用 Vite 的 `/api/*` 代理，转发到 `vite.config.ts` 中的同一开发后端，并在转发时移除 `/api` 前缀。
- 当前代理目标直接写在 `vite.config.ts`，没有从 `.env` 读取。
- 生产构建不会自动继承 Vite 开发代理；部署环境需要由同源网关或 Web 服务器提供 `/api` 转发，否则浏览器请求会落到前端站点自身。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev:screen` | 启动大屏开发服务，首选端口 `5173`。 |
| `npm run dev:pc` | 启动 PC 开发服务，首选端口 `5174`。 |
| `npm run build:screen` | 生成大屏产物 `dist/build/screen/`。 |
| `npm run build:pc` | 生成 PC 产物 `dist/build/pc/`。 |
| `npm run dev:h5` | 兼容原命令，启动大屏 H5 开发服务。 |
| `npm run build:h5` | 兼容原命令，生成大屏产物 `dist/build/h5/`。 |
| `npm run type-check` | 运行 `vue-tsc --noEmit`。 |
| `npm test` | 运行全部 Vitest 单元测试。 |
| `npm run test:watch` | 监听源码并重复运行相关测试。 |

`package.json` 还保留多种小程序、App 和快应用脚本，但当前 WebGL Sprite 厂区地图只承诺 H5 大屏体验。跨端发布前需要单独验证 Three.js、DOM API、`window`、`sessionStorage` 和 hash 路由相关能力。

开发端口被占用时 Vite 会尝试后续端口，以终端输出地址为准。

## 修改注意事项

- 新增页面时同步更新 `src/pages.json`、模块索引和路由说明。
- 调整全局颜色或间距时同步更新 `DESIGN.md`，避免实现与设计基线分叉。
- 修改 `/api` 前缀或代理 rewrite 时同时检查 `src/api/http.ts`、部署网关和接口文档。
- 新增测试目录规则或浏览器环境测试时更新 `vitest.config.ts`；当前默认测试环境不提供 DOM。
