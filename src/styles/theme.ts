import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#06b6d4' }, // cyan-500
        background: {
            default: '#020617', // slate-950
            paper: '#0b1220',
        },
        text: {
            primary: '#e2e8f0',   // slate-200
            secondary: '#94a3b8', // slate-400
        },
    },
    typography: {
        fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});
