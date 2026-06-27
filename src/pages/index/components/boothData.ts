export type BoothTone = "normal" | "featured" | "service" | "idle"

export type BoothCardItem = {
  readonly code: string
  readonly title: string
  readonly description: string
  readonly area: string
  readonly status: string
  readonly tone: BoothTone
  readonly size: "compact" | "standard" | "tall"
}

export const boothCards = [
  {
    code: "A01",
    title: "总装体验位",
    description: "展示关键装配流程、节拍节点和可触摸工艺说明。",
    area: "主通道",
    status: "重点",
    tone: "featured",
    size: "tall",
  },
  {
    code: "A02",
    title: "质量追踪位",
    description: "合格率、复检、追溯二维码与样件状态。",
    area: "东侧",
    status: "开放",
    tone: "normal",
    size: "standard",
  },
  {
    code: "B03",
    title: "设备互动位",
    description: "设备状态、维护记录和点检结果集中展示。",
    area: "设备区",
    status: "维护",
    tone: "service",
    size: "compact",
  },
  {
    code: "B05",
    title: "能耗看板位",
    description: "电、气、水、温湿度等环境数据的现场说明区。",
    area: "西侧",
    status: "开放",
    tone: "normal",
    size: "tall",
  },
  {
    code: "C01",
    title: "安全培训位",
    description: "触摸屏安全规范、应急流程和班组培训材料。",
    area: "入口",
    status: "空闲",
    tone: "idle",
    size: "compact",
  },
  {
    code: "C04",
    title: "工单流转位",
    description: "工单派发、执行、质检和入库流转状态。",
    area: "中庭",
    status: "开放",
    tone: "normal",
    size: "standard",
  },
  {
    code: "D02",
    title: "仓储联动位",
    description: "库位、转运、入库节拍和异常滞留提醒。",
    area: "仓储区",
    status: "开放",
    tone: "normal",
    size: "compact",
  },
  {
    code: "D06",
    title: "机器人演示位",
    description: "协作机器人动作流程、停靠点与安全边界。",
    area: "演示区",
    status: "重点",
    tone: "featured",
    size: "standard",
  },
  {
    code: "E01",
    title: "环境监测位",
    description: "温湿度、噪声、粉尘与通风状态实时展示。",
    area: "北侧",
    status: "开放",
    tone: "normal",
    size: "standard",
  },
  {
    code: "E03",
    title: "样件展示位",
    description: "样件批次、工序来源和质检说明集中陈列。",
    area: "样件区",
    status: "空闲",
    tone: "idle",
    size: "compact",
  },
  {
    code: "F02",
    title: "异常复盘位",
    description: "近班次停线、返修、报警与责任闭环复盘。",
    area: "复盘区",
    status: "维护",
    tone: "service",
    size: "tall",
  },
  {
    code: "F05",
    title: "访客签到位",
    description: "访客批次、路线权限与讲解员排班状态。",
    area: "出口",
    status: "开放",
    tone: "normal",
    size: "compact",
  },
] as const satisfies readonly BoothCardItem[]
