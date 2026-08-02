import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import {
  getCssMapProcessLabel,
} from '../../../../components/css-map/css3dMapSelection'

/** CssMapDepartmentValue ('department1'..'department4') → API 科室编号 ('1'..'4') */
export function toApiDepartmentCode(value: CssMapDepartmentValue): string {
  return value.replace('department', '')
}

/** CssMapProcessValue → API 工序类型 ('preprocessing' | 'sulfur_addition' | 'post_processing') */
export function toApiProcessType(value: CssMapProcessValue): string {
  const prefix = value.replace(/[0-9]+$/u, '')
  const map: Readonly<Record<string, string>> = {
    pretreatment: 'preprocessing',
    vulcanization: 'sulfur_addition',
    posttreatment: 'post_processing',
  }
  return map[prefix] ?? prefix
}

export function toApiProcessLabel(value: CssMapProcessValue): string {
  const map: Readonly<Record<string, string>> = {
    preprocessing: '前处理',
    sulfur_addition: '加硫',
    post_processing: '后处理',
  }

  return map[toApiProcessType(value)] ?? ''
}

export function removeTrailingProcessNumber(label: string): string {
  return label.replace(/[0-9０-９]+$/u, '')
}

export function getProcessFamilyLabel(
  processId: CssMapProcessValue,
  config: CssMapSelectionConfig,
): string {
  return removeTrailingProcessNumber(getCssMapProcessLabel(processId, config))
}
