import { Box, Typography, Paper, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../../app/hooks';
import { REGIME_COLORS } from '../../../utils/constants';

export const RegimeIndicator = () => {
    const { regime, score, confidence, yieldCurveSpread } = useAppSelector(
        (state) => state.macro.analysis
    );

    if (!regime) {
        return null;
    }

    const regimeColor = REGIME_COLORS[regime];

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${regimeColor}15 0%, ${regimeColor}05 100%)`,
                border: `2px solid ${regimeColor}`,
                bgcolor: '#151935'
            }}
        >
            <Box sx={{ textAlign: 'center' }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: '72px',
                            fontWeight: 'bold',
                            color: regimeColor,
                            mb: 1,
                        }}
                    >
                        {score}
                    </Typography>
                </motion.div>

                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 'bold',
                        color: regimeColor,
                        mb: 2,
                    }}
                >
                    {regime}
                </Typography>

                <Chip
                    label={`${confidence} CONFIDENCE`}
                    sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: regimeColor,
                        color: '#000',
                        mb: 2,
                    }}
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                    {yieldCurveSpread !== null && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                Yield Curve (10Y-2Y)
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    color: yieldCurveSpread > 0 ? '#00ff88' : '#ff4444',
                                }}
                            >
                                {yieldCurveSpread > 0 ? '+' : ''}
                                {yieldCurveSpread.toFixed(2)}%
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Economic Activity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 25 ? 'Slowing' : 'Weak'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};
