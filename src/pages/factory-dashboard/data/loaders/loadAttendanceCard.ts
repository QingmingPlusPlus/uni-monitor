import { getAttendanceSituation } from '../../../../api/attendance'
import type { CurrentAttendanceStatisticsVO } from '../../../../api/attendance'
import { getCssMapDepartmentLabel } from '../../../../components/css-map/css3dMapSelection'
import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../../components/css-map/css3dMapTypes'
import type {
  PersonnelAttendanceData,
  PersonnelAttendanceProcessGroup,
  PersonnelAttendanceRow,
  PersonnelAttendanceShift,
} from '../factoryDashboardTypes'
import { formatRefreshedAt, getCurrentDateParam } from './dateTimeUtils'
import { getProcessFamilyLabel, toApiDepartmentCode, toApiProcessType } from './cssMapValueMapping'
import { averageBy, calculateAttendanceRate, sumBy } from './numberUtils'
import {
  getAttendanceShiftText,
  isClassLeaderPosition,
  isDirectGroupLeader,
  isPositionType,
  mapShiftType,
  voShiftLabel,
} from './attendanceShifts'

function sumPositionRoster(
  positions: readonly CurrentAttendanceStatisticsVO[],
  matcher: (positionName: string) => boolean,
): number {
  return sumBy(
    positions.filter((position) => matcher(position.positionName ?? '')),
    (position) => position.schedulePersonCount,
  )
}

/**
 * 将按职务的扁平行聚合为出勤卡所需结构。
 *
 * 接口返回 (shiftType, positionType, positionName, schedulePersonCount, actualAttendancePersonCount)。
 * 卡片需要按工序族分组的 (indirectDirectRoster, indirectLeaderRoster, directTeamLeader, ...) 明细。
 *
 * 接口不提供稳定的人员子类枚举，因此按 positionName 中文关键词拆分。
 * 班长按间接口径展示；组长、派遣、临时、顶岗从直接在籍中拆分。
 */
export function aggregateAttendanceRows(
  vos: readonly CurrentAttendanceStatisticsVO[],
): readonly PersonnelAttendanceRow[] {
  const shiftGroups = new Map<string, CurrentAttendanceStatisticsVO[]>()

  for (const vo of vos) {
    const shiftKey = getAttendanceShiftText(vo)
    const list = shiftGroups.get(shiftKey)
    if (list !== undefined) {
      list.push(vo)
    } else {
      shiftGroups.set(shiftKey, [vo])
    }
  }

  const rows: PersonnelAttendanceRow[] = []

  for (const [shiftType, positions] of shiftGroups) {
    const shift = mapShiftType(shiftType)
    const shiftLabel = voShiftLabel(shiftType)
    const directPositions = positions.filter((p) => isPositionType(p, 'direct') && !isClassLeaderPosition(p))
    const indirectPositions = positions.filter((p) => isPositionType(p, 'indirect') || isClassLeaderPosition(p))
    const classLeaderPositions = positions.filter(isClassLeaderPosition)

    const indirectRosterTotal = sumBy(indirectPositions, (p) => p.schedulePersonCount)
    const indirectAttendanceTotal = sumBy(indirectPositions, (p) => p.actualAttendancePersonCount)
    const indirectLeaderRoster = sumBy(classLeaderPositions, (p) => p.schedulePersonCount)
    const indirectLeaderAttendance = sumBy(classLeaderPositions, (p) => p.actualAttendancePersonCount)
    const directRosterTotal = sumBy(directPositions, (p) => p.schedulePersonCount)
    const actualAttendance = sumBy(directPositions, (p) => p.actualAttendancePersonCount)
    const indirectDirectRoster = indirectRosterTotal + directRosterTotal
    const directTeamLeader = sumPositionRoster(directPositions, isDirectGroupLeader)
    const directDispatched = sumPositionRoster(directPositions, (name) => name.includes('派遣'))
    const directTemporary = sumPositionRoster(directPositions, (name) => name.includes('临时'))
    const directStandby = sumPositionRoster(directPositions, (name) => name.includes('顶岗'))
    const knownDirectRoster = directTeamLeader + directDispatched + directTemporary + directStandby

    rows.push({
      id: `${shiftType}-detail`,
      shift,
      shiftLabel,
      indirectDirectRoster,
      indirectRosterTotal,
      indirectAttendanceTotal,
      indirectLeaderRoster,
      indirectLeaderAttendance,
      directTeamLeader,
      directRegular: Math.max(0, directRosterTotal - knownDirectRoster),
      directDispatched,
      directTemporary,
      directStandby,
      directRosterTotal,
      actualAttendance,
      attendanceRate: calculateAttendanceRate(directRosterTotal, actualAttendance),
    })
  }

  return rows
}

export function createAttendanceSummaryRow(
  groupId: string,
  shift: PersonnelAttendanceShift,
  shiftLabel: string,
  rows: readonly PersonnelAttendanceRow[],
): PersonnelAttendanceRow {
  const directRosterTotal = rows.reduce((total, row) => total + row.directRosterTotal, 0)
  const actualAttendance = rows.reduce((total, row) => total + row.actualAttendance, 0)

  return {
    id: `${groupId}-${shift}`,
    shift,
    shiftLabel,
    indirectDirectRoster: rows.reduce((total, row) => total + row.indirectDirectRoster, 0),
    indirectRosterTotal: rows.reduce((total, row) => total + row.indirectRosterTotal, 0),
    indirectAttendanceTotal: rows.reduce((total, row) => total + (row.indirectAttendanceTotal ?? 0), 0),
    indirectLeaderRoster: rows.reduce((total, row) => total + row.indirectLeaderRoster, 0),
    indirectLeaderAttendance: rows.reduce(
      (total, row) => total + (row.indirectLeaderAttendance ?? 0),
      0,
    ),
    directTeamLeader: rows.reduce((total, row) => total + row.directTeamLeader, 0),
    directRegular: rows.reduce((total, row) => total + row.directRegular, 0),
    directDispatched: rows.reduce((total, row) => total + row.directDispatched, 0),
    directTemporary: rows.reduce((total, row) => total + row.directTemporary, 0),
    directStandby: rows.reduce((total, row) => total + row.directStandby, 0),
    directRosterTotal,
    actualAttendance,
    attendanceRate: calculateAttendanceRate(directRosterTotal, actualAttendance),
  }
}

/**
 * 人员出勤适配：按工序族调用 getAttendanceSituation，并聚合接口记录。
 *
 * 同一工序族下可能有多个 CssMap 工序映射到同一个 API processType
 * （例如 pretreatment1、pretreatment2 均映射为 preprocessing），请求前必须去重，
 * 避免部门维度重复累加同一份出勤数据。
 */
export async function loadAttendanceCard(
  department: CssMapDepartmentValue,
  processTypes: readonly CssMapProcessValue[],
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): Promise<PersonnelAttendanceData> {
  const departmentCode = toApiDepartmentCode(department)
  const date = getCurrentDateParam()

  const familyGroups = new Map<string, CssMapProcessValue[]>()
  for (const processId of processTypes) {
    const familyLabel = getProcessFamilyLabel(processId, config)
    const list = familyGroups.get(familyLabel)
    if (list !== undefined) {
      list.push(processId)
    } else {
      familyGroups.set(familyLabel, [processId])
    }
  }

  const groups: PersonnelAttendanceProcessGroup[] = []

  for (const [familyLabel, processIds] of familyGroups) {
    const allVos: CurrentAttendanceStatisticsVO[] = []
    const apiProcessTypes = [...new Set(processIds.map(toApiProcessType))]

    for (const apiProcessType of apiProcessTypes) {
      try {
        const response = await getAttendanceSituation({
          date,
          department: departmentCode,
          processType: apiProcessType,
        })
        const vos = response.data?.data
        if (Array.isArray(vos)) {
          allVos.push(...vos)
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(`[DepartmentLoader] 人员出勤接口失败 (${apiProcessType}): ${error.message}`)
        }
      }
    }

    const detailRows = aggregateAttendanceRows(allVos)
    const totalRow = createAttendanceSummaryRow(familyLabel, 'total', '合计', detailRows)

    groups.push({
      id: familyLabel,
      label: familyLabel,
      rows: [...detailRows, totalRow],
    })
  }

  if (groups.length >= 2) {
    const departmentLabel = getCssMapDepartmentLabel(department, config)
    const allDetailRows = groups.flatMap((g) => g.rows.filter((r) => r.shift !== 'total'))
    const shifts: ReadonlyArray<{ shift: PersonnelAttendanceShift; label: string }> = [
      { shift: 'day', label: '早班' },
      { shift: 'middle', label: '中班' },
      { shift: 'night', label: '晚班' },
      { shift: 'regular', label: '正常班' },
      { shift: 'total', label: '合计' },
    ]
    const summaryRows = shifts.map(({ shift, label }) => {
      const matching = shift === 'total' ? allDetailRows : allDetailRows.filter((r) => r.shift === shift)
      return createAttendanceSummaryRow(`${departmentLabel}-all`, shift, label, matching)
    })
    groups.push({
      id: `${departmentLabel}-all`,
      label: `${departmentLabel}全体`,
      rows: summaryRows,
    })
  }

  return {
    title: '人员出勤情况',
    subtitle: getCssMapDepartmentLabel(department, config),
    refreshedAt: formatRefreshedAt(refreshedAt),
    groups,
  }
}
