export type EquipmentCardItem = {
  readonly code: string
  readonly title: string
  readonly description: string
  readonly process: string
  readonly status: string
}

export const equipmentCards: readonly EquipmentCardItem[] = [
  {
    code: "EQ-01",
    title: "2000T 冲压机",
    description: "大型伺服冲压机，负责车身侧围等大型覆盖件的冲压成型。",
    process: "冲压工序",
    status: "运行中",
  },
  {
    code: "EQ-02",
    title: "焊接机器人 A01",
    description: "六轴焊接机器人，负责地板总成焊接。",
    process: "焊接工序",
    status: "运行中",
  },
  {
    code: "EQ-03",
    title: "焊接机器人 A02",
    description: "六轴焊接机器人，负责侧围总成焊接。",
    process: "焊接工序",
    status: "待机",
  },
  {
    code: "EQ-04",
    title: "电泳槽",
    description: "车身防腐电泳处理，槽液温度与浓度实时监控。",
    process: "涂装工序",
    status: "维护中",
  },
  {
    code: "EQ-05",
    title: "面漆喷涂线",
    description: "自动喷涂机器人 + 人工补喷，色漆与清漆两道工序。",
    process: "涂装工序",
    status: "运行中",
  },
  {
    code: "EQ-06",
    title: "总装拧紧轴",
    description: "伺服拧紧轴，关键螺栓扭矩与角度在线监控。",
    process: "总装工序",
    status: "运行中",
  },
  {
    code: "EQ-07",
    title: "整车检测线",
    description: "四轮定位、灯光、制动与尾气综合检测。",
    process: "质检工序",
    status: "运行中",
  },
  {
    code: "EQ-08",
    title: "AGV 搬运车 #12",
    description: "线边物流 AGV，负责发动机总成到总装线边的自动配送。",
    process: "物流转运工序",
    status: "充电中",
  },
  {
    code: "EQ-09",
    title: "淋雨测试房",
    description: "整车密封性检测，模拟暴雨环境 15 分钟。",
    process: "质检工序",
    status: "空闲",
  },
]
