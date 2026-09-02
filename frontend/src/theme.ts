import { alpha, createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#12344d', dark: '#0b2235', contrastText: '#ffffff' },
    secondary: { main: '#0aa896', dark: '#087d70', contrastText: '#ffffff' },
    background: { default: '#f3f7f9', paper: '#ffffff' },
    text: { primary: '#172b3a', secondary: '#607584' },
    success: { main: '#21875b' },
    warning: { main: '#d18014' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Noto Sans Thai", "Segoe UI", Tahoma, sans-serif',
    h4: { fontWeight: 750, letterSpacing: '-0.03em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10, boxShadow: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: '#edf5f6', color: '#264b5a', fontWeight: 750, whiteSpace: 'nowrap' },
        root: { borderColor: alpha('#5d7987', 0.16) },
      },
    },
  },
})

