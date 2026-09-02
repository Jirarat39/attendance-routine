import type {
  AttendanceResponse,
  AuthUser,
  ReportDirectoryBrowser,
  ReportSettings,
  SearchFilters,
  TimesheetFilters,
  TimesheetResponse,
  UpdateReportSettings,
} from './types'

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.BASE_URL.replace(/\/$/, '')).replace(/\/$/, '')

export class AuthRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
  }
}

function notifyUnauthorized(response: Response) {
  if (response.status === 401) window.dispatchEvent(new Event('auth:unauthorized'))
}

function buildParams(filters: SearchFilters, page: number, pageSize: number) {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    status: filters.status,
    page: String(page),
    pageSize: String(pageSize),
  })
  if (filters.q.trim()) params.set('q', filters.q.trim())
  return params
}

export async function searchAttendance(
  filters: SearchFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<AttendanceResponse> {
  const response = await fetch(`${apiBase}/api/attendances?${buildParams(filters, page, pageSize)}`, {
    signal,
    credentials: 'include',
  })
  if (!response.ok) {
    notifyUnauthorized(response)
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail ?? problem?.title ?? `ไม่สามารถโหลดข้อมูลได้ (${response.status})`)
  }
  return response.json()
}

export function exportUrl(filters: SearchFilters) {
  return `${apiBase}/api/attendances/export?${buildParams(filters, 1, 200)}`
}

function buildTimesheetParams(
  filters: TimesheetFilters,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    status: filters.status,
    page: String(page),
    pageSize: String(pageSize),
  })
  if (filters.q.trim()) params.set('q', filters.q.trim())
  return params
}

export async function searchTimesheets(
  filters: TimesheetFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<TimesheetResponse> {
  const response = await fetch(
    `${apiBase}/api/timesheets?${buildTimesheetParams(filters, page, pageSize)}`,
    { signal, credentials: 'include' },
  )
  return parseResponse<TimesheetResponse>(response)
}

export function timesheetExportUrl(filters: TimesheetFilters) {
  return `${apiBase}/api/timesheets/export?${buildTimesheetParams(filters, 1, 200)}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    notifyUnauthorized(response)
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.message ?? problem?.detail ?? problem?.title ?? `Request failed (${response.status})`)
  }
  return response.json()
}

export async function getReportSettings(signal?: AbortSignal): Promise<ReportSettings> {
  const response = await fetch(`${apiBase}/api/report-settings`, {
    signal,
    credentials: 'include',
  })
  return parseResponse<ReportSettings>(response)
}

export async function saveReportSettings(
  settings: UpdateReportSettings,
): Promise<ReportSettings> {
  const response = await fetch(`${apiBase}/api/report-settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  return parseResponse<ReportSettings>(response)
}

export async function browseReportDirectories(
  path?: string,
): Promise<ReportDirectoryBrowser> {
  const params = new URLSearchParams()
  if (path) params.set('path', path)
  const suffix = params.size ? `?${params}` : ''
  const response = await fetch(`${apiBase}/api/report-settings/directories${suffix}`, {
    credentials: 'include',
  })
  return parseResponse<ReportDirectoryBrowser>(response)
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  const response = await fetch(`${apiBase}/api/auth/me`, {
    signal,
    credentials: 'include',
  })
  if (response.status === 401 || response.status === 403) return null
  return parseResponse<AuthUser>(response)
}

export async function login(
  employeeCode: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeCode, password }),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new AuthRequestError(
      problem?.message ?? `Login failed (${response.status})`,
      response.status,
      problem?.code,
    )
  }
  return response.json()
}

export async function logout(): Promise<void> {
  const response = await fetch(`${apiBase}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok && response.status !== 401) await parseResponse(response)
}
