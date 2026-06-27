export type ProcessTone = "running" | "idle" | "maintenance" | "warning"

export type ProcessCardItem = {
  readonly code: string
  readonly title: string
  readonly description: string
  readonly department: string
  readonly status: string
  readonly tone: ProcessTone
  readonly size: "compact" | "standard" | "tall"
}

export const processCards = [
  {
    code: "P-01",
    title: "冲压工序",
    description: "板材上料、冲压成型、下料检测全流程。",
    department: "冲压部",
    status: "运行中",
    tone: "running",
    size: "tall",
  },
  {
    code: "P-02",
    title: "焊接工序",
    description: "机器人焊接、人工补焊与焊缝质检。",
    department: "焊装部",
    status: "运行中",
    tone: "running",
    size: "standard",
  },
  {
    code: "P-03",
    title: "涂装工序",
    description: "前处理、电泳、面漆与烘干节拍。",
    department: "涂装部",
    status: "维护中",
    tone: "maintenance",
    size: "compact",
  },
  {
    code: "P-04",
    title: "总装工序",
    description: "内饰、底盘、最终装配与下线检测。",
    department: "总装部",
    status: "运行中",
    tone: "running",
    size: "tall",
  },
  {
    code: "P-05",
    title: "质检工序",
    description: "整车终检、淋雨测试与路试。",
    department: "质量部",
    status: "告警",
    tone: "warning",
    size: "standard",
  },
  {
    code: "P-06",
    title: "物流转运工序",
    description: "库区配送、线边补料与空箱回收。",
    department: "物流部",
    status: "空闲",
    tone: "idle",
    size: "compact",
  },
  {
    code: "P-07",
    title: "包装工序",
    description: "成品包装、贴标与码垛。",
    department: "包装部",
    status: "运行中",
    tone: "running",
    size: "standard",
  },
  {
    code: "P-08",
    title: "返修工序",
    description: "异常车辆返修、复检与闭环记录。",
    department: "质量部",
    status: "维护中",
    tone: "maintenance",
    size: "compact",
  },
] as const satisfies readonly ProcessCardItem[]
