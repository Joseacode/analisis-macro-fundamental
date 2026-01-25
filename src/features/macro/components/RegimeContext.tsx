import { Box, Typography, Paper, Chip } from '@mui/material';
import { Info } from '@mui/icons-material';
import { useAppSelector } from '../../../app/hooks';
import { REGIME_CONTEXT } from '../../../utils/sectorExplanations';
import { REGIME_COLORS } from '../../../utils/constants';

export const RegimeContext = () => {
    const regime = useAppSelector((state) => state.macro.analysis.regime);

    if (!regime) {
        return null;
    }

    const context = REGIME_CONTEXT[regime];
    const color = REGIME_COLORS[regime];

    return (
        <Paper elevation={3} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#151935' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Info sx={{ color: color, fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ color: color, fontWeight: 600 }}>
                    Context
                </Typography>
            </Box>

            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.85rem' }}>
                {context.description}
            </Typography>

            <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: color, display: 'block', mb: 1 }}>
                    KEY CHARACTERISTICS
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {context.characteristics.map((char, index) => (
                        <Chip
                            key={index}
                            label={char}
                            size="small"
                            sx={{
                                bgcolor: color + '20',
                                color: color,
                                fontSize: '0.7rem',
                                height: '22px'
                            }}
                        />
                    ))}
                </Box>
            </Box>

            <Box
                sx={{
                    p: 1.5,
                    bgcolor: color + '10',
                    borderLeft: '3px solid ' + color,
                    borderRadius: 1,
                }}
            >
                <Typography variant="caption" sx={{ fontWeight: 600, color: color, display: 'block', mb: 0.5 }}>
                    MARKET BEHAVIOR
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {context.marketBehavior}
                </Typography>
            </Box>
        </Paper>
    );
};
