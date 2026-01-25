import { Box, Typography } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';

export const DashboardHeader = () => {
    return (
        <Box
            sx={{
                bgcolor: '#0f1429',
                borderBottom: '2px solid',
                borderImage: 'linear-gradient(90deg, #00d9ff, #00ff88) 1',
                px: { xs: 2, md: 4 },
                py: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #00d9ff 0%, #00ff88 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)'
                    }}
                >
                    <TrendingUp sx={{ color: '#000', fontSize: 28, fontWeight: 700 }} />
                </Box>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #00d9ff 0%, #00ff88 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                            fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                    >
                        INSTITUTIONAL MACRO DASHBOARD
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8b92b0', fontWeight: 500 }}>
                        US Markets • Top-Down Sector Allocation Framework
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
