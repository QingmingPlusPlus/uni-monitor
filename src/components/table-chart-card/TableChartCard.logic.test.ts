import { describe, expect, it } from "vitest"
import {
  createTableGridStyle,
  getCompactNumericCellStyle,
} from "./TableChartCard.logic"

describe("getCompactNumericCellStyle", () => {
  it("为整数、负数和百分比生成基于容器宽度的字号", () => {
    expect(getCompactNumericCellStyle("253,167")).toEqual({
      "--data-table-cell-fit-size": "24.257cqi",
    })
    expect(getCompactNumericCellStyle("-99,805")).toEqual({
      "--data-table-cell-fit-size": "25.654cqi",
    })
    expect(getCompactNumericCellStyle("92.7%")).toEqual({
      "--data-table-cell-fit-size": "31.511cqi",
    })
  })

  it("不调整空值占位符和普通文本", () => {
    expect(getCompactNumericCellStyle("-")).toBeUndefined()
    expect(getCompactNumericCellStyle("计划生产数")).toBeUndefined()
  })
})

describe("createTableGridStyle", () => {
  it("允许卡片为第一列预留足够宽度", () => {
    expect(createTableGridStyle(
      [{ key: "month", label: "8月", width: "minmax(68px, 0.9fr)" }],
      true,
      "minmax(160px, 176px)",
    )).toEqual({
      gridTemplateColumns: "minmax(160px, 176px) minmax(68px, 0.9fr)",
    })
  })
})
