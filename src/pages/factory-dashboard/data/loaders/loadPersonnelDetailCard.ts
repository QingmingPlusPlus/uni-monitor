import { getAttendanceDetailSituation } from '../../../../api/attendance'
import type { AttendanceDetailSituationVO } from '../../../../api/attendance'
import { getCssMapDepartmentLabel } from '../../../../components/css-map/css3dMapSelection'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type {
  PersonnelDetailCapability,
  PersonnelDetailData,
  PersonnelDetailRow,
  PersonnelDetailShift,
} from '../personnelDetailMock'
import { formatRefreshedAt, getCurrentDateParam } from './dateTimeUtils'
import { toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'

function mapCapability(ability: string): PersonnelDetailCapability {
  if (ability === 'A' || ability === 'a') return 'A'
  if (ability === 'B' || ability === 'b') return 'B'
  if (ability === 'C' || ability === 'c') return 'C'
  return 'B'
}

function formatWorkHours(vo: AttendanceDetailSituationVO): string {
  if (!Array.isArray(vo.workHourList) || vo.workHourList.length === 0) return '0h00min'
  return vo.workHourList.map((wh) => `${wh.workHourType} ${wh.workHour}`).join(' ')
}

function mapDetailRow(vo: AttendanceDetailSituationVO, index: number): PersonnelDetailRow {
  const shiftName = vo.shiftName ?? ''
  let shift: PersonnelDetailShift
  if (shiftName.includes('夜')) {
    shift = 'night'
  } else if (shiftName.includes('早') || shiftName.includes('白')) {
    shift = 'day'
  } else {
    shift = 'regular'
  }

  return {
    id: `detail-${index + 1}`,
    shift,
    shiftLabel: shiftName || (shift === 'night' ? '夜班' : '早班'),
    employeeId: vo.account ?? '',
    name: vo.realName ?? '',
    position: vo.positionName ?? '',
    jobType: vo.workTypeName ?? '',
    attendanceStatusLabel: vo.attendanceSituation ?? '',
    attendanceStateLabel: vo.attendanceStatus ?? '',
    capability: mapCapability(vo.ability ?? ''),
    workingHours: formatWorkHours(vo),
  }
}

/**
 * 人员明细适配：按 processTypes[] 多次调用 getAttendanceDetailSituation，扁平合并所有工序的人员。
 */
export async function loadPersonnelDetailCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): Promise<PersonnelDetailData> {
  const departmentCode = toApiDepartmentCode(department)
  const date = getCurrentDateParam()

  const allVos: AttendanceDetailSituationVO[] = []

  await Promise.all(
    processTypes.map(async (processId) => {
      try {
        const response = await getAttendanceDetailSituation({
          date,
          department: departmentCode,
          processType: toApiProcessType(processId),
        })
        const vos = response.data?.data
        if (Array.isArray(vos)) {
          allVos.push(...vos)
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 人员明细接口失败 (${processId}): ${error.message}`)
        }
      }
    }),
  )

  const rows = allVos.map(mapDetailRow)

  return {
    title: '人员明细及状态',
    subtitle: getCssMapDepartmentLabel(department, config),
    refreshedAt: formatRefreshedAt(refreshedAt),
    rows,
  }
}
