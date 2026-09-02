import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { AuthRequestError, login } from './api'
import { useLanguage } from './LanguageContext'
import { LanguageToggle } from './LanguageToggle'
import type { AuthUser } from './types'

interface LoginPageProps {
  onAuthenticated: (user: AuthUser) => void
}

const copy = {
  th: {
    subtitle: 'เข้าสู่ระบบเพื่อใช้งาน',
    username: 'ชื่อผู้ใช้',
    usernamePlaceholder: 'เช่น admin หรือ EMP001',
    password: 'รหัสผ่าน',
    login: 'เข้าสู่ระบบ',
    loggingIn: 'กำลังเข้าสู่ระบบ...',
    footer: 'ระบบจัดการรายงานตามกำหนดเวลา - ใช้ภายในเท่านั้น',
    invalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    denied: 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบ',
    unavailable: 'ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
  },
  en: {
    subtitle: 'Sign in to continue',
    username: 'Username',
    usernamePlaceholder: 'e.g. admin or EMP001',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in...',
    footer: 'Scheduled report management system - Internal use only',
    invalid: 'The username or password is incorrect.',
    denied: 'This account does not have permission to access the system.',
    unavailable: 'Unable to connect to the login service.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const { language } = useLanguage()
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const text = copy[language]
  const canSubmit = employeeCode.trim().length > 0 && password.length > 0 && !submitting

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      onAuthenticated(await login(employeeCode.trim(), password))
    } catch (reason) {
      if (reason instanceof AuthRequestError) {
        setError(reason.code === 'ACCESS_DENIED' ? text.denied : text.invalid)
      } else {
        setError(text.unavailable)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      minHeight="100vh"
      display="grid"
      sx={{
        placeItems: 'center',
        px: 2,
        py: { xs: 2, sm: 4 },
        bgcolor: '#f6f5f2',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(167, 207, 194, .20), transparent 42%)',
      }}
    >
      <Paper
        component="main"
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 430,
          overflow: 'hidden',
          borderRadius: 2.5,
          borderColor: '#d9ddd8',
          boxShadow: '0 20px 55px rgba(36, 54, 48, .08)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            px: 4,
            pt: 5,
            pb: 3.5,
            textAlign: 'center',
            bgcolor: '#eaf5f1',
            borderBottom: '1px solid #d4e3dd',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 13,
              right: 15,
            }}
          >
            <LanguageToggle />
          </Box>

          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              border: '1.5px solid #282828',
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,.58)',
              color: '#272727',
            }}
          >
            <GroupsRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="#242621">
            HR Report Scheduler
          </Typography>
          <Typography color="#91968f" mt={0.5}>
            {text.subtitle}
          </Typography>
        </Box>

        <Box component="form" onSubmit={submit} sx={{ px: { xs: 3, sm: 4 }, py: 4 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity={error === text.denied ? 'warning' : 'error'}>{error}</Alert>}

            <Box>
              <Typography component="label" htmlFor="employee-code" fontWeight={750} fontSize={14}>
                {text.username} <Box component="span" color="#cc3b36">*</Box>
              </Typography>
              <TextField
                id="employee-code"
                fullWidth
                autoFocus
                autoComplete="username"
                placeholder={text.usernamePlaceholder}
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                sx={{ mt: 0.75 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineRoundedIcon sx={{ color: '#949790' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box>
              <Typography component="label" htmlFor="password" fontWeight={750} fontSize={14}>
                {text.password} <Box component="span" color="#cc3b36">*</Box>
              </Typography>
              <TextField
                id="password"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                sx={{ mt: 0.75 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#949790' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          edge="end"
                          aria-label={showPassword ? text.hidePassword : text.showPassword}
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword
                            ? <VisibilityOffOutlinedIcon />
                            : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={19} color="inherit" /> : <LoginRoundedIcon />}
              sx={{
                height: 52,
                mt: 0.5,
                bgcolor: '#173b35',
                '&:hover': { bgcolor: '#102d28' },
                '&.Mui-disabled': { bgcolor: '#dedede', color: '#a7aaa7' },
              }}
            >
              {submitting ? text.loggingIn : text.login}
            </Button>

            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" color="#969b96" pt={0.5}>
              <ShieldOutlinedIcon sx={{ fontSize: 17 }} />
              <Typography variant="caption">{text.footer}</Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
