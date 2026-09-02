export interface AttendanceRow {
  attendanceId: string
  employeeCode: string
  employeeName: string
  employeeNameEn: string
  department: string
  departmentEn: string
  checkIn: string | null
  checkOut: string | null
}

export interface AuthUser {
  employeeCode: string
  fullName: string
  fullNameEn: string
  role: 'Admin'
  hasPhoto: boolean
}

export interface AttendanceSummary {
  total: number
  completed: number
  missingCheckOut: number
}

export interface AttendanceResponse {
  items: AttendanceRow[]
  summary: AttendanceSummary
  page: number
  pageSize: number
  totalPages: number
}

export interface SearchFilters {
  from: string
  to: string
  q: string
  status: 'all' | 'complete' | 'missing'
}

export interface TimesheetRow {
  timesheetId: number
  documentNo: string
  employeeCode: string
  employeeName: string
  employeeNameEn: string
  workDate: string
  startTime: string
  endTime: string
  projectCode: string
  projectName: string
  durationMinutes: number
  hasDocument: boolean
}

export interface TimesheetSummary {
  total: number
  generated: number
  pending: number
  totalMinutes: number
}

export interface TimesheetResponse {
  items: TimesheetRow[]
  summary: TimesheetSummary
  page: number
  pageSize: number
  totalPages: number
}

export interface TimesheetFilters {
  from: string
  to: string
  q: string
  status: 'all' | 'generated' | 'pending'
}

export interface ReportJobSettings {
  runAt: string
  scheduleType: ReportScheduleType
  intervalDays: number
  monthlyDay: number
  scheduleStartDate: string
  reportFromDate: string
  reportToDate: string
  exportDirectory: string
  nextRunAt: string | null
}

export interface ReportSettings {
  enabled: boolean
  timeZoneId: string
  attendance: ReportJobSettings
  timesheet: ReportJobSettings
}

export type ReportScheduleType = 'daily' | 'interval' | 'monthly'

export interface UpdateReportJobSettings {
  runAt: string
  scheduleType: ReportScheduleType
  intervalDays: number
  monthlyDay: number
  scheduleStartDate: string
  reportFromDate: string
  reportToDate: string
  exportDirectory: string
}

export interface UpdateReportSettings {
  enabled: boolean
  attendance: UpdateReportJobSettings
  timesheet: UpdateReportJobSettings
}

export interface ReportDirectoryBrowser {
  rootPath: string
  currentPath: string
  parentPath: string | null
  directories: Array<{
    name: string
    path: string
  }>
}
