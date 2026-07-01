# 前端接口路径与代理约定

本文档记录前端接口请求路径、`baseURL` 和本地开发代理的当前约定。

## 路径规则

- 接口函数统一使用后端真实业务路径，例如 `/schedule/getPlan`、`/attendance/attendanceSituation`。
- 默认不添加 `/api` 前缀；`src/api/http.ts` 中 `API_BASE_URL` 默认值为空字符串。
- 如需直连其他后端地址，可通过 `VITE_API_BASE_URL` 配置完整 origin，例如 `http://123.57.81.179:8080/`，业务路径仍由接口函数提供。

## 本地开发代理

- `vite.config.ts` 按业务根路径代理到 `http://123.57.81.179:8080`。
- 当前代理根路径包括 `/attendance`、`/basic`、`/device`、`/schedule`、`/visual`。
- 代理不再执行 path rewrite，请求到后端时保留原始业务路径。
