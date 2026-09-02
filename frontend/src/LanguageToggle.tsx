import { Box, Button, Stack } from '@mui/material'
import { useLanguage, type Language } from './LanguageContext'

interface LanguageToggleProps {
  compact?: boolean
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()

  return (
    <Stack
      direction="row"
      spacing={0.25}
      aria-label="Language"
      sx={{
        p: 0.35,
        borderRadius: 99,
        bgcolor: 'rgba(227, 232, 237, .96)',
        flex: '0 0 auto',
      }}
    >
      {(['en', 'th'] as Language[]).map((item) => (
        <Button
          key={item}
          type="button"
          size="small"
          aria-pressed={language === item}
          onClick={() => setLanguage(item)}
          sx={{
            minWidth: compact ? 32 : 40,
            height: compact ? 28 : 32,
            px: compact ? 0.6 : 1,
            borderRadius: 99,
            fontSize: compact ? 11 : 13,
            color: language === item ? '#fff' : '#536779',
            bgcolor: language === item ? '#14273a' : 'transparent',
            '&:hover': {
              bgcolor: language === item ? '#14273a' : 'rgba(255,255,255,.62)',
            },
          }}
        >
          <Box component="span">{item.toUpperCase()}</Box>
        </Button>
      ))}
    </Stack>
  )
}
