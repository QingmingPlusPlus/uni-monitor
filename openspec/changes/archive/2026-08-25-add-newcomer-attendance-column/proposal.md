## Why

后端实时出勤数据已能够返回“新人”人员类型，但当前人员出勤情况表没有独立的新人列，未识别的直接人员会被并入正式工，导致直接在籍细分与业务口径不一致。需要在不改变接口端点和查询参数的前提下补齐新人分类及展示。

## What Changes

- 在部门维度和工序维度共用的人员出勤情况表中增加“新人”列，保留现有“顶岗”等列，并将新人放在直接在籍细分的末尾、直接合计之前。
- 对 `positionType=direct` 且非班长的记录，沿用现有人员子类关键词分类方式，通过 `positionName` 中的“新人”标识聚合新人在籍人数。
- 从正式工兜底数量中排除已识别的新人，避免同一批人员同时计入新人和正式工。
- 在班次、工序合计和部门全体合计中累加新人，同时保持直接在籍合计、实际出勤人数及出勤率的既有口径不变。
- 调整人员出勤表的列数、分组表头跨度和响应式布局，并补充真实数据聚合测试、mock 数据及接口映射文档。
- 参照低保真图，仅为直接在籍岗位的末级表头增加高饱和度类别色：组长为绿色、正式工为蓝色、派遣工为橙色、临时工为黄色、新人为紫红色；班长、顶岗、其他分组表头和数据单元格保持原有颜色。

## Capabilities

### New Capabilities

- `personnel-attendance-table`: 定义人员出勤情况表的直接/间接分类、新人列、合计口径和列展示规则。

### Modified Capabilities

无。

## Impact

- 影响 `src/pages/factory-dashboard/data/factoryDashboardTypes.ts`、`data/loaders/loadAttendanceCard.ts`、`data/factoryAttendanceMock.ts` 及相关测试。
- 影响 `src/pages/factory-dashboard/components/PersonnelAttendanceCard/PersonnelAttendanceGrid.vue` 和对应 CSS 的表头、数据单元格、岗位类别色与网格跨度。
- 同步更新 `doc/factory-dashboard-real-data-mapping.md`、`doc/department-api-gaps.md`；新增长期 capability 后更新 `doc/agent-memory-map.md`。
- `GET /attendance/attendanceSituation` 的端点、请求参数和响应外形不变，不引入新依赖，也不影响出勤率推移表或人员明细卡片。
