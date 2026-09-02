import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import TimerRoundedIcon from '@mui/icons-material/TimerRounded'
import TodayRoundedIcon from '@mui/icons-material/TodayRounded'
import { searchAttendance, searchTimesheets } from './api'
import { useLanguage } from './LanguageContext'
import type { AttendanceResponse, TimesheetResponse } from './types'

const emptyAttendance: AttendanceResponse = {
  items: [],
  summary: { total: 0, completed: 0, missingCheckOut: 0 },
  page: 1,
  pageSize: 5,
  totalPages: 0,
}

const emptyTimesheet: TimesheetResponse = {
  items: [],
  summary: { total: 0, generated: 0, pending: 0, totalMinutes: 0 },
  page: 1,
  pageSize: 5,
  totalPages: 0,
}

const INVALID_DATE_RANGE_MESSAGE = 'The "From Date" cannot be later than the "To Date".'

const dashboardCopy = {
  th: {
    title: 'แดชบอร์ด',
    subtitle: 'ภาพรวม Attendance และ Timesheet ตามช่วงวันที่ที่เลือก',
    fromDate: 'ตั้งแต่วันที่',
    toDate: 'ถึงวันที่',
    employeeFilter: 'ค้นหาพนักงาน',
    employeePlaceholder: 'รหัสหรือชื่อพนักงาน',
    clearEmployeeFilter: 'แสดงพนักงานทั้งหมด',
    filteredBy: 'กำลังแสดงข้อมูลของ',
    refresh: 'รีเฟรช',
    total: 'รายการทั้งหมด',
    attendanceSubtitle: 'ข้อมูลการลงเวลาเข้า–ออก',
    viewDetails: 'ดูรายละเอียด',
    completed: 'เช็กเอาท์แล้ว',
    missing: 'ยังไม่เช็กเอาท์',
    timesheetSubtitle: 'ข้อมูลเอกสารและชั่วโมงทำงาน',
    generated: 'สร้างแล้ว',
    pending: 'รอดำเนินการ',
    timesheetTotal: 'Timesheet ทั้งหมด',
    generatedDocument: 'สร้างเอกสารแล้ว',
    totalHours: 'ชั่วโมงรวม',
    latestAttendance: 'Attendance ล่าสุด',
    latestTimesheet: 'Timesheet ล่าสุด',
    latestSubtitle: '5 รายการล่าสุดของช่วงวันที่ที่เลือก',
    employee: 'พนักงาน',
    checkIn: 'เช็กอิน',
    checkOut: 'เช็กเอาท์',
    status: 'สถานะ',
    dateTime: 'วันที่/เวลา',
    project: 'โครงการ',
    hours: 'ชั่วโมง',
    document: 'เอกสาร',
    noAttendance: 'ไม่พบข้อมูล Attendance ในช่วงวันที่ที่เลือก',
    noTimesheet: 'ไม่พบข้อมูล Timesheet ในช่วงวันที่ที่เลือก',
    complete: 'ครบถ้วน',
    waitingCheckOut: 'รอเช็กเอาท์',
  },
  en: {
    title: 'Dashboard',
    subtitle: 'Attendance and Timesheet overview for the selected date range',
    fromDate: 'From Date',
    toDate: 'To Date',
    employeeFilter: 'Search Employee',
    employeePlaceholder: 'Employee code or name',
    clearEmployeeFilter: 'Show all employees',
    filteredBy: 'Showing data for',
    refresh: 'Refresh',
    total: 'Total records',
    attendanceSubtitle: 'Employee check-in/check-out data',
    viewDetails: 'View details',
    completed: 'Checked out',
    missing: 'Missing check-out',
    timesheetSubtitle: 'Document and working-hour data',
    generated: 'Generated',
    pending: 'Pending',
    timesheetTotal: 'Total Timesheets',
    generatedDocument: 'Documents generated',
    totalHours: 'Total hours',
    latestAttendance: 'Latest Attendance',
    latestTimesheet: 'Latest Timesheets',
    latestSubtitle: 'Latest 5 records in the selected date range',
    employee: 'Employee',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    status: 'Status',
    dateTime: 'Date/Time',
    project: 'Project',
    hours: 'Hours',
    document: 'Document',
    noAttendance: 'No Attendance records found for the selected date range.',
    noTimesheet: 'No Timesheet records found for the selected date range.',
    complete: 'Complete',
    waitingCheckOut: 'Pending check-out',
  },
}

function getCurrentBangkokRange() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  }
}

function formatDate(value: string, language: 'th' | 'en') {
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string | null, language: 'th' | 'en') {
  return value
    ? new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—'
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '—'
}

interface MetricProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

function Metric({ label, value, icon, color }: MetricProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minWidth: 0,
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: `${color}0D`,
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', color, flex: '0 0 auto' }}>
        {icon}
      </Box>
      <Box minWidth={0}>
        <Typography variant="caption" color="text.secondary" fontWeight={650}>
          {label}
        </Typography>
        <Typography variant="h6" lineHeight={1.25}>{value}</Typography>
      </Box>
    </Box>
  )
}

interface DonutChartProps {
  total: number
  primaryValue: number
  primaryLabel: string
  primaryColor: string
  secondaryValue: number
  secondaryLabel: string
  secondaryColor: string
}

function DonutChart({
  total,
  primaryValue,
  primaryLabel,
  primaryColor,
  secondaryValue,
  secondaryLabel,
  secondaryColor,
}: DonutChartProps) {
  const { language } = useLanguage()
  const text = dashboardCopy[language]
  const primaryPercent = total > 0 ? Math.min(100, (primaryValue / total) * 100) : 0
  const secondaryPercent = total > 0 ? Math.min(100, (secondaryValue / total) * 100) : 0
  const background = total > 0
    ? `conic-gradient(${primaryColor} 0 ${primaryPercent}%, ${secondaryColor} ${primaryPercent}% 100%)`
    : 'conic-gradient(#dfe8ec 0 100%)'

  return (
    <Stack alignItems="center" spacing={1.5}>
      <Box
        role="img"
        aria-label={`${primaryLabel} ${primaryPercent.toFixed(0)}%, ${secondaryLabel} ${secondaryPercent.toFixed(0)}%`}
        sx={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: { xs: 174, md: 190 },
          height: { xs: 174, md: 190 },
          borderRadius: '50%',
          background,
          boxShadow: 'inset 0 0 0 1px rgba(23,43,58,.04)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '25%',
            borderRadius: '50%',
            bgcolor: 'background.paper',
            boxShadow: '0 0 0 1px rgba(59,91,106,.08)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography variant="h4" lineHeight={1}>{total.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</Typography>
          <Typography variant="caption" color="text.secondary">{text.total}</Typography>
        </Box>
      </Box>
      <Stack direction="row" spacing={1.75} flexWrap="wrap" justifyContent="center" useFlexGap>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: primaryColor }} />
          <Typography variant="caption">{primaryLabel} {primaryPercent.toFixed(0)}%</Typography>
        </Stack>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: secondaryColor }} />
          <Typography variant="caption">{secondaryLabel} {secondaryPercent.toFixed(0)}%</Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}

interface DashboardPageProps {
  onOpenAttendance: () => void
  onOpenTimesheet: () => void
}

export function DashboardPage({
  onOpenAttendance,
  onOpenTimesheet,
}: DashboardPageProps) {
  const { language } = useLanguage()
  const text = dashboardCopy[language]
  const locale = language === 'th' ? 'th-TH' : 'en-US'
  const defaultRange = useMemo(getCurrentBangkokRange, [])
  const [draftRange, setDraftRange] = useState(defaultRange)
  const [range, setRange] = useState(defaultRange)
  const [draftEmployeeQuery, setDraftEmployeeQuery] = useState('')
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [attendance, setAttendance] = useState<AttendanceResponse>(emptyAttendance)
  const [timesheet, setTimesheet] = useState<TimesheetResponse>(emptyTimesheet)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const [attendanceResult, timesheetResult] = await Promise.all([
        searchAttendance(
          { from: range.from, to: range.to, q: employeeQuery, status: 'all' },
          1,
          5,
          signal,
        ),
        searchTimesheets(
          { from: range.from, to: range.to, q: employeeQuery, status: 'all' },
          1,
          5,
          signal,
        ),
      ])
      setAttendance(attendanceResult)
      setTimesheet(timesheetResult)
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError')
        setError(reason.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [employeeQuery, range.from, range.to])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load, refreshKey])

  const totalHours = timesheet.summary.totalMinutes / 60
  const dateRangeInvalid = Boolean(
    draftRange.from
    && draftRange.to
    && draftRange.from > draftRange.to,
  )

  function refreshDashboard(event?: React.FormEvent) {
    event?.preventDefault()
    if (dateRangeInvalid) {
      setError(INVALID_DATE_RANGE_MESSAGE)
      return
    }
    setError('')
    setRange(draftRange)
    setEmployeeQuery(draftEmployeeQuery.trim())
    setRefreshKey((value) => value + 1)
  }

  function clearEmployeeFilter() {
    setDraftEmployeeQuery('')
    setEmployeeQuery('')
    setRefreshKey((value) => value + 1)
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <InsightsRoundedIcon color="secondary" fontSize="large" />
            <Typography variant="h4">{text.title}</Typography>
          </Stack>
          <Typography color="text.secondary" mt={0.5}>
            {text.subtitle}
          </Typography>
          {employeeQuery && (
            <Chip
              size="small"
              color="secondary"
              variant="outlined"
              label={`${text.filteredBy}: ${employeeQuery}`}
              sx={{ mt: 1 }}
              onDelete={clearEmployeeFilter}
            />
          )}
        </Box>
        <Stack
          component="form"
          onSubmit={refreshDashboard}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          width={{ xs: '100%', lg: 'auto' }}
        >
          <TextField
            size="small"
            label={text.employeeFilter}
            placeholder={text.employeePlaceholder}
            value={draftEmployeeQuery}
            onChange={(event) => setDraftEmployeeQuery(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (draftEmployeeQuery || employeeQuery) ? (
                  <InputAdornment position="end">
                    <Tooltip title={text.clearEmployeeFilter}>
                      <IconButton
                        size="small"
                        aria-label={text.clearEmployeeFilter}
                        onClick={clearEmployeeFilter}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={{ width: { xs: '100%', sm: 235 } }}
          />
          <TextField
            required
            type="date"
            size="small"
            label={text.fromDate}
            value={draftRange.from}
            error={dateRangeInvalid}
            onChange={(event) => {
              const next = { ...draftRange, from: event.target.value }
              setDraftRange(next)
              if (!(next.from && next.to && next.from > next.to)
                  && error === INVALID_DATE_RANGE_MESSAGE)
                setError('')
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: draftRange.to || undefined },
            }}
            sx={{ width: { xs: '100%', sm: 170 } }}
          />
          <TextField
            required
            type="date"
            size="small"
            label={text.toDate}
            value={draftRange.to}
            error={dateRangeInvalid}
            onChange={(event) => {
              const next = { ...draftRange, to: event.target.value }
              setDraftRange(next)
              if (!(next.from && next.to && next.from > next.to)
                  && error === INVALID_DATE_RANGE_MESSAGE)
                setError('')
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: draftRange.from || undefined },
            }}
            sx={{ width: { xs: '100%', sm: 170 } }}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={18} /> : <RefreshRoundedIcon />}
            disabled={loading}
            sx={{ minHeight: 40 }}
          >
            {text.refresh}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      <Grid container spacing={2.5} mb={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              height: '100%',
              borderColor: 'rgba(25, 118, 210, .18)',
              background: 'linear-gradient(135deg, rgba(25,118,210,.055), #fff 52%)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2.5, bgcolor: 'rgba(25,118,210,.12)', color: '#1976d2' }}>
                  <TodayRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="h6">Attendance</Typography>
                  <Typography variant="caption" color="text.secondary">{text.attendanceSubtitle}</Typography>
                </Box>
              </Stack>
              <Button endIcon={<ArrowForwardRoundedIcon />} onClick={onOpenAttendance}>
                {text.viewDetails}
              </Button>
            </Stack>

            <Grid container spacing={2.5} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <DonutChart
                  total={attendance.summary.total}
                  primaryValue={attendance.summary.completed}
                  primaryLabel={text.completed}
                  primaryColor="#21875b"
                  secondaryValue={attendance.summary.missingCheckOut}
                  secondaryLabel={text.missing}
                  secondaryColor="#d18014"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={1.25}>
                  <Metric label={text.total} value={attendance.summary.total.toLocaleString(locale)} icon={<TodayRoundedIcon />} color="#1976d2" />
                  <Metric label={text.completed} value={attendance.summary.completed.toLocaleString(locale)} icon={<CheckCircleRoundedIcon />} color="#21875b" />
                  <Metric label={text.missing} value={attendance.summary.missingCheckOut.toLocaleString(locale)} icon={<EventBusyRoundedIcon />} color="#d18014" />
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              height: '100%',
              borderColor: 'rgba(10, 168, 150, .2)',
              background: 'linear-gradient(135deg, rgba(10,168,150,.065), #fff 52%)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2.5, bgcolor: 'rgba(10,168,150,.13)', color: 'secondary.dark' }}>
                  <DescriptionRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="h6">Timesheet</Typography>
                  <Typography variant="caption" color="text.secondary">{text.timesheetSubtitle}</Typography>
                </Box>
              </Stack>
              <Button endIcon={<ArrowForwardRoundedIcon />} onClick={onOpenTimesheet}>
                {text.viewDetails}
              </Button>
            </Stack>

            <Grid container spacing={2.5} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <DonutChart
                  total={timesheet.summary.total}
                  primaryValue={timesheet.summary.generated}
                  primaryLabel={text.generated}
                  primaryColor="#0aa896"
                  secondaryValue={timesheet.summary.pending}
                  secondaryLabel={text.pending}
                  secondaryColor="#d18014"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                    <Metric label={text.timesheetTotal} value={timesheet.summary.total.toLocaleString(locale)} icon={<DescriptionRoundedIcon />} color="#1976d2" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                    <Metric label={text.generatedDocument} value={timesheet.summary.generated.toLocaleString(locale)} icon={<AssignmentTurnedInRoundedIcon />} color="#21875b" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                    <Metric label={text.pending} value={timesheet.summary.pending.toLocaleString(locale)} icon={<HourglassBottomRoundedIcon />} color="#d18014" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                    <Metric label={text.totalHours} value={totalHours.toLocaleString(locale, { maximumFractionDigits: 2 })} icon={<TimerRoundedIcon />} color="#7b4fba" />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'rgba(59, 91, 106, .14)' }}>
            <Box px={2.5} py={2}>
              <Typography variant="h6">{text.latestAttendance}</Typography>
              <Typography variant="body2" color="text.secondary">{text.latestSubtitle}</Typography>
            </Box>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{text.employee}</TableCell>
                    <TableCell>{text.checkIn}</TableCell>
                    <TableCell>{text.checkOut}</TableCell>
                    <TableCell align="center">{text.status}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && attendance.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        {text.noAttendance}
                      </TableCell>
                    </TableRow>
                  )}
                  {attendance.items.slice(0, 5).map((row) => (
                    <TableRow hover key={row.attendanceId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{row.employeeCode || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(language === 'en' ? row.employeeNameEn || row.employeeName : row.employeeName) || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.checkIn, language)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.checkOut, language)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          variant="outlined"
                          color={row.checkOut ? 'success' : 'warning'}
                          label={row.checkOut ? text.complete : text.waitingCheckOut}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'rgba(59, 91, 106, .14)' }}>
            <Box px={2.5} py={2}>
              <Typography variant="h6">{text.latestTimesheet}</Typography>
              <Typography variant="body2" color="text.secondary">{text.latestSubtitle}</Typography>
            </Box>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 680 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{text.employee}</TableCell>
                    <TableCell>{text.dateTime}</TableCell>
                    <TableCell>{text.project}</TableCell>
                    <TableCell align="right">{text.hours}</TableCell>
                    <TableCell align="center">{text.document}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && timesheet.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        {text.noTimesheet}
                      </TableCell>
                    </TableRow>
                  )}
                  {timesheet.items.slice(0, 5).map((row) => (
                    <TableRow hover key={row.timesheetId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{row.employeeCode || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(language === 'en' ? row.employeeNameEn || row.employeeName : row.employeeName) || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2">{formatDate(row.workDate, language)}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatTime(row.startTime)}–{formatTime(row.endTime)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={650}>{row.projectCode || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.projectName || '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">{(row.durationMinutes / 60).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          variant="outlined"
                          color={row.hasDocument ? 'success' : 'warning'}
                          label={row.hasDocument ? text.generated : text.pending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
