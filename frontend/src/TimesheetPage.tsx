import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
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
  Tooltip,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import TimerRoundedIcon from '@mui/icons-material/TimerRounded'
import { searchTimesheets, timesheetExportUrl } from './api'
import { useLanguage } from './LanguageContext'
import type { TimesheetFilters, TimesheetResponse } from './types'

const INVALID_DATE_RANGE_MESSAGE = 'The "From Date" cannot be later than the "To Date".'

function createDefaultFilters(): TimesheetFilters {
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

const initialData: TimesheetResponse = {
  items: [],
  summary: { total: 0, generated: 0, pending: 0, totalMinutes: 0 },
  page: 1,
  pageSize: 25,
  totalPages: 0,
}

const timesheetCopy = {
  th: {
    title: 'เอกสาร Timesheet',
    subtitle: 'ค้นหา ตรวจสอบ และดาวน์โหลดข้อมูล Timesheet พนักงาน',
    download: 'ดาวน์โหลด Excel',
    total: 'รายการทั้งหมด',
    generated: 'สร้างเอกสารแล้ว',
    pending: 'รอสร้างเอกสาร',
    totalHours: 'ชั่วโมงรวม',
    searchLabel: 'ค้นหา Timesheet',
    placeholder: 'เลขเอกสาร รหัส ชื่อ หรือโครงการ',
    fromDate: 'ตั้งแต่วันที่',
    toDate: 'ถึงวันที่',
    documentStatus: 'สถานะเอกสาร',
    all: 'ทั้งหมด',
    search: 'ค้นหา',
    clear: 'ล้างค่า',
    list: 'รายการ Timesheet',
    documentNo: 'เลขเอกสาร',
    employeeCode: 'รหัสพนักงาน',
    employeeName: 'ชื่อพนักงาน',
    workDate: 'วันที่ทำงาน',
    timeRange: 'ช่วงเวลา',
    project: 'โครงการ',
    hours: 'ชั่วโมง',
    noData: 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก',
    noDocument: 'ยังไม่มีเลขเอกสาร',
    generatedShort: 'สร้างแล้ว',
    pendingShort: 'รอดำเนินการ',
    rowsPerPage: 'จำนวนต่อหน้า',
    of: 'จาก',
  },
  en: {
    title: 'Timesheet Documents',
    subtitle: 'Search, review, and download employee Timesheet data',
    download: 'Download Excel',
    total: 'Total records',
    generated: 'Documents generated',
    pending: 'Pending documents',
    totalHours: 'Total hours',
    searchLabel: 'Search Timesheets',
    placeholder: 'Document no., employee code, name, or project',
    fromDate: 'From Date',
    toDate: 'To Date',
    documentStatus: 'Document Status',
    all: 'All',
    search: 'Search',
    clear: 'Clear',
    list: 'Timesheet Records',
    documentNo: 'Document No.',
    employeeCode: 'Employee Code',
    employeeName: 'Employee Name',
    workDate: 'Work Date',
    timeRange: 'Time Range',
    project: 'Project',
    hours: 'Hours',
    noData: 'No records found for the selected date range.',
    noDocument: 'No document number',
    generatedShort: 'Generated',
    pendingShort: 'Pending',
    rowsPerPage: 'Rows per page',
    of: 'of',
  },
}

function formatWorkDate(value: string, language: 'th' | 'en') {
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '—'
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, height: '100%', borderColor: 'rgba(59, 91, 106, .14)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" variant="body2" fontWeight={650}>{label}</Typography>
          <Typography variant="h4" mt={0.5}>{value}</Typography>
        </Box>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 3, color, bgcolor: `${color}18` }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  )
}

export function TimesheetPage() {
  const { language } = useLanguage()
  const text = timesheetCopy[language]
  const locale = language === 'th' ? 'th-TH' : 'en-US'
  const defaults = useMemo(createDefaultFilters, [])
  const [draft, setDraft] = useState<TimesheetFilters>(defaults)
  const [filters, setFilters] = useState<TimesheetFilters>(defaults)
  const [data, setData] = useState<TimesheetResponse>(initialData)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [searchVersion, setSearchVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    searchTimesheets(filters, page + 1, pageSize, signal)
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

  const exportUrl = useMemo(() => timesheetExportUrl(filters), [filters])

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
    const next = createDefaultFilters()
    setError('')
    setDraft(next)
    setFilters(next)
    setPage(0)
  }

  const totalHours = data.summary.totalMinutes / 60

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary" mt={0.5}>
            {text.subtitle}
          </Typography>
        </Box>
        <Button component="a" href={exportUrl} variant="contained" color="secondary" startIcon={<DownloadRoundedIcon />}>
          {text.download}
        </Button>
      </Stack>

      <Grid container spacing={2} mb={2.5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={text.total} value={data.summary.total.toLocaleString(locale)} icon={<DescriptionRoundedIcon />} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={text.generated} value={data.summary.generated.toLocaleString(locale)} icon={<AssignmentTurnedInRoundedIcon />} color="#21875b" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={text.pending} value={data.summary.pending.toLocaleString(locale)} icon={<HourglassBottomRoundedIcon />} color="#d18014" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label={text.totalHours} value={totalHours.toLocaleString(locale, { maximumFractionDigits: 2 })} icon={<TimerRoundedIcon />} color="#7b4fba" />
        </Grid>
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
            label={text.searchLabel}
            placeholder={text.placeholder}
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }}
          />
          <TextField
            fullWidth
            type="date"
            label={text.fromDate}
            value={draft.from}
            error={error === INVALID_DATE_RANGE_MESSAGE}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: draft.to || undefined } }}
          />
          <TextField
            fullWidth
            type="date"
            label={text.toDate}
            value={draft.to}
            error={error === INVALID_DATE_RANGE_MESSAGE}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: draft.from || undefined } }}
          />
          <FormControl fullWidth>
            <InputLabel id="timesheet-status-label">{text.documentStatus}</InputLabel>
            <Select
              labelId="timesheet-status-label"
              label={text.documentStatus}
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value as TimesheetFilters['status'] })}
            >
              <MenuItem value="all">{text.all}</MenuItem>
              <MenuItem value="generated">{text.generated}</MenuItem>
              <MenuItem value="pending">{text.pending}</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' }, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end', lg: 'flex-start' } }}>
            <Stack direction="row" spacing={1.25} sx={{ height: 54, maxWidth: '100%' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchRoundedIcon sx={{ fontSize: 24 }} />}
                sx={{ width: 136, minWidth: 136, borderRadius: '10px', bgcolor: '#087CCF', color: '#fff', fontSize: 18, '&:hover': { bgcolor: '#0669B0' } }}
              >
                {text.search}
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<CloseRoundedIcon sx={{ fontSize: 25 }} />}
                onClick={clearSearch}
                sx={{ width: 122, minWidth: 122, borderRadius: '10px', borderColor: '#123E68', color: '#0C3155', fontSize: 18, '&:hover': { borderColor: '#0C3155', bgcolor: '#F3F8FC' } }}
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
          <Typography variant="h6">{text.list}</Typography>
          {loading && <CircularProgress size={24} />}
        </Box>
        <TableContainer sx={{ minHeight: 360 }}>
          <Table stickyHeader sx={{ minWidth: 1080 }}>
            <TableHead>
              <TableRow>
                <TableCell>{text.documentNo}</TableCell>
                <TableCell>{text.employeeCode}</TableCell>
                <TableCell>{text.employeeName}</TableCell>
                <TableCell>{text.workDate}</TableCell>
                <TableCell>{text.timeRange}</TableCell>
                <TableCell>{text.project}</TableCell>
                <TableCell align="right">{text.hours}</TableCell>
                <TableCell align="center">{text.documentStatus}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                    {text.noData}
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((row) => (
                <TableRow hover key={row.timesheetId}>
                  <TableCell>
                    <Typography fontWeight={700}>{row.documentNo || '—'}</Typography>
                  </TableCell>
                  <TableCell>{row.employeeCode || '—'}</TableCell>
                  <TableCell>{(language === 'en' ? row.employeeNameEn || row.employeeName : row.employeeName) || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatWorkDate(row.workDate, language)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(row.startTime)}–{formatTime(row.endTime)}</TableCell>
                  <TableCell>
                    <Typography fontWeight={650}>{row.projectCode || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.projectName || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">{(row.durationMinutes / 60).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={row.hasDocument ? row.documentNo : text.noDocument}>
                      <Chip
                        size="small"
                        color={row.hasDocument ? 'success' : 'warning'}
                        variant="outlined"
                        label={row.hasDocument ? text.generatedShort : text.pendingShort}
                      />
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
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage={text.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${text.of} ${count}`}
        />
      </Paper>
    </Container>
  )
}
