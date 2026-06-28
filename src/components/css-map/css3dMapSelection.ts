import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionOption,
} from './css3dMapTypes'

export const cssMapDepartmentOptions: CssMapSelectionOption<CssMapDepartmentValue>[] = [
  {
    mode: 'department',
    value: 'department1',
    labelKey: 'cssMap.focus.departments.department1',
  },
  {
    mode: 'department',
    value: 'department2',
    labelKey: 'cssMap.focus.departments.department2',
  },
  {
    mode: 'department',
    value: 'department3',
    labelKey: 'cssMap.focus.departments.department3',
  },
  {
    mode: 'department',
    value: 'department4',
    labelKey: 'cssMap.focus.departments.department4',
  },
]

export const cssMapProcessOptions: CssMapSelectionOption<CssMapProcessValue>[] = [
  {
    mode: 'process',
    value: 'pretreatment1',
    labelKey: 'cssMap.focus.processes.pretreatment1',
  },
  {
    mode: 'process',
    value: 'vulcanization1',
    labelKey: 'cssMap.focus.processes.vulcanization1',
  },
  {
    mode: 'process',
    value: 'posttreatment1',
    labelKey: 'cssMap.focus.processes.posttreatment1',
  },
  {
    mode: 'process',
    value: 'pretreatment2',
    labelKey: 'cssMap.focus.processes.pretreatment2',
  },
  {
    mode: 'process',
    value: 'vulcanization2',
    labelKey: 'cssMap.focus.processes.vulcanization2',
  },
  {
    mode: 'process',
    value: 'posttreatment2',
    labelKey: 'cssMap.focus.processes.posttreatment2',
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
