## Why

当前 css-map 中的 5M 变化点统一使用深蓝色圆角方块，无法仅凭颜色快速区分“人、机、料、法、环”，且现有图例没有解释 5M 类型。需要用与设备工况、负荷率不同的视觉语法提升大屏浏览时的识别效率，并让标记含义可直接查阅。

## What Changes

- 将设备卡片内的 5M 变化点从统一深蓝色圆角方块改为按类型着色的菱形标记，文字继续显示“人、机、料、法、环”。
- 使用固定的类型颜色映射：人=紫色、机=红色、料=绿色、法=近黑色、环=黄色，并为不同底色选择可读的文字颜色。
- 在现有“负荷率”和“工况”图例下方新增“颜色 / 5M变化点”图例，展示全部五类颜色与菱形语义。
- 保持 WebGL Sprite 默认渲染器与 CSS3D DOM 回退渲染器的标记外观、颜色和文字语义一致。
- 保持现有 5M 数据映射、显示开关、标记容量及 `+N` 溢出规则不变，并使新增图例在可用高度不足时仍可访问。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `css-map`: 修改 5M 变化点的形状与类别配色要求，并新增 5M 图例及响应式可访问性要求。

## Impact

- 受影响组件：`src/components/css-map/CssMapFiveMMarker.vue`、`spriteCssMapFiveMMarker.ts`、`CssMapLegend.vue`、`css3dMapPalette.ts` 及相关测试。
- 受影响规范与文档：`openspec/specs/css-map/spec.md`、`doc/factory-dimensions.md`、`doc/factory-dashboard-real-data-mapping.md`。
- 不修改后端接口、5M 类型映射、设备数据结构、路由、依赖或地图交互契约。
