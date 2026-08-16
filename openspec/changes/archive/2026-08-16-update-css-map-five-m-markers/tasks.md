## 1. 共享 5M 视觉方案

- [x] 1.1 在 `css3dMapPalette.ts` 中定义人、机、料、法、环的共享 glyph、填充色和文字色映射，并提供 DOM、Canvas 和图例可复用的读取入口
- [x] 1.2 扩展 `spriteCssMapMarkers.test.ts`，验证五类视觉映射、黄色深色文字及现有 glyph 映射

## 2. 菱形标记渲染

- [x] 2.1 将 `CssMapFiveMMarker.vue` 改为覆盖原 marker slot 的四点填充菱形，保持 glyph 正向居中并使用共享颜色方案
- [x] 2.2 将 `spriteCssMapFiveMMarker.ts` 改为绘制与 DOM 对应的菱形路径、细 operation 色描边、共享填充色和高对比文字
- [x] 2.3 补充或调整 css-map 标记与纹理缓存测试，验证五类标记在 Sprite 路径中的绘制输入及类别变化会触发正确纹理更新
- [x] 2.4 验证纵向六槽、横向五槽和中性 `+N` 溢出行为未因菱形外观发生变化

## 3. 5M 图例与响应式布局

- [x] 3.1 在 `CssMapLegend.vue` 的负荷率、工况图例下方新增“颜色 / 5M变化点”表格，按人、机、料、法、环顺序复用共享菱形色样
- [x] 3.2 为图例容器设置可用高度上限、纵向滚动和地图操作控件避让规则，保持普通地图与展开地图中的全部类型可访问
- [x] 3.3 验证 Sprite 默认地图与 CSS3D 回退地图共用新增图例，且滚动图例不会触发地图平移或缩放

## 4. 文档与验收

- [x] 4.1 更新 `doc/factory-dimensions.md` 和 `doc/factory-dashboard-real-data-mapping.md`，记录 5M 菱形配色、图例和双渲染器一致性规则
- [x] 4.2 运行 css-map 相关 Vitest、`npm run type-check` 和 `npm run build:h5`，修复由本变更引入的失败
- [x] 4.3 使用 `window.mapMock(true)` 在普通地图和展开地图中检查五类菱形、文字对比、`+N`、完整图例及小高度滚动，并验证 WebGL 回退路径的语义一致性
