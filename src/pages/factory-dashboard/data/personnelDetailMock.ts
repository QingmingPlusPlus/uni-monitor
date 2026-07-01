export type PersonnelDetailShift = 'day' | 'night' | 'regular'

export type PersonnelDetailAttendanceStatus =
  | 'present'
  | 'annual-leave'
  | 'sick-leave'
  | 'personal-leave'
  | 'business-travel'
  | 'absent'

export type PersonnelDetailCapability = 'A' | 'B' | 'C'

export interface PersonnelDetailRow {
  readonly id: string
  readonly shift: PersonnelDetailShift
  readonly shiftLabel: string
  readonly employeeId: string
  readonly name: string
  readonly position: string
  readonly jobType: string
  readonly attendanceStatus: PersonnelDetailAttendanceStatus
  readonly attendanceStatusLabel: string
  readonly attendanceStateLabel: string
  readonly capability: PersonnelDetailCapability
  readonly workingHours: string
}

export interface PersonnelDetailData {
  readonly title: string
  readonly subtitle: string
  readonly refreshedAt: string
  readonly rows: readonly PersonnelDetailRow[]
}

const refreshedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const mockRows: readonly PersonnelDetailRow[] = [
  {
    id: 'detail-1',
    shift: 'day',
    shiftLabel: '早班',
    employeeId: '0509',
    name: '张三',
    position: '班长',
    jobType: '班长',
    attendanceStatus: 'present',
    attendanceStatusLabel: '出勤',
    attendanceStateLabel: '管理',
    capability: 'A',
    workingHours: '定时 3h30min',
  },
  {
    id: 'detail-2',
    shift: 'day',
    shiftLabel: '早班',
    employeeId: '0510',
    name: '李四',
    position: '组长',
    jobType: '组长',
    attendanceStatus: 'present',
    attendanceStatusLabel: '出勤',
    attendanceStateLabel: '作业',
    capability: 'A',
    workingHours: '定时 4h00min',
  },
  {
    id: 'detail-3',
    shift: 'day',
    shiftLabel: '早班',
    employeeId: '0512',
    name: '王五',
    position: '正式工',
    jobType: '操作工',
    attendanceStatus: 'annual-leave',
    attendanceStatusLabel: '年假',
    attendanceStateLabel: '-',
    capability: 'B',
    workingHours: '0h00min',
  },
  {
    id: 'detail-4',
    shift: 'night',
    shiftLabel: '夜班',
    employeeId: '0513',
    name: '赵六',
    position: '正式工',
    jobType: '操作工',
    attendanceStatus: 'present',
    attendanceStatusLabel: '出勤',
    attendanceStateLabel: '作业',
    capability: 'B',
    workingHours: '定时 3h45min',
  },
  {
    id: 'detail-5',
    shift: 'night',
    shiftLabel: '夜班',
    employeeId: '0515',
    name: '孙七',
    position: '派遣工',
    jobType: '装配工',
    attendanceStatus: 'sick-leave',
    attendanceStatusLabel: '病假',
    attendanceStateLabel: '-',
    capability: 'C',
    workingHours: '0h00min',
  },
  {
    id: 'detail-6',
    shift: 'night',
    shiftLabel: '夜班',
    employeeId: '0516',
    name: '周八',
    position: '正式工',
    jobType: '操作工',
    attendanceStatus: 'present',
    attendanceStatusLabel: '出勤',
    attendanceStateLabel: '顶岗',
    capability: 'A',
    workingHours: '定时 4h15min',
  },
  {
    id: 'detail-7',
    shift: 'day',
    shiftLabel: '早班',
    employeeId: '0517',
    name: '吴九',
    position: '临时工',
    jobType: '装配工',
    attendanceStatus: 'personal-leave',
    attendanceStatusLabel: '事假',
    attendanceStateLabel: '-',
    capability: 'C',
    workingHours: '0h00min',
  },
  {
    id: 'detail-8',
    shift: 'day',
    shiftLabel: '早班',
    employeeId: '0518',
    name: '郑十',
    position: '正式工',
    jobType: '操作工',
    attendanceStatus: 'business-travel',
    attendanceStatusLabel: '出差',
    attendanceStateLabel: '-',
    capability: 'B',
    workingHours: '0h00min',
  },
] as const

export function createPersonnelDetailData(refreshedAt: Date = new Date()): PersonnelDetailData {
  return {
    title: '人员明细及状态',
    subtitle: '预处理工序',
    refreshedAt: refreshedAtFormatter.format(refreshedAt),
    rows: mockRows,
  }
}
