# 厂区地图实际比例布局生成

## 目标

`css-map` 不再依据人员配置示意图手工摆放设备，而是把两份厂区 PDF 作为实际几何底图，并把现场 Excel 中的红框标注自动换算到同一 `2060×1280` 地图世界坐标。最终运行时只读取 `src/static/factory-map/devices.json`，不依赖 Excel、PDF、LibreOffice 或 Python。

## 数据优先级

1. 一工厂、二工厂 PDF 决定厂房轮廓、相对长宽和两工厂实际比例。
2. 现场布局 Excel 的红框和区域编号决定清单内 151 台设备的区域、顺序和占位。
3. 已评审的 `devices.json` 决定现场 Excel 未覆盖设备的既有工厂、工序和相对位置。
4. 设备主数据 Excel 只负责把设备系统名称解析为唯一 `deviceCode`；仅当既有设备缺少 `section`，且主数据工厂与既有地图工厂一致时，才补全工序，不凭主数据臆造坐标。

## 生成物

| 文件 | 用途 |
| --- | --- |
| `src/static/factory-map/factory-floorplan.png` | 两份 PDF 合成的透明线稿底图，输出像素为 `4120×2560`，对应地图世界坐标 `2060×1280`。 |
| `src/static/factory-map/factory-floorplan.transforms.json` | PDF 裁剪、旋转、缩放及最终放置参数。 |
| `src/static/factory-map/devices.json` | 运行时地图配置；设备坐标、尺寸、分组和 `deviceCode` 均在此文件。 |
| `scripts/generate_factory_floorplan.py` | 从 PDF 可复现生成底图及转换元数据。 |
| `scripts/generate_factory_map_layout.py` | 从现场布局 Excel、设备主数据和既有配置生成实际比例设备布局。 |

## 自动换算方式

现场 Excel 中的底图与客户 PDF 同源。生成脚本直接读取 `.xlsx` 的 OOXML drawing：

- 识别红色矢量线框，不依赖 OCR；
- 把旁边的 `①–⑨`、`A–Z` 矢量文字与最近红框配对；
- 用 Excel 行高、列宽和 drawing anchor 还原红框在嵌入图片上的像素位置；
- 用嵌入图片有效线稿边界与 PDF 底图有效线稿边界做仿射换算；
- 一工厂识别 35 个区域，二工厂识别 5 个区域；
- 对带编号的横向机台，使用 Excel 中的 `1…20`、`A 1…18`、`B 1…24` 标尺确定每台设备中心；
- 对一个红框包含多台设备的情况，外层节点只作为局部坐标容器，每台设备写入独立 `children`，运行时不会再绘制成一个大设备。

现场表本次共生成 151 台设备：一工厂 109 台，二工厂 42 台。与未标注但保留的既有设备合并后，地图渲染 207 个唯一 `deviceCode`、224 个唯一地图节点。

## 更新命令

运行环境需要 Python 3、Pillow、NumPy、Poppler 的 `pdftoppm`，以及可执行文件 `soffice`（LibreOffice）。先在临时目录生成报告和预览，确认后再写正式配置。

```bash
python3 -m pip install -r scripts/requirements-factory-map.txt
```

```bash
python3 scripts/generate_factory_floorplan.py \
  --factory-one "/path/to/一工厂.pdf" \
  --factory-two "/path/to/二工厂.pdf" \
  --output src/static/factory-map/factory-floorplan.png \
  --metadata src/static/factory-map/factory-floorplan.transforms.json

python3 scripts/generate_factory_map_layout.py \
  --layout "/path/to/布局图.xlsx" \
  --device-master "/path/to/全部设备导出.xls" \
  --config src/static/factory-map/devices.json \
  --floorplan-image src/static/factory-map/factory-floorplan.png \
  --floorplan-metadata src/static/factory-map/factory-floorplan.transforms.json \
  --output src/static/factory-map/devices.json \
  --report /tmp/factory-map-layout-report.json \
  --preview /tmp/factory-map-layout-preview.png \
  --allow-inferred-codes
```

`devices.json` 会写入 `source.layoutCoordinateSystem = "factory-floorplan-v1"`。脚本检测到该标记后保留未标注设备的当前实际底图坐标，因此可以对同一配置重复执行，输出不会二次缩放或漂移。

## 校验与人工确认

脚本在写入前自动检查：

- 一工厂区域必须完整包含 `①–⑨`、`A–Z`，二工厂必须完整包含 `①–⑤`；
- 现场表中的设备名称在主数据中必须唯一匹配；
- 所有设备 `deviceCode` 和地图节点 `id` 必须唯一；
- 子设备清单必须与外层 `deviceCodes` 完全一致；
- 设备宽高必须为正，且不得越出 `2060×1280` 地图；
- 151 个现场标注 code 必须全部出现在输出配置中。

生成后应检查 `--preview` 图片，并运行：

```bash
npm test -- src/components/css-map/factoryMapLayoutConfig.test.ts
npm run type-check
npm run build:h5
```

## 当前来源例外

- `STI450-1D24`、`STI450-1D25`、`STI450-1D26` 存在于现场布局表，但不在设备主数据中。只有显式传入 `--allow-inferred-codes` 时，脚本才分别使用表中名称可确定的 `1D24`、`1D25`、`1D26`；报告会保留这三条推断记录。
- `浸油生产线-2`（code `2338`）在已评审地图中位于二工厂，但设备主数据标为一工厂加硫，且现场布局表未覆盖该设备。当前保留既有二工厂坐标并让 `section` 维持 `null`，避免在没有现场依据时移动设备；生成报告会把它列入 `unresolvedSectionConflicts`。现场确认后应优先修正来源表，再重新生成。
