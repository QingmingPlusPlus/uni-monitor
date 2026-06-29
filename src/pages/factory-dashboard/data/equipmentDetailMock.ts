import type { CssMapDevice } from '../../../components/css-map/css3dMapTypes'
import type { EquipmentDetailData } from './factoryDashboardTypes'

export function getEquipmentDetailData(device: CssMapDevice | null): EquipmentDetailData {
  const deviceName = device?.name ?? '未选择设备'
  const deviceId = device?.id ?? '默认设备'
  const deviceLoadRate = device?.runtime.loadRate ?? null
  const loadRate = deviceLoadRate === null ? '--' : `${deviceLoadRate}%`

  return {
    eyebrow: `${deviceId} · 设备维度`,
    title: `${deviceName} 停止与计划分析（mock）`,
    subtitle: '设备维度聚焦单台设备的计划、停线、损耗和周期信息。',
    kpis: [
      { label: '状态', value: '未运行暂停', note: '当前设备状态', tone: 'warning' },
      { label: '平均负荷率', value: loadRate, note: '当月负荷', tone: 'operation' },
      { label: '在岗人员', value: String(device?.runtime.staff.length ?? 1), note: '当前班次', tone: 'neutral' },
      { label: '阻碍时间', value: '--', note: '待接口返回', tone: 'neutral' },
      { label: '停止类型（mock）', value: '用餐', note: '', tone: 'danger' },
    ],
    currentPlan: [
      { label: '日期', value: '2026-06-28' },
      { label: '班次', value: '白班' },
      { label: '时间', value: '08:00-17:00' },
      { label: '设备', value: deviceName },
      { label: '负责人', value: '白班组' },
    ],
    downtimePlan: [
      { label: '已完成计划', value: '3 项', tone: 'success' },
      { label: '未开始计划', value: '1 项', tone: 'warning' },
    ],
    lossReasons: [
      { label: '不良明细', value: '28 件', tone: 'danger' },
      { label: '设备等待', value: '18 分钟', tone: 'warning' },
      { label: '材料等待', value: '12 分钟', tone: 'warning' },
      { label: '其他', value: '5 分钟' },
    ],
    defectReasons: [
      { label: '原材料', value: '7 件' },
      { label: '不良', value: '13 件', tone: 'danger' },
      { label: '调试', value: '4 件' },
      { label: '其他', value: '4 件' },
    ],
    timeline: [
      { time: '08:20', title: '计划开始', detail: '设备进入生产准备状态' },
      { time: '10:15', title: '短暂停止', detail: '操作员用餐，设备未运行暂停' },
      { time: '13:40', title: '恢复生产', detail: '计划继续执行，等待实绩接口接入' },
    ],
    cycleRows: [
      { label: '班次', value: '白班' },
      { label: '工序', value: device?.section ?? '--' },
      { label: '标准周期', value: '45/60min' },
      { label: '当前周期', value: '46/60min', tone: 'operation' },
    ],
  }
}
