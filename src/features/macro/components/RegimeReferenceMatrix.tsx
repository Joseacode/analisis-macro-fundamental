// src/features/macro/components/RegimeReferenceMatrix.tsx
import { Box, Typography, Paper, Chip } from '@mui/material';
import { TableChart } from '@mui/icons-material';
import type { RegimeType, SectorCode } from '../../../types/macro.types';
import { REGIME_MATRIX, SECTORS } from '../../../utils/constants';

type Row = {
    regime: RegimeType;
    color: string;
    economics: string;
    overweightSectors: SectorCode[];
    underweightSectors: SectorCode[];
    consequence: string;
};

const ROWS: Row[] = (Object.keys(REGIME_MATRIX) as RegimeType[]).map((regime) => ({
    regime,
    ...REGIME_MATRIX[regime],
}));

export const RegimeReferenceMatrix = () => {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: '#151935',
                border: '1px solid rgba(148,163,184,0.15)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TableChart sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Regime Allocation Reference Matrix
                </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 980 }}>
                    {/* Header Row */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '150px 2fr 1.5fr 1.5fr',
                            gap: 2,
                            mb: 2,
                            pb: 2,
                            borderBottom: '2px solid rgba(0, 217, 255, 0.2)',
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                            Regime
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                            Economic Characteristics
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                            Overweight Sectors
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                            Portfolio Consequence
                        </Typography>
                    </Box>

                    {/* Data Rows */}
                    {ROWS.map((row) => (
                        <Box
                            key={row.regime}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '150px 2fr 1.5fr 1.5fr',
                                gap: 2,
                                mb: 2,
                                p: 2,
                                bgcolor: `${row.color}08`,
                                borderLeft: `4px solid ${row.color}`,
                                borderRadius: 1,
                                transition: 'all 0.3s',
                                '&:hover': {
                                    bgcolor: `${row.color}15`,
                                    transform: 'translateX(4px)',
                                },
                            }}
                        >
                            {/* Regime */}
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: row.color,
                                        fontSize: '1rem',
                                    }}
                                >
                                    {row.regime}
                                </Typography>
                            </Box>

                            {/* Economics */}
                            <Box>
                                <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                    {row.economics}
                                </Typography>
                            </Box>

                            {/* Overweight */}
                            <Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {row.overweightSectors.map((sector) => (
                                        <Chip
                                            key={sector}
                                            label={`${sector} • ${SECTORS[sector]}`}
                                            size="small"
                                            sx={{
                                                bgcolor: `${row.color}30`,
                                                color: row.color,
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                height: '24px',
                                            }}
                                        />
                                    ))}
                                </Box>

                                {/* Underweight (mini row, opcional pero útil) */}
                                {row.underweightSectors?.length > 0 && (
                                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, opacity: 0.95 }}>
                                        {row.underweightSectors.map((sector) => (
                                            <Chip
                                                key={sector}
                                                label={`↓ ${sector}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(148,163,184,0.12)',
                                                    color: '#94a3b8',
                                                    fontWeight: 700,
                                                    fontSize: '0.72rem',
                                                    height: '22px',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>

                            {/* Consequence */}
                            <Box>
                                <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                                    {row.consequence}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box
                sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: 'rgba(0, 217, 255, 0.05)',
                    borderRadius: 1,
                    borderLeft: '3px solid #00d9ff',
                }}
            >
                <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                    <strong style={{ color: '#00d9ff' }}>Framework Note:</strong> This matrix is a policy/rotation
                    guideline. Confirm with leading indicators (spreads, ISM/PMI, claims, credit) and risk controls.
                </Typography>
            </Box>
        </Paper>
    );
};
