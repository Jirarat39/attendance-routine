import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { browseReportDirectories, getReportSettings, saveReportSettings } from './api'
import { useLanguage } from './LanguageContext'
import type {
  ReportDirectoryBrowser,
  ReportScheduleType,
  ReportSettings,
  UpdateReportJobSettings,
  UpdateReportSettings,
} from './types'

type ReportJobKey = 'attendance' | 'timesheet'

const INVALID_DATE_RANGE_MESSAGE = 'The "From Date" cannot be later than the "To Date".'

const settingsCopy = {
  th: {
    disabled: 'ปิดการทำงานอัตโนมัติ',
    calculateAfterSave: 'จะคำนวณหลังบันทึก',
    automaticTime: 'เวลาสร้างไฟล์อัตโนมัติ',
    scheduleType: 'รูปแบบการสร้างไฟล์',
    daily: 'ทุกวัน',
    interval: 'ทุก ๆ จำนวนวันที่กำหนด',
    monthly: 'วันที่กำหนดของทุกเดือน',
    everyDays: 'สร้างไฟล์ทุก ๆ (วัน)',
    everyDaysHelp: 'ตัวอย่าง: 5 = สร้างไฟล์ทุก ๆ 5 วัน',
    scheduleStart: 'เริ่มนับรอบตั้งแต่วันที่',
    monthlyDay: 'วันที่สร้างไฟล์ของเดือน',
    monthlyDayHelp: 'หากเดือนไหนไม่มีวันที่เลือก ระบบจะใช้วันสุดท้ายของเดือน',
    dataDates: 'ข้อมูลของวันที่',
    fromDate: 'ตั้งแต่วันที่',
    toDate: 'ถึงวันที่',
    folder: 'โฟลเดอร์จัดเก็บ',
    browse: 'เลือกโฟลเดอร์',
    nextRun: 'เวลารันครั้งถัดไป',
    title: 'ตั้งค่า Auto Excel',
    subtitle: 'กำหนดเวลาสร้างรายงาน Excel อัตโนมัติบน Server',
    enabled: 'เปิดใช้งาน Auto export',
    disabledChip: 'ปิดใช้งาน Auto export',
    enableTitle: 'เปิดใช้งานการสร้าง Excel อัตโนมัติ',
    enableSubtitle: 'Scheduler จะตรวจสอบค่าที่บันทึกและสร้างไฟล์ตามเวลาที่กำหนด',
    info: 'ไฟล์จะถูกสร้างที่ฝั่ง Server แม้ไม่มีผู้ใช้เปิดหน้าเว็บ โดย Service ต้องทำงานอยู่ในเวลาที่กำหนด',
    saving: 'กำลังบันทึก...',
    save: 'บันทึกการตั้งค่า',
    saved: 'บันทึกการตั้งค่า Auto Excel สำหรับ Attendance และ Timesheet เรียบร้อยแล้ว',
    saveError: 'ไม่สามารถบันทึกการตั้งค่าได้',
    folderError: 'ไม่สามารถเปิดโฟลเดอร์ได้',
    chooseFolder: 'เลือกโฟลเดอร์จัดเก็บ',
    currentLocation: 'ตำแหน่งปัจจุบัน',
    loading: 'กำลังโหลด...',
    upOneLevel: 'ย้อนกลับหนึ่งระดับ',
    noSubfolders: 'ไม่มีโฟลเดอร์ย่อย',
    cancel: 'ยกเลิก',
    chooseThisFolder: 'เลือกโฟลเดอร์นี้',
  },
  en: {
    disabled: 'Automatic export is disabled',
    calculateAfterSave: 'Calculated after saving',
    automaticTime: 'Automatic Export Time',
    scheduleType: 'Export Schedule',
    daily: 'Every day',
    interval: 'Every specified number of days',
    monthly: 'A specified day of each month',
    everyDays: 'Export every (days)',
    everyDaysHelp: 'Example: 5 = create a file every 5 days',
    scheduleStart: 'Start counting from',
    monthlyDay: 'Day of month',
    monthlyDayHelp: 'If the selected day does not exist, the last day of the month is used.',
    dataDates: 'Report Date Range',
    fromDate: 'From Date',
    toDate: 'To Date',
    folder: 'Export Folder',
    browse: 'Browse',
    nextRun: 'Next Run Time',
    title: 'Auto Excel Setting',
    subtitle: 'Schedule automatic Excel report generation on the server',
    enabled: 'Auto export enabled',
    disabledChip: 'Auto export disabled',
    enableTitle: 'Enable automatic Excel generation',
    enableSubtitle: 'The scheduler checks saved settings and creates files at the specified time.',
    info: 'Files are generated on the server even when no user has the web page open. The service must be running at the scheduled time.',
    saving: 'Saving...',
    save: 'Save Settings',
    saved: 'Auto Excel settings for Attendance and Timesheet were saved successfully.',
    saveError: 'Unable to save settings.',
    folderError: 'Unable to open the folder.',
    chooseFolder: 'Choose export folder',
    currentLocation: 'Current location',
    loading: 'Loading...',
    upOneLevel: 'Up one level',
    noSubfolders: 'No subfolders',
    cancel: 'Cancel',
    chooseThisFolder: 'Choose this folder',
  },
}

function formatReportPath(path: string) {
  if (!path) return ''
  const segments = path.replace(/\//g, '\\').split('\\').filter(Boolean)
  const normalizedSegments = segments.map((segment) => segment.toLocaleLowerCase())
  const projectIndex = Math.max(
    normalizedSegments.lastIndexOf('hr report scheduler'),
    normalizedSegments.lastIndexOf('report'),
  )
  if (projectIndex < 0) return path

  const selectedFolder = segments.slice(projectIndex + 1).join('\\')
  return `..\\HR Report Scheduler\\${selectedFolder}`
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentBangkokMonthRange() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthText = String(month).padStart(2, '0')
  return {
    from: `${year}-${monthText}-01`,
    to: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`,
  }
}

function createDefaultJob(): UpdateReportJobSettings {
  const reportRange = getCurrentBangkokMonthRange()
  return {
    runAt: '09:00',
    scheduleType: 'daily',
    intervalDays: 5,
    monthlyDay: 25,
    scheduleStartDate: toInputDate(new Date()),
    reportFromDate: reportRange.from,
    reportToDate: reportRange.to,
    exportDirectory: '',
  }
}

function createDefaultForm(): UpdateReportSettings {
  return {
    enabled: true,
    attendance: createDefaultJob(),
    timesheet: createDefaultJob(),
  }
}

function isDateRangeInvalid(job: UpdateReportJobSettings) {
  return Boolean(
    job.reportFromDate
    && job.reportToDate
    && job.reportFromDate > job.reportToDate,
  )
}

function formatNextRun(
  enabled: boolean,
  value: string | null | undefined,
  language: 'th' | 'en',
) {
  const text = settingsCopy[language]
  if (!enabled) return text.disabled
  if (!value) return text.calculateAfterSave
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

interface ReportJobSectionProps {
  jobKey: ReportJobKey
  title: string
  enabled: boolean
  form: UpdateReportJobSettings
  nextRunAt: string | null | undefined
  onChange: (patch: Partial<UpdateReportJobSettings>) => void
  onBrowse: () => void
}

function ReportJobSection({
  jobKey,
  title,
  enabled,
  form,
  nextRunAt,
  onChange,
  onBrowse,
}: ReportJobSectionProps) {
  const { language } = useLanguage()
  const text = settingsCopy[language]
  const dateRangeInvalid = isDateRangeInvalid(form)

  return (
    <Box
      component="fieldset"
      disabled={!enabled}
      sx={{
        minWidth: 0,
        m: 0,
        px: { xs: 1.5, md: 2 },
        pb: 2,
        border: '1px solid',
        borderColor: 'rgba(59, 91, 106, .16)',
        borderRadius: 2.5,
        '&:disabled': { opacity: 0.68 },
      }}
    >
      <Box
        component="legend"
        sx={{
          px: 1.25,
          py: 0.45,
          border: '1px solid',
          borderColor: 'secondary.light',
          borderRadius: 10,
          color: 'secondary.dark',
          bgcolor: 'background.paper',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {title}
      </Box>

      <Grid container spacing={2.25} mt={0.25}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="time"
            label={text.automaticTime}
            value={form.runAt}
            disabled={!enabled}
            onChange={(event) => onChange({ runAt: event.target.value })}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start"><AccessTimeRoundedIcon /></InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth disabled={!enabled}>
            <InputLabel id={`${jobKey}-schedule-type-label`}>{text.scheduleType}</InputLabel>
            <Select
              labelId={`${jobKey}-schedule-type-label`}
              label={text.scheduleType}
              value={form.scheduleType}
              onChange={(event) => onChange({
                scheduleType: event.target.value as ReportScheduleType,
              })}
            >
              <MenuItem value="daily">{text.daily}</MenuItem>
              <MenuItem value="interval">{text.interval}</MenuItem>
              <MenuItem value="monthly">{text.monthly}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {form.scheduleType === 'interval' && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="number"
                label={text.everyDays}
                value={form.intervalDays}
                disabled={!enabled}
                onChange={(event) => onChange({
                  intervalDays: Math.max(1, Number(event.target.value)),
                })}
                slotProps={{ htmlInput: { min: 1, max: 365 } }}
                helperText={text.everyDaysHelp}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="date"
                label={text.scheduleStart}
                value={form.scheduleStartDate}
                disabled={!enabled}
                onChange={(event) => onChange({ scheduleStartDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </>
        )}

        {form.scheduleType === 'monthly' && (
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="number"
              label={text.monthlyDay}
              value={form.monthlyDay}
              disabled={!enabled}
              onChange={(event) => onChange({
                monthlyDay: Math.max(1, Math.min(31, Number(event.target.value))),
              })}
              slotProps={{ htmlInput: { min: 1, max: 31 } }}
              helperText={text.monthlyDayHelp}
            />
          </Grid>
        )}

        <Grid size={12}>
          <Divider textAlign="left">
            <Typography variant="subtitle2" color="text.secondary">{text.dataDates}</Typography>
          </Divider>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            type="date"
            label={text.fromDate}
            value={form.reportFromDate}
            disabled={!enabled}
            error={dateRangeInvalid}
            onChange={(event) => onChange({ reportFromDate: event.target.value })}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: form.reportToDate || undefined },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            type="date"
            label={text.toDate}
            value={form.reportToDate}
            disabled={!enabled}
            error={dateRangeInvalid}
            onChange={(event) => onChange({ reportToDate: event.target.value })}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: form.reportFromDate || undefined },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label={text.folder}
            value={formatReportPath(form.exportDirectory)}
            disabled={!enabled}
            slotProps={{
              input: {
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start"><FolderRoundedIcon /></InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      startIcon={<FolderOpenRoundedIcon />}
                      onClick={onBrowse}
                    >
                      {text.browse}
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label={text.nextRun}
            value={formatNextRun(enabled, nextRunAt, language)}
            slotProps={{
              input: {
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start"><ScheduleRoundedIcon /></InputAdornment>
                ),
              },
            }}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export function SettingsPage() {
  const { language } = useLanguage()
  const text = settingsCopy[language]
  const [settings, setSettings] = useState<ReportSettings | null>(null)
  const [form, setForm] = useState<UpdateReportSettings>(createDefaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderTarget, setFolderTarget] = useState<ReportJobKey>('attendance')
  const [folderBrowser, setFolderBrowser] = useState<ReportDirectoryBrowser | null>(null)
  const [folderLoading, setFolderLoading] = useState(false)
  const [folderError, setFolderError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getReportSettings(controller.signal)
      .then((value) => {
        const reportRange = getCurrentBangkokMonthRange()
        setSettings(value)
        setForm({
          enabled: value.enabled,
          attendance: {
            ...value.attendance,
            reportFromDate: reportRange.from,
            reportToDate: reportRange.to,
          },
          timesheet: {
            ...value.timesheet,
            reportFromDate: reportRange.from,
            reportToDate: reportRange.to,
          },
        })
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const attendanceInvalid = isDateRangeInvalid(form.attendance)
  const timesheetInvalid = isDateRangeInvalid(form.timesheet)

  function updateJob(jobKey: ReportJobKey, patch: Partial<UpdateReportJobSettings>) {
    const updatedJob = { ...form[jobKey], ...patch }
    setForm({ ...form, [jobKey]: updatedJob })
    if (!isDateRangeInvalid(updatedJob) && error.includes(INVALID_DATE_RANGE_MESSAGE))
      setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    if (attendanceInvalid || timesheetInvalid) {
      const section = attendanceInvalid ? 'Attendance' : 'Timesheet'
      setError(`${section}: ${INVALID_DATE_RANGE_MESSAGE}`)
      setSaving(false)
      return
    }
    try {
      const updated = await saveReportSettings(form)
      setSettings(updated)
      setForm({
        enabled: updated.enabled,
        attendance: {
          runAt: updated.attendance.runAt,
          scheduleType: updated.attendance.scheduleType,
          intervalDays: updated.attendance.intervalDays,
          monthlyDay: updated.attendance.monthlyDay,
          scheduleStartDate: updated.attendance.scheduleStartDate,
          reportFromDate: updated.attendance.reportFromDate,
          reportToDate: updated.attendance.reportToDate,
          exportDirectory: updated.attendance.exportDirectory,
        },
        timesheet: {
          runAt: updated.timesheet.runAt,
          scheduleType: updated.timesheet.scheduleType,
          intervalDays: updated.timesheet.intervalDays,
          monthlyDay: updated.timesheet.monthlyDay,
          scheduleStartDate: updated.timesheet.scheduleStartDate,
          reportFromDate: updated.timesheet.reportFromDate,
          reportToDate: updated.timesheet.reportToDate,
          exportDirectory: updated.timesheet.exportDirectory,
        },
      })
      setSuccess(text.saved)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function loadDirectory(path?: string) {
    setFolderLoading(true)
    setFolderError('')
    try {
      setFolderBrowser(await browseReportDirectories(path))
    } catch (reason) {
      setFolderError(reason instanceof Error ? reason.message : text.folderError)
    } finally {
      setFolderLoading(false)
    }
  }

  function openFolderBrowser(jobKey: ReportJobKey) {
    setFolderTarget(jobKey)
    setFolderDialogOpen(true)
    void loadDirectory(form[jobKey].exportDirectory)
  }

  function selectCurrentFolder() {
    if (!folderBrowser) return
    updateJob(folderTarget, { exportDirectory: folderBrowser.currentPath })
    setFolderDialogOpen(false)
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(10,168,150,.12)', color: 'secondary.dark' }}>
            <AutoModeRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h4">{text.title}</Typography>
            <Typography color="text.secondary">{text.subtitle}</Typography>
          </Box>
        </Stack>
        <Chip
          icon={<ScheduleRoundedIcon />}
          color={form.enabled ? 'success' : 'default'}
          variant="outlined"
          label={form.enabled ? text.enabled : text.disabledChip}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper
        component="form"
        onSubmit={submit}
        variant="outlined"
        sx={{ p: { xs: 2.25, md: 3 }, borderColor: 'rgba(59, 91, 106, .14)' }}
      >
        {loading ? (
          <Stack spacing={2}>
            <Skeleton height={70} />
            <Skeleton height={280} />
            <Skeleton height={280} />
          </Stack>
        ) : (
          <>
            <Box sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: form.enabled ? 'rgba(10,168,150,.08)' : 'rgba(96,117,132,.08)' }}>
              <FormControlLabel
                control={(
                  <Switch
                    checked={form.enabled}
                    onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                    color="secondary"
                  />
                )}
                label={(
                  <Box>
                    <Typography fontWeight={750}>{text.enableTitle}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {text.enableSubtitle}
                    </Typography>
                  </Box>
                )}
              />
            </Box>

            <Stack spacing={2.5}>
              <ReportJobSection
                jobKey="attendance"
                title="Attendance"
                enabled={form.enabled}
                form={form.attendance}
                nextRunAt={settings?.attendance.nextRunAt}
                onChange={(patch) => updateJob('attendance', patch)}
                onBrowse={() => openFolderBrowser('attendance')}
              />
              <ReportJobSection
                jobKey="timesheet"
                title="Timesheet"
                enabled={form.enabled}
                form={form.timesheet}
                nextRunAt={settings?.timesheet.nextRunAt}
                onChange={(patch) => updateJob('timesheet', patch)}
                onBrowse={() => openFolderBrowser('timesheet')}
              />
            </Stack>

            <Alert severity="info" sx={{ mt: 3 }}>
              {text.info}
            </Alert>

            <Stack direction="row" justifyContent="flex-end" mt={3}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<SaveRoundedIcon />}
                disabled={saving || attendanceInvalid || timesheetInvalid}
              >
                {saving ? text.saving : text.save}
              </Button>
            </Stack>
          </>
        )}
      </Paper>

      <Dialog
        open={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FolderOpenRoundedIcon color="secondary" />
            <Typography variant="h6">
              {text.chooseFolder} {folderTarget === 'attendance' ? 'Attendance' : 'Timesheet'}
            </Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, bgcolor: 'background.default' }}>
            <Typography variant="caption" color="text.secondary">{text.currentLocation}</Typography>
            <Typography variant="body2" fontWeight={650} sx={{ wordBreak: 'break-all' }}>
              {folderBrowser ? formatReportPath(folderBrowser.currentPath) : text.loading}
            </Typography>
          </Box>
          {folderError && <Alert severity="error" sx={{ m: 2 }}>{folderError}</Alert>}
          {folderLoading ? (
            <Stack spacing={1} p={2}>
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </Stack>
          ) : (
            <List sx={{ py: 1, minHeight: 180, maxHeight: 360, overflowY: 'auto' }}>
              {folderBrowser?.parentPath && (
                <ListItemButton onClick={() => void loadDirectory(folderBrowser.parentPath!)}>
                  <ListItemIcon><ArrowUpwardRoundedIcon /></ListItemIcon>
                  <ListItemText
                    primary={text.upOneLevel}
                    secondary={formatReportPath(folderBrowser.parentPath)}
                  />
                </ListItemButton>
              )}
              {folderBrowser?.directories.map((directory) => (
                <ListItemButton
                  key={directory.path}
                  onClick={() => void loadDirectory(directory.path)}
                >
                  <ListItemIcon><FolderRoundedIcon color="secondary" /></ListItemIcon>
                  <ListItemText
                    primary={directory.name}
                    secondary={formatReportPath(directory.path)}
                  />
                </ListItemButton>
              ))}
              {folderBrowser && folderBrowser.directories.length === 0 && (
                <Typography color="text.secondary" textAlign="center" py={5}>
                  {text.noSubfolders}
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={() => setFolderDialogOpen(false)}>{text.cancel}</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<CheckRoundedIcon />}
            onClick={selectCurrentFolder}
            disabled={!folderBrowser || folderLoading}
          >
            {text.chooseThisFolder}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
