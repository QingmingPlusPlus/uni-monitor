import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionOption,
} from './css3dMapTypes'

export const cssMapDepartmentOptions: CssMapSelectionOption<CssMapDepartmentValue>[] = [
  {
    mode: 'department',
    value: 'department1',
    labelKey: '预处理部',
  },
  {
    mode: 'department',
    value: 'department2',
    labelKey: '硫化一部',
  },
  {
    mode: 'department',
    value: 'department3',
    labelKey: '后处理部',
  },
  {
    mode: 'department',
    value: 'department4',
    labelKey: '二线综合部',
  },
]

export const cssMapProcessOptions: CssMapSelectionOption<CssMapProcessValue>[] = [
  {
    mode: 'process',
    value: 'pretreatment1',
    labelKey: '前处理一线',
  },
  {
    mode: 'process',
    value: 'vulcanization1',
    labelKey: '硫化一线',
  },
  {
    mode: 'process',
    value: 'posttreatment1',
    labelKey: '后处理一线',
  },
  {
    mode: 'process',
    value: 'pretreatment2',
    labelKey: '前处理二线',
  },
  {
    mode: 'process',
    value: 'vulcanization2',
    labelKey: '硫化二线',
  },
  {
    mode: 'process',
    value: 'posttreatment2',
    labelKey: '后处理二线',
  },
]

export const cssMapDepartmentProcessMap: Record<CssMapDepartmentValue, CssMapProcessValue[]> = {
  department1: ['pretreatment1', 'pretreatment2'],
  department2: ['vulcanization1'],
  department3: ['posttreatment1'],
  department4: ['vulcanization2', 'posttreatment2'],
}

export const defaultCssMapSelectionValues = {
  department: 'department1',
  process: null,
} satisfies {
  department: CssMapDepartmentValue
  process: CssMapProcessValue | null
}

export function isCssMapDepartmentValue(value: string | null | undefined): value is CssMapDepartmentValue {
  return cssMapDepartmentOptions.some((option) => option.value === value)
}

export function isCssMapProcessValue(value: string | null | undefined): value is CssMapProcessValue {
  return cssMapProcessOptions.some((option) => option.value === value)
}

export function getCssMapDepartmentLabel(value: CssMapDepartmentValue): string {
  return cssMapDepartmentOptions.find((option) => option.value === value)?.labelKey ?? value
}

export function getCssMapProcessLabel(value: CssMapProcessValue): string {
  return cssMapProcessOptions.find((option) => option.value === value)?.labelKey ?? value
}

export function getCssMapDepartmentForProcess(value: CssMapProcessValue): CssMapDepartmentValue {
  const match = cssMapDepartmentOptions.find((option) =>
    cssMapDepartmentProcessMap[option.value].includes(value),
  )

  return match?.value ?? defaultCssMapSelectionValues.department
}
