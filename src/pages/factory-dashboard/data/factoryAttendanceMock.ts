import type {
  CssMapDepartmentValue,
  CssMapProcessValue,
  CssMapSelectionConfig,
} from '../../../components/css-map/css3dMapTypes'
import {
  getCssMapDepartmentLabel,
  getCssMapProcessLabel,
} from '../../../components/css-map/css3dMapSelection'
import type {
  PersonnelAttendanceData,
  PersonnelAttendanceProcessGroup,
  PersonnelAttendanceRow,
} from './factoryDashboardTypes'

type AttendanceTemplate = Omit<PersonnelAttendanceRow, 'id'>

const refreshedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const pretreatmentRows = [
  createTemplate('day', '早班', 37, 1, 1, 3, 30, 3, 0, 0, 36, 34),
  createTemplate('night', '夜班', 38, 1, 1, 3, 29, 5, 0, 0, 37, 33),
  createTemplate('regular', '正常班', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0),
] as const satisfies readonly AttendanceTemplate[]

const posttreatmentRows = [
  createTemplate('day', '早班', 43, 1, null, 3, 32, 7, 0, 0, 42, 39),
  createTemplate('night', '夜班', 42, 1, null, 4, 35, 2, 0, 0, 41, 41),
  createTemplate('regular', '正常班', 2, 2, null, 0, 0, 0, 0, 0, 0, 0),
] as const satisfies readonly AttendanceTemplate[]

function createTemplate(
  shift: PersonnelAttendanceRow['shift'],
  shiftLabel: string,
  indirectDirectRoster: number,
  indirectLeaderRoster: number,
  indirectLeaderAttendance: number | null,
  directTeamLeader: number,
  directRegular: number,
  directDispatched: number,
  directTemporary: number,
  directStandby: number,
  directRosterTotal: number,
  actualAttendance: number,
): AttendanceTemplate {
  return {
    shift,
    shiftLabel,
    indirectDirectRoster,
    indirectLeaderRoster,
    indirectLeaderAttendance,
    directTeamLeader,
    directRegular,
    directDispatched,
    directTemporary,
    directStandby,
    directRosterTotal,
    actualAttendance,
    attendanceRate: calculateAttendanceRate(directRosterTotal, actualAttendance),
  }
}

function calculateAttendanceRate(rosterTotal: number, actualAttendance: number): number | null {
  if (rosterTotal === 0) {
    return null
  }

  return Number(((actualAttendance / rosterTotal) * 100).toFixed(1))
}

function removeTrailingProcessNumber(label: string): string {
  return label.replace(/[0-9０-９]+$/u, '')
}

function getProcessFamilyLabel(processId: CssMapProcessValue, config: CssMapSelectionConfig): string {
  return removeTrailingProcessNumber(getCssMapProcessLabel(processId, config))
}

function getBaseRows(familyLabel: string): readonly AttendanceTemplate[] {
  return familyLabel.includes('后处理') ? posttreatmentRows : pretreatmentRows
}

function createRow(groupId: string, template: AttendanceTemplate): PersonnelAttendanceRow {
  return {
    id: `${groupId}-${template.shift}`,
    ...template,
  }
}

function sumNullable(
  values: readonly (number | null)[],
): number | null {
  const numericValues = values.filter((value): value is number => value !== null)

  return numericValues.length === 0
    ? null
    : numericValues.reduce((total, value) => total + value, 0)
}

function createSummaryRow(
  groupId: string,
  shift: PersonnelAttendanceRow['shift'],
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
    indirectLeaderRoster: rows.reduce((total, row) => total + row.indirectLeaderRoster, 0),
    indirectLeaderAttendance: sumNullable(rows.map((row) => row.indirectLeaderAttendance)),
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

function createProcessGroup(label: string): PersonnelAttendanceProcessGroup {
  const groupId = label
  const rows = getBaseRows(label).map((row) => createRow(groupId, row))

  return {
    id: groupId,
    label,
    rows: [...rows, createSummaryRow(groupId, 'total', '合计', rows)],
  }
}

function createDepartmentTotalGroup(
  departmentLabel: string,
  groups: readonly PersonnelAttendanceProcessGroup[],
): PersonnelAttendanceProcessGroup | null {
  if (groups.length < 2) {
    return null
  }

  const rowsByShift = [
    { shift: 'day', shiftLabel: '早班' },
    { shift: 'night', shiftLabel: '夜班' },
    { shift: 'regular', shiftLabel: '正常班' },
    { shift: 'total', shiftLabel: '合计' },
  ] as const

  const rows = rowsByShift.map(({ shift, shiftLabel }) => {
    const rows = groups
      .flatMap((group) => group.rows)
      .filter((row) => row.shift === shift)

    return createSummaryRow(`${departmentLabel}-all`, shift, shiftLabel, rows)
  })

  return {
    id: `${departmentLabel}-all`,
    label: `${departmentLabel}全体`,
    rows,
  }
}

function createProcessGroups(
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
): readonly PersonnelAttendanceProcessGroup[] {
  const familyLabels = config.departmentProcessMap[department]
    .map((processId) => getProcessFamilyLabel(processId, config))
    .filter((label, index, labels) => labels.indexOf(label) === index)

  const groups = familyLabels.map(createProcessGroup)
  const departmentTotalGroup = createDepartmentTotalGroup(
    getCssMapDepartmentLabel(department, config),
    groups,
  )

  return departmentTotalGroup === null ? groups : [...groups, departmentTotalGroup]
}

export function createPersonnelAttendanceData(
  department: CssMapDepartmentValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): PersonnelAttendanceData {
  const departmentLabel = getCssMapDepartmentLabel(department, config)

  return {
    title: '人员出勤情况',
    subtitle: departmentLabel,
    refreshedAt: refreshedAtFormatter.format(refreshedAt),
    groups: createProcessGroups(department, config),
  }
}

export function createProcessPersonnelAttendanceData(
  process: CssMapProcessValue,
  config: CssMapSelectionConfig,
  refreshedAt: Date,
): PersonnelAttendanceData {
  const processLabel = getCssMapProcessLabel(process, config)

  return {
    title: '人员出勤情况',
    subtitle: processLabel,
    refreshedAt: refreshedAtFormatter.format(refreshedAt),
    groups: [createProcessGroup(processLabel)],
  }
}
