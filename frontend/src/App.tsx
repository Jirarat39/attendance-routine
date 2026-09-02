import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { exportUrl, logout, searchAttendance } from './api'
import { DashboardPage } from './DashboardPage'
import { useLanguage } from './LanguageContext'
import { LanguageToggle } from './LanguageToggle'
import { LoginPage } from './LoginPage'
import { SettingsPage } from './SettingsPage'
import { TimesheetPage } from './TimesheetPage'
import type { AttendanceResponse, AuthUser, SearchFilters } from './types'

function createDefaultFilters(): SearchFilters {
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
    q: '',
    status: 'all',
  }
}

const initialFilters = createDefaultFilters()
const INVALID_DATE_RANGE_MESSAGE = 'The "From Date" cannot be later than the "To Date".'
const initialData: AttendanceResponse = {
  items: [],
  summary: { total: 0, completed: 0, missingCheckOut: 0 },
  page: 1,
  pageSize: 25,
  totalPages: 0,
}

const appCopy = {
  th: {
    systemSubtitle: 'ระบบจัดการรายงานตามกำหนดเวลา',
    dashboard: 'แดชบอร์ด',
    attendance: 'การลงเวลา',
    timesheet: 'ไทม์ชีต',
    settings: 'ตั้งค่า',
    logout: 'ออกจากระบบ',
    adminRole: 'ผู้ดูแลระบบ',
    title: 'ภาพรวมการลงเวลา',
    subtitle: 'ค้นหา ตรวจสอบ และดาวน์โหลดข้อมูลเช็กอิน/เช็กเอาท์',
    download: 'ดาวน์โหลด Excel',
    total: 'รายการทั้งหมด',
    completed: 'เช็กเอาท์แล้ว',
    missing: 'ยังไม่เช็กเอาท์',
    employeeSearch: 'ค้นหาพนักงาน',
    employeePlaceholder: 'รหัส ชื่อ หรือแผนก',
    fromDate: 'ตั้งแต่วันที่',
    toDate: 'ถึงวันที่',
    status: 'สถานะ',
    all: 'ทั้งหมด',
    search: 'ค้นหา',
    clear: 'ล้างค่า',
    attendanceList: 'รายการลงเวลา',
    employeeCode: 'รหัสพนักงาน',
    employeeName: 'ชื่อพนักงาน',
    department: 'แผนก',
    checkIn: 'เช็กอิน',
    checkOut: 'เช็กเอาท์',
    noData: 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก',
    completeTip: 'มีเวลาเช็กอินและเช็กเอาท์',
    missingTip: 'ยังไม่พบเวลาเช็กเอาท์',
    complete: 'ครบถ้วน',
    waiting: 'รอเช็กเอาท์',
    rowsPerPage: 'จำนวนต่อหน้า',
    of: 'จาก',
  },
  en: {
    systemSubtitle: 'Scheduled report management system',
    dashboard: 'Dashboard',
    attendance: 'Attendance',
    timesheet: 'Timesheet',
    settings: 'Setting',
    logout: 'Sign out',
    adminRole: 'Administrator',
    title: 'Attendance Overview',
    subtitle: 'Search, review, and download employee check-in/check-out data',
    download: 'Download Excel',
    total: 'Total records',
    completed: 'Checked out',
    missing: 'Missing check-out',
    employeeSearch: 'Search employees',
    employeePlaceholder: 'Code, name, or department',
    fromDate: 'From Date',
    toDate: 'To Date',
    status: 'Status',
    all: 'All',
    search: 'Search',
    clear: 'Clear',
    attendanceList: 'Attendance Records',
    employeeCode: 'Employee Code',
    employeeName: 'Employee Name',
    department: 'Department',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    noData: 'No records found for the selected date range.',
    completeTip: 'Both check-in and check-out times are available',
    missingTip: 'No check-out time found',
    complete: 'Complete',
    waiting: 'Pending check-out',
    rowsPerPage: 'Rows per page',
    of: 'of',
  },
}

function formatDateTime(value: string | null, language: 'th' | 'en') {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const { language } = useLanguage()
  return (
    <Paper variant="outlined" sx={{ p: 2.25, height: '100%', borderColor: 'rgba(59, 91, 106, .14)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" variant="body2" fontWeight={650}>{label}</Typography>
          <Typography variant="h4" mt={0.5}>{value.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</Typography>
        </Box>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 3, color, bgcolor: `${color}18` }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  )
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null)

  async function handleLogout() {
    await logout()
    setUser(null)
  }

  if (!user) {
    return <LoginPage onAuthenticated={setUser} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

interface DashboardProps {
  user: AuthUser
  onLogout: () => Promise<void>
}

function Dashboard({ user, onLogout }: DashboardProps) {
  const { language } = useLanguage()
  const text = appCopy[language]
  const displayName = language === 'en' ? (user.fullNameEn || user.fullName) : user.fullName
  const displayRole = user.role.toLowerCase() === 'admin' ? text.adminRole : user.role
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    || user.employeeCode.charAt(0).toUpperCase()
  const [activePage, setActivePage] = useState<'dashboard' | 'attendance' | 'timesheet' | 'settings'>('dashboard')
  const [draft, setDraft] = useState<SearchFilters>(initialFilters)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [data, setData] = useState<AttendanceResponse>(initialData)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [searchVersion, setSearchVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    searchAttendance(filters, page + 1, pageSize, signal)
      .then(setData)
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false)
      })
  }, [filters, page, pageSize, searchVersion])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const currentExportUrl = useMemo(() => exportUrl(filters), [filters])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      setError(INVALID_DATE_RANGE_MESSAGE)
      return
    }

    setError('')
    setPage(0)
    setFilters(draft)
    setSearchVersion((version) => version + 1)
  }

  function clearSearch() {
    const defaults = createDefaultFilters()
    setError('')
    setDraft(defaults)
    setFilters(defaults)
    setPage(0)
  }

  return (
    <Box minHeight="100vh">
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar sx={{ minHeight: { xs: 68, md: 76 } }}>
          <Container maxWidth="xl" disableGutters>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2.5, bgcolor: 'secondary.main' }}>
                  <AccessTimeRoundedIcon />
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="h6" lineHeight={1.15}>HR Report Scheduler</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.66)' }}>{text.systemSubtitle}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Stack direction="row" spacing={0.75}>
                  <Button
                    aria-label={text.dashboard}
                    color="inherit"
                    startIcon={<DashboardRoundedIcon />}
                    onClick={() => setActivePage('dashboard')}
                    sx={{
                      minWidth: { xs: 42, md: 'auto' },
                      px: { xs: 1, md: 2 },
                      bgcolor: activePage === 'dashboard' ? 'rgba(255,255,255,.14)' : 'transparent',
                      '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: { xs: 0, md: -0.5 } },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{text.dashboard}</Box>
                  </Button>
                  <Button
                    aria-label={text.attendance}
                    color="inherit"
                    startIcon={<AccessTimeRoundedIcon />}
                    onClick={() => setActivePage('attendance')}
                    sx={{
                      minWidth: { xs: 42, md: 'auto' },
                      px: { xs: 1, md: 2 },
                      bgcolor: activePage === 'attendance' ? 'rgba(255,255,255,.14)' : 'transparent',
                      '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: { xs: 0, md: -0.5 } },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{text.attendance}</Box>
                  </Button>
                  <Button
                    aria-label={text.timesheet}
                    color="inherit"
                    startIcon={<DescriptionRoundedIcon />}
                    onClick={() => setActivePage('timesheet')}
                    sx={{
                      minWidth: { xs: 42, md: 'auto' },
                      px: { xs: 1, md: 2 },
                      bgcolor: activePage === 'timesheet' ? 'rgba(255,255,255,.14)' : 'transparent',
                      '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: { xs: 0, md: -0.5 } },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{text.timesheet}</Box>
                  </Button>
                  <Button
                    aria-label={text.settings}
                    color="inherit"
                    startIcon={<SettingsRoundedIcon />}
                    onClick={() => setActivePage('settings')}
                    sx={{
                      minWidth: { xs: 42, md: 'auto' },
                      px: { xs: 1, md: 2 },
                      bgcolor: activePage === 'settings' ? 'rgba(255,255,255,.14)' : 'transparent',
                      '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, ml: { xs: 0, md: -0.5 } },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{text.settings}</Box>
                  </Button>
                </Stack>
                <LanguageToggle compact />
                <Tooltip title={text.logout}>
                  <IconButton color="inherit" aria-label={text.logout} onClick={() => void onLogout()}>
                    <LogoutRoundedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      {activePage === 'dashboard' ? (
        <DashboardPage
          onOpenAttendance={() => setActivePage('attendance')}
          onOpenTimesheet={() => setActivePage('timesheet')}
        />
      ) : activePage === 'settings' ? (
        <SettingsPage />
      ) : activePage === 'timesheet' ? (
        <TimesheetPage />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
          <Box>
            <Typography variant="h4">{text.title}</Typography>
            <Typography color="text.secondary" mt={0.5}>{text.subtitle}</Typography>
          </Box>
          <Button component="a" href={currentExportUrl} variant="contained" color="secondary" startIcon={<DownloadRoundedIcon />}>
            {text.download}
          </Button>
        </Stack>

        <Grid container spacing={2} mb={2.5}>
          <Grid size={{ xs: 12, sm: 4 }}><StatCard label={text.total} value={data.summary.total} icon={<GroupsRoundedIcon />} color="#1976d2" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><StatCard label={text.completed} value={data.summary.completed} icon={<CheckCircleRoundedIcon />} color="#21875b" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><StatCard label={text.missing} value={data.summary.missingCheckOut} icon={<EventBusyRoundedIcon />} color="#d18014" /></Grid>
        </Grid>

        <Paper component="form" onSubmit={submit} variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderColor: 'rgba(59, 91, 106, .14)' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr)) max-content',
              },
              gap: 2,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              label={text.employeeSearch}
              placeholder={text.employeePlaceholder}
              value={draft.q}
              onChange={(event) => setDraft({ ...draft, q: event.target.value })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }}
            />
            <TextField fullWidth type="date" label={text.fromDate} value={draft.from} error={error === INVALID_DATE_RANGE_MESSAGE} onChange={(event) => setDraft({ ...draft, from: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField fullWidth type="date" label={text.toDate} value={draft.to} error={error === INVALID_DATE_RANGE_MESSAGE} onChange={(event) => setDraft({ ...draft, to: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormControl fullWidth>
              <InputLabel id="status-label">{text.status}</InputLabel>
              <Select labelId="status-label" label={text.status} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SearchFilters['status'] })}>
                <MenuItem value="all">{text.all}</MenuItem>
                <MenuItem value="complete">{text.completed}</MenuItem>
                <MenuItem value="missing">{text.missing}</MenuItem>
              </Select>
            </FormControl>
            <Box
              sx={{
                gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' },
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-end', lg: 'flex-start' },
                minWidth: 0,
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ height: 54, maxWidth: '100%' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchRoundedIcon sx={{ fontSize: 24 }} />}
                  sx={{
                    width: 136,
                    minWidth: 136,
                    flexShrink: 0,
                    borderRadius: '10px',
                    bgcolor: '#087CCF',
                    color: '#fff',
                    fontSize: 18,
                    '&:hover': { bgcolor: '#0669B0' },
                  }}
                >
                  {text.search}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<CloseRoundedIcon sx={{ fontSize: 25 }} />}
                  onClick={clearSearch}
                  sx={{
                    width: 122,
                    minWidth: 122,
                    flexShrink: 0,
                    borderRadius: '10px',
                    borderColor: '#123E68',
                    color: '#0C3155',
                    fontSize: 18,
                    '&:hover': { borderColor: '#0C3155', bgcolor: '#F3F8FC' },
                  }}
                >
                  {text.clear}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper variant="outlined" sx={{ overflow: 'hidden', borderColor: 'rgba(59, 91, 106, .14)' }}>
          <Box px={2.5} py={2} display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{text.attendanceList}</Typography>
            {loading && <CircularProgress size={24} />}
          </Box>
          <TableContainer sx={{ minHeight: 360 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{text.employeeCode}</TableCell>
                  <TableCell>{text.employeeName}</TableCell>
                  <TableCell>{text.department}</TableCell>
                  <TableCell>{text.checkIn}</TableCell>
                  <TableCell>{text.checkOut}</TableCell>
                  <TableCell align="center">{text.status}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && data.items.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10, color: 'text.secondary' }}>{text.noData}</TableCell></TableRow>
                )}
                {data.items.map((row) => (
                  <TableRow hover key={`${row.attendanceId}-${row.checkIn}`}>
                    <TableCell><Typography fontWeight={700}>{row.employeeCode || '—'}</Typography></TableCell>
                    <TableCell>{(language === 'en' ? row.employeeNameEn || row.employeeName : row.employeeName) || '—'}</TableCell>
                    <TableCell>{(language === 'en' ? row.departmentEn || row.department : row.department) || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.checkIn, language)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.checkOut, language)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={row.checkOut ? text.completeTip : text.missingTip}>
                        <Chip size="small" color={row.checkOut ? 'success' : 'warning'} variant="outlined" label={row.checkOut ? text.complete : text.waiting} />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.summary.total}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage={text.rowsPerPage}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${text.of} ${count}`}
          />
        </Paper>
        </Container>
      )}
    </Box>
  )
}
