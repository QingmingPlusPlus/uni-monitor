import type {
  CssMapDepartmentValue,
  CssMapDevice,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  defaultCssMapSelectionConfig,
  getCssMapDepartmentLabel,
  getCssMapProcessLabel,
} from '../../../components/css-map/css3dMapSelection'
import type {
  FactoryAlarmItem,
  FactoryAlarmLevel,
} from './factoryDashboardTypes'

interface AlarmSeed {
  readonly level: FactoryAlarmLevel
  readonly source: string
  readonly message: string
  readonly durationMinutes: number
  readonly estimatedImpactMinutes: number
}

const departmentAlarmSeeds = {
  department1: [
    { level: 'danger', source: '混料区 A', message: '温控报警', durationMinutes: 12, estimatedImpactMinutes: 0 },
    { level: 'warning', source: '预处理 2 线', message: '待料', durationMinutes: 0, estimatedImpactMinutes: 26 },
    { level: 'warning', source: '前处理 1 线', message: '换型准备延迟', durationMinutes: 6, estimatedImpactMinutes: 18 },
  ],
  department2: [
    { level: 'warning', source: '加硫 1 线', message: '模具等待', durationMinutes: 8, estimatedImpactMinutes: 22 },
    { level: 'danger', source: '加硫炉 B', message: '压力波动报警', durationMinutes: 5, estimatedImpactMinutes: 14 },
  ],
  department3: [
    { level: 'warning', source: '后处理 1 线', message: '检具校验等待', durationMinutes: 9, estimatedImpactMinutes: 16 },
    { level: 'neutral', source: '包装区', message: '补料提醒', durationMinutes: 0, estimatedImpactMinutes: 10 },
  ],
  department4: [
    { level: 'danger', source: '后处理 2 线', message: '温控报警', durationMinutes: 12, estimatedImpactMinutes: 0 },
    { level: 'warning', source: '加硫 2 线', message: '待料', durationMinutes: 0, estimatedImpactMinutes: 26 },
  ],
} as const satisfies Readonly<Record<CssMapDepartmentValue, readonly AlarmSeed[]>>

const processAlarmSeeds = {
  pretreatment1: [
    { level: 'danger', source: 'A 槽', message: '温控报警', durationMinutes: 12, estimatedImpactMinutes: 0 },
    { level: 'warning', source: '上料区', message: '待料', durationMinutes: 0, estimatedImpactMinutes: 26 },
    { level: 'warning', source: '清洗段', message: '节拍偏慢', durationMinutes: 7, estimatedImpactMinutes: 15 },
  ],
  vulcanization1: [
    { level: 'warning', source: '加硫机 1-03', message: '模具等待', durationMinutes: 8, estimatedImpactMinutes: 22 },
    { level: 'danger', source: '加硫炉 B', message: '压力波动报警', durationMinutes: 5, estimatedImpactMinutes: 14 },
  ],
  posttreatment1: [
    { level: 'warning', source: '外观检查', message: '检具校验等待', durationMinutes: 9, estimatedImpactMinutes: 16 },
    { level: 'neutral', source: '包装区', message: '补料提醒', durationMinutes: 0, estimatedImpactMinutes: 10 },
  ],
  pretreatment2: [
    { level: 'warning', source: '预处理 2 线', message: '待料', durationMinutes: 0, estimatedImpactMinutes: 26 },
    { level: 'danger', source: '混料区 A', message: '温控报警', durationMinutes: 12, estimatedImpactMinutes: 0 },
  ],
  vulcanization2: [
    { level: 'warning', source: '加硫 2 线', message: '换模等待', durationMinutes: 10, estimatedImpactMinutes: 20 },
    { level: 'neutral', source: '冷却段', message: '节拍观察', durationMinutes: 0, estimatedImpactMinutes: 8 },
  ],
  posttreatment2: [
    { level: 'danger', source: '后处理 2 线', message: '温控报警', durationMinutes: 12, estimatedImpactMinutes: 0 },
    { level: 'warning', source: '成品暂存区', message: '满箱预警', durationMinutes: 4, estimatedImpactMinutes: 12 },
  ],
} as const satisfies Readonly<Record<CssMapProcessValue, readonly AlarmSeed[]>>

function createAlarmItems(scope: string, seeds: readonly AlarmSeed[]): readonly FactoryAlarmItem[] {
  return seeds.map((seed, index) => ({
    id: `${scope}-${index + 1}`,
    level: seed.level,
    source: seed.source,
    message: seed.message,
    durationMinutes: seed.durationMinutes,
    estimatedImpactMinutes: seed.estimatedImpactMinutes,
  }))
}

export function getDepartmentAlarmItems(
  value: CssMapDepartmentValue,
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): readonly FactoryAlarmItem[] {
  const departmentLabel = getCssMapDepartmentLabel(value, selectionConfig)

  return createAlarmItems(departmentLabel, departmentAlarmSeeds[value])
}

export function getProcessAlarmItems(
  value: CssMapProcessValue,
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): readonly FactoryAlarmItem[] {
  const processLabel = getCssMapProcessLabel(value, selectionConfig)

  return createAlarmItems(processLabel, processAlarmSeeds[value])
}

export function getEquipmentAlarmItems(
  device: CssMapDevice | null,
  selectionConfig: CssMapSelectionConfig = defaultCssMapSelectionConfig,
): readonly FactoryAlarmItem[] {
  if (device === null) {
    return []
  }

  const processLabel = device.section
    ? getCssMapProcessLabel(device.section, selectionConfig)
    : '未分配工序'

  return [
    {
      id: `${device.id}-temperature`,
      level: 'danger',
      source: device.name,
      message: '温控报警',
      durationMinutes: 12,
      estimatedImpactMinutes: 0,
    },
    {
      id: `${device.id}-material`,
      level: 'warning',
      source: processLabel,
      message: '待料',
      durationMinutes: 0,
      estimatedImpactMinutes: 26,
    },
  ]
}
